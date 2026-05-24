"use client";

import { useMemo, useState } from "react";

import { useTranslations } from "next-intl";

import VideoCard from "@/components/youtube/VideoCard";
import VideoModal from "@/components/youtube/VideoModal";
import type { YouTubeChannelConfig } from "@/config/youtube-channels";
import type { YouTubeVideo } from "@/lib/youtube";

/**
 * 채널 + 영상 + 메타정보가 합쳐진 화면 단위 데이터.
 *  - displayTitle은 API snippet.title 우선, 실패 시 config.fallbackTitle
 *  - thumbnailUrl은 채널 아바타 (88x88 medium 권장)
 *  - subscriberCount=0이면 API 누락이거나 hiddenSubscriberCount=true
 *  - 정렬은 페이지(서버)에서 이미 끝낸 상태로 전달받음
 */
export interface ChannelGroup {
  channel: YouTubeChannelConfig;
  videos: YouTubeVideo[];
  displayTitle: string;
  thumbnailUrl?: string;
  subscriberCount: number;
}

interface YouTubeChannelsViewProps {
  /** 구독자순으로 정렬된 채널 그룹 배열 */
  groups: ChannelGroup[];
  /** 현재 로케일 (ko/en) */
  locale: string;
  /** 서버에서 포맷팅한 마지막 업데이트 시각 (KST) */
  updatedAt: string;
}

type ViewMode = "byChannel" | "allLatest";

/**
 * @description /[locale]/youtube 페이지의 영상 그리드 + 모달을 담당하는 클라이언트 컴포넌트.
 *  "채널별" / "전체 최신순" 두 모드 토글 제공.
 *  채널별 모드: 채널 헤더 + 그리드 섹션 반복
 *  전체 최신순 모드: 모든 영상을 publishedAt 내림차순으로 합쳐 표시, 카드에 채널 배지 노출
 * @param props.groups - 서버에서 구독자순 정렬된 채널 그룹 배열
 * @param props.locale - 현재 로케일
 */
export default function YouTubeChannelsView({
  groups,
  locale,
  updatedAt,
}: YouTubeChannelsViewProps) {
  const t = useTranslations("youtubePage");
  const [mode, setMode] = useState<ViewMode>("byChannel");
  const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null);

  // 전체 최신순 모드용 영상 리스트. 모드 전환 시 재계산되지 않도록 useMemo
  const allLatestVideos = useMemo(() => {
    return groups
      .flatMap((g) => g.videos)
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
  }, [groups]);

  const channelNameBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) {
      map.set(g.channel.slug, g.displayTitle);
    }
    return map;
  }, [groups]);

  const formatSubscribers = (count: number): string => {
    if (count <= 0) return "";
    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1)}M`;
    }
    if (count >= 1_000) {
      return `${(count / 1_000).toFixed(count >= 10_000 ? 0 : 1)}K`;
    }
    return String(count);
  };

  // 영상이 0개인 채널은 섹션 자체를 노출하지 않음 (UX 잡음 방지)
  const visibleGroups = groups.filter((g) => g.videos.length > 0);

  if (visibleGroups.length === 0) {
    return (
      <div className="py-20 text-center text-muted">
        <p className="text-sm">{t("empty")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setMode("byChannel")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
              mode === "byChannel"
                ? "bg-primary text-white shadow-[0_2px_8px_rgba(220,38,38,0.3)]"
                : "bg-white border border-border text-muted hover:text-primary hover:border-primary/40 hover:bg-primary-light"
            }`}
          >
            {t("byChannel")}
          </button>
          <button
            onClick={() => setMode("allLatest")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
              mode === "allLatest"
                ? "bg-primary text-white shadow-[0_2px_8px_rgba(220,38,38,0.3)]"
                : "bg-white border border-border text-muted hover:text-primary hover:border-primary/40 hover:bg-primary-light"
            }`}
          >
            {t("allLatest")}
          </button>
        </div>
        <p className="text-xs text-muted">
          {t("updatedAt", { date: updatedAt })}
        </p>
      </div>

      {mode === "byChannel" ? (
        <div className="space-y-12">
          {visibleGroups.map((group) => {
            const subText = formatSubscribers(group.subscriberCount);

            return (
              <section key={group.channel.slug}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {group.thumbnailUrl ? (
                      <img
                        src={group.thumbnailUrl}
                        alt={group.displayTitle}
                        className="w-11 h-11 rounded-full object-cover bg-surface border border-border shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-full bg-surface border border-border shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-foreground truncate">
                        {group.displayTitle}
                      </h2>
                      {subText && (
                        <p className="mt-0.5 text-xs text-muted">
                          {t("subscribers", { count: subText })}
                        </p>
                      )}
                    </div>
                  </div>
                  {group.channel.handle && (
                    <a
                      href={`https://www.youtube.com/${group.channel.handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-muted hover:text-primary hover:border-primary/40 transition-all duration-300 text-xs font-medium cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {t("visitChannel")}
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {group.videos.map((video, idx) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      onOpen={setActiveVideo}
                      locale={locale}
                      index={idx}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {allLatestVideos.map((video, idx) => (
            <VideoCard
              key={`${video.channelSlug ?? "x"}-${video.id}`}
              video={video}
              onOpen={setActiveVideo}
              locale={locale}
              index={idx}
              channelBadge={
                video.channelSlug
                  ? channelNameBySlug.get(video.channelSlug)
                  : video.channelTitle
              }
            />
          ))}
        </div>
      )}

      <VideoModal
        video={activeVideo}
        onClose={() => setActiveVideo(null)}
        closeLabel={t("close")}
      />
    </>
  );
}
