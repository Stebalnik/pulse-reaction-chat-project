# 2026-08-04 - Profile Handle Conflict Feedback

## What changed

- Added backend profile handle conflict detection before SQLite writes.
- Added explicit profile API responses for invalid profile input (`400`) and taken handles (`409`).
- Updated the public registration dialog to keep the form open and show actionable feedback for handle conflicts or invalid handles.
- Kept offline profile saves as explicit local-only sync state instead of pretending the server accepted the profile.
- Added storage and HTTP API regression coverage.

## Why it changed

The profile flow previously looked production-shaped but could silently fail when a handle was taken. The client saved the profile locally and closed the dialog even when the server did not accept the registration. A dating service needs clear identity feedback before matching, moderation, and peer display names can be trusted.

## Assumptions and constraints

- Anonymous local IDs remain the current account substrate.
- Handles are normalized to lowercase and may contain only letters, numbers, and underscores.
- This does not introduce account authentication or identity-document verification.

## User-facing impact

Users now get clear feedback if a handle is already taken or invalid. Successful server saves continue to populate the public profile, and offline saves are explicitly marked local-only.

## Data and privacy implications

The change affects display name and handle records only. It does not store raw video, raw audio, biometric traces, precise peer BPM, or emotion labels.

## Commands and checks

- `./node_modules/.bin/tsc --noEmit` - passed
- `node --import tsx --test tests/*.test.ts` - passed, 36 tests
- `node scripts/check-repo.mjs` - passed
- `./node_modules/.bin/vite build` - passed
- `rg -n "emotion|attract|likes you|lying|reads|compatib|diagnos|mind|honest" apps packages docs tests --glob '!apps/browser-client/public/vendor/**' || true` - reviewed, no new unsupported product claims introduced

## Deployment status

Not deployed in this slice.

## Recommended next steps

- Add account-backed sessions when auth is selected.
- Add profile edit history or audit fields if moderation policy requires it.
