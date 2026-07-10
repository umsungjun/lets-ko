"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { formatEventDate, getKstDaysUntil } from "@/lib/date-utils";
import type { ConfirmedFight } from "@/types/prediction";

interface NextFightBannerProps {
  fight: ConfirmedFight;
  locale: string;
}

/**
 * @description 고석현 확정 경기가 있을 때 페이지 최상단에 노출하는 D-day 강조 배너.
 * 확정 사실을 한눈에 인지시키고 예측 페이지로 연결. 지난 경기(D-day 음수)면 렌더하지 않음.
 * @param props.fight - 확정 경기 정보
 * @param props.locale - "ko" | "en"
 */
export default function NextFightBanner({
  fight,
  locale,
}: NextFightBannerProps) {
  const t = useTranslations("predictions");
  const lang = locale === "ko" ? "ko" : "en";

  const days = getKstDaysUntil(fight.date);
  if (days === null || days < 0) return null;
  const dday = days === 0 ? "D-DAY" : `D-${days}`;

  return (
    <Link
      href={`/${locale}/predictions`}
      className="block bg-primary text-white hover:bg-primary-dark transition-colors"
    >
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center text-[13px] sm:text-sm">
        <span className="font-black tabular-nums bg-white/20 px-2 py-0.5 rounded">
          {dday}
        </span>
        <span className="font-bold">{t("nextFightLabel")}</span>
        <span className="opacity-95">
          {t("koName")} {t("vs")} {fight.opponent.name[lang]}
        </span>
        <span className="opacity-60 hidden sm:inline">·</span>
        <span className="opacity-85 hidden sm:inline">{fight.event}</span>
        <span className="opacity-75">
          · {formatEventDate(fight.date, locale) || fight.date}
        </span>
        <svg
          className="w-3.5 h-3.5 shrink-0"
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
      </div>
    </Link>
  );
}
