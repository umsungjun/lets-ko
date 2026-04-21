import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import ScheduleView from "@/components/schedule/ScheduleView";
import cachedSchedule from "@/data/cached-schedule.json";
import { enrichFighterImages } from "@/lib/crawl/schedule-crawler";
import type { UfcSchedule } from "@/types/schedule";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://lets-ko.vercel.app";
  const origin = new URL(siteUrl).origin;

  const title = isKo ? "UFC 경기 일정" : "UFC Fight Schedule";
  const description = isKo
    ? "예정된 UFC 이벤트 일정과 AI 메인 이벤트 승부 예측. Gemini AI가 분석한 각 이벤트 메인 매치 승자 예측과 경기 분석을 확인하세요."
    : "Upcoming UFC event schedule with AI main event predictions. Check Gemini AI-powered fight analysis and predicted winners for each UFC main event.";

  return {
    title,
    description,
    alternates: {
      canonical: locale === "ko" ? "/schedule" : `/${locale}/schedule`,
      languages: {
        ko: "/schedule",
        en: "/en/schedule",
        "x-default": "/schedule",
      },
    },
    openGraph: {
      title,
      description,
      url:
        locale === "ko" ? `${origin}/schedule` : `${origin}/${locale}/schedule`,
      siteName: "LET'S KO",
      locale: isKo ? "ko_KR" : "en_US",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og.png`],
    },
  };
}

async function getSchedule(): Promise<UfcSchedule> {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const { createServerClient } = await import("@/lib/supabase/server");
      const supabase = createServerClient();
      const { data } = await supabase
        .from("ufc_schedule")
        .select("data")
        .order("crawled_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.data) {
        const schedule = data.data as UfcSchedule;
        if (schedule.events?.length > 0) {
          // 이미지 없는 파이터 보완 (크론 실패 또는 구형 데이터 대비)
          const enriched = await enrichFighterImages(schedule.events);
          return { ...schedule, events: enriched };
        }
      }
    } catch {
      // Fall through to cached data
    }
  }

  const base = cachedSchedule as UfcSchedule;
  const enriched = await enrichFighterImages(base.events);
  return { ...base, events: enriched };
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
