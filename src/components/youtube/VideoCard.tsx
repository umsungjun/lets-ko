"use client";

import type { YouTubeVideo } from "@/lib/youtube";

interface VideoCardProps {
  /** 표시할 영상 메타데이터 */
  video: YouTubeVideo;
  /** 클릭 시 모달 오픈 콜백 */
  onOpen: (video: YouTubeVideo) => void;
  /** 카드 좌상단에 표시할 채널명 배지 (선택) */
  channelBadge?: string;
  /** 로케일 (날짜 포맷용) */
  locale: string;
  /** 스태거 애니메이션을 위한 인덱스 */
  index?: number;
  /** 부모의 isInView 신호 (스크롤 진입 시 페이드업) */
  isInView?: boolean;
}

/**
 * @description /[locale]/youtube 페이지에서 사용하는 YouTube 영상 썸네일 카드.
 *  기존 fighter/VideoSection 카드 패턴과 동일한 hover 효과를 사용하되,
 *  채널 배지(선택)를 노출해 '전체 최신순' 뷰에서 출처를 명확히 표시.
 * @param props.video - 표시할 영상
 * @param props.onOpen - 클릭 시 모달 오픈 콜백
 * @param props.channelBadge - 채널명 배지 (없으면 미표시)
 * @param props.locale - 날짜 포맷용 로케일
 * @param props.index - 스태거 애니메이션 인덱스
 * @param props.isInView - 부모 IntersectionObserver 결과
 */
export default function VideoCard({
  video,
  onOpen,
  channelBadge,
  locale,
  index = 0,
  isInView = true,
}: VideoCardProps) {
  const dateLocale = locale === "ko" ? "ko-KR" : "en-US";

  return (
    <button
      onClick={() => onOpen(video)}
      className="group rounded-2xl overflow-hidden bg-white border border-border shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-500 cursor-pointer text-left w-full"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.5s ease ${150 + index * 60}ms, transform 0.5s ease ${150 + index * 60}ms`,
      }}
    >
      <div className="relative aspect-video bg-slate-900 overflow-hidden">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-500" />

        {channelBadge && (
          <span className="absolute top-2 left-2 max-w-[80%] truncate rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            {channelBadge}
          </span>
        )}

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

      <div className="p-4">
        <h3 className="font-semibold text-sm text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors duration-300 leading-snug">
          {video.title}
        </h3>
        <p className="text-xs text-muted">
          {new Date(video.publishedAt).toLocaleDateString(dateLocale)}
        </p>
      </div>
    </button>
  );
}
