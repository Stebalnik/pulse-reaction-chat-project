# CLM-0003

## claim

Classical GREEN, CHROM, and POS methods should be benchmarked before learned models.

## status

PROVISIONAL

## supporting_papers

- `knowledge/papers/PAPER-2023-VAN-ES-CONTACTLESS-CARDIOVASCULAR-ASSESSMENT.md`: POS and CHROM performed well on UBFC-RPPG; average PR correlations exceeded 0.9 for several classical methods.
- `knowledge/papers/PAPER-2019-MACWAN-MAICA-RPPG.md`: classical methods were compared against MAICA, with CHROM/POS competitive on SIMPLE and still meaningful on REALISTIC/MMSE-HR.

## contradicting_papers

- none in repository

## applicability_conditions

- Ordinary RGB webcam or desktop camera input.
- First offline benchmark and MVP pulse-trend work.
- Does not imply classical methods are sufficient for all skin tones, low light, movement, or production reliability.

## confidence_rationale

Classical methods are transparent, low-compute, and well represented in the ingested comparisons. Evidence is still provisional because implementation details, datasets, and subgroup coverage vary.

## product_implication

Use classical methods for initial local pulse-trend estimation and benchmark harness. Do not make claims beyond signal-quality-gated physiological dynamics.

## last_reviewed

2026-07-26
