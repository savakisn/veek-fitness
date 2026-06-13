import "server-only";

// Garmin sync seam (fast-follow, inert in v1).
//
// Plan: add the `garmin-connect` npm package, store GARMIN_EMAIL / GARMIN_PASSWORD
// as env vars, and have a Vercel cron hit an /api/garmin/sync route that calls
// syncGarmin() daily. Activities upsert into `workouts` (source "garmin",
// deduped by the workouts_source_external_uniq index). Daily health numbers
// (steps, resting HR, sleep, HRV, body battery) upsert into the generic `metrics`
// store, which is what later lets the app replace Garmin Connect for charting.
//
// Kept as a stub so wiring it up is additive, not a refactor.

export type GarminSyncResult = { activities: number; metrics: number };

export async function syncGarmin(): Promise<GarminSyncResult> {
  throw new Error(
    "Garmin sync not configured yet. Add `garmin-connect`, set GARMIN_EMAIL/GARMIN_PASSWORD, and implement this against lib/db.",
  );
}
