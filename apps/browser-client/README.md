# Browser client

Browser surface for camera consent, local video processing, quality feedback, and later video-chat UI.

Current prototype:

- local camera preview;
- continuous local-only pulse-rate estimate from face/skin ROI while camera and local analysis consent are active;
- browser `FaceDetector` ROI when available, skin-cluster fallback otherwise;
- zone-based skin sampling for forehead and cheek patches instead of averaging the full face rectangle;
- chromaticity-normalized RGB sampling to reduce common lighting changes before CHROM/POS/FUSION estimation;
- live FPS display for timestamp and low-frame-rate debugging;
- requests up to 60 fps where the browser and camera allow it, while preserving FPS quality gates;
- baseline-relative physiological trend panel with neutral states and alternative-explanation guardrails;
- local-only reaction badge overlay with pulse-change visual states such as steady, soft lift, quick lift, surge, peak, settling, and cooldown;
- launch-tuned local badge calibration with visible accepted baseline estimate count and baseline span;
- signal-quality and reason-code panel;
- live estimator diagnostics with CHROM/POS/GREEN method estimates, recent BPM history, median, and spread;
- automatic local debug session logging with downloadable JSON metrics for ROI, quality gates, method estimates, and badge state;
- temporary bot peer;
- simple chat UI.

Run with:

```bash
pnpm dev
```
