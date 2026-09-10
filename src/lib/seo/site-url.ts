// NEXT_PUBLIC_SITE_URL에 /ko 같은 path가 섞여 들어와도 origin만 남긴다. path를 그대로 쓰면 OG 이미지 URL에 locale prefix가 중복된다.
const FALLBACK_ORIGIN = "https://lets-ko.vercel.app";

/**
 * @description 사이트 origin (path 없는 `https://호스트` 형태). 여러 파일에 복붙돼 있던 정규화 로직의 단일 출처.
 */
export const SITE_ORIGIN: string = (() => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_ORIGIN;
  try {
    return new URL(raw).origin;
  } catch {
    return FALLBACK_ORIGIN;
  }
})();

/**
 * @description 로케일별 절대 URL 생성. localePrefix "as-needed"라 ko는 prefix가 없고 en만 `/en`이 붙는다.
 * @param locale - "ko" | "en"
 * @param path - locale prefix 없는 경로 ("" 또는 "/schedule")
 * @returns canonical과 동일한 절대 URL
 */
export const localeUrl = (locale: string, path = ""): string =>
  locale === "ko" ? `${SITE_ORIGIN}${path}` : `${SITE_ORIGIN}/${locale}${path}`;

/**
 * @description 로케일별 상대 경로. Next.js metadata의 alternates에 넣을 때 사용한다.
 * @param locale - "ko" | "en"
 * @param path - locale prefix 없는 경로 ("" 또는 "/schedule")
 * @returns "/" 로 시작하는 경로
 */
export const localePath = (locale: string, path = ""): string =>
  locale === "ko" ? path || "/" : `/${locale}${path}`;
