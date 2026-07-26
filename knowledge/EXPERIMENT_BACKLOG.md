# Experiment backlog

## EXP-001 — Classical rPPG baseline comparison

Compare GREEN, CHROM, and POS under identical windows, filters, ROI, and ground truth.

## EXP-002 — Signal-quality rejection

Measure accuracy-versus-coverage as quality thresholds become stricter.

## EXP-003 — Personal baseline stability

Determine calibration duration and drift under speaking, posture, time, and illumination changes.

## EXP-004 — Event-aligned transient detection

Evaluate detection latency and false-positive rate without assigning emotional valence.

## EXP-005 — Subgroup robustness

Report error and abstention by skin-tone range, camera class, lighting, facial hair, and glasses.

## EXP-006 — Illumination and background ROI correction

Compare POS/CHROM with and without background ROI correction under low light, stepwise illumination changes, and specular/shadowed ROI regions.

## EXP-007 — Motion confound and rejection reasons

Create synthetic and real fixtures for rigid head motion, fast ROI shrink/loss, periodic nonpulse motion, and speaking-like facial movement. Report abstention and false positive windows separately.

## EXP-008 — MVP windowing and latency tradeoff

Compare 10 s, 15 s, 30 s, and rolling-smoothed windows for pulse-rate trend display. Report startup latency, stability, error, and rejection rate.

## EXP-009 — Fairness-oriented ROI weighting

After POS/CHROM baselines are stable, test facial aggregation, SNR weighting, RGB-space weighting, and diffuse/specular weighting by skin-tone group and illumination condition.

## EXP-010 — PRV feature deferral gate

Determine minimum recording duration, FPS, signal quality, and ground-truth requirements before exposing any PRV-like feature internally. Keep PRV out of launch UI until this passes.
