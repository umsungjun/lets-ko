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
    { path: "/rankings", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/cheer", changeFrequency: "hourly" as const, priority: 0.8 },
  ];

  return pages.flatMap((page) =>
    locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${page.path}`,
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${SITE_URL}/${l}${page.path}`])
        ),
      },
    }))
  );
}
