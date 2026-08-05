# 2026-08-04 - Unified Consent, Audio, And Face Framing

## What changed

- Replaced separate room and physiological-analysis opt-ins with one required room-entry consent covering adults-only use, safety conduct, camera/microphone access intent, and on-device pulse-pattern analysis.
- Started call media automatically after consent instead of waiting for a separate camera button.
- Requested microphone access with echo cancellation, noise suppression, and auto gain control, and forwarded audio tracks through the existing WebRTC peer connection.
- Kept a call-media pause/resume control and front/rear camera flip control.
- Bounded the public call stage to a stable rectangular aspect ratio on desktop/tablet instead of stretching video panes to fill the full room area.
- Changed local and remote video rendering to preserve the whole frame, then applied face-aware downscaling to the local preview when the detected face ROI is larger than roughly 15% of the video frame.
- Reused the public-room rPPG face ROI for local preview framing so face detection is not duplicated.

## Why it changed

The product concept assumes participants consent to reaction-pattern analysis before entering the roulette chat. Separate in-room analysis opt-in created a mode where users could be present without the core product behavior. The call experience also needed audible WebRTC media, less aggressive desktop cropping, and a face-aware local preview.

## Assumptions and constraints

- Browser speaker output usually does not require a separate permission prompt; remote audio plays from the WebRTC media stream after the user gesture and browser autoplay policy allow it.
- Some browsers support explicit audio-output device selection through `setSinkId`, but that is not universal and is not added here.
- The 15% face-size rule is applied to the displayed local preview. The outbound WebRTC camera track remains the original camera stream.
- The system still presents pulse-pattern dynamics only as baseline-relative, uncertainty-safe feedback. It does not claim to read emotions, attraction, honesty, intent, compatibility, or medical state.

## User-facing impact

Users now accept one clear gate and then enter a room where camera, microphone, and local pulse-pattern analysis start automatically. They can pause call media, flip camera, swap PiP placement, hear the peer when connected, and see a more stable rectangular call layout on desktop/tablet.

## Data and privacy implications

No raw video, microphone audio, or raw biometric traces are stored by default. Audio/video are exchanged peer-to-peer through WebRTC signaling. Cleaned reaction outputs remain consent-gated, local-baseline-relative, and reason-coded.

## Commands and checks

- `node --import tsx --test --test-concurrency=1 tests/signaling-backend-admin-auth.test.ts` - passed after an earlier concurrent full-suite run hit a backend health timeout.
- `./node_modules/.bin/vite build` from `apps/browser-client` with bundled Node on PATH - passed.
- `node scripts/check-repo.mjs` - passed.

## Deployment status

Not deployed in this slice yet.

## Recommended next steps

- Run physical-device QA on iOS Safari, Android Chrome, desktop Chrome, and tablet Safari with real camera/microphone permissions.
- Add explicit audio-output device selection when browser support is available.
- Consider replacing the outbound local camera track with a canvas-framed track if the product needs the peer to receive the same face-framed crop, not just the local preview.
