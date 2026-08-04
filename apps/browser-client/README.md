# Browser client

Browser surface for public no-login entry, camera consent, local video processing, quality feedback, admin debugging, roulette matching, and WebRTC peer setup.

Routes:

- `/`: public entry with local anonymous SynVibe ID and readiness preview instead of fabricated reaction output.
- `/room`: public video-chat room with server-backed roulette queue and WebRTC signaling when the backend is available.
- `/admin`: internal platform/admin shell.
- `/admin/debug`: rPPG debug console.

Current prototype:

- public no-login user shell with local anonymous ID and consent/readiness-oriented preview;
- adults-only safety gate before entering the dating room;
- separate local physiological-analysis consent and revoke control in the public room;
- local registration stored on the device and posted to the own-server backend when available;
- public video-room with camera enable/pause controls and live roulette queue state;
- active-match WebRTC offer/answer/ICE exchange through the own-server signaling relay;
- local camera preview;
- continuous local-only pulse-rate estimate from face/skin ROI in the debug console while camera and local analysis consent are active;
- on-device MediaPipe Face Landmarker ROI when the model loads successfully;
- browser `FaceDetector` ROI when available, skin-cluster fallback otherwise;
- zone-based skin sampling for forehead and cheek patches instead of averaging the full face rectangle;
- chromaticity-normalized RGB sampling to reduce common lighting changes before CHROM/POS/FUSION estimation;
- live FPS display for timestamp and low-frame-rate debugging;
- requests up to 60 fps where the browser and camera allow it, while preserving FPS quality gates;
- baseline-relative physiological trend panel with neutral states and alternative-explanation guardrails;
- consent-gated public-room cleaned reaction-output upload with model/method version, confidence, quality score, reason codes, and no raw video/RGB traces;
- local-only reaction badge overlay with pulse-change visual states such as steady, soft lift, quick lift, surge, peak, settling, and cooldown;
- launch-tuned local badge calibration with visible accepted baseline estimate count and baseline span;
- signal-quality and reason-code panel;
- live estimator diagnostics with CHROM/POS/GREEN/PEAK method estimates, recent BPM history, median, and spread;
- admin/debug separation for local signal tuning and future analytics;
- automatic local debug session logging with downloadable JSON metrics for ROI, quality gates, method estimates, and badge state;
- server-backed peer match panel with report, block, and next controls;
- simple chat UI.

Run with:

```bash
pnpm dev
```
