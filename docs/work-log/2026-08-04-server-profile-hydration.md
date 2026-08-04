# Server Profile Hydration

Date: 2026-08-04

## What changed

Replaced the public profile registration placeholder with a server-backed load/save loop for the current anonymous user ID.

- Added `SynVibeStore.getProfileByLocalUserId()`.
- Added `GET /api/profiles?localUserId=...`.
- Added browser `loadServerProfile()`.
- Public app now hydrates the local profile from the server when available.
- Public registration copy now describes the current server-backed profile behavior instead of a future release.
- Home metrics now show whether the profile is server saved, local only, checking, or not registered.
- Added regression coverage for profile load/update by anonymous user ID.

## Why it changed

The UI still described registration as a device-only placeholder even though the backend could already save profiles. A dating service needs stable identity basics before richer matching, safety, and contact flows.

## Assumptions and constraints

- This is still anonymous-ID based identity, not email/password auth.
- Local profile storage remains a fallback for offline development and backend outages.
- Profile fields are limited to display name and handle.
- The change does not add contact discovery, chat history, or precise physiological data sharing.

## User-facing impact

Returning users with the same anonymous ID can load their saved display name and handle from the SynVibe backend. If the backend is unavailable, the profile remains local-only and the room still works.

## Data and privacy implications

The backend stores display name, handle, anonymous user ID linkage, and timestamps. It does not store raw video, raw audio, raw biometric traces, precise peer BPM, or direct emotion labels.

## Commands and checks run

```bash
./node_modules/.bin/tsc --noEmit
node --import tsx --test tests/*.test.ts
node scripts/check-repo.mjs
./node_modules/.bin/vite build
```

All checks passed. Also smoke-tested `POST /api/profiles` followed by `GET /api/profiles?localUserId=...` on a temporary local backend.

## Deployment status

Not deployed in this slice.

## Recommended next steps

1. Add handle conflict feedback in the registration dialog.
2. Add server-side profile validation errors with client-visible reason codes.
3. Add authenticated accounts only after privacy, safety, and deletion flows are defined.
