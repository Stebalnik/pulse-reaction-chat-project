# PAPER-2015-DIETZ-CANON-POWERSHOT-RPPG

## identity

- title: Self-contained, passive, non-contact photoplethysmography: real-time extraction of heart rates from live view within a Canon PowerShot
- authors: Henry Dietz, Chadwick Parrish, Kevin D. Donohue
- year: 2015
- venue: IEEE Transactions on Biomedical Engineering
- doi: https://doi.org/10.1109/TBME.2015.2476337
- source_pdf: `Sources/Self_contained_passive_non_contact_photo.pdf`
- evidence_status: PROVISIONAL

## research_question

Extract HR in real time directly on a consumer camera live-view pipeline without contact sensors.

## method

- Passive noncontact PPG using camera live view.
- Real-time extraction on Canon PowerShot-class hardware.
- Details require formula/table re-check before implementation.

## capture

- Canon PowerShot camera live view.
- exact capture details not fully extracted in this pass.

## ground_truth

- not_reported in this record.

## evaluation

- HR extraction in real-time camera environment.

## results

- Useful support for consumer-camera feasibility and on-device computation.

## limitations

- Camera firmware environment differs from Electron/browser.
- Not enough extracted detail for algorithm priority.

## reproducibility

- Low-to-medium until method details are re-read.

## project_relevance

- score: 5/10
- Supports local/on-device processing direction.

## evidence_updates

- No direct MVP method change.

## proposed_experiments

- Keep local processing as default design constraint.
