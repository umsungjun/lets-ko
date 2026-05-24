"use client";

import { useEffect } from "react";

import type { YouTubeVideo } from "@/lib/youtube";

interface VideoModalProps {
  /** 표시할 영상 (null이면 모달 미출력) */
  video: YouTubeVideo | null;
  /** 모달 닫기 콜백 */
  onClose: () => void;
  /** 닫기 버튼 aria-label (다국어) */
  closeLabel: string;
}

/**
 * @description YouTube 영상 풀스크린 모달 플레이어.
 *  ESC 키와 백드롭 클릭으로 닫히며, 열려있는 동안 body 스크롤 잠금.
 *  youtube-nocookie 도메인을 사용해 GDPR/쿠키 영향 최소화.
 * @param props.video - 표시할 영상 (null이면 렌더 안 함)
 * @param props.onClose - 모달 닫기 콜백
 * @param props.closeLabel - 닫기 버튼 aria-label
 */
export default function VideoModal({
  video,
  onClose,
  closeLabel,
}: VideoModalProps) {
  // 모달 열림 동안 body 스크롤 잠금
  useEffect(() => {
    if (!video) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [video]);

  // ESC 닫기
  useEffect(() => {
    if (!video) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [video, onClose]);

  if (!video) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300 cursor-pointer backdrop-blur-sm"
          aria-label={closeLabel}
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

        <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
