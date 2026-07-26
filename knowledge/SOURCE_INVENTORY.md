# Source inventory

Date: 2026-07-26

| Source | Record | Relevance | Use |
|---|---|---:|---|
| `A_Machine_Learning_Method_to_Improve_Non.pdf` | `PAPER-2018-GHANADIAN-ML-ICA-RPPG` | 7 | ICA, light equalization, component selection |
| `A_Non_Contact_Photoplethysmography_Techn.pdf` | `PAPER-2020-MAESTRE-RENDON-SMARTPHONE-RPPG` | 6 | simple GREEN/FFT smartphone pipeline |
| `Analyzing_long_wearable_electrocardiogra.pdf` | `PAPER-2026-PALUSZNY-ECG-R-SPIKE-PATTERNS` | 4 | ground-truth/noisy-zone thinking |
| `Comparison_between_red_green_and_blue_li.pdf` | `PAPER-2014-LEE-RGB-REFLECTION-PPG-MOTION` | 5 | green-channel physiology support |
| `Comparison_of_Blind_Source_Separation_Al.pdf` | `PAPER-NOT_REPORTED-CHRISTINAKI-BSS-OPTICAL-HR` | 4 | BSS comparison background |
| `Contactless_Cardiovascular_Assessment_by.pdf` | `PAPER-2023-VAN-ES-CONTACTLESS-CARDIOVASCULAR-ASSESSMENT` | 9 | POS/CHROM/GREEN benchmark design |
| `Correction_Trevino_et_al_Structural_shif.pdf` | `PAPER-2026-TREVINO-CORRECTION-NOT-RELEVANT` | 0 | excluded |
| `Diverse_R_PPG_Camera_Based_Heart_Rate_Es.pdf` | `PAPER-NOT_REPORTED-CHARI-DIVERSE-RPPG` | 8 | subgroup/fairness/ROI weighting |
| `Dual_Wavelength_Photoplethysmography_Fra.pdf` | `PAPER-2022-ALKHOURY-DUAL-WAVELENGTH-PPG` | 3 | wavelength background only |
| `Facial_Video_Based_Photoplethysmography.pdf` | `PAPER-2015-MORENO-FACIAL-VIDEO-HRV` | 6 | PRV/HRV deferral and posture confound |
| `Heart_rate_estimation_using_remote_photo.pdf` | `PAPER-2019-MACWAN-MAICA-RPPG` | 8 | MAICA, ICA, benchmark windows |
| `High_resolution_motion_compensated_imagi.pdf` | `PAPER-2015-CHUNG-MOTION-COMPENSATED-ERYTHEMA` | 5 | motion compensation candidate |
| `Improving_Pulse_Rate_Measurements_during.pdf` | `PAPER-2016-WARREN-WEARABLE-MULTICHANNEL-MOTION` | 4 | wearable motion artifact background |
| `Measuring_Pulse_Rate_Variability_During.pdf` | `PAPER-2015-KIEHL-MULTI-IMAGER-PRV-MOTION` | 6 | motion/PRV caution |
| `Motion_Artifact_Reduction_in_Wearable_Ph.pdf` | `PAPER-2020-LEE-WEARABLE-MULTIWAVELENGTH-MOTION` | 4 | channel agreement and motion background |
| `Non_contact_Heart_Rate_Monitoring_Using.pdf` | `PAPER-2019-GHANADIAN-MULTIPLE-RGB-CAMERAS` | 5 | ROI visibility and multi-camera caution |
| `Non_contact_automated_cardiac_pulse_meas.pdf` | `PAPER-2010-POH-AUTOMATED-CARDIAC-PULSE-ICA` | 8 | canonical webcam ICA baseline |
| `Noncontact_Heart_Rate_Measurement_Using.pdf` | `PAPER-2021-ZHANG-JBSS-SKIN-REFLECTION` | 8 | illumination/background ROI |
| `Noncontact_imaging_photoplethysmography.pdf` | `PAPER-2013-SUN-NONCONTACT-PRV-FRAMERATE` | 6 | PRV sample-rate caution |
| `Optimizing_Remote_Photoplethysmography_U.pdf` | `PAPER-2019-FOUAD-ADAPTIVE-SKIN-SEGMENTATION` | 8 | segmentation/ROI/window tuning |
| `PPG_Heart_Rate_Detection_in_the_Presence.pdf` | `PAPER-2016-GUDIBANDI-WEARABLE-PPG-MOTION-ARTIFACTS` | 5 | motion-in-band fixtures |
| `Real_Time_Approaches_for_Heart_Rate_Moni.pdf` | `PAPER-2016-FALLET-REAL-TIME-IPPB-ASVD` | 7 | streaming/adaptive tracking |
| `Real_Time_Estimation_of_Heart_Rate_under.pdf` | `PAPER-2025-SUBHASHREE-SMARTPHONE-LIGHTING-REJECTED` | 1 | excluded from claims |
| `Remote_Assessment_of_Heart_Rate_by_Skin.pdf` | `PAPER-2015-GAVRILOAIA-SKIN-COLOR-PCA-EMD` | 4 | low-priority PCA/EMD |
| `Remote_Photoplethysmography_rPPG_using_R.pdf` | `PAPER-2022-PRASAD-RPPG-PEAK-DETECTION` | 2 | weak peak-detection background |
| `Robust_Pulse_Rate_From_Chrominance_Based.pdf` | `PAPER-2013-DE-HAAN-CHROMINANCE-RPPG` | 10 | CHROM launch candidate |
| `Self_contained_passive_non_contact_photo.pdf` | `PAPER-2015-DIETZ-CANON-POWERSHOT-RPPG` | 5 | on-device feasibility |
| `Signal_processing_techniques_for_cardiov.pdf` | `PAPER-2018-FALLET-SIGNAL-PROCESSING-CARDIOVASCULAR` | 7 | SQI/adaptive tracking |
| `Use_of_ambient_light_in_remote_photoplet.pdf` | `PAPER-2012-SUN-AMBIENT-LIGHT-WEBCAM` | 7 | ambient light/webcam feasibility |

## Reading paths

For first implementation:

1. de Haan 2013 CHROM.
2. van Es 2023 POS/CHROM comparison.
3. Poh 2010 ICA baseline.
4. Fouad 2019 segmentation/window tradeoff.
5. Chari VITAL and Zhang 2021 for fairness/illumination gates.

For quality and tests:

1. Gudibandi 2016 motion artifacts.
2. Fallet 2018 SQI.
3. Sun 2012 ambient light.
4. Lee 2014 wavelength/motion background.

For deferred research:

1. Sun 2013 PRV frame rate.
2. Moreno 2015 facial video HRV.
3. Kiehl 2015 multi-imager PRV.
4. Macwan 2019 MAICA.
