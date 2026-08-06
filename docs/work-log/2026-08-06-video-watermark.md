# 2026-08-06 - Video Watermark

## What changed

- Added a `synvibe.app` watermark overlay to both self and peer video panes.
- Kept the watermark pointer-free so it does not block swap or video controls.
- Added compact watermark sizing for portrait-phone PiP panes.

## Why it changed

If users stream, record, or share clips from calls, the video surface should clearly show that the experience was made in SynVibe.

## Assumptions and constraints

- The watermark is visible but not intended to cover faces, pulse hearts, or call labels.
- This is a presentation-only change and does not affect media capture, WebRTC, matching, or pulse analysis.

## User-facing impact

Both call windows now carry subtle `synvibe.app` branding during conversations.

## Data and privacy implications

No data collection, sharing, storage, or biometric processing behavior changed.

## Commands and checks

- `./node_modules/.bin/tsc --noEmit`
- `node scripts/check-repo.mjs`
- `apps/browser-client`: `./node_modules/.bin/vite build`

## Deployment status

Ready for deployment after commit and push.
