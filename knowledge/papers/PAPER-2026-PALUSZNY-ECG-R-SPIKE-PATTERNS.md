# PAPER-2026-PALUSZNY-ECG-R-SPIKE-PATTERNS

## identity

- title: Analyzing long wearable electrocardiogram recordings: R-spike detection and cycle pattern analysis
- authors: Marco Paluszny, Marianela Lentini
- year: 2026
- venue: Academia Engineering 3
- doi: https://doi.org/10.20935/AcadEng8197
- source_pdf: `Sources/Analyzing_long_wearable_electrocardiogra.pdf`
- evidence_status: PROVISIONAL

## research_question

Detect R-spikes and coherent cycle patterns in very long, noisy wearable ECG recordings. This is not an rPPG paper, but it is relevant to ground-truth quality, noisy-zone rejection, and cycle/window thinking. See abstract, page 1.

## method

- Minimal preprocessing: linear convolution filter or Fasano-Villani method for wandering baseline.
- Detect zones without meaningful ECG signal before cycle analysis.
- R-spike candidates use a threshold approach exploiting relatively narrow R-spike amplitude range with respect to the wandering line.
- Good zones require consecutive R-spike distance no greater than twice the sampling rate and at least 15 heartbeats.
- Blocks typically use 50-200 cycles; 100-cycle blocks are common in examples.
- Coherent block pattern is computed from the top 90% most similar cycles.
- citation_anchor: Sections on method and good zones, pages 3-7.

## capture

- data_source: MIT-BIH sinus normal examples and long wearable ECG recordings
- duration: up to 24 hours discussed
- sensors: portable ECG

## participants

- healthy/asymptomatic individuals discussed
- exact participant metadata: not_reported in this record

## ground_truth

- This paper concerns ECG processing itself; it is not a video/PPG ground-truth study.

## evaluation

- Compares R-spike detection behavior with Pan-Tompkins visually and computationally.
- Presents good zones, block counts, and coherent patterns for several ECG datasets.

## results

- Authors report the proposed R-spike method compares favorably with Pan-Tompkins and lower CPU time in examples. See pages 4-6.
- Authors demonstrate automatic extraction of coherent cycle patterns from noisy ECG. See conclusions, page 9.

## limitations

- Not an rPPG method.
- Clinical anomaly implications are outside this project's product scope.
- Useful only for ground-truth validation concepts, signal-quality rejection, and long-recording artifact thinking.

## reproducibility

- Uses Matlab 2025a; exact code availability not_reported.

## project_relevance

- score: 4/10
- Useful for thinking about ECG/PPG reference cleaning and invalid-zone segmentation in offline benchmarks.
- Not a candidate for app implementation.

## evidence_updates

- Adds support for separating noisy/invalid zones before estimating physiological features.
- Does not change rPPG method priority.

## proposed_experiments

- Add benchmark-loader checks for invalid or missing ground-truth segments.
- Record whether benchmark labels are from ECG, PPG waveform, or averaged HR device output.
