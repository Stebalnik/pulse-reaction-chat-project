# PAPER-2010-POH-AUTOMATED-CARDIAC-PULSE-ICA

## identity

- title: Non-contact, automated cardiac pulse measurements using video imaging and blind source separation
- authors: Ming-Zher Poh, Daniel J. McDuff, Rosalind W. Picard
- year: 2010
- venue: Optics Express
- doi: not_reported in extracted text
- source_pdf: `Sources/Non_contact_automated_cardiac_pulse_meas.pdf`
- evidence_status: PROVISIONAL

## research_question

Estimate cardiac pulse rate from ordinary webcam facial video using automatic face tracking and blind source separation of RGB traces. See abstract and Section 2.

## method

- Capture face video with a basic laptop webcam under ambient light.
- Automatically detect/track the face, select a facial ROI, average RGB values over ROI pixels, normalize RGB traces, and apply ICA.
- Use a 30 s moving window with 1 s increment.
- Operational pulse-frequency band: 0.75-4 Hz, corresponding to 45-240 bpm.
- Select the ICA component with the strongest pulse-like spectrum and estimate HR from the spectral peak.
- Compared raw green channel against ICA output.

## capture

- camera: built-in iSight webcam on MacBook Pro
- resolution: 640 x 480
- fps: 15
- distance: approximately 0.5 m
- illumination: ambient daylight
- videos: two 1-minute videos per participant, including still and movement scenarios

## participants

- participants: not_reported in this record; paper includes multiple participant demonstrations and a three-person simultaneous recording
- consent: human-subject approval noted
- skin_tone_reporting: not_reported

## ground_truth

- FDA-approved finger blood-volume-pulse sensor at 256 Hz.

## evaluation

- Bland-Altman, RMSE, Pearson correlation, and false-positive rate.

## results

- Still condition: RMSE improved from 6.00 bpm using raw green to 2.29 bpm after ICA.
- Movement condition: RMSE improved from 19.36 bpm using raw green to 4.63 bpm after ICA.
- Multi-person demonstration reported RMSE values below 5 bpm for all three people.
- The authors note component selection remains a problem because ICA output ordering is not stable.

## limitations

- Low-light performance was not addressed.
- Component selection was heuristic.
- 15 fps and 30 s windows imply noticeable startup latency.
- Skin-tone subgroup performance was not reported.

## reproducibility

- Method details are strong enough for an ICA benchmark baseline, but exact face tracker and component-selection choices need implementation decisions.

## project_relevance

- score: 8/10
- Useful as the canonical early ICA/BSS rPPG reference and as a reason to benchmark ICA against POS/CHROM.
- Not first launch default because ICA component selection can be unstable.

## evidence_updates

- Supports treating raw GREEN as a weak baseline that must be quality-gated.
- Supports adding ICA as a benchmark comparator.
- Supports reason codes for low ROI stability and component ambiguity.

## proposed_experiments

- Reproduce GREEN vs ICA on synthetic and public video fixtures.
- Add a `COMPONENT_AMBIGUOUS` rejection reason when no spectral component clearly dominates.
- Compare 15 fps, 30 fps, 10 s, 15 s, and 30 s windows for desktop latency.
