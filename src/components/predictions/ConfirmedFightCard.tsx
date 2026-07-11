"use client";

import { useTranslations } from "next-intl";

import { useInView } from "@/hooks/useInView";
import { formatEventDate, getKstDaysUntil } from "@/lib/date-utils";
import type { KoComparisonStats } from "@/lib/ko-stats";
import type { ConfirmedFight } from "@/types/prediction";

interface ConfirmedFightCardProps {
  fight: ConfirmedFight; // 확정된 다음 경기 정보
  koStats: KoComparisonStats; // Tale of the Tape 비교용 고석현 측 데이터
  locale: string; // "ko" | "en"
}

// 상대 이미지 없음/placeholder URL일 때 표시할 실루엣 (다크 배경용)
function FighterPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-800">
      <svg
        className="w-12 h-12 text-gray-600"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
}

// D-day 라벨 계산: 미래="D-N", 당일="D-DAY", 과거=null(미표시)
const getDdayLabel = (dateStr: string): string | null => {
  const days = getKstDaysUntil(dateStr);
  if (days === null || days < 0) return null;
  return days === 0 ? "D-DAY" : `D-${days}`;
};

/**
 * @description 확정된 다음 경기(고석현 vs 상대)를 UFC 대전 카드 스타일의 Tale of the Tape로 표시.
 * 메인 프리뷰·예측 상세 페이지 공용. 페이스오프(사진·D-day) 아래에 전적/나이/신장·체중/리치/스타일을 양측 비교.
 * 상대의 신체 스펙은 Gemini 보강값이라 없을 수 있으며, 없는 항목의 행은 렌더하지 않음.
 * @param props.fight - 확정 경기 정보 (상대/이벤트/날짜/장소)
 * @param props.koStats - 고석현 측 비교 데이터 (전적/나이/신장/체중/리치/스타일)
 * @param props.locale - "ko" | "en"
 */
