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
  const powers: Array<{ frequencyHz: number; power: number }> = [];

  for (let bin = binStart; bin <= binEnd; bin += 1) {
    let real = 0;
    let imag = 0;
    for (let n = 0; n < prepared.length; n += 1) {
      const angle = (-2 * Math.PI * bin * n) / prepared.length;
      real += prepared[n]! * Math.cos(angle);
      imag += prepared[n]! * Math.sin(angle);
    }
    powers.push({
      frequencyHz: (bin * sampleRateHz) / prepared.length,
      power: real * real + imag * imag
    });
  }

  if (powers.length === 0) {
    return { bpm: null, frequencyHz: null, quality: 0, peakPower: 0 };
  }

  powers.sort((a, b) => b.power - a.power);
  const peak = powers[0]!;
  const avgPower = mean(powers.map((entry) => entry.power));
  const totalPower = powers.reduce((sum, entry) => sum + entry.power, 0);
  const dominance = peak.power / Math.max(totalPower, 1e-12);
  const contrast = (peak.power - avgPower) / Math.max(peak.power, 1e-12);
  const quality = clamp(0.65 * dominance + 0.35 * Math.max(0, contrast), 0, 1);

  return {
    bpm: peak.frequencyHz * 60,
    frequencyHz: peak.frequencyHz,
    quality,
    peakPower: peak.power
  };
}
