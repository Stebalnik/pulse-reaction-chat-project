# Development roadmap

## One-month launch override

The current delivery plan is desktop-first and optimized for a small public beta within one month. This accelerates Phases 0-4 into a narrow MVP:

- desktop client with camera consent, pause, local signal-quality display, and WebRTC chat;
- existing server used for signaling and roulette-style matching;
- first pulse-trend estimator with explicit quality gates and rejection reasons;
- reaction states limited to baseline-relative physiological dynamics and `INSUFFICIENT_SIGNAL`;
- opt-in research feedback loop for improving estimators after launch.

This override does not relax scientific, privacy, consent, age, or product-language rules.

## Phase 0 — Repository and evidence foundation

- ingest existing papers;
- build claim/method index;
- define evaluation datasets and legal/privacy review;
- create synthetic signal tests.

## Phase 1 — Offline rPPG benchmark

- common video/ground-truth loader;
- ROI and trace extraction;
- GREEN, CHROM, POS;
- HR estimator and SQI;
- reproducible benchmark reports.

## Phase 2 — Browser real-time prototype

- browser camera capture;
- face tracking and ROI visualization;
- local rPPG pipeline;
- quality UI;
- no matchmaking yet.

## Phase 3 — Baseline and physiological states

- personal calibration;
- event timeline;
- six-state model plus insufficient signal;
- confidence calibration and abstention.

## Phase 4 — Consent-based WebRTC chat

- authentication and adults-only controls;
- matchmaking and WebRTC signaling;
- bilateral consent;
- local reaction display and optional shared trend;
- block/report/moderation.

## Phase 5 — Validation

- consented study;
- subgroup and confound analysis;
- false-positive/abstention reporting;
- revise taxonomy and product claims.
