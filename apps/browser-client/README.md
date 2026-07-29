# Browser client

Browser surface for camera consent, local video processing, quality feedback, and later video-chat UI.

Current prototype:

- local camera preview;
- continuous local-only pulse-rate estimate from face/skin ROI while camera and local analysis consent are active;
- browser `FaceDetector` ROI when available, skin-cluster fallback otherwise;
- zone-based skin sampling for forehead and cheek patches instead of averaging the full face rectangle;
- chromaticity-normalized RGB sampling to reduce common lighting changes before CHROM/POS/FUSION estimation;
- live FPS display for timestamp and low-frame-rate debugging;
- baseline-relative physiological trend panel with neutral states and alternative-explanation guardrails;
- signal-quality and reason-code panel;
- temporary bot peer;
- simple chat UI.

Run with:

```bash
pnpm dev
```
