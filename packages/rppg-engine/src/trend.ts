import type { HeartRateEstimate, ReasonCode } from "./types.js";

export type PulseTrendState =
  | "INSUFFICIENT_SIGNAL"
  | "CALIBRATING_BASELINE"
  | "NEAR_BASELINE"
  | "POSSIBLE_ACTIVATION"
  | "HIGH_ACTIVATION"
  | "RECOVERY";

export interface PulseTrendConfig {
  minBaselineSamples: number;
  minBaselineSpanMs: number;
  maxBaselineAgeMs: number;
  minAcceptedEstimateSpacingMs: number;
  activationDeltaBpm: number;
  highActivationDeltaBpm: number;
  recoveryDeltaBpm: number;
  maxMotionForTrend: number;
  maxIlluminationForTrend: number;
  minSignalQualityForTrend: number;
}

export interface PulseTrendEstimate {
  timestampMs: number;
  state: PulseTrendState;
  confidence: number;
  baselineBpm: number | null;
  baselineMaturity: number;
  deltaBpm: number | null;
  slopeBpmPerSecond: number | null;
  signalQuality: number;
  evidence: {
    bpm: number | null;
    motionScore: number;
    illuminationInstability: number;
    validEstimateCount: number;
    baselineSpanMs: number;
  };
  alternativeExplanations: string[];
  reasonCodes: ReasonCode[];
  modelVersion: string;
}

export const DEFAULT_PULSE_TREND_CONFIG: PulseTrendConfig = {
  minBaselineSamples: 8,
  minBaselineSpanMs: 30_000,
  maxBaselineAgeMs: 180_000,
  minAcceptedEstimateSpacingMs: 2_000,
  activationDeltaBpm: 6,
  highActivationDeltaBpm: 14,
  recoveryDeltaBpm: 3,
  maxMotionForTrend: 0.45,
  maxIlluminationForTrend: 0.18,
  minSignalQualityForTrend: 0.35
};

interface AcceptedEstimate {
  timestampMs: number;
  bpm: number;
  signalQuality: number;
  motionScore: number;
  illuminationInstability: number;
}

export class PulseTrendMonitor {
  private readonly config: PulseTrendConfig;
  private readonly estimates: AcceptedEstimate[] = [];
  private previousDeltaBpm: number | null = null;
  private previousTimestampMs: number | null = null;

  constructor(config: Partial<PulseTrendConfig> = {}) {
    this.config = { ...DEFAULT_PULSE_TREND_CONFIG, ...config };
  }

  update(estimate: HeartRateEstimate): PulseTrendEstimate {
    if (!isUsableForTrend(estimate, this.config)) {
      return this.insufficient(estimate);
    }

    this.accept(estimate);
    const baselineMaturity = this.baselineMaturity(estimate.timestampMs);
    const baselineBpm = this.baselineBpm();
    const deltaBpm = baselineBpm === null || estimate.bpm === null ? null : round(estimate.bpm - baselineBpm, 2);
    const slopeBpmPerSecond = this.slope(deltaBpm, estimate.timestampMs);

    if (baselineMaturity < 1 || baselineBpm === null || deltaBpm === null) {
      this.rememberDelta(deltaBpm, estimate.timestampMs);
      return this.output(estimate, "CALIBRATING_BASELINE", 0.25 + 0.45 * baselineMaturity, baselineBpm, baselineMaturity, deltaBpm, slopeBpmPerSecond);
    }

    const state = classifyDelta(deltaBpm, this.previousDeltaBpm, this.config);
    const confidence = confidenceForTrend(estimate, baselineMaturity, deltaBpm, this.config);
    this.rememberDelta(deltaBpm, estimate.timestampMs);
    return this.output(estimate, state, confidence, baselineBpm, baselineMaturity, deltaBpm, slopeBpmPerSecond);
  }

  reset(): void {
    this.estimates.length = 0;
    this.previousDeltaBpm = null;
    this.previousTimestampMs = null;
  }

  private accept(estimate: HeartRateEstimate): void {
    const last = this.estimates.at(-1);
    if (last && estimate.timestampMs - last.timestampMs < this.config.minAcceptedEstimateSpacingMs) {
      return;
    }
    this.estimates.push({
      timestampMs: estimate.timestampMs,
      bpm: estimate.bpm ?? 0,
      signalQuality: estimate.signalQuality,
      motionScore: estimate.motionScore,
      illuminationInstability: estimate.illuminationInstability
    });
    while (this.estimates.length > 0 && estimate.timestampMs - this.estimates[0]!.timestampMs > this.config.maxBaselineAgeMs) {
      this.estimates.shift();
    }
  }

