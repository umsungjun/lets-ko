import cachedPredictions from "@/data/cached-predictions.json";
import confirmedFightOverride from "@/data/confirmed-fight.json";
import { getKstDaysUntil } from "@/lib/date-utils";
import type { ConfirmedFight, PredictionData } from "@/types/prediction";

// 오버라이드는 KST 날짜, 크롤은 메인 카드 UTC 날짜라 하루 어긋날 수 있어 경기 다음 날까지는 카드를 남긴다
const FINISHED_GRACE_DAYS = 1;

/**
 * @description 확정 경기가 이미 끝났는지 판정한다. 경기일 다음 날까지는 진행 중으로 본다.
 * 날짜를 못 읽으면 끝나지 않은 것으로 보고 카드를 유지한다.
 * @param fight - 확정 경기 (date만 사용)
 * @returns 경기일 + 유예일이 지났으면 true
 */
export const isConfirmedFightOver = (
  fight: Pick<ConfirmedFight, "date">
): boolean => {
  const days = getKstDaysUntil(fight.date);
  return days !== null && days < -FINISHED_GRACE_DAYS;
};

/**
 * @description 수동 확정 경기 오버라이드(`confirmed-fight.json`)를 읽는다.
 * 자동 감지(크롤)가 UFC 미표기/이름 불일치로 놓칠 때 쓰는 안전망. 필수 필드가 채워졌을 때만 유효.
 * 경기가 끝나면 스스로 만료된다. 만료가 없던 때는 지난 경기가 화면과 DB에 계속 남아 상대 예측이 멈췄다(2026-11).
 * @returns 유효하고 아직 끝나지 않은 확정 경기, 아니면 null
 */
export const getConfirmedOverride = (): ConfirmedFight | null => {
  const o = confirmedFightOverride as Partial<ConfirmedFight>;
  if (!o || !o.opponent || !o.date || !o.event || !o.location) return null;
  const fight = o as ConfirmedFight;
  return isConfirmedFightOver(fight) ? null : fight;
};

/**
 * @description 끝난 확정 경기를 떼어낸다. 크롤이 아직 돌지 않아 DB에 지난 경기가 남아 있어도 화면에는 내보내지 않기 위함.
 * @param predictions - DB(또는 캐시)에서 읽은 예측 데이터
 * @returns 끝난 confirmedFight를 제거한 예측 데이터
 */
const dropFinishedFight = (predictions: PredictionData): PredictionData => {
  if (!predictions.confirmedFight) return predictions;
  if (!isConfirmedFightOver(predictions.confirmedFight)) return predictions;
  return { ...predictions, confirmedFight: undefined };
};

/**
 * @description 오버라이드 JSON은 프로필만 손으로 채운다. AI 예측은 크롤이 DB에 남긴 것을 같은 상대일 때만 이어받는다.
 * JSON에 `aiPrediction`을 직접 넣었으면 그 값이 우선.
 * @param override - 수동 오버라이드 확정 경기
 * @param stored - DB(또는 캐시)에 저장된 확정 경기
 * @returns 예측이 병합된 오버라이드
 */
const mergeOverridePrediction = (
  override: ConfirmedFight,
  stored?: ConfirmedFight
): ConfirmedFight => {
  if (override.aiPrediction || !stored?.aiPrediction) return override;
  // 대회명은 비교하지 않는다. 손으로 적은 오버라이드와 슬러그에서 derive한 대회명은 표기가 어긋나기 쉽다
  const sameOpponent =
    stored.opponent.name.en.trim().toLowerCase() ===
    override.opponent.name.en.trim().toLowerCase();
  return sameOpponent
    ? { ...override, aiPrediction: stored.aiPrediction }
    : override;
};

/**
 * @description AI 다음 상대 예측 데이터를 로드한다.
 * Supabase `opponent_predictions`의 최신 row를 우선 사용하되 품질 체크를 통과해야 하며,
 * 실패 시 `cached-predictions.json`으로 폴백한다.
 *
 * 품질 체크는 셋 중 하나를 통과하면 된다.
 * - 아직 끝나지 않은 confirmedFight가 있다 (opponents가 비어도 확정 카드를 띄워야 함)
 * - 경기 직후 대기 상태다 (opponents 0명 + lastFightDate). 거부하면 몇 달 묵은 캐시 예측이 뜬다
 * - opponent가 1명 이상이고 그중 하나라도 실제 이미지(placeholder 아님)를 가진다
 *
 * 마지막으로 수동 오버라이드(`confirmed-fight.json`)가 있으면 자동 감지보다 우선 적용하되,
 * AI 승부 예측은 저장된 확정 경기가 같은 상대일 때 이어받는다. 끝난 경기는 DB 값·오버라이드 모두 버린다.
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
        const predictions = dropFinishedFight(data.data as PredictionData);
        const opponentCount = predictions.opponents?.length ?? 0;
        const hasRealImage = predictions.opponents?.some(
          (o) => o.imageUrl && !o.imageUrl.includes("placeholder")
        );
        const isWaiting = opponentCount === 0 && !!predictions.lastFightDate;
        if (
          predictions.confirmedFight ||
          isWaiting ||
          (opponentCount > 0 && hasRealImage)
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
  if (override) {
    return {
      ...base,
      confirmedFight: mergeOverridePrediction(override, base.confirmedFight),
    };
  }

  return base;
};
