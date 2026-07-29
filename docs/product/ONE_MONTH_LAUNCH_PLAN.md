# One-month desktop launch plan

Status: proposed  
Date: 2026-07-26

## Goal

Launch a desktop beta in one month that supports roulette-style video chat and local, consent-based pulse-trend estimation from facial video.

The beta must describe outputs as physiological dynamics relative to baseline. It must not claim to determine emotions, attraction, honesty, intent, compatibility, or medical status.

## Non-negotiable guardrails

- Explicit consent before camera-based physiological analysis.
- Immediate pause and disable controls.
- Adults-only positioning for the dating/chat use case.
- No default raw-video storage.
- No default sharing of precise BPM with the other participant.
- `INSUFFICIENT_SIGNAL` shown when quality, baseline maturity, motion, illumination, or estimator agreement is inadequate.
- Opt-in research feedback only, with documented purpose, retention, deletion, and access controls.

## Week 1 — Vertical skeleton

- Desktop shell scaffold.
- Local port `1059` configured for development.
- Connect desktop client to existing signaling server or local signaling adapter.
- Camera permission flow, preview, pause, and call teardown.
- Basic roulette matching flow with block/report placeholders.
- Shared event and session schemas drafted.

Exit criteria:

- Two local desktop clients can connect through signaling and establish a WebRTC call.
- Physiological analysis remains disabled until explicit consent is granted.

## Week 2 — First pulse pipeline

- Face/skin ROI trace extraction prototype with explicit fallback and coverage metrics.
- First transparent pulse estimator with versioned config.
- Signal-quality score, reason codes, and invalid-window behavior.
- Continuous local-only debug display for own signal quality, FPS, and own estimated pulse trend while camera and analysis consent are active.
- Synthetic fixtures and basic regression tests.

Initial estimator package:

- `packages/rppg-engine` accepts local RGB traces and returns schema-aligned HR estimates.
- Methods: GREEN sanity baseline, CHROM, POS, and CHROM/POS fusion with agreement gate.
- It has no camera, network, reaction inference, or storage behavior.

Exit criteria:

- The app can abstain reliably when face, lighting, motion, or timestamps are poor.
- HR estimates follow the schema contract.

## Week 3 — Baseline-relative reaction states

- Personal baseline calibration phases.
- Baseline-relative state machine for physiological dynamics, limited to broad neutral states such as insufficient signal, calibrating baseline, near baseline, possible activation, higher activation, and recovery.
- Alternative explanations surfaced internally and in debug logs.
- Product UI limited to broad, non-valenced trend indicators.
- Consent copy and safety UX review.

Exit criteria:

- Invalid HR windows never emit reaction states.
- Reaction output includes confidence, evidence features, and alternative explanations.

## Week 4 — Beta readiness

- Installer/package flow.
- Crash/error logging without raw video or biometric time-series retention by default.
- Opt-in research feedback flow.
- Abuse controls, report/block path, and basic moderation hooks.
- Smoke tests across supported desktop targets.
- Beta launch checklist and rollback plan.

Exit criteria:

- Small beta can run on the existing server.
- Safety, privacy, and claim-language review is complete.
- Known limitations and abstention behavior are documented.

## Scope cuts

- No learned model in the first month unless classical baselines and consented data handling are already reliable.
- No public claim that pulse dynamics reveal exact internal states.
- No storage of raw video by default.
- No compatibility, attraction, truthfulness, or medical labels.
- No minor-focused dating or reaction features.

## Success metrics

- Call setup success rate.
- Camera permission success rate.
- Percentage of sessions with sufficient signal for the local user.
- Abstention rate by reason code.
- False-positive review from opt-in annotated feedback.
- Report/block usage and safety incidents.
- Retention opt-in rate and deletion request handling time.
