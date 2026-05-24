import type { NextRequest } from "next/server";

import { createHash } from "crypto";

/**
 * @description 요청 IP를 SHA256으로 해시하여 처음 16자를 반환
 * @param request - Next.js 서버 요청 객체
 * @returns 16자 IP 해시 문자열
 */
export function getIpHash(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}
