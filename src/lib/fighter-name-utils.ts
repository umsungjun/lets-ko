/** 이름에 한국어명이 함께 붙을 수 있는 최소 형태 (일정·랭킹 파이터 공용) */
export interface LocalizableFighterName {
  /** 파이터 이름 (영문). source of truth */
  name: string;
  /** 파이터 이름 (한국어). 로더가 사전에서 주입 */
  nameKo?: string;
}

/**
 * @description 사전 조회용 이름 키 정규화. 소문자화 + 연속 공백 축약으로 표기 차이를 흡수한다.
 * @param name - 파이터 영문명
 * @returns 정규화된 조회 키
 */
export const fighterNameKey = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * @description 영문명 → 한국어명 사전을 정규화 키 기준 Map으로 변환.
 * 사전은 DB 가독성을 위해 원문 키로 저장하고 조회만 정규화 키로 한다.
 * @param dict - 영문명 → 한국어명 사전
 * @returns 정규화 키 → 한국어명 Map
 */
export const buildFighterNameIndex = (
  dict: Record<string, string> | undefined
): Map<string, string> =>
  new Map(
    Object.entries(dict ?? {}).map(([en, ko]) => [fighterNameKey(en), ko])
  );

/**
 * @description 로케일에 맞는 파이터 표시명 반환. ko인데 한국어명이 없으면 영문으로 폴백.
 * @param fighter - 이름 정보를 가진 객체 (일정·랭킹 파이터 모두 허용)
 * @param lang - "ko" | "en"
 * @returns 표시용 이름
 */
export const displayFighterName = (
  fighter: LocalizableFighterName,
  lang: "ko" | "en"
): string => (lang === "ko" ? (fighter.nameKo ?? fighter.name) : fighter.name);

/**
 * @description UFC 헤드샷 이미지 URL 파일명에서 파이터 풀네임을 복원.
 * UFC 파일명 규칙: `{LAST}_{FIRST}[_{수식어}...][_{MM-YY}].png` (챔피언은 `_BELT_`, 코너별 컷은 `_L_`/`_R_` 토큰이 붙는다).
 * 목록 페이지 headline과 선수 전적 카드는 성만 노출하므로 풀네임 출처가 파일명뿐이다.
 * @param url - 헤드샷 이미지 URL (없으면 fallback 반환)
 * @param fallback - 파일명 파싱 실패 시 사용할 이름
 * @returns "First Last" 형태의 풀네임 또는 fallback
 */
export const extractNameFromImageUrl = (
  url: string | undefined,
  fallback: string
): string => {
  if (!url) return fallback;
  // 성·이름 모두 하이픈 허용 ("ABDUL-MALIK_MANSUR", "LEBOSNOYANI_JEAN-PAUL")
  const match = url.match(
    /\/([A-Z][A-Z-]*)_([A-Z][A-Z-]*)(?:_[A-Z]+)*(?:_[\d-]+)?\.png/
  );
  if (!match) return fallback;
  // 하이픈 성은 세그먼트별로 대문자화 ("ABDUL-MALIK" → "Abdul-Malik")
  const toTitle = (s: string) =>
    s
      .split("-")
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join("-");
  return `${toTitle(match[2])} ${toTitle(match[1])}`;
};
