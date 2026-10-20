# Security

Cadence is a private two-person app. This lists what is in place, what is not, and
how to rotate secrets.

## In place

- Every route is gated by `proxy.ts` (HMAC-signed `vf_user` cookie). Production fails
  closed (503 / throw) when `AUTH_SECRET` is unset.
- Every Server Action calls `getCurrentUser()` (enforced by `npm run lint`), since
  actions are reachable by direct POST.
- Server Action inputs are validated and bounded with zod (`lib/validate.ts`).
- `/api/garmin/*` require a session (or the `CRON_SECRET` bearer, compared in constant
  time for the sync route) and fail closed when no secret is configured in production.
- Login: constant-time passcode comparison, 800 ms minimum delay on failure, and an
  in-memory limiter (5 failures per IP and 30 global per 15 minutes).
- Session tokens carry a 90-day expiry, are enforced server-side, and refresh in the
  proxy while in use. Pre-expiry tokens still verify and are upgraded on next visit.
- Security headers via `next.config.ts`: nosniff, strict referrer policy, frame denial
  (X-Frame-Options plus CSP `frame-ancestors`), Permissions-Policy, HSTS, and a CSP
  limited to `base-uri`, `form-action`, `object-src`. There is deliberately no
  `script-src`: Next's inline bootstrap scripts and the service worker would need a
  nonce setup, and a broken script CSP would take the app down.
- Birth date and height are read from `PROFILE_BIRTH_DATE` / `PROFILE_HEIGHT_IN`.

## Not done / remaining

- Passcodes are stored in plain text and are short. Hashing them or moving to passkeys
  needs a schema change.
- The login limiter is per serverless instance memory, so it is a speed bump, not a
  lockout. A shared store (or Vercel firewall rate limit) would close that.
- No per-session revocation (needs a table or a per-user token version column).
- The repo is public. Previously committed personal data (birth date, height) remains
  in git history; consider making the repo private.
- `npm audit` findings via the shadcn dependency chain are not addressed.
- No script CSP (see above).

## Rotating secrets

- `AUTH_SECRET`: change it in Vercel and redeploy. All sessions become invalid and
  everyone logs in again. Do this if a cookie, device, or the repo secret is exposed.
- Passcodes: update the `users.passcode` value in the Supabase SQL Editor; existing
  sessions stay valid until `AUTH_SECRET` is rotated or they expire.
- `CRON_SECRET`: change in Vercel (Vercel cron picks it up on redeploy).
- `GARMIN_PASSWORD`, `ANTHROPIC_API_KEY`: rotate at the provider, then update in Vercel.
