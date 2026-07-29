import { estimateHeartRateDiagnostics, type HeartRateDiagnostics, type HeartRateEstimate, type RgbTraceSample } from "@pulse-reaction/rppg-engine";

export interface RoiRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PulseRoiRegion extends RoiRect {
  id: string;
}

export interface PulseSamplerSnapshot {
  sampleCount: number;
  sampleRateHz: number;
  skinCoverage: number;
  validRegionCount: number;
  estimate: HeartRateEstimate;
  diagnostics: HeartRateDiagnostics;
}

const MAX_TRACE_MS = 24_000;

export class PulseSampler {
  private readonly canvas = document.createElement("canvas");
  private readonly context = this.canvas.getContext("2d", { willReadFrequently: true });
  private readonly samples: RgbTraceSample[] = [];
  private previousLuma: number | null = null;

  sample(video: HTMLVideoElement, regions: readonly PulseRoiRegion[]): PulseSamplerSnapshot | null {
    if (!this.context || video.videoWidth <= 0 || video.videoHeight <= 0) {
      return null;
    }

    this.canvas.width = video.videoWidth;
    this.canvas.height = video.videoHeight;
    this.context.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);

    if (regions.length === 0) {
      return null;
    }

    const skin = averageSkinRegions(this.context, regions, this.canvas.width, this.canvas.height);
    const channels = skin.channels;
    const illumination = (channels.r + channels.g + channels.b) / 3;
    const normalized = normalizeChromaticity(channels, illumination);
    const motionScore =
      this.previousLuma === null ? 0 : Math.min(1, Math.abs(illumination - this.previousLuma) / Math.max(illumination, 1));
    this.previousLuma = illumination;

    const now = performance.now();
    this.samples.push({
      timestampMs: now,
      r: normalized.r,
      g: normalized.g,
      b: normalized.b,
      roiCoverage: skin.coverage,
      motionScore,
      illumination
    });

    while (this.samples.length > 0 && now - this.samples[0]!.timestampMs > MAX_TRACE_MS) {
      this.samples.shift();
    }

    const diagnostics = estimateHeartRateDiagnostics(this.samples, {
      method: "FUSION",
      minWindowMs: 12_000,
      minSamples: 180,
      minRoiCoverage: 0.18,
      maxRoiCoverageStd: 0.22,
      minSpectralQuality: 0.18,
      maxMotionScore: 0.75,
      maxIlluminationInstability: 0.28,
      maxFusionBpmSpread: 10,
      hrBandHz: {
        min: 0.85,
        max: 3.2
      }
    });

    return {
      sampleCount: this.samples.length,
      sampleRateHz: sampleRateHz(this.samples),
      skinCoverage: skin.coverage,
      validRegionCount: skin.validRegionCount,
      estimate: diagnostics.estimate,
      diagnostics
    };
  }

  reset(): void {
    this.samples.length = 0;
    this.previousLuma = null;
  }
}

function normalizeChromaticity(
  channels: { r: number; g: number; b: number },
  illumination: number
): { r: number; g: number; b: number } {
  const scale = 100 / Math.max(illumination, 1);
  return {
    r: channels.r * scale,
    g: channels.g * scale,
    b: channels.b * scale
  };
}

function sampleRateHz(samples: readonly RgbTraceSample[]): number {
  if (samples.length < 2) return 0;
  const first = samples[0]!.timestampMs;
  const last = samples[samples.length - 1]!.timestampMs;
  const seconds = (last - first) / 1000;
  return seconds > 0 ? (samples.length - 1) / seconds : 0;
}

function clampRoi(roi: RoiRect, width: number, height: number): RoiRect {
  const x = Math.max(0, Math.min(width - 1, Math.round(roi.x)));
  const y = Math.max(0, Math.min(height - 1, Math.round(roi.y)));
  const maxWidth = width - x;
  const maxHeight = height - y;
  return {
    x,
    y,
    width: Math.max(1, Math.min(maxWidth, Math.round(roi.width))),
    height: Math.max(1, Math.min(maxHeight, Math.round(roi.height)))
  };
}

function averageSkinRegions(
  context: CanvasRenderingContext2D,
  regions: readonly PulseRoiRegion[],
  width: number,
  height: number
): { channels: { r: number; g: number; b: number }; coverage: number; validRegionCount: number } {
  let weightedR = 0;
  let weightedG = 0;
  let weightedB = 0;
  let totalSkinPixels = 0;
  let totalPixels = 0;
  let validRegionCount = 0;

  for (const region of regions) {
    const rect = clampRoi(region, width, height);
    if (rect.width <= 0 || rect.height <= 0) continue;
    const image = context.getImageData(rect.x, rect.y, rect.width, rect.height);
    const skin = averageSkinChannels(image.data);
    totalPixels += skin.pixelCount;
    totalSkinPixels += skin.skinPixelCount;
    if (skin.coverage >= 0.08 && skin.skinPixelCount >= 24) {
      weightedR += skin.channels.r * skin.skinPixelCount;
      weightedG += skin.channels.g * skin.skinPixelCount;
      weightedB += skin.channels.b * skin.skinPixelCount;
      validRegionCount += 1;
    }
  }

  if (totalSkinPixels === 0 || validRegionCount === 0) {
    return {
      channels: { r: 0, g: 0, b: 0 },
      coverage: 0,
      validRegionCount: 0
    };
  }

  return {
    channels: {
      r: weightedR / totalSkinPixels,
      g: weightedG / totalSkinPixels,
      b: weightedB / totalSkinPixels
    },
    coverage: totalPixels > 0 ? totalSkinPixels / totalPixels : 0,
    validRegionCount
  };
}

function averageSkinChannels(data: Uint8ClampedArray): {
  channels: { r: number; g: number; b: number };
  coverage: number;
  pixelCount: number;
  skinPixelCount: number;
} {
  let skinR = 0;
  let skinG = 0;
  let skinB = 0;
  let skinPixels = 0;
  const pixels = data.length / 4;

  for (let index = 0; index < data.length; index += 4) {
    const r = data[index]!;
    const g = data[index + 1]!;
    const b = data[index + 2]!;
    if (isSkinLike(r, g, b)) {
      skinR += r;
      skinG += g;
      skinB += b;
      skinPixels += 1;
    }
  }

  if (skinPixels === 0) {
    return {
      channels: { r: 0, g: 0, b: 0 },
      coverage: 0,
      pixelCount: pixels,
      skinPixelCount: 0
    };
  }

  return {
    channels: {
      r: skinR / skinPixels,
      g: skinG / skinPixels,
      b: skinB / skinPixels
    },
    coverage: skinPixels / pixels,
    pixelCount: pixels,
    skinPixelCount: skinPixels
  };
}

function isSkinLike(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sum = r + g + b;
  if (sum < 45 || max - min < 8) return false;

  const nr = r / sum;
  const ng = g / sum;
  const nb = b / sum;
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

  const normalizedRgbSkin = nr > 0.32 && nr < 0.62 && ng > 0.22 && ng < 0.44 && nb > 0.12 && nb < 0.36;
  const yCbCrSkin = y > 35 && cb >= 77 && cb <= 135 && cr >= 133 && cr <= 180;
  const simpleRgbSkin = r > 35 && g > 20 && b > 15 && r > b && max - min > 12;
  return (normalizedRgbSkin && yCbCrSkin) || (simpleRgbSkin && yCbCrSkin);
}
