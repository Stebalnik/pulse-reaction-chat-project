# PAPER-2014-LEE-RGB-REFLECTION-PPG-MOTION

## identity

- title: Comparison between red, green and blue light reflection photoplethysmography for heart rate monitoring during motion
- authors: Jihyoung Lee, Kenta Matsumura, Ken-ichi Yamakoshi, Peter Rolfe, Shinobu Tanaka, Tada Yamakoshi
- year: 2014
- venue: Behavior Research Methods / repository copy
- doi: extracted text begins `10.3758/s13428-`; full DOI not_reported
- source_pdf: `Sources/Comparison_between_red_green_and_blue_li.pdf`
- evidence_status: PROVISIONAL

## research_question

Compare red, green, and blue reflection PPG for pulse-rate monitoring during hand motion using ECG as reference.

## method

- Reflection PPG at 645 nm red, 530 nm green, and 470 nm blue.
- ECG reference and 3-axis accelerometer.
- Motion conditions include hand waving.
- Motion artifact band separated from pulse band for SNR analysis.

## capture

- participants: 12 healthy male participants
- age: mean 22.8 years in extracted text
- accelerometer sampling: 1024 Hz
- motion pace: 8 Hz hand waving

## ground_truth

- ECG.

## evaluation

- Agreement between ECG HR and PPG PR; delta SNR under horizontal and vertical motion.

## results

- Limit of agreement for green PPG was reported as +/-0.61 bpm, better than red (+/-3.20 bpm) and blue (+/-2.23 bpm).
- Green and blue had smaller motion-related SNR degradation than red, but green had better PR agreement than blue.

## limitations

- Wearable/contact reflection PPG, not remote facial rPPG.
- All male young participants and hand/finger measurement location.

## reproducibility

- Useful as supporting physiology/electronics evidence for green-channel baseline, not as direct rPPG validation.

## project_relevance

- score: 5/10
- Supports GREEN as a simple baseline and a good channel for sanity checks.

## evidence_updates

- Supports keeping GREEN baseline in benchmark.
- Does not prove GREEN is robust enough alone for desktop rPPG.

## proposed_experiments

- Include green-channel trace as sanity baseline, not launch estimator by itself.
