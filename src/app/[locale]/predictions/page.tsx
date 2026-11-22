import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import JsonLd from "@/components/common/JsonLd";
import PredictionDetail from "@/components/predictions/PredictionDetail";
import { loadFighterNamesKo } from "@/lib/data/fighter-names";
import { getPredictions } from "@/lib/data/predictions";
import { getFighterStats } from "@/lib/data/stats";
import {
  buildFighterNameIndex,
  fighterNameKey,
} from "@/lib/fighter-name-utils";
import { buildKoComparisonStats } from "@/lib/ko-stats";
import {
  buildBreadcrumbJsonLd,
  buildConfirmedFightJsonLd,
} from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";

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

  // 후보가 없을 때만 직전 경기를 띄우므로 이름 사전(테이블 전체 조회)도 그때만 읽는다
  const latestFight = stats.fightHistory?.[0];
  const lastFight =
    latestFight &&
    !predictions.confirmedFight &&
    predictions.opponents.length === 0
      ? {
          fight: latestFight,
          opponentKo: buildFighterNameIndex(await loadFighterNamesKo()).get(
            fighterNameKey(latestFight.opponent)
          ),
        }
      : undefined;

  const confirmedFightNode = predictions.confirmedFight
    ? buildConfirmedFightJsonLd(predictions.confirmedFight, locale)
    : null;
  const breadcrumbName = predictions.confirmedFight
    ? locale === "ko"
      ? "고석현 다음 경기"
      : "Ko Seokhyeon's Next Fight"
    : locale === "ko"
      ? "고석현 다음 상대 예측"
      : "Ko Seokhyeon Next Opponent Prediction";

  return (
    <>
      <JsonLd
        data={[
          buildBreadcrumbJsonLd(locale, breadcrumbName, "/predictions"),
          ...(confirmedFightNode ? [confirmedFightNode] : []),
        ]}
      />
      <PredictionDetail
        predictions={predictions}
        koStats={koComparisonStats}
        locale={locale}
        lastFight={lastFight}
      />
    </>
  );
}
