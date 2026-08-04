# Moderation Reviewer Identity

Date: 2026-08-04

## Summary

Added reviewer identity tracking to moderation resolution actions.

## What Changed

- Added `reviewerId` to shared moderation resolution and queue schemas.
- Added a nullable `reviewer_id` column to moderation reports with startup migration.
- `POST /api/admin/moderation/reports/resolve` can attach reviewer identity from `X-SynVibe-Reviewer-Id`.
- Added optional backend allowlist enforcement through `SYNVIBE_ADMIN_REVIEWER_IDS`.
- Added `SYNVIBE_ADMIN_REVIEWER_ID` as a single-operator default reviewer ID.
- Added reviewer ID storage/input in the admin UI and sent it with moderation resolution requests.
- Updated admin queue display to show the reviewer ID on reviewed records.
- Added regression coverage for reviewer ID persistence on resolve/reopen.

## Why

Moderation status and notes were already stored, but reviewer identity was not. Safety operations need auditable ownership for moderation decisions without mixing operator identity into free-form notes.

## Assumptions

- Reviewer ID is operational admin metadata, not public user data.
- The first MVP keeps token-based admin auth and adds reviewer identity as an audit field.
- `SYNVIBE_ADMIN_REVIEWER_IDS` should be configured in production when multiple reviewers share the admin surface.
- Full role-scoped admin accounts remain a later step.

## Safety And Privacy

No raw media, biometric traces, precise peer BPM, or emotion labels are stored or exposed. This change only adds internal moderation operator metadata.

## Checks

```bash
./node_modules/.bin/tsc --noEmit
node --import tsx --test tests/*.test.ts
node scripts/check-repo.mjs
./node_modules/.bin/vite build
```

All checks passed. Also smoke-tested a temporary backend on port `1170` with `SYNVIBE_ADMIN_REVIEWER_IDS=ops-alex,ops-riley`: moderation resolve returned `403` without `X-SynVibe-Reviewer-Id`, returned `200` with `ops-alex`, and the moderation queue returned `reviewerId: "ops-alex"`.

## Deployment

Not deployed in this slice.

## Next Steps

1. Add role-scoped admin accounts and least-privilege reviewer access.
2. Add WebSocket transport once HTTP polling becomes the bottleneck.
3. Add production API error reporting and client-visible retry states.
