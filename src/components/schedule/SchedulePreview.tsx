"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { useInView } from "@/hooks/useInView";
import {
  estimateMainEventStart,
  formatKstCardTime,
  isTbaMatchup,
} from "@/lib/schedule-utils";
import type { UfcSchedule } from "@/types/schedule";

import FightCardTabs from "./FightCardTabs";

interface SchedulePreviewProps {
  schedule: UfcSchedule;
  locale: string;
}

function FighterAvatar({
  imageUrl,
  name,
}: {
  imageUrl?: string;
  name: string;
}) {
  if (imageUrl && !imageUrl.includes("placeholder")) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover object-top"
        loading="lazy"
      />
    );
  }
  return (
    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white/10 flex items-center justify-center">
      <svg
        className="w-9 h-9 text-white/30"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
}

/**
 * @description 메인 페이지용 다가오는 UFC 이벤트 프리뷰 클라이언트 컴포넌트.
 * 오늘 이후 첫 번째 이벤트 1개만 표시하며, 파이터 좌우 대결 구도와 AI 승부 예측을 포함.
 * 이벤트가 없으면 null 반환 (섹션 자체를 숨김).
 * @param schedule - Supabase 또는 cached-schedule.json에서 로드된 일정 데이터
 * @param locale - 현재 언어 ("ko" | "en")
 */
export default function SchedulePreview({
  schedule,
  locale,
}: SchedulePreviewProps) {
  const t = useTranslations("schedule");
  const { ref, isInView } = useInView(0.1);
  const lang = locale === "ko" ? "ko" : "en";

  // 오늘 이후 이벤트 중 1개만 표시
  const today = new Date().toISOString().split("T")[0];
  const nextEvent = schedule.events.find((e) => e.date >= today);
  if (!nextEvent) return null;

  const prediction = schedule.predictions.find(
    (p) => p.eventId === nextEvent.id
  );
  const { fighter1, fighter2 } = nextEvent.mainEvent;
  const isTba = isTbaMatchup(fighter1.name, fighter2.name);

  const formattedDate = new Date(
    nextEvent.date + "T12:00:00Z"
  ).toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
  // 메인 이벤트(타이틀 매치) 예상 시작 시각 KST
  // 메인 카드는 하위→상위로 진행되므로 헤드라이너는 마지막 → 경기당 30분 가정
  const mainEventEtaKst = formatKstCardTime(
    estimateMainEventStart(
      nextEvent.cardTimes?.main,
      nextEvent.fightCard?.mainCard.length ?? 0
    ),
    lang
  );

  const isWinner1 = prediction && prediction.winner.en === fighter1.name;

  return (
    <section className="py-20 px-4" ref={ref}>
      <div className="max-w-2xl mx-auto">
        {/* 섹션 헤더 */}
        <div
          className="text-center mb-8"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <h2 className="section-heading section-heading-center text-center">
            {t("previewTitle")}
          </h2>
        </div>

        {/* 피처드 이벤트 카드 */}
        <div
          className="rounded-2xl overflow-hidden shadow-xl"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease 150ms, transform 0.6s ease 150ms",
          }}
        >
          {/* 어두운 헤더 */}
          <div className="bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 px-6 pt-5 pb-6">
            <div className="flex items-start justify-between gap-2 mb-5">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  {nextEvent.mainEvent.titleFight && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 text-[10px] font-bold border border-yellow-400/30">
                      {t("titleFight")}
                    </span>
                  )}
                  {nextEvent.mainEvent.weightClass && (
                    <span className="text-[11px] text-white/50 font-medium">
                      {nextEvent.mainEvent.weightClass}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                  {nextEvent.name}
                </h3>
              </div>
              <div className="shrink-0 text-right">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/20 text-primary text-xs font-bold border border-primary/30">
                  {formattedDate}
                </span>
                {mainEventEtaKst && (
                  <p className="text-[11px] text-white/60 tabular-nums mt-1">
                    {t("estimatedStartKst")} {mainEventEtaKst}
                  </p>
                )}
                <p className="text-[11px] text-white/40 mt-1">
                  {nextEvent.location[lang]}
                </p>
              </div>
            </div>

            {/* 파이터 매치업 */}
            {!isTba ? (
              <div className="flex items-center justify-between gap-4">
                {/* 파이터 1 */}
                <div className="flex-1 flex flex-col items-center text-center min-w-0">
                  <div
                    className={`ring-2 rounded-xl mb-2.5 overflow-hidden ${isWinner1 ? "ring-primary/70" : "ring-white/10"}`}
                  >
                    <FighterAvatar
                      imageUrl={fighter1.imageUrl}
                      name={fighter1.name}
                    />
                  </div>
                  <p className="text-sm font-black text-white leading-tight line-clamp-2">
                    {fighter1.name}
                  </p>
                  {fighter1.record && (
                    <p className="text-[11px] text-white/40 tabular-nums mt-0.5">
                      {fighter1.record}
                    </p>
                  )}
                  {isWinner1 && prediction && (
                    <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold border border-primary/30">
                      {prediction.winProbability}%
                    </span>
                  )}
                </div>

                {/* VS */}
                <div className="shrink-0 text-center">
                  <span className="text-2xl font-black text-white/20 tracking-tighter">
                    VS
                  </span>
                </div>

                {/* 파이터 2 */}
                <div className="flex-1 flex flex-col items-center text-center min-w-0">
                  <div
                    className={`ring-2 rounded-xl mb-2.5 overflow-hidden ${!isWinner1 && prediction ? "ring-primary/70" : "ring-white/10"}`}
                  >
                    <FighterAvatar
                      imageUrl={fighter2.imageUrl}
                      name={fighter2.name}
                    />
                  </div>
                  <p className="text-sm font-black text-white leading-tight line-clamp-2">
                    {fighter2.name}
                  </p>
                  {fighter2.record && (
                    <p className="text-[11px] text-white/40 tabular-nums mt-0.5">
                      {fighter2.record}
                    </p>
                  )}
                  {!isWinner1 && prediction && (
                    <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold border border-primary/30">
                      {prediction.winProbability}%
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-6">
                <span className="text-sm text-white/30">{t("tba")}</span>
              </div>
            )}
          </div>

          {/* AI 예측 스트립 */}
          {prediction && !isTba && (
            <div className="bg-white px-6 py-4">
              <div className="flex items-center gap-2 flex-wrap mb-2">
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
                <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
                  {prediction.method[lang]}
                </span>
                <span className="text-muted/40 text-xs">·</span>
                <span className="text-sm font-black text-primary tabular-nums">
                  {prediction.winProbability}%
                </span>
              </div>
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
              <p className="text-xs text-foreground/65 leading-relaxed line-clamp-2">
                {prediction.analysis[lang]}
              </p>
            </div>
          )}

          {/* 전체 카드 탭 (메인/예선/초기예선) */}
          {nextEvent.fightCard && (
            <FightCardTabs
              fightCard={nextEvent.fightCard}
              locale={locale}
              cardTimes={nextEvent.cardTimes}
            />
          )}
        </div>

        {/* CTA */}
        <div
          className="text-center mt-6"
          style={{
            opacity: isInView ? 1 : 0,
            transition: "opacity 0.5s ease 400ms",
          }}
        >
          <Link
            href={`/${locale}/schedule`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-foreground text-white hover:bg-foreground/90 transition-all duration-300 text-sm font-semibold shadow-lg shadow-foreground/10"
          >
            {t("viewAll")}
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
