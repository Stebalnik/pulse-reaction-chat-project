# Physiological Analysis Consent Gate

Date: 2026-08-04

## Summary

Added a separate public-room consent and revoke control for local physiological analysis.

## What Changed

- Added a policy-versioned physiological-analysis consent key in the public room.
- Added an explicit local pulse-analysis consent dialog with two required acknowledgements.
- Added immediate revoke through the room controls.
- Posted `physiological_analysis` grant/revoke records to `POST /api/consent-events` when the backend is available.
- Recorded `analysis_start` only when camera access and physiological-analysis consent are both active.
- Updated the room reaction-availability chips to show opt-in, camera-paused, or local-ready status.
- Updated browser, architecture, privacy, and handoff docs.
- Extended consent-event regression coverage for physiological-analysis grant and revoke.

## Why

Adults-only chat consent and camera permission are not enough for physiological processing. The dating room needs a clear, separate opt-in before local pulse-pattern analysis can become active, and users need an immediate revoke path.

## Assumptions

- This consent applies to local-only physiological analysis in the room.
- Precise BPM is not shared with the peer by default.
- This slice does not upload reaction outputs or biometric time series.
- Future cleaned reaction-output uploads must still check active physiological-analysis consent at the upload boundary.

## Safety And Privacy

No raw video, raw RGB traces, biometric time series, precise peer BPM, or emotion labels are stored or exposed. The UI explicitly states that pulse changes are not emotion, attraction, honesty, intent, compatibility, or medical labels.

## Checks

```bash
./node_modules/.bin/tsc --noEmit
node --import tsx --test tests/*.test.ts
node scripts/check-repo.mjs
./node_modules/.bin/vite build
```

All checks passed. Also smoke-tested a temporary backend on port `1168`: created a room session, posted `physiological_analysis` grant and revoke consent events, and confirmed both records stayed linked to the session.

## Deployment

Not deployed in this slice.

## Next Steps

1. Add reviewer identity after authenticated admin accounts exist.
2. Add WebSocket transport once HTTP polling becomes the bottleneck.
3. Add production API error reporting and client-visible retry states.
