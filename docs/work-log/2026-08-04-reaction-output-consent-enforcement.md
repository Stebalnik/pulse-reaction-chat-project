# Reaction Output Consent Enforcement

Date: 2026-08-04

## Summary

Added backend enforcement so cleaned reaction-output uploads require active physiological-analysis consent.

## What Changed

- `SynVibeStore.recordReactionOutput` now rejects writes when the latest relevant `physiological_analysis` consent decision is not `granted`.
- `POST /api/reaction-outputs` now returns `403` with `physiological_analysis_consent_required` instead of storing without consent.
- Consent lookup is ordered by event timestamp and SQLite insertion order so revocation reliably wins after a grant.
- Added regression coverage for no-consent rejection, grant acceptance, revoke rejection, and retained summary counts.
- Updated backend, architecture, privacy, and handoff docs.

## Why

The public room now has a separate physiological-analysis consent control, but the server API still needed its own enforcement boundary. A direct API caller should not be able to upload even cleaned reaction outputs after consent is missing or revoked.

## Assumptions

- Cleaned reaction outputs are still sensitive health-adjacent records.
- Session-specific consent can use a session-linked grant, while sessionless consent can cover future sessionless uploads.
- This slice does not upload raw video, raw RGB traces, precise peer BPM, or biometric time series.
- Consent enforcement belongs at both the client UX and backend write boundary.

## Safety And Privacy

No raw media, biometric traces, precise peer BPM, or emotion labels are stored or exposed. The backend only accepts cleaned reaction-output records after active `physiological_analysis` consent.

## Checks

```bash
./node_modules/.bin/tsc --noEmit
node --import tsx --test tests/*.test.ts
node scripts/check-repo.mjs
./node_modules/.bin/vite build
```

All checks passed. Also smoke-tested a temporary backend on port `1169`: `POST /api/reaction-outputs` returned `403` before consent, `202` after a `physiological_analysis` grant, and `403` again after revoke.

## Deployment

Not deployed in this slice.

## Next Steps

1. Add role-scoped admin accounts and least-privilege reviewer access.
2. Add WebSocket transport once HTTP polling becomes the bottleneck.
3. Add production API error reporting and client-visible retry states.
