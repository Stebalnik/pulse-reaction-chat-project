# PAPER-2019-FOUAD-ADAPTIVE-SKIN-SEGMENTATION

## identity

- title: Optimizing Remote Photoplethysmography Using Adaptive Skin Segmentation for Real-Time Heart Rate Monitoring
- authors: R. M. Fouad, Osama A. Omer, Moustafa H. Aly
- year: 2019
- venue: IEEE Access, Volume 7
- doi: https://doi.org/10.1109/ACCESS.2019.2922304
- pages: 76513-76528
- source_pdf: `Sources/Optimizing_Remote_Photoplethysmography_U.pdf`
- code: not_reported
- dataset_url: not_reported in this paper; dataset cited as Bobbia et al. 2017
- evidence_status: PROVISIONAL

## research_question

Can real-time webcam rPPG HR estimation be improved by using adaptive skin segmentation for ROI definition and by choosing better face detection, face tracking, skin detection, BSS/PCA decomposition, ROI policy, and window length?

Author contributions, from abstract and Section I:

- investigate adaptive skin detection for ROI definition;
- compare against a previous real-time method using face detection only;
- compare all-skin ROI versus three facial ROIs;
- compare methods for face detection, face tracking, skin detection, and blind signal separation;
- compare rPPG HR against a commercial pulse oximeter.

## method

- Pipeline: face detection -> face tracking -> adaptive skin detection -> ROI definition -> temporal RGB trace extraction -> detrending -> normalization -> moving-average smoothing -> BSS/PCA decomposition -> 0.7-4 Hz bandpass -> FFT peak HR estimation.
- Face detection: Viola-Jones cascade compared with Liao/NPD detector. Viola-Jones was selected after 5-subject comparison. See Section V.A and Table 1, page 76524.
- Face tracking: KLT compared with CAMShift. KLT was selected; face is redetected when trackable points fall below 10. See Section V.B and Table 5, pages 76521 and 76525.
- Skin detection: Conaire adaptive skin detector compared with RGB-H-CbCr threshold model. Conaire was selected. See Section V.C and Table 2, pages 76522 and 76524.
- ROI definitions: ROI 1 uses all skin pixels returned by segmentation; ROI 2 divides segmented facial skin into forehead, left cheek, and right cheek for signal fusion. See Section IV.A.4 and Figure 15, pages 76518 and 76525.
- RGB trace extraction: mean red, green, and blue values over skin pixels in ROI for each frame over a 10-second sliding window. See Section IV.A, page 76518.
- Detrending: removes linear trends caused by changing environmental parameters. See Section IV.B.1, page 76519.
- Normalization: divides raw signal by its maximum absolute value. See Section IV.B.2, page 76519.
- Smoothing: moving-average/sliding-average filter. See Section IV.B.3, page 76519.
- Decomposition candidates: JADE, FastICA, kernel ICA, SOBI ICA, and PCA. PCA was selected after comparison. See Section V.D and Table 6, pages 76522-76525.
- Bandpass: ideal 0.7-4 Hz, corresponding to 42-240 bpm. See Section IV.B.5, page 76520.
- HR estimator: FFT of selected ICA/PCA component; highest spectral peak gives HR frequency, multiplied by 60. See Section IV.C, pages 76520-76521.
- Windowing: 10 s sliding window; authors state expected frequency-bin accuracy is `df = 60 / T`, so T=10 s gives 6 bpm. See Section VI.A, page 76523.

## capture

- dataset: 45 videos from Bobbia et al. 2017 dataset.
- camera: Logitech C920 HD Pro low-cost webcam.
- resolution: 640 x 480.
- frame_rate: 30 fps.
- color_format: uncompressed 8-bit RGB.
- duration: almost 2 minutes per video.
- distance: 1-2 m.
- illumination: ambient light.
- activity: subjects were asked to sit still.
- compression: uncompressed RGB.
- runtime platform: MATLAB R2014a on Intel Core i5-2500 CPU 3.30 GHz for timing comparisons.

## participants

- videos: 45.
- participants: not_reported.
- demographics: not_reported.
- skin_tone_reporting: not_reported.
- facial hair/glasses reporting: not_reported.
- consent/ethics: not_reported.

## ground_truth

