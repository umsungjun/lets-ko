"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

import FighterComparison from "./FighterComparison";
import WinProbabilityBar from "./WinProbabilityBar";

import { useInView } from "@/hooks/useInView";
import type { PredictionData } from "@/types/prediction";

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

  if (predictions.opponents.length === 0) {
    return (
      <div className="py-20 px-4 text-center">
        <p className="text-muted">{t("preparingDesc")}</p>
      </div>
    );
  }

  const selectedOpponent = predictions.opponents[selectedIndex];
  const generatedDate = new Date(predictions.generatedAt).toLocaleDateString(
    locale === "ko" ? "ko-KR" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

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
          className="flex gap-2 justify-center mb-8"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.5s ease 100ms, transform 0.5s ease 100ms",
          }}
        >
          {predictions.opponents.map((opponent, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-300 cursor-pointer ${
                selectedIndex === index
                  ? "bg-foreground text-white shadow-lg"
                  : "bg-surface border border-border text-muted hover:text-foreground hover:border-foreground/20"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  selectedIndex === index
                    ? "bg-white/20 text-white"
                    : "bg-foreground/5 text-foreground/50"
                }`}
              >
                #{index + 1}
              </span>
              <span className="hidden sm:inline">{opponent.name[lang]}</span>
            </button>
          ))}
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

        {/* 면책 조항 */}
        <p className="text-center text-[11px] text-muted/40 mt-8">
          {t("disclaimer")}
        </p>
      </div>
    </div>
  );
}
