# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (localhost:3000)
pnpm build        # Production build
pnpm start        # Run production server
pnpm lint         # ESLint
pnpm prettier --write "src/**/*.{ts,tsx,json,css}"  # Format all files
```

Database setup: `npx tsx --env-file=.env.local scripts/setup-db.ts`

## Architecture

**LET'S KO** is a multilingual (ko/en) fan site for UFC fighter Ko Seokhyeon, built with Next.js 15 App Router + TypeScript + Tailwind CSS v4 + Supabase + next-intl.

### Routing & i18n

- URL-based locale: `/ko` (default), `/en`
- `src/middleware.ts` handles locale redirect (`/` → `/ko`)
- `i18n/routing.ts` defines locales, `i18n/request.ts` loads messages
- Translations in `src/messages/{ko,en}.json`
- `params` is a Promise in Next.js 15 — always `await params`

### Data Flow

- **Fighter stats**: Supabase `fighter_stats` table → fallback to `src/data/cached-stats.json`
- **YouTube videos**: YouTube Data API v3 (`src/lib/youtube.ts`), ISR 24h
- **News**: Google News RSS parsing (`src/lib/news.ts`), ISR 24h
- **Guestbook**: Supabase `guestbook_messages` table, API at `/api/guestbook` (GET/POST/PATCH)
- **UFC crawler**: Cheerio scraper (`src/lib/crawl/ufc-crawler.ts`), triggered by Vercel Cron daily at 6AM UTC via `/api/cron/crawl`

### Supabase

- **Server client** (`src/lib/supabase/server.ts`): uses `SUPABASE_SERVICE_ROLE_KEY`, for route handlers and server components
- **Client** (`src/lib/supabase/client.ts`): uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Tables**: `guestbook_messages` (RLS: read/insert/update), `fighter_stats` (no RLS, server-only)

### Key Conventions

- **Styling**: Tailwind CSS v4 with `@theme inline` in `globals.css`. Font: Pretendard (CDN)
- **Formatting**: Prettier with `@trivago/prettier-plugin-sort-imports` — double quotes, 80 char width, 2-space tabs, trailing commas
- **Path alias**: `@/*` → `./src/*`
- **Scroll animations**: Custom `useInView` hook (`src/hooks/useInView.ts`) with CSS keyframes in `globals.css`
- **Components**: Server components by default, `"use client"` only when needed (animations, interactivity)
- **Guestbook rate limiting**: 30s cooldown per IP (SHA256 hashed). Edit auth uses localStorage message IDs + server-side IP verification

### Environment Variables

Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
Secret: `YOUTUBE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `CRON_SECRET`, `GOOGLE_SITE_VERIFICATION`
