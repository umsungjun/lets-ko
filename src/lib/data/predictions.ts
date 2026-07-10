import cachedPredictions from "@/data/cached-predictions.json";
import confirmedFightOverride from "@/data/confirmed-fight.json";
import type { ConfirmedFight, PredictionData } from "@/types/prediction";

/**
 * @description 수동 확정 경기 오버라이드(`confirmed-fight.json`)를 읽는다.
 * 자동 감지(크롤)가 UFC 미표기/이름 불일치로 놓칠 때 쓰는 안전망. 필수 필드가 채워졌을 때만 유효.
 * 확정 경기가 없으면 `{}`로 두면 되고, 그 경우 null을 반환한다.
 * @returns 유효한 확정 경기 또는 null
 */
const getConfirmedOverride = (): ConfirmedFight | null => {
  const o = confirmedFightOverride as Partial<ConfirmedFight>;
  if (o && o.opponent && o.date && o.event && o.location) {
    return o as ConfirmedFight;
  }
  return null;
};

/**
 * @description AI 다음 상대 예측 데이터를 로드한다.
 * Supabase `opponent_predictions`의 최신 row를 우선 사용하되 품질 체크를 통과해야 하며,
 * 실패 시 `cached-predictions.json`으로 폴백한다.
 *
 * 품질 체크: confirmedFight(확정 경기)가 있거나, opponent가 1명 이상이고 그중 하나라도
 * 실제 이미지(placeholder 아님)를 가져야 한다. confirmedFight만 있고 opponents가 비어도
 * 확정 카드를 띄워야 하므로 confirmedFight 존재를 별도 통과 조건으로 둔다.
 * (과거엔 이미지 조건만 검사해 confirmedFight-only 데이터가 캐시로 폴백되는 숨은 결합이 있었음)
 *
 * 마지막으로 수동 오버라이드(`confirmed-fight.json`)가 있으면 자동 감지보다 우선 적용한다.
 * @returns 예측 데이터 (Supabase 또는 cached 폴백, 오버라이드 반영)
 */
export const getPredictions = async (): Promise<PredictionData> => {
  let base = cachedPredictions as PredictionData;

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
        const hasRealImage = predictions.opponents?.some(
          (o) => o.imageUrl && !o.imageUrl.includes("placeholder")
        );
        if (
          predictions.confirmedFight ||
          (predictions.opponents?.length > 0 && hasRealImage)
        ) {
          base = predictions;
        }
      }
    } catch {
      // Supabase 접근 실패 시 cached 폴백
    }
  }

  // 수동 오버라이드가 있으면 자동 감지 결과보다 우선
  const override = getConfirmedOverride();
  if (override) return { ...base, confirmedFight: override };

  return base;
};
