import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import RankingsView from "@/components/rankings/RankingsView";
import cachedRankings from "@/data/cached-rankings.json";
import type { UfcRankings } from "@/types/rankings";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  return {
    title: isKo ? "UFC 공식 랭킹" : "Official UFC Rankings",
    description: isKo
      ? "UFC 전 체급 공식 랭킹. 챔피언, 파운드 포 파운드, 체급별 1~15위 파이터 순위를 확인하세요."
      : "Official UFC rankings across all divisions. View champions, pound-for-pound, and ranked fighters 1-15.",
    alternates: {
      canonical: `/${locale}/rankings`,
      languages: { ko: "/ko/rankings", en: "/en/rankings" },
    },
  };
}

async function getRankings(): Promise<UfcRankings> {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const { createServerClient } = await import("@/lib/supabase/server");
      const supabase = createServerClient();
      const { data } = await supabase
        .from("ufc_rankings")
        .select("data")
        .order("crawled_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.data) {
        const rankings = data.data as UfcRankings;
        if (rankings.divisions && rankings.divisions.length >= 6) {
          return rankings;
        }
      }
    } catch {
      // Fall through to cached data
    }
  }

  return cachedRankings as UfcRankings;
}

export default async function RankingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const rankings = await getRankings();

  return (
    <section className="py-12 px-4">
      <div className="mx-auto max-w-5xl">
        <RankingsView rankings={rankings} locale={locale} />
      </div>
    </section>
  );
}
