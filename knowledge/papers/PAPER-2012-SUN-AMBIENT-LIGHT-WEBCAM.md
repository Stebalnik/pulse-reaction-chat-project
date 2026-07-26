# PAPER-2012-SUN-AMBIENT-LIGHT-WEBCAM

## identity

- title: Use of ambient light in remote photoplethysmographic systems: comparison between a high-performance camera and a low-cost webcam
- authors: Yu Sun, Charlotte Papin, Vicente Azorin-Peris, Roy Kalawsky, Stephen Greenwald, Sijung Hu
- year: 2012
- venue: Journal of Biomedical Optics
- doi: https://doi.org/10.1117/1.JBO.17.3.037005
- source_pdf: `Sources/Use_of_ambient_light_in_remote_photoplet.pdf`
- evidence_status: PROVISIONAL

## research_question

Compare high-performance camera iPPG and low-cost webcam PPG under ambient light, including rest and exercise recovery.

## method

- Manual ROI selection in facial video.
- Average pixels in ROI.
- Apply fifth-order Butterworth bandpass filter with cutoff frequencies 0.5 and 4 Hz.
- Use smoothed pseudo-Wigner-Ville distribution for time-frequency analysis.
- Analyze relationship between ambient light intensity and normalized plethysmographic signals.

## capture

- participants: 10 healthy male subjects
- high-speed CMOS camera: 640 x 512 at 50 Hz for 30 s
- webcam: Logitech Webcam Pro 9000 at 320 x 240 and 30 Hz
- contact PPG sampled at 128 Hz
- spectrometer sampled at 10 Hz
- post-exercise recordings: 180 s after cycling exercise

## ground_truth

- Contact PPG sensor and digital blood-pressure meter reference measurements.

## evaluation

- Time-frequency comparison of camera-derived PPG against contact PPG across rest and recovery.

## results

- Authors conclude high-performance camera and low-cost webcam were comparable for measuring HR and exercise-related HR changes in their setup.
- Extracted conclusion states ambient light intensity variations did not prevent both systems from tracking HR in the study.

## limitations

- Only 10 male subjects.
- Manual ROI and controlled room setup.
- Motion artifacts remained a key challenge.

## reproducibility

- Useful filter/camera parameters and ambient-light reasoning.

## project_relevance

- score: 7/10
- Supports consumer webcam feasibility under adequate ambient light, with continued motion/illumination quality gates.

## evidence_updates

- Supports desktop webcam path for beta.
- Supports 0.5-4 Hz band as a candidate configuration.
- Supports explicit illumination metric rather than assuming ambient light is unusable.

## proposed_experiments

- Add low/medium/high ambient brightness fixtures.
- Record luminance DC and normalized AC/DC metrics in research pipeline.
