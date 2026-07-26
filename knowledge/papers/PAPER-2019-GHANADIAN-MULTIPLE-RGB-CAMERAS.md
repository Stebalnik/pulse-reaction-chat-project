# PAPER-2019-GHANADIAN-MULTIPLE-RGB-CAMERAS

## identity

- title: Non-contact Heart Rate Monitoring Using Multiple RGB Cameras
- authors: Hamideh Ghanadian, Hussein Al Osman
- year: 2019
- venue: book chapter, DOI series in extracted text
- doi: https://doi.org/10.1007/978-3-030-29891-3_8
- source_pdf: `Sources/Non_contact_Heart_Rate_Monitoring_Using.pdf`
- evidence_status: PROVISIONAL

## research_question

Improve noncontact HR monitoring for freely moving subjects by combining multiple RGB camera views with ICA-based RGB processing.

## method

- Uses whole-face ROI to maximize available facial information.
- Averages RGB over ROI and applies ICA.
- Extends prior single-camera movement method by choosing among camera views when the face is only partly visible.
- Requires at least 50% of face visibility in a selected view.

## capture

- subjects: 10 volunteers
- stationary set: 40 one-minute segments
- movement set: 30 one-minute segments
- fps: 30
- ground-truth sensor: Zephyr Bioharness ECG at 250 Hz
- movement room: 4 m x 4 m

## participants

- sample_size: 10
- sex: 3 female, 7 male
- consent: signed consent
- skin_tone_reporting: not_reported

## ground_truth

- ECG from Zephyr Bioharness.

## evaluation

- RMSE comparison between prior single-camera and multiple-camera setup.

## results

- Stationary RMSE table reports 2.38, 1.47, and 1.43 bpm for compared methods.
- Movement mode improved from 5.08 bpm to 0.96 bpm with multiple cameras in the extracted table.

## limitations

- Multi-camera setup is not suitable for first consumer desktop launch.
- Small sample and controlled setup.
- Useful result depends on camera selection and visibility assumptions.

## reproducibility

- Enough for architectural insight, not an MVP implementation target.

## project_relevance

- score: 5/10
- Useful for ROI visibility and camera-view failure reasoning; not practical for roulette desktop MVP.

## evidence_updates

- Supports treating ROI visibility as first-class quality metadata.
- Supports future multi-camera or alternate-view work only after single-camera MVP.

## proposed_experiments

- Add `FACE_VISIBILITY_LOW` and `ROI_TOO_SMALL` gates.
- Avoid multi-camera dependency in month-one desktop app.
