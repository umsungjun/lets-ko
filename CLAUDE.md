# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 명령어

```bash
pnpm dev          # 개발 서버 실행 (localhost:3000)
pnpm build        # 프로덕션 빌드
pnpm start        # 프로덕션 서버 실행
pnpm lint         # ESLint 검사
pnpm prettier --write "src/**/*.{ts,tsx,json,css}"  # 전체 포맷팅
```

데이터베이스 셋업: `npx tsx --env-file=.env.local scripts/setup-db.ts`

## 아키텍처

**LET'S KO**는 UFC 파이터 고석현 팬 응원 사이트로, 다국어(ko/en)를 지원합니다. Next.js 16 App Router + TypeScript + Tailwind CSS v4 + Supabase + next-intl로 구축되었습니다.

### 페이지 & 라우팅

- `/[locale]` — 메인 페이지: (확정 경기 시 최상단 D-day 배너 `NextFightBanner`) 선수 프로필, AI 예측/확정 경기, 전적, 영상, 뉴스, 챔피언 프리뷰, 다가오는 UFC 이벤트 프리뷰 (ISR 30분, `revalidate: 1800`)
- `/[locale]/schedule` — UFC 경기 일정 페이지: 예정 이벤트 목록 + AI 메인 이벤트 승부 예측 (ISR 24시간)
- `/[locale]/predictions` — AI 상대 예측 페이지 (ISR 24시간)
- `/[locale]/rankings` — UFC 체급별 랭킹 페이지 (ISR 24시간)
- `/[locale]/cheer` — 응원 방명록 페이지 (`force-dynamic`, 항상 최신 데이터)
- `/api/guestbook` — REST API (GET/POST/PATCH/DELETE)
- `/api/guestbook/reactions` — 이모지 리액션 토글 (POST), 허용 이모지: 👊🔥💪❤️👏
- `/api/og` — OG 이미지 동적 생성 (Node.js 런타임, `ImageResponse`)
- `/api/cron/crawl` — Vercel Cron 엔드포인트 (매일 UTC 05:00 = KST 14:00, `CRON_SECRET` 필요)

### 다국어 (i18n)

- URL 기반 로케일: `/ko` (기본값), `/en`
- `src/middleware.ts`에서 로케일 리다이렉트 처리 (`/` → `/ko`)
- 루트 `i18n/` 디렉토리: `routing.ts` (로케일 정의), `request.ts` (메시지 로드) — `next.config.ts`에서 `createNextIntlPlugin("./i18n/request.ts")` 연결
- 번역 파일: `src/messages/{ko,en}.json` (네임스페이스: `hero`, `nav`, `guestbook`, `schedule` 등)
- Next.js 15+에서 `params`는 Promise — 반드시 `await params` 사용

### 데이터 흐름

**Supabase → 캐시 JSON 폴백** 패턴이 모든 데이터에 공통 적용됩니다.

- **선수 통계**: `fighter_stats` 테이블 → `cached-stats.json`. 전적 0-0-0 등 비정상 데이터면 캐시로 폴백
- **UFC 랭킹**: `ufc_rankings` 테이블 → `cached-rankings.json`. 로더는 `src/lib/data/getRankings()` 공통 함수 사용(메인·랭킹 페이지 공유). UFC 페이지 반응형 중복 마크업으로 체급이 2번 저장되는 문제를 `dedupeDivisions()`(divisionSlug 기준)로 방어 — 미적용 시 `ChampionsPreview`에서 React duplicate key 에러 발생
- **AI 상대 예측**: `opponent_predictions` 테이블 → `cached-predictions.json`. 로더 `src/lib/data/getPredictions()`. `confirmedFight`(고석현 확정 경기)가 있으면 opponents 이미지 조건과 무관하게 채택. 수동 오버라이드 `confirmed-fight.json`이 있으면 자동 감지보다 우선
- **고석현 확정 경기**: 크롤 시 `detectKoConfirmedFight()`가 일정에서 고석현 매치를 자동 감지해 `opponent_predictions.data.confirmedFight`에 부착 → `ConfirmedFightCard`/`NextFightBanner`로 표시. 자동 감지 실패 대비 `confirmed-fight.json` 수동 안전망
- **UFC 경기 일정 + AI 승부 예측**: `ufc_schedule` 테이블 → `cached-schedule.json`. 두 데이터(이벤트 + 예측)를 하나의 JSONB blob(`UfcSchedule`)으로 저장
- **YouTube 영상**: YouTube Data API v3 (`src/lib/youtube.ts`), ISR 24시간
- **뉴스**: Google News RSS 파싱 (`src/lib/news.ts`), ISR 24시간
- **방명록**: `guestbook_messages` 테이블, `/api/guestbook` API
- **닉네임 생성**: `src/lib/nickname-generator.ts` — 로케일 기반 랜덤 닉네임 (예: "행복한 석현")

### UFC 크롤러 체인 (`/api/cron/crawl`)

Vercel Cron 매일 UTC 05:00 (KST 14:00) 실행. `maxDuration = 60`. 4단계 순차 실행, 부분 실패 시 HTTP 207:

