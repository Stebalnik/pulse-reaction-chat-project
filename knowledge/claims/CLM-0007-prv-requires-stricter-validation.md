# CLM-0007

## claim

PRV/HRV-style features from camera PPG require stricter validation than average pulse-rate estimates.

## status

PROVISIONAL

## supporting_papers

- `knowledge/papers/PAPER-2023-VAN-ES-CONTACTLESS-CARDIOVASCULAR-ASSESSMENT.md`: evaluates PRV features and shows method-dependent reliability; average PR is easier than many PRV dimensions.
- `knowledge/papers/PAPER-2015-KIEHL-MULTI-IMAGER-PRV-MOTION.md`: focuses on PRV under motion and shows sampling/source/motion factors affect results.

## contradicting_papers

- none in repository

## applicability_conditions

- Any attempt to use beat-to-beat or variability features in baseline/reaction inference.

## confidence_rationale

PRV requires reliable pulse waveform and timing, not just approximate average HR. Available evidence is useful but not sufficient for launch UI.

## product_implication

Keep PRV-like features out of first launch UI and behind benchmark gates.

## last_reviewed

2026-07-26
