import type { UfcEvent } from "@/types/schedule";

/**
 * @description 파이터 이름이 미확정 상태(TBA/TBD 등)인지 판별.
 * UFC 데이터 소스마다 미확정 파이터를 "TBA", "TBD", 빈 문자열 등으로 다르게 표기하므로
 * 한 곳에서 정규화하여 AI 예측 생성·표시 분기 처리에 사용.
 * @param name - 검사할 파이터 이름
 * @returns 미확정이면 true
 */
export const isTbaFighter = (name: string | undefined): boolean => {
  if (!name) return true;
  const normalized = name.trim().toUpperCase();
  return normalized === "" || normalized === "TBA" || normalized === "TBD";
};

/**
 * @description 매치업의 두 파이터 중 하나라도 미확정인지 판별.
 * @param fighter1Name - 파이터 1 이름
 * @param fighter2Name - 파이터 2 이름
 * @returns 둘 중 하나라도 미확정이면 true
 */
export const isTbaMatchup = (
  fighter1Name: string | undefined,
  fighter2Name: string | undefined
): boolean => isTbaFighter(fighter1Name) || isTbaFighter(fighter2Name);

// UFC 공식 체급 상한 (kg). 영문·한국어 둘 다 키로 받도록 추가하여
// 크롤러가 어느 로케일의 텍스트(예: "Welterweight" vs "웰터급")를 저장해도 매핑 가능.
type WeightClassInfo = { ko: string; en: string; kg?: number };
const WEIGHT_CLASS_MAP: Record<string, WeightClassInfo> = {
  Strawweight: { ko: "스트로급", en: "Strawweight", kg: 52 },
  스트로급: { ko: "스트로급", en: "Strawweight", kg: 52 },
  Flyweight: { ko: "플라이급", en: "Flyweight", kg: 57 },
  플라이급: { ko: "플라이급", en: "Flyweight", kg: 57 },
  Bantamweight: { ko: "밴텀급", en: "Bantamweight", kg: 61 },
  밴텀급: { ko: "밴텀급", en: "Bantamweight", kg: 61 },
  Featherweight: { ko: "페더급", en: "Featherweight", kg: 66 },
  페더급: { ko: "페더급", en: "Featherweight", kg: 66 },
  Lightweight: { ko: "라이트급", en: "Lightweight", kg: 70 },
  라이트급: { ko: "라이트급", en: "Lightweight", kg: 70 },
  Welterweight: { ko: "웰터급", en: "Welterweight", kg: 77 },
  웰터급: { ko: "웰터급", en: "Welterweight", kg: 77 },
  Middleweight: { ko: "미들급", en: "Middleweight", kg: 84 },
  미들급: { ko: "미들급", en: "Middleweight", kg: 84 },
  "Light Heavyweight": { ko: "라이트헤비급", en: "Light Heavyweight", kg: 93 },
  "라이트 헤비급": { ko: "라이트헤비급", en: "Light Heavyweight", kg: 93 },
  라이트헤비급: { ko: "라이트헤비급", en: "Light Heavyweight", kg: 93 },
  Heavyweight: { ko: "헤비급", en: "Heavyweight", kg: 120 },
  헤비급: { ko: "헤비급", en: "Heavyweight", kg: 120 },
  "Women's Strawweight": {
    ko: "여성 스트로급",
    en: "Women's Strawweight",
    kg: 52,
  },
  "여성 스트로급": { ko: "여성 스트로급", en: "Women's Strawweight", kg: 52 },
  "Women's Flyweight": {
    ko: "여성 플라이급",
    en: "Women's Flyweight",
    kg: 57,
  },
  "여성 플라이급": { ko: "여성 플라이급", en: "Women's Flyweight", kg: 57 },
  "Women's Bantamweight": {
    ko: "여성 밴텀급",
    en: "Women's Bantamweight",
    kg: 61,
  },
  "여성 밴텀급": { ko: "여성 밴텀급", en: "Women's Bantamweight", kg: 61 },
  "Women's Featherweight": {
    ko: "여성 페더급",
    en: "Women's Featherweight",
    kg: 66,
  },
  "여성 페더급": { ko: "여성 페더급", en: "Women's Featherweight", kg: 66 },
  Catchweight: { ko: "캐치웨이트", en: "Catchweight" },
  캐치웨이트: { ko: "캐치웨이트", en: "Catchweight" },
};

