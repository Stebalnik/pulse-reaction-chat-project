import assert from "node:assert/strict";
import test from "node:test";
import type { PulseTrendEstimate } from "@pulse-reaction/rppg-engine";
import { confidenceCategory, mapTrendState, reactionOutputFromTrend, regionAgreementCategory } from "../apps/browser-client/src/reactionOutputMapper.js";

test("public reaction output maps internal trend states to shared schema", () => {
  assert.equal(mapTrendState("HIGH_ACTIVATION"), "HIGHER_ACTIVATION");
  assert.equal(mapTrendState("POSSIBLE_ACTIVATION"), "POSSIBLE_ACTIVATION");
  assert.equal(mapTrendState("INSUFFICIENT_SIGNAL"), "INSUFFICIENT_SIGNAL");
});

test("public reaction output maps confidence and region agreement", () => {
  assert.equal(confidenceCategory(0.9), "high");
  assert.equal(confidenceCategory(0.5), "medium");
  assert.equal(confidenceCategory(0.1), "low");
  assert.equal(regionAgreementCategory(true), "high");
  assert.equal(regionAgreementCategory(false), "low");
  assert.equal(regionAgreementCategory(null), "not_reported");
});

test("public reaction output payload omits raw biometric samples", () => {
  const payload = reactionOutputFromTrend({
    localUserId: "SV-PUBLIC-000001",
    sessionId: "session-1",
    methodVersion: "rppg-engine-0.1.0",
    regionAgreement: true,
    trend: {
      timestampMs: 12_000,
      state: "HIGH_ACTIVATION",
      confidence: 0.81,
      baselineBpm: 71,
      baselineMaturity: 1,
      deltaBpm: 15,
      slopeBpmPerSecond: 0.4,
      signalQuality: 0.73456,
      evidence: {
        bpm: 86,
        motionScore: 0.12,
        illuminationInstability: 0.04,
        validEstimateCount: 8,
        baselineSpanMs: 14_000
      },
      alternativeExplanations: ["speech", "posture change"],
      reasonCodes: [],
      modelVersion: "pulse-trend-rules-0.1.0"
    } satisfies PulseTrendEstimate
  });

  assert.equal(payload.state, "HIGHER_ACTIVATION");
  assert.equal(payload.confidence, "high");
  assert.equal(payload.qualityScore, 0.7346);
  assert.equal(payload.regionAgreement, "high");
  assert.equal("bpm" in payload, false);
  assert.equal("baselineBpm" in payload, false);
  assert.equal("samples" in payload, false);
});
