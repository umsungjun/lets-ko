import cachedRankings from "@/data/cached-rankings.json";
import type { DivisionRanking, UfcRankings } from "@/types/rankings";

/**
 * @description 체급 목록을 divisionSlug 기준으로 중복 제거한다.
 * UFC /rankings 페이지는 반응형 마크업으로 각 체급 그룹을 2번 렌더해 크롤 시 체급이 중복 저장되는데,
 * 그대로 렌더하면 React "duplicate key" 경고(key={divisionSlug})가 발생한다. 중복 시 순위 데이터가 더 많은 쪽을 유지.
 * @param divisions - 원본 체급 배열 (중복 가능)
 * @returns slug당 1개로 정리된 체급 배열 (입력 순서 보존)
 */
export const dedupeDivisions = (
  divisions: DivisionRanking[]
): DivisionRanking[] => {
  const bySlug = new Map<string, DivisionRanking>();
  for (const d of divisions) {
    const existing = bySlug.get(d.divisionSlug);
    // 중복이면 rankedFighters가 더 많은(빈 테이블 아닌) 쪽 유지
    if (!existing || d.rankedFighters.length > existing.rankedFighters.length) {
      bySlug.set(d.divisionSlug, d);
    }
  }
  return [...bySlug.values()];
};

/**
 * @description UFC 랭킹 데이터를 로드한다.
 * Supabase `ufc_rankings`의 최신 row를 우선 사용하되(체급 6개 이상), 실패 시 `cached-rankings.json`으로 폴백한다.
 * 어느 소스든 divisions를 slug 기준 dedup해 중복 키 렌더 에러를 방지한다. (메인·랭킹 페이지 공용)
 * @returns UFC 랭킹 데이터 (Supabase 또는 cached 폴백, divisions 중복 제거됨)
 */
export const getRankings = async (): Promise<UfcRankings> => {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const { createServerClient } = await import("@/lib/supabase/server");
      const supabase = createServerClient();
      const { data } = await supabase
        .from("ufc_rankings")
        .select("data")
        .order("crawled_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.data) {
        const rankings = data.data as UfcRankings;
        if (rankings.divisions && rankings.divisions.length >= 6) {
          return {
            ...rankings,
            divisions: dedupeDivisions(rankings.divisions),
          };
        }
      }
    } catch {
      // Supabase 접근 실패 시 cached 폴백
    }
  }

  const cached = cachedRankings as UfcRankings;
  return { ...cached, divisions: dedupeDivisions(cached.divisions) };
};
