import type {
  UfcEvent,
  UfcEventFight,
  UfcEventFighter,
} from "@/types/schedule";

import * as cheerio from "cheerio";

import { scrapeUfcFighterImage } from "./ufc-image-scraper";

const CRAWLER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "application/json, text/html, */*",
};

// 주요 도시 한국어 지명 맵
const CITY_KO_MAP: Record<string, string> = {
  "Las Vegas": "라스베이거스",
  "New York": "뉴욕",
  "New York City": "뉴욕",
  London: "런던",
  Sydney: "시드니",
  Melbourne: "멜버른",
  "Abu Dhabi": "아부다비",
  Dubai: "두바이",
  "São Paulo": "상파울루",
  "Sao Paulo": "상파울루",
  Rio: "리우데자네이루",
  "Rio de Janeiro": "리우데자네이루",
  Singapore: "싱가포르",
  Seoul: "서울",
  Tokyo: "도쿄",
  Shanghai: "상하이",
  Beijing: "베이징",
  Bangkok: "방콕",
  Paris: "파리",
  Amsterdam: "암스테르담",
  "Saudi Arabia": "사우디아라비아",
  Riyadh: "리야드",
  Jeddah: "제다",
  Nashville: "내슈빌",
  Denver: "덴버",
  Houston: "휴스턴",
  Chicago: "시카고",
  Atlanta: "애틀랜타",
  Boston: "보스턴",
  Detroit: "디트로이트",
  "Los Angeles": "로스앤젤레스",
  Phoenix: "피닉스",
  Tampa: "탬파",
  Miami: "마이애미",
  Minneapolis: "미니애폴리스",
  Portland: "포틀랜드",
  Sacramento: "새크라멘토",
  "Salt Lake City": "솔트레이크시티",
  "San Antonio": "샌안토니오",
  "San Diego": "샌디에이고",
  "San Francisco": "샌프란시스코",
  Seattle: "시애틀",
  Washington: "워싱턴",
  "Kansas City": "캔자스시티",
  Newark: "뉴어크",
  Jacksonville: "잭슨빌",
  Cleveland: "클리블랜드",
  Pittsburgh: "피츠버그",
  Columbus: "콜럼버스",
  Charlotte: "샬럿",
  Indianapolis: "인디애나폴리스",
  Louisville: "루이빌",
  Memphis: "멤피스",
  "Fort Worth": "포트워스",
  "Oklahoma City": "오클라호마시티",
  Tulsa: "털사",
  "St. Louis": "세인트루이스",
  "New Orleans": "뉴올리언스",
  Raleigh: "롤리",
  Virginia: "버지니아",
  Orlando: "올랜도",
  Buffalo: "버팔오",
  Madison: "매디슨",
  Milwaukee: "밀워키",
  "Des Moines": "디모인",
  "Baton Rouge": "배턴루지",
  Albuquerque: "앨버커키",
  Anchorage: "앵커리지",
  Honolulu: "호놀룰루",
  "Fort Lauderdale": "포트로더데일",
  Inglewood: "잉글우드",
  Brooklyn: "브루클린",
  Uncasville: "언케이스빌",
  Sunrise: "선라이즈",
  Glendale: "글렌데일",
  Toronto: "토론토",
  Vancouver: "밴쿠버",
  Edmonton: "에드먼턴",
  Calgary: "캘거리",
  Ottawa: "오타와",
  Montreal: "몬트리올",
  "Mexico City": "멕시코시티",
  Guadalajara: "과달라하라",
  Monterrey: "몬테레이",
  "Buenos Aires": "부에노스아이레스",
  Bogota: "보고타",
  Lima: "리마",
  Santiago: "산티아고",
  Madrid: "마드리드",
  Barcelona: "바르셀로나",
  Rome: "로마",
  Berlin: "베를린",
  Stockholm: "스톡홀름",
  Manchester: "맨체스터",
  Birmingham: "버밍엄",
  Glasgow: "글래스고",
  Dublin: "더블린",
  Copenhagen: "코펜하겐",
  Oslo: "오슬로",
  Helsinki: "헬싱키",
  Warsaw: "바르샤바",
  Prague: "프라하",
  Vienna: "비엔나",
  Zurich: "취리히",
  Munich: "뮌헨",
  Frankfurt: "프랑크푸르트",
  Hamburg: "함부르크",
  Kyiv: "키이우",
  Moscow: "모스크바",
  "St. Petersburg": "상트페테르부르크",
  "Cape Town": "케이프타운",
  Johannesburg: "요하네스버그",
  Lagos: "라고스",
  Nairobi: "나이로비",
  Cairo: "카이로",
  Mumbai: "뭄바이",
  Delhi: "델리",
  Bangalore: "방갈로르",
  Chennai: "첸나이",
  Hyderabad: "하이데라바드",
  Kolkata: "콜카타",
  Karachi: "카라치",
  Lahore: "라호르",
  Dhaka: "다카",
  Colombo: "콜롬보",
  Kuala: "쿠알라룸푸르",
  "Kuala Lumpur": "쿠알라룸푸르",
  Jakarta: "자카르타",
  Manila: "마닐라",
  "Ho Chi Minh": "호치민",
  Hanoi: "하노이",
  Taipei: "타이베이",
  Osaka: "오사카",
  Nagoya: "나고야",
  Fukuoka: "후쿠오카",
  Sapporo: "삿포로",
  Busan: "부산",
  Incheon: "인천",
  Auckland: "오클랜드",
  Perth: "퍼스",
  Brisbane: "브리즈번",
};

