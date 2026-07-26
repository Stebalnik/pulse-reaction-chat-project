# PAPER-2015-CHUNG-MOTION-COMPENSATED-ERYTHEMA

## identity

- title: High-resolution motion-compensated imaging photoplethysmography for remote heart rate monitoring
- authors: Audrey Chung, Xiao Yu Wang, Robert Amelard, Christian Scharfenberger, Joanne Leong, Jan Kulinski, Alexander Wong, David A. Clausi
- year: 2015
- venue: conference proceeding
- doi: not_reported
- source_pdf: `Sources/High_resolution_motion_compensated_imagi.pdf`
- evidence_status: PROVISIONAL

## research_question

Estimate HR from motion-compensated erythema fluctuation in high-resolution ambient facial/body video.

## method

- Track measurement locations over time using KLT-style point tracking.
- Compensate motion before extracting reflectance/erythema fluctuations.
- Uses an erythema signal based on red and green channels: extracted formula uses `log10(1/g(t)) - log10(1/r(t))`.
- Estimate HR from the strongest spectral component within plausible HR bounds.
- Compared against Eulerian Video Magnification and ICA.

## capture

- five healthy subjects
- eight videos
- static mobile phone: HTC One S
- resolution: 1080p
- fps: 30
- illumination: natural ambient light
- subjects: front-facing at rest with natural motion

## ground_truth

- not_reported in this record

## evaluation

- Percentage error comparisons for proposed EFA, EVM, and ICA.

## results

- Extracted text reports ICA percentage error around 20.0 +/- 17.3 in one table; proposed method improved robustness in this small set.
- Authors emphasize reproducibility and motion compensation over EVM/ICA in their setup.

## limitations

- Very small participant/video set.
- Ground-truth extraction was not captured in this pass.
- Erythema method is interesting but lower priority than POS/CHROM.

## reproducibility

- Useful for motion compensation and ROI tracking experiments; not enough for first launch estimator.

## project_relevance

- score: 5/10
- Useful for future optical-flow/KLT motion compensation and erythema candidate features.

## evidence_updates

- Supports tracking ROI stability over time.
- Supports testing red/green erythema transformations as research candidates.

## proposed_experiments

- Add ROI displacement/scale jitter metrics.
- Compare raw ROI averaging with motion-compensated sample-point aggregation.
