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

  const peakIndex = maxPowerIndex(powers);
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
