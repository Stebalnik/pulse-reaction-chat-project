# PAPER-2020-MAESTRE-RENDON-SMARTPHONE-RPPG

## identity

- title: A Non-Contact Photoplethysmography Technique for the Estimation of Heart Rate via Smartphone
- authors: J. Rodolfo Maestre-Rendon, Tomas A. Rivera-Roman, Arturo A. Fernandez-Jaramillo, Nancy E. Guerron Paredes, Jose Javier Serrano Olmedo
- year: 2020
- venue: Applied Sciences
- doi: https://doi.org/10.3390/app10010154
- source_pdf: `Sources/A_Non_Contact_Photoplethysmography_Techn.pdf`
- evidence_status: PROVISIONAL

## research_question

Estimate HR from smartphone front-camera facial video by extracting green-channel intensity from a selected face region and applying filtering/FFT.

## method

- iOS application using OpenCV and platform image-processing libraries.
- Uses RGB video from the front camera.
- Extracts pixel intensity from the green channel in a specific facial region.
- Applies a 5th-order Butterworth bandpass filter from 0.5 to 3.1 Hz.
- Uses Fourier transform to estimate pulses per minute.

## capture

- device: iPhone-class mobile device
- camera: 7-megapixel front camera
- acquisition: 30 fps
- processing resolution: 640 x 480
- screen brightness used as additional illumination in difficult outdoor lighting

## participants

- participant details: not fully extracted in this pass
- skin_tone_reporting: not_reported

## ground_truth

- Compared against medical-grade pulse oximeter.

## evaluation

- Error rate against pulse oximeter.

## results

- Abstract reports approximately 3% error rate.

## limitations

- Product framing is healthcare-oriented and must not be transferred to this project as medical-grade evidence.
- Exact dataset size and subgroup conditions need re-checking before implementation claims.
- Smartphone screen illumination is not directly applicable to desktop webcam use.

## reproducibility

- Useful simple GREEN/FFT implementation parameters, but not sufficient for production confidence.

## project_relevance

- score: 6/10
- Useful as a simple real-time mobile/web reference and for green-channel sanity baseline.

## evidence_updates

- Supports 0.5-3.1 Hz as one candidate HR band for human adult HR estimation.
- Supports using local camera permission and ROI preview as part of app flow.

## proposed_experiments

- Compare 0.5-3.1 Hz and 0.7-4 Hz bands in benchmark config.
- Do not use screen illumination in desktop app unless explicitly designed and consented.
