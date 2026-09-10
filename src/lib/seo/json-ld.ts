import { getKstDaysUntil } from "@/lib/date-utils";
import { KO_PROFILE } from "@/lib/ko-stats";
import { SITE_ORIGIN, localeUrl } from "@/lib/seo/site-url";
import type { ConfirmedFight } from "@/types/prediction";
import type { UfcEvent } from "@/types/schedule";

const PERSON_ID = `${SITE_ORIGIN}/#person`;
const INSTAGRAM_URL = "https://www.instagram.com/ko.seokhyeon/";

// Schema.org 노드는 키가 제각각이라 공통 타입을 두지 않고 느슨한 레코드로 다룬다
type JsonLdNode = Record<string, unknown>;

/**
 * @description 사이트 단위 WebSite 노드. 사이트 내 검색 기능이 없으므로 potentialAction은 넣지 않는다.
 * @param locale - "ko" | "en"
 * @returns WebSite JSON-LD 노드
 */
export const buildWebSiteJsonLd = (locale: string): JsonLdNode => ({
  "@type": "WebSite",
  "@id": `${SITE_ORIGIN}/#website`,
  name: "LET'S KO",
  url: localeUrl(locale, ""),
  inLanguage: locale === "ko" ? "ko-KR" : "en-US",
  about: { "@id": PERSON_ID },
});

/**
 * @description 고석현 Person 노드. url을 canonical과 같은 값으로 두어야 크롤러가 리다이렉트 URL을 따라가지 않는다.
 * @param locale - "ko" | "en"
 * @returns Person JSON-LD 노드
 */
export const buildPersonJsonLd = (locale: string): JsonLdNode => ({
  "@type": "Person",
  "@id": PERSON_ID,
  name: locale === "ko" ? "고석현" : "Ko Seokhyeon",
  alternateName:
    locale === "ko"
      ? ["Ko Seokhyeon", "The Korean Tyson", "코리안 타이슨"]
      : ["고석현", "The Korean Tyson", "코리안 타이슨"],
  description:
    locale === "ko"
      ? "UFC 웰터급 파이터. 유도/삼보 기반의 강력한 그래플링과 타격으로 활약 중."
      : "UFC welterweight fighter known for powerful grappling and striking rooted in judo and sambo.",
  birthDate: KO_PROFILE.birthDate,
  nationality: { "@type": "Country", name: "South Korea" },
  jobTitle: "UFC Fighter",
  affiliation: { "@type": "SportsTeam", name: "HAVAS MMA" },
  sport: "Mixed Martial Arts",
  height: KO_PROFILE.height,
  weight: KO_PROFILE.weight,
  image: `${SITE_ORIGIN}/og.png`,
  url: localeUrl(locale, ""),
  sameAs: [INSTAGRAM_URL],
});

/**
 * @description 홈 > 현재 페이지 2단계 BreadcrumbList. 실제로 리치 결과에 노출되는 유일한 타입이다.
 * @param locale - "ko" | "en"
 * @param name - 현재 페이지 이름
 * @param path - locale prefix 없는 경로 ("/schedule")
 * @returns BreadcrumbList JSON-LD 노드
 */
export const buildBreadcrumbJsonLd = (
  locale: string,
  name: string,
  path: string
): JsonLdNode => ({
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: locale === "ko" ? "홈" : "Home",
      item: localeUrl(locale, ""),
    },
    {
      "@type": "ListItem",
      position: 2,
      name,
      item: localeUrl(locale, path),
    },
  ],
});

/**
 * @description 고석현 확정 경기를 SportsEvent로 표현. 지난 경기를 EventScheduled로 남기면 스팸 신호라 null을 반환한다.
 * @param fight - 확정 경기 정보
 * @param locale - "ko" | "en"
 * @returns SportsEvent JSON-LD 노드, 이미 지난 경기면 null
 */
export const buildConfirmedFightJsonLd = (
  fight: ConfirmedFight,
  locale: string
): JsonLdNode | null => {
  const days = getKstDaysUntil(fight.date);
  if (days === null || days < 0) return null;

  const lang = locale === "ko" ? "ko" : "en";
  const koName = locale === "ko" ? "고석현" : "Ko Seokhyeon";
  const opponentName = fight.opponent.name[lang];

  return {
    "@type": "SportsEvent",
    "@id": `${localeUrl(locale, "/predictions")}#next-fight`,
    name: `${koName} vs ${opponentName} - ${fight.event}`,
    startDate: fight.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    sport: "Mixed Martial Arts",
    url: localeUrl(locale, "/predictions"),
    location: { "@type": "Place", name: fight.location[lang] },
    superEvent: { "@type": "SportsEvent", name: fight.event },
    organizer: {
      "@type": "Organization",
      name: "Ultimate Fighting Championship",
      alternateName: "UFC",
      url: "https://www.ufc.com",
    },
    competitor: [
      { "@id": PERSON_ID },
      {
        "@type": "Person",
        name: opponentName,
        ...(fight.opponent.country
          ? {
              nationality: { "@type": "Country", name: fight.opponent.country },
            }
          : {}),
        ...(fight.opponent.imageUrl ? { image: fight.opponent.imageUrl } : {}),
      },
    ],
  };
};

/**
 * @description 예정 UFC 이벤트 목록을 ItemList of SportsEvent로 표현. 지난 이벤트는 제외한다.
 * @param events - 크롤된 UFC 이벤트 배열
 * @param locale - "ko" | "en"
 * @returns ItemList JSON-LD 노드, 대상 이벤트가 없으면 null
 */
export const buildScheduleJsonLd = (
  events: UfcEvent[],
  locale: string
): JsonLdNode | null => {
  const lang = locale === "ko" ? "ko" : "en";
  const upcoming = events.filter((e) => {
    const days = getKstDaysUntil(e.date);
    return days !== null && days >= 0;
  });
  if (upcoming.length === 0) return null;

  return {
    "@type": "ItemList",
    name: locale === "ko" ? "예정된 UFC 이벤트" : "Upcoming UFC Events",
    itemListElement: upcoming.map((event, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "SportsEvent",
        name: event.name,
        startDate: event.cardTimes?.main ?? event.date,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        sport: "Mixed Martial Arts",
        url: localeUrl(locale, "/schedule"),
        location: {
          "@type": "Place",
          name: event.venue || event.location[lang],
        },
        organizer: {
          "@type": "Organization",
          name: "Ultimate Fighting Championship",
          alternateName: "UFC",
          url: "https://www.ufc.com",
        },
      },
    })),
  };
};
