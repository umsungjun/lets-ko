import type {
  DivisionRanking,
  P4PRanking,
  RankedFighter,
  UfcRankings,
} from "@/types/rankings";

import * as cheerio from "cheerio";

const UFC_RANKINGS_URL = "https://kr.ufc.com/rankings";

const DIVISION_NAME_MAP: Record<string, string> = {
  플라이급: "Flyweight",
  밴텀급: "Bantamweight",
  페더급: "Featherweight",
  라이트급: "Lightweight",
  웰터급: "Welterweight",
  미들급: "Middleweight",
  "라이트 헤비급": "Light Heavyweight",
  헤비급: "Heavyweight",
  "여성 스트로급": "Women's Strawweight",
  "여성 플라이급": "Women's Flyweight",
  "여성 밴텀급": "Women's Bantamweight",
};

function toSlug(name: string): string {
  return (DIVISION_NAME_MAP[name] || name)
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/\s+/g, "-");
}

function parseRankedFighters(
  $: cheerio.CheerioAPI,
  table: ReturnType<cheerio.CheerioAPI>
): RankedFighter[] {
  const fighters: RankedFighter[] = [];

  table.find("tbody tr").each((_, row) => {
    const rankText = $(row)
      .find(".views-field-weight-class-rank")
      .text()
      .trim();
    const name = $(row).find(".views-field-title a").text().trim();
    const changeCell = $(row)
      .find(".views-field-weight-class-rank-change")
      .text()
      .trim();
    const changeHtml =
      $(row).find(".views-field-weight-class-rank-change").html() || "";

    const rank = parseInt(rankText);
    if (!name || isNaN(rank)) return;

    let rankChange = 0;
    const isNR = changeHtml.includes("athlete-rankings--not-ranked");
    const changeNum = changeCell.match(/(\d+)\s*$/);

    if (changeHtml.includes("rank-increase") && changeNum) {
      rankChange = parseInt(changeNum[1]);
    } else if (changeHtml.includes("rank-decrease") && changeNum) {
      rankChange = -parseInt(changeNum[1]);
    }

    fighters.push({ rank, name, rankChange, isNR });
  });

  return fighters;
}

export async function crawlUfcRankings(): Promise<UfcRankings> {
  const response = await fetch(UFC_RANKINGS_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`UFC rankings crawl failed: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const poundForPoundMen: P4PRanking = { topFighter: null, fighters: [] };
  const poundForPoundWomen: P4PRanking = { topFighter: null, fighters: [] };
  const divisions: DivisionRanking[] = [];

  $(".view-grouping").each((_, grouping) => {
    const header = $(grouping).find(".view-grouping-header").text().trim();
    const table = $(grouping).find("table");

    if (!header || table.length === 0) return;

    // P4P divisions
    if (header.includes("Pound-for-Pound")) {
      const fighters = parseRankedFighters($, table);
      const champion$ = $(grouping).find(".rankings--athlete--champion");
      let topFighter: P4PRanking["topFighter"] = null;

      if (champion$.length > 0) {
        const name = champion$.find("h5 a").text().trim();
        const imageUrl = champion$.find("img").attr("src") || "";
        if (name) {
          topFighter = { name, imageUrl };
        }
      }

      if (header.includes("Men")) {
        poundForPoundMen.topFighter = topFighter;
        poundForPoundMen.fighters.push(...fighters);
      } else if (header.includes("Women")) {
        poundForPoundWomen.topFighter = topFighter;
        poundForPoundWomen.fighters.push(...fighters);
      }
      return;
    }

    // Regular divisions
    const champion$ = $(grouping).find(".rankings--athlete--champion");
    let champion: DivisionRanking["champion"] = null;

    if (champion$.length > 0) {
      const champName = champion$.find("h5 a").text().trim();
      const champImg = champion$.find("img").attr("src") || "";

      if (champName) {
        champion = { name: champName, imageUrl: champImg };
      }
    }

    const divisionName = header;
    const divisionNameEn = DIVISION_NAME_MAP[divisionName] || divisionName;
    const rankedFighters = parseRankedFighters($, table);

    divisions.push({
      divisionName,
      divisionNameEn,
      divisionSlug: toSlug(divisionName),
      champion,
      rankedFighters,
    });
  });

  // Validate: at least 6 divisions parsed
  if (divisions.length < 6) {
    throw new Error(
      `Only ${divisions.length} divisions parsed. Site structure may have changed.`
    );
  }

  return {
    updatedAt: new Date().toISOString(),
    poundForPoundMen,
    poundForPoundWomen,
    divisions,
  };
}
