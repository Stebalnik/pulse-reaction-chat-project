export type RppgMethod = "GREEN" | "CHROM" | "POS" | "FUSION";

export type ConfidenceCategory = "high" | "medium" | "low" | "invalid";

export type ReasonCode =
  | "NO_SAMPLES"
  | "WINDOW_TOO_SHORT"
  | "TIMESTAMP_UNRELIABLE"
  | "LOW_FPS"
  | "ROI_TOO_SMALL"
  | "ROI_UNSTABLE"
  | "LOW_ILLUMINATION"
  | "ILLUMINATION_STEP_CHANGE"
  | "MOTION_HIGH"
  | "MOTION_IN_PULSE_BAND"
  | "ESTIMATORS_DISAGREE"
  | "SPECTRAL_PEAK_WEAK"
  | "TEMPORAL_OUTLIER"
  | "INSUFFICIENT_VARIANCE"
  | "METHOD_UNAVAILABLE";

export interface RgbTraceSample {
  timestampMs: number;
  r: number;
  g: number;
  b: number;
  roiCoverage: number;
  motionScore?: number;
  illumination?: number;
}

export interface HeartRateEstimate {
  timestampMs: number;
  windowStartMs: number;
  windowEndMs: number;
  bpm: number | null;
  signalQuality: number;
  confidence: ConfidenceCategory;
  method: string;
  methodVersion: string;
  roiCoverage: number;
  motionScore: number;
  illuminationInstability: number;
  reasonCodes: ReasonCode[];
}

export interface MethodEstimateDiagnostic {
  method: Exclude<RppgMethod, "FUSION">;
  bpm: number | null;
  signalQuality: number;
  reasonCodes: ReasonCode[];
}

export interface HeartRateDiagnostics {
  estimate: HeartRateEstimate;
  methodEstimates: MethodEstimateDiagnostic[];
  selectedMethod: string;
  methodSpreadBpm: number | null;
}

export interface RppgEngineConfig {
  method: RppgMethod;
  methodVersion: string;
  minWindowMs: number;
  minSamples: number;
  minFps: number;
  minRoiCoverage: number;
  maxRoiCoverageStd: number;
  maxMotionScore: number;
  maxIlluminationInstability: number;
  illuminationCorrectionStrength: number;
  minSpectralQuality: number;
  maxFusionBpmSpread: number;
  hrBandHz: {
    min: number;
    max: number;
  };
}

export interface InternalEstimate {
  bpm: number | null;
  signalQuality: number;
  method: Exclude<RppgMethod, "FUSION">;
  reasonCodes: ReasonCode[];
}
