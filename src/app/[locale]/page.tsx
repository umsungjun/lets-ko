import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import CareerTimeline from "@/components/fighter/CareerTimeline";
import FightRecord from "@/components/fighter/FightRecord";
import FighterProfile from "@/components/fighter/FighterProfile";
import NewsSection from "@/components/fighter/NewsSection";
import StatsCard from "@/components/fighter/StatsCard";
import VideoSection from "@/components/fighter/VideoSection";
import ChampionsPreview from "@/components/rankings/ChampionsPreview";
import cachedRankings from "@/data/cached-rankings.json";
import cachedStats from "@/data/cached-stats.json";
import careerHighlights from "@/data/career-highlights.json";
import fighterBio from "@/data/fighter-bio.json";
import { fetchNews } from "@/lib/news";
import { searchYouTubeVideos } from "@/lib/youtube";
import type {
  CareerHighlight,
  FighterBio,
  FighterStats,
} from "@/types/fighter";
import type { UfcRankings } from "@/types/rankings";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  return {
    title: isKo
      ? "고석현 - UFC 웰터급 파이터"
      : "Ko Seokhyeon - UFC Welterweight Fighter",
    description: isKo
      ? "UFC 웰터급 파이터 고석현(The Korean Tyson) 선수의 전적, 경기 기록, 하이라이트 영상, 뉴스, 응원 메시지. 13승 2패, 6연승 행진 중!"
      : "UFC welterweight fighter Ko Seokhyeon (The Korean Tyson) - fight record, career highlights, videos, news, and fan messages. 13-2, on a 6-fight win streak!",
    alternates: {
      canonical: `/${locale}`,
      languages: { ko: "/ko", en: "/en" },
    },
  };
}

async function getFighterStats(): Promise<FighterStats> {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const { createServerClient } = await import("@/lib/supabase/server");
      const supabase = createServerClient();
      const { data } = await supabase
        .from("fighter_stats")
        .select("data")
        .order("crawled_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.data) {
        const stats = data.data as FighterStats;
        // Reject invalid data (e.g. 0-0-0 from failed crawl)
        if (stats.record.wins + stats.record.losses + stats.record.draws > 0) {
          // externalRankings가 없으면 캐시에서 보완 (크론 실행 전)
          if (!stats.externalRankings?.length) {
            stats.externalRankings = (cachedStats as FighterStats).externalRankings;
          }
          return stats;
        }
      }
    } catch {
      // Fall through to cached data
    }
  }

  return cachedStats as FighterStats;
}

async function getRankings(): Promise<UfcRankings> {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const { createServerClient } = await import("@/lib/supabase/server");
      const supabase = createServerClient();
      const { data } = await supabase
        .from("ufc_rankings")
        .select("data")
        .order("crawled_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.data) {
        const rankings = data.data as UfcRankings;
        if (rankings.divisions && rankings.divisions.length >= 6) {
          return rankings;
        }
      }
    } catch {
      // Fall through to cached data
    }
  }

  return cachedRankings as UfcRankings;
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("guestbook");
  const [stats, videosByDate, videosByViews, news, rankings] =
    await Promise.all([
      getFighterStats(),
      searchYouTubeVideos("date"),
      searchYouTubeVideos("viewCount"),
      fetchNews(),
      getRankings(),
    ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "고석현",
    alternateName: ["Ko Seokhyeon", "The Korean Tyson", "코리안 타이슨"],
    description:
      locale === "ko"
        ? "UFC 웰터급 파이터. 유도/삼보 기반의 강력한 그래플링과 타격으로 활약 중."
        : "UFC welterweight fighter known for powerful grappling and striking rooted in judo and sambo.",
    birthDate: "1993-09-24",
    nationality: { "@type": "Country", name: "South Korea" },
    jobTitle: "UFC Fighter",
    affiliation: { "@type": "SportsTeam", name: "HAVAS MMA" },
    sport: "Mixed Martial Arts",
    url:
      (process.env.NEXT_PUBLIC_SITE_URL || "https://lets-ko.vercel.app") +
      `/${locale}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FighterProfile
        bio={fighterBio as FighterBio}
        stats={stats}
        locale={locale}
      />
      <StatsCard stats={stats} />
      <CareerTimeline
        highlights={careerHighlights as CareerHighlight[]}
        locale={locale}
      />
      <FightRecord fights={stats.fightHistory} />
      <VideoSection videosByDate={videosByDate} videosByViews={videosByViews} />
      <NewsSection articles={news} locale={locale} />
      <ChampionsPreview
        divisions={rankings.divisions}
        locale={locale}
      />

      {/* CTA to Guestbook */}
      <section className="py-16 px-4 bg-surface">
        <div className="max-w-lg mx-auto text-center">
          <div className="p-8 rounded-3xl bg-linear-to-br from-primary-light to-white border border-primary/10">
            <p className="text-2xl font-black text-primary mb-4 tracking-tight">
              UFC
            </p>
            <p className="text-muted mb-6 text-sm">
              {locale === "ko"
                ? "고석현 선수에게 따뜻한 응원의 메시지를 남겨 주세요"
                : "Leave a warm cheer message for Ko Seokhyeon"}
            </p>
            <Link
              href={`/${locale}/cheer`}
              className="inline-block px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors shadow-card hover:shadow-card-hover"
            >
              {t("cheerCta")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
