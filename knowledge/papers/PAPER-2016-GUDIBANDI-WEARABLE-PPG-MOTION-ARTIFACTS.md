# PAPER-2016-GUDIBANDI-WEARABLE-PPG-MOTION-ARTIFACTS

## identity

- title: PPG Heart Rate Detection in the Presence of Motion Artifacts
- authors: Sai Srujan Gudibandi
- year: 2016
- venue: Texas A&M master's thesis
- doi: not_reported
- source_pdf: `Sources/PPG_Heart_Rate_Detection_in_the_Presence.pdf`
- evidence_status: PROVISIONAL

## research_question

Reduce motion artifacts in wearable PPG and estimate HR using adaptive filtering and neural-network variants.

## method

- Discusses LMS, RLS, active noise cancellation, functional link artificial neural networks, accelerometer references, and synthetic noise references.
- Notes motion artifacts often overlap the desired PPG frequency range, so simple filtering is insufficient.
- Uses 0.5-4 Hz as a relevant PPG frequency band in extracted method discussion.

## capture

- wearable PPG datasets, including de-identified PPG and accelerometer data.
- not a facial-video rPPG dataset.

## ground_truth

- reference HR/auxiliary sensors depending on dataset.

## evaluation

- HR estimates after different motion-artifact reduction methods.

## results

- Useful general evidence that motion artifacts can occupy the same frequency band as pulse.

## limitations

- Thesis and wearable-contact PPG, not direct rPPG.
- Numeric results are not ingested as project claims in this pass.

## reproducibility

- Useful for synthetic motion artifact fixtures and adaptive-filter background.

## project_relevance

- score: 5/10
- Good for tests and reason codes, not for MVP estimator.

## evidence_updates

- Strengthens `CLM-0008`: motion cannot be fixed by bandpass filtering alone.

## proposed_experiments

- Add synthetic fixtures where motion frequency overlaps HR band.
- Add `MOTION_IN_PULSE_BAND` reason code when motion spectrum overlaps plausible HR.
