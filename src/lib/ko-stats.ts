import type { FighterStats } from "@/types/fighter";

import { differenceInYears } from "date-fns";

// 크롤된 스탯은 임페리얼 표기(5'10", 170 lbs)라 비교 UI에는 메트릭 고정값을 사용
export const KO_PROFILE = {
  birthDate: "1993-09-24",
  height: "177.8cm",
  weight: "77.1kg",
  reach: "180.3cm",
  style: { ko: "유도 / 삼보", en: "Judo / Sambo" },
  country: { ko: "대한민국", en: "South Korea" },
} as const;

// 고석현 vs 상대 비교(Tale of the Tape) UI에서 공통으로 쓰는 고석현 측 데이터
export interface KoComparisonStats {
  record: string;
  age: number;
  height: string;
  weight: string;
  reach: string;
  style: { ko: string; en: string };
  country: { ko: string; en: string };
  fightMatrixRank: number;
  lastFightDate?: string;
}

/**
 * @description 크롤된 선수 스탯에서 비교 UI용 고석현 데이터를 구성. 메인·예측 페이지가 공유.
 * @param stats - 크롤된 고석현 스탯 (전적/외부 랭킹/전적 히스토리)
 * @param fallbackRank - externalRankings에 FightMatrix가 없을 때 사용할 랭킹
 * @param fallbackLastFightDate - fightHistory가 비어있을 때 사용할 최근 경기일
 * @returns 비교 UI용 고석현 스탯
 */
export function buildKoComparisonStats(
  stats: FighterStats,
  fallbackRank: number,
  fallbackLastFightDate?: string
): KoComparisonStats {
  const fightMatrixRank =
    stats.externalRankings?.find((r) => r.site === "FightMatrix")?.rank ??
    fallbackRank;

  return {
    record: `${stats.record.wins}-${stats.record.losses}-${stats.record.draws}`,
    age: differenceInYears(new Date(), new Date(KO_PROFILE.birthDate)),
    height: KO_PROFILE.height,
    weight: KO_PROFILE.weight,
    reach: KO_PROFILE.reach,
    style: KO_PROFILE.style,
    country: KO_PROFILE.country,
    fightMatrixRank,
    // stats.fightHistory가 더 신뢰할 수 있는 ISO 형식이므로 우선 사용
    lastFightDate: stats.fightHistory?.[0]?.date || fallbackLastFightDate,
  };
}
