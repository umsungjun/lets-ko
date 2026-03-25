import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { generatePredictions } from "@/lib/crawl/prediction-generator";
import { crawlUfcRankings } from "@/lib/crawl/rankings-crawler";
import { crawlUfcStats } from "@/lib/crawl/ufc-crawler";
import { createServerClient } from "@/lib/supabase/server";
import type { FighterStats } from "@/types/fighter";

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

  // Trigger revalidation
  revalidatePath("/ko");
  revalidatePath("/en");
  revalidatePath("/ko/rankings");
  revalidatePath("/en/rankings");
  revalidatePath("/ko/predictions");
  revalidatePath("/en/predictions");

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
