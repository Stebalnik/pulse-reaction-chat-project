# Reaction model v0.1

## Core principle

The application may display **physiological reaction patterns**, not exact emotions. Heart rate and rPPG morphology are influenced by speech, movement, posture, temperature, caffeine, anxiety, illness, medication, network/video quality, and many other factors.

No label may imply attraction, dislike, truthfulness, consent, compatibility, or intent.

## Proposed normalized states

### 1. CALM_STABLE

Pulse dynamics remain near personal baseline with low short-term deviation and acceptable signal quality.

### 2. ENGAGED_ACTIVATION

Sustained, moderate activation relative to baseline, temporally associated with the conversation and not sufficiently explained by motion or speech. This is neutral-valence engagement, not “interest” or attraction.

### 3. HIGH_ACTIVATION

A larger sustained increase in activation. Possible explanations include excitement, stress, exertion, speaking, surprise, heat, or artifacts.

### 4. TRANSIENT_REACTION

A short event-aligned change followed by stabilization. The system must avoid assigning positive or negative meaning.

### 5. TENSION_PATTERN

Sustained activation with slow recovery or increased instability, only when signal quality is strong and movement confounds are low. Product copy should say “sustained activation” rather than “stress” until validated.

### 6. RECOVERY

Return toward baseline following a previously detected activation period.

### 7. INSUFFICIENT_SIGNAL

Motion, occlusion, poor illumination, insufficient skin ROI, low FPS, compression, tracking failure, or disagreement between estimators makes inference unreliable.

## Why these states

They can be defined from time-series dynamics without pretending to recover emotional valence. Six physiological states plus an explicit insufficient-signal state are appropriate for an MVP. The taxonomy must remain versioned and experimentally revisable.

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

The prototype samples camera frames at approximately 30 fps where the browser allows it and uses chromaticity-normalized RGB traces before CHROM/POS/FUSION estimation. This reduces common illumination changes but does not make the signal independent of all lighting conditions; low light, shadows, specular highlights, compression, and sudden illumination changes remain quality-gated failure modes.

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
