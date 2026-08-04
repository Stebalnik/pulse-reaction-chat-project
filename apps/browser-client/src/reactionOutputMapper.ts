import type { ReactionOutputRequest } from "@pulse-reaction/shared-schemas";
import type { PulseTrendEstimate, PulseTrendState } from "@pulse-reaction/rppg-engine";

export function reactionOutputFromTrend(input: {
  localUserId: string;
  sessionId: string | undefined;
  trend: PulseTrendEstimate;
  methodVersion: string;
  regionAgreement: boolean | null;
}): ReactionOutputRequest {
  return {
    localUserId: input.localUserId,
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    occurredAtIso: new Date().toISOString(),
    modelVersion: input.trend.modelVersion,
    methodVersion: input.methodVersion,
    state: mapTrendState(input.trend.state),
    confidence: confidenceCategory(input.trend.confidence),
    reasonCodes: input.trend.reasonCodes,
    qualityScore: round(input.trend.signalQuality, 4),
    regionAgreement: regionAgreementCategory(input.regionAgreement)
  };
}

export function mapTrendState(state: PulseTrendState): ReactionOutputRequest["state"] {
  if (state === "HIGH_ACTIVATION") return "HIGHER_ACTIVATION";
  return state;
}

export function confidenceCategory(confidence: number): ReactionOutputRequest["confidence"] {
  if (confidence >= 0.72) return "high";
  if (confidence >= 0.38) return "medium";
  return "low";
}

export function regionAgreementCategory(stable: boolean | null): ReactionOutputRequest["regionAgreement"] {
  if (stable === null) return "not_reported";
  return stable ? "high" : "low";
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
