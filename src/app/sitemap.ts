import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://lets-ko.vercel.app";

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
