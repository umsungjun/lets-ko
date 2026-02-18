import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { crawlUfcRankings } from "@/lib/crawl/rankings-crawler";
import { crawlUfcStats } from "@/lib/crawl/ufc-crawler";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const results: Record<string, unknown> = {};

  // Crawl fighter stats
  try {
    const stats = await crawlUfcStats();
    const { error } = await supabase.from("fighter_stats").insert({
      data: stats,
      source: "ufc_korea",
    });
    if (error) throw error;
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

  // Trigger revalidation
  revalidatePath("/ko");
  revalidatePath("/en");
  revalidatePath("/ko/rankings");
  revalidatePath("/en/rankings");

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
