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
import type { FighterStats } from "@/types/fighter";
import type { UfcSchedule } from "@/types/schedule";

// 크론 함수 타임아웃 연장 (스케줄 크롤 + Gemini 호출 추가로 시간 증가)
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const results: Record<string, unknown> = {};
  let latestStats: FighterStats | undefined;

  // Crawl fighter stats
  try {
    const stats = await crawlUfcStats();
    const { error } = await supabase.from("fighter_stats").insert({
      data: stats,
      source: "ufc_korea",
    });
    if (error) throw error;
    latestStats = stats;
    results.stats = { success: true, record: stats.record };
  } catch (error) {
    console.error("Stats crawl failed:", error);
    results.stats = { success: false, error: String(error) };
  }

  // Crawl UFC rankings
  try {
    const rankings = await crawlUfcRankings();
    const { error } = await supabase.from("ufc_rankings").insert({
      data: rankings,
      source: "ufc_korea",
    });
    if (error) throw error;
    results.rankings = {
      success: true,
      divisions: rankings.divisions.length,
    };
  } catch (error) {
    console.error("Rankings crawl failed:", error);
    results.rankings = { success: false, error: String(error) };
  }

  // Generate AI opponent predictions (depends on fresh stats)
  try {
    const predictions = await generatePredictions(latestStats);
    const { error } = await supabase.from("opponent_predictions").insert({
      data: predictions,
    });
    if (error) throw error;
    results.predictions = {
      success: true,
      opponents: predictions.opponents.length,
    };
  } catch (error) {
    console.error("Prediction generation failed:", error);
    results.predictions = { success: false, error: String(error) };
  }

  // Crawl UFC schedule + generate AI main event predictions
  try {
    // 기존 스케줄에서 이미 생성된 예측 재사용 (Gemini 호출 최소화)
    const { data: existingRow } = await supabase
      .from("ufc_schedule")
      .select("data")
      .order("crawled_at", { ascending: false })
      .limit(1)
      .single();

    const existingSchedule = existingRow?.data as UfcSchedule | null;
    const existingPredictions = extractExistingPredictions(existingSchedule);

    const events = await crawlUfcSchedule();
    const predictions = await generateSchedulePredictions(
      events,
      existingPredictions
    );

    const scheduleBlob: UfcSchedule = {
      updatedAt: new Date().toISOString(),
      events,
      predictions,
    };

    const { error } = await supabase
      .from("ufc_schedule")
      .insert({ data: scheduleBlob });
    if (error) throw error;

    results.schedule = {
      success: true,
      events: events.length,
      predictions: predictions.length,
    };
  } catch (error) {
    console.error("Schedule crawl failed:", error);
    results.schedule = { success: false, error: String(error) };
  }

  // Trigger revalidation (ko는 prefix 없음, localePrefix: "as-needed")
  revalidatePath("/");
  revalidatePath("/en");
  revalidatePath("/rankings");
  revalidatePath("/en/rankings");
  revalidatePath("/predictions");
  revalidatePath("/en/predictions");
  revalidatePath("/schedule");
  revalidatePath("/en/schedule");

  // revalidatePath는 stale 표시만 하고 즉시 재생성하지 않음
  // 직접 fetch로 워밍업해서 두 페이지가 동시에 최신 데이터를 갖도록 함
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
    },
    { status: allSucceeded ? 200 : 207 }
  );
}
