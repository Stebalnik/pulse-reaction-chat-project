import { clamp, mean, median, std } from "./math.js";

export interface PeakIntervalEstimate {
  bpm: number | null;
  quality: number;
  peakCount: number;
  intervalCount: number;
  intervalSpreadMs: number | null;
}

export function estimatePeakIntervalBpm(
  signal: readonly number[],
  sampleRateHz: number,
  minHz: number,
  maxHz: number
): PeakIntervalEstimate {
  if (signal.length < 4 || sampleRateHz <= 0 || minHz <= 0 || maxHz <= minHz) {
    return emptyPeakIntervalEstimate();
  }

  const prepared = smooth(center(signal), smoothingRadius(sampleRateHz));
  const amplitudeStd = std(prepared);
  if (!Number.isFinite(amplitudeStd) || amplitudeStd < 1e-9) {
    return emptyPeakIntervalEstimate();
  }

  const threshold = amplitudeStd * 0.15;
  const minIntervalMs = 1000 / maxHz;
  const maxIntervalMs = 1000 / minHz;
  const minPeakDistanceSamples = Math.max(1, Math.floor((sampleRateHz / maxHz) * 0.72));
  const candidatePeaks = localMaxima(prepared, threshold);
  const peaks = suppressNearbyPeaks(candidatePeaks, minPeakDistanceSamples);
  const intervalsMs = intervalsBetweenPeaks(peaks, sampleRateHz).filter(
    (intervalMs) => intervalMs >= minIntervalMs && intervalMs <= maxIntervalMs
  );

  if (intervalsMs.length < 3) {
    return {
      bpm: null,
      quality: 0,
      peakCount: peaks.length,
      intervalCount: intervalsMs.length,
      intervalSpreadMs: null
    };
  }

  const medianIntervalMs = median(intervalsMs);
  const intervalStdMs = std(intervalsMs);
  const intervalSpreadMs = Math.max(...intervalsMs) - Math.min(...intervalsMs);
  const regularity = clamp(1 - intervalStdMs / Math.max(medianIntervalMs, 1), 0, 1);
  const peakDensity = clamp(intervalsMs.length / 8, 0, 1);
  const amplitudeContrast = clamp(mean(peaks.map((peak) => Math.max(0, peak.value))) / Math.max(amplitudeStd * 2.5, 1e-9), 0, 1);
  const quality = clamp(0.55 * regularity + 0.25 * peakDensity + 0.2 * amplitudeContrast, 0, 1);

  return {
    bpm: 60_000 / medianIntervalMs,
    quality,
    peakCount: peaks.length,
    intervalCount: intervalsMs.length,
    intervalSpreadMs
  };
}

interface PeakCandidate {
  index: number;
  value: number;
}

function emptyPeakIntervalEstimate(): PeakIntervalEstimate {
  return {
    bpm: null,
    quality: 0,
    peakCount: 0,
    intervalCount: 0,
    intervalSpreadMs: null
  };
}

function center(signal: readonly number[]): number[] {
  const signalMean = mean(signal);
  return signal.map((value) => value - signalMean);
}

function smoothingRadius(sampleRateHz: number): number {
  if (sampleRateHz < 8) return 1;
  if (sampleRateHz < 18) return 2;
  return 3;
}

function smooth(signal: readonly number[], radius: number): number[] {
  if (radius <= 0) return [...signal];
  return signal.map((_, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(signal.length - 1, index + radius);
    let sum = 0;
    let count = 0;
    for (let cursor = start; cursor <= end; cursor += 1) {
      sum += signal[cursor]!;
      count += 1;
    }
    return sum / count;
  });
}

function localMaxima(signal: readonly number[], threshold: number): PeakCandidate[] {
  const peaks: PeakCandidate[] = [];
  for (let index = 1; index < signal.length - 1; index += 1) {
    const value = signal[index]!;
    if (value <= threshold) continue;
    if (value >= signal[index - 1]! && value > signal[index + 1]!) {
      peaks.push({ index, value });
    }
  }
  return peaks;
}

function suppressNearbyPeaks(candidates: readonly PeakCandidate[], minDistanceSamples: number): PeakCandidate[] {
  const selected: PeakCandidate[] = [];
  for (const candidate of candidates) {
    const previous = selected.at(-1);
    if (!previous || candidate.index - previous.index >= minDistanceSamples) {
      selected.push(candidate);
      continue;
    }
    if (candidate.value > previous.value) {
      selected[selected.length - 1] = candidate;
    }
  }
  return selected;
}

function intervalsBetweenPeaks(peaks: readonly PeakCandidate[], sampleRateHz: number): number[] {
  const intervals: number[] = [];
  for (let index = 1; index < peaks.length; index += 1) {
    intervals.push(((peaks[index]!.index - peaks[index - 1]!.index) * 1000) / sampleRateHz);
  }
  return intervals;
}
