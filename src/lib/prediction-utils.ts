import { toCalendarDate } from "@/lib/date-utils";
import type { OpponentPrediction, PredictionData } from "@/types/prediction";

/**
 * @description 후보 중 한 명이라도 실제 UFC 사진을 가졌는지 판정한다. 로더 품질 체크와 크롤 재사용 판정이 공유한다.
 * 사진 스크래핑이 전부 막힌 행은 로더가 거부하므로 크롤도 재사용하지 않아야 한다.
 * @param opponents - AI 상대 후보
 * @returns 실제 사진이 하나라도 있으면 true
 */
export const hasRealOpponentImage = (
  opponents: OpponentPrediction[] | undefined
): boolean =>
  (opponents ?? []).some(
    (o) => o.imageUrl && !o.imageUrl.includes("placeholder")
  );

/**
 * @description 상대 후보가 고석현의 최근 경기 이후에 만들어졌는지 판정한다. 크롤의 후보 재사용과 확정 전 후보 표시가 공유한다.
 * 경기 당일 생성분은 결과를 몰랐을 수 있어 이전 것으로 본다.
 * @param data - 후보 생성 시각과 최근 경기일
 * @returns 최근 경기 다음 날 이후 생성이면 true. 최근 경기일이 없거나 읽을 수 없으면 true
 */
export const isGeneratedAfterLastFight = (
  data: Pick<PredictionData, "generatedAt" | "lastFightDate">
): boolean => {
  // 옛 행의 경기일은 "Nov. 7, 2026" 같은 크롤 원문이라 그대로 비교하면 항상 거짓이 된다(2026-11 로컬 크롤에서 확인)
  const fightDay = toCalendarDate(data.lastFightDate);
  if (!fightDay) return true;
  return data.generatedAt.slice(0, 10) > fightDay;
};
