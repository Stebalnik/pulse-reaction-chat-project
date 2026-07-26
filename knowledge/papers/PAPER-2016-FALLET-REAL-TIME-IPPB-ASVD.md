# PAPER-2016-FALLET-REAL-TIME-IPPB-ASVD

## identity

- title: Real-Time Approaches for Heart Rate Monitoring using Imaging Photoplethysmography
- authors: Sibylle Fallet, Leila Mirmohamadsadeghi, Virginie Moser, Fabian Braun, Jean-Marc Vesin
- year: 2016
- venue: Computing in Cardiology
- doi: https://doi.org/10.22489/CinC.2016.099-140
- source_pdf: `Sources/Real_Time_Approaches_for_Heart_Rate_Moni.pdf`
- evidence_status: PROVISIONAL

## research_question

Estimate HR in real time from iPPG using adaptive sliding-window SVD and compare RGB and near-infrared camera settings.

## method

- Select forehead ROI.
- Extract raw iPPG signals and bandpass filter between 0.6 and 4 Hz with an 8th-order filter.
- Use adaptive sliding-window singular value decomposition.
- Reference RR intervals are resampled to 4 Hz.
- HR is averaged on 4 s windows with 3 s overlap.
- ASVD uses a 50-sample causal sliding window with step size of one sample.

## capture

- 22 sequences with RGB camera and 22 sequences with NIR camera in extracted text.
- video sampled at 20 fps.
- NIR camera with infrared illumination also investigated.

## participants

- participant details: not fully extracted
- skin_tone_reporting: not_reported

## ground_truth

- ECG-derived RR intervals.

## evaluation

- Real-time HR tracking accuracy and behavior across RGB/NIR settings.

## results

- Extracted record confirms real-time feasibility of ASVD-style tracking, but exact result table needs re-checking before numeric claims.

## limitations

- Forehead-only ROI may be fragile in desktop dating/chat posture.
- NIR setup is not consumer MVP.

## reproducibility

- Useful for real-time estimator architecture and adaptive frequency tracking options.

## project_relevance

- score: 7/10
- Useful for future low-latency HR smoothing/frequency tracking after POS/CHROM baselines.

## evidence_updates

- Supports treating HR estimation as a streaming estimator, not only independent FFT windows.
- Supports storing estimator latency and update cadence in config.

## proposed_experiments

- Compare FFT peak tracking with adaptive frequency tracking after first MVP baseline.
- Add `estimatorLatencyMs` to benchmark reports.
