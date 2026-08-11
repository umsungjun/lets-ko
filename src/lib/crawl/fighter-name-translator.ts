import { translateFighterNames } from "@/lib/gemini";
import { isTbaFighter } from "@/lib/schedule-utils";
import type { UfcRankings } from "@/types/rankings";
import type { UfcEvent, UfcEventFight } from "@/types/schedule";

// 실행당 신규 번역 상한. Gemini 호출이 크롤 함수의 60초(Hobby) 예산을 넘기지 않도록 제한 —
// 나머지는 다음 실행에서 채워짐. 시드 사전이 있어 평소엔 신규 선수 몇 명 수준.
const MAX_NEW_TRANSLATIONS_PER_RUN = 80;

// 한 번 호출당 전달할 이름 수. 응답이 길어질수록 스키마 이탈·타임아웃 위험이 커져 나눠 호출.
const BATCH_SIZE = 40;

/** 매치업의 두 파이터 이름 (미확정 제외) */
const fightNames = (fight: UfcEventFight | undefined): string[] =>
  [fight?.fighter1.name, fight?.fighter2.name].filter(
    (name): name is string => !!name && !isTbaFighter(name)
  );

/**
 * @description 일정 이벤트에서 번역 대상 파이터명 수집.
 * 메인 이벤트를 앞에 둬 실행당 상한에 걸려도 가장 눈에 띄는 이름부터 채워지게 한다.
 * @param events - UFC 이벤트 배열
 * @returns 노출 우선순위 순 영문명 배열 (중복 포함)
 */
export const collectScheduleFighterNames = (events: UfcEvent[]): string[] => [
  ...events.flatMap((e) => fightNames(e.mainEvent)),
  ...events.flatMap((e) => [
    ...fightNames(e.coMainEvent),
    ...(e.fightCard?.mainCard ?? []).flatMap(fightNames),
    ...(e.fightCard?.prelimCard ?? []).flatMap(fightNames),
    ...(e.fightCard?.earlyPrelimCard ?? []).flatMap(fightNames),
  ]),
];

/**
 * @description 랭킹 데이터에서 번역 대상 파이터명 수집. 챔피언·P4P 상위를 먼저 둔다.
 * @param rankings - UFC 랭킹 데이터 (없으면 빈 배열)
 * @returns 노출 우선순위 순 영문명 배열 (중복 포함)
 */
export const collectRankingsFighterNames = (
  rankings: UfcRankings | null
): string[] => {
  if (!rankings) return [];
  return [
    ...(rankings.divisions ?? []).map((d) => d.champion?.name),
    rankings.poundForPoundMen?.topFighter?.name,
    rankings.poundForPoundWomen?.topFighter?.name,
    ...(rankings.divisions ?? []).flatMap((d) =>
      (d.rankedFighters ?? []).map((f) => f.name)
    ),
    ...(rankings.poundForPoundMen?.fighters ?? []).map((f) => f.name),
    ...(rankings.poundForPoundWomen?.fighters ?? []).map((f) => f.name),
  ].filter((name): name is string => !!name && !isTbaFighter(name));
};

/**
 * @description 사전에 없는 이름만 Gemini로 번역. 기존 사전 항목은 재번역하지 않는다 —
 * 같은 선수가 회차마다 다르게 표기되는 것을 막는 것이 이 사전의 존재 이유이기 때문.
 * 배치 단위 실패는 건너뛰고 나머지를 살린다.
 * @param names - 후보 영문명 배열 (우선순위 순, 중복 허용)
 * @param existingDict - 시드 + DB에서 로드한 기존 사전
 * @returns 이번에 새로 번역된 항목만 담은 사전 (저장 대상)
 */
export const translateMissingFighterNames = async (
  names: string[],
  existingDict: Record<string, string>
): Promise<Record<string, string>> => {
  const missing = Array.from(new Set(names)).filter(
    (name) => !existingDict[name]
  );
  if (missing.length === 0) return {};

  const toTranslate = missing.slice(0, MAX_NEW_TRANSLATIONS_PER_RUN);
  if (missing.length > toTranslate.length) {
    console.log(
      `Fighter name translation capped: ${toTranslate.length}/${missing.length} this run (rest next run)`
    );
  }

  const translated: Record<string, string> = {};

  // 순차 처리 (Gemini 레이트 리밋 방지)
  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const batch = toTranslate.slice(i, i + BATCH_SIZE);
    try {
      Object.assign(translated, await translateFighterNames(batch));
    } catch (err) {
      console.error(
        `Fighter name translation failed for batch ${i / BATCH_SIZE + 1}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return translated;
};
