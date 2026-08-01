import type { RppgEngineConfig } from "./types.js";

export const DEFAULT_RPPG_ENGINE_CONFIG: RppgEngineConfig = {
  method: "FUSION",
  methodVersion: "rppg-engine-0.1.2",
  minWindowMs: 10_000,
  minSamples: 90,
  minFps: 12,
  minRoiCoverage: 0.55,
  maxRoiCoverageStd: 0.2,
  maxMotionScore: 0.65,
  maxIlluminationInstability: 0.22,
  illuminationCorrectionStrength: 0.85,
  minSpectralQuality: 0.3,
  maxFusionBpmSpread: 8,
  hrBandHz: {
    min: 0.7,
    max: 4
  }
};

export function resolveConfig(config: Partial<RppgEngineConfig> = {}): RppgEngineConfig {
  return {
    ...DEFAULT_RPPG_ENGINE_CONFIG,
    ...config,
    hrBandHz: {
      ...DEFAULT_RPPG_ENGINE_CONFIG.hrBandHz,
      ...config.hrBandHz
    }
  };
}
