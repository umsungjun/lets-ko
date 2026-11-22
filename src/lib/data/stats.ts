import cachedStats from "@/data/cached-stats.json";
import type { FighterStats } from "@/types/fighter";

/**
 * @description 고석현 스탯을 로드한다. 메인·예측 페이지 공용.
 * Supabase `fighter_stats` 최신 행을 쓰되 전적이 0-0-0이면 크롤 실패로 보고 `cached-stats.json`으로 폴백한다.
 * 외부 랭킹·전적 히스토리가 빈 필드만 캐시로 채운다.
 * @returns 선수 스탯 (Supabase 또는 캐시)
 */
export const getFighterStats = async (): Promise<FighterStats> => {
  const cached = cachedStats as FighterStats;

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const { createServerClient } = await import("@/lib/supabase/server");
      const supabase = createServerClient();
      const { data } = await supabase
        .from("fighter_stats")
        .select("data")
        .order("crawled_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.data) {
        const stats = data.data as FighterStats;
        if (stats.record.wins + stats.record.losses + stats.record.draws > 0) {
          return {
            ...stats,
            externalRankings: stats.externalRankings?.length
              ? stats.externalRankings
              : cached.externalRankings,
            fightHistory: stats.fightHistory?.length
              ? stats.fightHistory
              : cached.fightHistory,
          };
        }
      }
    } catch {
      // Supabase 접근 실패 시 캐시 폴백
    }
  }

  return cached;
};
