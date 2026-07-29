import { clamp, mean } from "./math.js";
import { projectChrom, projectGreen, projectPos } from "./projections.js";
import { estimateDominantFrequency } from "./spectrum.js";
import type { PreparedWindow } from "./window.js";
import { prepareWindow } from "./window.js";
import { resolveConfig } from "./config.js";
import type {
  HeartRateDiagnostics,
  HeartRateEstimate,
  InternalEstimate,
  ReasonCode,
  RgbTraceSample,
  RppgEngineConfig,
  RppgMethod
} from "./types.js";

export function estimateHeartRate(
  samples: readonly RgbTraceSample[],
  configOverrides: Partial<RppgEngineConfig> = {}
): HeartRateEstimate {
  const config = resolveConfig(configOverrides);
  const prepared = prepareWindow(samples, config);

  if (prepared.reasonCodes.length > 0) {
    return invalidEstimate(prepared, config, prepared.reasonCodes);
  }

  if (config.method === "FUSION") {
    return estimateFusion(prepared, config);
  }

  const estimate = estimateSingleMethod(prepared, config.method, config);
  if (estimate.bpm === null || estimate.signalQuality < config.minSpectralQuality || estimate.reasonCodes.length > 0) {
    return invalidEstimate(prepared, config, estimate.reasonCodes.length > 0 ? estimate.reasonCodes : ["SPECTRAL_PEAK_WEAK"]);
  }

  return validEstimate(prepared, config, estimate.bpm, estimate.signalQuality, config.method, estimate.reasonCodes);
}

export function estimateHeartRateDiagnostics(
  samples: readonly RgbTraceSample[],
  configOverrides: Partial<RppgEngineConfig> = {}
): HeartRateDiagnostics {
  const config = resolveConfig({ ...configOverrides, method: "FUSION" });
  const prepared = prepareWindow(samples, config);
  if (prepared.reasonCodes.length > 0) {
    return {
      estimate: invalidEstimate(prepared, config, prepared.reasonCodes),
      methodEstimates: [],
      selectedMethod: config.method,
      methodSpreadBpm: null
    };
  }

  const methodEstimates = (["CHROM", "POS", "GREEN"] as const).map((method) => estimateSingleMethod(prepared, method, config));
  return {
    estimate: estimateFusionFromMethods(prepared, config, methodEstimates),
    methodEstimates: methodEstimates.map((estimate) => ({
      method: estimate.method,
      bpm: estimate.bpm === null ? null : round(estimate.bpm, 2),
      signalQuality: round(clamp(estimate.signalQuality, 0, 1), 4),
      reasonCodes: [...new Set(estimate.reasonCodes)]
    })),
    selectedMethod: config.method,
    methodSpreadBpm: methodSpread(methodEstimates, config)
  };
}

function estimateFusion(prepared: PreparedWindow, config: RppgEngineConfig): HeartRateEstimate {
  const estimates = (["CHROM", "POS", "GREEN"] as const).map((method) => estimateSingleMethod(prepared, method, config));
  return estimateFusionFromMethods(prepared, config, estimates);
}

function estimateFusionFromMethods(prepared: PreparedWindow, config: RppgEngineConfig, estimates: InternalEstimate[]): HeartRateEstimate {
  const valid = estimates.filter(
    (estimate) => estimate.bpm !== null && estimate.signalQuality >= config.minSpectralQuality && estimate.reasonCodes.length === 0
  );

  const chrom = valid.find((estimate) => estimate.method === "CHROM");
  const pos = valid.find((estimate) => estimate.method === "POS");
  if (!chrom || !pos || chrom.bpm === null || pos.bpm === null) {
    return invalidEstimate(prepared, config, collectReasons(estimates, ["SPECTRAL_PEAK_WEAK"]));
  }

  const spread = Math.abs(chrom.bpm - pos.bpm);
  if (spread > config.maxFusionBpmSpread) {
    return invalidEstimate(prepared, config, ["ESTIMATORS_DISAGREE"]);
  }

  const bpmValues = [chrom.bpm, pos.bpm];
  const green = valid.find((estimate) => estimate.method === "GREEN");
  if (green && green.bpm !== null && green.signalQuality >= config.minSpectralQuality + 0.1) {
    bpmValues.push(green.bpm);
  }

  const signalQuality = clamp(mean([chrom.signalQuality, pos.signalQuality]) * (1 - spread / 30), 0, 1);
  return validEstimate(prepared, config, mean(bpmValues), signalQuality, "FUSION", []);
}

