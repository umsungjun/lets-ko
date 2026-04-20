import { getTranslations } from "next-intl/server";

import type { UfcSchedule } from "@/types/schedule";

import EventCard from "./EventCard";

interface ScheduleViewProps {
  schedule: UfcSchedule;
  locale: string;
}

/**
 * @description UFC 경기 일정 목록 페이지의 서버 컴포넌트.
 * 오늘 이후 이벤트만 필터링하여 EventCard 목록으로 렌더링.
 * 업데이트 시각과 "Powered by Gemini AI" 배지 포함.
 * @param schedule - Supabase 또는 cached-schedule.json에서 로드된 일정 데이터
 * @param locale - 현재 언어 ("ko" | "en")
 */
export default async function ScheduleView({
  schedule,
  locale,
}: ScheduleViewProps) {
  const t = await getTranslations("schedule");

  const updatedDate = new Date(schedule.updatedAt).toLocaleDateString(
    locale === "ko" ? "ko-KR" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  // eventId로 예측 빠른 조회를 위한 맵
  const predictionMap = new Map(
    schedule.predictions.map((p) => [p.eventId, p])
  );

  return (
    <section className="py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-linear-to-r from-violet-600 to-blue-500 text-white text-[11px] font-bold tracking-wide">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              AI PREDICTION
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted mt-2">{t("subtitle")}</p>
          <div className="flex items-center gap-3 mt-3">
            <p className="text-xs text-muted/60">
              {t("updatedAt", { date: updatedDate })}
            </p>
            <span className="w-1 h-1 rounded-full bg-border" />
            <p className="text-xs text-muted/60">{t("poweredBy")}</p>
          </div>
        </div>

        {/* 이벤트 카드 그리드 */}
        {(() => {
          const today = new Date().toISOString().split("T")[0];
          const upcomingEvents = schedule.events.filter((e) => e.date >= today);
          return upcomingEvents.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted text-sm">{t("noEvents")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:gap-5">
              {upcomingEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  prediction={predictionMap.get(event.id)}
                  locale={locale}
                  index={index}
                />
              ))}
            </div>
          );
        })()}

        {/* 면책조항 */}
        <p className="text-[11px] text-muted/40 text-center mt-8">
          {t("disclaimer")}
        </p>
      </div>
    </section>
  );
}
