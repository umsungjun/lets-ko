import createMiddleware from "next-intl/middleware";

import { routing } from "../i18n/routing";

export default createMiddleware(routing);

// 정적 파일, API, Next.js 내부 경로를 제외한 모든 경로에서 미들웨어 실행
// → locale 없는 경로(/rankings 등)도 /ko/rankings으로 리다이렉트
export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
