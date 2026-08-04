# Browser client

Browser surface for public no-login entry, camera consent, local video processing, quality feedback, admin debugging, and later real WebRTC matching.

Routes:

- `/`: public entry with local anonymous SynVibe ID.
- `/room`: public video-chat room shell.
- `/admin`: internal platform/admin shell.
- `/admin/debug`: rPPG debug console.

Current prototype:

- public no-login user shell with local anonymous ID;
- local registration placeholder stored on the device until server accounts are implemented;
- public video-room shell with camera enable/pause controls;
- local camera preview;
- continuous local-only pulse-rate estimate from face/skin ROI while camera and local analysis consent are active;
- on-device MediaPipe Face Landmarker ROI when the model loads successfully;
- browser `FaceDetector` ROI when available, skin-cluster fallback otherwise;
- zone-based skin sampling for forehead and cheek patches instead of averaging the full face rectangle;
- chromaticity-normalized RGB sampling to reduce common lighting changes before CHROM/POS/FUSION estimation;
- live FPS display for timestamp and low-frame-rate debugging;
- requests up to 60 fps where the browser and camera allow it, while preserving FPS quality gates;
- baseline-relative physiological trend panel with neutral states and alternative-explanation guardrails;
- local-only reaction badge overlay with pulse-change visual states such as steady, soft lift, quick lift, surge, peak, settling, and cooldown;
- launch-tuned local badge calibration with visible accepted baseline estimate count and baseline span;
- signal-quality and reason-code panel;
- live estimator diagnostics with CHROM/POS/GREEN/PEAK method estimates, recent BPM history, median, and spread;
- admin/debug separation for local signal tuning and future analytics;
- automatic local debug session logging with downloadable JSON metrics for ROI, quality gates, method estimates, and badge state;
- temporary bot peer;
- simple chat UI.

Run with:

```bash
pnpm dev
```
