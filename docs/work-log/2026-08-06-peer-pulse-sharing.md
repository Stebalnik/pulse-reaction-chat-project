# 2026-08-06 - Peer Pulse Sharing

## What changed

- Added an ephemeral matched-peer pulse relay for estimated BPM and quality score.
- Added `PeerPulseRequest`, `PeerPulseMessage`, and `PeerPulseBatch` shared schemas.
- Added backend `/api/peer-pulse/messages` POST/GET routes scoped to active matches.
- Added self-to-peer pulse upload and peer pulse polling in the public room.
- Rendered the same delayed heartbeat overlay on the peer video pane.
- Updated public consent and room copy to say estimated pulse rhythm is shared with the matched peer after consent.

## Why it changed

The heartbeat is intended as a mutual communication interaction: each participant sees their own estimated pulse rhythm and the matched peer's estimated pulse rhythm while talking.

## Assumptions and constraints

- The shared value is an estimated camera-derived pulse rhythm, not a medical measurement.
- Raw video, raw RGB traces, baseline models, and biometric time series are not shared with the peer.
- Sharing is limited to active matched chats after the existing room/physiological-analysis consent gate.
- The peer heartbeat uses the same delayed/held animation behavior as the local heartbeat.

## User-facing impact

Matched users see a heartbeat overlay on both the self video and peer video. If peer pulse updates briefly drop out, the visual beat continues from the last confirmed delayed peer BPM until a newer update arrives.

## Data and privacy implications

Estimated BPM and quality score are sent to the server for active matched delivery. Messages are excluded from admin reaction-output analytics and are pruned as short-lived relay data. No raw media or raw physiological traces are sent.

## Commands and checks

- `./node_modules/.bin/tsc --noEmit`
- `node --import tsx --test tests/signaling-backend-storage.test.ts`
- `node --import tsx --test tests/public-reaction-output.test.ts tests/reaction-output-mapper.test.ts`
- `node scripts/check-repo.mjs`
- `apps/browser-client`: `./node_modules/.bin/vite build`

## Deployment status

Ready for deployment after commit and push.
