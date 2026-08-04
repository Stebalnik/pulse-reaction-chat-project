import { clamp, mean, removeMeanAndWindow } from "./math.js";

export interface SpectrumPeak {
  bpm: number | null;
  frequencyHz: number | null;
  quality: number;
  peakPower: number;
}

export function estimateDominantFrequency(
  signal: readonly number[],
  sampleRateHz: number,
  minHz: number,
  maxHz: number
): SpectrumPeak {
  if (signal.length < 4 || sampleRateHz <= 0) {
    return { bpm: null, frequencyHz: null, quality: 0, peakPower: 0 };
  }

  const prepared = removeMeanAndWindow(signal);
  const nyquist = sampleRateHz / 2;
  const minFrequency = Math.max(minHz, sampleRateHz / signal.length);
  const maxFrequency = Math.min(maxHz, nyquist * 0.95);
  if (minFrequency >= maxFrequency) {
    return { bpm: null, frequencyHz: null, quality: 0, peakPower: 0 };
  }

  const binStart = Math.max(1, Math.ceil((minFrequency * signal.length) / sampleRateHz));
  const binEnd = Math.floor((maxFrequency * signal.length) / sampleRateHz);
  const powers: Array<{ bin: number; frequencyHz: number; power: number }> = [];

  for (let bin = binStart; bin <= binEnd; bin += 1) {
    let real = 0;
    let imag = 0;
    for (let n = 0; n < prepared.length; n += 1) {
      const angle = (-2 * Math.PI * bin * n) / prepared.length;
      real += prepared[n]! * Math.cos(angle);
      imag += prepared[n]! * Math.sin(angle);
    }
    powers.push({
      bin,
      frequencyHz: (bin * sampleRateHz) / prepared.length,
      power: real * real + imag * imag
    });
  }

  if (powers.length === 0) {
    return { bpm: null, frequencyHz: null, quality: 0, peakPower: 0 };
  }

  const peakIndex = selectPhysiologicalPeakIndex(powers, maxPowerIndex(powers));
  const peak = powers[peakIndex]!;
  const interpolatedFrequencyHz = interpolatePeakFrequency(powers, peakIndex, sampleRateHz, prepared.length);
  const avgPower = mean(powers.map((entry) => entry.power));
  const totalPower = powers.reduce((sum, entry) => sum + entry.power, 0);
  const dominance = peak.power / Math.max(totalPower, 1e-12);
  const contrast = (peak.power - avgPower) / Math.max(peak.power, 1e-12);
  const quality = clamp(0.65 * dominance + 0.35 * Math.max(0, contrast), 0, 1);

  return {
    bpm: interpolatedFrequencyHz * 60,
    frequencyHz: interpolatedFrequencyHz,
    quality,
    peakPower: peak.power
  };
}

function maxPowerIndex(powers: Array<{ power: number }>): number {
  let selected = 0;
  for (let index = 1; index < powers.length; index += 1) {
    if (powers[index]!.power > powers[selected]!.power) selected = index;
  }
  return selected;
}

function selectPhysiologicalPeakIndex(
  powers: Array<{ frequencyHz: number; power: number }>,
  dominantIndex: number
): number {
  const dominant = powers[dominantIndex]!;
  const subharmonic = [2, 3]
    .map((factor) => subharmonicCandidate(powers, dominant, factor))
    .filter((candidate): candidate is { index: number; score: number } => candidate !== null)
    .sort((left, right) => right.score - left.score)[0];
  return subharmonic?.index ?? dominantIndex;
}

function subharmonicCandidate(
  powers: Array<{ frequencyHz: number; power: number }>,
  dominant: { frequencyHz: number; power: number },
  factor: number
): { index: number; score: number } | null {
  const targetFrequencyHz = dominant.frequencyHz / factor;
  const binWidthHz = powers.length > 1 ? Math.abs(powers[1]!.frequencyHz - powers[0]!.frequencyHz) : 0;
  const toleranceHz = Math.max(binWidthHz * 1.6, 0.08);
  let selectedIndex = -1;
  let selectedPower = 0;
  for (let index = 0; index < powers.length; index += 1) {
    const entry = powers[index]!;
    if (Math.abs(entry.frequencyHz - targetFrequencyHz) > toleranceHz) continue;
    if (entry.power > selectedPower) {
      selectedIndex = index;
      selectedPower = entry.power;
    }
  }

  if (selectedIndex < 0) return null;
  const powerRatio = selectedPower / Math.max(dominant.power, 1e-12);
  const requiredRatio = factor === 2 ? 0.28 : 0.22;
  if (powerRatio < requiredRatio || !isLocalPeak(powers, selectedIndex)) return null;
  return { index: selectedIndex, score: powerRatio / factor };
}

function isLocalPeak(powers: Array<{ power: number }>, index: number): boolean {
  const current = powers[index]!;
  const left = powers[index - 1]?.power ?? -Infinity;
  const right = powers[index + 1]?.power ?? -Infinity;
  return current.power >= left && current.power >= right;
}

function interpolatePeakFrequency(
  powers: Array<{ bin: number; power: number }>,
  peakIndex: number,
  sampleRateHz: number,
  length: number
): number {
  const peak = powers[peakIndex]!;
  const left = powers[peakIndex - 1];
  const right = powers[peakIndex + 1];
  if (!left || !right) return (peak.bin * sampleRateHz) / length;

  const denominator = left.power - 2 * peak.power + right.power;
  if (Math.abs(denominator) < 1e-12) return (peak.bin * sampleRateHz) / length;

  const offset = clamp(0.5 * (left.power - right.power) / denominator, -0.5, 0.5);
  return ((peak.bin + offset) * sampleRateHz) / length;
}
