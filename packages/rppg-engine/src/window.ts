import { clamp, linearInterpolate, mean, median, std } from "./math.js";
import type { RgbTraceSample, RppgEngineConfig, ReasonCode } from "./types.js";

export interface PreparedWindow {
  samples: RgbTraceSample[];
  sampleRateHz: number;
  timestampMs: number;
  windowStartMs: number;
  windowEndMs: number;
  roiCoverage: number;
  roiCoverageStd: number;
  motionScore: number;
  illuminationInstability: number;
  reasonCodes: ReasonCode[];
}

export function prepareWindow(inputSamples: readonly RgbTraceSample[], config: RppgEngineConfig): PreparedWindow {
  const sorted = [...inputSamples]
    .filter((sample) => Number.isFinite(sample.timestampMs))
    .sort((a, b) => a.timestampMs - b.timestampMs);

  if (sorted.length === 0) {
    return emptyWindow(["NO_SAMPLES"]);
  }

  const windowStartMs = sorted[0]!.timestampMs;
  const windowEndMs = sorted[sorted.length - 1]!.timestampMs;
  const durationMs = windowEndMs - windowStartMs;
  const reasonCodes: ReasonCode[] = [];

  if (durationMs < config.minWindowMs) reasonCodes.push("WINDOW_TOO_SHORT");
  if (sorted.length < config.minSamples) reasonCodes.push("WINDOW_TOO_SHORT");

  const deltas = sorted.slice(1).map((sample, index) => sample.timestampMs - sorted[index]!.timestampMs);
  const medianDelta = median(deltas);
  const sampleRateHz = medianDelta > 0 ? 1000 / medianDelta : 0;
  const deltaStd = std(deltas);
  const jitterRatio = medianDelta > 0 ? deltaStd / medianDelta : 1;
  const severeGapMs = Math.max(300, medianDelta * 8);

  if (sampleRateHz < config.minFps) reasonCodes.push("LOW_FPS");
  if (medianDelta <= 0 || jitterRatio > 1.25 || deltas.some((delta) => delta <= 0 || delta > severeGapMs)) {
    reasonCodes.push("TIMESTAMP_UNRELIABLE");
  }

  const roiValues = sorted.map((sample) => clamp(sample.roiCoverage, 0, 1));
  const roiCoverage = mean(roiValues);
  const roiCoverageStd = std(roiValues);
  if (roiCoverage < config.minRoiCoverage) reasonCodes.push("ROI_TOO_SMALL");
  if (roiCoverageStd > config.maxRoiCoverageStd) reasonCodes.push("ROI_UNSTABLE");

  const motionScore = mean(sorted.map((sample) => clamp(sample.motionScore ?? 0, 0, 1)));
  if (motionScore > config.maxMotionScore) reasonCodes.push("MOTION_HIGH");

  const illuminationValues = sorted.map((sample) => sample.illumination ?? (sample.r + sample.g + sample.b) / 3);
  const illuminationMean = mean(illuminationValues);
  const illuminationInstability = illuminationMean > 0 ? std(illuminationValues) / illuminationMean : 1;
  if (illuminationMean < 5) reasonCodes.push("LOW_ILLUMINATION");
  if (illuminationInstability > config.maxIlluminationInstability) reasonCodes.push("ILLUMINATION_STEP_CHANGE");

  const uniformSamples =
    reasonCodes.includes("TIMESTAMP_UNRELIABLE") || sampleRateHz <= 0
      ? sorted
      : resampleUniform(sorted, medianDelta, windowStartMs, windowEndMs);

  return {
    samples: uniformSamples,
    sampleRateHz,
    timestampMs: windowEndMs,
    windowStartMs,
    windowEndMs,
    roiCoverage,
    roiCoverageStd,
    motionScore,
    illuminationInstability: clamp(illuminationInstability, 0, 1),
    reasonCodes: unique(reasonCodes)
  };
}

function resampleUniform(
  samples: readonly RgbTraceSample[],
  stepMs: number,
  startMs: number,
  endMs: number
): RgbTraceSample[] {
  const timestamps = samples.map((sample) => sample.timestampMs);
  const r = samples.map((sample) => sample.r);
  const g = samples.map((sample) => sample.g);
  const b = samples.map((sample) => sample.b);
  const roi = samples.map((sample) => sample.roiCoverage);
  const motion = samples.map((sample) => sample.motionScore ?? 0);
  const illumination = samples.map((sample) => sample.illumination ?? (sample.r + sample.g + sample.b) / 3);
  const result: RgbTraceSample[] = [];
  for (let timestampMs = startMs; timestampMs <= endMs; timestampMs += stepMs) {
    result.push({
      timestampMs,
      r: linearInterpolate(timestamps, r, timestampMs),
      g: linearInterpolate(timestamps, g, timestampMs),
      b: linearInterpolate(timestamps, b, timestampMs),
      roiCoverage: linearInterpolate(timestamps, roi, timestampMs),
      motionScore: linearInterpolate(timestamps, motion, timestampMs),
      illumination: linearInterpolate(timestamps, illumination, timestampMs)
    });
  }
  return result;
}

function emptyWindow(reasonCodes: ReasonCode[]): PreparedWindow {
  return {
    samples: [],
    sampleRateHz: 0,
    timestampMs: 0,
    windowStartMs: 0,
    windowEndMs: 0,
    roiCoverage: 0,
    roiCoverageStd: 0,
    motionScore: 0,
    illuminationInstability: 1,
    reasonCodes
  };
}

function unique(values: ReasonCode[]): ReasonCode[] {
  return [...new Set(values)];
}
