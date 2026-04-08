import { createClient } from "@supabase/supabase-js";

// 환경변수에서 직접 로드
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

// Supabase REST API 클라이언트 (DB 직접 연결이 아닌 HTTP)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log("AI 상대 예측 생성 시작...\n");

  // 1. 고석현 스탯 가져오기
  console.log("1. 고석현 스탯 로딩...");
  let koStats;
  try {
    const { data } = await supabase
      .from("fighter_stats")
      .select("data")
      .order("crawled_at", { ascending: false })
      .limit(1)
      .single();
    if (data?.data) {
      koStats = data.data;
      console.log(
        `   전적: ${koStats.record.wins}-${koStats.record.losses}-${koStats.record.draws}`
      );
    }
  } catch {
    console.log("   Supabase 접근 실패, 캐시 사용");
  }

  if (!koStats) {
    const cached = await import("../src/data/cached-stats.json");
    koStats = cached.default;
    console.log(
      `   캐시 전적: ${koStats.record.wins}-${koStats.record.losses}-${koStats.record.draws}`
    );
  }

  // 2. 예측 생성
  console.log("\n2. 예측 생성 중 (Gemini API 4회 호출)...");
  const { generatePredictions } =
    await import("../src/lib/crawl/prediction-generator");
  const predictions = await generatePredictions(koStats);

  console.log(`\n3. 예측 완료! 후보 ${predictions.opponents.length}명:`);
  for (const op of predictions.opponents) {
    console.log(
      `   - ${op.name.ko} (${op.name.en}) | #${op.fightMatrixRank} | ${op.fightingStyle.ko} | 승률 ${op.winProbability}%`
    );
  }

  // 3. Supabase에 저장
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    console.log("\n4. Supabase에 저장 중...");
    const { error } = await supabase
      .from("opponent_predictions")
      .insert({ data: predictions });
    if (error) {
      console.error("   저장 실패:", error.message);
    } else {
      console.log("   저장 완료!");
    }
  }

  // 4. 캐시 파일 업데이트
  const fs = await import("fs");
  const path = await import("path");
  const cachePath = path.join(
    process.cwd(),
    "src/data/cached-predictions.json"
  );
  fs.writeFileSync(cachePath, JSON.stringify(predictions, null, 2));
  console.log("\n5. cached-predictions.json 업데이트 완료");

  console.log("\n완료!");
}

main().catch((err) => {
  console.error("오류 발생:", err);
  process.exit(1);
});
