"use client";

import { useTranslations } from "next-intl";

interface WinProbabilityBarProps {
  /** 고석현 승률 (0-100) */
  koProbability: number;
  /** 상대 표시명 (로케일 반영된 값) */
  opponentName: string;
}

/**
 * @description 고석현 vs 상대 AI 승률을 좌우 색 바로 표시. 후보 예측·확정 경기 공용
 * @param props.koProbability - 고석현 승률 (0-100)
 * @param props.opponentName - 상대 표시명
 */
export default function WinProbabilityBar({
  koProbability,
  opponentName,
}: WinProbabilityBarProps) {
  const t = useTranslations("predictions");
  const koProb = koProbability;
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
            {opponentName}
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
