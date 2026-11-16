import { extractNameFromImageUrl } from "@/lib/fighter-name-utils";
import type {
  ExternalRanking,
  FightHistoryEntry,
  FighterStats,
} from "@/types/fighter";

import * as cheerio from "cheerio";

// Vercel 함수 리전이 US라 www.ufc.com 사용 (kr.ufc.com은 한국 사이트라 US IP에 403).
// 영문 페이지가 반환되지만 아래 파서가 영/한 라벨을 모두 처리하므로 무관.
const KO_ATHLETE_SLUG = "seokhyeon-ko";
const UFC_ATHLETE_URL = `https://www.ufc.com/athlete/${KO_ATHLETE_SLUG}`;
const FIGHTMATRIX_URL =
  "https://www.fightmatrix.com/fighter-profile/Seok%20Hyeon%20Ko/185137/";
const CRAWLER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
};

async function crawlFightMatrixRank(): Promise<ExternalRanking | undefined> {
  try {
    const res = await fetch(FIGHTMATRIX_URL, {
      headers: CRAWLER_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
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

export interface UfcStatsCrawlResult {
  stats: FighterStats;
  /** 전적 파싱이 끊긴 단계·스킵 건수. 문제가 없으면 undefined. DB에는 저장하지 않고 크롤 응답으로만 내보낸다 */
  fightHistoryIssue?: string;
}

/**
 * @description UFC 선수 페이지에서 고석현 전적·스탯·전적 히스토리를 크롤한다.
 * @returns 스탯과 전적 히스토리 진단 메시지
 * @throws 페이지 요청 실패 또는 전적(W-L-D)을 읽지 못하면
 */
export async function crawlUfcStats(): Promise<UfcStatsCrawlResult> {
  const response = await fetch(UFC_ATHLETE_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
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
  // 코너 판별 실패로 버린 카드 수. 전부 버려졌다면 파서가 마크업 변경을 따라가지 못한 것이므로 로그로 남긴다
  let skippedCards = 0;
  let noOpponentCards = 0;
  // 전적이 어느 단계에서 끊겼는지. 예전엔 전부 조용히 삼켜 빈 전적이 저장돼도 크롤 응답이 success였다
  const historyIssues: string[] = [];
  try {
    const viewDomId = html.match(/view_dom_id":"([a-f0-9]+)"/)?.[1] || "";
    const viewArgs =
      html.match(/view_args":"([^"]+)"/)?.[1]?.replace(/\\\//g, "/") || "";

    if (!viewDomId || !viewArgs) {
      historyIssues.push("페이지에 view_dom_id·view_args 없음");
    } else {
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
        `https://www.ufc.com/views/ajax?${ajaxParams.toString()}`,
        {
          headers: {
            ...CRAWLER_HEADERS,
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!ajaxRes.ok) {
        historyIssues.push(`전적 AJAX HTTP ${ajaxRes.status}`);
      } else {
        const ajaxJson = (await ajaxRes.json()) as Array<{
          command: string;
          data?: string;
        }>;
        const insertCmd = ajaxJson.find(
          (c) => c.command === "insert" && c.data && c.data.length > 0
        );

        if (!insertCmd?.data) {
          historyIssues.push("전적 AJAX 응답에 insert 데이터 없음");
        } else {
          const $ajax = cheerio.load(insertCmd.data);
          const cards = $ajax(".c-card-event--athlete-results");
          if (cards.length === 0) historyIssues.push("전적 카드 0건");

          cards.each((_, el) => {
            // 코너 div(red/blue)에 해당 선수의 프로필 링크와 헤드샷이 함께 들어있어, 승패·상대 이름의 판정 기준이 된다
            const corners = $ajax(el).find(
              ".c-card-event--athlete-results__red-image, .c-card-event--athlete-results__blue-image"
            );
            const koLink = `a[href*="${KO_ATHLETE_SLUG}"]`;
            const koCorner = corners
              .filter((_, c) => $ajax(c).find(koLink).length > 0)
              .first();
            const opponentCorner = corners
              .filter((_, c) => $ajax(c).find(koLink).length === 0)
              .first();

            // 상대 이름: headline <a>에는 성만 담기므로(예: "Rowe") 코너 헤드샷 파일명에서 풀네임을 복원
            let opponentSurname = "";
            $ajax(el)
              .find(".c-card-event--athlete-results__headline a")
              .each((_, link) => {
                const href = $ajax(link).attr("href") || "";
                if (!href.includes(KO_ATHLETE_SLUG)) {
                  opponentSurname = $ajax(link).text().trim();
                }
              });
            const opponent = extractNameFromImageUrl(
              opponentCorner.find("img").first().attr("src"),
              opponentSurname
            );

            if (!opponent) {
              noOpponentCards += 1;
              return;
            }

            // 마크업이 바뀌어 고석현 코너를 못 찾으면 승패를 알 수 없으므로 이 경기를 버린다. __plaque로 폴백하면 안 된다. plaque는 승자 코너에만 렌더돼 클래스가 항상 win이라 전패를 전승으로 기록한다(2026-09 실제 발생)
            if (koCorner.length === 0) {
              skippedCards += 1;
              return;
            }

            // 승패: 고석현 코너 div의 win/loss 클래스로 판정. draw는 두 클래스가 모두 없을 때
            const resultStr: "win" | "loss" | "draw" = koCorner.hasClass("win")
              ? "win"
              : koCorner.hasClass("loss")
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
  } catch (err) {
    // 전적 실패는 non-blocking. 스탯·전적 숫자는 그대로 저장한다
    historyIssues.push(
      `전적 요청 실패: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (skippedCards > 0) {
    historyIssues.push(`고석현 코너 판별 실패 ${skippedCards}건`);
  }
  if (noOpponentCards > 0) {
    historyIssues.push(`상대 이름 추출 실패 ${noOpponentCards}건`);
  }
  if (historyIssues.length > 0) {
    console.error(
      `Fight history: ${historyIssues.join(", ")}. 저장된 경기 ${fightHistory.length}건`
    );
  }

  // 비었으면 크롤 라우트가 직전에 성공한 전적을 이어 쓰고, 그마저 없으면 로더가 cached-stats.json으로 폴백한다
  stats.fightHistory = fightHistory;

  // Fetch external rankings (failures are non-blocking)
  const fightmatrixRank = await crawlFightMatrixRank();
  if (fightmatrixRank) {
    stats.externalRankings = [fightmatrixRank];
  }

  return {
    stats: stats as FighterStats,
    fightHistoryIssue: historyIssues.join(", ") || undefined,
  };
}
