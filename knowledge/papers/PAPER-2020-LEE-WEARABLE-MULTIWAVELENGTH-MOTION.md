# PAPER-2020-LEE-WEARABLE-MULTIWAVELENGTH-MOTION

## identity

- title: Motion Artifact Reduction in Wearable Photoplethysmography Based on Multi-Channel Sensors with Multiple Wavelengths
- authors: Jongshill Lee, Minseong Kim, Hoon-Ki Park, In Young Kim
- year: 2020
- venue: Sensors
- doi: https://doi.org/10.3390/s20051493
- source_pdf: `Sources/Motion_Artifact_Reduction_in_Wearable_Ph.pdf`
- evidence_status: PROVISIONAL

## research_question

Reduce motion artifacts in wearable PPG using multiple channels and wavelengths.

## method

- Multi-channel, multi-wavelength wearable PPG.
- Motion artifact reduction through channel/wavelength combination.
- Not a facial-video rPPG method.

## capture

- wearable PPG sensors.
- exact details not fully extracted in this pass.

## ground_truth

- not_reported in this record.

## evaluation

- Motion artifact reduction and HR accuracy.

## results

- Useful as supporting evidence that wavelength/channel diversity helps motion robustness.

## limitations

- Hardware differs substantially from RGB webcam.
- Cannot justify rPPG production accuracy by itself.

## reproducibility

- Useful for research concepts around multi-channel agreement.

## project_relevance

- score: 4/10
- Supports estimator agreement/fusion as a quality concept.

## evidence_updates

- Supports treating disagreement between color channels/methods as a quality signal.

## proposed_experiments

- In rPPG, use method agreement between GREEN/CHROM/POS/ICA as an abstention gate.
