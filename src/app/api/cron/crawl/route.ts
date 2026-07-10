import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { detectKoConfirmedFight } from "@/lib/crawl/confirmed-fight";
import { generatePredictions } from "@/lib/crawl/prediction-generator";
import { crawlUfcSchedule } from "@/lib/crawl/schedule-crawler";
import {
  extractExistingPredictions,
  generateSchedulePredictions,
} from "@/lib/crawl/schedule-prediction-generator";
import { crawlUfcStats } from "@/lib/crawl/ufc-crawler";
import { createServerClient } from "@/lib/supabase/server";
import type { PredictionData } from "@/types/prediction";
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

  // Phase 1: 독립 크롤링 병렬 실행 (stats/schedule은 서로 의존성 없음)
  const [statsResult, scheduleRawResult] = await Promise.allSettled([
    crawlUfcStats(),
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
  if (scheduleRawResult.status === "rejected") {
    console.error("Schedule crawl failed:", scheduleRawResult.reason);
  }

  // Phase 2: DB 저장(stats) + AI 예측 병렬 실행
  // DB 저장은 I/O 위주라 Gemini 호출과 병렬로 실행 가능
  // 두 Gemini 태스크는 각 내부가 순차이므로 동시 최대 호출 수 = 2
  const [statsSave, predictionsResult, schedulePredResult] =
    await Promise.allSettled([
      statsResult.status === "fulfilled"
        ? supabase
            .from("fighter_stats")
            .insert({ data: statsResult.value, source: "ufc_korea" })
            .then(({ error }) => {
              if (error) throw error;
            })
        : Promise.reject(statsResult.reason),
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

  // Phase 2.5: 고석현 확정 경기 자동 감지 → 예측 데이터(confirmedFight)에 부착
  // 일정 크롤 + 예측 생성 모두 성공 시에만 시도. 기존 확정과 동일하면 Gemini 재호출 생략.
  // 감지 실패는 non-blocking (전체 크롤 성공 판정에 영향 주지 않음).
  let confirmedFightInfo: unknown = null;
  if (scheduleData && predictionsResult.status === "fulfilled") {
    try {
      const { data: prevPred } = await supabase
        .from("opponent_predictions")
        .select("data")
        .order("crawled_at", { ascending: false })
        .limit(1)
        .single();
      const existingConfirmed =
        (prevPred?.data as PredictionData | null)?.confirmedFight ?? null;
      const confirmed = await detectKoConfirmedFight(
        scheduleData.events,
        existingConfirmed
      );
      if (confirmed) {
        predictionsResult.value.confirmedFight = confirmed;
        confirmedFightInfo = {
          opponent: confirmed.opponent.name.en,
          event: confirmed.event,
          date: confirmed.date,
        };
      }
    } catch (err) {
      console.error("Confirmed fight detection failed:", err);
      confirmedFightInfo = { error: serializeError(err) };
    }
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
  revalidatePath("/predictions");
  revalidatePath("/en/predictions");
  revalidatePath("/schedule");
  revalidatePath("/en/schedule");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    const pagesToWarm = [
      "/",
      "/en",
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
      confirmedFight: confirmedFightInfo,
    },
    { status: allSucceeded ? 200 : 207 }
  );
}
