import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { crawlUfcStats } from "@/lib/crawl/ufc-crawler";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await crawlUfcStats();

    // Store in Supabase
    const supabase = createServerClient();
    const { error } = await supabase.from("fighter_stats").insert({
      data: stats,
      source: "ufc_korea",
    });

    if (error) {
      console.error("Failed to store crawled data:", error);
      return NextResponse.json(
        { error: "Failed to store data", details: error.message },
        { status: 500 }
      );
    }

    // Trigger revalidation
    revalidatePath("/ko");
    revalidatePath("/en");

    return NextResponse.json({
      success: true,
      crawledAt: new Date().toISOString(),
      record: stats.record,
    });
  } catch (error) {
    console.error("Crawl failed:", error);
    return NextResponse.json(
      { error: "Crawl failed", details: String(error) },
      { status: 500 }
    );
  }
}
