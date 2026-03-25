import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import PredictionDetail from "@/components/predictions/PredictionDetail";
import cachedPredictions from "@/data/cached-predictions.json";
import cachedStats from "@/data/cached-stats.json";
import type { FighterStats } from "@/types/fighter";
import type { PredictionData } from "@/types/prediction";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lets-ko.vercel.app";
  const origin = new URL(siteUrl).origin;

  const title = isKo
    ? "AI 다음 상대 예측 | 고석현"
    : "AI Next Opponent Prediction | Ko Seokhyeon";
  const description = isKo
    ? "AI 고석현 다음 상대 예측. Gemini AI가 분석한 고석현 선수의 다음 UFC 경기 상대 후보 3명의 상세 비교 분석과 승률 예측을 확인하세요."
    : "AI Ko Seokhyeon next opponent prediction. Gemini AI-powered analysis of Ko Seokhyeon's next UFC fight with detailed matchup comparison and win probability for 3 candidates.";

  return {
    title,
    description,
    keywords: isKo
      ? ["고석현 다음상대", "AI 고석현 다음 상대 예측", "고석현", "UFC", "AI 예측", "다음 상대", "승률 분석", "웰터급", "MMA"]
      : ["Ko Seokhyeon next opponent", "AI Ko Seokhyeon prediction", "Ko Seokhyeon", "UFC", "AI prediction", "next opponent", "win probability", "welterweight", "MMA"],
    alternates: {
      canonical: `/${locale}/predictions`,
      languages: {
        ko: "/ko/predictions",
        en: "/en/predictions",
        "x-default": "/ko/predictions",
      },
    },
    openGraph: {
      title,
      description,
      url: `${origin}/${locale}/predictions`,
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

async function getPredictions(): Promise<PredictionData> {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const { createServerClient } = await import("@/lib/supabase/server");
      const supabase = createServerClient();
      const { data } = await supabase
        .from("opponent_predictions")
        .select("data")
        .order("crawled_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.data) {
        const predictions = data.data as PredictionData;
        if (predictions.opponents?.length > 0) return predictions;
      }
    } catch {
      // Fall through to cached data
    }
  }

  return cachedPredictions as PredictionData;
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
    age: Math.floor(
      (Date.now() - new Date("1993-09-24").getTime()) /
        (1000 * 60 * 60 * 24 * 365.25)
    ),
    height: "177.8cm",
    weight: "77.1kg",
    reach: "180.3cm",
    style: { ko: "유도 / 삼보", en: "Judo / Sambo" },
    fightMatrixRank: koFightMatrixRank,
  };

  return (
    <PredictionDetail
      predictions={predictions}
      koStats={koComparisonStats}
      locale={locale}
    />
  );
}
