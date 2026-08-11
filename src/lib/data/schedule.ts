import cachedSchedule from "@/data/cached-schedule.json";
import {
  attachFighterNamesKo,
  backfillMainEventNames,
} from "@/lib/schedule-utils";
import type { UfcSchedule } from "@/types/schedule";

import { loadFighterNamesKo } from "./fighter-names";

interface GetScheduleOptions {
  /**
   * 이미지가 없는 파이터를 UFC 선수 페이지에서 스크레이핑해 보완할지 여부.
   * 메인 페이지 프리뷰처럼 헤드샷 노출 비중이 큰 곳만 true (스크레이핑 비용이 있음).
   */
  enrichImages?: boolean;
}

/**
 * @description UFC 경기 일정 데이터를 로드한다. (메인 프리뷰·일정 페이지 공용)
 * Supabase `ufc_schedule`의 최신 row를 우선 사용하고 실패 시 `cached-schedule.json`으로 폴백한다.
 * 어느 소스든 메인 이벤트 이름을 파이트카드 풀네임으로 보정한 뒤(구버전 저장 데이터 대비)
 * `fighter_names_ko` 사전을 `nameKo`로 주입해 ko 로케일 표기를 준비한다.
 * @param options.enrichImages - 파이터 헤드샷 보완 스크레이핑 실행 여부 (기본 false)
 * @returns 파이터에 nameKo가 주입된 일정 데이터 (Supabase 또는 cached 폴백)
 */
export const getSchedule = async (
  options: GetScheduleOptions = {}
): Promise<UfcSchedule> => {
  const finalize = async (schedule: UfcSchedule): Promise<UfcSchedule> => {
    let events = schedule.events;
    if (options.enrichImages) {
      const { enrichFighterImages } =
        await import("@/lib/crawl/schedule-crawler");
      events = await enrichFighterImages(events);
    }
    return {
      ...schedule,
      events: attachFighterNamesKo(
        backfillMainEventNames(events),
        await loadFighterNamesKo()
      ),
    };
  };

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const { createServerClient } = await import("@/lib/supabase/server");
      const supabase = createServerClient();
      const { data } = await supabase
        .from("ufc_schedule")
        .select("data")
        .order("crawled_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.data) {
        const schedule = data.data as UfcSchedule;
        if (schedule.events?.length > 0) {
          return finalize(schedule);
        }
      }
    } catch {
      // Supabase 접근 실패 시 cached 폴백
    }
  }

  return finalize(cachedSchedule as UfcSchedule);
};
