# PAPER-2015-KIEHL-MULTI-IMAGER-PRV-MOTION

## identity

- title: Measuring Pulse Rate Variability During Motion Artifact with a Non-Contact, Multi-Imager Photoplethysmography System
- authors: Zachary Adam Kiehl
- year: 2015
- venue: Wright State University thesis/dissertation
- doi: not_reported
- source_pdf: `Sources/Measuring_Pulse_Rate_Variability_During.pdf`
- evidence_status: PROVISIONAL

## research_question

Evaluate whether non-contact imaging PPG can recover pulse-rate-variability data under rigid head-motion artifacts, and explore sampling rate, image resolution, and number of imagers. See abstract and methods overview, pages 1-2 and 25-30.

## method

- Multi-imager array intended to mitigate rigid head motion by increasing observation dimensionality.
- Trial data were windowed and filtered in MATLAB.
- RGB pixel values were averaged and filtered into RGB time series.
- ICA produced 3 to 27 channel-space signals.
- Signals were windowed and filtered to produce pulse-rate estimates over 5-minute trials and IPI time series.
- citation_anchor: methods overview, pages 24-26.

## capture

- frame_rate_original: 120 fps
- resolution_original: 658 x 492
- trial_length: 5 minutes
- motion: trials ranged from stationary to random head motion requiring reorientation every second.
- ground-truth signals: contact ECG and contact PPG.
- citation_anchor: pages 23-28.

## participants

- sample_size: not_reported in extracted summary
- demographics: not_reported
- skin_tone_reporting: future-work factor, not a controlled variable in extracted text

## ground_truth

- ECG and contact PPG were recorded as reference signals. See abstract and methods, pages 1 and 24.

## evaluation

- HRV/PRV metrics compared between non-contact iPPG and contact methods.
- Tested reduced sampling rates of 120, 60, and 30 fps.
- Tested full versus reduced image resolution.
- Tested source/camera configurations.
- citation_anchor: Chapters 3-4, pages 26-47.

## results

- Sampling-rate comparison found no significant LF-power differences between 120, 60, and 30 fps; for some metrics, 60 fps performed better, while 30 and 60 fps were often not distinguishable. See Section 4.2, pages 37-39.
- Full versus quarter-resolution data did not show statistically supported differences for derived HRV/PRV metrics in the tested dataset. See Section 4.3, pages 40-41.
- More motion increased error; trials with little/no motion were most accurate. See Section 4.4 and conclusions, pages 42 and 67.
- A single imager was sufficient with little/no head motion, while severe motion could cause HR error increases as high as 22 bpm; increasing imager dimensionality mitigated this error. See abstract, pages 92-93.
- Three or five imagers appeared optimal in the analyzed setup. See conclusions, page 67.

## limitations

- Multi-imager hardware is not appropriate for fastest desktop MVP with ordinary webcams.
- Thesis is long and apparatus-specific; exact participant metadata and full trial design should be revisited before reproduction.
- PRV claims under motion remain PROVISIONAL and not directly transferable to reaction-state inference.

## reproducibility

- Enough high-level details for benchmark design; not enough from this pass for exact apparatus replication.

## project_relevance

- score: 6/10
- Useful for motion reason codes, FPS tradeoffs, and PRV caution.
- Not a direct implementation target for a consumer desktop app.

## evidence_updates

- Adds evidence that motion must be an explicit quality/confound signal.
- Adds evidence that 30 fps may be usable for pulse-rate work, but motion reduces reliability.
- Adds evidence that PRV is more demanding than average HR and should remain delayed.

## proposed_experiments

- Benchmark 30 fps webcam input first; do not require 60/120 fps for MVP.
- Add synthetic rigid-motion and tracking-loss fixtures.
- Keep PRV features out of first launch unless benchmarked with adequate windows and ground truth.
