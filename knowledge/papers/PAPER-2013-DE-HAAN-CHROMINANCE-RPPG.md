# PAPER-2013-DE-HAAN-CHROMINANCE-RPPG

## identity

- title: Robust pulse-rate from chrominance-based rPPG
- authors: Gerard de Haan, Vincent Jeanne
- year: 2013
- venue: IEEE Transactions on Biomedical Engineering
- doi: https://doi.org/10.1117/1.3602852 in PDF metadata/extraction; verify final bibliographic DOI before citation use
- source_pdf: `Sources/Robust_Pulse_Rate_From_Chrominance_Based.pdf`
- evidence_status: SUPPORTED

## research_question

Improve motion robustness of camera rPPG by using chrominance signals derived from a skin-reflection model instead of blind source separation alone. See abstract and Sections II-III.

## method

- Derives chrominance combinations from RGB traces to suppress specular/common-mode motion artifacts.
- Uses skin/face ROI and skin-mask processing.
- Benchmarks chrominance methods against ICA and PCA.
- Uses windowed overlap-add and spectral peak detection.
- Reports best chrominance interval around 1.6 s; BSS methods preferred longer intervals.

## capture

- stationary population: 117 subjects
- motion robustness: fitness setting with stationary bike and stepper
- camera: color video camera; extracted text reports 20 Hz for fitness sequence examples
- illumination: ambient/regular camera conditions

## participants

- sample_size: 117 stationary subjects for the first assessment
- skin_tone_reporting: broad skin-type discussion, but details not fully extracted in this pass

## ground_truth

- Contact PPG reference.

## evaluation

- Agreement, RMSE, standard deviation, correlation, and percent of time where correct spectral peak was selected.

## results

- For 117 stationary subjects, chrominance methods showed 92% good agreement within +/-1.96 sigma and about half the RMSE/standard deviation of BSS-based methods.
- In a fitness setting, modest motion correct peak detection improved from 79% to 98%; vigorous motion improved from 48% to 73% in the extracted abstract.
- The paper reports very high correlation for the best chrominance method, with `r = 1.00` in the extracted discussion.

## limitations

- Fitness protocol and exact camera/skin-tone details need careful re-checking before exact reproduction.
- Strong for pulse-rate tracking, not evidence for interpreting mental state or conversation meaning.

## reproducibility

- Strong mathematical and parameter guidance for CHROM implementation.
- Needs careful formula transcription from the paper before coding.

## project_relevance

- score: 10/10
- Directly supports CHROM as an MVP candidate and explains why chrominance methods can outperform ICA/PCA under motion.

## evidence_updates

- Strengthens CHROM method priority.
- Supports a new claim that short-overlap chrominance projection is a strong desktop MVP candidate when quality gates pass.

## proposed_experiments

- Implement CHROM after GREEN sanity baseline.
- Compare CHROM/POS/ICA using identical ROI traces, timestamp handling, filters, and FFT band.
- Add spectral-peak confidence and estimator-agreement gates.
