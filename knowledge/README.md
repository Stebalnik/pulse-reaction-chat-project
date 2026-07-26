# Knowledge-base rules

## Layers

- `papers/`: one immutable evidence-focused record per publication;
- `methods/`: consolidated implementation knowledge about an algorithm;
- `claims/`: atomic scientific/product claims with evidence status;
- `experiments/`: completed experiment records;
- `CLAIM_INDEX.md`: overview of claims and status;
- `METHOD_COMPARISON.md`: comparable algorithm table;
- `EXPERIMENT_BACKLOG.md`: prioritized hypotheses to test.

## Claim record rule

A claim must contain:

- stable claim ID;
- precise wording;
- status;
- supporting papers;
- contradicting papers;
- applicability conditions;
- confidence rationale;
- product implication;
- last reviewed date.

## Paper records are append-only evidence

Correct transcription mistakes, but do not rewrite an older paper record to match a newer conclusion. Reconciliation belongs in claim and method records.
