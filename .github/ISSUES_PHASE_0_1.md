# Proposed GitHub Issues for Phases 0 and 1

These issue drafts are intentionally scoped before product implementation. Each issue must preserve the evidence hierarchy and safety rules in `AGENTS.md`.

## One-month desktop MVP track

### A. Scaffold desktop client runtime

Labels: `mvp`, `desktop`, `phase-0`

Acceptance criteria:

- Desktop app runs locally using port `1059`.
- Camera permission, preview, pause, and teardown states are represented in UI.
- Physiological analysis is off until explicit consent is granted.
- No raw video is sent to the server by default.

### B. Connect desktop client to existing signaling server

Labels: `mvp`, `webrtc`, `backend`

Acceptance criteria:

- Two desktop clients can establish and end a WebRTC call.
- Server handles roulette-style matching, signaling, disconnects, and reconnect attempts.
- Block/report hooks are present even if moderation tooling is minimal.
- Signaling server does not process raw video frames.

### C. Build first local pulse-trend prototype

Labels: `mvp`, `rppg`, `signal`

Acceptance criteria:

- Estimator outputs follow `schemas/hr-estimate.schema.json`.
- Every estimate includes quality, confidence, ROI coverage, motion, illumination, method version, and reason codes.
- Invalid windows abstain instead of emitting a physiological reaction state.
- Debug UI shows the local user's own quality and trend only.

### D. Add baseline-relative physiological reaction states

Labels: `mvp`, `reactions`, `safety`

Acceptance criteria:

- States are relative to the same user's baseline.
- Outputs include confidence, evidence features, and alternative explanations.
- UI includes `INSUFFICIENT_SIGNAL`.
- Labels do not imply attraction, honesty, intent, compatibility, exact emotion, or medical status.

### E. Add opt-in research feedback loop

Labels: `mvp`, `privacy`, `research`

Acceptance criteria:

- Feedback and retention are separate from basic app consent.
- User can decline research feedback and still use the app.
- Deletion path and retention period are documented.
- Stored data excludes raw video by default.

## Phase 0 — Repository and evidence foundation

### 1. Establish repository checks and workspace scaffolding

Labels: `phase-0`, `infrastructure`, `safety`

Acceptance criteria:

- pnpm workspace structure is present for browser client, signaling backend, shared schemas, and research pipeline.
- Empty directories are represented by README or `.gitkeep` files.
- A repository check validates required docs, schemas, and forbidden unsupported product claims.
- No rPPG algorithm or user application behavior is implemented.

### 2. Ingest first rPPG paper into knowledge base

Labels: `phase-0`, `research`, `knowledge`

Acceptance criteria:

- `.codex/prompts/ARTICLE_INGESTION.md` is followed.
- One `knowledge/papers/PAPER-*.md` record is created.
- Claim and method records are updated only when evidence changes.
- Missing information is recorded as `not_reported`.
- PR confirms no production algorithm was changed.

### 3. Create dataset governance and consent checklist

Labels: `phase-0`, `privacy`, `research`

Acceptance criteria:

- `docs/research/` includes consent, retention, deletion, and access-control requirements for research data.
- Raw/identifiable data storage defaults remain excluded from git.
- The document distinguishes research recording consent from product-use consent.
- Safety review confirms no covert monitoring path is introduced.

### 4. Define benchmark protocol v0

Labels: `phase-0`, `benchmark`, `research`

Acceptance criteria:

- Benchmark windows, metrics, ground-truth synchronization assumptions, and exclusion criteria are documented.
- Accuracy and abstention must both be reported.
- Subgroup and confound reporting requirements are listed.
- Protocol explicitly avoids emotion, attraction, honesty, or intent claims.

### 5. Define dataset manifest schema

Labels: `phase-0`, `schemas`, `research`

Acceptance criteria:

- A schema describes consent status, capture metadata, ground-truth source, FPS, resolution, illumination notes, activity labels, and allowed retention.
- The schema does not require raw media paths to be committed.
- Invalid or missing consent must make a dataset unavailable for benchmark use.

## Phase 1 — Offline rPPG benchmark

### 6. Implement synthetic signal fixture generator

Labels: `phase-1`, `tests`, `signal`

Acceptance criteria:

- Deterministic fixtures cover timestamps, sampling jitter, missing frames, baseline drift, motion-like artifacts, and illumination-like artifacts.
- Randomness is seeded.
- Fixtures include expected failure paths.
- No real biometric data is committed.

### 7. Implement RGB trace data contract

Labels: `phase-1`, `schemas`, `signal`

Acceptance criteria:

- A versioned trace contract records timestamps, RGB traces, ROI coverage, motion indicator, illumination indicator, and source metadata.
- Contract separates raw traces from HR estimates and reaction labels.
- Tests cover missing timestamps, invalid windows, and insufficient ROI coverage.

### 8. Implement benchmark harness skeleton

Labels: `phase-1`, `benchmark`, `research-pipeline`

Acceptance criteria:

- CLI accepts a dataset manifest and benchmark config.
- Reports include command, algorithm version, configuration, input metadata, quality metrics, and abstention rate.
- Harness can run with synthetic fixtures before real datasets are available.
- No rPPG estimator is silently selected without explicit configuration.

### 9. Add GREEN baseline estimator

Labels: `phase-1`, `rppg`, `benchmark`

Acceptance criteria:

- Implementation exposes configuration and defaults.
- Unit tests cover formulas, filters, windows, timestamps, and rejection paths.
- HR output follows `schemas/hr-estimate.schema.json`.
- Invalid windows never emit reaction states.

### 10. Add CHROM and POS candidate estimators

Labels: `phase-1`, `rppg`, `benchmark`

Acceptance criteria:

- Implementations are deterministic and versioned.
- Method records cite ingested papers before product use.
- Benchmark reports compare accuracy, coverage, and failure reasons against GREEN.
- Results do not imply emotional valence or attraction inference.

### 11. Add signal-quality and rejection report

Labels: `phase-1`, `quality`, `benchmark`

Acceptance criteria:

- Report includes signal quality, estimator agreement, ROI coverage, motion indicator, illumination indicator, and reason codes.
- Accuracy-versus-coverage tradeoff is reported.
- Insufficient-signal behavior is documented and tested.

### 12. Publish Phase 1 benchmark summary template

Labels: `phase-1`, `docs`, `benchmark`

Acceptance criteria:

- Template includes assumptions, datasets, command lines, metrics, failures, subgroup/confound notes, and privacy review.
- Template distinguishes supported findings, provisional evidence, and project hypotheses.
- Template includes rollback and reproduction instructions.
