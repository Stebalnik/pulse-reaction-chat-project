# Codex prompt: ingest an rPPG scientific article

## Mission

Analyze the provided scientific paper about video-based heart-rate measurement or related physiology, extract implementation-grade knowledge, compare it with the repository’s existing evidence, and commit a clean knowledge-base update.

## Inputs

- Paper PDF or text: `<PATH_TO_PAPER>`
- Repository root: current working directory
- Optional issue: `<ISSUE_ID>`

## Required procedure

### A. Read repository context

Read first:

- `AGENTS.md`
- `knowledge/README.md`
- `docs/architecture/SYSTEM.md`
- `docs/product/REACTION_MODEL.md`
- all relevant files in `knowledge/methods/`, `knowledge/claims/`, and `knowledge/papers/`

### B. Identify the paper

Extract title, authors, year, venue, DOI, URLs, code, dataset, and citation metadata. Use `not_reported` when unavailable.

### C. Analyze the complete method

Extract and explain:

- research question and claimed contribution;
- capture hardware, FPS, resolution, distance, illumination, compression;
- participants, demographics, skin-tone reporting, recording duration, activity;
- ground truth and synchronization;
- face detection/tracking and ROI construction;
- skin segmentation and invalid-pixel removal;
- RGB trace extraction and normalization;
- projection method (GREEN, ICA, PCA, CHROM, POS, PBV, learning method, etc.);
- filtering, detrending, interpolation, resampling, window length, overlap;
- HR/HRV estimator;
- signal-quality metrics and rejection logic;
- motion/illumination handling;
- train/validation/test protocol;
- metrics and exact numeric results;
- runtime and real-time suitability;
- limitations and reproducibility.

For formulas, preserve notation and define every variable. Attach page/section/table/figure references whenever possible.

### D. Critically assess evidence

Separate:

- author claims;
- experimentally demonstrated results;
- your engineering interpretation;
- repository hypotheses.

Check for leakage, subject-dependent evaluation, small samples, controlled lighting, limited skin-tone diversity, unrealistic motion, weak ground truth, cherry-picked metrics, missing code, or incomplete parameters.

### E. Evaluate project relevance

Score 0–10 with justification:

- HR accuracy;
- motion robustness;
- illumination robustness;
- skin-tone coverage;
- ordinary RGB camera suitability;
- smartphone/web suitability;
- real-time suitability;
- reproducibility;
- usefulness for baseline modeling;
- usefulness for reaction inference;
- implementation cost.

Do not equate better HR estimation with proven emotion or attraction inference.

### F. Update repository artifacts

Create:

`knowledge/papers/PAPER-<YEAR>-<FIRST_AUTHOR>-<SLUG>.md`

Use `schemas/paper-record.schema.yaml` and include:

- evidence summary;
- exact parameters;
- results table;
- limitations;
- reusable implementation notes;
- proposed tasks;
- proposed experiments;
- contradictions and duplicates;
- unresolved questions.

Then update only as warranted:

- `knowledge/METHOD_COMPARISON.md`
- `knowledge/CLAIM_INDEX.md`
- `knowledge/EXPERIMENT_BACKLOG.md`
- individual records in `knowledge/claims/`
- individual records in `knowledge/methods/`

### G. Deduplicate and reconcile

For every extracted claim:

- search existing knowledge records;
- mark it as new, confirming, refining, contradicting, or duplicate;
- preserve conflicting evidence and explain differing conditions;
- never overwrite stronger evidence with a weaker paper;
- increment evidence counts and update confidence transparently.

### H. Propose implementation work

Create implementation proposals, but do not change production code unless the task explicitly requests implementation.

Each proposal must include:

- objective;
- evidence source;
- module affected;
- interface change;
- acceptance criteria;
- benchmark plan;
- privacy/safety implications;
- estimated complexity;
- dependencies.

### I. Validate output

Before committing, verify:

- every number is sourced;
- metric names are not confused;
- conditions accompany results;
- absent values are not invented;
- no unsupported emotion-reading claim appears;
- markdown links and IDs are valid;
- schemas are satisfied;
- duplicate knowledge was not copied unnecessarily.

### J. Git actions

Create a focused branch:

`research/<year>-<first-author>-<short-slug>`

Commit message:

`research: ingest <short paper title>`

PR description must include:

1. paper identity;
2. main project-relevant findings;
3. files changed;
4. new/updated/contradicted claims;
5. proposed experiments;
6. limitations;
7. confirmation that no production algorithm was silently changed.

## Final response

Report:

- branch and commit;
- paper record path;
- updated claims/methods;
- top three useful findings;
- top three caveats;
- next recommended experiment.
