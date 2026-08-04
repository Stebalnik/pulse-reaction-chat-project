# Public Reaction Output Upload

Date: 2026-08-04

## Summary

Connected the public room's consented local pulse-pattern analysis to backend cleaned reaction-output storage.

## What Changed

- Added a browser API helper for `POST /api/reaction-outputs`.
- Added `usePublicReactionOutput`, which runs only when camera access and physiological-analysis consent are both active.
- Reused the existing local `FaceRoiTracker`, `PulseSampler`, and `PulseTrendMonitor` rather than adding a second signal-processing path.
- Uploaded only cleaned schema fields: model version, method version, neutral state, confidence category, quality score, reason codes, and region-agreement category.
- Mapped internal `HIGH_ACTIVATION` to the shared schema's `HIGHER_ACTIVATION`.
- Updated public-room reaction chips to reflect collecting, signal-low, calibration, sync-wait, and neutral trend states.
- Added mapper regression coverage to ensure payloads omit raw samples and precise BPM fields.
- Updated browser, architecture, and privacy docs.

## Why

The backend already had consent enforcement for cleaned reaction outputs, but the public room still showed static availability chips and did not produce server-visible cleaned outputs. This made platform analytics incomplete and preserved a prototype-shaped gap between local analysis and the own-server MVP.

## Assumptions And Constraints

- Camera frames and RGB traces stay local and are not uploaded.
- Precise BPM, baseline BPM, and peer-visible physiological values are not included in the payload.
- The public room uses neutral baseline-relative trend states only.
- Uploads are throttled and signature-aware to avoid per-frame writes.
- Backend consent enforcement remains the source of truth if client state is stale.

## User-Facing Impact

Users who opt into physiological analysis see local reaction chips backed by the same local sampler used by the debug console. If upload sync fails, the chip can show a sync-wait state while local analysis remains local.

## Safety And Privacy

No raw video, raw RGB traces, biometric time series, precise peer BPM, baseline BPM, or emotion labels are stored or exposed. The server receives only cleaned, consent-gated reaction-output records suitable for aggregate quality and abstention analytics.

## Checks

```bash
./node_modules/.bin/tsc --noEmit
node --import tsx --test tests/*.test.ts
node scripts/check-repo.mjs
./node_modules/.bin/vite build
```

All checks passed. The new regression coverage verifies internal-to-shared reaction state mapping, confidence/region-agreement mapping, and that the public reaction-output payload omits raw samples, precise BPM, and baseline BPM fields.

## Deployment

Not deployed in this slice.

## Next Steps

1. Add admin summary breakdowns for public-room reaction-output states and abstention reasons.
2. Add client-visible retry/backoff detail for reaction-output sync failures.
3. Add account-backed consent and retention controls when server accounts exist.
