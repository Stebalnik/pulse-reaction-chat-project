# Adaptive skin segmentation

## status

MVP support

## summary

Select or weight skin pixels inside the face ROI before RGB trace extraction to reduce nonskin, shadowed, or specular contamination.

## evidence

- Fouad 2019: extracted text states segmentation improved RMSE.
- van Es 2023: skin masks can include nonskin pixels and must be handled carefully.
- Chari VITAL: shadows, highlights, skin tone, lighting, and viewpoint can change rPPG performance.

## implementation_notes

- Track ROI pixel count, skin coverage, and skin-mask stability.
- Do not aggressively downsample ROI before testing sensor-noise effects.
- Start with conservative masks and abstain when coverage is too low.

## launch_priority

High as a quality feature before reaction states.
