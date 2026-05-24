import type { MetadataRoute } from "next";

// path 없이 origin만 사용 (다른 파일과 동일한 정규화)
const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://lets-ko.vercel.app";
const SITE_URL = (() => {
  try {
    return new URL(raw).origin;
  } catch {
    return "https://lets-ko.vercel.app";
  }
})();

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ["ko", "en"];
  const now = new Date();

  const pages = [
    { path: "", changeFrequency: "daily" as const, priority: 1.0 },
    { path: "/schedule", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/predictions", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/rankings", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/youtube", changeFrequency: "hourly" as const, priority: 0.7 },
    { path: "/cheer", changeFrequency: "hourly" as const, priority: 0.8 },
  ];

  // ko는 prefix 없이, en은 /en prefix 사용 (localePrefix: "as-needed")
  const localeUrl = (locale: string, path: string) =>
    locale === "ko" ? `${SITE_URL}${path}` : `${SITE_URL}/${locale}${path}`;

  return pages.flatMap((page) =>
    locales.map((locale) => ({
      url: localeUrl(locale, page.path || "/"),
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, localeUrl(l, page.path || "/")])
        ),
      },
    }))
  );
}