/**
 * @description UFC 체급명을 로케일별 라벨 + kg 상한으로 포맷.
 * 데이터 소스(UFC.com)가 지오 IP에 따라 영문/한국어를 섞어 반환하므로
 * 양쪽 입력을 모두 받아 일관된 포맷("웰터급 (77kg)" / "Welterweight (77kg)")으로 출력.
 * @param weightClass - 데이터 소스의 체급명 (영문 또는 한국어, " Bout" 접미사 허용)
 * @param locale - "ko" | "en"
 * @returns 포맷된 라벨, 미확정/매핑 실패 시 원문 또는 undefined
 */
export const formatWeightClass = (
  weightClass: string | undefined,
  locale: "ko" | "en"
): string | undefined => {
  if (!weightClass) return undefined;
  // UFC 이벤트 페이지에 "웰터급 Bout"처럼 접미사가 붙는 케이스 대응
  const cleaned = weightClass.replace(/\s*Bout\s*$/i, "").trim();
  const info = WEIGHT_CLASS_MAP[cleaned];
  if (!info) return cleaned;
  const name = locale === "ko" ? info.ko : info.en;
  return info.kg !== undefined ? `${name} (${info.kg}kg)` : name;
};

/**
 * @description ISO 8601 UTC 시각을 한국 표준시(KST, UTC+9)로 변환해 사람이 읽기 좋은 라벨로 포맷.
 * UFC 이벤트는 미국 새벽~오전 시작이라 KST로 보면 거의 항상 오후·심야로 넘어가므로
 * 날짜(요일)까지 함께 노출해 사용자가 헷갈리지 않도록 한다.
 * @param iso - 시작 시각 (ISO 8601, UTC). 잘못된 값이면 undefined 반환
 * @param locale - "ko" | "en"
 * @returns 예: "5월 25일(일) 오전 11:00" / "Sun, May 25, 11:00 AM" — 파싱 실패 시 undefined
 */
