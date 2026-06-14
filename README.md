# Veek Fitness

A personal, mobile-first fitness app. The point isn't getting jacked, it's staying
mobile and protecting your back so you can keep skiing and playing disc golf for
decades. Back-safe routines, simple logging, forgiving streaks, Home and Gym tracks
that grow as you add equipment.

Built to expand: a generic time-series metrics store and clean feature modules mean
charts, AI summaries, body metrics, Garmin sync, and a meal-planning Kitchen all
plug into the same core later without a rewrite.

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, installable PWA
- Drizzle ORM over Postgres
- Dev: bundled **PGlite** (no Docker, no setup). Prod: **Supabase Postgres**, same schema
- Deploy: Vercel

## Run it locally

```bash
npm install
npm run dev
```

No database setup needed. With no `DATABASE_URL`, the app spins up a local PGlite
database, runs migrations, and seeds the routine library automatically. Open
http://localhost:3000. With no `PASSCODE` set, there's no login gate locally.

## Launch checklist (the ~15 minutes in the morning)

1. **Supabase**: create a project. Copy the connection string from Project Settings
   → Database → Connection string → URI (use the pooled port 6543).
2. **Env**: `cp .env.example .env`, then set `DATABASE_URL` to that string and
   `PASSCODE` to whatever you want to type to get in.
3. **Migrate + seed Supabase** (same SQL proven locally):
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
4. **GitHub**: push this repo (`git remote add origin … && git push -u origin main`).
5. **Vercel**: import the GitHub repo. Add the same `DATABASE_URL` and `PASSCODE`
   as environment variables. Deploy.
6. **Phone**: open the Vercel URL in your phone browser and Add to Home Screen.

## Layout

- `app/` — pages: Today, Routines, routine runner, Log, History, Kitchen, Settings, Login
- `lib/db/` — schema, queries, kitchen, insights, seed library, the PGlite/Postgres client
- `lib/streaks.ts` — weekly-goal streak math
- `lib/equipment.ts` — gear list + Home/Gym availability logic
- `lib/ai/` — Claude (Haiku) seam: weekly fitness summary + Kitchen meal planning. Needs `ANTHROPIC_API_KEY`.
- `lib/garmin/` — Garmin sync seam (stub, fast-follow)
- `public/sw.js`, `lib/offline-queue.ts` — offline app shell + log-and-sync

## AI features

The Today "Coach" card and the whole Kitchen (AI weekly meal plan, fridge-to-recipe)
run on the Claude API via `lib/ai`. Set `ANTHROPIC_API_KEY` (locally in `.env`, and in
Vercel env for prod). Without it, those features show a friendly "AI isn't set up"
message instead of failing.

## What's next (fast-follow, all built on the existing core)

Flexible analytics dashboard, body metrics, reminders/push, the modular
`HealthProvider` integration (Garmin now, Fitbit later) into the metrics store.
