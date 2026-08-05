# Quality gates

## status

Required for MVP

## summary

Quality gates decide whether an HR window is valid. Invalid windows must produce `INSUFFICIENT_SIGNAL` and must not feed reaction states.

## required_reason_codes

- `NO_FACE`
- `FACE_VISIBILITY_LOW`
- `ROI_TOO_SMALL`
- `ROI_UNSTABLE`
- `ROI_PIXEL_COUNT_LOW`
- `LOW_ILLUMINATION`
- `ILLUMINATION_STEP_CHANGE`
- `MOTION_HIGH`
- `MOTION_IN_PULSE_BAND`
- `TIMESTAMP_UNRELIABLE`
- `ESTIMATORS_DISAGREE`
- `COMPONENT_AMBIGUOUS`
- `WINDOW_TOO_SHORT`
- `BASELINE_IMMATURE`

## evidence

- Gudibandi 2016 and Lee 2014: motion can overlap pulse-relevant frequencies and reduce SNR.
- Zhang 2021 and Sun 2012: illumination must be measured, not assumed.
- Chari VITAL: aggregate error hides subgroup and condition failures.
- Fallet 2018: SQI and rejection are necessary under realistic iPPG.

## implementation_notes

- Gate before baseline and reaction inference.
- Log reason-code distribution in opt-in beta telemetry without storing raw video by default.
- Keep quality scoring deterministic and versioned.
- Treat low valid-pixel count separately from low percentage coverage: a highly selective skin mask can remove nonskin pixels but still leave too few pixels for stable RGB averaging.

## launch_priority

Critical path.
