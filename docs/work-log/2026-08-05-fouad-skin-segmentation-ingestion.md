# 2026-08-05 - Fouad 2019 Skin Segmentation Ingestion

## What changed

- Re-read the Fouad/Omer/Aly 2019 IEEE Access paper from `Sources/Optimizing_Remote_Photoplethysmography_U.pdf`.
- Replaced the earlier abbreviated Fouad paper record with a verified paper record including capture setup, pipeline parameters, numeric tables, limitations, relevance scoring, and implementation proposals.
- Updated the adaptive skin segmentation claim, method notes, quality-gate notes, method comparison, source inventory, and experiment backlog.

## Why it changed

The paper directly informs SynVibe's current mobile/desktop rPPG work: ROI selection, skin-pixel filtering, valid pixel count, window length, and BSS/PCA benchmark choices. The previous record said numeric tables needed verification; this pass verified the relevant values from rendered PDF pages.

## Assumptions and constraints

- Evidence is `PROVISIONAL` because subjects sat still, demographics and skin-tone distribution are not reported, and the setup is a Logitech C920 webcam rather than mobile dating-chat video.
- The paper supports ROI/HR estimation engineering only. It does not support product claims about emotions, attraction, honesty, intent, compatibility, or medical state.
- No production code was changed in this ingestion.

## User-facing impact

No direct UI change. The practical next product implication is stronger validation for face/skin ROI coverage and valid-pixel-count gates before displaying reaction-pattern badges.

## Data and privacy implications

No raw user data, video, biometric traces, or secrets were added. The source PDF was already present in `Sources/`; the knowledge update records only paper-derived metadata and aggregate results.

## Commands and checks

- `pdfinfo Sources/Optimizing_Remote_Photoplethysmography_U.pdf` - confirmed 16 pages.
- `pdftotext -layout` - extracted text for reading.
- `pdftoppm -png -r 180 -f 11 -l 14` - rendered result-table pages for numeric verification.

## Deployment status

Knowledge-only update; not deployed.

## Recommended next steps

- Implement EXP-013 variants for current MediaPipe zones versus skin-masked all-face and sub-ROI policies.
- Add a distinct `ROI_PIXEL_COUNT_LOW` reason code in implementation if valid skin pixels are too sparse even when coverage percentage looks acceptable.
- Keep PCA/ICA as benchmark diagnostics until component ambiguity is measured internally.
