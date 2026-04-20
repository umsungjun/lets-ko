import * as cheerio from "cheerio";

const CRAWLER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

const PLACEHOLDER_IMAGE = "/images/fighter-placeholder.png";

/**
 * @description 선수 이름을 UFC 슬러그로 변환
 * @param name - 영문 파이터 이름 (예: "Phil Rowe")
 * @returns URL 슬러그 (예: "phil-rowe")
 */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * @description UFC 선수 페이지에서 프로필 헤드샷 URL을 스크레이핑.
 * kr.ufc.com → www.ufc.com 순서로 시도하며, 여러 CSS 셀렉터를 폴백.
 * @param fighterName - 영문 파이터 이름 (예: "Khamzat Chimaev")
 * @returns 헤드샷 이미지 절대 URL. 실패 시 `/images/fighter-placeholder.png` 반환
 */
export async function scrapeUfcFighterImage(
  fighterName: string
): Promise<string> {
  const slug = nameToSlug(fighterName);

  // UFC는 지역에 따라 리다이렉트 — kr.ufc.com 직접 사용
  const urls = [
    `https://kr.ufc.com/athlete/${slug}`,
    `https://www.ufc.com/athlete/${slug}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: CRAWLER_HEADERS,
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;

      const $ = cheerio.load(await res.text());

      // UFC 선수 페이지의 히어로 이미지 (우선순위 순)
      const selectors = [
        "img.hero-profile__image",
        ".hero-profile__image-wrap img",
        ".hero-profile__image img",
        ".c-hero--full__image img",
        'img[alt*="headshot"]',
        ".field--name-thumbnail img",
      ];

      for (const selector of selectors) {
        const src = $(selector).first().attr("src");
        if (src && src.startsWith("http")) return src;
      }
    } catch {
      // 다음 URL 시도
    }
  }

  return PLACEHOLDER_IMAGE;
}
