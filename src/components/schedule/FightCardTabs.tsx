"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

import {
  formatKstCardTime,
  formatWeightClass,
  isTbaMatchup,
} from "@/lib/schedule-utils";
import type {
  UfcCardTimes,
  UfcEventFight,
  UfcFightCard,
} from "@/types/schedule";

interface FightCardTabsProps {
  fightCard: UfcFightCard;
  locale: string;
  /** 카드별 시작 시각 (KST 표시용). 데이터 없으면 시각 미노출 */
  cardTimes?: UfcCardTimes;
}

type CardKey = "mainCard" | "prelimCard" | "earlyPrelimCard";

function FighterAvatar({
  imageUrl,
  name,
}: {
  imageUrl?: string;
  name: string;
}) {
  if (imageUrl && !imageUrl.includes("placeholder")) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="w-full h-full object-cover object-top"
        loading="lazy"
      />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-white/5">
      <svg
        className="w-6 h-6 text-white/20"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
}

function FightRow({
  fight,
  lang,
}: {
  fight: UfcEventFight;
  lang: "ko" | "en";
}) {
  const { fighter1, fighter2 } = fight;
  const isTba = isTbaMatchup(fighter1.name, fighter2.name);
  const weightLabel = formatWeightClass(fight.weightClass, lang);

  return (
    <div className="px-4 sm:px-5 py-4 hover:bg-white/2 transition-colors">
      {/* 상단 메타: 체급 chip (타이틀 매치 헤더 칩 스타일 차용) */}
      {weightLabel && (
        <div className="flex items-center mb-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/80 text-[10px] font-bold border border-white/15">
            {weightLabel}
          </span>
        </div>
      )}

      {/* 파이터 매치업 — 타이틀 매치와 동일한 좌우 대칭 레이아웃 */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* 파이터 1 */}
        <div className="flex-1 flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden ring-1 ring-white/10">
            <FighterAvatar imageUrl={fighter1.imageUrl} name={fighter1.name} />
          </div>
          <p className="text-[13px] sm:text-sm font-bold text-white leading-tight truncate">
            {fighter1.name}
          </p>
        </div>

        {/* VS (타이틀 매치 VS 스타일) */}
        <span className="shrink-0 text-sm sm:text-base font-black text-white/20 px-1">
          {isTba ? "—" : "VS"}
        </span>

        {/* 파이터 2 */}
        <div className="flex-1 flex items-center gap-2.5 flex-row-reverse min-w-0">
          <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden ring-1 ring-white/10">
            <FighterAvatar imageUrl={fighter2.imageUrl} name={fighter2.name} />
          </div>
          <p className="text-[13px] sm:text-sm font-bold text-white leading-tight truncate text-right">
            {fighter2.name}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * @description 이벤트의 전체 fight card를 메인/예선/초기 예선 탭으로 표시.
 * 메인 카드의 첫 경기(메인 이벤트)는 상위 EventCard/SchedulePreview에서 AI 예측과 함께
 * 강조 표시되므로 제거하고 나머지 경기만 노출. 데이터가 있는 카드 섹션만 탭 버튼 노출.
 *
 * 디자인: 상위 타이틀 매치 헤더와 동일한 다크 그라데이션 배경·pill 칩·primary red 액센트
 * 패턴 차용하여 시각적 통일감 확보.
 * @param fightCard - 크롤러에서 가져온 카드별 매치업 데이터
 * @param locale - "ko" | "en"
 */
export default function FightCardTabs({
  fightCard,
  locale,
  cardTimes,
}: FightCardTabsProps) {
  const t = useTranslations("schedule");
  const lang = locale === "ko" ? "ko" : "en";

  // 메인 이벤트 중복 제거 — mainCard[0]은 이미 상위 카드에서 AI 예측과 함께 노출
  const mainCardWithoutHeadliner = fightCard.mainCard.slice(1);

  type Tab = {
    key: CardKey;
    label: string;
    fights: UfcEventFight[];
    /** KST 표시용 카드 시작 시각 (ISO UTC) */
    startTime?: string;
  };
  const allTabs: Tab[] = [
    {
      key: "mainCard",
      label: t("mainCard"),
      fights: mainCardWithoutHeadliner,
      startTime: cardTimes?.main,
    },
    {
      key: "prelimCard",
      label: t("prelimCard"),
      fights: fightCard.prelimCard,
      startTime: cardTimes?.prelim,
    },
  ];
  if (fightCard.earlyPrelimCard && fightCard.earlyPrelimCard.length > 0) {
    allTabs.push({
      key: "earlyPrelimCard",
      label: t("earlyPrelimCard"),
      fights: fightCard.earlyPrelimCard,
      startTime: cardTimes?.earlyPrelim,
    });
  }
  const tabs = allTabs.filter((tab) => tab.fights.length > 0);

  const [activeTab, setActiveTab] = useState<CardKey>(
    tabs[0]?.key ?? "mainCard"
  );

  if (tabs.length === 0) return null;

  const activeTabData = tabs.find((tab) => tab.key === activeTab);
  const activeFights = activeTabData?.fights ?? [];
  const activeStartKst = formatKstCardTime(activeTabData?.startTime, lang);

  return (
    <div className="bg-linear-to-br from-gray-900 via-gray-850 to-gray-900 border-t border-white/6">
      {/* 탭 헤더 — 타이틀 매치 date chip과 동일한 primary red 액센트 사용 */}
      <div
        role="tablist"
        aria-label={t("mainCard")}
        className="px-4 sm:px-5 pt-4 pb-3 flex items-center gap-2 flex-wrap"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`fight-card-tab-${tab.key}`}
            aria-selected={activeTab === tab.key}
            aria-controls={`fight-card-panel-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all cursor-pointer border ${
              activeTab === tab.key
                ? "bg-primary/20 text-primary border-primary/30 shadow-sm shadow-primary/5"
                : "bg-white/5 text-white/50 hover:text-white/80 border-white/10 hover:border-white/20"
            }`}
          >
            {tab.label}
            <span
              className={`text-[10px] font-semibold tabular-nums ${activeTab === tab.key ? "text-primary/60" : "text-white/30"}`}
            >
              {tab.fights.length}
            </span>
          </button>
        ))}
      </div>

      {/* 활성 탭 KST 시작 시각 — 데이터 있을 때만 노출 */}
      {activeStartKst && (
        <div className="px-4 sm:px-5 pb-3 -mt-1 flex items-center gap-1.5 text-[11px] text-white/45">
          <svg
            className="w-3 h-3 text-white/35"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" strokeLinecap="round" />
          </svg>
          <span className="tabular-nums">
            {t("startKst")} {activeStartKst}
          </span>
        </div>
      )}

      {/* 활성 탭 fight 리스트 */}
      <div
        role="tabpanel"
        id={`fight-card-panel-${activeTab}`}
        aria-labelledby={`fight-card-tab-${activeTab}`}
        className="divide-y divide-white/4"
      >
        {activeFights.map((fight, i) => (
          <FightRow key={`${activeTab}-${i}`} fight={fight} lang={lang} />
        ))}
      </div>
    </div>
  );
}
