# 2026-08-04 WebRTC Signaling Relay

## Summary

Added the first active-match-scoped WebRTC signaling relay. Matched browser clients can now exchange offer, answer, and ICE candidate payloads through the own-server backend and attach a remote video stream when the peer connection succeeds.

## What Changed

- Added WebRTC signaling contracts to `packages/shared-schemas`.
- Added a `signaling_messages` SQLite table.
- Added backend endpoints:
  - `POST /api/signaling/messages`;
  - `GET /api/signaling/messages`.
- Restricted signaling reads/writes to active match participants.
- Added caller/callee roles to match records so one browser creates the offer and the other answers.
- Wired `/room` to create `RTCPeerConnection`, publish local camera tracks, poll peer signaling messages, exchange ICE candidates, and render remote video.
- Added regression coverage for peer-only message delivery, cursor behavior, and active-match enforcement.

## Why

The roulette queue made matching real, but users still could not connect media. This change turns an active match into a real WebRTC setup path while keeping the backend limited to signaling data rather than media storage.

## Assumptions And Constraints

- HTTP polling is acceptable for the first relay and can be replaced by WebSocket transport later without changing the high-level room contract.
- The caller is the later user who completes the match.
- A public STUN server is used for ICE gathering; TURN is not yet configured.
- Camera must be enabled before the room starts the peer connection.

## User-Facing Impact

After two users match and enable camera, the peer pane can show the remote video stream instead of only matched identity. The UI still preserves pause, next, report, and block controls.

## Data And Privacy

The backend stores WebRTC setup payloads for active matches only. It does not store raw video, raw audio, raw pulse traces, or direct emotion labels. Precise BPM remains private by default.

## Commands And Checks

```bash
PATH="/Users/aliaksandrstsebikhau/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc --noEmit
PATH="/Users/aliaksandrstsebikhau/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node --import tsx --test tests/signaling-backend-storage.test.ts
```

## Deployment Status

Not deployed in this task.

## Recommended Next Steps

1. Smoke test two real browser windows end to end with camera permissions.
2. Add TURN configuration for networks where STUN-only peer connections fail.
3. Add backend deployment routing for API endpoints on `synvibe.app`.
4. Add admin access control before exposing operational and signaling endpoints in production.
