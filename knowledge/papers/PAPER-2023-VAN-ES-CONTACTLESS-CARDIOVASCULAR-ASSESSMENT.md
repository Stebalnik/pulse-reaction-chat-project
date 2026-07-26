# PAPER-2023-VAN-ES-CONTACTLESS-CARDIOVASCULAR-ASSESSMENT

## identity

- title: Contactless Cardiovascular Assessment by Imaging Photoplethysmography: A Comparison with Wearable Monitoring
- authors: V. A. A. van Es, R. G. P. Lopata, E. P. Scilingo, M. Nardelli
- year: 2023
- venue: Sensors 23(3), 1505
- doi: https://doi.org/10.3390/s23031505
- source_pdf: `Sources/Contactless_Cardiovascular_Assessment_by.pdf`
- evidence_status: PROVISIONAL

## research_question

Compare eight iPPG extraction methods for pulse rate and pulse-rate-variability features on UBFC-RPPG, using common preprocessing/postprocessing to improve robustness to realistic motion and illumination variation. See abstract and Section 2, pages 1 and 3.

## method

- Pipeline: RGB frames -> face/ROI selection -> skin masking -> average RGB traces -> detrending/filtering -> extraction method -> postprocessing -> PR/PRV metrics.
- Compared methods: GRD, AGRD, PCA, ICA, LE, SPE, CHROM, POS. See Table 1 and Section 2.2.3, pages 3, 6-7.
- ROI: whole face region selected because forehead coverage was unreliable in UBFC-RPPG. Face detection used Viola-Jones; skin masking used RGB-H-CbCr. See Section 2.2.1, page 5.
- Preprocessing: detrending is treated as substantial because pulsatile iPPG amplitude is much smaller than baseline drift. See Section 2.2.2, page 6.
- CHROM/POS window parameter: `L = 1.6 s` for CHROM/POS implementation, following cited source. See Section 2.2.3, page 7.
- Postprocessing considered wavelet bandpass filtering, EMD, and outlier suppression. See Section 2.2.4, page 8.

## capture

- dataset: UBFC-RPPG
- subjects: 42
- camera: custom C++ acquisition from webcam
- resolution: 640 x 480
- format: uncompressed 8-bit RGB
- fps: 30
- conditions: indoor, varying sunlight and indoor illumination; subjects played a time-sensitive mathematical game to vary HR and mimic computer interaction.
- duration: 45.6-68.4 s per video
- citation_anchor: Section 2.1, page 3

## participants

- sample_size: 42
- demographics: not_reported in this record
- skin_tone_reporting: not_reported
- activity: seated computer interaction with mathematical game

## ground_truth

- finger clip pulse oximeter synchronized with video. See Section 2.1 and Figure 1, pages 3-4.

## evaluation

- PR and PRV features: average PR, RMSSD, SDNN, TI, TINN, VLF, LF, HF, LF/HF, SD1, SD2, SD1/SD2.
- Metrics: Spearman correlation, normalized RMSE, Bland-Altman mean bias and 95% limits. See Table 2 and Section 2.3, pages 9-10.

## results

- Average PR correlation exceeded 0.9 for five of eight methods: GRD, AGRD, ICA, CHROM, POS. See Results, page 11.
- POS had the strongest time-domain NRMSE performance for most PRV features except RMSSD, where GRD performed better. See Table 4 discussion, page 12.
- POS mean PR bias was reported as -0.186 BPM with 95% limits from -4.05 to 3.68 BPM. See Bland-Altman discussion, page 13.
- The authors conclude POS and CHROM were the most promising methods for PR/PRV extraction in this dataset. See Discussion and Conclusions, pages 14-15.

## limitations

- Whole-face ROI fails when the face is not visible. See limitations, page 16.
- RGB-H-CbCr threshold skin mask can include nonskin areas with similar color; adaptive skin segmentation is proposed as future work. See limitations, page 16.
- UBFC-RPPG is useful but limited to short videos and computer-interaction scenarios.
- PRV from short video windows remains more fragile than average PR; do not treat this as validating reaction inference.

## reproducibility

- Public dataset: UBFC-RPPG.
- Parameters are described well enough for a classical benchmark scaffold, but exact filter/postprocessing combinations need careful replication.

## project_relevance

- score: 9/10
- Most directly useful for Phase 1 classical baseline comparison and Phase 2 local pipeline.
- Strongly supports benchmarking POS and CHROM before more complex methods.

## evidence_updates

- Supports `CLM-0003` as PROVISIONAL: classical GREEN/CHROM/POS methods should be benchmarked before learned models.
- Adds evidence for a new claim that POS/CHROM are practical first benchmark candidates on UBFC-RPPG.
- Adds evidence that ROI and skin-mask failures must become reason codes.

## proposed_experiments

- Reproduce GREEN, CHROM, POS on UBFC-RPPG with identical ROI, detrending, windows, FFT band, and reason-code output.
- Compare PR-only accuracy separately from PRV feature reliability.
- Add skin-mask false-inclusion fixtures to signal-quality tests.
