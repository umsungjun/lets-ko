"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

import { useInView } from "@/hooks/useInView";
import { formatEventDate } from "@/lib/date-utils";
import {
  estimateMainEventStart,
  formatKstCardTime,
  formatWeightClass,
  isTbaMatchup,
} from "@/lib/schedule-utils";
import type { EventPrediction, UfcEvent } from "@/types/schedule";

import FightCardTabs from "./FightCardTabs";

interface EventCardProps {
  event: UfcEvent;
  prediction?: EventPrediction;
  locale: string;
  /** 스크롤 애니메이션 지연 순서 (index * 80ms) */
  index?: number;
}

function FighterImage({ imageUrl, name }: { imageUrl?: string; name: string }) {
  if (imageUrl && !imageUrl.includes("placeholder")) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="w-full h-full object-cover object-top"
        loading="lazy"
      />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-white/10">
      <svg
        className="w-10 h-10 text-white/20"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
}

/**
 * @description UFC 이벤트 단건 카드 클라이언트 컴포넌트.
 * 어두운 헤더(이벤트명·날짜·파이터 좌우 대결)와 밝은 AI 예측 섹션으로 구성.
파이터 이미지 없으면 플레이스홀더 SVG 표시.
 * @param event - UFC 이벤트 데이터 (날짜·장소·메인 이벤트 파이터)
 * @param prediction - Gemini AI 승부 예측 (없으면 AI 섹션 미표시)
 * @param locale - 현재 언어 ("ko" | "en")
 * @param index - 카드 순서 인덱스 (스크롤 인트로 애니메이션 딜레이에 사용)
 */
