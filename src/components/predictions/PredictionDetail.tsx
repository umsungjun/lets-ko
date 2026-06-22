"use client";

import { useEffect, useState } from "react";

import { useTranslations } from "next-intl";

import { useInView } from "@/hooks/useInView";
import { formatKstLongDate } from "@/lib/date-utils";
import type { PredictionData } from "@/types/prediction";

import FighterComparison from "./FighterComparison";
import WinProbabilityBar from "./WinProbabilityBar";

interface OpponentVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}

interface PredictionDetailProps {
  predictions: PredictionData;
  koStats: {
    record: string;
    age: number;
    height: string;
    weight: string;
    reach: string;
    style: { ko: string; en: string };
    fightMatrixRank: number;
    lastFightDate?: string;
  };
  locale: string;
}

export default function PredictionDetail({
  predictions,
  koStats,
  locale,
}: PredictionDetailProps) {
  const t = useTranslations("predictions");
  const { ref, isInView } = useInView(0.1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const lang = locale === "ko" ? "ko" : "en";

  // null = 로딩 중, [] = 결과 없음, [...] = 결과 있음
  const [opponentVideos, setOpponentVideos] = useState<OpponentVideo[] | null>(
    null
  );
  const [activeVideo, setActiveVideo] = useState<OpponentVideo | null>(null);

  useEffect(() => {
    const opponent = predictions.opponents[selectedIndex];
    if (!opponent) return;

    const name = opponent.name.en;
    const controller = new AbortController();

    fetch(`/api/youtube/opponent?name=${encodeURIComponent(name)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setOpponentVideos(data.videos ?? []))
      .catch(() => setOpponentVideos([]));

    return () => controller.abort();
  }, [selectedIndex, predictions.opponents]);

  useEffect(() => {
    document.body.style.overflow = activeVideo ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeVideo]);

  if (predictions.opponents.length === 0) {
    return (
      <div className="py-20 px-4 text-center">
        <p className="text-muted">{t("preparingDesc")}</p>
      </div>
    );
  }

  const selectedOpponent = predictions.opponents[selectedIndex];
  const generatedDate = formatKstLongDate(predictions.generatedAt, locale);

  return (
    <div className="py-12 sm:py-16 px-4" ref={ref}>
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div
          className="text-center mb-10"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-linear-to-r from-violet-600 to-blue-500 text-white text-[11px] font-bold tracking-wide">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              AI PREDICTION
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {t("title")}
          </h1>
          <p className="text-xs text-muted mt-2">{t("poweredBy")}</p>
          <p className="text-[11px] text-muted/50 mt-1">
            {t("updatedAt", { date: generatedDate })}
          </p>
        </div>

        {/* 후보 선택 탭 */}
        <div
          className="grid gap-3 mb-8"
          style={{
            gridTemplateColumns: `repeat(${predictions.opponents.length}, 1fr)`,
            opacity: isInView ? 1 : 0,
            transform: isInView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.5s ease 100ms, transform 0.5s ease 100ms",
          }}
        >
          {predictions.opponents.map((opponent, index) => {
            const isSelected = selectedIndex === index;
            const record = opponent.record;
            return (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                  isSelected
                    ? "border-foreground bg-foreground shadow-xl"
                    : "border-border bg-white hover:border-foreground/30 hover:shadow-md"
                }`}
              >
                {/* 상대 이미지 */}
                <div
                  className={`w-14 h-14 rounded-full overflow-hidden ring-2 shrink-0 ${
                    isSelected ? "ring-white/30" : "ring-border"
                  }`}
                >
                  {opponent.imageUrl &&
                  !opponent.imageUrl.includes("placeholder") ? (
                    <img
                      src={opponent.imageUrl}
                      alt={opponent.name[lang]}
                      className="w-full h-full object-cover object-top"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center ${isSelected ? "bg-white/10" : "bg-surface"}`}
                    >
                      <svg
                        className={`w-7 h-7 ${isSelected ? "text-white/40" : "text-muted/30"}`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* 이름 */}
                <p
                  className={`text-[13px] font-bold leading-tight text-center ${isSelected ? "text-white" : "text-foreground"}`}
                >
                  {opponent.name[lang]}
                </p>

                {/* 전적 */}
                <p
                  className={`text-[11px] font-medium ${isSelected ? "text-white/50" : "text-muted"}`}
                >
                  {record.wins}-{record.losses}-{record.draws}
                </p>
              </button>
            );
          })}
        </div>

        {/* 선수 비교 */}
        <div
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.5s ease 200ms, transform 0.5s ease 200ms",
          }}
        >
          <FighterComparison
            opponent={selectedOpponent}
            locale={locale}
            koStats={koStats}
          />
        </div>

        {/* 승률 바 */}
        <div
          className="mt-5"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.5s ease 300ms, transform 0.5s ease 300ms",
          }}
        >
          <WinProbabilityBar opponent={selectedOpponent} locale={locale} />
        </div>

        {/* 분석 카드들 */}
        <div
          className="mt-5 space-y-4"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.5s ease 400ms, transform 0.5s ease 400ms",
          }}
        >
          {/* 매칭 가능성 */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-border/60 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
                <svg
                  className="w-3.5 h-3.5 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </span>
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
                {t("matchReason")}
              </h3>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {selectedOpponent.matchReasoning[lang]}
            </p>
          </div>

          {/* 승부 분석 */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-border/60 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg
                  className="w-3.5 h-3.5 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </span>
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
                {t("fightAnalysis")}
              </h3>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {selectedOpponent.fightAnalysis[lang]}
            </p>
          </div>
        </div>

        {/* 상대 관련 영상 */}
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-3 px-1">
            <svg
              className="w-4 h-4 text-[#FF0000]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M21.593 7.203a2.506 2.506 0 0 0-1.762-1.766C18.265 5.007 12 5 12 5s-6.264-.007-7.831.404a2.56 2.56 0 0 0-1.766 1.778c-.413 1.566-.417 4.814-.417 4.814s-.004 3.264.406 4.814c.23.857.905 1.534 1.763 1.765 1.582.43 7.83.437 7.83.437s6.265.007 7.831-.403a2.515 2.515 0 0 0 1.767-1.763c.414-1.565.417-4.812.417-4.812s.02-3.265-.407-4.831zM9.996 15.005l.005-6 5.207 3.005-5.212 2.995z" />
            </svg>
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
              {selectedOpponent.name[lang]} Videos
            </h3>
          </div>

          {opponentVideos === null ? (
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="aspect-video rounded-xl bg-surface animate-pulse"
                />
              ))}
            </div>
          ) : opponentVideos.length === 0 ? (
            <p className="text-xs text-muted/50 text-center py-4">
              {locale === "ko"
                ? "관련 영상을 찾을 수 없습니다"
                : "No videos found"}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {opponentVideos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => setActiveVideo(video)}
                  className="group relative aspect-video rounded-xl overflow-hidden bg-slate-900 cursor-pointer"
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                    <div className="w-8 h-6 rounded-md bg-[#FF0000] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                      <svg
                        className="w-3 h-3 text-white ml-0.5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 면책 조항 */}
        <p className="text-center text-[11px] text-muted/40 mt-8">
          {t("disclaimer")}
        </p>

        {/* 영상 모달 */}
        {activeVideo && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
            onClick={() => setActiveVideo(null)}
          >
            <div
              className="relative w-full max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setActiveVideo(null)}
                className="absolute -top-10 right-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <svg
                  className="w-5 h-5 text-white"
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
              <div className="aspect-video rounded-xl overflow-hidden">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}?autoplay=1&rel=0`}
                  title={activeVideo.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
