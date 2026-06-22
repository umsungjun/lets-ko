"use client";

import { useEffect, useState } from "react";

import { useTranslations } from "next-intl";

import { useInView } from "@/hooks/useInView";
import { formatKstDate } from "@/lib/date-utils";
import type { YouTubeVideo } from "@/lib/youtube";
import { SEARCH_QUERY } from "@/lib/youtube";

type SortOrder = "date" | "viewCount";

interface VideoSectionProps {
  videosByDate: YouTubeVideo[];
  videosByViews: YouTubeVideo[];
}

export default function VideoSection({
  videosByDate,
  videosByViews,
}: VideoSectionProps) {
  const t = useTranslations("videos");
  const { ref, isInView } = useInView(0.1);
  const [activeTab, setActiveTab] = useState<SortOrder>("date");
  const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null);

  const videos = activeTab === "date" ? videosByDate : videosByViews;

  const openVideo = (video: YouTubeVideo) => {
    setActiveVideo(video);
  };

  const closeVideo = () => {
    setActiveVideo(null);
  };

  useEffect(() => {
    document.body.style.overflow = activeVideo ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeVideo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeVideo();
    };
    if (activeVideo) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeVideo]);

  if (videosByDate.length === 0 && videosByViews.length === 0) return null;

  return (
    <>
      <section
        className="py-20 px-4 bg-linear-to-b from-surface to-white"
        ref={ref}
      >
        <div className="max-w-5xl mx-auto">
          <h2
            className="section-heading section-heading-center text-center mb-8"
            style={{
              opacity: isInView ? 1 : 0,
              transform: isInView ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
            }}
          >
            {t("title")}
          </h2>

          <div
            className="flex items-center justify-between mb-8"
            style={{
              opacity: isInView ? 1 : 0,
              transform: isInView ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s",
            }}
          >
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("date")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                  activeTab === "date"
                    ? "bg-primary text-white shadow-[0_2px_8px_rgba(220,38,38,0.3)]"
                    : "bg-white border border-border text-muted hover:text-primary hover:border-primary/40 hover:bg-primary-light"
                }`}
              >
                {t("latest")}
              </button>
              <button
                onClick={() => setActiveTab("viewCount")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                  activeTab === "viewCount"
                    ? "bg-primary text-white shadow-[0_2px_8px_rgba(220,38,38,0.3)]"
                    : "bg-white border border-border text-muted hover:text-primary hover:border-primary/40 hover:bg-primary-light"
                }`}
              >
                {t("popular")}
              </button>
            </div>

            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(SEARCH_QUERY)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-white text-muted hover:text-primary hover:border-primary/40 transition-all duration-300 text-sm font-medium cursor-pointer"
            >
              {t("moreOnYoutube")}
              <svg
                className="w-4 h-4"
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {videos.map((video, index) => (
              <button
                key={video.id}
                onClick={() => openVideo(video)}
                className="group rounded-2xl overflow-hidden bg-white border border-border shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-500 cursor-pointer text-left w-full"
                style={{
                  opacity: isInView ? 1 : 0,
                  transform: isInView ? "translateY(0)" : "translateY(20px)",
                  transition: `opacity 0.5s ease ${150 + index * 80}ms, transform 0.5s ease ${150 + index * 80}ms`,
                }}
              >
                {/* 썸네일 */}
                <div className="relative aspect-video bg-slate-900 overflow-hidden">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                  />

                  {/* 호버 오버레이 */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-500" />

                  {/* YouTube 재생 버튼 */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center justify-center w-14 h-10 rounded-xl bg-[#FF0000] opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 shadow-[0_4px_20px_rgba(255,0,0,0.45)] transition-all duration-400">
                      <svg
                        className="w-5 h-5 text-white ml-0.5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* 카드 하단 텍스트 */}
                <div className="p-4">
                  <h3 className="font-semibold text-sm text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors duration-300 leading-snug">
                    {video.title}
                  </h3>
                  <p className="text-xs text-muted">
                    {formatKstDate(video.publishedAt, "ko")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 영상 모달 */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
          style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
          onClick={closeVideo}
        >
          <div
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* X 닫기 버튼 */}
            <button
              onClick={closeVideo}
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300 cursor-pointer backdrop-blur-sm"
              aria-label="닫기"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* 플레이어 */}
            <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}?autoplay=1&rel=0`}
                title={activeVideo.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
