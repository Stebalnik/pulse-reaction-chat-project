# CHROM

## status

MVP candidate

## summary

Chrominance-based rPPG projection intended to reduce motion/common-mode color variation using a skin-reflection model.

## evidence

- van Es 2023: CHROM and POS were the most promising methods on UBFC-RPPG for PR/PRV extraction.
- Macwan 2019: CHROM was competitive on UBFC-RPPG and MMSE-HR, though MAICA outperformed it in their table.

## implementation_notes

- Use the same ROI, detrending, windowing, and FFT settings as POS in the first benchmark for fair comparison.
- van Es 2023 reports `L = 1.6 s` for CHROM/POS implementation.
- Low illumination and changing illumination still require explicit quality gates.

## launch_priority

High for first desktop pulse-trend prototype.
