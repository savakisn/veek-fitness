# Cadence

A private fitness and kitchen app for two people (a couple). Fitness is per-person;
the kitchen is shared. The point is staying mobile and eating better without it
feeling like a chore.

## What it does

**Fitness (per user)**
- Today: a load-based training status (last 7 days vs a 28-day baseline), an AI
  coach you tell how you feel to get a workout suggestion, and your synced device
  numbers.
- Routines: a back-safe library (mobility, core, strength, yoga/pilates, sport prep)
  filtered by Home or Gym equipment.
- History: every session, tap one for its stats (HR over time, distance, calories).
- Garmin sync pulls activities, steps, sleep, resting HR, body battery, and weight.

**Kitchen (shared household)**
- Cook: what's on hand plus "what can I make" from it.
- Plan: a few AI dinner ideas for the week, swipe to save or skip (a skip refills
  the slot). Thumbs steer future suggestions.
- Menu: saved recipes you can re-add to the grocery list.
- Grocery: built from the plan, duplicates merged, shareable.

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, as an installable PWA
- Supabase Postgres via Drizzle (dev uses a bundled PGlite database, no setup)
- Claude (`claude-haiku-4-5`) for the coach and meal planning
- Garmin via the `garmin-connect` library on a daily Vercel cron
- Single-user-style passcode login per person (HMAC-signed cookie)

## Run locally

```bash
npm install
npm run dev
```

No database setup: with no `DATABASE_URL` it spins up a local PGlite database and
seeds the library and two demo accounts. With no `AUTH_SECRET` the login gate is open.

## Environment

See `.env.example`. For production: `DATABASE_URL` (Supabase pooled URI),
`AUTH_SECRET` (signs login cookies), `ANTHROPIC_API_KEY` (AI), and
`GARMIN_EMAIL` / `GARMIN_PASSWORD` / `CRON_SECRET` (Garmin sync).

## Notes

- Schema changes are applied to production by hand in the Supabase SQL Editor, not
  `db:migrate` (the local migrations under `drizzle/` are for the bundled dev DB).
- Run a migration before deploying; a deploy ahead of its schema breaks the app.
- Layout: `app/` pages, `lib/db` data layer, `lib/ai` Claude seam, `lib/garmin`
  sync, `lib/load.ts` training load, `lib/auth.ts` per-user auth.
