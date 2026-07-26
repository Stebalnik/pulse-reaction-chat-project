# PAPER-2018-FALLET-SIGNAL-PROCESSING-CARDIOVASCULAR

## identity

- title: Signal processing techniques for cardiovascular monitoring applications using conventional and video-based photoplethysmography
- authors: Sibylle Fallet
- year: 2018
- venue: EPFL doctoral thesis
- doi: not_reported
- source_pdf: `Sources/Signal_processing_techniques_for_cardiov.pdf`
- evidence_status: PROVISIONAL

## research_question

Develop signal-processing methods for conventional PPG and video-based PPG, including adaptive frequency tracking, SQI, and clinical monitoring applications.

## method

- Covers adaptive frequency tracking, signal quality indices, multi-signal estimation, ECG/PPG fusion concepts, and video iPPG.
- Extracted appendix reports video-based HR monitoring in NICU using `iPPGgreen`, `iPPGhue`, `iPPGSSR`, `iPPGPOS`, and `iPPGGRD`.
- In realistic NICU examples, green and hue iPPG were often poor quality and discarded; SSR/POS/GRD were more useful.
- Uses SQI to reject unreliable iPPG segments.

## capture

- Broad thesis; extracted appendix includes NICU monitoring data.
- Specialized clinical context, not desktop chat.

## ground_truth

- ECG/monitor references in clinical examples.

## evaluation

- Adaptive HR estimation with quality rejection and absolute error reporting.

## results

- Extracted text emphasizes that iPPG is promising but algorithmic improvements remain required in realistic conditions.
- Supports SQI-based exclusion of unreliable iPPG data.

## limitations

- Clinical NICU data and thesis breadth are outside product scope.
- Not a single directly implementable MVP method.

## reproducibility

- Valuable reference for SQI and adaptive frequency tracking after baseline methods.

## project_relevance

- score: 7/10
- Useful for quality gating, adaptive tracking, and method fusion.

## evidence_updates

- Strengthens requirement for SQI and abstention.
- Supports comparing POS/SSR/GRD rather than relying on raw green.

## proposed_experiments

- Add SQI field implementation early.
- Research adaptive frequency tracking after FFT baseline.
