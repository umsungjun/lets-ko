# LET'S KO

UFC 웰터급 파이터 **고석현**(The Korean Tyson) 선수의 비공식 팬 응원 사이트입니다.

## 만든 이유

매주 UFC를 시청하는 게 제 취미입니다. 그러다 한국인 웰터급 파이터 고석현 선수가 죽도록 열심히 싸우는 모습에 반해 팬이 되었습니다.

단순히 응원하는 것을 넘어서, 제 취미와 연결해 선수에게 실질적으로 도움이 될 수 있는 방법을 고민했습니다. 그래서 누구나 익명으로 응원 메시지를 남길 수 있는 팬 페이지를 만들게 되었습니다.

**이 사이트는 수익을 목적으로 하지 않으며, 순수하게 고석현 선수를 응원하기 위해 제작되었습니다.**

## 주요 기능

- **선수 프로필** — 고석현 선수의 기본 정보, 전적, 스탯
- **경기 기록** — 전체 15경기(13승 2패) 상세 기록
- **커리어 하이라이트** — 주요 커리어 타임라인
- **관련 YouTube 영상** — YouTube API를 통한 최신 영상 자동 수집 (하루 1회 갱신)
- **관련 뉴스** — Google News RSS를 통한 최신 뉴스 자동 수집 (하루 1회 갱신)
- **응원하기** — 익명 방명록 (닉네임 자동 생성, 수정 가능)
- **다국어 지원** — 한국어(기본) / 영어

## 기술 스택

| 구분 | 기술 |
|---|---|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS v4 |
| 데이터베이스 | Supabase (PostgreSQL) |
| 다국어 | next-intl |
| 배포 | Vercel |

## 프로젝트 구조

```
src/
├── app/
│   ├── [locale]/
│   │   ├── page.tsx          # 메인 페이지
│   │   └── cheer/page.tsx    # 응원하기 페이지
│   ├── api/
│   │   ├── guestbook/        # 응원 메시지 API (GET/POST/PATCH)
│   │   └── cron/crawl/       # UFC 전적 크롤링 (일 1회)
│   ├── robots.ts             # SEO
│   └── sitemap.ts            # SEO
├── components/
│   ├── fighter/              # 선수 관련 컴포넌트
│   ├── guestbook/            # 응원 메시지 컴포넌트
│   └── layout/               # Header, Footer
├── lib/
│   ├── youtube.ts            # YouTube API 연동
│   ├── news.ts               # Google News RSS 파싱
│   ├── supabase/             # Supabase 클라이언트
│   └── crawl/                # UFC 사이트 크롤러
├── messages/
│   ├── ko.json               # 한국어 번역
│   └── en.json               # 영어 번역
└── data/                     # 정적 데이터 (전적, 바이오 등)
```

## 로컬 개발

```bash
# 의존성 설치
pnpm install

# 환경변수 설정
cp .env.local.example .env.local
# .env.local에 Supabase, YouTube API 키 입력

# DB 테이블 생성
npx tsx --env-file=.env.local scripts/setup-db.ts

# 개발 서버 실행
pnpm dev
```

## 연락처

문의나 피드백은 **umseongjun@naver.com**으로 보내주시면 됩니다.

## 면책 조항

이 사이트는 비공식 팬 사이트이며, UFC 또는 고석현 선수 측과 공식적인 관계가 없습니다.
