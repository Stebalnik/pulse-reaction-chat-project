# CLM-0006

## claim

Low or changing illumination and specular/shadowed regions require explicit quality gates or correction logic.

## status

PROVISIONAL

## supporting_papers

- `knowledge/papers/PAPER-2021-ZHANG-JBSS-SKIN-REFLECTION.md`: proposed JBSS plus background ROI specifically improved changing illumination cases and reported POS/Project_ICA failures in low illumination scenarios.
- `knowledge/papers/PAPER-NOT_REPORTED-CHARI-DIVERSE-RPPG.md`: links imaging noise, shadows, and specular highlights to performance gaps and proposes diffuse/specular weighting.
- `knowledge/papers/PAPER-2021-FINE-PPG-INACCURACY.md`: ambient light can be DC-like or variable-frequency, can be orders of magnitude larger than pulsatile AC PPG, and can cause saturation.

## contradicting_papers

- none in repository

## applicability_conditions

- Ordinary desktop webcams under uncontrolled user lighting.

## confidence_rationale

Evidence clearly shows illumination matters, but exact correction choice remains an engineering question and must be validated for passive RGB webcams.

## product_implication

Add illumination instability, low-brightness, saturation, shadow/specular, and ambient-flicker reason codes where validated; avoid reaction states from affected windows.

## last_reviewed

2026-08-01
