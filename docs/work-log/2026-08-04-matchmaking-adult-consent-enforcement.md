# Matchmaking Adult Consent Enforcement

Date: 2026-08-04

## Summary

Moved adults-only eligibility for roulette matching from UI-only gating into the backend matchmaking contract.

## What Changed

- Added `status: "ineligible"` with `reason: "adult_chat_terms_required"` to `MatchmakingStatus`.
- `SynVibeStore.joinMatchmaking` now requires active `adult_chat_terms` consent before creating a queue entry or match.
- `POST /api/matchmaking/join` no longer records `match_wait` for consent-ineligible users.
- The public room reasserts the locally accepted adults-only policy when entering a server session, which helps recover from prior offline consent-event writes.
- The room UI now displays an explicit adults-only-required state when the backend returns `ineligible`.
- Added regression coverage that verifies no waiting queue entry is created without adults-only consent.
- Updated stale app/backend/architecture docs to reflect implemented matching/signaling and the new server-side consent invariant.

## Why

The public route already had an adults-only gate, but a production-shaped dating service cannot rely only on browser state. Direct API calls, stale local storage, or previous backend outages could otherwise enter matchmaking without an active server-side consent record.

## Assumptions And Constraints

- The first beta still uses anonymous local user IDs, not verified identity documents or birth-date collection.
- Adults-only acknowledgement is a policy-versioned consent event, not age verification.
- Existing users with local acceptance but missing server consent can re-sync on room entry.

## User-Facing Impact

Users who already accepted the adults-only gate should continue into matching normally. If the backend does not have an active grant, the room shows that adults-only confirmation is required instead of silently appearing offline.

## Safety And Privacy

No raw video, audio, biometric traces, precise peer BPM, or emotion labels are stored or exposed. This change stores only policy-versioned adults-only consent events and prevents dating-room matching without that eligibility record.

## Checks

```bash
./node_modules/.bin/tsc --noEmit
node --import tsx --test tests/*.test.ts
node scripts/check-repo.mjs
./node_modules/.bin/vite build
```

All checks passed. The storage regression suite now verifies that `joinMatchmaking` returns `ineligible` without active adults-only consent and does not create a waiting queue entry.

## Deployment

Not deployed in this slice.

## Next Steps

1. Add account-backed age/eligibility state when server accounts exist.
2. Add an explicit revoke/leave flow for adults-only chat terms if policy requires it.
3. Add production monitoring for `adult_chat_terms_required` join outcomes without storing sensitive content.
