# Moderation Review Queue

Date: 2026-08-04

## What changed

Added a reason-coded report/block workflow and an admin-visible moderation queue.

- Added shared moderation queue item and queue contracts.
- Added `SynVibeStore.getModerationReports()`.
- Added token-gated `GET /api/admin/moderation/reports`.
- Public room Report/Block now opens a reason dialog with optional notes instead of silently using a generic reason.
- Admin dashboard now loads and displays recent report/block records with reporter, reported user, reason, notes, and match linkage when present.
- Added regression coverage for moderation queue output.

## Why it changed

Report/block records existed, but the public room only captured a generic `safety` reason and the admin surface only showed aggregate counts. A dating service needs enough structured context for safety review without exposing biometric data.

## Assumptions and constraints

- Superseded by `2026-08-04-moderation-resolution-workflow.md`: the queue now supports `open`, `resolved`, and `dismissed` status.
- Admin access uses the existing `SYNVIBE_ADMIN_TOKEN`.
- Optional notes are capped at 500 characters by the backend.
- The queue does not include raw media, physiological traces, precise peer BPM, or direct emotion labels.

## User-facing impact

Users now choose a report/block reason and can add short notes. Blocking still prevents rematching with the same participant.

## Data and privacy implications

The backend stores reporter user ID, reported user ID when known, match ID, report/block type, selected reason, optional notes, and timestamp. This is safety metadata, not biometric or physiological analysis output.

## Commands and checks run

```bash
./node_modules/.bin/tsc --noEmit
node --import tsx --test tests/*.test.ts
node scripts/check-repo.mjs
./node_modules/.bin/vite build
```

All checks passed. Also smoke-tested `GET /api/admin/moderation/reports` returning `401` without a token and returning a reason-coded report with notes when authenticated.

## Deployment status

Not deployed in this slice.

## Recommended next steps

1. Add reviewer identity after authenticated admin accounts exist.
2. Add WebSocket transport once HTTP polling becomes the bottleneck.
3. Gate any cleaned reaction-output upload on active physiological-analysis consent.
