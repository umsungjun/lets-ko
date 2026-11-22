// next-intl 로케일을 Intl API용 BCP-47 태그로 매핑
const toIntlLocale = (locale: string): string =>
  locale === "ko" ? "ko-KR" : "en-US";

/**
 * @description 타임스탬프를 한국 표준시(KST, UTC+9) 기준 날짜 문자열로 포맷하는 공통 베이스.
 * toLocaleDateString은 timeZone 미지정 시 런타임 타임존(Vercel 서버리스=UTC)을 따르므로
 * ko-KR 로케일을 줘도 KST가 아닌 UTC 날짜가 찍히는 함정이 있다 → timeZone을 Asia/Seoul로 고정.
 * @param iso - ISO 8601 타임스탬프 (UTC 또는 오프셋 포함)
 * @param locale - "ko" | "en"
 * @param options - 추가 Intl.DateTimeFormatOptions (timeZone은 항상 Asia/Seoul로 덮어씀)
 * @returns KST 기준 포맷 문자열, 파싱 실패 시 빈 문자열
 */
export const formatKstDate = (
  iso: string,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(toIntlLocale(locale), {
    ...options,
    timeZone: "Asia/Seoul",
  });
};

/**
 * @description "갱신 시각" 등에 쓰는 긴 날짜 포맷 (예: "2026년 6월 22일" / "June 22, 2026"), KST 기준.
 * @param iso - ISO 8601 타임스탬프 (updatedAt/generatedAt 등, UTC)
 * @param locale - "ko" | "en"
 * @returns KST 기준 긴 날짜 문자열, 파싱 실패 시 빈 문자열
 */
export const formatKstLongDate = (iso: string, locale: string): string =>
  formatKstDate(iso, locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

/**
 * @description "YYYY-MM-DD" 캘린더 날짜를 "M월 D일 (요일)" 형태로 포맷 (예: "6월 22일 (월)" / "Mon, Jun 22").
 * 캘린더 날짜는 시각 개념이 없으므로 KST 정오로 앵커링해 타임존 드리프트로 인한 날짜/요일 어긋남을 방지.
 * @param dateStr - "YYYY-MM-DD" 형식의 이벤트 날짜
 * @param locale - "ko" | "en"
 * @returns KST 기준 짧은 날짜 문자열, 파싱 실패 시 빈 문자열
 */
export const formatEventDate = (dateStr: string, locale: string): string =>
  formatKstDate(`${dateStr}T12:00:00+09:00`, locale, {
    month: "short",
    day: "numeric",
    weekday: "short",
  });

/**
 * @description "YYYY-MM-DD" 캘린더 날짜를 연도 포함 전체 날짜로 포맷 (예: "2025년 11월 1일" / "Nov 1, 2025").
 * 전적 테이블 등 과거 날짜 표기에 사용. 캘린더 날짜는 KST 정오로 앵커링해 타임존 드리프트를 방지.
 * 크롤 원본이 "YYYY-MM-DD"가 아닌 텍스트일 수 있어 파싱 실패 시 원본 문자열을 그대로 반환.
 * @param dateStr - "YYYY-MM-DD" 형식의 날짜 (그 외 형식은 Date 파싱 시도)
 * @param locale - "ko" | "en"
 * @returns 연도 포함 날짜 문자열, 파싱 실패 시 원본 dateStr
 */
export const formatFullDate = (dateStr: string, locale: string): string => {
  if (!dateStr) return "";
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? `${dateStr}T12:00:00+09:00`
    : dateStr;
  return (
    formatKstDate(iso, locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }) || dateStr
  );
};

/**
 * @description 크롤 원문 날짜("Nov. 7, 2026")나 "YYYY-MM-DD"를 비교 가능한 "YYYY-MM-DD"로 맞춘다.
 * UFC 전적 카드는 날짜를 텍스트로 주므로 문자열로 날짜를 비교하기 전에 반드시 거친다.
 * @param dateStr - 날짜 문자열
 * @returns "YYYY-MM-DD", 비었거나 파싱 실패 시 null
 */
export const toCalendarDate = (dateStr: string | undefined): string | null => {
  if (!dateStr) return null;
  // 날짜만 있는 ISO는 Date가 UTC 자정으로 읽어 음수 오프셋 런타임에서 하루 밀리므로 그대로 자른다
  const iso = dateStr.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  // 시각 없는 텍스트 날짜는 런타임 로컬 자정으로 읽히므로 로컬 getter로 꺼내야 날짜가 유지된다
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

/**
 * @description 현재 시각을 KST 기준 "YYYY-MM-DD" 문자열로 반환 (예정 이벤트 필터의 "오늘" 비교용).
 * 기존 `new Date().toISOString().split("T")[0]`는 UTC 날짜라 KST 자정~오전 9시 구간에 하루 어긋남.
 * en-CA 로케일은 "YYYY-MM-DD" 출력을 보장하므로 event.date 문자열 비교에 그대로 사용 가능.
 * @returns KST 기준 "YYYY-MM-DD"
 */
export const getKstTodayStr = (): string =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

/**
 * @description "YYYY-MM-DD" 이벤트 날짜까지 KST 기준 잔여 일수(D-day) 계산.
 * 양쪽을 KST 정오로 앵커링해 타임존 드리프트로 인한 하루 어긋남을 방지.
 * @param dateStr - "YYYY-MM-DD" 형식의 이벤트 날짜
 * @returns 오늘=0, 미래=양수, 과거=음수. 파싱 실패 시 null
 */
export const getKstDaysUntil = (dateStr: string): number | null => {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T12:00:00+09:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date(`${getKstTodayStr()}T12:00:00+09:00`);
  return Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
};
