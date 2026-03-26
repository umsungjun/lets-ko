import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ko", "en"],
  defaultLocale: "ko",
  // locale 없는 경로는 한국어로 처리, /ko prefix 생략 가능
  localePrefix: "as-needed",
});
