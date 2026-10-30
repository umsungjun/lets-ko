import createMiddleware from "next-intl/middleware";

import { routing } from "../i18n/routing";

export default createMiddleware(routing);

// 정적 파일, API, Next.js 내부 경로를 제외한 모든 경로에서 미들웨어 실행
// localePrefix: "as-needed"라 방향은 반대다. /ko/rankings가 canonical인 /rankings로 307 리다이렉트된다.
export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
