import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import PredictionDetail from "@/components/predictions/PredictionDetail";
import cachedStats from "@/data/cached-stats.json";
import { getPredictions } from "@/lib/data/predictions";
import type { FighterStats } from "@/types/fighter";

import { differenceInYears } from "date-fns";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://lets-ko.vercel.app";
  const origin = new URL(siteUrl).origin;

  const title = isKo
    ? "고석현 다음 상대 예측"
    : "Ko Seokhyeon Next Opponent Prediction";
  const description = isKo
    ? "AI 고석현 다음 상대 예측. Gemini AI가 분석한 고석현 선수의 다음 UFC 경기 상대 후보 3명의 상세 비교 분석과 승률 예측을 확인하세요."
    : "AI Ko Seokhyeon next opponent prediction. Gemini AI-powered analysis of Ko Seokhyeon's next UFC fight with detailed matchup comparison and win probability for 3 candidates.";

  return {
    title,
    description,
    keywords: isKo
      ? [
          "고석현 다음상대",
          "AI 고석현 다음 상대 예측",
          "고석현",
          "UFC",
          "AI 예측",
          "다음 상대",
          "승률 분석",
          "웰터급",
          "MMA",
        ]
      : [
          "Ko Seokhyeon next opponent",
          "AI Ko Seokhyeon prediction",
          "Ko Seokhyeon",
          "UFC",
          "AI prediction",
          "next opponent",
          "win probability",
          "welterweight",
          "MMA",
        ],
    alternates: {
      canonical: locale === "ko" ? "/predictions" : `/${locale}/predictions`,
      languages: {
        ko: "/predictions",
        en: "/en/predictions",
        "x-default": "/predictions",
      },
    },
    openGraph: {
      title,
      description,
      url:
        locale === "ko"
          ? `${origin}/predictions`
          : `${origin}/${locale}/predictions`,
      siteName: "LET'S KO",
      locale: isKo ? "ko_KR" : "en_US",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og.png`],
    },
  };
}

async function getFighterStats(): Promise<FighterStats> {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const { createServerClient } = await import("@/lib/supabase/server");
      const supabase = createServerClient();
      const { data } = await supabase
        .from("fighter_stats")
        .select("data")
        .order("crawled_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.data) {
        const stats = data.data as FighterStats;
        if (stats.record.wins + stats.record.losses + stats.record.draws > 0) {
          return stats;
        }
      }
    } catch {
      // Fall through
    }
  }

  return cachedStats as FighterStats;
}

export default async function PredictionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [predictions, stats] = await Promise.all([
    getPredictions(),
    getFighterStats(),
  ]);

  // 고석현 비교용 데이터 (cm/kg 단위)
  const koFightMatrixRank =
    stats.externalRankings?.find((r) => r.site === "FightMatrix")?.rank ??
    predictions.koFightMatrixRank;

  const koComparisonStats = {
    record: `${stats.record.wins}-${stats.record.losses}-${stats.record.draws}`,
    age: differenceInYears(new Date(), new Date("1993-09-24")),
    height: "177.8cm",
    weight: "77.1kg",
    reach: "180.3cm",
    style: { ko: "유도 / 삼보", en: "Judo / Sambo" },
    fightMatrixRank: koFightMatrixRank,
    // stats.fightHistory가 더 신뢰할 수 있는 ISO 형식이므로 우선 사용
    lastFightDate: stats.fightHistory?.[0]?.date || predictions.lastFightDate,
  };

  return (
    <PredictionDetail
      predictions={predictions}
      koStats={koComparisonStats}
      locale={locale}
    />
  );
}
