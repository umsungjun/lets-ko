"use client";

import { useTranslations } from "next-intl";

import type { KoComparisonStats } from "@/lib/ko-stats";
import type { OpponentPrediction } from "@/types/prediction";

interface FighterComparisonProps {
  opponent: OpponentPrediction;
  locale: string;
  koStats: KoComparisonStats;
}

/** 다양한 날짜 형식을 "약 N개월 전" / "~N months ago" 형식으로 표시 */
function formatFightDate(date: string | undefined, locale: string): string {
  if (!date) return "-";

  let parsed: Date | null = null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    parsed = new Date(date);
  }
  // MM.DD.YY (예: 02.11.25 → 2025년 2월 11일)
  else if (/^\d{2}\.\d{2}\.\d{2}$/.test(date)) {
    const [mm, dd, yy] = date.split(".");
    parsed = new Date(`20${yy}-${mm}-${dd}`);
  }

  if (!parsed || isNaN(parsed.getTime())) return date;

  const months = Math.floor(
    (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );

  if (locale === "ko") {
    if (months < 1) return "이번 달";
    if (months < 12) return `약 ${months}개월 전`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `약 ${years}년 ${rem}개월 전` : `약 ${years}년 전`;
  } else {
    if (months < 1) return "this month";
    if (months < 12) return `~${months}mo ago`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `~${years}y ${rem}mo ago` : `~${years}y ago`;
  }
}

export default function FighterComparison({
  opponent,
  locale,
  koStats,
}: FighterComparisonProps) {
  const t = useTranslations("predictions");
  const lang = locale === "ko" ? "ko" : "en";

  const rows = [
    {
      label: t("rank"),
      left: `#${koStats.fightMatrixRank}`,
      right: `#${opponent.fightMatrixRank}`,
    },
    {
      label: t("record"),
      left: koStats.record,
      right: `${opponent.record.wins}-${opponent.record.losses}-${opponent.record.draws}`,
    },
    {
      label: t("age"),
      left: String(koStats.age),
      right: String(opponent.age),
    },
    {
      label: t("heightWeight"),
      left: `${koStats.height} / ${koStats.weight}`,
      right: `${opponent.height} / ${opponent.weight}`,
    },
    {
      label: t("reach"),
      left: koStats.reach,
      right: opponent.reach,
    },
    {
      label: t("style"),
      left: koStats.style[lang],
      right: opponent.fightingStyle[lang],
    },
    {
      label: t("lastFightDate"),
      left: formatFightDate(koStats.lastFightDate, locale),
      right: formatFightDate(opponent.lastFightDate, locale),
    },
  ];

  return (
    <div className="rounded-3xl overflow-hidden bg-linear-to-b from-[#0f1724] via-[#162033] to-[#0f1724] shadow-2xl border border-white/5">
      {/* 선수 영역 */}
      <div className="relative px-4 pt-8 pb-6">
        {/* 배경 글로우 효과 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative flex items-center">
          {/* 왼쪽: 고석현 */}
          <div className="flex-1 flex flex-col items-center">
            <div className="relative mb-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden ring-[3px] ring-primary/60 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                <img
                  src="/images/ko-seokhyeon.png"
                  alt={t("koName")}
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>
            <h3 className="text-white font-bold text-sm sm:text-base tracking-tight">
              {t("koName")}
            </h3>
            <span className="text-white/40 text-[11px] font-medium mt-0.5 tracking-wide">
              KOR
            </span>
          </div>

          {/* 가운데: VS */}
          <div className="flex flex-col items-center gap-1 px-3">
            <span className="text-[10px] font-bold text-white/30 tracking-widest uppercase">
              Matchup
            </span>
            <span className="text-2xl font-black bg-linear-to-b from-white to-white/60 bg-clip-text text-transparent">
              VS
            </span>
          </div>

          {/* 오른쪽: 상대 */}
          <div className="flex-1 flex flex-col items-center">
            <div className="relative mb-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden ring-[3px] ring-blue-400/60 bg-gray-800 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                {opponent.imageUrl &&
                !opponent.imageUrl.includes("placeholder") ? (
                  <img
                    src={opponent.imageUrl}
                    alt={opponent.name[lang]}
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-gray-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            <h3 className="text-white font-bold text-sm sm:text-base tracking-tight">
              {opponent.name[lang]}
            </h3>
            <span className="text-white/40 text-[11px] font-medium mt-0.5 tracking-wide">
              {opponent.country}
            </span>
          </div>
        </div>
      </div>

      {/* 비교 테이블 */}
      <div className="px-3 sm:px-5 pb-5">
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
              <span className="w-24 sm:w-32 text-center text-white/35 text-[11px] font-bold tracking-wide uppercase shrink-0">
                {row.label}
              </span>
              <span className="flex-1 text-left text-white/90 text-[13px] font-semibold pl-3 tabular-nums">
                {row.right}
              </span>
            </div>
          ))}
        </div>
        <p className="text-center text-white/20 text-[10px] mt-3">
          {t("rankSource")}
        </p>
      </div>
    </div>
  );
}
