# Development synthesis from Sources

Date: 2026-07-26

## Executive summary

The `Sources/` folder supports a fast but guarded MVP path:

1. Build a local desktop rPPG pipeline around face tracking, skin/face ROI traces, GREEN sanity baseline, CHROM, and POS.
2. Add ICA/PCA only as benchmark comparators or fallback candidates after method agreement and component-ambiguity gates exist.
3. Treat motion, illumination, ROI coverage, timestamp instability, and estimator disagreement as first-class reasons to abstain.
4. Keep PRV/HRV-style features out of the launch UI; average pulse-rate trends are much easier to validate than pulse timing variability.
5. Use opt-in research feedback to improve quality gates and estimator selection, not to infer attraction, intent, honesty, compatibility, or exact emotional state.

## MVP implementation order

### 1. Capture and timestamps

- Capture frames at stable 30 fps when possible.
- Record timestamp source, frame interval jitter, dropped frames, resolution, camera label, and compression path.
- Reject windows when timestamp gaps make spectral estimation unreliable.

Useful evidence:

- Poh 2010: 15 fps webcam worked with 30 s windows, but with latency and low-light caveats.
- Maestre-Rendon 2020: smartphone-style real-time pipeline used 30 fps and 640 x 480.
- Sun 2012: low-cost webcam at 30 Hz could track HR under adequate ambient light.
- Sun 2013: PRV needs stricter sample-rate/timing validation than average HR.

### 2. Face and ROI

- Start with face detection/tracking and a conservative skin/face ROI.
- Record ROI coverage, face visibility, ROI pixel count, and ROI stability.
- Do not emit HR when ROI is too small, unstable, occluded, or dominated by non-skin pixels.

Useful evidence:

- Poh 2010: automatic face ROI plus RGB averaging is workable but ROI jitter exists even without intentional movement.
- Ghanadian 2018/2019: whole-face ROI maximizes information, but at least 50% face visibility is assumed.
- Fouad 2019: adaptive skin segmentation can improve RMSE; aggressive ROI downsampling can hurt.
- van Es 2023: whole-face ROI was chosen because forehead coverage was unreliable in UBFC-RPPG; skin masks can include nonskin pixels.

### 3. RGB traces and preprocessing

- Extract spatially averaged RGB traces.
- Store trace metadata separately from HR estimates and reaction states.
- Implement detrending/normalization, bandpass filters, and windowing as explicit versioned configuration.
- Candidate HR bands to benchmark: 0.5-3.1 Hz, 0.5-4 Hz, 0.6-4 Hz, and 0.7-4 Hz.

Useful evidence:

- Maestre-Rendon 2020: 0.5-3.1 Hz Butterworth bandpass in a simple smartphone pipeline.
- Sun 2012: 0.5-4 Hz fifth-order Butterworth.
- Fallet 2016: 0.6-4 Hz bandpass.
- Poh 2010 and Ghanadian 2018: 0.75/0.7-4 Hz-like ranges for ICA/spectral estimation.

### 4. Estimators

Implement in this order:

1. GREEN: small, deterministic sanity baseline.
2. CHROM: strong MVP candidate, motion-aware chrominance projection.
3. POS: strong MVP candidate, especially under UBFC-like conditions.
4. Agreement gate: compare GREEN/CHROM/POS or CHROM/POS confidence.
5. ICA/PCA: benchmark comparators after component ambiguity is handled.

Useful evidence:

- de Haan 2013: chrominance methods outperformed BSS approaches under motion and are directly relevant.
- van Es 2023: CHROM and POS were among the most promising methods on UBFC-RPPG.
- Macwan 2019: MAICA is interesting but should come after transparent baselines.
- Poh 2010: ICA improves raw green in still/movement conditions, but component selection is fragile.
- Fouad 2019: PCA/ICA variants and segmentation are useful benchmark axes, not automatic defaults.

### 5. Quality gates

Every HR estimate must include:

