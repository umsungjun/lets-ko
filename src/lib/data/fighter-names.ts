import { cache } from "react";

import seedFighterNamesKo from "@/data/fighter-names-ko.json";

/**
 * @description 파이터 영문명 → 한국어명 사전 로드. (일정·랭킹 공용)
 * 크롤이 쌓은 `fighter_names_ko` 행 위에 리포지토리 시드를 덮어써 병합한다.
 * 시드가 이기는 이유는 사람이 검수해 커밋한 값이 기계 번역보다 우선이어야 하기 때문 —
 * 오역을 발견하면 시드 JSON 한 줄만 고쳐 배포하면 되고 DB 행은 손대지 않아도 된다
 * (`confirmed-fight.json` 수동 오버라이드와 같은 방향). 시드 덕분에 배포 직후·DB 미접근
 * 로컬에서도 한국어 표기가 동작하고, DB에는 시드에 없는 신규 선수만 쌓인다.
 * `cache()`로 감싸 한 요청에서 여러 로더가 호출해도 쿼리는 1회.
 * @returns 영문명 → 한국어명 사전
 */
export const loadFighterNamesKo = cache(
  async (): Promise<Record<string, string>> => {
    const seed = seedFighterNamesKo as Record<string, string>;

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return { ...seed };
    }

    const dict: Record<string, string> = {};
    try {
      const { createServerClient } = await import("@/lib/supabase/server");
      const supabase = createServerClient();
      const { data } = await supabase
        .from("fighter_names_ko")
        .select("name_en, name_ko");

      for (const row of data ?? []) {
        if (row.name_en && row.name_ko) dict[row.name_en] = row.name_ko;
      }
    } catch {
      // Supabase 접근 실패 시 시드 사전만 사용
    }

    return { ...dict, ...seed };
  }
);

/**
 * @description 새로 번역된 이름을 `fighter_names_ko` 테이블에 upsert. (크롤 전용)
 * 이미 있는 이름은 덮어쓰지 않고 무시해 한 번 정해진 표기를 고정한다.
 * @param entries - 영문명 → 한국어명 (신규 항목만)
 * @throws Supabase insert 실패 시
 */
export const saveFighterNamesKo = async (
  entries: Record<string, string>
): Promise<void> => {
  const rows = Object.entries(entries).map(([name_en, name_ko]) => ({
    name_en,
    name_ko,
  }));
  if (rows.length === 0) return;

  const { createServerClient } = await import("@/lib/supabase/server");
  const { error } = await createServerClient()
    .from("fighter_names_ko")
    .upsert(rows, { onConflict: "name_en", ignoreDuplicates: true });
  if (error) throw error;
};
