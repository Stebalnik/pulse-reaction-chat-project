# CLM-0012

## claim

Motion artifacts can overlap the pulse-frequency band, so bandpass filtering alone is insufficient.

## status

SUPPORTED

## supporting_papers

- `knowledge/papers/PAPER-2016-GUDIBANDI-WEARABLE-PPG-MOTION-ARTIFACTS.md`: states many motion artifacts lie in the same frequency range as PPG.
- `knowledge/papers/PAPER-2014-LEE-RGB-REFLECTION-PPG-MOTION.md`: measures motion-related SNR changes by wavelength.
- `knowledge/papers/PAPER-2013-DE-HAAN-CHROMINANCE-RPPG.md`: develops chrominance methods specifically due to motion limitations of BSS/RGB approaches.
- `knowledge/papers/PAPER-2015-KIEHL-MULTI-IMAGER-PRV-MOTION.md`: motion severity changes remote PRV performance.

## contradicting_papers

- none in repository

## applicability_conditions

- All HR windows in uncontrolled desktop chat.

## confidence_rationale

Motion overlap is a consistent PPG/rPPG failure mode across contact, wearable, and camera settings.

## product_implication

Implement motion score, spectral motion overlap checks, and abstention; do not rely on a bandpass filter as the quality gate.

## last_reviewed

2026-07-26
