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
  const fusionGroup = selectFusionGroup(methodEstimates, config);
  return {
    estimate: estimateFusionFromMethods(prepared, config, methodEstimates),
    methodEstimates: methodEstimates.map((estimate) => ({
      method: estimate.method,
      bpm: estimate.bpm === null ? null : round(estimate.bpm, 2),
      signalQuality: round(clamp(estimate.signalQuality, 0, 1), 4),
      reasonCodes: [...new Set(estimate.reasonCodes)]
    })),
    selectedMethod: fusionGroup ? `${config.method}:${fusionGroup.methods.join("+")}` : config.method,
    methodSpreadBpm: fusionGroup ? round(fusionGroup.spreadBpm, 2) : methodSpread(methodEstimates, config)
  };
}

function estimateFusion(prepared: PreparedWindow, config: RppgEngineConfig): HeartRateEstimate {
  const estimates = (["CHROM", "POS", "GREEN"] as const).map((method) => estimateSingleMethod(prepared, method, config));
  return estimateFusionFromMethods(prepared, config, estimates);
}

function estimateFusionFromMethods(prepared: PreparedWindow, config: RppgEngineConfig, estimates: InternalEstimate[]): HeartRateEstimate {
  const fusionGroup = selectFusionGroup(estimates, config);
  if (!fusionGroup) {
    return invalidEstimate(prepared, config, collectReasons(estimates, ["ESTIMATORS_DISAGREE"]));
  }

  return validEstimate(prepared, config, fusionGroup.bpm, fusionGroup.signalQuality, "FUSION", []);
}

interface FusionGroup {
  methods: Array<Exclude<RppgMethod, "FUSION">>;
  bpm: number;
  signalQuality: number;
  spreadBpm: number;
}

export function selectFusionGroup(estimates: readonly InternalEstimate[], config: RppgEngineConfig): FusionGroup | null {
  const valid = estimates.filter(
    (estimate) => estimate.bpm !== null && estimate.signalQuality >= config.minSpectralQuality && estimate.reasonCodes.length === 0
  );
  if (valid.length < 2) return null;

  const pairs = pairsOf(valid).filter(([left, right]) => Math.abs((left.bpm ?? 0) - (right.bpm ?? 0)) <= config.maxFusionBpmSpread);
  if (pairs.length === 0) return null;

  const best = pairs
    .map(([left, right]) => {
      const spreadBpm = Math.abs((left.bpm ?? 0) - (right.bpm ?? 0));
      const meanQuality = mean([left.signalQuality, right.signalQuality]);
      const preferredPairBonus = pairPreferenceBonus(left.method, right.method);
      return {
        estimates: [left, right],
        score: meanQuality - spreadBpm / Math.max(config.maxFusionBpmSpread * 4, 1) + preferredPairBonus,
        spreadBpm
      };
    })
    .sort((left, right) => right.score - left.score)[0]!;

  const included = includeNearbyEstimates(best.estimates, valid, config);
  const spreadBpm = Math.max(...included.map((estimate) => estimate.bpm ?? 0)) - Math.min(...included.map((estimate) => estimate.bpm ?? 0));
  const qualityValues = included.map((estimate) => estimate.signalQuality);
  const qualitySum = qualityValues.reduce((sum, value) => sum + value, 0);
  const bpm =
    qualitySum > 0
      ? included.reduce((sum, estimate) => sum + (estimate.bpm ?? 0) * estimate.signalQuality, 0) / qualitySum
      : mean(included.map((estimate) => estimate.bpm ?? 0));
  const signalQuality = clamp(mean(qualityValues) * (1 - spreadBpm / Math.max(config.maxFusionBpmSpread * 3, 1)), 0, 1);

  return {
    methods: included.map((estimate) => estimate.method),
    bpm,
    signalQuality,
    spreadBpm
  };
}

function pairsOf<T>(values: readonly T[]): Array<[T, T]> {
  const result: Array<[T, T]> = [];
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      result.push([values[left]!, values[right]!]);
    }
  }
  return result;
}

function pairPreferenceBonus(left: Exclude<RppgMethod, "FUSION">, right: Exclude<RppgMethod, "FUSION">): number {
  const methods = new Set([left, right]);
  if (methods.has("CHROM") && methods.has("POS")) return 0.03;
  if (methods.has("POS") && methods.has("GREEN")) return 0.02;
  return 0.01;
}

function includeNearbyEstimates(
  selected: readonly InternalEstimate[],
  valid: readonly InternalEstimate[],
  config: RppgEngineConfig
): InternalEstimate[] {
  const selectedMethods = new Set(selected.map((estimate) => estimate.method));
  const centerBpm = mean(selected.map((estimate) => estimate.bpm ?? 0));
  const nearby = valid.filter(
    (estimate) =>
      !selectedMethods.has(estimate.method) &&
      estimate.bpm !== null &&
      Math.abs(estimate.bpm - centerBpm) <= config.maxFusionBpmSpread / 2 &&
      estimate.signalQuality >= config.minSpectralQuality + 0.05
  );
  return [...selected, ...nearby];
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
  const samples = illuminationCorrectedSamples(prepared.samples, config.illuminationCorrectionStrength);
  const projection =
    method === "GREEN" ? projectGreen(samples) : method === "CHROM" ? projectChrom(samples) : projectPos(samples);

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

function illuminationCorrectedSamples(samples: readonly RgbTraceSample[], strength: number): readonly RgbTraceSample[] {
  const correctionStrength = clamp(strength, 0, 1);
  if (correctionStrength <= 0 || samples.length < 4) return samples;

  const illumination = samples.map((sample) => sample.illumination ?? (sample.r + sample.g + sample.b) / 3);
  const illuminationMean = mean(illumination);
  const illuminationVariance = mean(illumination.map((value) => (value - illuminationMean) ** 2));
  if (!Number.isFinite(illuminationVariance) || illuminationVariance < 1e-9) return samples;

  const r = removeIlluminationComponent(
    samples.map((sample) => sample.r),
    illumination,
    illuminationMean,
    illuminationVariance,
    correctionStrength
  );
  const g = removeIlluminationComponent(
    samples.map((sample) => sample.g),
    illumination,
    illuminationMean,
    illuminationVariance,
    correctionStrength
  );
  const b = removeIlluminationComponent(
    samples.map((sample) => sample.b),
    illumination,
    illuminationMean,
    illuminationVariance,
    correctionStrength
  );

  return samples.map((sample, index) => ({
    ...sample,
    r: r[index]!,
    g: g[index]!,
    b: b[index]!
  }));
}

function removeIlluminationComponent(
  values: readonly number[],
  illumination: readonly number[],
  illuminationMean: number,
  illuminationVariance: number,
  strength: number
): number[] {
  const valueMean = mean(values);
  const covariance = mean(values.map((value, index) => (value - valueMean) * (illumination[index]! - illuminationMean)));
  const slope = covariance / illuminationVariance;
  return values.map((value, index) => value - slope * (illumination[index]! - illuminationMean) * strength);
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
