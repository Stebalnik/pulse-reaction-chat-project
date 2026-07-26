# POS

## status

MVP candidate

## summary

Plane-orthogonal-to-skin projection in temporally normalized RGB space.

## evidence

- van Es 2023: POS performed best across many PRV/time-domain metrics on UBFC-RPPG and had reported average PR bias of -0.186 BPM with 95% limits from -4.05 to 3.68 BPM.
- Macwan 2019: POS was competitive on UBFC-RPPG SIMPLE and REALISTIC.
- Zhang 2021: POS can fail in low illumination scenarios, so it must be quality-gated.
- Fallet 2018 thesis: POS remained useful in realistic iPPG examples where green/hue signals were often poor quality.

## implementation_notes

- Good first robust classical method for MVP.
- Pair with ROI coverage, motion, illumination, and estimator-agreement checks.
- Use `INSUFFICIENT_SIGNAL` instead of forcing estimates when face/skin ROI is lost or lighting changes abruptly.
- Benchmark with CHROM under identical windowing and preprocessing; do not tune one method against a different trace pipeline.

## launch_priority

High for first desktop pulse-trend prototype.
