# PAPER-2019-FOUAD-ADAPTIVE-SKIN-SEGMENTATION

## identity

- title: Optimizing Remote Photoplethysmography Using Adaptive Skin Segmentation for Real-Time Heart Rate Monitoring
- authors: R. M. Fouad, Osama A. Omer, Moustafa H. Aly
- year: 2019
- venue: IEEE Access
- doi: https://doi.org/10.1109/ACCESS.2019.2922304
- source_pdf: `Sources/Optimizing_Remote_Photoplethysmography_U.pdf`
- evidence_status: PROVISIONAL

## research_question

Optimize real-time rPPG HR estimation by evaluating skin segmentation, ROI selection, tracking, ICA/PCA choices, and window length.

## method

- Detect face and skin pixels.
- Extract RGB traces from ROI with and without skin segmentation.
- Compare JADE, FastICA, kernel ICA, SOBI, and PCA.
- Bandpass filtering outside 0.7-4 Hz before FFT peak estimation.
- Tests sliding-window length and latency/accuracy tradeoffs.

## capture

- camera: Logitech C920 HD webcam
- distance: not_reported in this record
- ordinary webcam setting

## participants

- participant details: not_reported in this record
- skin_tone_reporting: not_reported

## ground_truth

- not_reported in this record

## evaluation

- RMSE and runtime comparisons across segmentation, ROI, tracking, and source-separation variants.

## results

- Extracted text states PCA achieved the best RMSE among tested source-separation methods.
- Skin segmentation improved RMSE by excluding non-skin pixels.
- Longer windows improved accuracy while shorter windows improved latency; a 10 s window is discussed as a latency-oriented choice.
- Downsampling ROI degraded accuracy, likely because sensor noise strength is inversely related to sample count.

## limitations

- Exact numeric tables need verification before citation in implementation comments.
- Small/unknown participant sample.
- PCA result may be setup-specific and should not displace POS/CHROM without internal benchmark.

## reproducibility

- Useful implementation knobs for benchmark config: segmentation on/off, ROI policy, tracking policy, source-separation method, and window length.

## project_relevance

- score: 8/10
- Very useful for fast MVP engineering decisions and benchmark dimensions.

## evidence_updates

- Supports adaptive skin segmentation as early work.
- Supports recording window length as estimator configuration.
- Supports avoiding aggressive ROI downsampling in first implementation.

## proposed_experiments

- Add benchmark variants for all-face ROI vs skin-masked ROI.
- Test 10 s, 15 s, and 30 s windows for app latency.
- Include ROI pixel-count and ROI coverage in every HR estimate.
