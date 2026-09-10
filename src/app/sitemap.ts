import type { MetadataRoute } from "next";

import { localeUrl } from "@/lib/seo/site-url";

const LOCALES = ["ko", "en"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages = [
    { path: "", changeFrequency: "daily" as const, priority: 1.0 },
    { path: "/schedule", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/predictions", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/rankings", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/youtube", changeFrequency: "hourly" as const, priority: 0.7 },
    { path: "/cheer", changeFrequency: "hourly" as const, priority: 0.5 },
  ];

  return pages.flatMap((page) =>
    LOCALES.map((locale) => ({
      // localeUrl은 ko 홈을 트레일링 슬래시 없는 origin으로 반환한다. `path || "/"`로 보정하면 en 홈이 `/en/`이 되어 308 리다이렉트 URL이 sitemap에 실린다.
      url: localeUrl(locale, page.path),
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: {
          ...Object.fromEntries(
            LOCALES.map((l) => [l, localeUrl(l, page.path)])
          ),
          "x-default": localeUrl("ko", page.path),
        },
      },
    }))
  );
}
