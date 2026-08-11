import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL 환경변수가 필요합니다.");
  console.error(
    "Supabase Dashboard > Settings > Database > Connection string (URI) 에서 확인하세요."
  );
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function setup() {
  console.log("테이블 생성 중...\n");

  // 방명록 메시지 테이블
  await sql`
    CREATE TABLE IF NOT EXISTS guestbook_messages (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      nickname TEXT NOT NULL,
      message TEXT NOT NULL CHECK (char_length(message) <= 500),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      ip_hash TEXT
    )
  `;
  console.log("  guestbook_messages 테이블 생성 완료");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_guestbook_created_at
    ON guestbook_messages(created_at DESC)
  `;

  await sql`ALTER TABLE guestbook_messages ENABLE ROW LEVEL SECURITY`;
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'guestbook_messages' AND policyname = 'read'
      ) THEN
        CREATE POLICY "read" ON guestbook_messages FOR SELECT USING (true);
      END IF;
    END $$
  `;
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'guestbook_messages' AND policyname = 'insert'
      ) THEN
        CREATE POLICY "insert" ON guestbook_messages FOR INSERT WITH CHECK (true);
      END IF;
    END $$
  `;
  console.log("  RLS 정책 설정 완료");

  // 크롤링 데이터 테이블
  await sql`
    CREATE TABLE IF NOT EXISTS fighter_stats (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      data JSONB NOT NULL,
      crawled_at TIMESTAMPTZ DEFAULT NOW(),
      source TEXT DEFAULT 'ufc_korea'
    )
  `;
  console.log("  fighter_stats 테이블 생성 완료");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_fighter_stats_crawled_at
    ON fighter_stats(crawled_at DESC)
  `;

  // UFC 랭킹 데이터 테이블
  await sql`
    CREATE TABLE IF NOT EXISTS ufc_rankings (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      data JSONB NOT NULL,
      crawled_at TIMESTAMPTZ DEFAULT NOW(),
      source TEXT DEFAULT 'ufc_korea'
    )
  `;
  console.log("  ufc_rankings 테이블 생성 완료");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_ufc_rankings_crawled_at
    ON ufc_rankings(crawled_at DESC)
  `;

  // AI 상대 예측 테이블
  await sql`
    CREATE TABLE IF NOT EXISTS opponent_predictions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      data JSONB NOT NULL,
      crawled_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("  opponent_predictions 테이블 생성 완료");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_opponent_predictions_crawled_at
    ON opponent_predictions(crawled_at DESC)
  `;

  // 파이터 영문명 → 한국어명 사전 (일정·랭킹 공용).
  // 한 번 정해진 표기를 고정하려고 name_en을 PK로 두고 크롤은 신규 행만 추가한다.
  await sql`
    CREATE TABLE IF NOT EXISTS fighter_names_ko (
      name_en TEXT PRIMARY KEY,
      name_ko TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("  fighter_names_ko 테이블 생성 완료");

  // 방명록 리액션 테이블
  await sql`
    CREATE TABLE IF NOT EXISTS guestbook_reactions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      message_id UUID NOT NULL REFERENCES guestbook_messages(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL CHECK (char_length(emoji) <= 10),
      ip_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(message_id, emoji, ip_hash)
    )
  `;
  console.log("  guestbook_reactions 테이블 생성 완료");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_reactions_message_id
    ON guestbook_reactions(message_id)
  `;

  await sql`ALTER TABLE guestbook_reactions ENABLE ROW LEVEL SECURITY`;
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'guestbook_reactions' AND policyname = 'read'
      ) THEN
        CREATE POLICY "read" ON guestbook_reactions FOR SELECT USING (true);
      END IF;
    END $$
  `;

  console.log("\n모든 테이블 생성이 완료되었습니다.");
  await sql.end();
}

setup().catch((err) => {
  console.error("오류 발생:", err.message);
  process.exit(1);
});
