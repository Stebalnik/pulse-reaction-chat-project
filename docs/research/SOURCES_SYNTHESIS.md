# Source synthesis from `Sources/`

Date: 2026-07-26

## What matters for development

- Start with GREEN only as a sanity baseline, then implement POS and CHROM as the first serious classical estimators.
- Use 30 fps as acceptable for MVP webcam work, but expose FPS/timestamp quality and reject unreliable windows.
- Start with 30 s benchmark windows; evaluate shorter windows only as latency experiments, not as assumed-valid replacements.
- Track face/skin ROI coverage, motion, illumination instability, low brightness, shadows/specular highlights, and estimator agreement.
- Report error and abstention by skin-tone group, illumination condition, movement/speaking condition, camera class, and viewpoint whenever consented metadata exists.
- Keep PRV-like features out of launch UI until stricter validation exists.
- Do not use average HR alone to infer valence, intent, compatibility, honesty, or attraction.

## Highest-priority papers

- van Es 2023: best immediate source for POS/CHROM/GREEN comparison on UBFC-RPPG.
- Macwan 2019: useful for UBFC-RPPG capture details, MAICA, windows, FFT band, detrending, and Kalman smoothing.
- Zhang 2021: useful for low/changing illumination, background ROI correction, and failure cases for POS/Project_ICA.
- Chari not_reported: useful for fairness, skin-tone bias, shadows/specular highlights, and subgroup reporting.

## Lower-priority sources

- Kiehl 2015: useful for motion and FPS/resolution tradeoffs, but multi-imager hardware is not MVP-compatible.
- Gavriloaia 2015: useful historical PCA/EMD example, but validation is too thin for priority implementation.
- Paluszny 2026: ECG-only; useful for invalid-zone and ground-truth-quality thinking.
- Trevino 2026 correction: not relevant to this project.

## MVP implications

- Desktop app should show `INSUFFICIENT_SIGNAL` often and confidently during poor capture rather than forcing trend labels.
- First reaction states must be baseline-relative and supported by evidence features plus alternative explanations.
- The feedback loop should gather opt-in capture-quality and self-report annotations for estimator improvement, with retention/deletion rules documented before collection.
