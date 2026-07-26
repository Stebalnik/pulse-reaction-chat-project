# CLM-0004

## claim

POS and CHROM are strong first candidates for webcam rPPG pulse-rate estimation under UBFC-like conditions.

## status

PROVISIONAL

## supporting_papers

- `knowledge/papers/PAPER-2023-VAN-ES-CONTACTLESS-CARDIOVASCULAR-ASSESSMENT.md`: authors identify POS and CHROM as the most promising methods for PR/PRV extraction on UBFC-RPPG.
- `knowledge/papers/PAPER-2019-MACWAN-MAICA-RPPG.md`: CHROM and POS were competitive classical baselines, especially on SIMPLE and REALISTIC UBFC-RPPG.

## contradicting_papers

- `knowledge/papers/PAPER-2021-ZHANG-JBSS-SKIN-REFLECTION.md`: POS/Project_ICA had large errors in some low-illumination public benchmark scenarios.

## applicability_conditions

- Adequate face visibility, ROI coverage, and illumination.
- Must be paired with signal-quality checks and reason codes.

## confidence_rationale

Evidence from UBFC-like datasets is useful, but low illumination and fast movement can break these methods.

## product_implication

Implement POS/CHROM early, but expose only local, confidence-gated trends. Prefer abstention over a forced estimate.

## last_reviewed

2026-07-26
