# PAPER-2013-SUN-NONCONTACT-PRV-FRAMERATE

## identity

- title: Noncontact imaging photoplethysmography to effectively access pulse rate variability
- authors: Yu Sun, Sijung Hu, Vicente Azorin-Peris, Roy Kalawsky, Stephen Greenwald
- year: 2013
- venue: Journal of Biomedical Optics
- doi: https://doi.org/10.1117/1.JBO.18.6.061205
- source_pdf: `Sources/Noncontact_imaging_photoplethysmography.pdf`
- evidence_status: PROVISIONAL

## research_question

Evaluate whether high-frame-rate iPPG can assess HR, respiration rate, and PRV, and quantify how lower sample rates affect PRV.

## method

- Monochrome CMOS iPPG capture at 200 fps.
- Uniform illumination mounted around camera.
- Downsampled sequences to 100, 50, and 20 fps to test sample-rate effects.
- Fifth-order Butterworth filter with cutoff frequencies 0.05-4 Hz.
- Spline interpolation to 200 Hz before trough detection in downsampled signals.
- PRV metrics include MPP, SDPP, LF, HF, and normalized spectral measures.

## capture

- participants: 10 healthy subjects
- recording duration: 4 minutes
- frame rate: 200 fps source, simulated 100/50/20 fps
- reduced frame size for processing: 36 x 48 pixels
- reference contact PPG collected simultaneously

## ground_truth

- Contact PPG sensor.

## evaluation

- Bland-Altman and correlation comparisons between iPPG and cPPG for HR, respiration, and PRV.

## results

- Authors report 200 fps iPPG produced HR/RR/PRV measurements closely comparable to contact PPG.
- They report interpolation can partly compensate lower initial sample frequency for PRV time-domain resolution.

## limitations

- PRV was compared to contact PPG, not ECG HRV gold standard.
- High-speed monochrome camera and controlled illumination differ from consumer desktop cameras.
- Authors call for more subjects and ECG-based validation.

## reproducibility

- Useful for PRV deferral criteria and sample-rate discussions.

## project_relevance

- score: 6/10
- Useful for deciding not to expose PRV/HRV in first launch UI.

## evidence_updates

- Strengthens `CLM-0007`: PRV from camera requires stricter validation than average HR.
- Supports requiring high FPS, reliable waveform morphology, and long enough windows before PRV research features.

## proposed_experiments

- Keep PRV out of launch UI.
- Add benchmark metadata for FPS stability and interpolation method.
