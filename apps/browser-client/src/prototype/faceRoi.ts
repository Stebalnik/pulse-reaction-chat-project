import type { PulseRoiRegion, RoiRect } from "./pulseSampler.js";

type RoiSource = "face" | "skin" | "fallback";

export interface FaceRoiResult {
  roi: RoiRect;
  regions: PulseRoiRegion[];
  source: RoiSource;
  detectorSupported: boolean;
}

interface DetectedFace {
  boundingBox: DOMRectReadOnly;
}

interface FaceDetectorLike {
  detect(image: HTMLVideoElement): Promise<DetectedFace[]>;
}

interface FaceDetectorConstructor {
  new (options?: { fastMode?: boolean; maxDetectedFaces?: number }): FaceDetectorLike;
}

const DETECTION_INTERVAL_MS = 500;
const SMOOTHING = 0.72;

export class FaceRoiTracker {
  private readonly detector: FaceDetectorLike | null = createDetector();
  private readonly canvas = document.createElement("canvas");
  private readonly context = this.canvas.getContext("2d", { willReadFrequently: true });
  private lastDetectionAt = 0;
  private lastResult: FaceRoiResult | null = null;
  private pending: Promise<FaceRoiResult> | null = null;

  async locate(video: HTMLVideoElement, timestampMs: number): Promise<FaceRoiResult> {
    if (video.videoWidth <= 0 || video.videoHeight <= 0) {
      return {
        ...fallbackGeometry(1, 1),
        source: "fallback",
        detectorSupported: this.detector !== null
      };
    }

    if (!this.detector) {
      const skin = this.skinFallback(video);
      this.lastResult = {
        ...(skin ? geometryFromRoi(skin, "skin") : fallbackGeometry(video.videoWidth, video.videoHeight)),
        source: skin ? "skin" : "fallback",
        detectorSupported: false
      };
      return this.lastResult;
    }

    if (this.lastResult && timestampMs - this.lastDetectionAt < DETECTION_INTERVAL_MS) {
      return this.lastResult;
    }
    if (this.pending) return this.pending;

    this.lastDetectionAt = timestampMs;
    this.pending = this.detect(video, this.detector).finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  reset(): void {
    this.lastDetectionAt = 0;
    this.lastResult = null;
    this.pending = null;
  }

  private async detect(video: HTMLVideoElement, detector: FaceDetectorLike): Promise<FaceRoiResult> {
    try {
      const faces = await detector.detect(video);
      const face = largestFace(faces);
      if (!face) {
        const skin = this.skinFallback(video);
        this.lastResult = {
          ...(skin ? geometryFromRoi(skin, "skin") : fallbackGeometry(video.videoWidth, video.videoHeight)),
          source: skin ? "skin" : "fallback",
          detectorSupported: true
        };
        return this.lastResult;
      }

      const next = faceToPulseRoi(face.boundingBox, video.videoWidth, video.videoHeight);
      const roi = this.lastResult?.source === "face" ? smoothRoi(this.lastResult.roi, next) : next;
      this.lastResult = {
        roi,
        regions: pulseRegionsFromFaceRoi(roi),
        source: "face",
        detectorSupported: true
      };
      return this.lastResult;
    } catch {
      const skin = this.skinFallback(video);
      this.lastResult = {
        ...(skin ? geometryFromRoi(skin, "skin") : fallbackGeometry(video.videoWidth, video.videoHeight)),
        source: skin ? "skin" : "fallback",
        detectorSupported: true
      };
      return this.lastResult;
    }
  }

  private skinFallback(video: HTMLVideoElement): RoiRect | null {
    if (!this.context) return null;
    const targetWidth = 160;
    const scale = targetWidth / video.videoWidth;
    const targetHeight = Math.max(1, Math.round(video.videoHeight * scale));
    this.canvas.width = targetWidth;
    this.canvas.height = targetHeight;
    this.context.drawImage(video, 0, 0, targetWidth, targetHeight);
    const image = this.context.getImageData(0, 0, targetWidth, targetHeight);
    const bounds = skinBounds(image.data, targetWidth, targetHeight);
    if (!bounds) return null;
    const paddingX = bounds.width * 0.16;
    const paddingY = bounds.height * 0.12;
    return clampRoi(
      {
        x: (bounds.x - paddingX) / scale,
        y: (bounds.y - paddingY) / scale,
        width: (bounds.width + paddingX * 2) / scale,
        height: (bounds.height + paddingY * 2) / scale
      },
      video.videoWidth,
      video.videoHeight
    );
  }
}

function createDetector(): FaceDetectorLike | null {
  const Detector = (globalThis as { FaceDetector?: FaceDetectorConstructor }).FaceDetector;
  if (!Detector) return null;
  return new Detector({ fastMode: true, maxDetectedFaces: 1 });
}

function largestFace(faces: DetectedFace[]): DetectedFace | null {
  let selected: DetectedFace | null = null;
  let selectedArea = 0;
  for (const face of faces) {
    const area = face.boundingBox.width * face.boundingBox.height;
    if (area > selectedArea) {
      selected = face;
      selectedArea = area;
    }
  }
  return selected;
}

function faceToPulseRoi(face: DOMRectReadOnly, frameWidth: number, frameHeight: number): RoiRect {
  return clampRoi(
    {
      x: face.x + face.width * 0.16,
      y: face.y + face.height * 0.12,
      width: face.width * 0.68,
      height: face.height * 0.56
    },
    frameWidth,
    frameHeight
  );
}

function fallbackGeometry(frameWidth: number, frameHeight: number): { roi: RoiRect; regions: PulseRoiRegion[] } {
  const width = Math.max(1, frameWidth * 0.3);
  const height = Math.max(1, frameHeight * 0.32);
  const roi = {
    x: (frameWidth - width) / 2,
    y: frameHeight * 0.18,
    width,
    height
  };
  return geometryFromRoi(roi, "fallback");
}

function geometryFromRoi(roi: RoiRect, prefix: string): { roi: RoiRect; regions: PulseRoiRegion[] } {
  return {
    roi,
    regions: [
      {
        id: `${prefix}-upper`,
        x: roi.x + roi.width * 0.18,
        y: roi.y + roi.height * 0.06,
        width: roi.width * 0.64,
        height: roi.height * 0.28
      },
      {
        id: `${prefix}-middle-left`,
        x: roi.x + roi.width * 0.08,
        y: roi.y + roi.height * 0.38,
        width: roi.width * 0.34,
        height: roi.height * 0.36
      },
      {
        id: `${prefix}-middle-right`,
        x: roi.x + roi.width * 0.58,
        y: roi.y + roi.height * 0.38,
        width: roi.width * 0.34,
        height: roi.height * 0.36
      }
    ]
  };
}

function pulseRegionsFromFaceRoi(roi: RoiRect): PulseRoiRegion[] {
  return [
    {
      id: "forehead",
      x: roi.x + roi.width * 0.22,
      y: roi.y + roi.height * 0.02,
      width: roi.width * 0.56,
      height: roi.height * 0.22
    },
    {
      id: "left-cheek",
      x: roi.x + roi.width * 0.07,
      y: roi.y + roi.height * 0.42,
      width: roi.width * 0.32,
      height: roi.height * 0.34
    },
    {
      id: "right-cheek",
      x: roi.x + roi.width * 0.61,
      y: roi.y + roi.height * 0.42,
      width: roi.width * 0.32,
      height: roi.height * 0.34
    }
  ];
}

function smoothRoi(previous: RoiRect, next: RoiRect): RoiRect {
  return {
    x: previous.x * SMOOTHING + next.x * (1 - SMOOTHING),
    y: previous.y * SMOOTHING + next.y * (1 - SMOOTHING),
    width: previous.width * SMOOTHING + next.width * (1 - SMOOTHING),
    height: previous.height * SMOOTHING + next.height * (1 - SMOOTHING)
  };
}

function clampRoi(roi: RoiRect, frameWidth: number, frameHeight: number): RoiRect {
  const x = Math.max(0, Math.min(frameWidth - 1, roi.x));
  const y = Math.max(0, Math.min(frameHeight - 1, roi.y));
  return {
    x,
    y,
    width: Math.max(1, Math.min(frameWidth - x, roi.width)),
    height: Math.max(1, Math.min(frameHeight - y, roi.height))
  };
}

function skinBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { x: number; y: number; width: number; height: number } | null {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let skinPixels = 0;
  for (let y = Math.round(height * 0.06); y < Math.round(height * 0.92); y += 1) {
    for (let x = Math.round(width * 0.08); x < Math.round(width * 0.92); x += 1) {
      const index = (y * width + x) * 4;
      const r = data[index]!;
      const g = data[index + 1]!;
      const b = data[index + 2]!;
      if (isSkinLike(r, g, b)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        skinPixels += 1;
      }
    }
  }

  const coverage = skinPixels / (width * height);
  if (coverage < 0.015 || maxX <= minX || maxY <= minY) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
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
