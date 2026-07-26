# JBSS skin-reflection projection

## status

Phase 1.5 candidate

## summary

Use facial and background ROI traces with joint blind source separation to remove common illumination, then apply a skin-reflection projection model and FFT HR estimation.

## evidence

- Zhang 2021: improved or competitive results across several low/changing illumination scenarios; POS/Project_ICA had large low-light failures in some public benchmark cases.

## implementation_notes

- Requires extracting a background ROI in addition to facial skin ROI.
- Reported HR band: 42-240 bpm.
- Reported windows: 30 s windows on 60 s clips.
- Useful for uncontrolled desktop lighting, but more complex than POS/CHROM.

## launch_priority

Defer to post-MVP or implement as optional correction experiment.
