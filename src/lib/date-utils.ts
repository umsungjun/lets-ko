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
