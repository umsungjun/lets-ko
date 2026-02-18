"use client";

import { useTranslations } from "next-intl";

import type { P4PRanking } from "@/types/rankings";

import RankChangeIndicator from "./RankChangeIndicator";

interface P4PListProps {
  men: P4PRanking;
  women: P4PRanking;
}

function P4PCard({ title, data }: { title: string; data: P4PRanking }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="relative overflow-hidden bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 p-5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(220,38,38,0.15),transparent_70%)]" />
        <div className="relative">
          <p className="mb-3 text-[11px] font-bold tracking-widest text-white/40 uppercase">
            {title}
          </p>
          {data.topFighter && (
            <div className="flex items-center gap-4">
              {data.topFighter.imageUrl && (
                <img
                  src={data.topFighter.imageUrl}
                  alt={data.topFighter.name}
                  className="h-24 w-auto shrink-0 rounded-xl object-cover"
                  loading="lazy"
                />
              )}
              <div className="min-w-0">
                <span className="inline-block rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-primary uppercase">
                  #1
                </span>
                <p className="mt-1 truncate text-lg font-bold leading-tight text-white">
                  {data.topFighter.name}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="divide-y divide-border/40">
        {data.fighters.map((fighter) => (
          <div
            key={`${fighter.rank}-${fighter.name}`}
            className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface/60"
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

export default function P4PList({ men, women }: P4PListProps) {
  const t = useTranslations("rankings");

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <P4PCard title={t("p4pMen")} data={men} />
      <P4PCard title={t("p4pWomen")} data={women} />
    </div>
  );
}
