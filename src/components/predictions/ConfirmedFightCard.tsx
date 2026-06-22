"use client";

import { useTranslations } from "next-intl";

import { useInView } from "@/hooks/useInView";
import type { ConfirmedFight } from "@/types/prediction";

interface ConfirmedFightCardProps {
  fight: ConfirmedFight; // 확정된 다음 경기 정보
  locale: string; // "ko" | "en"
}

// 상대 이미지 없음/placeholder URL일 때 표시할 실루엣
function FighterPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <svg
        className="w-10 h-10 text-gray-300"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
}

/**
 * @description 확정된 다음 경기(고석현 vs 상대)를 카드로 표시. 메인 프리뷰·예측 상세 페이지 공용
 * @param props.fight - 확정 경기 정보 (상대/이벤트/날짜/장소)
 * @param props.locale - "ko" | "en"
 */
export default function ConfirmedFightCard({
  fight,
  locale,
}: ConfirmedFightCardProps) {
  const t = useTranslations("predictions");
  const { ref, isInView } = useInView(0.1);
  const lang = locale === "ko" ? "ko" : "en";

  return (
    <div ref={ref}>
      {/* 헤더 */}
      <div
        className="text-center mb-10"
        style={{
          opacity: isInView ? 1 : 0,
          transform: isInView ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-white text-xs font-bold mb-3">
          {t("confirmed")}
        </span>
        <h2 className="section-heading section-heading-center text-center">
          {t("koName")} {t("vs")} {fight.opponent.name[lang]}
        </h2>
      </div>

      {/* 매치업 카드 */}
      <div
        className="max-w-md mx-auto p-6 rounded-2xl bg-white border border-border shadow-card text-center"
        style={{
          opacity: isInView ? 1 : 0,
          transform: isInView ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.5s ease 150ms, transform 0.5s ease 150ms",
        }}
      >
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-primary/30">
            <img
              src="/images/ko-seokhyeon.png"
              alt={t("koName")}
              className="w-full h-full object-cover object-top"
            />
          </div>
          <span className="text-xl font-black text-primary">{t("vs")}</span>
          <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-blue-400/30 bg-gray-100">
            {fight.opponent.imageUrl &&
            !fight.opponent.imageUrl.includes("placeholder") ? (
              <img
                src={fight.opponent.imageUrl}
                alt={fight.opponent.name[lang]}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <FighterPlaceholder />
            )}
          </div>
        </div>
        <p className="text-sm text-muted">
          <strong>{t("confirmedEvent")}:</strong> {fight.event}
        </p>
        <p className="text-sm text-muted mt-1">
          <strong>{t("confirmedDate")}:</strong> {fight.date}
        </p>
        <p className="text-sm text-muted mt-1">
          <strong>{t("confirmedLocation")}:</strong> {fight.location[lang]}
        </p>
      </div>
    </div>
  );
}
