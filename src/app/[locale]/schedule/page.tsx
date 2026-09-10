import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import ScheduleView from "@/components/schedule/ScheduleView";
import { getSchedule } from "@/lib/data/schedule";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  const title = isKo ? "UFC 경기 일정" : "UFC Fight Schedule";
  const description = isKo
    ? "예정된 UFC 이벤트 일정과 AI 메인 이벤트 승부 예측. Gemini AI가 분석한 각 이벤트 메인 매치 승자 예측과 경기 분석을 확인하세요."
    : "Upcoming UFC event schedule with AI main event predictions. Check Gemini AI-powered fight analysis and predicted winners for each UFC main event.";

  return buildPageMetadata({
    locale,
    path: "/schedule",
    title,
    description,
  });
}

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const schedule = await getSchedule();

  return <ScheduleView schedule={schedule} locale={locale} />;
}
