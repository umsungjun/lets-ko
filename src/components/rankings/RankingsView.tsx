"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

import { useInView } from "@/hooks/useInView";
import type { UfcRankings } from "@/types/rankings";

import DivisionCard from "./DivisionCard";
import P4PList from "./P4PList";

type TabId = "mens" | "womens" | "p4p";

interface RankingsViewProps {
  rankings: UfcRankings;
  locale: string;
}

export default function RankingsView({ rankings, locale }: RankingsViewProps) {
  const t = useTranslations("rankings");
  const { ref, isInView } = useInView(0.1);
  const [activeTab, setActiveTab] = useState<TabId>("mens");

  const mensDivisions = rankings.divisions.filter(
    (d) => !d.divisionName.startsWith("여성")
  );
  const womensDivisions = rankings.divisions.filter((d) =>
    d.divisionName.startsWith("여성")
  );

  const tabs: { id: TabId; label: string }[] = [
    { id: "mens", label: t("mensDivisions") },
    { id: "womens", label: t("womensDivisions") },
    { id: "p4p", label: t("p4p") },
  ];

  return (
    <div ref={ref}>
      <h1
        className="section-heading section-heading-center mb-10 text-center"
        style={{
          opacity: isInView ? 1 : 0,
          transform: isInView ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        {t("title")}
      </h1>

      {/* Tabs */}
      <div
        className="mb-8 flex justify-center"
        style={{
          opacity: isInView ? 1 : 0,
          transform: isInView ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s",
        }}
      >
        <div className="inline-flex gap-1 rounded-2xl border border-border bg-surface p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`cursor-pointer rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-[0_2px_8px_rgba(220,38,38,0.3)]"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          opacity: isInView ? 1 : 0,
          transform: isInView ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.5s ease 0.15s, transform 0.5s ease 0.15s",
        }}
      >
        {activeTab === "p4p" && (
          <P4PList
            men={rankings.poundForPoundMen}
            women={rankings.poundForPoundWomen}
          />
        )}

        {activeTab === "mens" && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mensDivisions.map((division) => (
              <DivisionCard
                key={division.divisionSlug}
                division={division}
                locale={locale}
              />
            ))}
          </div>
        )}

        {activeTab === "womens" && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {womensDivisions.map((division) => (
              <DivisionCard
                key={division.divisionSlug}
                division={division}
                locale={locale}
              />
            ))}
          </div>
        )}
      </div>

      {/* Source */}
      <p className="mt-10 text-center text-xs text-muted/50">
        {t("source")}
      </p>
    </div>
  );
}
