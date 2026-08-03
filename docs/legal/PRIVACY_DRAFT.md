# SynVibe Privacy Draft

Status: internal draft for product and legal review.

## MVP Data Principles

- Process camera-derived physiological features on the user's device whenever feasible.
- Do not retain raw video by default.
- Do not retain raw biometric time series by default.
- Store only the minimum server-side records needed for accounts, session operation, safety, analytics, and product improvement.
- Treat rPPG outputs and derived features as sensitive health-adjacent data.

## Current Browser MVP

The browser client can assign a local anonymous user ID and store a local profile on the user's device. The current debug console can export local JSON logs that include cleaned diagnostic metrics such as signal quality, ROI source, method estimates, reason codes, and badge state. These logs do not include raw video frames or raw RGB traces.

## Planned Server MVP

The first server-backed release should store:

- anonymous and registered user records;
- session start/end events;
- room matching events;
- consent and pause events;
- cleaned reaction-pattern outputs;
- quality metrics and rejection reason codes;
- product analytics events such as visit, room start, camera grant, peer connect, disconnect, registration start, and registration complete.

## Model Improvement

Data used to train or evaluate SynVibe models should be separated from operational data, consented, time-limited where required, and documented with schema versions, model versions, and retention rules.

## Review Notes

This draft is not legal advice. It must be reviewed by qualified counsel before production launch.