/**
 * 영문 지명에서 도시명을 추출해 한국어로 변환
 */
function localizeCity(location: string): string {
  for (const [en, ko] of Object.entries(CITY_KO_MAP)) {
    if (location.includes(en)) {
      // 주(state) 등 나머지 텍스트 제거 후 한국어로 대체
      return location.replace(en, ko);
    }
  }
  return location;
}

// UFC CloudFront API 응답 타입
interface CloudFrontEvent {
  EventId: number;
  EventName: string;
  EventTitle?: string;
  StartTime?: string;
  EventLocation?: string;
  Venue?: string;
  MainCardFighters?: CloudFrontFighter[];
  MainCardBout?: {
    Fighter1?: CloudFrontFighter;
    Fighter2?: CloudFrontFighter;
    WeightClass?: string;
    TitleBout?: boolean;
  };
}

interface CloudFrontFighter {
  Name?: string;
  Record?: string;
  HeadshotUrl?: string;
}

/**
 * UFC CloudFront CDN API로 이벤트 목록 조회
 * 구조화된 JSON이므로 HTML 파싱 불필요
 */
async function fetchFromCloudFront(): Promise<UfcEvent[] | null> {
  const urls = [
    "https://d29dxerjsp82wz.cloudfront.net/api/v3/event/upcoming.json",
    "https://d29dxerjsp82wz.cloudfront.net/api/v3/event/live-results/upcoming.json",
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: CRAWLER_HEADERS,
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;

      const json = await res.json();
      const rawEvents: CloudFrontEvent[] = Array.isArray(json)
        ? json
        : (json.LiveResultsEvents ?? json.Events ?? []);

      if (!rawEvents.length) continue;

      const today = new Date().toISOString().split("T")[0];
      const events: UfcEvent[] = [];

      for (const raw of rawEvents) {
        const dateStr = raw.StartTime ? raw.StartTime.split("T")[0] : undefined;
        if (!dateStr || dateStr < today) continue;

        const eventName = raw.EventName || raw.EventTitle || "UFC Event";
        const id = eventName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const locationEn = raw.EventLocation || raw.Venue || "TBA";
        const locationKo = localizeCity(locationEn);

        // 메인 카드 파이터 추출
        let mainEvent: UfcEventFight | undefined;
        if (raw.MainCardBout?.Fighter1 && raw.MainCardBout?.Fighter2) {
          mainEvent = {
            fighter1: {
              name: raw.MainCardBout.Fighter1.Name || "TBA",
              record: raw.MainCardBout.Fighter1.Record,
              imageUrl: raw.MainCardBout.Fighter1.HeadshotUrl,
            },
            fighter2: {
              name: raw.MainCardBout.Fighter2.Name || "TBA",
              record: raw.MainCardBout.Fighter2.Record,
              imageUrl: raw.MainCardBout.Fighter2.HeadshotUrl,
            },
            titleFight: raw.MainCardBout.TitleBout,
            weightClass: raw.MainCardBout.WeightClass,
          };
        } else {
          mainEvent = {
            fighter1: { name: "TBA" },
            fighter2: { name: "TBA" },
          };
        }

        events.push({
          id,
          name: eventName,
          date: dateStr,
          location: { en: locationEn, ko: locationKo },
          venue: raw.Venue,
          mainEvent,
        });
      }

      if (events.length >= 1) return events.slice(0, 8);
    } catch {
      // 다음 URL 시도
    }
  }

  return null;
}

/**
 * www.ufc.com/events HTML 파싱 (폴백)
 */
