import cachedPredictions from "@/data/cached-predictions.json";
import type { PredictionData } from "@/types/prediction";

/**
 * @description AI 다음 상대 예측 데이터를 로드한다.
 * Supabase `opponent_predictions`의 최신 row를 우선 사용하되 품질 체크를 통과해야 하며,
 * 실패 시 `cached-predictions.json`으로 폴백한다.
 *
 * 품질 체크: opponent가 1명 이상이고 그중 하나라도 실제 이미지(placeholder 아님)를 가져야 한다.
 * 크롤 시 UFC 이미지 스크레이핑이 실패하면 placeholder만 채워진 예측이 저장되는데, 이런
 * 데이터를 그대로 렌더하면 메인 페이지엔 깨진 사진이 뜨고 예측 페이지(동일 가드)는 cached로
 * 폴백해 두 페이지가 서로 다른 데이터를 보여주는 불일치가 생긴다. 가드를 공통화해 방지.
 * @returns 예측 데이터 (Supabase 또는 cached 폴백)
 */
export const getPredictions = async (): Promise<PredictionData> => {
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
        if (predictions.opponents?.length > 0 && hasRealImage)
          return predictions;
      }
    } catch {
      // Supabase 접근 실패 시 cached 폴백
    }
  }

  return cachedPredictions as PredictionData;
};
