# PAPER-2021-FINE-PPG-INACCURACY

## identity

- title: Sources of Inaccuracy in Photoplethysmography for Continuous Cardiovascular Monitoring
- authors: Jesse Fine, Kimberly L. Branan, Andres J. Rodriguez, Tananant Boonya-ananta, Ajmal, Jessica C. Ramella-Roman, Michael J. McShane, Gerard L. Cote
- year: 2021
- venue: Biosensors 11(4), 126
- doi: https://doi.org/10.3390/bios11040126
- source_pdf: `Sources/Sources_of_Inaccuracy_in_Photoplethysmog.pdf`
- evidence_status: SUPPORTED for general PPG noise-source taxonomy; PROVISIONAL for transfer to facial RGB rPPG

## research_question

Review sources of inaccuracy in PPG systems intended for continuous cardiovascular monitoring, with emphasis on why waveform-derived parameters require careful handling outside controlled settings. See abstract and Introduction, pages 1-3.

## method

- Review article, not a new rPPG algorithm or benchmark.
- Organizes error sources into individual variation, physiology, and external perturbation. See Summary/Table 7, pages 27-28.
- Individual variation: skin tone, obesity, age, gender. See Section 2, pages 5-13.
- Physiology: respiration, venous pulsation, body-site effects, local body temperature. See Section 3, pages 14-21.
- External factors: motion artifacts, ambient light, applied pressure. See Section 4, pages 21-26.
- Discusses PPG waveform features including systolic peak, dicrotic notch, derivative features, slope transit time, pulse transit time, and waveform morphology. See Figure 1 and pages 2-3.
- The paper covers contact/wearable PPG and pulse oximetry more than camera rPPG. It cites rPPG-related references including Wang et al. 2016 algorithmic principles and de Haan 2013 CHROM in its bibliography, but its own evidence should not be treated as direct webcam rPPG validation.

## capture

- capture_hardware: not_applicable; review paper
- fps: not_applicable
- resolution: not_applicable
- distance: not_applicable
- illumination: discussed as an external perturbation rather than a controlled capture setup
- compression: not_reported
- recording_duration: not_applicable
- activity: covers rest, exercise, motion, temperature exposure, and other conditions across cited PPG studies

## participants

- sample_size: not_applicable; review paper
- demographics: summarized across cited studies; not a single cohort
- skin_tone_reporting: discussed using Fitzpatrick scale in Section 2.1, pages 5-7
- age_reporting: discussed in Section 2.3, pages 9-12
- gender_reporting: discussed in Section 2.4, pages 12-13
- limitations: cited studies vary in cohort size and demographic coverage

## ground_truth

- not_applicable for the review itself.
- Cited studies commonly compare PPG devices against ECG, pulse oximeters, or other physiological references; specific references vary by cited study.
- For project use, this supports recording ground-truth type separately as ECG, contact PPG waveform, averaged HR device output, or user-entered reference.

## evaluation

- Narrative synthesis of reported sources of error and mitigations.
- Table 7 summarizes noise source, impact, and mitigation. See pages 27-28.
- Not a head-to-head rPPG estimator evaluation and not a product validation study.

## results

