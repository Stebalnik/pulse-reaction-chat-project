import { mean, normalizeByMean, std } from "./math.js";
import type { RgbTraceSample, ReasonCode } from "./types.js";

export interface ProjectionResult {
  signal: number[];
  reasonCodes: ReasonCode[];
}

export function projectGreen(samples: readonly RgbTraceSample[]): ProjectionResult {
  const signal = normalizeByMean(samples.map((sample) => sample.g));
  return withVarianceCheck(signal);
}

export function projectChrom(samples: readonly RgbTraceSample[]): ProjectionResult {
  const r = normalizeByMean(samples.map((sample) => sample.r));
  const g = normalizeByMean(samples.map((sample) => sample.g));
  const b = normalizeByMean(samples.map((sample) => sample.b));
  const x = r.map((value, index) => 3 * value - 2 * g[index]!);
  const y = r.map((value, index) => 1.5 * value + g[index]! - 1.5 * b[index]!);
  const alpha = std(x) / Math.max(std(y), 1e-9);
  return withVarianceCheck(x.map((value, index) => value - alpha * y[index]!));
}

export function projectPos(samples: readonly RgbTraceSample[]): ProjectionResult {
  const r = normalizeByMean(samples.map((sample) => sample.r));
  const g = normalizeByMean(samples.map((sample) => sample.g));
  const b = normalizeByMean(samples.map((sample) => sample.b));
  const x = g.map((value, index) => value - b[index]!);
  const y = g.map((value, index) => value + b[index]! - 2 * r[index]!);
  const alpha = std(x) / Math.max(std(y), 1e-9);
  return withVarianceCheck(x.map((value, index) => value + alpha * y[index]!));
}

function withVarianceCheck(signal: number[]): ProjectionResult {
  const absMean = mean(signal.map(Math.abs));
  if (!Number.isFinite(absMean) || absMean < 1e-8 || std(signal) < 1e-8) {
    return { signal, reasonCodes: ["INSUFFICIENT_VARIANCE"] };
  }
  return { signal, reasonCodes: [] };
}
