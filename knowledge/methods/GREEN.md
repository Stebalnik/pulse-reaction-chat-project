# GREEN

## status

Baseline only

## summary

Use the green-channel temporal trace from skin/face ROI as a simple rPPG signal candidate.

## evidence

- van Es 2023: GRD/green-family methods can correlate well for average PR on UBFC-RPPG, but POS/CHROM are generally stronger.
- Macwan 2019: Green performed poorly in the reported MAICA comparison table under several datasets.
- Poh 2010: raw green was much worse than ICA in still and movement webcam tests.
- Maestre-Rendon 2020: simple smartphone pipeline used green-channel intensity, bandpass filtering, and FFT.
- Lee 2014: contact reflection PPG found green light had better agreement than red/blue during hand motion, supporting green as a sanity baseline but not as sufficient rPPG proof.

## implementation_notes

- Keep as a sanity baseline and regression fixture.
- Must include detrending, bandpass/FFT constraints, signal quality, motion, illumination, ROI coverage, and reason codes.
- Do not expose a trend from GREEN alone when estimator agreement is poor.
- Useful first implementation because it exercises capture, timestamps, ROI extraction, filters, FFT, schemas, and quality rejection with minimal projection complexity.

## launch_priority

Implement first only because it is small and testable, not because it is expected to be robust.
