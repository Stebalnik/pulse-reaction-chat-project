# 2026-08-05 - Fouad ROI Quality Implementation

## What changed

- Added `validPixelCount` to rPPG trace samples and heart-rate estimates.
- Added `minRoiPixelCount` engine configuration and `ROI_PIXEL_COUNT_LOW` rejection reason.
- Passed accepted skin-pixel counts from the browser ROI sampler into the rPPG engine.
- Added skin-pixel count to debug UI metrics and debug session logs.
- Added regression coverage for low valid-pixel-count invalidation.

## Why it changed

Fouad 2019 reports that skin segmentation can improve rPPG accuracy by removing nonskin pixels, but also warns that too few pixels can make camera sensor noise harder to average out. The previous implementation tracked skin coverage but did not expose absolute valid-pixel count as a first-class quality gate.

## Assumptions and constraints

- Historical/synthetic traces without `validPixelCount` remain compatible and do not trigger the new gate.
- The default threshold is conservative and should be tuned with EXP-013 across device classes and lighting conditions.
- This change improves HR estimate validity only; it does not add any product interpretation claim.

## User-facing impact

Low-quality windows with sparse usable skin pixels abstain earlier instead of feeding baseline/reaction-pattern states. Debug users can see the skin-pixel count alongside zone and coverage diagnostics.

## Data and privacy implications

Only aggregate pixel-count metadata is logged. No raw video frames, raw RGB traces, microphone audio, or biometric time series are stored by default.

## Commands and checks

- `./node_modules/.bin/tsc --noEmit`
- `node --import tsx --test --test-concurrency=1 tests/*.test.ts`
- `node scripts/check-repo.mjs`
- `apps/browser-client`: `./node_modules/.bin/vite build`
- Production: `SERVER_HOST=root@165.232.145.239 scripts/deploy-signaling-backend.sh`
- Production: server-side `pnpm --filter @pulse-reaction/browser-client build`
- Production: `ADMIN_TOKEN=... scripts/smoke-production-api.sh`
- Production: `curl -fsS https://synvibe.app/room`
- Production: `curl -fsS https://synvibe.app/api/health`

## Deployment status

Deployed to `https://synvibe.app` on 2026-08-05 UTC.

- Backend service: `synvibe-signaling-backend` restarted and passed health check.
- Frontend release: `20260805031110`.
- Production smoke passed for public health, protected admin summary behavior, and `/room` HTML delivery.

## Recommended next steps

- Tune `minRoiPixelCount` on real mobile and desktop camera sessions.
- Add EXP-013 fixtures comparing MediaPipe zones, skin-masked all-face ROI, and skin-masked sub-ROIs.
