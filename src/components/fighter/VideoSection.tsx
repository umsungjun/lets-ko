"use client";

import { useTranslations } from "next-intl";

import { useInView } from "@/hooks/useInView";
import type { YouTubeVideo } from "@/lib/youtube";

interface VideoSectionProps {
  videos: YouTubeVideo[];
}

export default function VideoSection({ videos }: VideoSectionProps) {
  const t = useTranslations("videos");
  const { ref, isInView } = useInView(0.1);

  if (videos.length === 0) return null;

  return (
    <section className="py-16 px-4 bg-surface" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <h2
          className="section-heading section-heading-center text-center mb-12"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          {t("title")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((video, index) => (
            <a
              key={video.id}
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl overflow-hidden bg-white border border-border shadow-card hover:shadow-card-hover transition-all"
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
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center group-hover:bg-red-500 group-hover:scale-110 transition-all">
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
                <h3 className="font-bold text-sm text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                  {video.title}
                </h3>
                <p className="text-xs text-muted mt-1">
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
