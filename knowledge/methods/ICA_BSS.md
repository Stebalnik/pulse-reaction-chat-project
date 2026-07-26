# ICA / BSS

## status

Benchmark comparator

## summary

Independent component analysis and related blind source separation methods transform RGB traces into latent components, one of which may contain a pulse-like signal.

## evidence

- Poh 2010: ICA reduced RMSE relative to raw green in still and movement webcam recordings.
- Ghanadian 2018: ML component selection improved ICA reliability in a small dataset.
- Macwan 2019: MAICA improved component selection using periodicity and objective functions.
- de Haan 2013: chrominance methods outperformed BSS in reported motion tests.

## implementation_notes

- Do not assume ICA component order is stable.
- Add `COMPONENT_AMBIGUOUS` when no component has a clearly dominant pulse-like spectral peak.
- Use identical ROI/preprocessing/windowing as CHROM/POS in benchmark comparisons.
- Subject-independent validation is required for any learned component selector.

## launch_priority

Medium for benchmark, low for first visible trend.
