# rPPG engine

On-device pulse-rate estimation core for RGB traces extracted from local video frames.

This package does not access the camera, perform face tracking, infer reactions, or send data to a server. It accepts already-extracted RGB trace samples and returns heart-rate estimates with quality, confidence, method version, and rejection reason codes.

Initial methods:

- `GREEN`: simple sanity baseline.
- `CHROM`: chrominance projection candidate.
- `POS`: plane-orthogonal-to-skin projection candidate.
- `FUSION`: CHROM/POS agreement gate with GREEN as a weak supporting signal.

Invalid windows return `bpm: null`, `confidence: "invalid"`, and reason codes.
ROI gates check both proportional coverage and valid pixel count: `ROI_TOO_SMALL` means the skin/ROI fraction is too low, while `ROI_PIXEL_COUNT_LOW` means the usable skin sample is too sparse for reliable averaging even if the fraction looks acceptable.

`estimateHeartRateDiagnostics` returns the selected estimate plus per-method CHROM/POS/GREEN candidates, method spread, and rejection reasons. It is intended for local debugging and validation of signal quality; it does not infer reactions or user state.
