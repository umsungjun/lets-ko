"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { useInView } from "@/hooks/useInView";
import type { DivisionRanking } from "@/types/rankings";

const WEIGHT_LIMITS: Record<string, string> = {
  flyweight: "56.7kg",
  bantamweight: "61.2kg",
  featherweight: "65.8kg",
  lightweight: "70.3kg",
  welterweight: "77.1kg",
  middleweight: "83.9kg",
  "light-heavyweight": "93.0kg",
  heavyweight: "120.2kg",
  "womens-strawweight": "52.2kg",
  "womens-flyweight": "56.7kg",
  "womens-bantamweight": "61.2kg",
};

interface ChampionsPreviewProps {
  divisions: DivisionRanking[];
  locale: string;
}

export default function ChampionsPreview({
  divisions,
  locale,
}: ChampionsPreviewProps) {
  const t = useTranslations("rankings");
  const { ref, isInView } = useInView(0.1);

  const mensDivisions = divisions.filter(
    (d) => !d.divisionName.startsWith("여성")
  );
  const womensDivisions = divisions.filter((d) =>
    d.divisionName.startsWith("여성")
  );

  return (
    <section className="px-4 py-20" ref={ref}>
      <div className="mx-auto max-w-5xl">
        <div
          className="mb-10 flex items-center justify-between"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <h2 className="section-heading">{t("championsTitle")}</h2>
          <Link
            href={`/${locale}/rankings`}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-muted transition-all duration-300 hover:border-primary/40 hover:text-primary"
          >
            {t("viewAll")}
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>

        {/* Men's Divisions */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {mensDivisions.map((division, index) => (
            <ChampionCard
              key={division.divisionSlug}
              division={division}
              locale={locale}
              isInView={isInView}
              index={index}
              variant="men"
            />
          ))}
        </div>

        {/* Women's Divisions */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          {womensDivisions.map((division, index) => (
            <ChampionCard
              key={division.divisionSlug}
              division={division}
              locale={locale}
              isInView={isInView}
              index={mensDivisions.length + index}
              variant="women"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ChampionCard({
  division,
  locale,
  isInView,
  index,
  variant,
}: {
  division: DivisionRanking;
  locale: string;
  isInView: boolean;
  index: number;
  variant: "men" | "women";
}) {
  const t = useTranslations("rankings");

  const displayName =
    locale === "en" ? division.divisionNameEn : division.divisionName;
  const weight = WEIGHT_LIMITS[division.divisionSlug];

  const glowClass =
    variant === "women"
      ? "bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.12),transparent_70%)]"
      : "bg-[radial-gradient(ellipse_at_top_right,rgba(220,38,38,0.12),transparent_70%)]";

  return (
    <Link
      href={`/${locale}/rankings`}
      className="group relative overflow-hidden rounded-2xl border border-border/60 shadow-card transition-all duration-500 hover:-translate-y-0.5 hover:shadow-card-hover"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.5s ease ${100 + index * 50}ms, transform 0.5s ease ${100 + index * 50}ms`,
      }}
    >
      {/* Background */}
      <div className="relative bg-linear-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className={`absolute inset-0 ${glowClass}`} />

        {/* Image */}
        <div className="relative flex items-end justify-center px-2 pt-4">
          {division.champion?.imageUrl ? (
            <img
              src={division.champion.imageUrl}
              alt={division.champion.name}
              className="h-20 w-auto object-cover drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-20 items-center justify-center">
              <span className="text-[10px] text-white/20 uppercase">
                {t("vacant")}
              </span>
            </div>
          )}
        </div>

        {/* Info overlay */}
        <div className="relative px-3 pb-3 pt-2">
          <p className="text-[10px] font-semibold tracking-wider text-white/35 uppercase">
            {displayName}
            {weight && (
              <span className="ml-1 font-normal text-white/20">{weight}</span>
            )}
          </p>
          {division.champion && (
            <p className="mt-0.5 truncate text-sm font-bold text-white transition-colors duration-300 group-hover:text-primary">
              {division.champion.name}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
