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

- `/[locale]` — 메인 페이지: 선수 프로필, 전적, 영상, 뉴스, 챔피언 프리뷰 (ISR 24시간, `revalidate: 86400`)
- `/[locale]/rankings` — UFC 체급별 랭킹 페이지 (ISR 24시간, `revalidate: 86400`)
- `/[locale]/cheer` — 응원 방명록 페이지 (`force-dynamic`, 항상 최신 데이터)
- `/api/guestbook` — REST API (GET/POST/PATCH)
- `/api/cron/crawl` — Vercel Cron 엔드포인트 (매일 UTC 03:00 = KST 12:00, `CRON_SECRET` 필요)

### 다국어 (i18n)

- URL 기반 로케일: `/ko` (기본값), `/en`
- `src/middleware.ts`에서 로케일 리다이렉트 처리 (`/` → `/ko`)
- 루트 `i18n/` 디렉토리: `routing.ts` (로케일 정의), `request.ts` (메시지 로드) — `next.config.ts`에서 `createNextIntlPlugin("./i18n/request.ts")` 연결
- 번역 파일: `src/messages/{ko,en}.json` (네임스페이스: `hero`, `nav`, `guestbook` 등)
- Next.js 15+에서 `params`는 Promise — 반드시 `await params` 사용

### 데이터 흐름

- **선수 통계**: Supabase `fighter_stats` 테이블 → `src/data/cached-stats.json` 폴백. Supabase 데이터가 비정상(전적 0-0-0 등)이면 캐시로 폴백
- **YouTube 영상**: YouTube Data API v3 (`src/lib/youtube.ts`), ISR 24시간
- **뉴스**: Google News RSS 파싱 (`src/lib/news.ts`), ISR 24시간
- **방명록**: Supabase `guestbook_messages` 테이블, `/api/guestbook` API (GET/POST/PATCH)
- **UFC 크롤러**: Cheerio 스크래퍼 (`src/lib/crawl/ufc-crawler.ts`), Vercel Cron으로 매일 오전 6시 UTC 실행 (`/api/cron/crawl`). 파싱 실패 시 `throw`하여 잘못된 데이터 저장 방지. Cron 스케줄은 `vercel.json`에서 관리

### Supabase

- **서버 클라이언트** (`src/lib/supabase/server.ts`): `SUPABASE_SERVICE_ROLE_KEY` 사용, 라우트 핸들러 및 서버 컴포넌트용
- **클라이언트** (`src/lib/supabase/client.ts`): `NEXT_PUBLIC_SUPABASE_ANON_KEY` 사용
- **테이블**: `guestbook_messages` (RLS: read/insert/update), `fighter_stats` (RLS 없음, 서버 전용)

### 정적 데이터 (`src/data/`)

- `cached-stats.json` — 선수 통계 폴백 (Supabase 접근 불가 또는 크롤링 데이터 비정상 시 사용)
- `career-highlights.json` — 커리어 타임라인 이정표 (다국어)
- `fighter-bio.json` — 선수 바이오 데이터 (다국어 필드)

### 주요 컨벤션

- **스타일링**: Tailwind CSS v4, `globals.css`에 `@theme inline` 사용. 주요 색상: `#dc2626` (빨간색). 폰트: Pretendard (CDN)
- **포맷팅**: Prettier + `@trivago/prettier-plugin-sort-imports` — 큰따옴표, 80자 너비, 2칸 들여쓰기, trailing comma. Import 정렬: CSS → react → next → `@/` 별칭 → node_modules
- **경로 별칭**: `@/*` → `./src/*`
- **스크롤 애니메이션**: `useInView` 커스텀 훅 (`src/hooks/useInView.ts`) + `globals.css` CSS 키프레임 (`fade-up`, `fade-in`, `scale-in`, `slide-left`)
- **컴포넌트**: 서버 컴포넌트 기본, `"use client"`는 필요한 경우만 (애니메이션, 인터랙티브)
- **방명록 레이트 리미팅**: IP당 30초 쿨다운 (SHA256 해시). 수정 권한은 localStorage 메시지 ID + 서버 IP 검증
- **SEO**: 메인 페이지 Schema.org JSON-LD, `robots.ts`, `sitemap.ts`, `hreflang` 대체 링크

### 환경 변수

공개: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
비밀: `YOUTUBE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `CRON_SECRET`, `GOOGLE_SITE_VERIFICATION`
