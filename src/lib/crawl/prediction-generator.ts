import { toCalendarDate } from "@/lib/date-utils";
import { fighterNameKey } from "@/lib/fighter-name-utils";
import { analyzeOpponent, selectOpponents } from "@/lib/gemini";
import {
  KO_DEFAULT_FIGHTMATRIX_RANK,
  getKoFightMatrixRank,
} from "@/lib/ko-stats";
import {
  hasRealOpponentImage,
  isGeneratedAfterLastFight,
} from "@/lib/prediction-utils";
import type { FighterStats } from "@/types/fighter";
import type { OpponentPrediction, PredictionData } from "@/types/prediction";

import { crawlFightMatrixCandidates } from "./fightmatrix-crawler";
import { scrapeUfcFighterImage } from "./ufc-image-scraper";

// 후보 생성은 Gemini 4회라 크롤마다 돌리면 60초를 넘긴다(2026-09~10 504). 이 기간 안에는 직전 후보를 이어 쓴다
const CANDIDATE_REUSE_DAYS = 7;
const DAY_MS = 1000 * 60 * 60 * 24;

/** 이번 크롤에서 상대 후보를 어디서 가져왔는지. 크롤 응답으로 노출한다 */
export type CandidateSource = "confirmed-fight" | "reused" | "generated";

/**
 * @description 고석현 최근 경기일. 전적 크롤이 빈 날엔 직전 예측 행의 값을 쓴다.
 * 크롤 전적 날짜는 "Nov. 7, 2026" 같은 텍스트라 "YYYY-MM-DD"로 맞춰 저장한다.
 * @param stats - 이번 크롤 스탯
 * @param previous - DB에 저장된 직전 예측 데이터
 * @returns "YYYY-MM-DD" (읽을 수 없으면 원문) 또는 undefined
 */
const resolveLastFightDate = (
  stats: FighterStats | undefined,
  previous: PredictionData | null
): string | undefined => {
  const raw = stats?.fightHistory?.[0]?.date || previous?.lastFightDate;
  return toCalendarDate(raw) ?? raw;
};

/**
 * @description 직전 후보를 그대로 써도 되는지 판정한다. 최근 경기가 바뀌었거나 그 경기 전에 만든 후보면 다시 만든다.
 * @param previous - DB에 저장된 직전 예측 데이터
 * @param lastFightDate - 이번 크롤 기준 최근 경기일
 * @returns 재사용 가능하면 true
 */
const canReuseCandidates = (
  previous: PredictionData | null,
  lastFightDate: string | undefined
): boolean => {
  if (!previous?.opponents?.length) return false;
  // 사진을 전부 못 가져온 행은 화면 로더가 거부해 캐시 후보가 뜨므로 이어 쓰지 않고 다시 만든다
  if (!hasRealOpponentImage(previous.opponents)) return false;
  // 전적 반영이 늦어 옛 경기일로 만든 후보는 생성 시각이 새 경기보다 뒤여도 결과를 모른다
  // 옛 행은 경기일이 크롤 원문 그대로라 양쪽을 맞춰 비교한다
  if (
    toCalendarDate(previous.lastFightDate) !== toCalendarDate(lastFightDate)
  ) {
    return false;
  }
  if (!isGeneratedAfterLastFight(previous)) return false;
  const ageDays =
    (Date.now() - new Date(previous.generatedAt).getTime()) / DAY_MS;
  return ageDays < CANDIDATE_REUSE_DAYS;
};

/**
 * @description 직전 상대 후보를 새로 만들지 않고 이어 쓴다. 확정 경기가 있는 동안과 재사용 기간 안에서 쓴다.
 * @param previous - DB에 저장된 직전 예측 데이터. 없으면 빈 상대 목록으로 시작
 * @param stats - 이번 크롤 스탯. 최근 경기 날짜를 최신으로 맞추는 데 쓴다
 * @returns confirmedFight를 뺀 예측 데이터 (확정 경기는 호출부가 붙인다)
 */
const carryOverPredictions = (
  previous: PredictionData | null,
  stats?: FighterStats
): PredictionData => ({
  generatedAt: previous?.generatedAt ?? new Date().toISOString(),
  koFightMatrixRank:
    previous?.koFightMatrixRank ??
    (stats ? getKoFightMatrixRank(stats) : KO_DEFAULT_FIGHTMATRIX_RANK),
  lastFightDate: resolveLastFightDate(stats, previous),
  opponents: previous?.opponents ?? [],
});

