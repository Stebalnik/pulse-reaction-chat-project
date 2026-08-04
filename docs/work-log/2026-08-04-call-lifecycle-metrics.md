# Call Lifecycle Metrics

Date: 2026-08-04

## What changed

Added privacy-safe WebRTC lifecycle metrics to the public room and admin summary.

- Added `call_connect`, `call_disconnect`, and `call_fail` event types.
- The public room records each lifecycle event once per match when browser connection state changes.
- Admin summary now includes call connect, disconnect, failure, and setup-success metrics.
- The admin Matching card shows call setup success alongside active matches and queue depth.
- Added regression coverage for call lifecycle summary fields.

## Why it changed

Match records alone show that two users were paired, but not whether the call actually connected. The beta needs operational visibility into call setup success and failures before adding more reaction-pattern features.

## Assumptions and constraints

- Browser WebRTC connection state is treated as an operational signal, not a physiological or emotion signal.
- Lifecycle events include match ID and connection state only.
- No raw media, precise peer BPM, raw biometric traces, or direct emotion labels are stored.

## User-facing impact

No visible room workflow changes. Admin can now distinguish matchmaking activity from real connected calls.

## Data and privacy implications

Stored lifecycle events are limited to event type, user ID, optional session ID, route, match ID, connection state, and timestamp.

## Commands and checks run

```bash
./node_modules/.bin/tsc --noEmit
node --import tsx --test tests/*.test.ts
node scripts/check-repo.mjs
./node_modules/.bin/vite build
```

All checks passed.

## Deployment status

Not deployed in this slice.

## Recommended next steps

1. Add explicit peer-connected and peer-ended server-side match events.
2. Add a reason picker and moderation review queue.
3. Add separate physiological-analysis consent before any cleaned reaction-output upload.
