"use client";

import { useTranslations } from "next-intl";

import { useInView } from "@/hooks/useInView";
import type { FighterStats } from "@/types/fighter";

interface StatsCardProps {
  stats: FighterStats;
}

function StatCircle({
  value,
  label,
  delay,
  animate,
}: {
  value: number;
  label: string;
  delay: number;
  animate: boolean;
}) {
  const circumference = 2 * Math.PI * 40;
  const offset = animate
    ? circumference - (value / 100) * circumference
    : circumference;

  return (
    <div
      className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white border border-border shadow-card hover:shadow-card-hover transition-shadow"
      style={{
        opacity: animate ? 1 : 0,
        transform: animate ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 88 88">
          <circle
            cx="44"
            cy="44"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-surface"
          />
          <circle
            cx="44"
            cy="44"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="text-primary"
            style={{
              transition: `stroke-dashoffset 1s ease ${delay + 200}ms`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-black text-foreground">{value}%</span>
        </div>
      </div>
      <p className="text-xs font-medium text-muted text-center">{label}</p>
    </div>
  );
}

function RecordBox({
  value,
  label,
  color,
  delay,
  animate,
}: {
  value: number;
  label: string;
  color: string;
  delay: number;
  animate: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center p-5 rounded-2xl bg-white border border-border shadow-card hover:shadow-card-hover transition-shadow"
      style={{
        opacity: animate ? 1 : 0,
        transform: animate ? "scale(1)" : "scale(0.9)",
        transition: `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`,
      }}
    >
      <p className={`text-5xl font-black ${color}`}>{value}</p>
      <p className="text-sm font-medium text-muted mt-1">{label}</p>
    </div>
  );
}

export default function StatsCard({ stats }: StatsCardProps) {
  const t = useTranslations("stats");
  const { wins, losses, draws } = stats.record;
  const { ref, isInView } = useInView(0.1);

  return (
    <section className="py-16 px-4" ref={ref}>
      <div className="max-w-5xl mx-auto space-y-12">
        {stats.externalRankings && stats.externalRankings.length > 0 && (
          <div>
            <h2
              className="section-heading section-heading-center text-center mb-8"
              style={{
                opacity: isInView ? 1 : 0,
                transform: isInView ? "translateY(0)" : "translateY(16px)",
                transition: "opacity 0.5s ease, transform 0.5s ease",
              }}
            >
              {t("currentRanking")}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {stats.externalRankings.map((ranking, i) => (
                <a
                  key={ranking.site}
                  href={ranking.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative flex flex-col items-center p-5 rounded-2xl bg-white border border-border shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all group"
                  style={{
                    opacity: isInView ? 1 : 0,
                    transform: isInView ? "translateY(0)" : "translateY(16px)",
                    transition: `opacity 0.5s ease ${i * 100}ms, transform 0.5s ease ${i * 100}ms`,
                  }}
                >
                  <svg
                    className="absolute top-3 right-3 w-4 h-4 text-muted group-hover:text-primary transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  <div className="flex items-center gap-1.5 mb-1">
                    {ranking.icon ? (
                      <img
                        src={ranking.icon}
                        alt={`${ranking.site} icon`}
                        className="w-4 h-4"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : ranking.site === "Tapology" ? (
                      <svg className="w-4 h-4 text-muted" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="2" y="2" width="4" height="12" rx="1"/>
                        <rect x="7.5" y="2" width="4" height="12" rx="1"/>
                        <rect x="13" y="2" width="4" height="12" rx="1"/>
                        <rect x="18.5" y="2" width="4" height="12" rx="1"/>
                        <rect x="2" y="16" width="9" height="6" rx="1"/>
                        <rect x="13" y="16" width="9" height="6" rx="1"/>
                      </svg>
                    ) : (
                      <span className="w-4 h-4 flex items-center justify-center text-[10px] font-bold text-muted bg-gray-100 rounded">
                        {ranking.site.charAt(0)}
                      </span>
                    )}
                    <p className="text-xs font-medium text-muted">{ranking.site}</p>
                  </div>
                  <p className="text-4xl font-black text-primary">#{ranking.rank}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2
            className="section-heading section-heading-center text-center mb-12"
            style={{
              opacity: isInView ? 1 : 0,
              transform: isInView ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
            }}
          >
            {t("title")}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <RecordBox
              value={wins}
              label={t("wins")}
              color="text-win"
              delay={0}
              animate={isInView}
            />
            <RecordBox
              value={losses}
              label={t("losses")}
              color="text-loss"
              delay={100}
              animate={isInView}
            />
            <RecordBox
              value={draws}
              label={t("draws")}
              color="text-muted"
              delay={200}
              animate={isInView}
            />
            <RecordBox
              value={stats.knockouts}
              label={t("knockouts")}
              color="text-primary"
              delay={300}
              animate={isInView}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.strikeAccuracy > 0 && (
              <StatCircle
                value={stats.strikeAccuracy}
                label={t("strikeAccuracy")}
                delay={400}
                animate={isInView}
              />
            )}
            {stats.takedownAccuracy > 0 && (
              <StatCircle
                value={stats.takedownAccuracy}
                label={t("takedownAccuracy")}
                delay={500}
                animate={isInView}
              />
            )}
            {stats.strikeDefense > 0 && (
              <StatCircle
                value={stats.strikeDefense}
                label={t("strikeDefense")}
                delay={600}
                animate={isInView}
              />
            )}
            {stats.takedownDefense > 0 && (
              <StatCircle
                value={stats.takedownDefense}
                label={t("takedownDefense")}
                delay={700}
                animate={isInView}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
