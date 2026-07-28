import assert from "node:assert/strict";
import test from "node:test";
import { PulseTrendMonitor, type HeartRateEstimate } from "../packages/rppg-engine/src/index.js";

test("does not classify invalid HR windows", () => {
  const monitor = new PulseTrendMonitor();
  const trend = monitor.update(estimate({ bpm: null, confidence: "invalid", reasonCodes: ["WINDOW_TOO_SHORT"] }));

  assert.equal(trend.state, "INSUFFICIENT_SIGNAL");
  assert.equal(trend.deltaBpm, null);
  assert.ok(trend.reasonCodes.includes("WINDOW_TOO_SHORT"));
});

test("calibrates before emitting baseline-relative trend", () => {
  const monitor = new PulseTrendMonitor({ minBaselineSamples: 3, minBaselineSpanMs: 6_000, minAcceptedEstimateSpacingMs: 2_000 });

  assert.equal(monitor.update(estimate({ timestampMs: 0, bpm: 70 })).state, "CALIBRATING_BASELINE");
  assert.equal(monitor.update(estimate({ timestampMs: 2_000, bpm: 71 })).state, "CALIBRATING_BASELINE");
  const mature = monitor.update(estimate({ timestampMs: 6_000, bpm: 70 }));

  assert.equal(mature.state, "NEAR_BASELINE");
  assert.equal(mature.baselineMaturity, 1);
});

test("reports neutral activation relative to personal baseline", () => {
  const monitor = calibratedMonitor();
  const trend = monitor.update(estimate({ timestampMs: 12_000, bpm: 82 }));

  assert.equal(trend.state, "POSSIBLE_ACTIVATION");
  assert.ok(trend.deltaBpm !== null && trend.deltaBpm >= 6);
  assert.ok(trend.alternativeExplanations.includes("speech"));
});

test("reports recovery when pulse returns toward baseline", () => {
  const monitor = calibratedMonitor();
  monitor.update(estimate({ timestampMs: 12_000, bpm: 84 }));
  const trend = monitor.update(estimate({ timestampMs: 14_000, bpm: 71 }));

  assert.equal(trend.state, "RECOVERY");
  assert.ok(trend.deltaBpm !== null && Math.abs(trend.deltaBpm) <= 3);
});

function calibratedMonitor(): PulseTrendMonitor {
  const monitor = new PulseTrendMonitor({ minBaselineSamples: 3, minBaselineSpanMs: 6_000, minAcceptedEstimateSpacingMs: 2_000 });
  monitor.update(estimate({ timestampMs: 0, bpm: 70 }));
  monitor.update(estimate({ timestampMs: 2_000, bpm: 71 }));
  monitor.update(estimate({ timestampMs: 6_000, bpm: 70 }));
  return monitor;
}

function estimate(overrides: Partial<HeartRateEstimate> = {}): HeartRateEstimate {
  const timestampMs = overrides.timestampMs ?? 10_000;
  return {
    timestampMs,
    windowStartMs: Math.max(0, timestampMs - 10_000),
    windowEndMs: timestampMs,
    bpm: 70,
    signalQuality: 0.72,
    confidence: "medium",
    method: "FUSION",
    methodVersion: "test",
    roiCoverage: 0.85,
    motionScore: 0.08,
    illuminationInstability: 0.04,
    reasonCodes: [],
    ...overrides
  };
}
