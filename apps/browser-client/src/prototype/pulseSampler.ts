import { estimateHeartRate, type HeartRateEstimate, type RgbTraceSample } from "@pulse-reaction/rppg-engine";

export interface RoiRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PulseSamplerSnapshot {
  sampleCount: number;
  estimate: HeartRateEstimate;
}

const MAX_TRACE_MS = 18_000;

export class PulseSampler {
  private readonly canvas = document.createElement("canvas");
  private readonly context = this.canvas.getContext("2d", { willReadFrequently: true });
  private readonly samples: RgbTraceSample[] = [];
  private previousLuma: number | null = null;

  sample(video: HTMLVideoElement, roi: RoiRect): PulseSamplerSnapshot | null {
    if (!this.context || video.videoWidth <= 0 || video.videoHeight <= 0) {
      return null;
    }

    this.canvas.width = video.videoWidth;
    this.canvas.height = video.videoHeight;
    this.context.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);

    const rect = clampRoi(roi, this.canvas.width, this.canvas.height);
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    const image = this.context.getImageData(rect.x, rect.y, rect.width, rect.height);
    const channels = averageChannels(image.data);
    const illumination = (channels.r + channels.g + channels.b) / 3;
    const motionScore =
      this.previousLuma === null ? 0 : Math.min(1, Math.abs(illumination - this.previousLuma) / Math.max(illumination, 1));
    this.previousLuma = illumination;

    const now = performance.now();
    this.samples.push({
      timestampMs: now,
      r: channels.r,
      g: channels.g,
      b: channels.b,
      roiCoverage: 0.85,
      motionScore,
      illumination
    });

    while (this.samples.length > 0 && now - this.samples[0]!.timestampMs > MAX_TRACE_MS) {
      this.samples.shift();
    }

    const estimate = estimateHeartRate(this.samples, {
      method: "FUSION",
      minWindowMs: 8_000,
      minSamples: 80,
      minSpectralQuality: 0.18,
      maxMotionScore: 0.75,
      maxIlluminationInstability: 0.28,
      maxFusionBpmSpread: 10
    });

    return {
      sampleCount: this.samples.length,
      estimate
    };
  }

  reset(): void {
    this.samples.length = 0;
    this.previousLuma = null;
  }
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

function averageChannels(data: Uint8ClampedArray): { r: number; g: number; b: number } {
  let r = 0;
  let g = 0;
  let b = 0;
  const pixels = data.length / 4;
  for (let index = 0; index < data.length; index += 4) {
    r += data[index]!;
    g += data[index + 1]!;
    b += data[index + 2]!;
  }

  return {
    r: r / pixels,
    g: g / pixels,
    b: b / pixels
  };
}