async function fetchFromHtml(): Promise<UfcEvent[] | null> {
  try {
    const res = await fetch("https://www.ufc.com/events", {
      headers: CRAWLER_HEADERS,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);
    const today = new Date().toISOString().split("T")[0];
    const events: UfcEvent[] = [];

    // UFC events 페이지의 이벤트 카드 셀렉터 (여러 패턴 시도)
    const eventSelectors = [
      ".c-card-event--result",
      ".b-list-upcoming-events li",
      "[class*='upcoming'] [class*='event']",
      ".vc_event",
    ];

    for (const selector of eventSelectors) {
      const cards = $(selector);
      if (cards.length === 0) continue;

      cards.each((_, el) => {
        const card = $(el);

        // 날짜 추출
        const timeEl = card.find("time").first();
        const dateStr =
          timeEl.attr("datetime")?.split("T")[0] ||
          timeEl.attr("content")?.split("T")[0];
        if (!dateStr || dateStr < today) return;

        // 이벤트명
        const eventName =
          card
            .find(
              "[class*='headline'], [class*='title'], h2, h3, .field--name-node-title"
            )
            .first()
            .text()
            .trim() || "UFC Event";

        // 장소
        const locationText = card
          .find(
            "[class*='location'], [class*='meta'], .c-card-event--result__info"
          )
          .first()
          .text()
          .trim();

        const locationEn = locationText || "TBA";
        const locationKo = localizeCity(locationEn);

        const id = eventName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        // 파이터 이름 (메인 이벤트)
        const fighterEls = card.find(
          "[class*='athlete'], [class*='fighter'], .c-card-athlete"
        );
        let fighter1: UfcEventFighter = { name: "TBA" };
        let fighter2: UfcEventFighter = { name: "TBA" };

        if (fighterEls.length >= 2) {
          const f1Name = fighterEls.eq(0).text().trim();
          const f2Name = fighterEls.eq(1).text().trim();
          if (f1Name) fighter1 = { name: f1Name };
          if (f2Name) fighter2 = { name: f2Name };
        }

        events.push({
          id,
          name: eventName,
          date: dateStr,
          location: { en: locationEn, ko: locationKo },
          mainEvent: { fighter1, fighter2 },
        });
      });

      if (events.length >= 1) break;
    }

    return events.length >= 1 ? events.slice(0, 8) : null;
  } catch {
    return null;
  }
}

/**
 * @description 이벤트 파이터 이미지를 UFC 선수 페이지에서 병렬 스크레이핑하여 보완.
 * TBA가 아닌 파이터 중 imageUrl이 없는 경우에만 스크레이핑 시도.
 * 크론 잡 실행 시와 페이지 렌더링 시 양쪽에서 호출 가능 (ISR 안전).
 * @param events - imageUrl이 없을 수 있는 UfcEvent 배열
 * @returns imageUrl이 보완된 UfcEvent 배열
 */
export async function enrichFighterImages(
  events: UfcEvent[]
): Promise<UfcEvent[]> {
  // 이미지가 없는 파이터 목록 수집 (중복 제거)
  const fightersToFetch = new Map<string, string>(); // name → imageUrl

  for (const event of events) {
    const { fighter1, fighter2 } = event.mainEvent;
    if (fighter1.name !== "TBA" && !fighter1.imageUrl) {
      fightersToFetch.set(fighter1.name, "");
    }
    if (fighter2.name !== "TBA" && !fighter2.imageUrl) {
      fightersToFetch.set(fighter2.name, "");
    }
  }

  // 병렬로 이미지 스크레이핑 (최대 20명)
  const names = Array.from(fightersToFetch.keys()).slice(0, 20);
  await Promise.allSettled(
    names.map(async (name) => {
      try {
        const url = await scrapeUfcFighterImage(name);
        fightersToFetch.set(name, url);
      } catch {
        // 실패 시 무시
      }
    })
  );

  // 이벤트에 이미지 반영
  return events.map((event) => ({
    ...event,
    mainEvent: {
      ...event.mainEvent,
      fighter1: {
        ...event.mainEvent.fighter1,
        imageUrl:
          event.mainEvent.fighter1.imageUrl ||
          fightersToFetch.get(event.mainEvent.fighter1.name) ||
          undefined,
      },
      fighter2: {
        ...event.mainEvent.fighter2,
        imageUrl:
          event.mainEvent.fighter2.imageUrl ||
          fightersToFetch.get(event.mainEvent.fighter2.name) ||
          undefined,
      },
    },
  }));
}

/**
 * @description UFC 예정 경기 일정 크롤링.
 * 1차: CloudFront CDN API (구조화 JSON) → 실패 시 2차: ufc.com HTML 파싱.
 * 오늘 이후 이벤트만 포함하며 날짜 오름차순 정렬 후 최대 8개 반환.
 * @returns 이미지가 보완된 UfcEvent 배열
 * @throws 두 소스 모두 실패해 이벤트를 가져오지 못한 경우
 */
export async function crawlUfcSchedule(): Promise<UfcEvent[]> {
  let events = await fetchFromCloudFront();

  if (!events || events.length < 1) {
    events = await fetchFromHtml();
  }

  if (!events || events.length < 1) {
    throw new Error(
      "UFC schedule crawl failed: no events found from any source"
    );
  }

  // 날짜 오름차순 정렬
  events.sort((a, b) => a.date.localeCompare(b.date));

  // 파이터 이미지 보완
  events = await enrichFighterImages(events);

  return events;
}
