import * as cheerio from "cheerio";

const CRAWLER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

const PLACEHOLDER_IMAGE = "/images/fighter-placeholder.png";

/**
 * 선수 이름을 UFC 슬러그로 변환 (e.g. "Phil Rowe" → "phil-rowe")
 */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * UFC 선수 페이지에서 프로필 이미지 URL을 추출.
 * kr.ufc.com 리다이렉트를 따르고, 여러 셀렉터를 시도.
 * 실패 시 플레이스홀더 반환.
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
