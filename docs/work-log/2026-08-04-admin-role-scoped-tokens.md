# Admin Role Scoped Tokens

Date: 2026-08-04

## Summary

Added least-privilege admin token scopes for summary metrics and moderation reviewers.

## What Changed

- Kept `SYNVIBE_ADMIN_TOKEN` as an owner token for the full admin API surface.
- Added `SYNVIBE_ADMIN_SUMMARY_TOKENS` for summary-only operational metrics access.
- Added `SYNVIBE_ADMIN_REVIEWER_TOKENS` entries in `reviewerId:token` format for moderation queue and resolution access.
- Bound moderation resolutions made with reviewer tokens to the configured reviewer ID.
- Rejected mismatched `X-SynVibe-Reviewer-Id` headers when a scoped reviewer token already identifies the reviewer.
- Added `403 admin_scope_forbidden` responses for valid tokens used outside their scope.
- Updated the browser admin API and status text to distinguish forbidden scope from backend offline states.
- Added an HTTP regression test for summary-only, reviewer-only, and owner-token admin access.

## Why

The previous admin surface had one shared owner token plus an optional reviewer ID header. That was useful for the first backend MVP, but it still allowed broad access and left reviewer identity partially client-asserted. A dating service with moderation workflows needs a narrower production-shaped path where internal operators can review reports without receiving unrelated platform analytics access.

## Assumptions And Constraints

- This is still an env-configured token layer, not a full account system.
- Tokens are secrets and must not be committed, logged, or included in work logs.
- Reviewer IDs are internal operational identifiers, not public user IDs.
- Existing `SYNVIBE_ADMIN_TOKEN` deployments remain compatible.

## User-Facing Impact

No public user flow changes. Admin users see a role-token label and an explicit forbidden-scope state when a valid token cannot access a selected admin surface.

## Safety And Privacy

No raw media, raw RGB traces, biometric time series, precise peer BPM, or emotion labels are stored or exposed. This change reduces operational data exposure by separating metric access from moderation access and by deriving reviewer identity from scoped reviewer tokens.

## Checks

```bash
./node_modules/.bin/tsc --noEmit
node --import tsx --test tests/*.test.ts
node scripts/check-repo.mjs
./node_modules/.bin/vite build
```

All checks passed. The test suite includes a temporary HTTP backend smoke test that verifies:

- no token returns `401` on admin summary;
- a summary token can read summary metrics and receives `403` for moderation;
- a reviewer token can read moderation reports and receives `403` for summary metrics;
- an owner token can read moderation reports;
- a scoped reviewer token derives `reviewerId` during resolution;
- a mismatched reviewer header with a scoped reviewer token is rejected.

## Deployment

Not deployed in this slice.

## Next Steps

1. Add account-backed admin sessions with reviewer deactivation and token rotation.
2. Split `/admin` UI cards from moderation queue permissions so scoped reviewers get a queue-first view.
3. Add production error reporting and audit trails for failed admin authorization attempts without storing token values.
