import assert from "node:assert/strict";
import test from "node:test";
import { estimateHeartRate, estimateHeartRateDiagnostics, type RgbTraceSample } from "../packages/rppg-engine/src/index.js";

test("GREEN estimates a clean synthetic pulse rate", () => {
  const samples = syntheticTrace({ bpm: 72, seconds: 15, fps: 30, projection: "green" });
  const estimate = estimateHeartRate(samples, { method: "GREEN", minSpectralQuality: 0.2 });

  assert.equal(estimate.confidence !== "invalid", true);
  assert.ok(estimate.bpm !== null);
  const bpm = estimate.bpm;
  assert.ok(Math.abs(bpm - 72) <= 4, `expected about 72 bpm, got ${bpm}`);
  assert.equal(estimate.reasonCodes.length, 0);
});

test("FUSION estimates pulse when CHROM and POS agree", () => {
  const samples = syntheticTrace({ bpm: 90, seconds: 15, fps: 30, projection: "rgb" });
  const estimate = estimateHeartRate(samples, { method: "FUSION", minSpectralQuality: 0.2 });

  assert.equal(estimate.confidence !== "invalid", true);
  assert.ok(estimate.bpm !== null);
  const bpm = estimate.bpm;
  assert.ok(Math.abs(bpm - 90) <= 5, `expected about 90 bpm, got ${bpm}`);
  assert.equal(estimate.method, "FUSION");
});

test("diagnostics exposes per-method estimates and fusion spread", () => {
  const samples = syntheticTrace({ bpm: 84, seconds: 15, fps: 30, projection: "rgb" });
  const diagnostics = estimateHeartRateDiagnostics(samples, { minSpectralQuality: 0.2 });

  assert.equal(diagnostics.estimate.confidence !== "invalid", true);
  assert.ok(diagnostics.estimate.bpm !== null);
  assert.equal(diagnostics.selectedMethod, "FUSION");
  assert.equal(diagnostics.methodEstimates.length, 3);
  assert.ok(diagnostics.methodEstimates.some((estimate) => estimate.method === "CHROM" && estimate.bpm !== null));
  assert.ok(diagnostics.methodEstimates.some((estimate) => estimate.method === "POS" && estimate.bpm !== null));
  assert.ok(diagnostics.methodSpreadBpm !== null);
});

test("diagnostics preserves invalid window reason without method estimates", () => {
  const samples = syntheticTrace({ bpm: 72, seconds: 4, fps: 30, projection: "rgb" });
  const diagnostics = estimateHeartRateDiagnostics(samples);

  assert.equal(diagnostics.estimate.bpm, null);
  assert.equal(diagnostics.estimate.confidence, "invalid");
  assert.deepEqual(diagnostics.methodEstimates, []);
  assert.equal(diagnostics.methodSpreadBpm, null);
  assert.ok(diagnostics.estimate.reasonCodes.includes("WINDOW_TOO_SHORT"));
});

test("spectral interpolation estimates off-bin pulse rates", () => {
  const samples = syntheticTrace({ bpm: 73, seconds: 13, fps: 30, projection: "green" });
  const estimate = estimateHeartRate(samples, { method: "GREEN", minWindowMs: 12_000, minSpectralQuality: 0.18 });

  assert.equal(estimate.confidence !== "invalid", true);
  assert.ok(estimate.bpm !== null);
  assert.ok(Math.abs(estimate.bpm - 73) <= 3, `expected about 73 bpm, got ${estimate.bpm}`);
});


test("invalidates short windows instead of forcing BPM", () => {
  const samples = syntheticTrace({ bpm: 72, seconds: 4, fps: 30, projection: "rgb" });
  const estimate = estimateHeartRate(samples, { method: "FUSION" });

  assert.equal(estimate.bpm, null);
  assert.equal(estimate.confidence, "invalid");
  assert.ok(estimate.reasonCodes.includes("WINDOW_TOO_SHORT"));
});

