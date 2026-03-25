"use client";

import { useTranslations } from "next-intl";

import type { OpponentPrediction } from "@/types/prediction";

interface WinProbabilityBarProps {
  opponent: OpponentPrediction;
  locale: string;
}

export default function WinProbabilityBar({
  opponent,
  locale,
}: WinProbabilityBarProps) {
  const t = useTranslations("predictions");
  const lang = locale === "ko" ? "ko" : "en";
  const koProb = opponent.winProbability;
  const opProb = 100 - koProb;

  return (
    <div className="rounded-2xl bg-white border border-border/60 shadow-card p-5 sm:p-6">
      <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-5">
        {t("winProbability")}
      </h3>

      {/* 이름 + 퍼센트 */}
      <div className="flex items-end justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">
            {t("koName")}
          </span>
          <span className="text-lg font-black text-primary tabular-nums">
            {koProb}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-blue-600 tabular-nums">
            {opProb}%
          </span>
          <span className="text-sm font-bold text-foreground">
            {opponent.name[lang]}
          </span>
        </div>
      </div>

      {/* 바 */}
      <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
        <div
          className="h-full bg-linear-to-r from-primary to-red-400 transition-all duration-700 ease-out"
          style={{
            width: `${koProb}%`,
            borderRadius: opProb === 0 ? "9999px" : "9999px 0 0 9999px",
          }}
        />
        <div
          className="h-full bg-linear-to-r from-blue-400 to-blue-600 transition-all duration-700 ease-out"
          style={{
            width: `${opProb}%`,
            borderRadius: koProb === 0 ? "9999px" : "0 9999px 9999px 0",
          }}
        />
      </div>
    </div>
  );
}