export default function ConfirmedFightCard({
  fight,
  koStats,
  locale,
}: ConfirmedFightCardProps) {
  const t = useTranslations("predictions");
  const { ref, isInView } = useInView(0.1);
  const lang = locale === "ko" ? "ko" : "en";

  const dday = getDdayLabel(fight.date);
  const { record, fightingStyle, age, height, weight, reach } = fight.opponent;
  const hasRealImage =
    fight.opponent.imageUrl && !fight.opponent.imageUrl.includes("placeholder");
  const hasRecord = record.wins + record.losses + record.draws > 0;

  // 비교 테이블 행 구성 — 상대 데이터가 없는 항목은 제외 (구버전 확정 데이터 대응)
  const rows = [
    hasRecord && {
      label: t("record"),
      left: koStats.record,
      right: `${record.wins}-${record.losses}-${record.draws}`,
    },
    age && {
      label: t("age"),
      left: String(koStats.age),
      right: String(age),
    },
    height &&
      weight && {
        label: t("heightWeight"),
        left: `${koStats.height} / ${koStats.weight}`,
        right: `${height} / ${weight}`,
      },
    reach && {
      label: t("reach"),
      left: koStats.reach,
      right: reach,
    },
    fightingStyle[lang] && {
      label: t("style"),
      left: koStats.style[lang],
      right: fightingStyle[lang],
    },
    fight.opponent.country && {
      label: t("country"),
      left: koStats.country[lang],
      right: fight.opponent.country,
    },
  ].filter(Boolean) as { label: string; left: string; right: string }[];

  return (
    <div ref={ref}>
      {/* 헤더 */}
      <div
        className="text-center mb-10"
        style={{
          opacity: isInView ? 1 : 0,
          transform: isInView ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        <div className="flex items-center justify-center mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-white text-xs font-bold">
            {t("confirmed")}
          </span>
        </div>
        <h2 className="section-heading section-heading-center text-center">
          {t("koName")} {t("vs")} {fight.opponent.name[lang]}
        </h2>
      </div>

      {/* 대전 카드 (Tale of the Tape) */}
      <div
        className="max-w-2xl mx-auto rounded-3xl overflow-hidden bg-linear-to-b from-[#0f1724] via-[#162033] to-[#0f1724] border border-white/5 shadow-2xl"
        style={{
          opacity: isInView ? 1 : 0,
          transform: isInView ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.5s ease 150ms, transform 0.5s ease 150ms",
        }}
      >
        {/* 이벤트 정보 스트립 */}
        <div className="relative px-4 pt-7 text-center">
          <p className="text-[11px] font-bold tracking-[0.25em] text-white/40 uppercase">
            {fight.event}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] text-white/60">
            <span className="inline-flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 text-white/35"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {formatEventDate(fight.date, locale) || fight.date}
            </span>
            {fight.location[lang] && (
              <span className="inline-flex items-center gap-1.5">
                <svg
                  className="w-3.5 h-3.5 text-white/35"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {fight.location[lang]}
              </span>
            )}
          </div>
        </div>

        {/* 페이스오프 */}
        <div className="relative px-4 pt-7 pb-6">
          {/* 배경 글로우 효과 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
          </div>

          <div className="relative flex items-center">
            {/* 왼쪽: 고석현 */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden ring-[3px] ring-primary/60 shadow-[0_0_20px_rgba(220,38,38,0.2)] mb-3">
                <img
                  src="/images/ko-seokhyeon.png"
                  alt={t("koName")}
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <h3 className="text-white font-bold text-sm sm:text-base tracking-tight">
                {t("koName")}
              </h3>
              <span className="text-white/40 text-[11px] font-medium mt-0.5 tracking-wide">
                KOR
              </span>
            </div>

            {/* 가운데: D-day + VS */}
            <div className="flex flex-col items-center gap-1.5 px-3">
              {dday && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary text-white text-[11px] font-black tabular-nums shadow-[0_0_16px_rgba(220,38,38,0.4)]">
                  {dday}
                </span>
              )}
              <span className="text-2xl font-black bg-linear-to-b from-white to-white/60 bg-clip-text text-transparent">
                {t("vs")}
              </span>
            </div>

            {/* 오른쪽: 상대 */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden ring-[3px] ring-blue-400/60 bg-gray-800 shadow-[0_0_20px_rgba(59,130,246,0.15)] mb-3">
                {hasRealImage ? (
                  <img
                    src={fight.opponent.imageUrl}
                    alt={fight.opponent.name[lang]}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <FighterPlaceholder />
                )}
              </div>
              <h3 className="text-white font-bold text-sm sm:text-base tracking-tight">
                {fight.opponent.name[lang]}
              </h3>
              <span className="text-white/40 text-[11px] font-medium mt-0.5 tracking-wide">
                {fight.opponent.country || "-"}
              </span>
            </div>
          </div>
        </div>

        {/* 비교 테이블 (Tale of the Tape) */}
        {rows.length > 0 && (
          <div className="px-3 sm:px-5 pb-6">
            <p className="text-center text-[10px] font-bold text-white/25 tracking-[0.3em] uppercase mb-2.5">
              Tale of the Tape
            </p>
            <div className="rounded-2xl bg-white/4 border border-white/6 overflow-hidden backdrop-blur-sm">
              {rows.map((row, i) => (
                <div
                  key={i}
                  className={`flex items-center py-3 px-3 sm:px-4 ${
                    i !== 0 ? "border-t border-white/6" : ""
                  }`}
                >
                  <span className="flex-1 text-right text-white/90 text-[13px] font-semibold pr-3 tabular-nums">
                    {row.left}
                  </span>
                  <span className="w-20 sm:w-28 text-center text-white/35 text-[11px] font-bold tracking-wide uppercase shrink-0">
                    {row.label}
                  </span>
                  <span className="flex-1 text-left text-white/90 text-[13px] font-semibold pl-3 tabular-nums">
                    {row.right}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