- device: CMS50E commercial pulse oximeter.
- signal: ground-truth PPG/HR from pulse oximeter.
- synchronization: not_reported.
- ground-truth sampling details: not_reported.

## evaluation

- Metrics: RMSE in bpm, accuracy percentage, and computation time per frame.
- Face detection comparison: Viola-Jones versus Liao on 5 subjects. See Table 1, page 76524.
- Skin segmentation comparison: Conaire versus RGB-H-CbCr on 5 subjects. See Table 2, page 76524.
- ROI/scheme comparison: proposed segmented ROI, ROI without skin segmentation from prior work [9], whole face [14], cropped face [33]. See Tables 3-4, pages 76524-76525.
- Tracking comparison: KLT versus CAMShift on 5 subjects. See Table 5, page 76525.
- BSS/PCA comparison: JADE, FastICA, kICA, SOBI ICA, PCA on 5 listed subjects. See Table 6, page 76525.
- Runtime comparison: proposed ROI, whole face [14], cropped face [33]. See Tables 7-8, pages 76525-76526.

## results

### Scheme accuracy and RMSE

From Tables 3-4:

| Subject | Proposed RMSE bpm | ROI without skin seg. RMSE bpm | Face [14] RMSE bpm | Cropped [33] RMSE bpm | Proposed accuracy % |
|---|---:|---:|---:|---:|---:|
| 1 | 3.71 | 5.095 | 3.91 | 11.25 | 98.63138 |
| 2 | 4.42 | 11.07 | 8.60 | 15.60 | 98.51481 |
| 3 | 3.97 | 6.06 | 7.80 | 8.90 | 98.5898 |
| 4 | 3.10 | 2.65 | 2.90 | 8.86 | 98.7242 |
| 5 | 2.70 | 4.30 | 11.37 | 15.51 | 98.78162 |

- Mean RMSE from the table values: proposed 3.58 bpm; ROI without skin segmentation 5.835 bpm; whole face [14] 6.916 bpm; cropped [33] 12.024 bpm.
- The proposed method improved mean RMSE by about 38.6% versus ROI without skin segmentation and about 48.2% versus whole-face ROI in these five subjects.
- Author conclusion states facial skin segmentation improves RMSE by nearly 50%. See Section VII, page 76526.
- Caveat: subject 4 contradicts the aggregate pattern; ROI without skin segmentation had lower RMSE than the proposed method for that subject. See Tables 3-4, pages 76524-76525.

### Face detection, skin detection, tracking, and decomposition comparisons

- Viola-Jones generally outperformed Liao for this rPPG pipeline; Liao was better only for subject 4 in Table 1. See page 76524.
- Conaire skin segmentation outperformed RGB-H-CbCr for every listed subject in Table 2. See page 76524.
- KLT had lower RMSE than CAMShift for subjects 3, 4, and 5, while CAMShift was lower for subjects 1 and 2; authors selected KLT as more robust overall. See Table 5, page 76525.
- PCA had the lowest RMSE for every listed row in the BSS/PCA comparison table. See Table 6, page 76525.

### Runtime and operations

- Computation time per frame, Table 7: dataset video 1, proposed 0.135 s/frame versus face 0.184 and cropped 0.152; dataset video 2, proposed 0.128 s/frame versus face 0.183 and cropped 0.132.
- Per-iteration operation counts, Table 8: proposed requires fewer additions, subtractions, multiplications, and divisions than face or cropped schemes.
- Engineering interpretation: the runtime result supports tracking and logging ROI pixel count/coverage because excluding nonskin pixels can reduce computation, but the MATLAB timing setup does not directly predict browser/WebAssembly performance.

## limitations

- Participants, demographics, skin-tone distribution, gender/age, facial hair/glasses, and consent/ethics are not reported in the extracted paper text.
- Subjects were asked to sit still; this does not validate mobile dating-chat movement, speech, hand-held phone motion, or changing viewpoint.
- Illumination is described only as ambient light, with no controlled low-light/step-change/specular analysis.
- Ground-truth synchronization is not reported.
- The decomposition comparison is specific to their BSS pipeline; it should not displace POS/CHROM launch candidates without internal benchmarks.
- ROI segmentation helps aggregate RMSE but can fail when too few skin pixels remain; the authors note ROI downsampling can hurt because camera sensor noise is inversely related to the square root of pixel count.
- No code is reported.

