# PAPER-NOT_REPORTED-CHARI-DIVERSE-RPPG

## identity

- title: Diverse R-PPG: Camera-Based Heart Rate Estimation for Diverse Subject Skin-Tones and Scenes
- authors: Pradyumna Chari, Krish Kabra, Doruk Karinca, Soumyarup Lahiri, Diplav Srivastava, Kimaya Kulkarni, Tianyuan Chen, Maxime Cannesson, Laleh Jalilian, Achuta Kadambi
- year: not_reported
- venue: not_reported
- doi: not_reported
- source_pdf: `Sources/Diverse_R_PPG_Camera_Based_Heart_Rate_Es.pdf`
- evidence_status: PROVISIONAL

## research_question

Assess skin-tone and scene-condition bias in camera-based HR estimation, introduce VITAL, and evaluate a physics-driven ROI weighting method intended to reduce errors from lighting changes, shadows, specular highlights, and darker skin tones. See abstract and introduction, pages 1-4.

## method

- Benchmark compares facial aggregation, SNR weighting, and a proposed method.
- Common front-end for methods: face detection, face normalization, cropping via facial feature points, optional skin segmentation, temporal RGB signal construction, and common HR selection. See Benchmark Methods, pages 4-5.
- Proposed method has two key ideas: RGB-space weighting before inference and skin diffuse component weighting to reduce specular-highlight influence. See Methods, pages 22-25.
- The paper argues imaging noise, shadows, and specular highlights are major causes of skin-tone and lighting performance gaps, not only tissue optics. See theoretical analysis, pages 18-21.

## capture

- dataset: VITAL
- videos: 432
- subjects: 54
- total duration: about 864 minutes
- device setup: smartphone cameras with multiple view angles
- conditions: controlled lighting, ambient lighting, talking/activity scenarios, front and lower camera viewpoints
- citation_anchor: abstract and VITAL dataset description, pages 1, 4-6

## participants

- sample_size: 54
- skin_tone_reporting: Fitzpatrick grouped as light FP 1-2, medium FP 3-4, dark FP 5-6
- additional demographics: age, sex, BMI, race, ethnicity summarized in Table 1

## ground_truth

- Philips IntelliVue MX800 patient monitor PPG/HR. See Figure 1 caption and Results Summary, pages 17 and 4.

## evaluation

- Metrics: MAE, standard deviation of error, Pearson correlation, Bland-Altman plots.
- Analyses grouped by skin tone, lighting, talking condition, and camera viewpoint. See Results Summary, pages 4-10.

## results

- Proposed method achieved overall average MAE 4.17 bpm on VITAL versus 4.49 bpm for facial aggregation and 4.81 bpm for SNR weighting. See discussion, page 10.
- Proposed method was the only compared method under 6 bpm MAE across all three skin-tone groups in the reported data. See Results Summary and discussion, pages 5 and 10.
- Dark skin still had lower correlation than light/medium skin: reported proposed-method correlations were r = 0.83 for light, r = 0.85 for medium, and r = 0.52 for dark. See Results Summary, page 6.
- Proposed method improved MAE by 0.20 bpm, 0.31 bpm, and 0.55 bpm for light, medium, and dark groups respectively versus facial aggregation. See Results Summary, page 5.
- The authors explicitly state the method mitigates but does not remove skin-tone bias. See Results Summary, page 5.

## limitations

- Publication year/venue/DOI are not available in the provided PDF text.
- VITAL is more diverse than many rPPG datasets but still not fully unbiased. See discussion, page 12.
- Method requires careful implementation of diffuse/specular weighting; it is not a one-month MVP baseline unless simpler methods are already tested.
- Clinical framing in the paper must not be transferred to our product as diagnosis or health-grade accuracy.

## reproducibility

- Dataset availability is not established from the PDF text.
- Method description is implementation-relevant but requires deriving exact weighting details from the full Methods section before coding.

## project_relevance

- score: 8/10
- Very useful for fairness requirements, subgroup reporting, ROI weighting experiments, and reason codes for shadows/specular highlights.
- Less suitable as the first estimator because it is more complex than GREEN/CHROM/POS.

## evidence_updates

- Adds evidence that skin-tone, lighting, shadows, and specular highlights must be benchmark dimensions.
- Adds evidence against evaluating only aggregate MAE.
- Supports keeping abstention/failure rates by subgroup.

## proposed_experiments

- Add benchmark report columns for skin-tone group when consented metadata exists.
- Add reason codes for low brightness, specular highlight, shadowed ROI, and unstable illumination.
- Compare simple facial aggregation, SNR weighting, and RGB-space weighting after classical baselines.
