"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import ConfirmedFightCard from "@/components/predictions/ConfirmedFightCard";
import { useInView } from "@/hooks/useInView";
import { formatKstLongDate } from "@/lib/date-utils";
import type { KoComparisonStats } from "@/lib/ko-stats";
import type { PredictionData } from "@/types/prediction";

interface PredictionPreviewProps {
  predictions: PredictionData; // AI 상대 예측 데이터 (확정 경기 포함 가능)
  koStats: KoComparisonStats; // 카드 내 비교 표기용 고석현 측 데이터
  locale: string; // "ko" | "en"
}

// 상대 이미지 없음/placeholder URL일 때 표시할 실루엣 (다크 배경용)
function FighterPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-800">
      <svg
        className="w-10 h-10 text-gray-600"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
}

// "177.8cm" → "177.8" (미니 그리드의 KO 병기값은 공간 절약을 위해 단위 생략)
const stripUnit = (value: string): string => value.replace(/[^\d.]/g, "");

/**
 * @description 메인 페이지 AI 다음 상대 예측 프리뷰 섹션. 확정 경기가 있으면 Tale of the Tape 카드,
 * 없으면 후보 3인의 다크 카드(전적/나이/신장/리치 + 고석현 병기, AI 승률 바)를 표시.
 * @param props.predictions - AI 상대 예측 데이터
 * @param props.koStats - 고석현 측 비교 데이터 (전적/나이/신장/리치 등)
 * @param props.locale - "ko" | "en"
 */
