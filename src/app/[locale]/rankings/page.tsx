import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import JsonLd from "@/components/common/JsonLd";
import RankingsView from "@/components/rankings/RankingsView";
import { getRankings } from "@/lib/data/rankings";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";

  return buildPageMetadata({
    locale,
    path: "/rankings",
    title: isKo ? "UFC 공식 랭킹" : "Official UFC Rankings",
    description: isKo
      ? "UFC 전 체급 공식 랭킹. 챔피언, 파운드 포 파운드, 체급별 1~15위 파이터 순위를 확인하세요."
      : "Official UFC rankings across all divisions. View champions, pound-for-pound, and ranked fighters 1-15.",
  });
}

export default async function RankingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const rankings = await getRankings();

  return (
    <section className="py-12 px-4">
      <JsonLd
        data={buildBreadcrumbJsonLd(
          locale,
          locale === "ko" ? "UFC 공식 랭킹" : "Official UFC Rankings",
          "/rankings"
        )}
      />
      <div className="mx-auto max-w-5xl">
        <RankingsView rankings={rankings} locale={locale} />
      </div>
    </section>
  );
}