export const formatKstCardTime = (
  iso: string | undefined,
  locale: "ko" | "en"
): string | undefined => {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString(locale === "ko" ? "ko-KR" : "en-US", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

/** 메인 이벤트 예상 시각 계산 시 한 경기당 가정 시간(분) */
const MINUTES_PER_FIGHT = 30;

/**
 * @description 메인 카드 시작 시각 + 경기 수로 메인 이벤트(타이틀 매치) 예상 시작 시각을 계산.
 * 메인 카드는 하위 경기부터 위로 진행되어 헤드라이너(메인 이벤트)가 마지막이므로
 * (총 메인 카드 경기 - 1) × 30분을 시작 시각에 더한 값이 메인 이벤트 예상 시각.
 * 데이터 부족(시작 시각 미상 / 경기 수 0)이면 undefined.
 * @param mainCardStartIso - 메인 카드 방송 시작 시각 (ISO 8601 UTC)
 * @param mainCardFightCount - 메인 카드 전체 경기 수 (헤드라이너 포함)
 * @returns 메인 이벤트 예상 시작 시각 (ISO 8601 UTC) — 추정 불가 시 undefined
 */
export const estimateMainEventStart = (
  mainCardStartIso: string | undefined,
  mainCardFightCount: number
): string | undefined => {
  if (!mainCardStartIso || mainCardFightCount < 1) return undefined;
  const start = new Date(mainCardStartIso);
  if (Number.isNaN(start.getTime())) return undefined;
  const offsetMs = (mainCardFightCount - 1) * MINUTES_PER_FIGHT * 60 * 1000;
  return new Date(start.getTime() + offsetMs).toISOString();
};

// 슬러그 토큰 → 표시 표기 예외. 타이틀케이싱만 하면 "Espn"/"Tuf"처럼 어색해지는 약어·전치사 보정
const EVENT_NAME_TOKEN_OVERRIDES: Record<string, string> = {
  espn: "ESPN",
  espn2: "ESPN2",
  abc: "ABC",
  tuf: "TUF",
  fx: "FX",
  ppv: "PPV",
  on: "on",
  vs: "vs",
};

const titleCaseSlugToken = (token: string): string =>
  EVENT_NAME_TOKEN_OVERRIDES[token] ??
  token.charAt(0).toUpperCase() + token.slice(1);

/**
 * @description ufc.com 이벤트 슬러그에서 표시용 이벤트명 derive.
 * 슬러그 어디에 있든 `ufc-<숫자>`를 찾아 넘버링을 살린다 — UFC가 스폰서 접두어를 붙인
 * 슬러그(`cryptocom-ufc-331`)를 쓰기 때문에 시작 고정(`^ufc-`)이면 넘버링 대회를
 * Fight Night으로 잘못 표기하게 된다(issue #33).
 * @param slug - 이벤트 URL 슬러그 (예: "cryptocom-ufc-331")
 * @param fightLabel - 메인 이벤트 라벨 (예: "Van vs Pantoja"). 있으면 ": " 뒤에 덧붙임
 * @returns 표시용 이벤트명 (예: "UFC 331: Van vs Pantoja")
 */
export const deriveEventName = (slug: string, fightLabel?: string): string => {
  const normalized = (slug ?? "").toLowerCase();

  // 접두어(스폰서/브랜드) 위치와 무관하게 번호만 추출
  const numbered = normalized.match(/(?:^|-)ufc-(\d+)(?:-|$)/);
  // 브랜드 넘버링(예: ufc-freedom-250) 판정 전에 Fight Night을 먼저 걸러야
  // 날짜 접미 슬러그(ufc-fight-night-june-14)가 "UFC Fight Night June 14"로 오검출되지 않음
  const branded = normalized.includes("fight-night")
    ? null
    : normalized.match(/(?:^|-)ufc-([a-z-]+?)-(\d+)$/);

  let name: string;
  if (numbered) {
    name = `UFC ${numbered[1]}`;
  } else if (branded) {
    const subtitle = branded[1].split("-").map(titleCaseSlugToken).join(" ");
    name = `UFC ${subtitle} ${branded[2]}`;
  } else {
    name = "UFC Fight Night";
  }

  return fightLabel ? `${name}: ${fightLabel}` : name;
};

// 짧은 이름의 모든 토큰이 긴 이름에 포함될 때만 교체 — 레드/블루 코너가 뒤바뀐 경우
// 엉뚱한 선수 이름으로 덮어쓰는 것을 방지한다
const preferFullName = (name: string, fullName?: string): string => {
  if (!fullName || isTbaFighter(fullName)) return name;
  if (isTbaFighter(name)) return fullName;

  const fullTokens = fullName.toLowerCase().split(/\s+/);
  const tokens = name.toLowerCase().split(/\s+/);
  if (fullTokens.length <= tokens.length) return name;
  return tokens.every((token) => fullTokens.includes(token)) ? fullName : name;
};

/**
 * @description 메인 이벤트 파이터 이름을 같은 이벤트 파이트카드 헤드라이너의 풀네임으로 보정.
 * 목록 페이지 헤드샷 파일명 파싱이 실패하면 메인 이벤트만 성으로 남는데(예: "Makhachev"),
 * 상세 페이지에서 온 `fightCard.mainCard[0]`에는 풀네임이 들어 있다.
 * 크롤 시점과 렌더 시점 양쪽에서 호출해 구버전 저장 데이터도 즉시 보정되도록 한다.
 * @param events - UFC 이벤트 배열
 * @returns 메인 이벤트 이름이 보정된 새 이벤트 배열
 */
export const backfillMainEventNames = (events: UfcEvent[]): UfcEvent[] =>
  events.map((event) => {
    const headliner = event.fightCard?.mainCard[0];
    if (!headliner) return event;

    const name1 = preferFullName(
      event.mainEvent.fighter1.name,
      headliner.fighter1.name
    );
    const name2 = preferFullName(
      event.mainEvent.fighter2.name,
      headliner.fighter2.name
    );
    if (
      name1 === event.mainEvent.fighter1.name &&
      name2 === event.mainEvent.fighter2.name
    ) {
      return event;
    }

    return {
      ...event,
      mainEvent: {
        ...event.mainEvent,
        fighter1: { ...event.mainEvent.fighter1, name: name1 },
        fighter2: { ...event.mainEvent.fighter2, name: name2 },
      },
    };
  });
