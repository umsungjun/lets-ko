import { getKstTodayStr } from "@/lib/date-utils";
import {
  backfillMainEventNames,
  deriveEventName,
  isTbaFighter,
} from "@/lib/schedule-utils";
import type {
  UfcCardTimes,
  UfcEvent,
  UfcEventFight,
  UfcEventFighter,
  UfcFightCard,
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

/**
 * 임의 timestamp 값을 안전하게 ISO 8601 문자열로 변환.
 * - undefined / null / 빈 문자열 → undefined
 * - 잘못된 ISO 문자열 / NaN / 음수 등 → undefined
 *
 * 이전 구현은 `new Date(...).toISOString()`을 검증 없이 호출해
 * 잘못된 timestamp 1건이 들어와도 RangeError로 크롤 전체가 중단됐다.
 * 부분 실패 허용을 위해 invalid 값은 조용히 버린다.
 *
 * @param value - ISO 8601 문자열(CloudFront) 또는 epoch milliseconds 숫자
 */
function toIsoSafe(
  value: string | number | undefined | null
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const time = new Date(value).getTime();
  // 음수(epoch 이전)·NaN은 잘못된 데이터로 간주 — UFC 이벤트는 모두 미래 시각
  if (Number.isNaN(time) || time < 0) return undefined;
  return new Date(time).toISOString();
}

/**
 * UFC HTML의 `data-*-timestamp` 속성(유닉스 초)을 ISO 문자열로 변환.
 * 비숫자·범위 외 값은 undefined 반환 (toIsoSafe와 동일한 부분 실패 정책).
 */
function secToIsoSafe(seconds: string | undefined): string | undefined {
  if (!seconds) return undefined;
  const n = Number(seconds);
  if (!Number.isFinite(n)) return undefined;
  return toIsoSafe(n * 1000);
}

// UFC CloudFront API 응답 타입
interface CloudFrontEvent {
  EventId: number;
  EventName: string;
  EventTitle?: string;
  StartTime?: string;
  /** 메인 카드 시작 시각 (응답 변형에 따라 둘 다 대응) */
  MainCardStartTime?: string;
  /** 예선 카드 시작 시각 */
  PrelimsCardStartTime?: string;
  /** 초기 예선 시작 시각 */
  EarlyPrelimsCardStartTime?: string;
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

      const today = getKstTodayStr();
      const events: UfcEvent[] = [];

      for (const raw of rawEvents) {
        // 메인 카드 시작 시각(또는 StartTime 폴백)을 단일 source-of-truth로 사용
        // → dateStr과 cardTimes.main이 같은 값에서 파생돼 일관성 보장
        const mainTimeIso = toIsoSafe(raw.MainCardStartTime || raw.StartTime);
        const dateStr = mainTimeIso?.split("T")[0];
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

        // 카드별 시작 시각 — invalid 값은 toIsoSafe가 undefined로 떨어뜨려 부분 실패 허용
        const prelimIso = toIsoSafe(raw.PrelimsCardStartTime);
        const earlyIso = toIsoSafe(raw.EarlyPrelimsCardStartTime);
        const cardTimes =
          mainTimeIso || prelimIso || earlyIso
            ? {
                ...(mainTimeIso ? { main: mainTimeIso } : {}),
                ...(prelimIso ? { prelim: prelimIso } : {}),
                ...(earlyIso ? { earlyPrelim: earlyIso } : {}),
              }
            : undefined;

        events.push({
          id,
          name: eventName,
          date: dateStr,
          location: { en: locationEn, ko: locationKo },
          venue: raw.Venue,
          mainEvent,
          ...(cardTimes ? { cardTimes } : {}),
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
 * 파이터 헤드샷 이미지 URL에서 풀네임 추출.
 * UFC 이미지 파일명 규칙: {LAST}_{FIRST}[_{수식어}...][_{MM-YY}].png
 * 예: ALLEN_ARNOLD_01-24.png → "Arnold Allen"
 *     VAN_JOSHUA_BELT_05-09.png → "Joshua Van" (챔피언은 _BELT_, 코너별 컷은 _L_/_R_ 토큰이 붙음)
 *     ABDUL-MALIK_MANSUR_01-01.png → "Mansur Abdul-Malik" (하이픈 성)
 */
function extractNameFromImageUrl(
  url: string | undefined,
  fallback: string
): string {
  if (!url) return fallback;
  const match = url.match(
    /\/([A-Z][A-Z-]*)_([A-Z]+)(?:_[A-Z]+)*(?:_[\d-]+)?\.png/
  );
  if (!match) return fallback;
  // 하이픈 성은 세그먼트별로 대문자화 ("ABDUL-MALIK" → "Abdul-Malik")
  const toTitle = (s: string) =>
    s
      .split("-")
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join("-");
  return `${toTitle(match[2])} ${toTitle(match[1])}`;
}

/**
 * www.ufc.com/events HTML 파싱.
 * 날짜: data-main-card-timestamp (유닉스 초), 파이터: 이미지 URL에서 추출
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
    const today = getKstTodayStr();
    const events: UfcEvent[] = [];
    const seenIds = new Set<string>();

    $("article.c-card-event--result").each((_, el) => {
      const card = $(el);

      // 날짜·카드별 시작시각: data-*-timestamp 속성 (유닉스 초)
      // tz-change-data가 여러 요소에 분산될 수 있으므로 각 속성 셀렉터로 찾음
      // (단일 요소 .attr() 호출은 첫 매치만 검사해서 분산 시 누락 가능)
      const mainIso = secToIsoSafe(
        card
          .find("[data-main-card-timestamp]")
          .first()
          .attr("data-main-card-timestamp")
      );
      const prelimIso = secToIsoSafe(
        card
          .find("[data-prelims-card-timestamp]")
          .first()
          .attr("data-prelims-card-timestamp")
      );
      const earlyIso = secToIsoSafe(
        card
          .find("[data-early-prelims-timestamp]")
          .first()
          .attr("data-early-prelims-timestamp")
      );
      if (!mainIso) return;
      const dateStr = mainIso.split("T")[0];
      if (dateStr < today) return;

      const cardTimes =
        mainIso || prelimIso || earlyIso
          ? {
              ...(mainIso ? { main: mainIso } : {}),
              ...(prelimIso ? { prelim: prelimIso } : {}),
              ...(earlyIso ? { earlyPrelim: earlyIso } : {}),
            }
          : undefined;

      // ID: 이벤트 URL 슬러그 (프래그먼트 제거)
      const eventUrl =
        card.find(".c-card-event--result__logo a").first().attr("href") || "";
      const id = eventUrl.replace("/event/", "").replace(/#.*$/, "").trim();
      if (!id || seenIds.has(id)) return;
      seenIds.add(id);

      // 메인 이벤트 라벨 (예: "Allen vs Costa")
      const fightLabel = card
        .find("[data-fight-label]")
        .first()
        .attr("data-fight-label");

      const eventName = deriveEventName(id, fightLabel);

      // 파이터 이미지 + 풀네임 (이미지 URL 파일명에서 추출)
      const imgEls = card.find(".c-card--red-blue img");
      const f1Src = imgEls.eq(0).attr("src");
      const f2Src = imgEls.eq(1).attr("src");
      const [f1RawName, f2RawName] = (fightLabel ?? "")
        .split(" vs ")
        .map((n) => n.trim());
      const f1Name = extractNameFromImageUrl(f1Src, f1RawName || "TBA");
      const f2Name = extractNameFromImageUrl(f2Src, f2RawName || "TBA");

      // 위치 (도시 + 국가)
      const city = card.find(".address .locality").text().trim();
      const country = card.find(".address .country").text().trim();
      const locationEn = city
        ? country === "United States"
          ? city
          : `${city}, ${country}`
        : "TBA";
      const locationKo = localizeCity(locationEn);

      // 경기장
      const venue =
        card.find(".field--name-taxonomy-term-title h5").text().trim() ||
        undefined;

      events.push({
        id,
        name: eventName,
        date: dateStr,
        location: { en: locationEn, ko: locationKo },
        venue,
        mainEvent: {
          fighter1: {
            name: f1Name,
            imageUrl:
              !isTbaFighter(f1Name) && f1Src?.startsWith("https://")
                ? f1Src
                : undefined,
          },
          fighter2: {
            name: f2Name,
            imageUrl:
              !isTbaFighter(f2Name) && f2Src?.startsWith("https://")
                ? f2Src
                : undefined,
          },
        },
        ...(cardTimes ? { cardTimes } : {}),
      });
    });

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
    if (!isTbaFighter(fighter1.name) && !fighter1.imageUrl) {
      fightersToFetch.set(fighter1.name, "");
    }
    if (!isTbaFighter(fighter2.name) && !fighter2.imageUrl) {
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

const UFC_BASE_URL = "https://www.ufc.com";

/**
 * 상대 경로 img src를 절대 URL로 변환.
 * 절대 URL은 그대로, 잘못된 URL은 undefined 반환.
 */
function normalizeFightImageUrl(src: string | undefined): string | undefined {
  if (!src) return undefined;
  try {
    return new URL(src, UFC_BASE_URL).href;
  } catch {
    return undefined;
  }
}

type EventDetail = {
  weightClass?: string;
  fightCard?: UfcFightCard;
  cardTimes?: UfcCardTimes;
};

/**
 * @description 단일 UFC 이벤트 상세 페이지에서 메인 이벤트 체급 + 전체 fight card 추출.
 * 카드 섹션 구분:
 * - #main-card → 메인 카드
 * - .fight-card-prelims (단, .fight-card-prelims-early 후손은 제외) → 예선 카드
 * - .fight-card-prelims-early → 초기 예선
 *
 * 파이터 이름 a 태그는 plain text 또는 given/family-name span 분리 둘 다 지원
 * (cheerio .text()가 모든 자식 텍스트를 합쳐 반환).
 * @param eventId - UFC 이벤트 슬러그 (예: "ufc-329")
 * @returns 체급(원문) + fight card. 페이지 fetch 실패 시 빈 객체
 */
async function fetchEventDetail(eventId: string): Promise<EventDetail> {
  try {
    const res = await fetch(`${UFC_BASE_URL}/event/${eventId}`, {
      headers: CRAWLER_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return {};
    const html = await res.text();
    const $ = cheerio.load(html);

    const weightClass =
      $(".c-listing-fight__class-text").first().text().trim() || undefined;

    // 카드별 시작 시각 — 각 timestamp 속성을 가진 요소를 개별 탐색
    // (tz-change-data가 여러 요소에 분산될 수 있어 단일 .attr() 호출은 누락 위험)
    const detailMainIso = secToIsoSafe(
      $("[data-main-card-timestamp]").first().attr("data-main-card-timestamp")
    );
    const detailPrelimIso = secToIsoSafe(
      $("[data-prelims-card-timestamp]")
        .first()
        .attr("data-prelims-card-timestamp")
    );
    const detailEarlyIso = secToIsoSafe(
      $("[data-early-prelims-timestamp]")
        .first()
        .attr("data-early-prelims-timestamp")
    );
    const cardTimes =
      detailMainIso || detailPrelimIso || detailEarlyIso
        ? {
            ...(detailMainIso ? { main: detailMainIso } : {}),
            ...(detailPrelimIso ? { prelim: detailPrelimIso } : {}),
            ...(detailEarlyIso ? { earlyPrelim: detailEarlyIso } : {}),
          }
        : undefined;

    // 단일 .c-listing-fight 요소에서 UfcEventFight 추출 (closure로 $ 캡처)
    // el 타입은 cheerio each 콜백 파라미터 그대로 (domhandler.AnyNode가 직접 의존성이 아님)
    const parseFight = ($fight: ReturnType<typeof $>): UfcEventFight => {
      const wc =
        $fight.find(".c-listing-fight__class-text").first().text().trim() ||
        undefined;

      const f1Name = $fight
        .find(".c-listing-fight__corner-name--red a")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim();
      const f2Name = $fight
        .find(".c-listing-fight__corner-name--blue a")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim();

      const f1ImgSrc = $fight
        .find(".c-listing-fight__corner-image--red img")
        .first()
        .attr("src");
      const f2ImgSrc = $fight
        .find(".c-listing-fight__corner-image--blue img")
        .first()
        .attr("src");

      return {
        fighter1: {
          name: f1Name || "TBA",
          imageUrl: normalizeFightImageUrl(f1ImgSrc),
        },
        fighter2: {
          name: f2Name || "TBA",
          imageUrl: normalizeFightImageUrl(f2ImgSrc),
        },
        weightClass: wc,
      };
    };

    const mainCard: UfcEventFight[] = [];
    const prelimCard: UfcEventFight[] = [];
    const earlyPrelimCard: UfcEventFight[] = [];

    $("#main-card .c-listing-fight").each((_, el) => {
      mainCard.push(parseFight($(el)));
    });

    // 예선 카드: early-prelim 후손은 제외 (둘이 nested인 경우 중복 방지)
    $(".fight-card-prelims .c-listing-fight").each((_, el) => {
      const $el = $(el);
      if ($el.closest(".fight-card-prelims-early").length === 0) {
        prelimCard.push(parseFight($el));
      }
    });

    $(".fight-card-prelims-early .c-listing-fight").each((_, el) => {
      earlyPrelimCard.push(parseFight($(el)));
    });

    // 폴백: 메인/예선 섹션이 아직 분리 안 된 미래 이벤트는 평면 리스트로 옴.
    // 모든 .c-listing-fight를 메인 카드로 취급해서 노출.
    if (
      mainCard.length === 0 &&
      prelimCard.length === 0 &&
      earlyPrelimCard.length === 0
    ) {
      $(".c-listing-fight").each((_, el) => {
        mainCard.push(parseFight($(el)));
      });
    }

    const totalFights =
      mainCard.length + prelimCard.length + earlyPrelimCard.length;
    const fightCard: UfcFightCard | undefined =
      totalFights === 0
        ? undefined
        : {
            mainCard,
            prelimCard,
            ...(earlyPrelimCard.length > 0 ? { earlyPrelimCard } : {}),
          };

    return { weightClass, fightCard, cardTimes };
  } catch {
    return {};
  }
}

/**
 * @description 모든 이벤트의 상세 페이지를 병렬 스크레이핑해 fight card와 메인 이벤트 체급 보완.
 * fightCard는 이벤트마다 전체 카드(메인/예선/초기예선)를 추가하고,
 * weightClass는 누락된 이벤트만 보완.
 * @param events - 보완 대상 UfcEvent 배열
 * @returns fightCard·weightClass가 보완된 UfcEvent 배열
 */
async function enrichEventDetails(events: UfcEvent[]): Promise<UfcEvent[]> {
  // 상세 페이지에서 가져올 항목(fightCard / weightClass / cardTimes) 중
  // 하나라도 누락된 이벤트만 fetch — 이미 모두 채워졌다면 8초 timeout fetch 스킵
  const needsFetch = (e: UfcEvent) =>
    !!e.id &&
    (!e.fightCard ||
      !e.mainEvent.weightClass ||
      !e.cardTimes?.main ||
      !e.cardTimes?.prelim);

  const fetched = await Promise.allSettled(
    events.map((e) =>
      needsFetch(e) ? fetchEventDetail(e.id) : Promise.resolve<EventDetail>({})
    )
  );

  return events.map((event, i) => {
    const r = fetched[i];
    if (r.status !== "fulfilled") return event;
    const detail = r.value;

    // cardTimes 병합: 기존 값(목록 페이지/CloudFront) 우선, 누락분만 상세 페이지로 보완
    // 값이 있는 키만 포함해 빈 객체({ main: undefined, ... }) 생성을 방지
    const main = event.cardTimes?.main ?? detail.cardTimes?.main;
    const prelim = event.cardTimes?.prelim ?? detail.cardTimes?.prelim;
    const earlyPrelim =
      event.cardTimes?.earlyPrelim ?? detail.cardTimes?.earlyPrelim;
    const mergedCardTimes: UfcCardTimes | undefined =
      main || prelim || earlyPrelim
        ? {
            ...(main ? { main } : {}),
            ...(prelim ? { prelim } : {}),
            ...(earlyPrelim ? { earlyPrelim } : {}),
          }
        : undefined;

    return {
      ...event,
      mainEvent: {
        ...event.mainEvent,
        weightClass: event.mainEvent.weightClass || detail.weightClass,
      },
      ...(detail.fightCard ? { fightCard: detail.fightCard } : {}),
      ...(mergedCardTimes ? { cardTimes: mergedCardTimes } : {}),
    };
  });
}

/**
 * @description UFC 예정 경기 일정 크롤링.
 * 1차: CloudFront CDN API (구조화 JSON) → 실패 시 2차: ufc.com HTML 파싱.
 * 오늘 이후 이벤트만 포함하며 날짜 오름차순 정렬 후 최대 8개 반환.
 * @returns 이미지·체급이 보완된 UfcEvent 배열
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

  // 파이터 이미지 보완 + 상세 페이지에서 fight card·체급 가져오기
  events = await enrichFighterImages(events);
  events = await enrichEventDetails(events);

  return backfillMainEventNames(events);
}
