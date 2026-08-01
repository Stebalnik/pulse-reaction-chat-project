# CLM-0008

## claim

Motion must be treated as a first-class confound and rejection reason for rPPG estimates.

## status

SUPPORTED

## supporting_papers

- `knowledge/papers/PAPER-2023-VAN-ES-CONTACTLESS-CARDIOVASCULAR-ASSESSMENT.md`: UBFC-RPPG includes rigid/nonrigid movement and methods require preprocessing/postprocessing for motion artifacts.
- `knowledge/papers/PAPER-2019-MACWAN-MAICA-RPPG.md`: realistic and MMSE-HR data are harder partly because movement and facial changes introduce artifacts.
- `knowledge/papers/PAPER-2015-KIEHL-MULTI-IMAGER-PRV-MOTION.md`: motion severity increases error; multi-imager dimensionality mitigates severe head-motion artifacts.
- `knowledge/papers/PAPER-2021-ZHANG-JBSS-SKIN-REFLECTION.md`: rapid movement can shrink or lose the facial ROI and reduce accuracy.
- `knowledge/papers/PAPER-2021-FINE-PPG-INACCURACY.md`: reviews micro-motion, macro-motion, and periodic motion as PPG error sources that can skew HR readings.

## contradicting_papers

- none in repository

## applicability_conditions

- All real-time desktop and browser rPPG estimates.

## confidence_rationale

Motion appears as a repeated failure mode across classical, semi-blind, hardware-assisted rPPG sources, and broader wearable/contact PPG reviews.

## product_implication

Every HR estimate must include motion indicator and reason codes; invalid motion-confounded windows must not produce reaction states.

## last_reviewed

2026-08-01
