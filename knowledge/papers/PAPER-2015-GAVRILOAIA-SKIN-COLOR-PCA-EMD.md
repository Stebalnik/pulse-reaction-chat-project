# PAPER-2015-GAVRILOAIA-SKIN-COLOR-PCA-EMD

## identity

- title: Remote Assessment of Heart Rate by Skin Color Processing
- authors: Gavriloaia Bogdan, Vizireanu Radu, Fratu Octavian, Berechet Alin, Mara Constantin, Cucu Cristian
- year: 2015
- venue: IEEE BlackSeaCom 2015, pages 112-116
- doi: https://doi.org/10.1109/BlackSeaCom.2015.7185097
- source_pdf: `Sources/Remote_Assessment_of_Heart_Rate_by_Skin.pdf`
- evidence_status: PROVISIONAL

## research_question

Estimate heart rate from facial skin color changes using a small forehead ROI, PCA filtering, and empirical mode decomposition. See abstract, page 1.

## method

- Steps: select forehead ROI, process pixel values with PCA, then EMD, then inspect FFT/heart-rate estimate.
- ROI: forehead area; one ROI row with 120 pixel values across 600 successive frames is emphasized.
- Capture: 30 fps streaming video, 576 x 720 resolution, finger pulse oximeter collected during video.
- The method argues PCA compresses data from 120 directions to 25 principal directions.
- citation_anchor: Materials and Methods and results, pages 2-5.

## capture

- fps: 30
- frames: 600
- resolution: 576 x 720
- device: not_reported
- duration: about 20 seconds inferred from 600 frames at 30 fps

## participants

- sample_size: not_reported in extracted text
- demographics: not_reported
- skin_tone_reporting: not_reported

## ground_truth

- Finger pulse oximeter signal was recorded during video capture. See page 5.

## evaluation

- Qualitative/limited comparison with pulse oximeter; no robust aggregate metrics found in extracted text.

## results

- Authors report PCA+EMD produced results similar to traditional devices, but extraction text does not provide a strong numeric validation table. See conclusion/results, page 5.
- FFT curve was not narrow, indicating nearby spectral components with smaller amplitude. See page 5.

## limitations

- Small/unclear dataset and limited quantitative reporting.
- Forehead-only ROI is fragile when hair, pose, or lighting obstructs the forehead.
- PCA/EMD pipeline may be useful as a historical baseline but should not displace POS/CHROM benchmarks.

## reproducibility

- Some implementation details are present, but participant count, exact validation protocol, and code are not_reported.

## project_relevance

- score: 3/10
- Useful mostly as an early baseline and cautionary example for insufficient validation.

## evidence_updates

- Adds weak evidence that forehead ROI and PCA/EMD can recover pulse-like frequency content under constrained conditions.
- Does not change product claims or method priority.

## proposed_experiments

- Do not implement for MVP.
- Consider as a low-priority historical comparison only if benchmark harness becomes broad enough.