1. `crawlUfcStats()` — 선수 전적/스탯. 파싱 실패 시 `throw` (잘못된 데이터 저장 방지)
2. `crawlUfcRankings()` — UFC 전 체급 랭킹
3. `generatePredictions()` — AI 상대 예측 (Gemini)
4. **UFC 일정 + 예측**: `crawlUfcSchedule()` → `generateSchedulePredictions()` → `ufc_schedule` 저장
   - 일정 크롤: CloudFront CDN API(`d29dxerjsp82wz.cloudfront.net`)는 폐기됨(404) → 실질적으로 `www.ufc.com/events` HTML 파싱이 주 소스
   - 예측 생성: `eventId`로 중복 체크 — 기존 예측 재사용, 새 이벤트만 Gemini 호출
   - 파이터 이미지: `enrichFighterImages()` — UFC 선수 페이지 병렬 스크레이핑 (최대 20명)
5. **고석현 확정 경기 감지** (Phase 2.5): `detectKoConfirmedFight(events, existingConfirmed)`가 일정에서 고석현 매치(`isKoSeokhyeon` 매처)를 찾아 `confirmedFight` 생성 후 `opponent_predictions.data`에 부착. 상대·대회가 기존과 같으면 Gemini 재호출 생략, 신규/변경 시에만 `analyzeConfirmedOpponent()`로 한국어명·국적·스타일 보강. 감지 실패는 non-blocking

크롤 완료 후 `revalidatePath()` + `fetch` 워밍으로 `/`, `/schedule`, `/predictions`, `/rankings` 한/영 캐시 갱신.

> **⚠️ 예약 cron은 외부 스케줄러로 실행** — Vercel Hobby 플랜은 `vercel.json`의 예약 cron을 자동 실행하지 않음(수동 Run만 동작). 따라서 `.github/workflows/crawl.yml`(GitHub Actions)이 매일 UTC 05:00 `/api/cron/crawl`을 호출. 필요 Secrets: `SITE_URL`, `CRON_SECRET`. 배포 직후 `workflow_dispatch`로 1회 수동 실행하면 즉시 반영

> **⚠️ Vercel 함수 리전은 반드시 US여야 함** (예: `sfo1`). UFC는 `kr.ufc.com`을 봇/지오 차단하므로 서울(`icn1`) 리전이면 모든 UFC 크롤러가 403으로 실패. 따라서 크롤러는 전부 `www.ufc.com`을 사용하며 영문 페이지가 반환됨 — 스탯 파서는 영/한 라벨을 모두 처리하고, 랭킹은 영문 체급명을 `DIVISION_NAME_KO`로 한글화함. Hobby 플랜은 리전 1개 제한이라 cron만 분리 불가 → 프로젝트 전체가 US 리전 (대시보드 Settings → Functions → Region). 트레이드오프: 동적 라우트(방명록 등)의 한국 사용자 지연 약간 증가, ISR/정적 페이지는 엣지 서빙이라 영향 없음.

### Supabase

- **서버 클라이언트** (`src/lib/supabase/server.ts`): `SUPABASE_SERVICE_ROLE_KEY` 사용, 라우트 핸들러 및 서버 컴포넌트용
- **클라이언트** (`src/lib/supabase/client.ts`): `NEXT_PUBLIC_SUPABASE_ANON_KEY` 사용
- **테이블**:
  - `guestbook_messages` (RLS: read/insert/update/delete)
  - `guestbook_reactions` (이모지 토글, IP당 1개)
  - `fighter_stats` (RLS 없음, 서버 전용)
  - `ufc_rankings` (RLS 없음, 서버 전용)
  - `ufc_schedule` (RLS 없음, 서버 전용) — `{ data: UfcSchedule }` JSONB, `crawled_at` 내림차순 인덱스

### OG 이미지

- **동적 생성**: `/api/og/route.tsx` — Node.js 런타임 필수 (`runtime = "edge"` 불가). `fs.readFileSync`로 `public/images/ko-seokhyeon.png` 로드 후 base64 변환
- **정적 파일**: `public/og.png` — 메타데이터에서 이 파일 참조
- **locale prefix 우회**: `[locale]/layout.tsx`에서 `<head>`에 직접 `<meta property="og:image">` 주입

### 정적 데이터 (`src/data/`)

- `cached-stats.json` — 선수 통계 폴백. `externalRankings` 배열 포함 (FightMatrix 수동 확인값)
- `cached-rankings.json` — UFC 전 체급 랭킹 폴백
- `cached-schedule.json` — UFC 경기 일정 + AI 예측 폴백 (`UfcSchedule` 구조). 배포 초기 또는 Supabase 미접근 시 사용
- `cached-predictions.json` — AI 상대 예측 폴백
- `confirmed-fight.json` — 고석현 확정 경기 수동 오버라이드 안전망. 자동 감지가 놓칠 때만 `ConfirmedFight` 구조로 채우고, 평소엔 `{}`로 비워둠(비어있으면 무시)
- `career-highlights.json` — 커리어 타임라인 이정표 (다국어)
- `fighter-bio.json` — 선수 바이오 데이터 (다국어)
- `videos.json` — YouTube API 할당량 초과 시 폴백 영상 메타데이터

