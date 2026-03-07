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
- `/api/guestbook` — REST API (GET/POST/PATCH/DELETE)
- `/api/guestbook/reactions` — 이모지 리액션 토글 (POST), 허용 이모지: 👊🔥💪❤️👏
- `/api/og` — OG 이미지 동적 생성 (Node.js 런타임, `ImageResponse`)
- `/api/cron/crawl` — Vercel Cron 엔드포인트 (매일 UTC 03:00 = KST 12:00, `CRON_SECRET` 필요)

### 다국어 (i18n)

- URL 기반 로케일: `/ko` (기본값), `/en`
- `src/middleware.ts`에서 로케일 리다이렉트 처리 (`/` → `/ko`)
- 루트 `i18n/` 디렉토리: `routing.ts` (로케일 정의), `request.ts` (메시지 로드) — `next.config.ts`에서 `createNextIntlPlugin("./i18n/request.ts")` 연결
- 번역 파일: `src/messages/{ko,en}.json` (네임스페이스: `hero`, `nav`, `guestbook` 등)
- Next.js 15+에서 `params`는 Promise — 반드시 `await params` 사용

### 데이터 흐름

- **선수 통계**: Supabase `fighter_stats` 테이블 → `src/data/cached-stats.json` 폴백. Supabase 데이터가 비정상(전적 0-0-0 등)이면 캐시로 폴백
- **YouTube 영상**: YouTube Data API v3 (`src/lib/youtube.ts`), ISR 24시간. 재생은 사이트 내 모달로 `youtube-nocookie.com` 임베드
- **뉴스**: Google News RSS 파싱 (`src/lib/news.ts`), ISR 24시간
- **방명록**: Supabase `guestbook_messages` 테이블, `/api/guestbook` API (GET/POST/PATCH/DELETE)
- **UFC 크롤러**: Vercel Cron으로 매일 오전 3시 UTC 실행 (`/api/cron/crawl`). Cron 스케줄은 `vercel.json`에서 관리. 두 크롤러가 순차 실행되며, 부분 실패 시 HTTP 207 반환:
  - `crawlUfcStats()` (`src/lib/crawl/ufc-crawler.ts`) — 선수 전적/스탯 크롤. 파싱 실패 시 `throw`하여 잘못된 데이터 저장 방지
  - `crawlUfcRankings()` (`src/lib/crawl/rankings-crawler.ts`) — UFC 전 체급 랭킹 크롤
  - 크롤 후 `revalidatePath()`로 `/ko`, `/en`, `/ko/rankings`, `/en/rankings` ISR 캐시 무효화
- **외부 랭킹**: UFC 크롤 후 FightMatrix에서 랭킹 크롤, 결과를 `FighterStats.externalRankings`에 저장. 실패해도 메인 크롤 중단 없음. Supabase 데이터에 `externalRankings`가 없으면 `cached-stats.json`에서 병합 (page.tsx `getFighterStats()`). Tapology는 Cloudflare 차단으로 제거됨
- **닉네임 생성**: `src/lib/nickname-generator.ts` — 방명록 작성 시 로케일 기반 랜덤 닉네임 생성 (예: "행복한 석현", "Happy Seokhyeon")

### Supabase

- **서버 클라이언트** (`src/lib/supabase/server.ts`): `SUPABASE_SERVICE_ROLE_KEY` 사용, 라우트 핸들러 및 서버 컴포넌트용
- **클라이언트** (`src/lib/supabase/client.ts`): `NEXT_PUBLIC_SUPABASE_ANON_KEY` 사용
- **테이블**: `guestbook_messages` (RLS: read/insert/update/delete), `guestbook_reactions` (이모지 토글, IP당 1개), `fighter_stats` (RLS 없음, 서버 전용), `ufc_rankings` (체급별 랭킹, 서버 전용)

### OG 이미지

- **동적 생성**: `/api/og/route.tsx` — Node.js 런타임 필수 (`runtime = "edge"` 불가). `fs.readFileSync`로 `public/images/ko-seokhyeon.png` 로드 후 base64 변환
- **정적 파일**: `public/og.png` — 동적 라우트 대신 이 파일을 메타데이터에서 참조
- **locale prefix 우회**: Next.js가 같은 origin URL에 locale prefix를 자동 추가하는 동작을 피하기 위해 `[locale]/layout.tsx`에서 `<head>`에 직접 `<meta property="og:image">` 주입

### 정적 데이터 (`src/data/`)

- `cached-stats.json` — 선수 통계 폴백 (Supabase 접근 불가 또는 크롤링 데이터 비정상 시 사용). `externalRankings` 배열 포함 (FightMatrix 최신 수동 확인값)
- `cached-rankings.json` — UFC 전 체급 랭킹 폴백 (Supabase 접근 불가 시 사용)
- `career-highlights.json` — 커리어 타임라인 이정표 (다국어)
- `fighter-bio.json` — 선수 바이오 데이터 (다국어 필드)
- `videos.json` — 정적 비디오 메타데이터 (YouTube API 할당량 초과 시 폴백)

### 주요 컨벤션

- **스타일링**: Tailwind CSS v4, `globals.css`에 `@theme inline` 사용. 주요 색상: `#dc2626` (빨간색). 폰트: Pretendard (CDN)
- **포맷팅**: Prettier + `@trivago/prettier-plugin-sort-imports` — 큰따옴표, 80자 너비, 2칸 들여쓰기, trailing comma. Import 정렬: CSS → react → next → `@/` 별칭 → node_modules
- **경로 별칭**: `@/*` → `./src/*`
- **스크롤 애니메이션**: `useInView` 커스텀 훅 (`src/hooks/useInView.ts`) + `globals.css` CSS 키프레임 (`fade-up`, `fade-in`, `scale-in`, `slide-left`). 모바일 IntersectionObserver 미감지 대비 800ms fallback timer 포함
- **컴포넌트**: 서버 컴포넌트 기본, `"use client"`는 필요한 경우만 (애니메이션, 인터랙티브)
- **방명록 레이트 리미팅**: IP당 30초 쿨다운 (SHA256 해시). 수정/삭제 권한은 localStorage 메시지 ID + 서버 IP 검증
- **방명록 UI**: 댓글 작성 폼이 목록 최상단 위치. 이모지 리액션은 버튼 클릭 시 `max-w-0 → max-w-72` 슬라이딩 애니메이션으로 펼침. 이모지 피커(1행)와 리액션 카운트 배지(2행) 분리
- **애널리틱스**: Microsoft Clarity 스크립트 (`[locale]/layout.tsx` `<head>`에 인라인 삽입, ID: `vkw0n969lk`)
- **SEO**: 메인 페이지 Schema.org JSON-LD, `robots.ts`, `sitemap.ts`, `hreflang` 대체 링크
- **DOM 사이드 이펙트**: `document.body.style` 등 컴포넌트 외부 DOM 변경은 반드시 `useEffect` 안에서 처리 (ESLint `react-hooks/immutability` 규칙)

### 테스트

테스트 프레임워크 미설정. `pnpm build`로 타입 체크 및 빌드 검증.

### 환경 변수

공개: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
비밀: `YOUTUBE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `CRON_SECRET`, `GOOGLE_SITE_VERIFICATION`

> **주의**: `NEXT_PUBLIC_SITE_URL`은 path 없는 origin만 저장 (`https://example.com`). path 포함 시 (`https://example.com/ko`) OG 이미지 URL에 locale prefix가 중복 추가됨. 코드에서 `new URL(raw).origin`으로 정규화