export default function EventCard({
  event,
  prediction,
  locale,
  index = 0,
}: EventCardProps) {
  const t = useTranslations("schedule");
  const { ref, isInView } = useInView(0.1);
  const [analysisExpanded, setAnalysisExpanded] = useState(false);
  const lang = locale === "ko" ? "ko" : "en";

  const formattedDate = formatEventDate(event.date, locale);
  // 메인 이벤트(헤드라이너) 예상 시작 시각 KST — 타이틀 매치 여부와 무관하게 항상 표시
  // 메인 카드는 하위→상위로 진행되므로 헤드라이너는 마지막 → 경기당 30분 가정
  const mainEventEtaKst = formatKstCardTime(
    estimateMainEventStart(
      event.cardTimes?.main,
      event.fightCard?.mainCard.length ?? 0
    ),
    lang
  );

  const { fighter1, fighter2 } = event.mainEvent;
  const isTba = isTbaMatchup(fighter1.name, fighter2.name);

  const isWinner1 =
    prediction !== undefined &&
    (prediction.winner.en.toLowerCase().includes(fighter1.name.toLowerCase()) ||
      fighter1.name.toLowerCase().includes(prediction.winner.en.toLowerCase()));

  return (
    <div
      ref={ref}
      className="rounded-2xl overflow-hidden shadow-lg border border-white/5"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 0.5s ease ${index * 80}ms, transform 0.5s ease ${index * 80}ms`,
      }}
    >
      {/* 어두운 헤더: 이벤트 정보 + 파이터 매치업 */}
      <div className="bg-linear-to-br from-gray-900 via-gray-850 to-gray-900 px-6 pt-5 pb-6">
        {/* 이벤트 메타 */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {event.mainEvent.titleFight && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 text-[10px] font-bold border border-yellow-400/30">
                  {t("titleFight")}
                </span>
              )}
              {formatWeightClass(event.mainEvent.weightClass, lang) && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/80 text-[10px] font-bold border border-white/15">
                  {formatWeightClass(event.mainEvent.weightClass, lang)}
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-black text-white leading-tight">
              {event.name}
            </h3>
          </div>
          <div className="shrink-0 text-right">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/20 text-primary text-xs font-bold border border-primary/30">
              {formattedDate}
            </span>
            {mainEventEtaKst && (
              <p className="text-[11px] text-white/60 tabular-nums mt-1.5">
                {t("estimatedStartKst")} {mainEventEtaKst}
              </p>
            )}
            <p className="text-[11px] text-white/35 mt-1.5">
              {event.location[lang]}
            </p>
          </div>
        </div>

        {/* 파이터 매치업 */}
        {isTba ? (
          <div className="flex items-center justify-center py-6">
            <span className="text-sm text-white/30">{t("tba")}</span>
          </div>
        ) : (
          <div className="flex items-start gap-2 md:gap-6">
            {/* 파이터 1 */}
            <div className="flex-1 flex flex-col items-center gap-1.5 md:flex-row md:items-center md:gap-3 min-w-0">
              <div
                className={`shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden ring-2 ${isWinner1 ? "ring-primary/70" : "ring-white/10"}`}
              >
                <FighterImage
                  imageUrl={fighter1.imageUrl}
                  name={fighter1.name}
                />
              </div>
              <div className="min-w-0 text-center md:text-left">
                <p className="text-sm sm:text-base font-black text-white leading-tight line-clamp-2">
                  {fighter1.name}
                </p>
                {fighter1.record && (
                  <p className="text-[11px] text-white/40 tabular-nums mt-0.5">
                    {fighter1.record}
                  </p>
                )}
                {isWinner1 && prediction && (
                  <span className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold border border-primary/30">
                    {prediction.winProbability}%
                  </span>
                )}
              </div>
            </div>

            {/* VS */}
            <div className="shrink-0 pt-7 md:pt-0 md:self-center">
              <span className="text-xl font-black text-white/20">VS</span>
            </div>

            {/* 파이터 2 */}
            <div className="flex-1 flex flex-col items-center gap-1.5 md:flex-row-reverse md:items-center md:gap-3 min-w-0">
              <div
                className={`shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden ring-2 ${!isWinner1 && prediction ? "ring-primary/70" : "ring-white/10"}`}
              >
                <FighterImage
                  imageUrl={fighter2.imageUrl}
                  name={fighter2.name}
                />
              </div>
              <div className="min-w-0 text-center md:text-right">
                <p className="text-sm sm:text-base font-black text-white leading-tight line-clamp-2">
                  {fighter2.name}
                </p>
                {fighter2.record && (
                  <p className="text-[11px] text-white/40 tabular-nums mt-0.5">
                    {fighter2.record}
                  </p>
                )}
                {!isWinner1 && prediction && (
                  <div className="flex justify-center md:justify-end mt-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold border border-primary/30">
                      {prediction.winProbability}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI 예측 섹션 — 밝은 배경 */}
      {prediction && !isTba && (
        <div className="bg-white px-6 py-4">
          {/* 한 줄 요약: AI 뱃지 + 승자 + 방식 + 확률 */}
          <div className="flex items-center gap-2 flex-wrap mb-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-linear-to-r from-violet-600 to-blue-500 text-white text-[10px] font-bold shrink-0">
              <svg
                className="w-2.5 h-2.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              AI
            </span>
            <span className="text-sm font-bold text-foreground">
              {prediction.winner[lang]}
            </span>
            <span className="text-muted/40 text-xs">·</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[11px] font-semibold">
              {prediction.method[lang]}
            </span>
            <span className="text-muted/40 text-xs">·</span>
            <span className="text-sm font-black text-primary tabular-nums">
              {prediction.winProbability}%
            </span>
          </div>

          {/* 승률 바 */}
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden flex mb-3">
            <div
              className="h-full bg-linear-to-r from-primary to-red-400"
              style={{
                width: `${isWinner1 ? prediction.winProbability : 100 - prediction.winProbability}%`,
                borderRadius: "9999px 0 0 9999px",
              }}
            />
            <div
              className="h-full bg-linear-to-r from-blue-400 to-blue-600"
              style={{
                width: `${isWinner1 ? 100 - prediction.winProbability : prediction.winProbability}%`,
                borderRadius: "0 9999px 9999px 0",
              }}
            />
          </div>

          {/* 분석 텍스트 */}
          <p className="text-xs text-foreground/70 leading-relaxed">
            {analysisExpanded
              ? prediction.analysis[lang]
              : `${prediction.analysis[lang].slice(0, 120)}${prediction.analysis[lang].length > 120 ? "..." : ""}`}
          </p>
          {prediction.analysis[lang].length > 120 && (
            <button
              onClick={() => setAnalysisExpanded(!analysisExpanded)}
              className="mt-1.5 text-[11px] text-primary font-semibold hover:underline cursor-pointer"
            >
              {analysisExpanded ? t("collapse") : t("readMore")}
            </button>
          )}
        </div>
      )}

      {/* 전체 카드 탭 (메인/예선/초기예선) */}
      {event.fightCard && (
        <FightCardTabs
          fightCard={event.fightCard}
          locale={locale}
          cardTimes={event.cardTimes}
        />
      )}
    </div>
  );
}
