import { analyzeMainEvent } from "@/lib/gemini";
import type { EventPrediction, UfcEvent, UfcSchedule } from "@/types/schedule";

import { scrapeUfcFighterImage } from "./ufc-image-scraper";

/**
 * @description 예정 UFC 이벤트 목록에 대해 Gemini AI 메인 이벤트 승부 예측 생성.
 * 기존 예측이 있는 이벤트는 건너뛰어 Gemini 호출 비용 절감.
 * @param events - 크롤링된 UFC 이벤트 배열
 * @param existingPredictions - DB에서 로드한 기존 예측 배열 (중복 방지용)
 * @returns 기존 예측 + 새로 생성된 예측 합산 배열
 */
export async function generateSchedulePredictions(
  events: UfcEvent[],
  existingPredictions: EventPrediction[]
): Promise<EventPrediction[]> {
  const existingIds = new Set(existingPredictions.map((p) => p.eventId));

  // 새 이벤트만 필터: 기존 예측 없고, 파이터 확정된 경우
  const eventsNeedingPrediction = events.filter((event) => {
    if (existingIds.has(event.id)) return false;
    const { fighter1, fighter2 } = event.mainEvent;
    // 둘 다 TBA면 건너뜀
    if (fighter1.name === "TBA" || fighter2.name === "TBA") return false;
    return true;
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

  // 기존 예측 + 신규 예측 합산해서 반환
  return [...existingPredictions, ...newPredictions];
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