## reproducibility

- Reproducible parameters: 640 x 480, 30 fps, uncompressed RGB, Logitech C920, 1-2 m, ambient light, 10 s sliding window, 0.7-4 Hz bandpass, FFT peak HR.
- Partially reproducible: dataset is cited to Bobbia et al. 2017, but this paper does not include a URL or full acquisition protocol.
- Not reproducible from this paper alone: exact Conaire implementation settings, moving-average length, FFT/window overlap, component periodicity metric, pulse-oximeter synchronization, and data split.

## project_relevance

| Dimension | Score 0-10 | Rationale |
|---|---:|---|
| HR accuracy | 8 | Strong controlled-setting RMSE improvements versus ROI baselines. |
| Motion robustness | 3 | Uses tracking and driving motivation, but dataset subjects sit still. |
| Illumination robustness | 4 | Ambient light only; no explicit low-light/step-change validation. |
| Skin-tone coverage | 2 | No skin-tone reporting. |
| Ordinary RGB camera suitability | 8 | Uses low-cost Logitech C920, RGB, 30 fps. |
| Smartphone/web suitability | 5 | Real-time webcam parameters are relevant, but no phone/browser validation. |
| Real-time suitability | 6 | Runtime is measured, but MATLAB timings are slower than production browser expectations and not directly portable. |
| Reproducibility | 5 | Many pipeline steps and tables are reported, but implementation parameters and code are missing. |
| Baseline modeling usefulness | 5 | Supports valid HR inputs and window metadata, not baseline dynamics. |
| Reaction inference usefulness | 3 | Useful only for signal validity before reaction states; no evidence for affective interpretation. |
| Implementation cost | 6 | Skin masking and ROI coverage are feasible; full Conaire adaptation may be heavier than current heuristic/MediaPipe ROI path. |

Overall project relevance: 8/10 for ROI/quality engineering, not for product interpretation.

## evidence_updates

- Confirms `CLM-0011` with verified numeric evidence: skin segmentation improved aggregate RMSE in a controlled webcam dataset, but one subject favored nonsegmented ROI.
- Confirms `CLM-0014`: 10 s window is framed as a latency/accuracy compromise and frequency resolution follows `df = 60 / T`.
- Refines `CLM-0010`: PCA/BSS are useful benchmark comparators, and PCA performed best in this paper's tested BSS setup, but this is setup-specific.
- Refines `knowledge/methods/ADAPTIVE_SKIN_SEGMENTATION.md`: coverage and pixel count are essential; too few pixels can raise camera sensor noise.
- Does not update any reaction/emotion claim; the paper estimates HR only.

## proposed_experiments

1. Objective: benchmark whole-face, current MediaPipe zone ROI, skin-masked ROI, and skin-masked sub-ROI.
   - Evidence source: Fouad 2019 Tables 3-4 and Section VII.
   - Module affected: browser `faceRoi`, `pulseSampler`, benchmark harness.
   - Interface change: log ROI source, pixel count, skin coverage, subregion coverage, and downsample factor.
   - Acceptance criteria: report RMSE, abstention rate, ROI coverage, and reason-code distribution across lighting/motion fixtures.
   - Privacy/safety: aggregate only cleaned metrics; no raw video by default.
   - Complexity: medium.

2. Objective: test BSS/PCA only as benchmark comparators behind `COMPONENT_AMBIGUOUS` gates.
   - Evidence source: Fouad 2019 Table 6.
   - Module affected: rPPG estimator diagnostics.
   - Interface change: add PCA/ICA candidate estimates and component-selection confidence to debug output only.
   - Acceptance criteria: measure ambiguity frequency and disagreement with POS/CHROM/GREEN before any product use.
   - Privacy/safety: no user-facing interpretation changes.
   - Complexity: medium.

3. Objective: compare 10 s, 12 s, 15 s, and 30 s windows with identical ROI and estimator settings.
   - Evidence source: Fouad 2019 Section VI.A.
   - Module affected: rPPG windowing config and launch badge latency.
   - Interface change: persist window length and effective frequency resolution in debug logs.
   - Acceptance criteria: report startup latency, RMSE, temporal stability, and abstention rate.
   - Privacy/safety: no raw traces stored by default.
   - Complexity: low-medium.
