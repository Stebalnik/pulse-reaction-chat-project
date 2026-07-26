# CLM-0011

## claim

Adaptive skin segmentation and ROI coverage metrics should be implemented before product reaction states.

## status

PROVISIONAL

## supporting_papers

- `knowledge/papers/PAPER-2019-FOUAD-ADAPTIVE-SKIN-SEGMENTATION.md`: skin segmentation improved RMSE in the extracted report.
- `knowledge/papers/PAPER-2023-VAN-ES-CONTACTLESS-CARDIOVASCULAR-ASSESSMENT.md`: skin masking can include nonskin regions, requiring quality handling.
- `knowledge/papers/PAPER-NOT_REPORTED-CHARI-DIVERSE-RPPG.md`: shadows/specular highlights and skin-tone differences affect performance.
- `knowledge/papers/PAPER-2021-ZHANG-JBSS-SKIN-REFLECTION.md`: small/lost ROI under movement reduced accuracy.

## contradicting_papers

- none in repository

## applicability_conditions

- All live rPPG estimates in desktop/browser clients.

## confidence_rationale

ROI problems recur across camera rPPG papers. Exact segmentation algorithm remains an engineering choice.

## product_implication

Reaction states must wait until HR estimates include ROI coverage and ROI rejection reasons.

## last_reviewed

2026-07-26