/**
 * @description 이번 크롤의 상대 후보를 정한다. 확정 경기가 있으면 이어 쓰고, 직전 후보가 신선하면 재사용하고, 아니면 새로 만든다.
 * 확정 기간에 이어 쓴 후보는 예측 페이지가 "확정 전 AI가 꼽았던 후보"로 보여 준다.
 * @param previous - DB에 저장된 직전 예측 데이터
 * @param stats - 이번 크롤 스탯. 없으면 생성 시 DB 최신 스탯을 읽는다
 * @param hasConfirmedFight - 이번 크롤에서 확정 경기가 잡혔는지
 * @returns 예측 데이터와 후보 출처
 * @throws 새로 만들어야 하는데 생성이 실패하면
 */
export const resolveOpponentPredictions = async (
  previous: PredictionData | null,
  stats: FighterStats | undefined,
  hasConfirmedFight: boolean
): Promise<{ data: PredictionData; source: CandidateSource }> => {
  if (hasConfirmedFight) {
    return {
      data: carryOverPredictions(previous, stats),
      source: "confirmed-fight",
    };
  }
  if (canReuseCandidates(previous, resolveLastFightDate(stats, previous))) {
    return { data: carryOverPredictions(previous, stats), source: "reused" };
  }
  return {
    data: await generatePredictions(stats, previous),
    source: "generated",
  };
};

/**
 * @description AI 상대 예측 전체 파이프라인. Gemini 4회 호출: 후보 선정 1회 + 상세 분석 3회.
 * 이미 맞붙은 상대와 직전 확정 경기 상대는 후보에서 뺀다.
 * @param stats - 이번 크롤 스탯. 없으면 DB 최신 스탯을 읽는다
 * @param previous - DB에 저장된 직전 예측 데이터. 최근 경기일 폴백과 직전 확정 상대 제외에 쓴다
 * @returns 예측 데이터 (confirmedFight는 호출부가 붙인다)
 * @throws 스탯이 없거나 후보가 하나도 남지 않으면
 */
export async function generatePredictions(
  stats?: FighterStats,
  previous: PredictionData | null = null
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

  const lastFightDate = resolveLastFightDate(koStats, previous);

  // 경기 직후엔 UFC 전적 반영이 늦을 수 있어 방금 끝난 확정 경기 상대도 함께 뺀다
  const excludedNames = [
    ...(koStats.fightHistory ?? []).map((f) => f.opponent),
    ...(previous?.confirmedFight
      ? [previous.confirmedFight.opponent.name.en]
      : []),
  ];
  const excludedKeys = new Set(excludedNames.map(fighterNameKey));

  // 2. FightMatrix 랭킹에서 고석현 랭크 확인
  const koRank = getKoFightMatrixRank(koStats);

  // 3. FightMatrix 웰터급 후보 크롤링 (실패 시 빈 배열 — Gemini가 자체 지식으로 선정)
  let candidates: Awaited<ReturnType<typeof crawlFightMatrixCandidates>> = [];
  try {
    candidates = await crawlFightMatrixCandidates(koRank);
  } catch {
    console.log(
      "FightMatrix crawl failed, Gemini will select from its own knowledge"
    );
  }

  // 4. Gemini 호출 1: 후보 3명 선정. 프롬프트 지시만으로는 보장되지 않아 코드로 한 번 더 거른다
  const selectedOpponents = (
    await selectOpponents(koStats, koRank, candidates, excludedNames)
  ).filter((op) => !excludedKeys.has(fighterNameKey(op.name)));
  if (selectedOpponents.length === 0) {
    throw new Error("Every selected opponent was already faced");
  }

  // 5. UFC 프로필 이미지 스크래핑 (병렬)
  const imageUrls = await Promise.all(
    selectedOpponents.map((op) => scrapeUfcFighterImage(op.name))
  );

  // 6. Gemini 호출 2~4: 후보별 상세 분석 (병렬 — 후보 3명이라 레이트 리밋 여유, 크롤 60초 예산 절약)
  const opponents: OpponentPrediction[] = await Promise.all(
    selectedOpponents.map(async (op, i) => {
      const base = {
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
        lastFightDate: op.lastFightDate,
        matchReasoning: op.matchReasoning,
      };
      try {
        const analysis = await analyzeOpponent(koStats, koRank, op);
        return {
          ...base,
          winProbability: analysis.winProbability,
          fightAnalysis: analysis.fightAnalysis,
        };
      } catch (error) {
        console.error(`Analysis failed for ${op.name}:`, error);
        // 분석 실패 시 기본값으로 포함
        return {
          ...base,
          winProbability: 50,
          fightAnalysis: {
            ko: "분석 데이터를 불러올 수 없습니다.",
            en: "Analysis data unavailable.",
          },
        };
      }
    })
  );

  if (opponents.length === 0) {
    throw new Error("All opponent analyses failed");
  }

  return {
    generatedAt: new Date().toISOString(),
    koFightMatrixRank: koRank,
    lastFightDate,
    opponents,
  };
}
