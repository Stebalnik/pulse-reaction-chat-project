# Target system architecture

## Trust boundaries

### Client device

- camera capture;
- face/ROI processing;
- rPPG extraction where feasible;
- signal-quality assessment;
- baseline and reaction inference where feasible;
- WebRTC media encryption;
- user consent and pause controls.

### Signaling/backend

- authentication and age gating;
- matchmaking;
- WebRTC signaling;
- feature flags and model versions;
- abuse prevention;
- optional aggregate telemetry with explicit consent;
- no default raw-video storage.

## Processing pipeline

```text
Camera frames
  -> timestamp validation
  -> face/landmark tracking
  -> skin ROI masks
  -> spatial RGB traces
  -> preprocessing/resampling
  -> multiple rPPG candidates
  -> HR estimation
  -> quality and agreement gate
  -> personal baseline
  -> event alignment
  -> reaction state machine
  -> privacy-filtered UI indicator
```

## Suggested service/module boundaries

- `capture`: frame acquisition and metadata;
- `vision`: face landmarks, ROI, skin masks, motion;
- `signal`: detrending, normalization, filtering, rPPG projections;
- `estimation`: HR estimation and estimator fusion;
- `quality`: SQI, rejection reasons, confidence calibration;
- `baseline`: personalized rolling models;
- `reactions`: state machine and event alignment;
- `rtc`: WebRTC/signaling integration;
- `consent`: permissions, pausing, retention choices;
- `telemetry`: privacy-safe metrics;
- `research`: offline benchmarks and datasets.

## MVP algorithm strategy

Begin with classical transparent baselines:

1. GREEN channel baseline;
2. CHROM;
3. POS;
4. quality-based estimator selection or fusion.

Only add learned models after establishing dataset, benchmark, subgroup evaluation, and reproducible classical baselines.

## Latency

UI updates must be smoothed and delayed enough to avoid flashing artifacts. The interface should communicate a trend, not a medical-grade instantaneous pulse reading.

## Data contracts

Use schemas in `schemas/`. Raw estimates, quality decisions, baseline state, and reaction state must be independently versioned.
