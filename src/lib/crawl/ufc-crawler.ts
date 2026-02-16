import type { FightHistoryEntry, FighterStats } from "@/types/fighter";

import * as cheerio from "cheerio";

const UFC_ATHLETE_URL = "https://kr.ufc.com/athlete/seokhyeon-ko";

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

  // Parse record
  const recordText =
    $(".hero-profile__stat-text").first().text().trim() ||
    $('[class*="record"]').first().text().trim();
  const recordMatch = recordText.match(/(\d+)-(\d+)-(\d+)/);
  const record = recordMatch
    ? {
        wins: parseInt(recordMatch[1]),
        losses: parseInt(recordMatch[2]),
        draws: parseInt(recordMatch[3]),
      }
    : { wins: 0, losses: 0, draws: 0 };

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

  return stats as FighterStats;
}
