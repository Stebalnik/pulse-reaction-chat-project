# PAPER-2018-GHANADIAN-ML-ICA-RPPG

## identity

- title: A Machine Learning Method to Improve Non-Contact Heart Rate Monitoring Using an RGB Camera
- authors: Hamideh Ghanadian, Mohammad Ghodratigohar, Hussein Al Osman
- year: 2018
- venue: IEEE Access
- doi: https://doi.org/10.1109/ACCESS.2018.2872756
- source_pdf: `Sources/A_Machine_Learning_Method_to_Improve_Non.pdf`
- evidence_status: PROVISIONAL

## research_question

Improve ICA-based noncontact HR estimation from RGB face video during stationary and moving conditions using light equalization, ML-based ICA component selection, and linear regression correction.

## method

- Detect face and use the entire face as ROI.
- Convert ROI to HSL-like representation and equalize luminance across frames before reconstructing ROI.
- Average ROI RGB channels per frame and apply ICA.
- Apply low-pass filtering at 5 Hz to ICA outputs.
- Use a machine-learning component selector based on time/frequency features.
- Use regression to adjust the final HR estimate.
- Segment length: 60 s, approximately 1800 frames at 30 fps.

## capture

- camera: Logitech Webcam C270
- resolution: 640 x 480
- fps: 30
- distance: 1 m in stationary setup
- room: mixed sunlight and fluorescent light
- dataset: 220 one-minute video segments
- movement condition: subjects moved in a 7 m x 7 m room while at least 50% of the face was visible

## participants

- sample_size: 11 adults
- sex: 4 female, 7 male
- consent: signed consent; protocol number appears in paper
- skin_tone_reporting: not_reported

## ground_truth

- Zephyr Bioharness ECG sampled at 250 Hz.

## evaluation

- 70/30 split by video segment for training/testing component selector.
- RMSE, bias, Bland-Altman, and component-selection accuracy.

## results

- Abstract reports 27% RMSE reduction in stationary condition compared with prior method and 1.12 bpm RMSE in motion condition.
- ML component selector accuracy: 86.9%.
- Light equalization reduced RMSE by 0.74 bpm for moving subjects and 0.03 bpm for stationary subjects.
- Regression reduced RMSE by 0.57 bpm for moving subjects and 0.09 bpm for stationary subjects.

## limitations

- Small dataset and likely subject-dependent leakage risk unless split is subject-independent; the extracted text reports random segment split.
- Requires 60 s windows, which is too slow for first user feedback.
- Regression learned against a small setup may not generalize to new cameras/users.

## reproducibility

- Implementation steps and parameters are useful, but exact ML feature list and split strategy must be verified before reproduction.

## project_relevance

- score: 7/10
- Useful for light-equalization and ICA component-selection experiments; not launch default.

## evidence_updates

- Supports illumination normalization as an experiment.
- Supports rejecting windows when face visibility drops below a threshold.
- Adds caution against segment-random ML evaluation as product evidence.

## proposed_experiments

- Implement simple luminance-stability metrics before any ML correction.
- Add `FACE_VISIBILITY_LOW` and `COMPONENT_AMBIGUOUS` reason codes.
- If ML selector is tested, use subject-independent validation.
