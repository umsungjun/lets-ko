import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { generatePredictions } from "@/lib/crawl/prediction-generator";
import { crawlUfcRankings } from "@/lib/crawl/rankings-crawler";
import { crawlUfcSchedule } from "@/lib/crawl/schedule-crawler";
import {
  extractExistingPredictions,
  generateSchedulePredictions,
} from "@/lib/crawl/schedule-prediction-generator";
import { crawlUfcStats } from "@/lib/crawl/ufc-crawler";
import { createServerClient } from "@/lib/supabase/server";
import type { UfcSchedule } from "@/types/schedule";

export const maxDuration = 60;

function serializeError(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === "object" && "message" in reason) {
    return String((reason as { message: unknown }).message);
  }
  return String(reason);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const results: Record<string, unknown> = {};

  // Phase 1: 독립 크롤링 병렬 실행 (stats/rankings/schedule은 서로 의존성 없음)
  const [statsResult, rankingsResult, scheduleRawResult] =
    await Promise.allSettled([
      crawlUfcStats(),
      crawlUfcRankings(),
      (async () => {
        const { data: existingRow } = await supabase
          .from("ufc_schedule")
          .select("data")
          .order("crawled_at", { ascending: false })
          .limit(1)
          .single();
        const existingPredictions = extractExistingPredictions(
          existingRow?.data as UfcSchedule | null
        );
        const events = await crawlUfcSchedule();
        return { events, existingPredictions };
      })(),
    ]);

  const latestStats =
    statsResult.status === "fulfilled" ? statsResult.value : undefined;
  const scheduleData =
    scheduleRawResult.status === "fulfilled" ? scheduleRawResult.value : null;

  if (statsResult.status === "rejected") {
    console.error("Stats crawl failed:", statsResult.reason);
  }
  if (rankingsResult.status === "rejected") {
    console.error("Rankings crawl failed:", rankingsResult.reason);
  }
  if (scheduleRawResult.status === "rejected") {
    console.error("Schedule crawl failed:", scheduleRawResult.reason);
  }

  // Phase 2: DB 저장(stats/rankings) + AI 예측 병렬 실행
  // DB 저장은 I/O 위주라 Gemini 호출과 병렬로 실행 가능
  // 두 Gemini 태스크는 각 내부가 순차이므로 동시 최대 호출 수 = 2
  const [statsSave, rankingsSave, predictionsResult, schedulePredResult] =
    await Promise.allSettled([
      statsResult.status === "fulfilled"
        ? supabase
            .from("fighter_stats")
            .insert({ data: statsResult.value, source: "ufc_korea" })
            .then(({ error }) => {
              if (error) throw error;
            })
        : Promise.reject(statsResult.reason),
      rankingsResult.status === "fulfilled"
        ? supabase
            .from("ufc_rankings")
            .insert({ data: rankingsResult.value, source: "ufc_korea" })
            .then(({ error }) => {
              if (error) throw error;
            })
        : Promise.reject(rankingsResult.reason),
      generatePredictions(latestStats),
      scheduleData
        ? generateSchedulePredictions(
            scheduleData.events,
            scheduleData.existingPredictions
          )
        : Promise.reject(
            scheduleRawResult.status === "rejected"
              ? scheduleRawResult.reason
              : new Error("schedule data unavailable")
          ),
    ]);

  if (predictionsResult.status === "rejected") {
    console.error("Prediction generation failed:", predictionsResult.reason);
  }
  if (schedulePredResult.status === "rejected") {
    console.error("Schedule prediction failed:", schedulePredResult.reason);
  }

  // Phase 3: AI 결과 DB 저장
  const [predSave, scheduleSave] = await Promise.allSettled([
    predictionsResult.status === "fulfilled"
      ? supabase
          .from("opponent_predictions")
          .insert({ data: predictionsResult.value })
          .then(({ error }) => {
            if (error) throw error;
          })
      : Promise.reject(predictionsResult.reason),
    scheduleData && schedulePredResult.status === "fulfilled"
      ? supabase
          .from("ufc_schedule")
          .insert({
            data: {
              updatedAt: new Date().toISOString(),
              events: scheduleData.events,
              predictions: schedulePredResult.value,
            } satisfies UfcSchedule,
          })
          .then(({ error }) => {
            if (error) throw error;
          })
      : Promise.reject(
          scheduleRawResult.status === "rejected"
            ? scheduleRawResult.reason
            : schedulePredResult.status === "rejected"
              ? schedulePredResult.reason
              : new Error("schedule save skipped: unknown state")
        ),
  ]);

  // Collect results
  results.stats =
    statsSave.status === "fulfilled"
      ? { success: true, record: latestStats?.record }
      : { success: false, error: serializeError(statsSave.reason) };

  results.rankings =
    rankingsSave.status === "fulfilled"
      ? {
          success: true,
          divisions:
            rankingsResult.status === "fulfilled"
              ? rankingsResult.value.divisions.length
              : 0,
        }
      : { success: false, error: serializeError(rankingsSave.reason) };

  results.predictions =
    predSave.status === "fulfilled"
      ? {
          success: true,
          opponents:
            predictionsResult.status === "fulfilled"
              ? predictionsResult.value.opponents.length
              : 0,
        }
      : { success: false, error: serializeError(predSave.reason) };

  results.schedule =
    scheduleSave.status === "fulfilled"
      ? {
          success: true,
          events: scheduleData?.events.length ?? 0,
          predictions:
            schedulePredResult.status === "fulfilled"
              ? schedulePredResult.value.length
              : 0,
        }
      : { success: false, error: serializeError(scheduleSave.reason) };

  // revalidatePath는 stale 표시만 하고 즉시 재생성하지 않음
  // 직접 fetch로 워밍업해서 두 페이지가 동시에 최신 데이터를 갖도록 함
  revalidatePath("/");
  revalidatePath("/en");
  revalidatePath("/rankings");
  revalidatePath("/en/rankings");
  revalidatePath("/predictions");
  revalidatePath("/en/predictions");
  revalidatePath("/schedule");
  revalidatePath("/en/schedule");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    const pagesToWarm = [
      "/",
      "/en",
      "/rankings",
      "/en/rankings",
      "/predictions",
      "/en/predictions",
      "/schedule",
      "/en/schedule",
    ];
    await Promise.allSettled(
      pagesToWarm.map((path) =>
        fetch(`${siteUrl}${path}`, { cache: "no-store" })
      )
    );
  }

  const allSucceeded = Object.values(results).every(
    (r) => (r as { success: boolean }).success
  );

  return NextResponse.json(
    {
      success: allSucceeded,
      crawledAt: new Date().toISOString(),
      results,
    },
    { status: allSucceeded ? 200 : 207 }
  );
}