### 주요 컨벤션

- **스타일링**: Tailwind CSS v4, `globals.css`에 `@theme inline` 사용. 주요 색상: `#dc2626`. 폰트: Pretendard (CDN)
- **포맷팅**: Prettier + `@trivago/prettier-plugin-sort-imports` — 큰따옴표, 80자 너비, 2칸 들여쓰기, trailing comma. Import 정렬: CSS → react → next → `@/` 별칭 → node_modules
- **경로 별칭**: `@/*` → `./src/*`
- **스크롤 애니메이션**: `useInView` 커스텀 훅 (`src/hooks/useInView.ts`) + CSS 키프레임 (`fade-up`, `fade-in`, `scale-in`, `slide-left`). 모바일 IntersectionObserver 미감지 대비 800ms fallback timer 포함
- **컴포넌트**: 서버 컴포넌트 기본, `"use client"`는 애니메이션·인터랙티브에만
- **TypeScript 타입**: `interface` — Props, API 계약 등 외부 계약. `type` — 유니온, 유틸리티 조합
- **방명록 레이트 리미팅**: IP당 30초 쿨다운 (SHA256 해시). 수정/삭제는 localStorage ID + 서버 IP 검증
- **방명록 UI**: 이모지 리액션 `max-w-0 → max-w-72` 슬라이딩 애니메이션
- **애널리틱스**: Microsoft Clarity (ID: `vkw0n969lk`, `[locale]/layout.tsx` head 인라인)
- **SEO**: 메인 페이지 Schema.org JSON-LD, `robots.ts`, `sitemap.ts`, `hreflang`
- **DOM 사이드 이펙트**: 컴포넌트 외부 DOM 변경은 반드시 `useEffect` 안에서
- **에러 바운더리**: `[locale]/error.tsx`(런타임 예외, 재시도), `[locale]/not-found.tsx`(404), `global-error.tsx`(레이아웃 예외). 작은 예외가 전체 500으로 확대되는 것을 방지. 데이터 로더/렌더는 옵셔널 체이닝으로 방어(`schedule.predictions ?? []`, `prediction.analysis?.[lang] ?? ""`)
- **날짜 포맷**: 사용자에게 보이는 모든 날짜·예정 이벤트 "오늘" 비교는 `src/lib/date-utils.ts` 경유 (`formatKstLongDate`/`formatEventDate`/`formatKstDate`/`getKstTodayStr`/`getKstDaysUntil`). `getKstDaysUntil(dateStr)`는 D-day 계산(오늘=0, 미래=양수, 과거=음수) — 확정 경기 D-day 배너·카드에 사용. `toLocaleDateString`/`toISOString().split` 직접 호출 금지 — timeZone 미지정 시 Vercel 서버리스(UTC) 기준이라 KST와 하루 어긋남. 저장용 타임스탬프(`crawledAt`/`updatedAt`/`generatedAt`)는 UTC `toISOString()` 유지
- **JSDoc**: 새로 작성하는 컴포넌트·유틸 함수에 반드시 JSDoc 작성. 설명은 한국어로. 컴포넌트는 `@description`, `@param`(props 각각), 유틸 함수는 `@description`, `@param`, `@returns`, 필요 시 `@throws`. 인터페이스 필드는 인라인 `/** */` 주석.

  ```ts
  // 컴포넌트 예시
  /**
   * @description 역할 설명
   * @param props.locale - "ko" | "en"
   */
  export default function MyComponent({ locale }: Props) {}

  // 유틸 함수 예시
  /**
   * @description 함수 역할 설명
   * @param name - 파이터 이름 (영문)
   * @returns 슬러그 문자열
   * @throws 네트워크 오류 시
   */
  export async function myUtil(name: string): Promise<string> {}
  ```

### Gemini AI 연동 (`src/lib/gemini.ts`)

- 모델: `gemini-2.5-flash`
- `analyzeOpponent()` — 상대 선수 분석 (예측 페이지용)
- `analyzeMainEvent(fighter1, fighter2, eventName, weightClass?)` — UFC 이벤트 메인 매치 승부 예측. `winProbability`는 승자 기준 50~100 보장
- `analyzeConfirmedOpponent(nameEn, record?)` — 고석현 확정 상대의 한국어명·국적·파이팅 스타일 보강 (확정 경기 카드용, 일정 크롤엔 없는 정보)

### 테스트

테스트 프레임워크 미설정. `pnpm build`로 타입 체크 및 빌드 검증.

### 환경 변수

공개: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`  
비밀: `YOUTUBE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `CRON_SECRET`, `GOOGLE_SITE_VERIFICATION`, `GOOGLE_GEMINI_API_KEY`

> **주의**: `NEXT_PUBLIC_SITE_URL`은 path 없는 origin만 저장 (`https://example.com`). 코드에서 `new URL(raw).origin`으로 정규화. path 포함 시 OG 이미지 URL에 locale prefix 중복 추가됨
