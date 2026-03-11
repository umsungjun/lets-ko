import type {
  ExternalRanking,
  FightHistoryEntry,
  FighterStats,
} from "@/types/fighter";

import * as cheerio from "cheerio";

const UFC_ATHLETE_URL = "https://kr.ufc.com/athlete/seokhyeon-ko";
const FIGHTMATRIX_URL =
  "https://www.fightmatrix.com/fighter-profile/Seok%20Hyeon%20Ko/185137/";
const CRAWLER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
};

async function crawlFightMatrixRank(): Promise<ExternalRanking | undefined> {
  try {
    const res = await fetch(FIGHTMATRIX_URL, { headers: CRAWLER_HEADERS });
    if (!res.ok) return undefined;
    const $ = cheerio.load(await res.text());
    let result: ExternalRanking | undefined;
    $('a[href*="/mma-ranks/"]').each((_, el) => {
      if (result) return;
      const match = $(el)
        .text()
        .trim()
        .match(/^#(\d+)\s+(.+)$/);
      if (match) {
        result = {
          site: "FightMatrix",
          rank: parseInt(match[1]),
          division: match[2].trim(),
          url: FIGHTMATRIX_URL,
          icon: "https://www.fightmatrix.com/favicon.ico",
        };
      }
    });
    return result;
  } catch {
    return undefined;
  }
}

export async function crawlUfcStats(): Promise<FighterStats> {
  const response = await fetch(UFC_ATHLETE_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`UFC crawl failed with status: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Parse record - search broadly for W-L-D pattern in hero/header area
  let recordMatch: RegExpMatchArray | null = null;

  // Try specific selectors first, then fall back to broader search
  const recordSelectors = [
    ".hero-profile__stat-text",
    ".c-hero--full__headline",
    ".l-masthead__headline",
    '[class*="record"]',
    '[class*="hero"]',
  ];

  for (const selector of recordSelectors) {
    const text = $(selector).text().trim();
    recordMatch = text.match(/(\d+)-(\d+)-(\d+)/);
    if (recordMatch) break;
  }

  // Last resort: search full page text for W-L-D pattern near "(W-L-D)"
  if (!recordMatch) {
    const bodyText = $("body").text();
    recordMatch = bodyText.match(/(\d+)-(\d+)-(\d+)\s*\(W-L-D\)/);
  }

  if (!recordMatch) {
    throw new Error(
      "Could not parse fighter record from UFC page. Site structure may have changed."
    );
  }

  const record = {
    wins: parseInt(recordMatch[1]),
    losses: parseInt(recordMatch[2]),
    draws: parseInt(recordMatch[3]),
  };

  // Parse stats from the page
  const stats: Partial<FighterStats> = {
    record,
    knockouts: 0,
    strikeAccuracy: 0,
    strikesLandedPerMin: 0,
    strikeDefense: 0,
    takedownAccuracy: 0,
    takedownDefense: 0,
    height: "",
    weight: "",
    reach: "",
    fightHistory: [],
  };

  // Try to extract knockout count
  $(".c-overlap__stats-text, .c-stat-compare__number").each((_, el) => {
    const text = $(el).text().trim();
    const label = $(el).parent().text().toLowerCase();
    if (label.includes("ko") || label.includes("tko")) {
      const num = parseInt(text);
      if (!isNaN(num)) stats.knockouts = num;
    }
  });

  // Extract accuracy percentages
  $(
    ".c-overlap__stats-value, .e-chart-circle__percent, .c-stat-compare__number"
  ).each((_, el) => {
    const text = $(el).text().trim().replace("%", "");
    const val = parseInt(text);
    if (isNaN(val)) return;

    const context = $(el).parent().text().toLowerCase();
    if (context.includes("str. acc") || context.includes("타격 정확도")) {
      stats.strikeAccuracy = val;
    } else if (
      context.includes("td acc") ||
      context.includes("테이크다운 정확도")
    ) {
      stats.takedownAccuracy = val;
    } else if (context.includes("str. def") || context.includes("타격 방어")) {
      stats.strikeDefense = val;
    } else if (
      context.includes("td def") ||
      context.includes("테이크다운 방어")
    ) {
      stats.takedownDefense = val;
    }
  });

  // Extract physical stats
  $(".c-bio__field, .c-bio__info").each((_, el) => {
    const label = $(el).find(".c-bio__label").text().trim().toLowerCase();
    const value = $(el).find(".c-bio__text").text().trim();
    if (label.includes("height") || label.includes("신장")) {
      stats.height = value;
    } else if (label.includes("weight") || label.includes("체중")) {
      stats.weight = value;
    } else if (label.includes("reach") || label.includes("리치")) {
      stats.reach = value;
    }
  });

  // Extract fight history via Drupal AJAX API
  // 초기 HTML에는 최근 1경기만 새 구조로 표시되므로, AJAX로 전체 전적 로드
  const fightHistory: FightHistoryEntry[] = [];
  try {
    const viewDomId = html.match(/view_dom_id":"([a-f0-9]+)"/)?.[1] || "";
    const viewArgs =
      html.match(/view_args":"([^"]+)"/)?.[1]?.replace(/\\\//g, "/") || "";

    if (viewDomId && viewArgs) {
      const ajaxParams = new URLSearchParams({
        view_name: "athlete_results",
        view_display_id: "entity_view_1",
        view_args: viewArgs,
        view_path: `/node/${viewArgs.split("/")[0]}`,
        view_dom_id: viewDomId,
        pager_element: "0",
        page: "0",
        _drupal_ajax: "1",
        _wrapper_format: "drupal_ajax",
      });

      const ajaxRes = await fetch(
        `https://kr.ufc.com/views/ajax?${ajaxParams.toString()}`,
        {
          headers: {
            ...CRAWLER_HEADERS,
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        }
      );

      if (ajaxRes.ok) {
        const ajaxJson = (await ajaxRes.json()) as Array<{
          command: string;
          data?: string;
        }>;
        const insertCmd = ajaxJson.find(
          (c) => c.command === "insert" && c.data && c.data.length > 0
        );

        if (insertCmd?.data) {
          const $ajax = cheerio.load(insertCmd.data);

          $ajax(".c-card-event--athlete-results").each((_, el) => {
            // 상대 이름: headline 내 <a> 중 본인(seokhyeon-ko)이 아닌 링크
            const headlineLinks = $ajax(el).find(
              ".c-card-event--athlete-results__headline a"
            );
            let opponent = "";
            headlineLinks.each((_, link) => {
              const href = $ajax(link).attr("href") || "";
              if (!href.includes("seokhyeon-ko")) {
                opponent = $ajax(link).text().trim();
              }
            });

            if (!opponent) return;

            // 승패: plaque 클래스의 win/loss
            const plaqueClass =
              $ajax(el)
                .find(".c-card-event--athlete-results__plaque")
                .attr("class") || "";
            const resultStr: "win" | "loss" | "draw" = plaqueClass.includes(
              "win"
            )
              ? "win"
              : plaqueClass.includes("loss")
                ? "loss"
                : "draw";

            // 날짜
            const date = $ajax(el)
              .find(".c-card-event--athlete-results__date")
              .text()
              .trim();

            // 결과 상세 (라운드, 시간, 메소드) — label/text 쌍으로 파싱
            let round = 0;
            let time = "";
            let method = "";
            $ajax(el)
              .find(".c-card-event--athlete-results__result")
              .each((_, resultEl) => {
                const label = $ajax(resultEl)
                  .find(".c-card-event--athlete-results__result-label")
                  .text()
                  .trim()
                  .toLowerCase();
                const value = $ajax(resultEl)
                  .find(".c-card-event--athlete-results__result-text")
                  .text()
                  .trim();
                if (
                  label.includes("round") ||
                  label.includes("일주") ||
                  label.includes("라운드")
                ) {
                  round = parseInt(value) || 0;
                } else if (label.includes("time") || label.includes("시간")) {
                  time = value;
                } else if (
                  label.includes("method") ||
                  label.includes("메소드") ||
                  label.includes("방법")
                ) {
                  method = value;
                }
              });

            fightHistory.push({
              date: date || "",
              event: "",
              opponent,
              result: resultStr,
              method,
              round,
              time,
            });
          });
        }
      }
    }
  } catch {
    // Fight history fetch failed — non-blocking, use empty array
  }

  stats.fightHistory = fightHistory;

  // Fetch external rankings (failures are non-blocking)
  const fightmatrixRank = await crawlFightMatrixRank();
  if (fightmatrixRank) {
    stats.externalRankings = [fightmatrixRank];
  }

  return stats as FighterStats;
}
