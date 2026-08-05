# 2026-08-05 - Local Pulse Heart Overlay

## What changed

- Added a local animated heart overlay to the top-left corner of the self video pane.
- Exposed the local `bpmEstimate` from the public reaction-output hook for UI-only use.
- Synced the heart animation duration to the latest valid estimated BPM with bounded timing.
- Kept a waiting state when there is no valid pulse estimate.

## Why it changed

The product needs an immediate, understandable signal that reflects the user's own estimated pulse pattern during video chat without implying emotion, attraction, or certainty.

## Assumptions and constraints

- The displayed heartbeat is an estimated camera-derived pulse signal, not a medical measurement.
- Precise BPM remains private to the local user by default.
- The overlay is presentation-only and does not change WebRTC, matching, storage, or moderation behavior.

## User-facing impact

Users see a heart on their own video that contracts in rhythm with the current valid pulse estimate. If the signal is not ready, the heart shows a quiet waiting state.

## Data and privacy implications

No raw video, raw RGB traces, microphone audio, biometric time series, or precise BPM are sent to the peer by this change. The existing cleaned reaction-output upload is unchanged.

## Commands and checks

- `node --import tsx --test tests/public-reaction-output.test.ts tests/reaction-output-mapper.test.ts`
- `node scripts/check-repo.mjs`
- `apps/browser-client`: `./node_modules/.bin/vite build`
- Production: `SERVER_HOST=root@165.232.145.239 scripts/deploy-browser-client.sh`
- Production: `curl -fsS https://synvibe.app/room`
- Production: `curl -fsS https://synvibe.app/api/health`

## Notes

- A full sequential test run was attempted earlier, but backend health checks timed out and one storage test was interrupted after the environment stalled. The targeted reaction-output tests and browser production build passed.

## Deployment status

Deployed to `https://synvibe.app` on 2026-08-05 UTC.

- Frontend release: `20260805235719`.
- Production smoke passed for `/room` HTML delivery and public health.
