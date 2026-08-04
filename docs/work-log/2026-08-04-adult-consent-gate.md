# 2026-08-04 Adult Consent Gate

## Summary

Added an adults-only safety gate before the public dating room and dedicated backend consent-event storage. Direct `/room` navigation now requires local acknowledgement before matchmaking starts.

## What Changed

- Added consent-event contracts in `packages/shared-schemas`.
- Added `consent_events` SQLite storage.
- Added `POST /api/consent-events`.
- Added local adults-only gate before entering `/room`.
- Added server best-effort recording for adults-only chat terms.
- Added regression coverage for consent-event storage.
- Updated backend, browser, product, and architecture docs.

## Why

The dating/reaction product is adults-only. Matching and WebRTC were already becoming real, so the entry flow needed an explicit safety gate before exposing users to the dating room.

## Assumptions And Constraints

- Local acknowledgement gates browser access, while backend recording is best-effort when the API is reachable.
- Physiological analysis and sharing still require separate opt-in consent.
- The gate does not collect identity documents or birth dates in this MVP.

## User-Facing Impact

Users must confirm they are 18 or older and acknowledge safety expectations before entering the roulette room. Public users still keep immediate pause, report, block, and next controls.

## Data And Privacy

The backend stores consent-event metadata, not raw video, raw audio, raw biometric traces, or direct emotion labels. The adults-only acknowledgement is policy-versioned for future auditability.

## Commands And Checks

```bash
PATH="/Users/aliaksandrstsebikhau/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc --noEmit
PATH="/Users/aliaksandrstsebikhau/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node --import tsx --test tests/signaling-backend-storage.test.ts
```

## Deployment Status

Not deployed in this task.

## Recommended Next Steps

1. Add session-end API and browser unload handling so average session duration is real.
2. Add moderation report records separate from generic events.
3. Add separate physiological-analysis consent before uploading any cleaned reaction outputs.
