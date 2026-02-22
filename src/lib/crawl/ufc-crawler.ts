import type {
  ExternalRanking,
  FightHistoryEntry,
  FighterStats,
} from "@/types/fighter";

import * as cheerio from "cheerio";

const UFC_ATHLETE_URL = "https://kr.ufc.com/athlete/seokhyeon-ko";
const FIGHTMATRIX_URL =
  "https://www.fightmatrix.com/fighter-profile/Seok%20Hyeon%20Ko/185137/";
const TAPOLOGY_URL =
  "https://www.tapology.com/fightcenter/fighters/175557-seok-hyun-ko";

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
      const match = $(el).text().trim().match(/^#(\d+)\s+(.+)$/);
      if (match) {
        result = {
          site: "FightMatrix",
          rank: parseInt(match[1]),
          division: match[2].trim(),
          url: FIGHTMATRIX_URL,
        };
      }
    });
    return result;
  } catch {
    return undefined;
  }
}

async function crawlTapologyRank(): Promise<ExternalRanking | undefined> {
  try {
    const res = await fetch(TAPOLOGY_URL, { headers: CRAWLER_HEADERS });
    if (!res.ok) return undefined;
    const $ = cheerio.load(await res.text());
    const bodyText = $("body").text();
    const match = bodyText.match(/(\d+)\s+of\s+(\d+)/);
    if (match) {
      const rank = parseInt(match[1]);
      const total = parseInt(match[2]);
      if (rank > 0 && rank < 500 && total > rank) {
        return {
          site: "Tapology",
          rank,
          total,
          division: "Welterweight",
          url: TAPOLOGY_URL,
        };
      }
    }
    return undefined;
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

  // Extract fight history
  const fightHistory: FightHistoryEntry[] = [];
  $(".c-card-event--athlete-results, .l-listing__item").each((_, el) => {
    const opponent =
      $(el).find(".c-card-event--athlete-results__opponent").text().trim() ||
      $(el).find('[class*="opponent"]').text().trim();
    const result =
      $(el).find(".c-card-event--athlete-results__result").text().trim() ||
      $(el).find('[class*="result"]').text().trim();
    const method =
      $(el).find(".c-card-event--athlete-results__method").text().trim() ||
      $(el).find('[class*="method"]').text().trim();
    const date =
      $(el).find(".c-card-event--athlete-results__date").text().trim() ||
      $(el).find('[class*="date"]').text().trim();
    const event =
      $(el).find(".c-card-event--athlete-results__event").text().trim() ||
      $(el).find('[class*="event-name"]').text().trim();
    const roundText =
      $(el).find(".c-card-event--athlete-results__round").text().trim() || "";
    const timeText =
      $(el).find(".c-card-event--athlete-results__time").text().trim() || "";

    if (opponent) {
      fightHistory.push({
        date: date || "",
        event: event || "",
        opponent,
        result: result.toLowerCase().includes("win")
          ? "win"
          : result.toLowerCase().includes("loss")
            ? "loss"
            : "draw",
        method: method || "",
        round: parseInt(roundText) || 0,
        time: timeText || "",
      });
    }
  });

  stats.fightHistory = fightHistory;

  // Fetch external rankings in parallel (failures are non-blocking)
  const [fightmatrixResult, tapologyResult] = await Promise.allSettled([
    crawlFightMatrixRank(),
    crawlTapologyRank(),
  ]);

  const externalRankings: ExternalRanking[] = [];
  if (fightmatrixResult.status === "fulfilled" && fightmatrixResult.value) {
    externalRankings.push(fightmatrixResult.value);
  }
  if (tapologyResult.status === "fulfilled" && tapologyResult.value) {
    externalRankings.push(tapologyResult.value);
  }
  if (externalRankings.length > 0) {
    stats.externalRankings = externalRankings;
  }

  return stats as FighterStats;
}
