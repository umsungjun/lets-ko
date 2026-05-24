import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { ChannelGroup } from "@/components/youtube/YouTubeChannelsView";
import YouTubeChannelsView from "@/components/youtube/YouTubeChannelsView";
import { YOUTUBE_CHANNELS } from "@/config/youtube-channels";
import { fetchChannelInfos, fetchChannelUploads } from "@/lib/youtube";

// 페이지 SSR 캐시 30분 — 내부 fetch revalidate와 동기화 (CHANNEL_CACHE_SECONDS)
export const revalidate = 1800;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "youtubePage" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: locale === "ko" ? "/youtube" : `/${locale}/youtube`,
      languages: {
        ko: "/youtube",
        en: "/en/youtube",
        "x-default": "/youtube",
      },
    },
  };
}

/**
 * @description /[locale]/youtube 페이지 — config에 등록된 채널들의 최신 영상을 모아 표시.
 *  - 데이터: YouTube Data API v3 playlistItems + channels.list (구독자 수)
 *  - 캐시: Next.js fetch revalidate 10분 (quota 보호)
 *  - 정렬: 채널은 구독자 많은 순 정렬 후 UI에 전달
 * @param params - 다국어 라우팅 파라미터 (Next.js 15+에서 Promise)
 */
export default async function YouTubePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "youtubePage" });

  // 영상 + 채널 메타(표시명·아바타·구독자) 병렬 fetch
  const [videoResults, infoMap] = await Promise.all([
    Promise.all(
      YOUTUBE_CHANNELS.map(async (channel) => ({
        channel,
        videos: await fetchChannelUploads(
          channel.uploadsPlaylistId,
          channel.maxResults ?? 6,
          channel.slug
        ),
      }))
    ),
    fetchChannelInfos(YOUTUBE_CHANNELS.map((c) => c.channelId)),
  ]);

  // ISR(revalidate=600) 캐시 hit 시 이 값도 마지막 revalidate 시점에 고정되어
  // 사용자에게 "데이터 fetch 시각"으로 정확히 일치. KST 고정으로 hydration mismatch 방지.
  const updatedAt = new Date().toLocaleString(
    locale === "ko" ? "ko-KR" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Seoul",
    }
  );

  // 구독자 많은 순 정렬. API 응답 누락 시 0/fallback으로 취급해 뒤로 밀림
  const groups: ChannelGroup[] = videoResults
    .map(({ channel, videos }) => {
      const info = infoMap.get(channel.channelId);
      return {
        channel,
        videos,
        displayTitle: info?.title || channel.fallbackTitle,
        thumbnailUrl: info?.thumbnailUrl,
        subscriberCount: info?.subscriberCount ?? 0,
      };
    })
    .sort((a, b) => b.subscriberCount - a.subscriberCount);

  return (
    <section className="py-12 px-4">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-3 text-sm md:text-base text-muted">
            {t("subtitle")}
          </p>
        </header>

        <YouTubeChannelsView
          groups={groups}
          locale={locale}
          updatedAt={updatedAt}
        />
      </div>
    </section>
  );
}