- `signalQuality`
- `confidence`
- `roiCoverage`
- `motionScore`
- `illuminationInstability`
- `method`
- `methodVersion`
- `reasonCodes`

Minimum rejection reasons for MVP:

- `NO_FACE`
- `FACE_VISIBILITY_LOW`
- `ROI_TOO_SMALL`
- `ROI_UNSTABLE`
- `LOW_ILLUMINATION`
- `ILLUMINATION_STEP_CHANGE`
- `MOTION_HIGH`
- `MOTION_IN_PULSE_BAND`
- `TIMESTAMP_UNRELIABLE`
- `ESTIMATORS_DISAGREE`
- `COMPONENT_AMBIGUOUS`
- `WINDOW_TOO_SHORT`
- `BASELINE_IMMATURE`

Useful evidence:

- Gudibandi 2016: motion artifacts can overlap the pulse frequency band, so bandpass alone is not enough.
- Zhang 2021: low/changing illumination and lost/small ROI can break POS/Project_ICA.
- Chari VITAL: skin-tone, lighting, shadows, specular highlights, talking, and camera viewpoint affect performance.
- Fallet 2018 thesis: SQI-based rejection is essential in realistic iPPG.
- Fine 2021: broader PPG noise taxonomy reinforces motion, illumination, skin-tone, respiration, temperature, and waveform-quality gates; transfer numeric wearable/contact results to rPPG only after validation.

### 6. Baseline and reactions

- Reactions must be based on the same user's baseline.
- Use broad, non-valenced states only.
- Always include confidence, evidence features, and alternative explanations.
- Never emit reaction states from invalid HR windows.
- Keep exact BPM private to the local user by default.

Useful evidence:

- Current Sources support pulse-rate estimation and quality gating.
- They do not validate attraction, intent, honesty, compatibility, or exact emotion inference.
- HR/PR changes can be caused by motion, speech, posture, temperature, caffeine, illness, medication, anxiety, exercise, or lighting artifacts.
- Fine 2021 reinforces that waveform-derived cardiovascular parameters require high waveform quality and are affected by many confounds; do not ship BP/PRV-like interpretations from webcam traces during the MVP.

## One-month desktop recommendation

### Week 1

- Desktop camera permission, preview, pause, WebRTC call flow, and local port `1059`.
- No physiology until consent is explicitly enabled.
- Capture metadata and trace buffer interfaces.

### Week 2

- GREEN + CHROM + POS estimators with deterministic configs.
- Synthetic fixtures: clean sinusoid, timestamp jitter, low FPS, ROI loss, illumination steps, motion in pulse band.
- HR schema validation.

### Week 3

- Signal-quality gate, estimator agreement, baseline phases, and local-only physiological trend display.
- Product UI includes `INSUFFICIENT_SIGNAL`.

### Week 4

- Beta packaging, opt-in research feedback, privacy-safe telemetry, failure reason dashboards, and smoke tests.

## Deferred

- Learned models.
- PRV/HRV UI.
- MAICA/JBSS production use.
- Multi-camera dependency.
- Medical-grade claims.
- Any label that implies attraction, truthfulness, intent, compatibility, or exact emotional state.

## Benchmark matrix

| Axis | Initial values |
|---|---|
| Estimator | GREEN, CHROM, POS, ICA/PCA later |
| Window length | 10 s, 15 s, 30 s |
| HR band | 0.5-3.1 Hz, 0.5-4 Hz, 0.7-4 Hz |
| ROI | whole face, skin mask, stable sub-ROI |
| Quality | ROI coverage, motion, illumination, timestamp jitter, estimator agreement |
| Output | accuracy, abstention rate, reason-code distribution, latency |
| Conditions | skin-tone group where consented, lighting, talking/speech, movement, camera viewpoint |

## Safety conclusion

The source base supports building a pulse-trend estimator and baseline-relative physiological state prototype. It does not support product copy or model outputs that infer valence, attraction, honesty, intent, compatibility, or medical status.
