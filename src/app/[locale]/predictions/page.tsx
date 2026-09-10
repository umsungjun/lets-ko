import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import PredictionDetail from "@/components/predictions/PredictionDetail";
import cachedStats from "@/data/cached-stats.json";
import { getPredictions } from "@/lib/data/predictions";
import { buildKoComparisonStats } from "@/lib/ko-stats";
import { buildPageMetadata } from "@/lib/seo/metadata";
import type { FighterStats } from "@/types/fighter";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  const title = isKo
    ? "고석현 다음 상대 예측"
    : "Ko Seokhyeon Next Opponent Prediction";
  const description = isKo
    ? "AI 고석현 다음 상대 예측. Gemini AI가 분석한 고석현 선수의 다음 UFC 경기 상대 후보 3명의 상세 비교 분석과 승률 예측을 확인하세요."
    : "AI Ko Seokhyeon next opponent prediction. Gemini AI-powered analysis of Ko Seokhyeon's next UFC fight with detailed matchup comparison and win probability for 3 candidates.";

  return buildPageMetadata({
    locale,
    path: "/predictions",
    title,
    description,
    keywords: isKo
      ? [
          "고석현 다음 경기",
          "고석현 다음 상대",
          "고석현 다음상대",
          "고석현",
          "UFC",
          "AI 예측",
          "승률 분석",
          "웰터급",
          "MMA",
        ]
      : [
          "Ko Seokhyeon next fight",
          "Ko Seokhyeon next opponent",
          "Ko Seokhyeon",
          "UFC",
          "AI prediction",
          "win probability",
          "welterweight",
          "MMA",
        ],
  });
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

  // 고석현 비교용 데이터 (cm/kg 단위, 메인 페이지와 공통 빌더 사용)
  const koComparisonStats = buildKoComparisonStats(
    stats,
    predictions.koFightMatrixRank,
    predictions.lastFightDate
  );

  return (
    <PredictionDetail
      predictions={predictions}
      koStats={koComparisonStats}
      locale={locale}
    />
  );
}
