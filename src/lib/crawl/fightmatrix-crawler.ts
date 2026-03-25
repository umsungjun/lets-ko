import type { FightMatrixCandidate } from "@/types/prediction";

import * as cheerio from "cheerio";

const FIGHTMATRIX_RANKINGS_URL =
  "https://www.fightmatrix.com/mma-ranks/Welterweight/";
const CRAWLER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

/**
 * FightMatrix 웰터급 랭킹 페이지에서 고석현보다 상위 랭킹 선수 목록을 크롤링.
 * @param targetRank 고석현의 현재 FightMatrix 랭킹
 * @param rangeAbove 위로 탐색할 범위 (기본 20등 위까지)
 */
export async function crawlFightMatrixCandidates(
  targetRank: number,
  rangeAbove = 20
): Promise<FightMatrixCandidate[]> {
  const minRank = Math.max(1, targetRank - rangeAbove);
  const maxRank = targetRank - 1; // 고석현보다 위(낮은 숫자)만
  const candidates: FightMatrixCandidate[] = [];

  // FightMatrix 페이지당 약 25명, 필요한 페이지 계산
  const startPage = Math.max(1, Math.floor((minRank - 1) / 25) + 1);
  const endPage = Math.ceil(maxRank / 25);

  for (let page = startPage; page <= endPage; page++) {
    try {
      const url =
        page === 1
          ? FIGHTMATRIX_RANKINGS_URL
          : `${FIGHTMATRIX_RANKINGS_URL}?PAGE=${page}`;

      const res = await fetch(url, { headers: CRAWLER_HEADERS });
      if (!res.ok) continue;

      const $ = cheerio.load(await res.text());

      // FightMatrix 랭킹 테이블 파싱
      $("table.tblRank tbody tr, table.pointed tbody tr").each((_, row) => {
        const cells = $(row).find("td");
        if (cells.length < 3) return;

        const rankText = $(cells[0]).text().trim();
        const rank = parseInt(rankText);
        if (isNaN(rank) || rank < minRank || rank > maxRank) return;

        // 선수 이름과 프로필 링크
        const nameLink = $(cells[1]).find("a");
        const name = nameLink.text().trim();
        const profileUrl = nameLink.attr("href") || "";

        if (!name || name.toLowerCase().includes("seok hyeon ko")) return;

        const fullUrl = profileUrl.startsWith("http")
          ? profileUrl
          : `https://www.fightmatrix.com${profileUrl}`;

        candidates.push({ name, rank, profileUrl: fullUrl });
      });
    } catch {
      // 페이지 크롤 실패 — 다음 페이지 시도
    }
  }

  return candidates.sort((a, b) => a.rank - b.rank);
}
