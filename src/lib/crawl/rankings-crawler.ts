import { dedupeDivisions } from "@/lib/data/rankings";
import type {
  DivisionRanking,
  P4PRanking,
  RankedFighter,
  UfcRankings,
} from "@/types/rankings";

import * as cheerio from "cheerio";

// Vercel 함수 리전이 US라 www.ufc.com 사용 (kr.ufc.com은 한국 사이트라 US IP에 403).
// 영문 페이지가 반환되므로 헤더(체급명)는 영문 → 아래 영→한 매핑으로 한국어명 생성.
const UFC_RANKINGS_URL = "https://www.ufc.com/rankings";

// 영문 체급명 → 한국어 체급명 (한국어 로케일 표시용). 없으면 영문 그대로 사용.
const DIVISION_NAME_KO: Record<string, string> = {
  Flyweight: "플라이급",
  Bantamweight: "밴텀급",
  Featherweight: "페더급",
  Lightweight: "라이트급",
  Welterweight: "웰터급",
  Middleweight: "미들급",
  "Light Heavyweight": "라이트 헤비급",
  Heavyweight: "헤비급",
  "Women's Strawweight": "여성 스트로급",
  "Women's Flyweight": "여성 플라이급",
  "Women's Bantamweight": "여성 밴텀급",
};

function toSlug(nameEn: string): string {
  return nameEn.toLowerCase().replace(/'/g, "").replace(/\s+/g, "-");
}

// UFC 사이트가 상대/절대 URL을 섞어 반환하므로 항상 절대 URL로 정규화
function normalizeImageUrl(src: string | undefined): string {
  if (!src) return "";
  try {
    return new URL(src, UFC_RANKINGS_URL).href;
  } catch {
    return "";
  }
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
      "Accept-Language": "en-US,en;q=0.9",
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
        const imageUrl = normalizeImageUrl(champion$.find("img").attr("src"));
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
      const champImg = normalizeImageUrl(champion$.find("img").attr("src"));

      if (champName) {
        champion = { name: champName, imageUrl: champImg };
      }
    }

    const divisionNameEn = header;
    const divisionName = DIVISION_NAME_KO[divisionNameEn] || divisionNameEn;
    const rankedFighters = parseRankedFighters($, table);

    divisions.push({
      divisionName,
      divisionNameEn,
      divisionSlug: toSlug(divisionNameEn),
      champion,
      rankedFighters,
    });
  });

  // UFC 페이지의 반응형 중복 마크업으로 같은 체급이 2번 파싱되므로 slug 기준 중복 제거
  const uniqueDivisions = dedupeDivisions(divisions);

  // Validate: at least 6 divisions parsed
  if (uniqueDivisions.length < 6) {
    throw new Error(
      `Only ${uniqueDivisions.length} divisions parsed. Site structure may have changed.`
    );
  }

  return {
    updatedAt: new Date().toISOString(),
    poundForPoundMen,
    poundForPoundWomen,
    divisions: uniqueDivisions,
  };
}
