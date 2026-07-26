# PAPER-2015-MORENO-FACIAL-VIDEO-HRV

## identity

- title: Facial Video-Based Photoplethysmography to Detect HRV at Rest
- authors: J. Moreno, J. Ramos-Castro, J. Movellan, E. Parrado, G. Rodas, L. Capdevila
- year: 2015
- venue: International Journal of Sports Medicine
- doi: https://doi.org/10.1055/s-0034-1398530
- source_pdf: `Sources/Facial_Video_Based_Photoplethysmography.pdf`
- evidence_status: PROVISIONAL

## research_question

Compare facial video PPG-derived HRV/PRV metrics with Polar RR intervals during a standard 5-minute rest test with paced breathing.

## method

- Facial video recording and custom analysis software.
- New procedure selects pixels containing more heartbeat information to improve SNR.
- Compares supine and sitting postures.

## capture

- participants: 20 individuals
- protocol: 5-minute rest test with paced breathing
- postures: supine and sitting

## ground_truth

- Polar RR interval system.

## evaluation

- Concordance correlations, ANOVA effect sizes, Bland-Altman plots.

## results

- Supine position showed smaller differences than sitting position for most HRV parameters.
- Results were acceptable in both postures but better when supine.

## limitations

- Resting, paced-breathing protocol is unlike live video chat.
- HRV/PRV evidence does not validate reaction inference.
- Sitting posture, which is more relevant to desktop chat, had weaker agreement.

## reproducibility

- Useful for pixel/SNR weighting ideas and posture confound handling.

## project_relevance

- score: 6/10
- Supports posture/activity as confounds and PRV deferral.

## evidence_updates

- Supports adding posture/speaking/movement confounds to reaction alternatives.
- Supports not using HRV-style features in month-one UI.

## proposed_experiments

- Add sitting-vs-stillness posture notes to benchmark metadata.
- Test pixel/SNR weighting after basic ROI pipeline works.