| Evidence label | Finding | Project interpretation |
|---|---|---|
| FACT_FROM_PAPER | Skin tone can change optical signal behavior because melanin absorption is higher in visible wavelengths and lower in NIR; green-light PPG may have reduced performance in darker skin in several cited studies. See Section 2.1, pages 5-7. | For RGB webcam rPPG, keep skin-tone/lighting subgroup evaluation and abstention-rate reporting as required; do not assume green-channel strength is uniform across users. |
| EXPERIMENTAL_RESULT | Preejith et al. cited within the review reported absolute HR error of 1.04 BPM for "fair" skin and 10.90 BPM for "dark" skin in a 535 nm wearable PPG device. See page 5-6. | Do not transfer the numeric error to rPPG; use it as supporting evidence for subgroup evaluation and quality gates. |
| FACT_FROM_PAPER | Fine et al. note conflicting evidence from Bent et al., where six wearable devices did not show a statistically significant skin-tone relationship, possibly because aggregate error was already large and devices used red/NIR. See page 6. | Preserve condition-specific claims; skin-tone effects are supported as an evaluation requirement, not as a universal single-direction product rule for every device. |
| FACT_FROM_PAPER | Respiration can modulate PPG baseline, amplitude, and frequency through RIIV, RIAV, and RIFV. See Section 3.1 and Figure 5, pages 14-15. | Add respiration/speech/posture as alternative explanations for pulse-trend changes; do not interpret HR/rPPG changes as valence. |
| FACT_FROM_PAPER | Respiratory components are often handled with high-pass filters around 0.25-0.5 Hz. See page 15. | Supports explicit detrending/high-pass configuration, but not as sufficient by itself. |
| FACT_FROM_PAPER | Temperature changes can reduce PPG amplitude and HR-estimation accuracy; cold exposure can substantially alter AC/DC amplitude. See Section 3.4, pages 20-21. | RGB rPPG cannot measure absolute skin temperature, but thermal/body-temperature context should remain an alternative explanation and future sensor feature. |
| FACT_FROM_PAPER | Motion artifacts include micro-motion and macro-motion, and may range from 0.1 to 20 Hz; this overlaps HR-relevant frequencies cited as 1-4 Hz. See Section 4.1, page 22. | Strongly supports `MOTION_IN_PULSE_BAND`, estimator agreement gates, temporal outlier rejection, and not relying on bandpass alone. |
| EXPERIMENTAL_RESULT | Karlen et al. cited within the review used SQI with repeated Gaussian filters and cross-correlation, reporting 96.21% sensitivity and 99.2% positive predictive value for good pulses. See page 23. | Suggests a future waveform/SQI experiment, but direct beat morphology is harder for webcam rPPG and must be validated separately. |
| FACT_FROM_PAPER | Ambient light can be DC-like sunlight or variable frequency room light, can be orders of magnitude larger than the pulsatile AC component, and can cause saturation. See Section 4.2, page 25. | Supports low-illumination, illumination-step, saturation/specular, and ambient-flicker diagnostics in the browser client. |
| FACT_FROM_PAPER | Applied pressure changes PPG amplitude and waveform morphology. See Section 4.3, pages 25-26. | Mostly not applicable to camera rPPG, except as a reminder not to transfer contact PPG waveform/BP logic directly. |

## limitations

- Review article, not a controlled experiment.
- Primarily contact and wearable PPG, not ordinary RGB webcam rPPG.
- Some cited studies use active illumination wavelengths, source-detector separation, applied pressure, and contact mechanics that do not exist in a browser camera.
- Numeric performance from wearable/contact devices must not be used as expected performance for SynVibe.
- The paper discusses clinical PPG waveform features, BP-related measures, and FDA devices; this does not authorize medical claims or blood-pressure estimation in our product.
- Population-level effects are condition dependent and sometimes conflicting; report subgroup metrics and abstention, not deterministic claims about users.

## reproducibility

- Open-access review with DOI.
- Does not provide code, dataset, or a single pipeline to reproduce.
- Useful as a design checklist for failure modes, reason codes, and benchmark axes.

## project_relevance

| Dimension | Score | Justification |
|---|---:|---|
| HR accuracy | 6 | Strong general PPG error-source review, but not direct rPPG benchmark evidence. |
| motion robustness | 8 | Clear support for motion artifact detection, SQI, and motion-in-band concerns. |
| illumination robustness | 7 | Strong explanation of ambient light magnitude, saturation, and filtering needs; camera transfer is provisional. |
| skin-tone coverage | 8 | Useful optical and literature synthesis; exact RGB webcam behavior still needs our own subgroup evaluation. |
| ordinary RGB camera suitability | 3 | Mostly contact/wearable PPG, not webcam capture. |
| smartphone/web suitability | 4 | Relevant constraints, but no web runtime or camera benchmark. |
| real-time suitability | 6 | Reviews real-time SQI/motion detection concepts but not a browser implementation. |
| reproducibility | 5 | Open review, but no single algorithm to reproduce. |
| usefulness for baseline modeling | 6 | Supports subject-specific calibration and alternative explanations. |
| usefulness for reaction inference | 3 | Supports caution and confounds; does not validate reaction labels. |
| implementation cost | 5 | Mostly adds gates/experiments rather than a new estimator. |

