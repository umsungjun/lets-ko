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
 * 상대·이벤트가 기존 확정과 동일하고 신체 스펙까지 보강돼 있으면 Gemini 재호출 없이 재사용(비용 절감),
 * 신규/변경 또는 스펙 미보강(구버전 데이터)이면 Gemini로 한국어명·국적·스타일·나이·신장/체중/리치·전적을 보강.
 * 고석현 매치가 없으면 null.
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

  // 기존 확정과 상대·대회가 같은지 (Gemini 재호출 여부 판단)
  const sameAsExisting =
    existing &&
    existing.opponent.name.en.toLowerCase() === opponent.name.toLowerCase() &&
    existing.event === event.name;

  // 기존 보강 정보를 유지한 채 이미지/전적/날짜/장소만 최신화.
  // 크롤에 전적이 없으면(0-0-0) 기존 전적을 유지해 다운그레이드 방지.
  const reuseExisting = (): ConfirmedFight => {
    const crawled = parseRecord(opponent.record);
    const hasCrawledRecord = crawled.wins + crawled.losses + crawled.draws > 0;
    return {
      ...existing!,
      opponent: {
        ...existing!.opponent,
        imageUrl: opponent.imageUrl || existing!.opponent.imageUrl,
        record: hasCrawledRecord ? crawled : existing!.opponent.record,
      },
      date: event.date,
      location: event.location,
      event: event.name,
    };
  };

  // 신체 스펙(height)까지 이미 보강된 기존 데이터면 Gemini 재호출 없이 재사용.
  // height가 없으면 Tale of the Tape 도입 이전 데이터이므로 아래 enrich 경로로 백필.
  if (sameAsExisting && existing.opponent.height) {
    return reuseExisting();
  }

  // 신규/변경된 상대 → Gemini로 한국어명·국적·스타일·신체 스펙·전적 보강
  let enrich: {
    nameKo: string;
    country: string;
    fightingStyle: { ko: string; en: string };
    age?: number;
    height?: string;
    weight?: string;
    reach?: string;
    record?: string;
  };
  try {
    enrich = await analyzeConfirmedOpponent(opponent.name, opponent.record);
  } catch {
    // 보강 실패: 기존 데이터가 있으면 그대로 유지, 없으면 최소 정보 폴백
    if (sameAsExisting) return reuseExisting();
    enrich = {
      nameKo: opponent.name,
      country: "",
      fightingStyle: { ko: "", en: "" },
    };
  }

  // 전적은 크롤값 우선, 크롤에 없으면(0-0-0) Gemini 보강값 폴백
  const crawledRecord = parseRecord(opponent.record);
  const hasCrawledRecord =
    crawledRecord.wins + crawledRecord.losses + crawledRecord.draws > 0;

  return {
    opponent: {
      name: { ko: enrich.nameKo, en: opponent.name },
      // 백필 경로(sameAsExisting)에서 크롤 이미지가 비어도 기존 이미지를 유지
      imageUrl:
        opponent.imageUrl ||
        (sameAsExisting ? existing!.opponent.imageUrl : ""),
      country: enrich.country,
      record: hasCrawledRecord ? crawledRecord : parseRecord(enrich.record),
      fightingStyle: enrich.fightingStyle,
      age: enrich.age,
      height: enrich.height,
      weight: enrich.weight,
      reach: enrich.reach,
    },
    date: event.date,
    location: event.location,
    event: event.name,
  };
}
