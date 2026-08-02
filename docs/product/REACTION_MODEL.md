# Reaction model v0.1

## Core principle

The application may display **physiological reaction patterns**, not exact emotions. Heart rate and rPPG morphology are influenced by speech, movement, posture, temperature, caffeine, anxiety, illness, medication, network/video quality, and many other factors.

No label may imply attraction, dislike, truthfulness, consent, compatibility, or intent.

## Launch visual badges

The launch UI should display a small local-only visual badge instead of user-facing interpretation copy. The badge is a coarse visualization of baseline-relative physiology and signal validity. It must not be described as an emotion, attraction, intent, truthfulness, compatibility, or medical state.

The allowed launch badge codes are product-facing pulse-change labels:

1. `STATIC`

Invalid or unavailable estimate. Maps from `INSUFFICIENT_SIGNAL`.

2. `TUNING`

Personal baseline is still being built. Maps from `CALIBRATING_BASELINE`.

3. `STEADY`

Pulse dynamics remain near personal baseline with low short-term deviation and acceptable signal quality.

4. `SOFT_LIFT`

Moderate upward pulse change relative to baseline, without assigning a cause.

5. `QUICK_LIFT`

Faster upward pulse change relative to baseline, without assigning a cause.

6. `SURGE`

Larger sustained upward pulse change. Possible explanations include excitement, stress, exertion, speaking, surprise, heat, or artifacts.

7. `PEAK`

Highest launch-level upward pulse-change badge, only when the baseline-relative change is large and quality gates pass.

8. `SETTLING`

Return toward baseline following a previously detected activation period.

9. `COOLDOWN`

Downward pulse movement or faster recovery toward baseline.

## Why these states

They can be defined from time-series dynamics without pretending to recover emotional valence. The visual vocabulary is richer than the internal state machine, but every badge is still derived from valid pulse-change features such as delta, slope, confidence, and recovery. The taxonomy must remain versioned and experimentally revisable.

## Required input features

- HR relative to rolling personal baseline;
- slope and acceleration of HR;
- change duration and recovery duration;
- signal quality and estimator agreement;
- motion score;
- illumination stability;
- speaking/activity indicator when available;
- event timestamps;
- recent-state history;
- baseline maturity score.

Optional research features:

- pulse amplitude proxies;
- respiratory-rate estimate;
- HRV features, only with adequate window duration and validation;
- facial action features, processed separately and never fused into certainty claims.

## Output contract

```json
{
  "state": "TRANSIENT_REACTION",
  "confidence": 0.64,
  "valid_from_ms": 12000,
  "valid_to_ms": 18500,
  "baseline_maturity": 0.78,
  "signal_quality": 0.83,
  "evidence": {
    "delta_hr_bpm": 8.2,
    "slope_bpm_per_s": 1.1,
    "motion_score": 0.12,
    "illumination_instability": 0.08
  },
  "alternative_explanations": ["speaking", "unobserved movement"],
  "model_version": "reaction-rules-0.1.0"
}
```

## Prototype implementation status

The browser prototype includes a local-only baseline-relative trend monitor as `pulse-trend-rules-0.1.0`. It is a deterministic MVP rule set, not a validated interpretation model. It only emits neutral physiological trend states and must continue to abstain when HR estimates are invalid or signal quality, motion, illumination, FPS, or baseline maturity are insufficient.

The browser prototype maps trend states to a local visual badge using `reaction-badge-0.1.0`. The badge appears on the user's own video surface and is not shared with the test peer. The UI uses pulse-change labels, abstract symbols, and intensity dots so the product does not imply a specific emotion.

For live launch testing, the browser trend monitor uses a shorter local calibration target than the package default: at least four accepted estimates spanning roughly 10 seconds, with trend acceptance starting at moderate signal quality. This is a usability setting for the prototype badge layer; invalid HR windows, estimator disagreement, high motion, and illumination instability still abstain.

The prototype samples camera frames at approximately 30 fps where the browser allows it and uses chromaticity-normalized RGB traces before CHROM/POS/FUSION estimation. This reduces common illumination changes but does not make the signal independent of all lighting conditions; low light, shadows, specular highlights, compression, and sudden illumination changes remain quality-gated failure modes.

