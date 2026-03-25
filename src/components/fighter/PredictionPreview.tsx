"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { useInView } from "@/hooks/useInView";
import type { PredictionData } from "@/types/prediction";

interface PredictionPreviewProps {
  predictions: PredictionData;
  locale: string;
}

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

export default function PredictionPreview({
  predictions,
  locale,
}: PredictionPreviewProps) {
  const t = useTranslations("predictions");
  const { ref, isInView } = useInView(0.1);
  const lang = locale === "ko" ? "ko" : "en";

  // 확정된 경기가 있으면 확정 정보를 표시
  if (predictions.confirmedFight) {
    const fight = predictions.confirmedFight;
    return (
      <section className="py-20 px-4 bg-surface" ref={ref}>
        <div className="max-w-5xl mx-auto">
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
          <div
            className="max-w-md mx-auto p-6 rounded-2xl bg-white border border-border shadow-card text-center"
            style={{
              opacity: isInView ? 1 : 0,
              transform: isInView ? "translateY(0)" : "translateY(16px)",
              transition:
                "opacity 0.5s ease 150ms, transform 0.5s ease 150ms",
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
              <span className="text-xl font-black text-primary">
                {t("vs")}
              </span>
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
              <strong>{t("confirmedLocation")}:</strong>{" "}
              {fight.location[lang]}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // 최근 경기 후 2달 미만이면 준비 중 메시지
  if (predictions.opponents.length === 0 && predictions.lastFightDate) {
    return (
      <section className="py-20 px-4 bg-surface" ref={ref}>
        <div className="max-w-5xl mx-auto">
          <div
            className="text-center"
            style={{
              opacity: isInView ? 1 : 0,
              transform: isInView ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-linear-to-r from-violet-600 to-blue-500 text-white text-[11px] font-bold tracking-wide">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                AI PREDICTION
              </span>
            </div>
            <h2 className="section-heading section-heading-center text-center">
              {t("title")}
            </h2>
            <div className="max-w-md mx-auto mt-8 p-6 rounded-2xl bg-white border border-border shadow-card">
              <p className="text-lg font-bold text-foreground mb-2">
                {t("preparing")}
              </p>
              <p className="text-sm text-muted">{t("preparingDesc")}</p>
              <p className="text-xs text-muted/60 mt-3">
                {t("lastFight", { date: predictions.lastFightDate })}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 예측 후보 없으면 렌더링 안 함
  if (predictions.opponents.length === 0) return null;

  return (
    <section className="py-20 px-4 bg-surface" ref={ref}>
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div
          className="text-center mb-10"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-linear-to-r from-violet-600 to-blue-500 text-white text-[11px] font-bold tracking-wide">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              AI PREDICTION
            </span>
          </div>
          <h2 className="section-heading section-heading-center text-center">
            {t("title")}
          </h2>
          <p className="text-xs text-muted mt-4">{t("poweredBy")}</p>
          <p className="text-[11px] text-muted/50 mt-0.5">
            {t("updatedAt", {
              date: new Date(predictions.generatedAt).toLocaleDateString(
                locale === "ko" ? "ko-KR" : "en-US",
                { year: "numeric", month: "long", day: "numeric" }
              ),
            })}
          </p>
        </div>

        {/* 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {predictions.opponents.map((opponent, index) => (
            <Link
              key={index}
              href={`/${locale}/predictions`}
              className="group relative p-5 sm:p-6 rounded-2xl bg-white border border-border/60 shadow-card hover:shadow-card-hover hover:border-primary/20 transition-all duration-500 cursor-pointer overflow-hidden"
              style={{
                opacity: isInView ? 1 : 0,
                transform: isInView ? "translateY(0)" : "translateY(16px)",
                transition: `opacity 0.5s ease ${150 + index * 100}ms, transform 0.5s ease ${150 + index * 100}ms`,
              }}
            >
              {/* 배경 그라데이션 호버 효과 */}
              <div className="absolute inset-0 bg-linear-to-b from-primary/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative flex flex-col items-center text-center">
                {/* 순위 배지 */}
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-foreground text-white text-[11px] font-black mb-4">
                  #{index + 1}
                </span>

                {/* 프로필 이미지 */}
                <div className="w-20 h-20 rounded-full bg-gray-50 overflow-hidden mb-3 ring-2 ring-border/50 group-hover:ring-primary/30 transition-all duration-500">
                  {opponent.imageUrl &&
                  !opponent.imageUrl.includes("placeholder") ? (
                    <img
                      src={opponent.imageUrl}
                      alt={opponent.name[lang]}
                      className="w-full h-full object-cover object-top"
                      loading="lazy"
                    />
                  ) : (
                    <FighterPlaceholder />
                  )}
                </div>

                {/* 이름 */}
                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors duration-300 text-[15px]">
                  {opponent.name[lang]}
                </h3>

                {/* 국적 + 랭킹 */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[11px] text-muted font-medium">
                    {opponent.country}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-[11px] font-semibold text-primary/70">
                    #{opponent.fightMatrixRank}
                  </span>
                </div>

                {/* 스타일 태그 */}
                <span className="mt-3 text-[11px] font-medium text-violet-600/80 bg-violet-50 px-2.5 py-1 rounded-lg">
                  {opponent.fightingStyle[lang]}
                </span>

                {/* 전적 */}
                <p className="mt-2 text-xs text-muted tabular-nums">
                  {opponent.record.wins}W - {opponent.record.losses}L -{" "}
                  {opponent.record.draws}D
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* 하단 CTA */}
        <div
          className="text-center mt-8"
          style={{
            opacity: isInView ? 1 : 0,
            transition: "opacity 0.5s ease 500ms",
          }}
        >
          <Link
            href={`/${locale}/predictions`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-foreground text-white hover:bg-foreground/90 transition-all duration-300 text-sm font-semibold shadow-lg shadow-foreground/10"
          >
            {t("viewDetail")}
            <svg
              className="w-3.5 h-3.5"
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
          </Link>
          <p className="text-[11px] text-muted/40 mt-4">{t("disclaimer")}</p>
        </div>
      </div>
    </section>
  );
}
