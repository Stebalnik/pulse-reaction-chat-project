# CLM-0009

## claim

CHROM-style chrominance projection is a high-priority MVP estimator candidate for motion-aware webcam pulse-rate tracking.

## status

SUPPORTED

## supporting_papers

- `knowledge/papers/PAPER-2013-DE-HAAN-CHROMINANCE-RPPG.md`: chrominance methods outperformed BSS methods under motion in the reported fitness setting.
- `knowledge/papers/PAPER-2023-VAN-ES-CONTACTLESS-CARDIOVASCULAR-ASSESSMENT.md`: CHROM and POS were among the most promising UBFC-RPPG methods.
- `knowledge/papers/PAPER-2019-MACWAN-MAICA-RPPG.md`: CHROM remained a meaningful classical baseline.

## contradicting_papers

- `knowledge/papers/PAPER-2021-ZHANG-JBSS-SKIN-REFLECTION.md`: low illumination/changing illumination can still break classical methods.

## applicability_conditions

- Ordinary RGB camera with adequate face ROI, illumination, timestamps, and motion gates.
- Pulse-rate trend estimation, not PRV/HRV UI or reaction certainty.

## confidence_rationale

Multiple rPPG sources support CHROM as a transparent low-compute method with better motion behavior than raw green or generic BSS in relevant setups. Quality gates remain mandatory.

## product_implication

Implement CHROM in the first desktop pulse pipeline and expose only confidence-gated local trends.

## last_reviewed

2026-07-26