The rPPG engine also applies a configurable monochrome illumination correction before projection: the per-window brightness trace is treated as a common-mode reference and the RGB traces remove the component linearly associated with that brightness change. This is intended to reduce lighting-induced color changes, not to make pulse estimation reliable under arbitrary illumination.

The browser prototype now uses face/skin ROI extraction before trace averaging. It uses browser `FaceDetector` when available, then samples skin-like pixels from forehead and cheek zones instead of averaging the full face rectangle. When face detection is unavailable, it falls back to a skin-cluster ROI and finally to a conservative center ROI. These fallbacks and valid zone counts must remain visible in debug UI because ROI source affects estimate reliability.

The browser prototype now attempts on-device MediaPipe Face Landmarker ROI before the browser `FaceDetector` path. The MediaPipe model and wasm runtime are served from the app's own `/vendor/mediapipe/` assets. Camera frames are processed in the browser and are not sent to MediaPipe or any external service.

The MediaPipe path is treated as an AR-style face mesh tracker for ROI stability. The visible overlay is a smoothed full-face box, while pulse traces are sampled from landmark-derived polygon masks for forehead and cheek zones rather than from the full rectangular box. Brief landmark dropouts reuse the last valid MediaPipe track before falling back to skin or center candidates.

The live ROI sampler now uses multiple forehead and cheek candidate zones. Zones must pass skin-coverage checks and local brightness-consistency checks before contributing to the aggregate RGB trace, so a localized shadow, highlight, hair occlusion, or weak skin patch is less likely to dominate the pulse estimate.

The same accepted zones are also grouped into `forehead`, `left-cheek`, and `right-cheek` traces for stability diagnostics. Each group can produce its own local fusion BPM estimate; when at least two groups are valid but disagree beyond the configured spread threshold, the main estimate is rejected with `ROI_REGIONS_DISAGREE`. This is a signal-quality guardrail, not a physiological interpretation.

The browser prototype also applies a temporal outlier gate to low-confidence BPM jumps relative to the accepted local history. A jump can be accepted faster only when GREEN, CHROM, and POS all provide tightly agreeing candidates for several consecutive samples; otherwise the window remains `TEMPORAL_OUTLIER` and must not emit a reaction state.

The live browser estimator requests up to 60 fps when available, samples frames at display cadence, and uses a 12-second minimum window for the first visible estimate. The launch UI constrains the live HR search band to 51-192 BPM to reduce low-frequency drift being selected as pulse; wider ranges require separate validation and user-specific configuration.

The live debug UI exposes recent local BPM estimates, median, spread, CHROM/POS/GREEN candidates, method spread, and the current selection or rejection reason. These diagnostics are for signal tuning and validation only; reaction states must continue to use valid baseline-relative windows and abstain when quality gates fail.

The prototype also writes a local debug session log during analysis. The log is limited to cleaned frame-level metrics such as ROI source and area, quality gates, reason codes, method estimates, trend state, and badge code. It must not include raw video frames or raw RGB traces. Users can download the JSON log for debugging.

The timestamp reliability gate should reject true capture interruptions while tolerating normal browser frame jitter that can be corrected by uniform resampling. Skin fallback ROI must also avoid full-frame capture when skin-like pixels cover most of the frame; in that case the fallback is constrained to an upper-center face-candidate region.

Blood pressure or other cardiovascular parameters must remain `HYPOTHESIS` research outputs until there is dedicated evidence, consented validation data, and a separate safety review. The current product surface is limited to pulse-rate estimates and neutral pulse-trend changes.

## Gating rules

Do not classify when:

- signal quality is below threshold;
- baseline is immature;
- face/skin ROI is lost;
- movement or lighting change can explain the pulse estimate;
- estimators disagree beyond tolerance;
- the observation window is too short;
- timestamps are unreliable.

## Baseline phases

1. `UNINITIALIZED`
2. `CALIBRATING`
3. `USABLE`
4. `MATURE`
5. `STALE`

A user’s baseline must not be transferred to another user.

## Validation plan

The taxonomy is a hypothesis until validated using consented, event-annotated sessions. Evaluation must report false positive rate, detection latency, calibration, abstention rate, subgroup performance, and robustness to movement and illumination.
