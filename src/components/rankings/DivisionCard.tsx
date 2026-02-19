"use client";

import { useTranslations } from "next-intl";

import type { DivisionRanking } from "@/types/rankings";

import RankChangeIndicator from "./RankChangeIndicator";

const WEIGHT_LIMITS: Record<string, string> = {
  flyweight: "~56.7kg",
  bantamweight: "~61.2kg",
  featherweight: "~65.8kg",
  lightweight: "~70.3kg",
  welterweight: "~77.1kg",
  middleweight: "~83.9kg",
  "light-heavyweight": "~93.0kg",
  heavyweight: "~120.2kg",
  "womens-strawweight": "~52.2kg",
  "womens-flyweight": "~56.7kg",
  "womens-bantamweight": "~61.2kg",
};

interface DivisionCardProps {
  division: DivisionRanking;
  locale: string;
}

export default function DivisionCard({ division, locale }: DivisionCardProps) {
  const t = useTranslations("rankings");

  const displayName =
    locale === "en" ? division.divisionNameEn : division.divisionName;
  const weight = WEIGHT_LIMITS[division.divisionSlug];

  return (
    <div className="group overflow-hidden rounded-2xl border border-border/80 bg-white shadow-card transition-all duration-500 hover:shadow-card-hover">
      {/* Champion Header */}
      <div className="relative overflow-hidden bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 p-5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(220,38,38,0.15),transparent_70%)]" />
        <div className="relative">
          <p className="mb-3 text-[11px] font-bold tracking-widest text-white/40 uppercase">
            {displayName}
            {weight && (
              <span className="ml-1.5 font-normal tracking-normal text-white/25">
                {weight}
              </span>
            )}
          </p>
          {division.champion ? (
            <div className="flex items-center gap-4">
              {division.champion.imageUrl && (
                <div className="relative shrink-0">
                  <img
                    src={division.champion.imageUrl}
                    alt={division.champion.name}
                    className="h-24 w-auto rounded-xl object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="min-w-0">
                <span className="inline-block rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-primary uppercase">
                  {t("champion")}
                </span>
                <p className="mt-1 truncate text-lg font-bold leading-tight text-white">
                  {division.champion.name}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm italic text-white/30">{t("vacant")}</p>
          )}
        </div>
      </div>

      {/* Ranked Fighters */}
      <div className="divide-y divide-border/40">
        {division.rankedFighters.map((fighter) => (
          <div
            key={`${fighter.rank}-${fighter.name}`}
            className="flex items-center gap-3 px-5 py-2.5 transition-colors duration-300 hover:bg-surface/60"
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                fighter.rank <= 3
                  ? "bg-primary/10 text-primary"
                  : "text-muted/60"
              }`}
            >
              {fighter.rank}
            </span>
            <span
              className={`flex-1 truncate text-sm ${
                fighter.rank <= 3
                  ? "font-semibold text-foreground"
                  : "font-medium text-foreground/80"
              }`}
            >
              {fighter.name}
            </span>
            <RankChangeIndicator
              change={fighter.rankChange}
              isNR={fighter.isNR}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
