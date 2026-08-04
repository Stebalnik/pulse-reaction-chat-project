# AGENTS.md — Codex operating rules

These rules apply to every task in this repository.

## 1. Product truth

This system estimates heart-rate-related physiological dynamics from video. It does not directly observe emotions, attraction, honesty, intent, compatibility, or mental state.

Never implement or write product copy that states or implies:

- “the user likes you”;
- “the user is lying”;
- “the user is attracted to you”;
- “the system reads emotions/mind”;
- a medical diagnosis;
- certainty when signal quality or evidence is weak.

Use language such as “possible activation,” “pulse increased relative to baseline,” or “signal insufficient.”

## 2. Evidence hierarchy

Every scientific claim must be tagged as one of:

- `SUPPORTED`: replicated or strongly supported evidence;
- `PROVISIONAL`: supported by limited evidence;
- `HYPOTHESIS`: requires internal testing;
- `REJECTED`: contradicted, unsafe, or not useful.

Never silently promote a hypothesis to a product rule.

## 3. Research ingestion

When given a paper:

1. Follow `.codex/prompts/ARTICLE_INGESTION.md`.
2. Create one paper record in `knowledge/papers/`.
3. Update claim records only when evidence changes.
4. Update method comparisons and experiment backlog.
5. Preserve citations with page, section, figure, or table when available.
6. Record missing information as `null` or `not_reported`; never invent it.
7. Commit generated knowledge changes separately from implementation changes.

## 4. Engineering standards

- Prefer small modules with explicit typed interfaces.
- Keep signal processing deterministic and testable.
- Every algorithm must expose configuration and defaults.
- Do not bury constants in implementation code.
- Add unit tests for formulas, filters, windowing, timestamps, and edge cases.
- Add regression fixtures for known signals.
- Seed randomness in tests and experiments.
- Log algorithm version, configuration, input metadata, and quality metrics.
- Avoid adding a dependency when a small stable implementation is sufficient.
- Do not optimize before obtaining a correct, benchmarked baseline.

## 5. rPPG-specific rules

Every HR estimate must include:

- timestamp;
- window start/end;
- estimated BPM;
- signal-quality score;
- confidence category;
- selected method and version;
- valid skin/ROI coverage;
- motion indicator;
- illumination indicator;
- reason codes when rejected.

Never emit a reaction state from an invalid HR window.

Keep these stages separable:

1. face/landmark tracking;
2. skin ROI selection;
3. RGB trace extraction;
4. preprocessing;
5. rPPG projection (GREEN/CHROM/POS/etc.);
6. spectral/time-domain HR estimation;
7. signal-quality assessment;
8. personal baseline modeling;
9. event alignment;
10. reaction inference;
11. UI presentation.

## 6. Reaction inference rules

- Reaction inference must be relative to the same user’s baseline.
- Account for normal HR trend, motion, speech, and recovery.
- Do not infer valence from HR alone.
- Prefer “unknown” over an unsupported label.
- Store raw physiological features separately from reaction labels.
- Every reaction output must include confidence, evidence features, and alternative explanations.

## 7. Privacy and security

- Explicit informed consent is required before physiological analysis.
- Default to on-device processing where feasible.
- Do not retain raw video or biometric time series by default.
- Any retention must be opt-in, time-limited, encrypted, and documented.
- Never expose one participant’s precise BPM to another by default.
- Provide an immediate pause/disable control.
- Treat rPPG and derived features as sensitive biometric/health-adjacent data.
- Do not build covert monitoring.
- Do not analyze minors for dating or attraction features.

## 8. Git workflow

For each task:

1. Inspect existing docs and interfaces.
2. State assumptions in the PR description.
3. Create a focused branch.
4. Make the smallest coherent change.
5. Run formatting, linting, type checks, unit tests, and relevant benchmarks.
6. Update documentation and schemas.
7. Commit with Conventional Commits.
8. Open a draft PR with evidence, risks, and rollback notes.

Recommended commits:

- `research: ingest <paper>`
- `feat(rppg): add POS signal projection`
- `test(signal): add synthetic pulse regression fixture`
- `docs(reactions): clarify arousal taxonomy`

Never combine bulk paper ingestion, architecture changes, and product feature code in one commit.

## 8.1 Project work log

Maintain a human-readable project journal in `docs/work-log/`.

For meaningful tasks, add or update one dated Markdown entry that records:

- what changed;
- why it changed;
- assumptions and constraints;
- user-facing impact;
- data/privacy implications;
- commands and checks run;
- deployment status when applicable;
- recommended next steps.

Use concise handoff language so a future agent can continue from the log without reconstructing context from chat history. Do not put secrets, credentials, raw biometric traces, raw video, or private user data in the work log.

## 9. Definition of done

A task is complete only when:

- acceptance criteria are met;
- tests cover expected and failure paths;
- quality/confidence behavior is documented;
- privacy implications are reviewed;
- knowledge claims are linked to evidence;
- no unsupported product claim was introduced;
- reproducible commands are included.
