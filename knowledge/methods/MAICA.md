# MAICA

## status

Phase 1.5 candidate

## summary

Multi-objective optimization using autocorrelation and ICA. It uses periodicity plus non-Gaussianity to extract a single rPPG component and avoid heuristic ICA component selection.

## evidence

- Macwan 2019: MAICA outperformed ICA, PCA, Green, CHROM, POS, and G-R in the reported UBFC-RPPG REALISTIC and MMSE-HR comparisons.

## implementation_notes

- Reported preprocessing: face/skin RGB averaging, smoothness-prior detrending with `lambda = 500`, centering, whitening.
- Reported HR estimation: FFT peak in `[0.7, 3] Hz`, 30 s moving windows with 0.5 s step for UBFC-RPPG, 15 s for MMSE-HR.
- Reported smoothing: Kalman filter for abrupt illumination/motion outliers.
- Needs periodic-motion confound tests.

## launch_priority

Defer until POS/CHROM benchmark and quality framework are stable.
