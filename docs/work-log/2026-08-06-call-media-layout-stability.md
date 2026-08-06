# 2026-08-06 - Call Media Layout Stability

## What changed

- Stabilized matchmaking state updates so unchanged polling responses no longer restart the WebRTC connection effects.
- Kept the WebRTC connection effect keyed to the active match instead of transient status object refreshes.
- Removed matched/profile/status diagnostic overlays from the peer video pane.
- Changed the public call stage to side-by-side self/peer video panes by default.
- Kept picture-in-picture behavior only for narrow portrait phone layouts.
- Preserved swap behavior so users can move self video from left to right.

## Why it changed

Two-device testing showed users were matched but each device only saw its own camera, with no peer video/audio. The peer pane also showed service labels over the area where video should be. The call layout needed to match the expected conversation mode: two visible video windows on laptops, tablets, and landscape phones, with PiP reserved for portrait phones.

## Assumptions and constraints

- This change fixes client-side connection churn caused by repeated identical matchmaking polling responses.
- WebRTC still uses the existing STUN-only configuration; some restrictive networks may still require TURN later.
- The peer pulse relay and heartbeat overlays are unchanged.

## User-facing impact

Matched users should get a more stable peer media connection, a cleaner peer video pane, and side-by-side call windows on desktop/tablet/landscape screens. Portrait phone users still get the compact PiP layout.

## Data and privacy implications

No new data is collected or shared. Raw video, audio, RGB traces, and biometric time series are still not stored by this change.

## Commands and checks

- `./node_modules/.bin/tsc --noEmit`
- `node scripts/check-repo.mjs`
- `apps/browser-client`: `./node_modules/.bin/vite build`
- `node --import tsx --test tests/signaling-backend-storage.test.ts`
- `node --import tsx --test tests/public-reaction-output.test.ts tests/reaction-output-mapper.test.ts`

## Deployment status

Ready for deployment after commit and push.