function methodSpread(estimates: InternalEstimate[], config: RppgEngineConfig): number | null {
  const valid = estimates.filter(
    (estimate) => estimate.bpm !== null && estimate.signalQuality >= config.minSpectralQuality && estimate.reasonCodes.length === 0
  );
  if (valid.length < 2) return null;
  const values = valid.map((estimate) => estimate.bpm ?? 0);
  return round(Math.max(...values) - Math.min(...values), 2);
}

function estimateSingleMethod(
  prepared: PreparedWindow,
  method: Exclude<RppgMethod, "FUSION">,
  config: RppgEngineConfig
): InternalEstimate {
  const projection =
    method === "GREEN" ? projectGreen(prepared.samples) : method === "CHROM" ? projectChrom(prepared.samples) : projectPos(prepared.samples);

  if (projection.reasonCodes.length > 0) {
    return { bpm: null, signalQuality: 0, method, reasonCodes: projection.reasonCodes };
  }

  const peak = estimateDominantFrequency(
    projection.signal,
    prepared.sampleRateHz,
    config.hrBandHz.min,
    config.hrBandHz.max
  );

  if (peak.bpm === null) {
    return { bpm: null, signalQuality: 0, method, reasonCodes: ["SPECTRAL_PEAK_WEAK"] };
  }

  const reasonCodes: ReasonCode[] = [];
  if (peak.quality < config.minSpectralQuality) reasonCodes.push("SPECTRAL_PEAK_WEAK");
  if (prepared.motionScore > config.maxMotionScore * 0.8 && peak.frequencyHz !== null) {
    reasonCodes.push("MOTION_IN_PULSE_BAND");
  }

  return {
    bpm: peak.bpm,
    signalQuality: peak.quality,
    method,
    reasonCodes
  };
}

function validEstimate(
  prepared: PreparedWindow,
  config: RppgEngineConfig,
  bpm: number,
  signalQuality: number,
  method: RppgMethod,
  reasonCodes: ReasonCode[]
): HeartRateEstimate {
  return {
    timestampMs: Math.round(prepared.timestampMs),
    windowStartMs: Math.round(prepared.windowStartMs),
    windowEndMs: Math.round(prepared.windowEndMs),
    bpm: round(bpm, 2),
    signalQuality: round(clamp(signalQuality, 0, 1), 4),
    confidence: confidenceFor(signalQuality),
    method,
    methodVersion: config.methodVersion,
    roiCoverage: round(clamp(prepared.roiCoverage, 0, 1), 4),
    motionScore: round(clamp(prepared.motionScore, 0, 1), 4),
    illuminationInstability: round(clamp(prepared.illuminationInstability, 0, 1), 4),
    reasonCodes: [...new Set(reasonCodes)]
  };
}

function invalidEstimate(
  prepared: PreparedWindow,
  config: RppgEngineConfig,
  reasonCodes: ReasonCode[]
): HeartRateEstimate {
  return {
    timestampMs: Math.round(prepared.timestampMs),
    windowStartMs: Math.round(prepared.windowStartMs),
    windowEndMs: Math.round(prepared.windowEndMs),
    bpm: null,
    signalQuality: 0,
    confidence: "invalid",
    method: config.method,
    methodVersion: config.methodVersion,
    roiCoverage: round(clamp(prepared.roiCoverage, 0, 1), 4),
    motionScore: round(clamp(prepared.motionScore, 0, 1), 4),
    illuminationInstability: round(clamp(prepared.illuminationInstability, 0, 1), 4),
    reasonCodes: [...new Set(reasonCodes)]
  };
}

function collectReasons(estimates: InternalEstimate[], fallback: ReasonCode[]): ReasonCode[] {
  const reasons = estimates.flatMap((estimate) => estimate.reasonCodes);
  return reasons.length > 0 ? [...new Set(reasons)] : fallback;
}

function confidenceFor(signalQuality: number): HeartRateEstimate["confidence"] {
  if (signalQuality >= 0.7) return "high";
  if (signalQuality >= 0.5) return "medium";
  return "low";
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
