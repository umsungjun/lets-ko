"use client";

import { useTranslations } from "next-intl";

import { useInView } from "@/hooks/useInView";
import type { FightHistoryEntry } from "@/types/fighter";

interface FightRecordProps {
  fights: FightHistoryEntry[];
}

export default function FightRecord({ fights }: FightRecordProps) {
  const t = useTranslations("fightRecord");
  const { ref, isInView } = useInView(0.1);

  if (fights.length === 0) return null;

  return (
    <section className="py-16 px-4" ref={ref}>
      <div className="max-w-5xl mx-auto">
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

        <div
          className="rounded-2xl border border-border bg-white shadow-card overflow-hidden"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="py-3.5 px-4 font-semibold text-muted text-left text-xs uppercase tracking-wider">
                    {t("result")}
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-muted text-left text-xs uppercase tracking-wider">
                    {t("opponent")}
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-muted text-left text-xs uppercase tracking-wider hidden sm:table-cell">
                    {t("event")}
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-muted text-left text-xs uppercase tracking-wider">
                    {t("method")}
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-muted text-left text-xs uppercase tracking-wider hidden sm:table-cell">
                    {t("round")}
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-muted text-left text-xs uppercase tracking-wider hidden md:table-cell">
                    {t("date")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {fights.map((fight, index) => (
                  <tr
                    key={index}
                    className="hover:bg-surface/50 transition-colors"
                    style={{
                      opacity: isInView ? 1 : 0,
                      transition: `opacity 0.4s ease ${300 + index * 80}ms`,
                    }}
                  >
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold text-white ${
                          fight.result === "win" ? "bg-win" : "bg-loss"
                        }`}
                      >
                        {fight.result === "win" ? t("win") : t("loss")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {fight.opponent}
                    </td>
                    <td className="py-3.5 px-4 text-muted hidden sm:table-cell">
                      {fight.event}
                    </td>
                    <td className="py-3.5 px-4 text-muted">{fight.method}</td>
                    <td className="py-3.5 px-4 text-muted hidden sm:table-cell font-mono text-xs">
                      R{fight.round} {fight.time}
                    </td>
                    <td className="py-3.5 px-4 text-muted hidden md:table-cell">
                      {fight.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