  private baselineBpm(): number | null {
    if (this.estimates.length < 2) return null;
    const sorted = this.estimates.map((estimate) => estimate.bpm).sort((a, b) => a - b);
    const trim = Math.floor(sorted.length * 0.15);
    const trimmed = sorted.slice(trim, sorted.length - trim || sorted.length);
    return round(trimmed.reduce((sum, bpm) => sum + bpm, 0) / trimmed.length, 2);
  }

  private baselineMaturity(nowMs: number): number {
    if (this.estimates.length === 0) return 0;
    const spanMs = nowMs - this.estimates[0]!.timestampMs;
    return Math.min(1, this.estimates.length / this.config.minBaselineSamples, spanMs / this.config.minBaselineSpanMs);
  }

  private baselineSpanMs(nowMs: number): number {
    return this.estimates.length === 0 ? 0 : Math.max(0, nowMs - this.estimates[0]!.timestampMs);
  }

  private slope(deltaBpm: number | null, timestampMs: number): number | null {
    if (deltaBpm === null || this.previousDeltaBpm === null || this.previousTimestampMs === null) return null;
    const seconds = (timestampMs - this.previousTimestampMs) / 1000;
    if (seconds <= 0) return null;
    return round((deltaBpm - this.previousDeltaBpm) / seconds, 3);
  }

  private rememberDelta(deltaBpm: number | null, timestampMs: number): void {
    if (deltaBpm === null) return;
    this.previousDeltaBpm = deltaBpm;
    this.previousTimestampMs = timestampMs;
  }

  private insufficient(estimate: HeartRateEstimate): PulseTrendEstimate {
    return this.output(estimate, "INSUFFICIENT_SIGNAL", 0, this.baselineBpm(), this.baselineMaturity(estimate.timestampMs), null, null);
  }

  private output(
    estimate: HeartRateEstimate,
    state: PulseTrendState,
    confidence: number,
    baselineBpm: number | null,
    baselineMaturity: number,
    deltaBpm: number | null,
    slopeBpmPerSecond: number | null
  ): PulseTrendEstimate {
    return {
      timestampMs: estimate.timestampMs,
      state,
      confidence: round(Math.max(0, Math.min(1, confidence)), 3),
      baselineBpm,
      baselineMaturity: round(baselineMaturity, 3),
      deltaBpm,
      slopeBpmPerSecond,
      signalQuality: estimate.signalQuality,
      evidence: {
        bpm: estimate.bpm,
        motionScore: estimate.motionScore,
        illuminationInstability: estimate.illuminationInstability,
        validEstimateCount: this.estimates.length,
        baselineSpanMs: this.baselineSpanMs(estimate.timestampMs)
      },
      alternativeExplanations: alternativeExplanations(estimate),
      reasonCodes: estimate.reasonCodes,
      modelVersion: "pulse-trend-rules-0.1.0"
    };
  }
}

function isUsableForTrend(estimate: HeartRateEstimate, config: PulseTrendConfig): boolean {
  return (
    estimate.bpm !== null &&
    estimate.confidence !== "invalid" &&
    estimate.signalQuality >= config.minSignalQualityForTrend &&
    estimate.motionScore <= config.maxMotionForTrend &&
    estimate.illuminationInstability <= config.maxIlluminationForTrend
  );
}

function classifyDelta(deltaBpm: number, previousDeltaBpm: number | null, config: PulseTrendConfig): PulseTrendState {
  const absDelta = Math.abs(deltaBpm);
  if (absDelta >= config.highActivationDeltaBpm) return "HIGH_ACTIVATION";
  if (deltaBpm >= config.activationDeltaBpm) return "POSSIBLE_ACTIVATION";
  if (previousDeltaBpm !== null && previousDeltaBpm >= config.activationDeltaBpm && absDelta <= config.recoveryDeltaBpm) {
    return "RECOVERY";
  }
  return "NEAR_BASELINE";
}

function confidenceForTrend(
  estimate: HeartRateEstimate,
  baselineMaturity: number,
  deltaBpm: number,
  config: PulseTrendConfig
): number {
  const deltaStrength = Math.min(1, Math.abs(deltaBpm) / config.highActivationDeltaBpm);
  const artifactPenalty = Math.max(0, estimate.motionScore / config.maxMotionForTrend, estimate.illuminationInstability / config.maxIlluminationForTrend);
  return estimate.signalQuality * 0.45 + baselineMaturity * 0.35 + deltaStrength * 0.2 - artifactPenalty * 0.15;
}

function alternativeExplanations(estimate: HeartRateEstimate): string[] {
  const explanations = ["speech", "posture change", "temperature", "caffeine", "unobserved movement"];
  if (estimate.motionScore > 0.25) explanations.unshift("visible motion");
  if (estimate.illuminationInstability > 0.1) explanations.unshift("lighting change");
  return explanations.slice(0, 5);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
