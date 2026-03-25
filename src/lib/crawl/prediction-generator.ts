import type { FighterStats } from "@/types/fighter";
import type { OpponentPrediction, PredictionData } from "@/types/prediction";

import { crawlFightMatrixCandidates } from "./fightmatrix-crawler";
import { scrapeUfcFighterImage } from "./ufc-image-scraper";

import { analyzeOpponent, selectOpponents } from "@/lib/gemini";

const DEFAULT_RANK = 46;
// 최소 경과 일수 (최근 경기 후 이 기간이 지나야 예측 활성화)
const MIN_DAYS_SINCE_LAST_FIGHT = 60;

/**
 * AI 상대 예측 전체 파이프라인.
 * Gemini 4회 호출: 후보 선정 1회 + 상세 분석 3회
 */
export async function generatePredictions(
  stats?: FighterStats
): Promise<PredictionData> {
  // 1. 고석현 스탯 (외부에서 전달받거나 Supabase에서 가져오기)
  let koStats: FighterStats;
  if (stats) {
    koStats = stats;
  } else {
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = createServerClient();
    const { data } = await supabase
      .from("fighter_stats")
      .select("data")
      .order("crawled_at", { ascending: false })
      .limit(1)
      .single();

    if (!data?.data) {
      throw new Error("No fighter stats available for prediction");
    }
    koStats = data.data as FighterStats;
  }

  // 최근 경기 날짜 확인 — 2달 미만이면 예측 스킵
  const lastFightDate = koStats.fightHistory?.[0]?.date;
  if (lastFightDate) {
    const daysSinceLastFight = Math.floor(
      (Date.now() - new Date(lastFightDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastFight < MIN_DAYS_SINCE_LAST_FIGHT) {
      return {
        generatedAt: new Date().toISOString(),
        koFightMatrixRank: DEFAULT_RANK,
        lastFightDate,
        opponents: [],
      };
    }
  }

  // 2. FightMatrix 랭킹에서 고석현 랭크 확인
  const koRank =
    koStats.externalRankings?.find((r) => r.site === "FightMatrix")?.rank ||
    DEFAULT_RANK;

  // 3. FightMatrix 웰터급 후보 크롤링 (실패 시 빈 배열 — Gemini가 자체 지식으로 선정)
  let candidates: Awaited<ReturnType<typeof crawlFightMatrixCandidates>> = [];
  try {
    candidates = await crawlFightMatrixCandidates(koRank);
  } catch {
    console.log("FightMatrix crawl failed, Gemini will select from its own knowledge");
  }

  // 4. Gemini 호출 1: 후보 3명 선정
  const selectedOpponents = await selectOpponents(koStats, koRank, candidates);

  // 5. UFC 프로필 이미지 스크래핑 (병렬)
  const imageUrls = await Promise.all(
    selectedOpponents.map((op) => scrapeUfcFighterImage(op.name))
  );

  // 6. Gemini 호출 2~4: 후보별 상세 분석 (순차 — 레이트 리밋 방지)
  const opponents: OpponentPrediction[] = [];

  for (let i = 0; i < selectedOpponents.length; i++) {
    const op = selectedOpponents[i];
    try {
      const analysis = await analyzeOpponent(koStats, koRank, op);
      opponents.push({
        name: { ko: op.nameKo, en: op.name },
        imageUrl: imageUrls[i],
        country: op.country,
        fightMatrixRank: op.rank,
        fightingStyle: op.fightingStyle,
        record: op.record,
        age: op.age,
        height: op.height,
        weight: op.weight,
        reach: op.reach,
        winProbability: analysis.winProbability,
        matchReasoning: op.matchReasoning,
        fightAnalysis: analysis.fightAnalysis,
      });
    } catch (error) {
      console.error(`Analysis failed for ${op.name}:`, error);
      // 분석 실패 시 기본값으로 포함
      opponents.push({
        name: { ko: op.nameKo, en: op.name },
        imageUrl: imageUrls[i],
        country: op.country,
        fightMatrixRank: op.rank,
        fightingStyle: op.fightingStyle,
        record: op.record,
        age: op.age,
        height: op.height,
        weight: op.weight,
        reach: op.reach,
        winProbability: 50,
        matchReasoning: op.matchReasoning,
        fightAnalysis: {
          ko: "분석 데이터를 불러올 수 없습니다.",
          en: "Analysis data unavailable.",
        },
      });
    }
  }

  if (opponents.length === 0) {
    throw new Error("All opponent analyses failed");
  }

  return {
    generatedAt: new Date().toISOString(),
    koFightMatrixRank: koRank,
    lastFightDate: koStats.fightHistory?.[0]?.date,
    opponents,
  };
}
