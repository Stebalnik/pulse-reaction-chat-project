# 2026-08-04 Roulette Matching MVP

## Summary

Replaced the public room's peer placeholder with a server-backed roulette queue and active match records. The room now joins the live queue, polls for status, shows matched peer identity, and supports next/report/block actions.

## What Changed

- Added matchmaking contracts to `packages/shared-schemas`.
- Added SQLite tables for `waiting_queue`, `matches`, and `blocked_users`.
- Added backend endpoints:
  - `POST /api/matchmaking/join`;
  - `GET /api/matchmaking/status`;
  - `POST /api/matchmaking/leave`.
- Updated admin summary with waiting-user and active-match counts.
- Updated `/room` to show live queue status, matched peer profile, and working next/report/block controls.
- Added regression coverage for queue pairing and block-driven match termination.

## Why

The public MVP needs to behave like a real dating service before WebRTC media relay is complete. A real queue and match state removes the most visible product imitation and creates the server contract needed for peer signaling.

## Assumptions And Constraints

- Matching is intentionally simple FIFO roulette for the first beta.
- Blocks prevent rematching with the same peer.
- WebRTC offer/answer/candidate relay is still a separate next step.
- Admin access control is still required before exposing operational data in production.

## User-Facing Impact

Users now enter a live queue instead of seeing a static waiting placeholder. When another user joins, both sides can see the matched peer identity and can move to next, report, or block.

## Data And Privacy

The change stores match metadata, queue entries, and block relationships. It does not store raw video, raw audio, raw pulse traces, or inferred emotions. Reaction-pattern UI remains limited to consented physiological signal availability and coarse local outputs.

## Commands And Checks

```bash
PATH="/Users/aliaksandrstsebikhau/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc --noEmit
PATH="/Users/aliaksandrstsebikhau/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node --import tsx --test tests/signaling-backend-storage.test.ts
```

## Deployment Status

Not deployed in this task.

## Recommended Next Steps

1. Add WebRTC offer/answer/candidate relay scoped to active match IDs.
2. Add admin access control before production exposure.
3. Add session-end and match-end analytics for duration and disconnect reason.
