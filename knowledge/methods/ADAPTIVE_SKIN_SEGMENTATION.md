# Adaptive skin segmentation

## status

MVP support

## summary

Select or weight skin pixels inside the face ROI before RGB trace extraction to reduce nonskin, shadowed, or specular contamination.

## evidence

- Fouad 2019: proposed segmented ROI had mean RMSE 3.58 bpm across five listed subjects versus 5.835 bpm for ROI without skin segmentation and 6.916 bpm for whole-face ROI; one subject favored the nonsegmented ROI.
- van Es 2023: skin masks can include nonskin pixels and must be handled carefully.
- Chari VITAL: shadows, highlights, skin tone, lighting, and viewpoint can change rPPG performance.

## implementation_notes

- Track ROI pixel count, skin coverage, and skin-mask stability.
- Do not aggressively downsample ROI before testing sensor-noise effects; Fouad 2019 notes that too few skin pixels can make camera sensor noise harder to average out.
- Start with conservative masks and abstain when coverage is too low.
- Compare whole-face, MediaPipe facial zones, skin-masked all-face, and skin-masked forehead/cheek subregions before changing launch defaults.

## launch_priority

High as a quality feature before reaction states.