test("invalidates low ROI coverage", () => {
  const samples = syntheticTrace({ bpm: 72, seconds: 15, fps: 30, projection: "rgb", roiCoverage: 0.2 });
  const estimate = estimateHeartRate(samples, { method: "FUSION" });

  assert.equal(estimate.bpm, null);
  assert.ok(estimate.reasonCodes.includes("ROI_TOO_SMALL"));
});

test("invalidates timestamp gaps", () => {
  const samples = syntheticTrace({ bpm: 72, seconds: 15, fps: 30, projection: "rgb" });
  const withGap = samples.filter((sample) => sample.timestampMs < 5_000 || sample.timestampMs > 7_000);
  const estimate = estimateHeartRate(withGap, { method: "FUSION" });

  assert.equal(estimate.bpm, null);
  assert.ok(estimate.reasonCodes.includes("TIMESTAMP_UNRELIABLE"));
});

test("invalidates high motion windows", () => {
  const samples = syntheticTrace({ bpm: 72, seconds: 15, fps: 30, projection: "rgb", motionScore: 0.9 });
  const estimate = estimateHeartRate(samples, { method: "FUSION" });

  assert.equal(estimate.bpm, null);
  assert.ok(estimate.reasonCodes.includes("MOTION_HIGH"));
});

test("estimates pulse from chromaticity-normalized traces under smooth illumination drift", () => {
  const samples = syntheticTrace({ bpm: 78, seconds: 15, fps: 30, projection: "rgb", normalizeChromaticity: true, illuminationDrift: 0.25 });
  const estimate = estimateHeartRate(samples, {
    method: "FUSION",
    minSpectralQuality: 0.18,
    maxIlluminationInstability: 0.4
  });

  assert.equal(estimate.confidence !== "invalid", true);
  assert.ok(estimate.bpm !== null);
  assert.ok(Math.abs(estimate.bpm - 78) <= 5, `expected about 78 bpm, got ${estimate.bpm}`);
});

function syntheticTrace(options: {
  bpm: number;
  seconds: number;
  fps: number;
  projection: "green" | "rgb";
  roiCoverage?: number;
  motionScore?: number;
  normalizeChromaticity?: boolean;
  illuminationDrift?: number;
}): RgbTraceSample[] {
  const samples: RgbTraceSample[] = [];
  const frequencyHz = options.bpm / 60;
  const total = Math.floor(options.seconds * options.fps);
  for (let i = 0; i < total; i += 1) {
    const timestampMs = (i * 1000) / options.fps;
    const t = timestampMs / 1000;
    const pulse = Math.sin(2 * Math.PI * frequencyHz * t);
    const drift = 0.02 * Math.sin(2 * Math.PI * 0.08 * t);
    const rPulse = options.projection === "rgb" ? -0.45 * pulse : 0.15 * pulse;
    const gPulse = options.projection === "rgb" ? 1.0 * pulse : pulse;
    const bPulse = options.projection === "rgb" ? -0.55 * pulse : 0.1 * pulse;
    const illuminationScale = 1 + (options.illuminationDrift ?? 0) * Math.sin(2 * Math.PI * 0.04 * t);
    const raw = {
      r: (100 + 1.2 * rPulse + drift) * illuminationScale,
      g: (95 + 1.6 * gPulse + drift) * illuminationScale,
      b: (85 + 1.1 * bPulse + drift) * illuminationScale
    };
    const illumination = (raw.r + raw.g + raw.b) / 3;
    const channels = options.normalizeChromaticity
      ? {
          r: (raw.r / Math.max(illumination, 1)) * 100,
          g: (raw.g / Math.max(illumination, 1)) * 100,
          b: (raw.b / Math.max(illumination, 1)) * 100
        }
      : raw;
    samples.push({
      timestampMs,
      r: channels.r,
      g: channels.g,
      b: channels.b,
      roiCoverage: options.roiCoverage ?? 0.9,
      motionScore: options.motionScore ?? 0.05,
      illumination
    });
  }
  return samples;
}
