# PAPER-2021-ZHANG-JBSS-SKIN-REFLECTION

## identity

- title: Noncontact Heart Rate Measurement Using a Webcam, Based on Joint Blind Source Separation and a Skin Reflection Model: For a Wide Range of Imaging Conditions
- authors: Boyuan Zhang, Hengkang Li, Lisheng Xu, Lin Qi, Yudong Yao, Stephen E. Greenwald
- year: 2021
- venue: Computational and Mathematical Methods in Medicine
- doi: https://doi.org/10.1155/2021/9995871
- source_pdf: `Sources/Noncontact_Heart_Rate_Measurement_Using.pdf`
- evidence_status: PROVISIONAL

## research_question

Improve webcam HR estimation across skin tone, movement, exercise recovery, poor illumination, and changing illumination by combining joint blind source separation with a skin-reflection projection model. See abstract and introduction, pages 1-2.

## method

- Steps: extract facial and background ROI signals; use JBSS to remove common illumination component; apply skin-reflection projection method; select pulse signal using green-channel reference; estimate HR by FFT. See Section 2, page 3.
- Face detection/tracking: facial region in first frame, then KLT feature tracking.
- ROI: skin region as facial ROI; nonskin background as background ROI.
- Projection removes illumination variation by projecting RGB time series onto a specific orthogonal plane, then ICA separates specular and pulse-like components.
- HR band: pulse signal filtered from 42 bpm to 240 bpm before FFT.
- Windowing: 30 s windows; adjacent windows used on 60 s clips, yielding 31 windows.
- citation_anchor: Sections 2.1-2.6, pages 3-8.

## capture

- Dataset 1: previous lab dataset, 112 videos from 28 subjects, 18 pale-skinned and 10 dark-skinned; Logitech C2070i, 30 fps, 640 x 480, 1-minute clips; four scenarios.
- Dataset 2: Public Benchmark Dataset, 21 videos from 3 subjects, 30 fps, 1080 x 1920, illumination/head-motion labels.
- Dataset 3: new varying illumination dataset, 12 videos from 12 subjects, 8 pale-skinned and 4 dark-skinned; Logitech C2070i, 30 fps, 640 x 480, 1-minute clips; switched color temperature.
- citation_anchor: Section 2.5, pages 6-8.

## participants

- total across described private/new datasets: 40 subjects
- skin_tone_reporting: pale/dark categories
- consent: new varying illumination dataset participants gave informed consent and protocol had ethics review.

## ground_truth

- Dataset 1 used transmissive finger pulse oximeter with reference HR averaged over successive 10-second periods.
- Other ground-truth details are not fully extracted in this pass.

## evaluation

- Compared methods: JBSS_EEMD, POS, Project_ICA, proposed method.
- Metrics: Pearson correlation, MAD, RMSE.
- Boxplot outlier method was used for estimated HR values.
- citation_anchor: Sections 2.6-3, pages 8-11.

## results

- In lab data, POS/Project_ICA/proposed method generally outperformed JBSS_EEMD; proposed method was best for dark-skinned swinging-head scenario with MAD 7.26 bpm, RMSE 9.72 bpm, r 0.61. See Tables 3-4, pages 9-11.
- In Public Benchmark low illumination scenarios, POS and Project_ICA had much larger errors than JBSS_EEMD/proposed; proposed method was best in six scenarios and second-best in five. See Tables 5-6 and discussion, page 12.
- In the new varying illumination dataset, proposed method was best for both pale-skinned and dark-skinned groups: RMSE 4.68 bpm for pale-skinned and 5.90 bpm for dark-skinned. See Table 7, page 16.
- The authors state accuracy is worse during rapid movement because the detected facial ROI can become small or unavailable. See discussion, page 16.

## limitations

- Datasets are small, especially Public Benchmark and new varying-illumination data.
- The method may be less accurate under fast head movement because ROI extraction degrades.
- Pale/dark skin categories are coarse and not enough for fairness validation.

## reproducibility

- Public Benchmark Dataset URL is provided in the paper.
- Private/new datasets are not available according to Data Availability, page 18.

## project_relevance

- score: 8/10
- Highly useful for illumination variation handling and background ROI design.
- Candidate for post-MVP or Phase 1.5; not the first estimator because implementation is more complex than POS/CHROM.

## evidence_updates

- Adds evidence that a background ROI can help remove common illumination changes.
- Adds evidence that POS/Project_ICA can fail under low illumination, requiring quality gates and alternative processing.
- Adds evidence for reason codes around low light, changing illumination, and lost/small ROI.

## proposed_experiments

- Add background ROI trace extraction to benchmark harness as an optional feature.
- Compare POS/CHROM with and without background-illumination correction under synthetic and real lighting changes.
- Add `LOW_ILLUMINATION`, `ILLUMINATION_STEP_CHANGE`, and `ROI_TOO_SMALL` rejection reasons.
