# PRV / HRV from camera PPG

## status

Research-only; not launch UI

## summary

Pulse-rate variability and HRV-like timing features require much stronger waveform timing reliability than average pulse-rate trends.

## evidence

- Sun 2013 used 200 fps iPPG and interpolation to examine PRV.
- Moreno 2015 found posture-dependent HRV/PRV agreement from facial video.
- van Es 2023 shows PRV features are method-dependent.
- Kiehl 2015 and Fallet 2018 emphasize motion, SQI, and realistic-condition limits.

## implementation_notes

- Do not expose PRV/HRV in month-one UI.
- Internal research requires FPS stability, waveform morphology quality, beat/trough detection confidence, and ECG/PPG ground truth.
- Treat PRV features as separate from reaction labels.

## launch_priority

Deferred.
