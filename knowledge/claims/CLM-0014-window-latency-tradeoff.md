# CLM-0014

## claim

Shorter windows improve latency but increase instability; launch configuration must record window length and estimator latency.

## status

PROVISIONAL

## supporting_papers

- `knowledge/papers/PAPER-2010-POH-AUTOMATED-CARDIAC-PULSE-ICA.md`: uses 30 s windows with 1 s increment.
- `knowledge/papers/PAPER-2019-FOUAD-ADAPTIVE-SKIN-SEGMENTATION.md`: discusses accuracy/latency tradeoff and 10 s window considerations.
- `knowledge/papers/PAPER-2016-FALLET-REAL-TIME-IPPB-ASVD.md`: uses streaming/adaptive estimation concepts and short averaged windows.
- `knowledge/papers/PAPER-2019-MACWAN-MAICA-RPPG.md`: uses 30 s windows on UBFC and shorter windows for other datasets.

## contradicting_papers

- none in repository

## applicability_conditions

- Desktop MVP and benchmark reports.

## confidence_rationale

Multiple methods expose window length as a core performance/latency parameter. Exact launch value must be measured internally.

## product_implication

Record window config and latency in algorithm outputs/logs; tune launch UI smoothing separately from estimator windows.

## last_reviewed

2026-07-26
