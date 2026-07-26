# CLM-0010

## claim

ICA/PCA/BSS methods are useful benchmark comparators but require component-selection or ambiguity handling before launch use.

## status

PROVISIONAL

## supporting_papers

- `knowledge/papers/PAPER-2010-POH-AUTOMATED-CARDIAC-PULSE-ICA.md`: ICA improved raw green but component selection was heuristic.
- `knowledge/papers/PAPER-2018-GHANADIAN-ML-ICA-RPPG.md`: ML component selector achieved 86.9% accuracy in a small dataset.
- `knowledge/papers/PAPER-2019-MACWAN-MAICA-RPPG.md`: MAICA addressed the component-selection problem with periodicity/objective functions.
- `knowledge/papers/PAPER-NOT_REPORTED-CHRISTINAKI-BSS-OPTICAL-HR.md`: reinforces BSS as a comparison family.

## contradicting_papers

- `knowledge/papers/PAPER-2013-DE-HAAN-CHROMINANCE-RPPG.md`: chrominance methods can outperform BSS under motion.

## applicability_conditions

- Benchmark harness and post-MVP candidate estimators.

## confidence_rationale

BSS evidence is useful but repeatedly shows component-order and selection ambiguity. A launch app needs deterministic quality behavior.

## product_implication

Do not show BSS-derived trends unless `COMPONENT_AMBIGUOUS` handling and estimator agreement pass.

## last_reviewed

2026-07-26