export default function PredictionPreview({
  predictions,
  koStats,
  locale,
}: PredictionPreviewProps) {
  const t = useTranslations("predictions");
  const { ref, isInView } = useInView(0.1);
  const lang = locale === "ko" ? "ko" : "en";

  // 확정된 경기가 있으면 확정 정보를 표시 (예측 상세 페이지와 공통 컴포넌트 사용)
  if (predictions.confirmedFight) {
    return (
      <section className="py-20 px-4 bg-surface">
        <div className="max-w-5xl mx-auto">
          <ConfirmedFightCard
            fight={predictions.confirmedFight}
            koStats={koStats}
            locale={locale}
          />
        </div>
      </section>
    );
  }

  // 최근 경기 후 2달 미만이면 준비 중 메시지
  if (predictions.opponents.length === 0 && predictions.lastFightDate) {
    return (
      <section className="py-20 px-4 bg-surface" ref={ref}>
        <div className="max-w-5xl mx-auto">
          <div
            className="text-center"
            style={{
              opacity: isInView ? 1 : 0,
              transform: isInView ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-linear-to-r from-violet-600 to-blue-500 text-white text-[11px] font-bold tracking-wide">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                AI PREDICTION
              </span>
            </div>
            <h2 className="section-heading section-heading-center text-center">
              {t("title")}
            </h2>
            <div className="max-w-md mx-auto mt-8 p-6 rounded-2xl bg-white border border-border shadow-card">
              <p className="text-lg font-bold text-foreground mb-2">
                {t("preparing")}
              </p>
              <p className="text-sm text-muted">{t("preparingDesc")}</p>
              <p className="text-xs text-muted/60 mt-3">
                {t("lastFight", { date: predictions.lastFightDate })}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 예측 후보 없으면 렌더링 안 함
  if (predictions.opponents.length === 0) return null;

  return (
    <section className="py-20 px-4 bg-surface" ref={ref}>
      <div className="max-w-5xl mx-auto">
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
          <h2 className="section-heading section-heading-center text-center">
            {t("title")}
          </h2>
          <p className="text-xs text-muted mt-4">{t("poweredBy")}</p>
          <p className="text-[11px] text-muted/50 mt-0.5">
            {t("updatedAt", {
              date: formatKstLongDate(predictions.generatedAt, locale),
            })}
          </p>
        </div>

        {/* 후보 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {predictions.opponents.map((opponent, index) => {
            const total =
              opponent.record.wins +
              opponent.record.losses +
              opponent.record.draws;
            const winRate =
              total > 0 ? Math.round((opponent.record.wins / total) * 100) : 0;
            const koProb = opponent.winProbability;

            // 미니 비교 그리드: 상대 값 + 고석현(KO) 병기값
            const miniStats = [
              {
                label: t("record"),
                value: `${opponent.record.wins}-${opponent.record.losses}-${opponent.record.draws}`,
                sub: total > 0 ? `${t("winRate")} ${winRate}%` : "-",
              },
              {
                label: t("age"),
                value: String(opponent.age),
                sub: `KO ${koStats.age}`,
              },
              {
                label: t("height"),
                value: opponent.height,
                sub: `KO ${stripUnit(koStats.height)}`,
              },
              {
                label: t("reach"),
                value: opponent.reach,
                sub: `KO ${stripUnit(koStats.reach)}`,
              },
            ];

            return (
              <Link
                key={index}
                href={`/${locale}/predictions`}
                className="group relative rounded-3xl bg-linear-to-b from-[#0f1724] via-[#162033] to-[#0f1724] border border-white/5 shadow-xl hover:shadow-2xl hover:border-white/15 transition-all duration-500 cursor-pointer overflow-hidden"
                style={{
                  opacity: isInView ? 1 : 0,
                  transform: isInView ? "translateY(0)" : "translateY(16px)",
                  transition: `opacity 0.5s ease ${150 + index * 100}ms, transform 0.5s ease ${150 + index * 100}ms`,
                }}
              >
                {/* 상단 배경 글로우 */}
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl group-hover:bg-primary/15 transition-colors duration-500 pointer-events-none" />

                <div className="relative flex flex-col items-center text-center p-5 sm:p-6">
                  {/* 후보 순위 배지 */}
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/6 border border-white/10 text-white/70 text-[11px] font-black tracking-wide mb-4">
                    {t("candidate", { number: index + 1 })}
                  </span>

                  {/* 프로필 이미지 */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gray-800 ring-2 ring-white/10 group-hover:ring-blue-400/50 transition-all duration-500 mb-3">
                    {opponent.imageUrl &&
                    !opponent.imageUrl.includes("placeholder") ? (
                      <img
                        src={opponent.imageUrl}
                        alt={opponent.name[lang]}
                        className="w-full h-full object-cover object-top"
                        loading="lazy"
                      />
                    ) : (
                      <FighterPlaceholder />
                    )}
                  </div>

                  {/* 이름 */}
                  <h3 className="text-white font-bold text-[15px] tracking-tight">
                    {opponent.name[lang]}
                  </h3>

                  {/* 국적 + 랭킹 */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[11px] text-white/40 font-medium">
                      {opponent.country}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-[11px] font-semibold text-white/40">
                      FightMatrix #{opponent.fightMatrixRank}
                    </span>
                  </div>

                  {/* 스타일 태그 */}
                  <span className="mt-3 text-[11px] font-medium text-violet-300 bg-violet-500/15 border border-violet-400/10 px-2.5 py-1 rounded-lg">
                    {opponent.fightingStyle[lang]}
                  </span>

                  {/* 미니 비교 그리드 (상대 값 + KO 병기) */}
                  <div className="w-full grid grid-cols-4 divide-x divide-white/6 rounded-xl bg-white/4 border border-white/6 py-2.5 mt-4">
                    {miniStats.map((stat, i) => (
                      <div key={i} className="px-1">
                        <p className="text-[10px] text-white/35 font-bold uppercase tracking-wide">
                          {stat.label}
                        </p>
                        <p className="text-[12px] text-white font-bold tabular-nums mt-0.5">
                          {stat.value}
                        </p>
                        <p className="text-[10px] text-white/35 tabular-nums mt-0.5">
                          {stat.sub}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* AI 승률 바 */}
                  <div className="w-full mt-4">
                    <p className="text-left text-[10px] text-white/30 font-bold uppercase tracking-wider mb-1.5">
                      {t("winProbability")}
                    </p>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-red-300 tabular-nums">
                        {t("koName")} {koProb}%
                      </span>
                      <span className="text-[11px] font-bold text-blue-300 tabular-nums">
                        {100 - koProb}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden flex">
                      <div
                        className="h-full bg-linear-to-r from-primary to-red-400"
                        style={{ width: `${koProb}%` }}
                      />
                      <div
                        className="h-full bg-linear-to-r from-blue-400 to-blue-600"
                        style={{ width: `${100 - koProb}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 하단 CTA */}
        <div
          className="text-center mt-8"
          style={{
            opacity: isInView ? 1 : 0,
            transition: "opacity 0.5s ease 500ms",
          }}
        >
          <Link
            href={`/${locale}/predictions`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-foreground text-white hover:bg-foreground/90 transition-all duration-300 text-sm font-semibold shadow-lg shadow-foreground/10"
          >
            {t("viewDetail")}
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
          <p className="text-[11px] text-muted/40 mt-4">{t("disclaimer")}</p>
        </div>
      </div>
    </section>
  );
}
