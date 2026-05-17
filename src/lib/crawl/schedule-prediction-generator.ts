import { analyzeMainEvent } from "@/lib/gemini";
import { isTbaMatchup } from "@/lib/schedule-utils";
import type { EventPrediction, UfcEvent, UfcSchedule } from "@/types/schedule";

import { scrapeUfcFighterImage } from "./ufc-image-scraper";

/**
 * @description 예정 UFC 이벤트 목록에 대해 Gemini AI 메인 이벤트 승부 예측 생성.
 * 같은 eventId의 기존 예측이 있고 파이터까지 동일하면 재사용해 Gemini 호출 비용 절감,
 * 파이터가 변경(TBA→확정, 부상 교체 등)된 경우 stale 예측을 폐기하고 새로 생성.
 * @param events - 크롤링된 UFC 이벤트 배열
 * @param existingPredictions - DB에서 로드한 기존 예측 배열 (재사용/대체 판단용)
 * @returns 유효한 기존 예측 + 새로 생성된 예측 합산 배열
 */
export async function generateSchedulePredictions(
  events: UfcEvent[],
  existingPredictions: EventPrediction[]
): Promise<EventPrediction[]> {
  const existingById = new Map(existingPredictions.map((p) => [p.eventId, p]));

  // 재예측 대상: 파이터 확정 + (신규 이벤트 OR 기존 예측의 파이터가 현재와 다름)
  // 같은 eventId라도 매치업 변경(TBA→확정, 부상 교체 등) 시 stale 예측 갱신
  const eventsNeedingPrediction = events.filter((event) => {
    const { fighter1, fighter2 } = event.mainEvent;
    if (isTbaMatchup(fighter1.name, fighter2.name)) return false;

    const existing = existingById.get(event.id);
    if (!existing) return true;
    return (
      existing.fighter1 !== fighter1.name || existing.fighter2 !== fighter2.name
    );
  });

  const newPredictions: EventPrediction[] = [];

  // 순차 처리 (Gemini 레이트 리밋 방지)
  for (const event of eventsNeedingPrediction) {
    try {
      const { fighter1, fighter2 } = event.mainEvent;
      const analysis = await analyzeMainEvent(
        fighter1.name,
        fighter2.name,
        event.name,
        event.mainEvent.weightClass
      );

      // 예측 승자 이미지 스크레이핑 (선택적)
      let winnerImageUrl: string | undefined;
      try {
        const winnerEn = analysis.winner.en;
        const img = await scrapeUfcFighterImage(winnerEn);
        if (img && !img.includes("placeholder")) {
          winnerImageUrl = img;
        }
      } catch {
        // 이미지 실패 시 무시
      }

      newPredictions.push({
        eventId: event.id,
        eventName: event.name,
        fighter1: fighter1.name,
        fighter2: fighter2.name,
        winner: analysis.winner,
        winnerImageUrl,
        winProbability: analysis.winProbability,
        method: analysis.method,
        analysis: analysis.analysis,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      // 개별 예측 실패는 non-blocking — 로그만 남기고 계속
      console.error(
        `Event prediction failed for ${event.name}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // 재생성된 eventId의 기존(stale) 예측은 제외하고 신규로 대체
  const regeneratedIds = new Set(newPredictions.map((p) => p.eventId));
  const keptExisting = existingPredictions.filter(
    (p) => !regeneratedIds.has(p.eventId)
  );
  return [...keptExisting, ...newPredictions];
}

/**
 * @description 기존 UfcSchedule 객체에서 predictions 배열 추출.
 * 크론 라우트에서 DB 로드 결과를 넘겨받아 기존 예측 재사용 시 사용.
 * @param existingSchedule - DB에서 불러온 UfcSchedule 또는 null
 * @returns 기존 예측 배열. 없으면 빈 배열
 */
export function extractExistingPredictions(
  existingSchedule: UfcSchedule | null
): EventPrediction[] {
  return existingSchedule?.predictions ?? [];
}
