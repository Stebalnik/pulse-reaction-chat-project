# 2026-08-05 - Near-Square Video Windows

## What changed

- Changed the public room video stage from wide `16 / 9` to near-square `5 / 4`.
- Changed the self/peer picture-in-picture pane from narrow portrait to the same near-square ratio.
- Applied the same near-square ratio to the prototype local/test-peer video panes.
- Removed the mobile public-stage minimum-height rule that could override aspect ratio.

## Why it changed

Laptop and tablet layouts could make the peer video feel like a wide strip, while phone layouts already felt closer to the intended bounded call-window shape.

## Assumptions and constraints

- `5 / 4` keeps the panes rectangular while staying close to square on desktop, tablet, and mobile.
- This is a presentation-layer change only; it does not alter WebRTC, media permissions, face tracking, or physiological analysis.

## User-facing impact

Users should see stable, bounded video windows that are close to square across devices, including the main call pane and the tappable PiP pane.

## Data and privacy implications

No data model, media capture, biometric processing, logging, or retention behavior changed.

## Commands and checks

- `./node_modules/.bin/tsc --noEmit`
- `node scripts/check-repo.mjs`
- `apps/browser-client`: `./node_modules/.bin/vite build`

## Deployment status

Ready for deployment after commit and push.