Overall relevance: 6/10. High value for quality gates and validation design; low value as a direct rPPG algorithm source.

## evidence_updates

- Confirms `CLM-0005`: evaluate by skin tone, illumination, motion, ROI/camera conditions and abstention, not aggregate error alone.
- Confirms `CLM-0006`: ambient light and saturation/drift require quality gates or correction.
- Confirms `CLM-0007`: HRV/BP/waveform morphology require stricter validation than average pulse-rate estimates.
- Confirms `CLM-0008`: motion is a first-class PPG/rPPG confound.
- Confirms `CLM-0012`: bandpass filtering alone is insufficient because motion artifacts can overlap pulse frequencies.
- Refines `QUALITY_GATES`: add saturation/specular/ambient flicker and waveform/SQI experiments as future checks.
- Does not change estimator priority among GREEN, CHROM, POS, ICA/PCA, MAICA, or learned models.

## proposed_experiments

1. Motion-in-band real-camera fixture
   - objective: create recordings where face/ROI is visible but periodic head/lighting/body motion occurs inside plausible HR frequencies.
   - evidence source: Fine 2021 Section 4.1, pages 22-24.
   - module affected: `packages/rppg-engine`, browser debug pipeline.
   - interface change: extend debug log with motion spectral peak and method-pair switching history.
   - acceptance criteria: windows with method disagreement or temporal outliers abstain instead of emitting misleading BPM.
   - benchmark plan: compare estimated BPM against contact reference plus manual event notes.
   - privacy/safety: opt-in logs only; no raw video by default.
   - complexity: medium.
   - dependencies: consented debug sessions and optional reference pulse sensor.

2. Ambient-light saturation and flicker diagnostic
   - objective: detect low brightness, saturation, step changes, and flicker-like luminance components.
   - evidence source: Fine 2021 Section 4.2, page 25.
   - module affected: browser `PulseSampler`, `HeartRateEstimate.reasonCodes`.
   - interface change: add debug metrics for luminance mean, saturation fraction, and light-frequency score.
   - acceptance criteria: obvious lighting changes produce reason codes before trend inference.
   - benchmark plan: controlled lamp/daylight tests across camera devices.
   - privacy/safety: aggregate metrics only; no image retention by default.
   - complexity: low-medium.
   - dependencies: none.

3. Waveform/SQI research spike
   - objective: evaluate whether rPPG traces are clean enough for morphology-inspired SQI before any PRV/BP-like features.
   - evidence source: Fine 2021 motion/SQI discussion, page 23, and PPG waveform discussion, pages 2-3.
   - module affected: `packages/rppg-engine`, research pipeline.
   - interface change: add non-product SQI diagnostics, not product labels.
   - acceptance criteria: SQI improves HR abstention/accuracy without increasing false confidence.
   - benchmark plan: public rPPG datasets plus consented reference-pulse sessions.
   - privacy/safety: internal research only; no medical or BP output.
   - complexity: medium-high.
   - dependencies: reference waveform data.

## unresolved_questions

- How strongly do skin-tone effects reported for active green wearable PPG transfer to passive RGB facial rPPG under mixed lighting?
- Can browser-only video provide enough waveform quality for morphology SQI, or should launch remain spectral/agreement based?
- Which ambient-light diagnostics are reliable across webcams with auto-exposure and auto-white-balance?
- How should speaking be separated from respiration, face motion, and true HR trend in the chat setting?
