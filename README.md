# LET'S KO

UFC 웰터급 파이터 **고석현**(The Korean Tyson) 선수의 비공식 팬 응원 사이트입니다.

## 만든 이유

매주 UFC를 시청하는 게 제 취미입니다. 그러다 한국인 웰터급 파이터 고석현 선수가 죽도록 열심히 싸우는 모습에 반해 팬이 되었습니다.

단순히 응원하는 것을 넘어서, 제 취미와 연결해 선수에게 실질적으로 도움이 될 수 있는 방법을 고민했습니다. 그래서 누구나 익명으로 응원 메시지를 남길 수 있는 팬 페이지를 만들게 되었습니다.

**이 사이트는 수익을 목적으로 하지 않으며, 순수하게 고석현 선수를 응원하기 위해 제작되었습니다.**

## 주요 기능

- **선수 프로필** — 고석현 선수의 기본 정보, 전적, 스탯
- **경기 기록** — 전체 경기 상세 기록 (결과·방식·라운드·날짜)
- **커리어 하이라이트** — 주요 커리어 타임라인
- **UFC 경기 일정** — 예정된 UFC 이벤트 일정 및 메인 이벤트 AI 승부 예측 (하루 1회 자동 갱신)
- **AI 다음 상대 예측** — Gemini AI 기반 다음 경기 상대 분석 및 승률 예측 (하루 1회 갱신)
- **UFC 랭킹** — 전 체급 공식 랭킹 및 챔피언 프리뷰 (하루 1회 갱신)
- **관련 YouTube 영상** — YouTube API를 통한 최신·인기 영상 자동 수집 (하루 1회 갱신)
- **관련 뉴스** — Google News RSS를 통한 최신 뉴스 자동 수집 (하루 1회 갱신)
- **응원 방명록** — 익명 방명록 (닉네임 자동 생성, 수정·삭제 가능)
- **이모지 리액션** — 응원 메시지에 👊🔥💪❤️👏 리액션 토글
- **다국어 지원** — 한국어(기본) / 영어

## 기술 스택

| 구분         | 기술                    |
| ------------ | ----------------------- |
| 프레임워크   | Next.js 16 (App Router) |
| 언어         | TypeScript              |
| 스타일링     | Tailwind CSS v4         |
| 데이터베이스 | Supabase (PostgreSQL)   |
| AI           | Google Gemini API       |
| 다국어       | next-intl               |
| 배포         | Vercel                  |

## 프로젝트 구조

```
src/
├── app/
│   ├── [locale]/
│   │   ├── page.tsx             # 메인 페이지
│   │   ├── cheer/page.tsx       # 응원하기 페이지
│   │   ├── predictions/page.tsx # AI 예측 페이지
│   │   ├── rankings/page.tsx    # UFC 랭킹 페이지
│   │   └── schedule/page.tsx    # UFC 경기 일정 페이지
│   ├── api/
│   │   ├── guestbook/           # 응원 메시지 API (GET/POST/PATCH/DELETE)
│   │   │   └── reactions/       # 이모지 리액션 API (POST 토글)
│   │   └── cron/crawl/          # UFC 전적·랭킹·AI예측 크롤링 (일 1회, KST 12:00)
│   ├── robots.ts                # SEO
│   └── sitemap.ts               # SEO
├── components/
│   ├── fighter/                 # 선수 관련 컴포넌트
│   ├── guestbook/               # 응원 메시지 컴포넌트
│   ├── predictions/             # AI 예측 컴포넌트
│   ├── rankings/                # UFC 랭킹 컴포넌트
│   ├── schedule/                # UFC 경기 일정 컴포넌트
│   └── layout/                  # Header, Footer
├── lib/
│   ├── gemini.ts                # Google Gemini API 연동 (상대 분석 + 경기 승부 예측)
│   ├── youtube.ts               # YouTube API 연동
│   ├── news.ts                  # Google News RSS 파싱
│   ├── supabase/                # Supabase 클라이언트
│   └── crawl/                   # UFC 크롤러, AI 예측 생성기, 이미지 스크레이퍼
├── messages/
│   ├── ko.json                  # 한국어 번역
│   └── en.json                  # 영어 번역
└── data/                        # 정적 데이터 (전적, 바이오 등)
```

## Supabase 테이블

| 테이블                 | 설명                                                    |
| ---------------------- | ------------------------------------------------------- |
| `guestbook_messages`   | 방명록 메시지 (닉네임, 내용, IP 해시)                   |
| `guestbook_reactions`  | 이모지 리액션 (message_id, emoji, IP 해시, UNIQUE 제약) |
| `fighter_stats`        | UFC 선수 스탯 크롤링 데이터                             |
| `ufc_rankings`         | UFC 체급별 랭킹 크롤링 데이터                           |
| `opponent_predictions` | AI 다음 상대 예측 데이터 (Gemini 분석 결과)             |

## 로컬 개발

```bash
# 의존성 설치
pnpm install

# 환경변수 설정
cp .env.local.example .env.local
# .env.local에 Supabase, YouTube API, Gemini API 키 입력

# DB 테이블 생성
npx tsx --env-file=.env.local scripts/setup-db.ts

# 개발 서버 실행
pnpm dev
```

## 연락처

문의나 피드백은 **umseongjun@naver.com**으로 보내주시면 됩니다.

## 면책 조항

이 사이트는 비공식 팬 사이트이며, UFC 또는 고석현 선수 측과 공식적인 관계가 없습니다.
