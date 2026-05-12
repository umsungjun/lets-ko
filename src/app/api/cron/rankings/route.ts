import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { crawlUfcRankings } from "@/lib/crawl/rankings-crawler";
import { createServerClient } from "@/lib/supabase/server";

export const maxDuration = 30;

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

  try {
    const rankings = await crawlUfcRankings();
    const { error } = await supabase
      .from("ufc_rankings")
      .insert({ data: rankings, source: "ufc_korea" });
    if (error) throw error;

    revalidatePath("/rankings");
    revalidatePath("/en/rankings");

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl) {
      await Promise.allSettled([
        fetch(`${siteUrl}/rankings`, { cache: "no-store" }),
        fetch(`${siteUrl}/en/rankings`, { cache: "no-store" }),
      ]);
    }

    return NextResponse.json({
      success: true,
      crawledAt: new Date().toISOString(),
      divisions: rankings.divisions.length,
    });
  } catch (error) {
    console.error("Rankings cron failed:", error);
    return NextResponse.json(
      {
        success: false,
        crawledAt: new Date().toISOString(),
        error: serializeError(error),
      },
      { status: 500 }
    );
  }
}
