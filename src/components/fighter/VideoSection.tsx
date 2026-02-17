"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

import { useInView } from "@/hooks/useInView";
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

  const videos = activeTab === "date" ? videosByDate : videosByViews;

  if (videosByDate.length === 0 && videosByViews.length === 0) return null;

  return (
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
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === "date"
                  ? "bg-primary text-white shadow-[0_2px_8px_rgba(220,38,38,0.3)]"
                  : "bg-white border border-border text-muted hover:text-primary hover:border-primary/40 hover:bg-primary-light"
              }`}
            >
              {t("latest")}
            </button>
            <button
              onClick={() => setActiveTab("viewCount")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-white text-muted hover:text-primary hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 text-sm font-medium cursor-pointer"
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video, index) => (
            <a
              key={video.id}
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl overflow-hidden bg-white border border-border shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              style={{
                opacity: isInView ? 1 : 0,
                transform: isInView ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 0.5s ease ${150 + index * 100}ms, transform 0.5s ease ${150 + index * 100}ms`,
              }}
            >
              <div className="relative aspect-video bg-slate-900 overflow-hidden">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/10 to-transparent group-hover:from-black/40 transition-all duration-300 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center group-hover:bg-primary group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all duration-300">
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
              <div className="p-4">
                <h3 className="font-semibold text-sm text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors leading-snug">
                  {video.title}
                </h3>
                <p className="text-xs text-muted">
                  {new Date(video.publishedAt).toLocaleDateString("ko-KR")}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
