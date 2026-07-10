import type { UfcEvent, UfcEventFighter } from "@/types/schedule";

// 고석현 이름 별칭(정규화 후 비교). UFC 영문 데이터는 "Seok Hyeon Ko"/"Seokhyeon Ko",
// 한글은 "고석현" 등으로 표기가 갈리므로 공백·특수문자를 제거한 정규화 형태로 매칭.
const KO_NAME_ALIASES = [
  "seokhyeonko",
  "koseokhyeon",
  "seokhyunko",
  "koseokhyun",
  "고석현",
];

// 소문자화 + 영문/한글 외 문자 제거 (공백·하이픈·점 등 표기 차이 흡수)
const normalizeName = (name: string): string =>
  name.toLowerCase().replace(/[^a-z가-힣]/g, "");

/**
 * @description 파이터 이름이 고석현인지 판별 (영/한 표기 변형 모두 대응).
 * @param name - 검사할 파이터 이름
 * @returns 고석현이면 true
 */
export const isKoSeokhyeon = (name: string | undefined): boolean => {
  if (!name) return false;
  const n = normalizeName(name);
  if (!n) return false;
  return KO_NAME_ALIASES.some((alias) => n === alias || n.includes(alias));
};

/**
 * @description UFC 이벤트(메인/코메인/전체 카드)에 고석현이 출전하는지 판별.
 * @param event - UFC 이벤트
 * @returns 고석현 출전 시 true
 */
export const eventHasKoSeokhyeon = (event: UfcEvent): boolean => {
  const fighters: (UfcEventFighter | undefined)[] = [
    event.mainEvent?.fighter1,
    event.mainEvent?.fighter2,
    event.coMainEvent?.fighter1,
    event.coMainEvent?.fighter2,
    ...(event.fightCard?.mainCard ?? []).flatMap((f) => [
      f.fighter1,
      f.fighter2,
    ]),
    ...(event.fightCard?.prelimCard ?? []).flatMap((f) => [
      f.fighter1,
      f.fighter2,
    ]),
    ...(event.fightCard?.earlyPrelimCard ?? []).flatMap((f) => [
      f.fighter1,
      f.fighter2,
    ]),
  ];
  return fighters.some((f) => isKoSeokhyeon(f?.name));
};
