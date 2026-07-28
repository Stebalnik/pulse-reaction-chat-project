export { DEFAULT_RPPG_ENGINE_CONFIG, resolveConfig } from "./config.js";
export { estimateHeartRate } from "./engine.js";
export { DEFAULT_PULSE_TREND_CONFIG, PulseTrendMonitor } from "./trend.js";
export type {
  ConfidenceCategory,
  HeartRateEstimate,
  ReasonCode,
  RgbTraceSample,
  RppgEngineConfig,
  RppgMethod
} from "./types.js";
export type { PulseTrendConfig, PulseTrendEstimate, PulseTrendState } from "./trend.js";
