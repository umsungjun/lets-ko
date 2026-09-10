import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ko", "en"],
  defaultLocale: "ko",
  // locale 없는 경로는 한국어로 처리, /ko prefix 생략 가능
  localePrefix: "as-needed",
  // Accept-Language 기반 자동 로케일 전환 비활성화.
  // 켜두면 en 헤더 요청에서 canonical URL(`/`, `/schedule`)이 307로 /en/...에 넘어가 크롤러가 canonical을 리다이렉트로 인식한다.
  // 헤더 언어 스위처는 URL 기반(`<Link locale=...>`)이라 이 설정과 무관하게 동작한다.
  localeDetection: false,
});
