# CLM-0005

## claim

rPPG performance must be evaluated by skin tone, illumination, motion, ROI coverage, and camera viewpoint instead of aggregate error alone.

## status

SUPPORTED

## supporting_papers

- `knowledge/papers/PAPER-NOT_REPORTED-CHARI-DIVERSE-RPPG.md`: reports performance differences by skin-tone group, lighting, talking condition, and camera viewpoint.
- `knowledge/papers/PAPER-2021-ZHANG-JBSS-SKIN-REFLECTION.md`: reports different behavior across pale/dark groups, illumination levels, movement scenarios, and exercise recovery.
- `knowledge/papers/PAPER-2015-KIEHL-MULTI-IMAGER-PRV-MOTION.md`: shows motion severity changes error and source configuration can affect motion robustness.
- `knowledge/papers/PAPER-2021-FINE-PPG-INACCURACY.md`: reviews skin tone, physiology, motion, ambient light, and other PPG noise sources; transfer to facial rPPG is condition-specific.

## contradicting_papers

- none in repository

## applicability_conditions

- Any benchmark, beta telemetry summary, or research report that compares HR estimation quality.

## confidence_rationale

Multiple sources show condition-specific failure modes. This is strong enough to make subgroup/condition reporting mandatory for this project.

## product_implication

Launch metrics must include abstention and failure reasons, not only average error or user-visible success.

## last_reviewed

2026-08-01
