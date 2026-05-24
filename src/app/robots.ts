import type { MetadataRoute } from "next";

// path 없이 origin만 사용 (sitemap.ts와 동일한 정규화 — 환경변수에 /ko가 섞이는 사고 방지)
const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://lets-ko.vercel.app";
const SITE_URL = (() => {
  try {
    return new URL(raw).origin;
  } catch {
    return "https://lets-ko.vercel.app";
  }
})();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
