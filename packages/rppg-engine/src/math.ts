export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function std(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export function hamming(index: number, length: number): number {
  if (length <= 1) return 1;
  return 0.54 - 0.46 * Math.cos((2 * Math.PI * index) / (length - 1));
}

export function normalizeByMean(values: readonly number[]): number[] {
  const avg = mean(values);
  if (!Number.isFinite(avg) || Math.abs(avg) < 1e-9) {
    return values.map(() => 0);
  }
  return values.map((value) => value / avg - 1);
}

export function removeMeanAndWindow(values: readonly number[]): number[] {
  const avg = mean(values);
  return values.map((value, index) => (value - avg) * hamming(index, values.length));
}

export function linearInterpolate(xs: readonly number[], ys: readonly number[], x: number): number {
  if (xs.length === 0) return 0;
  if (x <= xs[0]!) return ys[0]!;
  if (x >= xs[xs.length - 1]!) return ys[ys.length - 1]!;

  let hi = 1;
  while (hi < xs.length && xs[hi]! < x) hi += 1;
  const lo = hi - 1;
  const span = xs[hi]! - xs[lo]!;
  if (span <= 0) return ys[lo]!;
  const t = (x - xs[lo]!) / span;
  return ys[lo]! * (1 - t) + ys[hi]! * t;
}
