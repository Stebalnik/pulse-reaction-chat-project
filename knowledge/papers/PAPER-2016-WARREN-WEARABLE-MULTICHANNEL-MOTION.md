# PAPER-2016-WARREN-WEARABLE-MULTICHANNEL-MOTION

## identity

- title: Improving Pulse Rate Measurements during Random Motion Using a Wearable Multichannel Reflectance Photoplethysmograph
- authors: Kristen M. Warren, Joshua R. Harvey, Ki H. Chon, Yitzhak Mendelson
- year: 2016
- venue: Sensors
- doi: https://doi.org/10.3390/s16030342
- source_pdf: `Sources/Improving_Pulse_Rate_Measurements_during.pdf`
- evidence_status: PROVISIONAL

## research_question

Improve wearable reflectance PPG pulse-rate estimation during random motion using multiple channels and motion-aware processing.

## method

- Wearable multichannel reflectance PPG.
- Uses motion-related information to reduce artifacts.
- Compares pulse-rate estimates under random motion.

## capture

- wearable PPG, not camera rPPG.
- exact participant/capture details not fully extracted in this pass.

## ground_truth

- not_reported in this record.

## evaluation

- Pulse-rate accuracy under random motion.

## results

- Useful general evidence that random motion can dominate PPG and that multi-channel/motion-reference approaches improve robustness.

## limitations

- Contact wearable PPG, not direct facial video.
- Do not transfer numeric performance to rPPG.

## reproducibility

- Useful for motion artifact taxonomy and accelerometer/reference-noise concepts.

## project_relevance

- score: 4/10
- Supports motion quality gates and future optional IMU fusion if desktop/mobile sensors are available.

## evidence_updates

- Strengthens motion as first-class confound.

## proposed_experiments

- Add synthetic periodic and random motion fixtures.
- Consider optional device-motion metadata in mobile/browser clients later.
