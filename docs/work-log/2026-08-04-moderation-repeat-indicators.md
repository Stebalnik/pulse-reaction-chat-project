# Moderation Repeat Indicators

Date: 2026-08-04

## What changed

Added status filters and repeated-report indicators to the moderation review queue.

- Added shared moderation queue status filter and repeated-report count fields.
- `GET /api/admin/moderation/reports` now accepts `status=all|open|resolved|dismissed`.
- Queue items include total and open report counts for the reported anonymous user ID.
- Admin queue now has status filter controls.
- Admin queue rows show repeated-report counts when a reported anonymous user is known.
- Added regression coverage for open/dismissed filters and repeated-report counts.

## Why it changed

The queue could resolve individual reports, but admins still had to inspect records one by one. Repeated-report indicators help prioritize safety review without inferring intent or labeling the reported user.

## Assumptions and constraints

- Counts are operational safety metadata, not a verdict.
- Counts are based on the current anonymous user ID and can change if identity changes.
- No automated enforcement or compatibility/behavior inference is added.
- No raw media, biometric traces, precise peer BPM, or direct emotion labels are stored.

## User-facing impact

No public room workflow changes. Admin users can filter the review queue and see whether the reported anonymous user has other open or total reports.

## Data and privacy implications

No new stored fields are required. The API returns aggregate counts derived from moderation reports already stored for safety review.

## Commands and checks run

```bash
./node_modules/.bin/tsc --noEmit
node --import tsx --test tests/*.test.ts
node scripts/check-repo.mjs
./node_modules/.bin/vite build
```

All checks passed. Also smoke-tested `GET /api/admin/moderation/reports?status=open` with repeated-report counts after dismissing one report.

## Deployment status

Not deployed in this slice.

## Recommended next steps

1. Add reviewer identity after authenticated admin accounts exist.
2. Add WebSocket transport once HTTP polling becomes the bottleneck.
3. Add production API error reporting and client-visible retry states.
