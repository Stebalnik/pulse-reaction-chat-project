# 2026-08-04 Server MVP Analytics

## Summary

Added the first own-server MVP layer for SynVibe operational data. The backend now stores anonymous users, profiles, sessions, events, and cleaned reaction-output records in SQLite, and exposes an admin summary endpoint for `/admin`.

## What Changed

- Added shared TypeScript API contracts in `packages/shared-schemas`.
- Implemented `apps/signaling-backend` as a Node HTTP service backed by SQLite.
- Added endpoints for anonymous users, profiles, sessions, events, cleaned reaction outputs, and admin summary.
- Connected the browser client to create anonymous users, save profiles, record visits, record room starts, and record camera grant/pause events when the backend is available.
- Updated `/admin` to read real summary metrics instead of presenting backend-pending cards.
- Added a storage regression test for privacy-safe admin summary counts and rejection reasons.

## Why

The public MVP needs operational visibility before real user testing: visits, room starts, camera grants, active sessions, guest/registered counts, and sufficient-signal summaries. This keeps the first launch on SynVibe's own server without adding an external analytics database.

## Assumptions And Constraints

- Browser-first launch remains the fastest path.
- SQLite is sufficient for the first small public beta.
- The backend runs behind the public origin in production, while local development can point the browser to `VITE_API_ORIGIN`.
- Admin access control is still required before exposing operational data beyond local/private use.

## User-Facing Impact

Public users still get the same no-login entry and room shell. If the backend is online, registration and funnel events are now persisted server-side. If the backend is offline, the browser keeps local-only behavior.

## Data And Privacy

No raw video, raw RGB traces, or precise peer-visible BPM are stored by this change. Reaction-output storage accepts only cleaned records with model/method version, coarse state, confidence, quality score, region agreement, and reason codes.

## Commands And Checks

```bash
PATH="/Users/aliaksandrstsebikhau/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc --noEmit
PATH="/Users/aliaksandrstsebikhau/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node --import tsx --test tests/*.test.ts
PATH="/Users/aliaksandrstsebikhau/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node scripts/check-repo.mjs
PATH="/Users/aliaksandrstsebikhau/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/vite build
```

Smoke tested:

- `GET /health`
- `POST /api/users/anonymous`
- `POST /api/profiles`
- `POST /api/events`
- `GET /api/admin/summary`

## Deployment Status

Not deployed in this task.

## Recommended Next Steps

1. Add simple admin access control before exposing `/api/admin/summary` on production.
2. Add session-end handling so average duration is populated.
3. Add roulette queue and WebRTC signaling endpoints.
4. Wire cleaned reaction-output upload from the local analysis pipeline after consent UX review.
