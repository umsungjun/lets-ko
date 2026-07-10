import { analyzeConfirmedOpponent } from "@/lib/gemini";
import { isKoSeokhyeon } from "@/lib/ko-fighter";
import { isTbaFighter } from "@/lib/schedule-utils";
import type { ConfirmedFight } from "@/types/prediction";
import type { UfcEvent, UfcEventFighter } from "@/types/schedule";

// "22-7-0" 형태 전적 문자열 파싱 (실패 시 0-0-0)
const parseRecord = (
  record?: string
): { wins: number; losses: number; draws: number } => {
  const m = record?.match(/(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/);
  if (!m) return { wins: 0, losses: 0, draws: 0 };
  return { wins: +m[1], losses: +m[2], draws: +m[3] };
};

// 이벤트 목록에서 고석현이 출전하는 첫 매치의 (이벤트, 상대) 반환
const findKoMatch = (
  events: UfcEvent[]
): { event: UfcEvent; opponent: UfcEventFighter } | null => {
  for (const event of events) {
    const fights = [
      event.mainEvent,
      event.coMainEvent,
      ...(event.fightCard?.mainCard ?? []),
      ...(event.fightCard?.prelimCard ?? []),
      ...(event.fightCard?.earlyPrelimCard ?? []),
    ];
    for (const fight of fights) {
      if (!fight) continue;
      const koIs1 = isKoSeokhyeon(fight.fighter1.name);
      const koIs2 = isKoSeokhyeon(fight.fighter2.name);
      if (!koIs1 && !koIs2) continue;
      const opponent = koIs1 ? fight.fighter2 : fight.fighter1;
      // 상대가 미확정(TBA)이면 아직 "확정 경기"가 아님
      if (isTbaFighter(opponent.name)) continue;
      return { event, opponent };
    }
  }
  return null;
};

/**
 * @description 크롤된 UFC 일정에서 고석현의 확정 경기를 자동 감지해 ConfirmedFight 생성.
 * 상대·이벤트가 기존 확정과 동일하면 Gemini 재호출 없이 부가정보를 재사용(비용 절감),
 * 신규/변경 시에만 Gemini로 한국어명·국적·스타일 보강. 고석현 매치가 없으면 null.
 * @param events - 크롤된 UFC 이벤트 배열
 * @param existing - DB에 저장된 기존 confirmedFight (재사용 판단용, 선택)
 * @returns 확정 경기 정보 또는 null
 */
export async function detectKoConfirmedFight(
  events: UfcEvent[],
  existing?: ConfirmedFight | null
): Promise<ConfirmedFight | null> {
  const match = findKoMatch(events);
  if (!match) return null;
  const { event, opponent } = match;

  // 기존 확정과 상대·대회가 같으면 Gemini 재호출 없이 재사용 (이미지/날짜/장소만 최신화)
  const sameAsExisting =
    existing &&
    existing.opponent.name.en.toLowerCase() === opponent.name.toLowerCase() &&
    existing.event === event.name;

  if (sameAsExisting) {
    return {
      ...existing,
      opponent: {
        ...existing.opponent,
        imageUrl: opponent.imageUrl || existing.opponent.imageUrl,
        record: parseRecord(opponent.record),
      },
      date: event.date,
      location: event.location,
      event: event.name,
    };
  }

  // 신규/변경된 상대 → Gemini로 한국어명·국적·스타일 보강 (실패 시 최소 정보 폴백)
  let enrich: {
    nameKo: string;
    country: string;
    fightingStyle: { ko: string; en: string };
  };
  try {
    enrich = await analyzeConfirmedOpponent(opponent.name, opponent.record);
  } catch {
    enrich = {
      nameKo: opponent.name,
      country: "",
      fightingStyle: { ko: "", en: "" },
    };
  }

  return {
    opponent: {
      name: { ko: enrich.nameKo, en: opponent.name },
      imageUrl: opponent.imageUrl ?? "",
      country: enrich.country,
      record: parseRecord(opponent.record),
      fightingStyle: enrich.fightingStyle,
    },
    date: event.date,
    location: event.location,
    event: event.name,
  };
}
