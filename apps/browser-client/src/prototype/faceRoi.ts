import type { PulseRoiRegion, RoiPoint, RoiRect } from "./pulseSampler.js";
import { MediapipeFaceRoiTracker } from "./mediapipeFaceRoi.js";

type RoiSource = "mediapipe" | "face" | "skin" | "fallback";

export interface FaceRoiResult {
  roi: RoiRect;
  regions: PulseRoiRegion[];
  source: RoiSource;
  detectorSupported: boolean;
  landmarkCount: number;
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

const DETECTION_INTERVAL_MS = 80;
const MEDIAPIPE_HOLD_MS = 3_000;
const SLOW_SMOOTHING = 0.58;
const FAST_SMOOTHING = 0.34;
const FAST_MOVE_RATIO = 0.18;
const MAX_FACE_JUMP_RATIO = 0.85;
const MAX_FACE_SIZE_RATIO = 1.75;
const MIN_FACE_SIZE_RATIO = 0.55;
const MAX_SKIN_FALLBACK_AREA_RATIO = 0.42;

export class FaceRoiTracker {
  private readonly mediapipe = new MediapipeFaceRoiTracker();
  private readonly detector: FaceDetectorLike | null = createDetector();
  private readonly canvas = document.createElement("canvas");
  private readonly context = this.canvas.getContext("2d", { willReadFrequently: true });
  private lastDetectionAt = 0;
  private lastMediapipeAt = 0;
  private lastMediapipeResult: FaceRoiResult | null = null;
  private lastResult: FaceRoiResult | null = null;
  private pending: Promise<FaceRoiResult> | null = null;

  async locate(video: HTMLVideoElement, timestampMs: number): Promise<FaceRoiResult> {
    if (video.videoWidth <= 0 || video.videoHeight <= 0) {
      return {
        ...fallbackGeometry(1, 1),
        source: "fallback",
        detectorSupported: this.detector !== null,
        landmarkCount: 0
      };
    }

    if (this.lastResult && timestampMs - this.lastDetectionAt < DETECTION_INTERVAL_MS) {
      return this.lastResult;
    }
    if (this.pending && this.lastResult) return this.lastResult;
    if (this.pending) return this.pending;

    this.lastDetectionAt = timestampMs;
    this.pending = this.detect(video).finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  reset(): void {
    this.mediapipe.reset();
    this.lastDetectionAt = 0;
    this.lastMediapipeAt = 0;
    this.lastMediapipeResult = null;
    this.lastResult = null;
    this.pending = null;
  }

  private async detect(video: HTMLVideoElement): Promise<FaceRoiResult> {
    const mediapipe = await this.mediapipe.locate(video, this.lastDetectionAt);
    if (mediapipe) {
      const previous = this.lastResult?.source === "mediapipe" ? this.lastResult : null;
      if (previous && !isPlausibleFaceTransition(previous.roi, mediapipe.roi)) {
        this.lastResult = previous;
        this.lastMediapipeAt = this.lastDetectionAt;
        this.lastMediapipeResult = previous;
        return this.lastResult;
      }
      const roi = previous ? smoothRoi(previous.roi, mediapipe.roi) : mediapipe.roi;
      const regions = previous ? smoothRegions(previous.regions, mediapipe.regions) : mediapipe.regions;
      this.lastResult = {
        roi,
        regions,
        source: "mediapipe",
        detectorSupported: this.detector !== null,
        landmarkCount: mediapipe.landmarkCount
      };
      this.lastMediapipeAt = this.lastDetectionAt;
      this.lastMediapipeResult = this.lastResult;
      return this.lastResult;
    }

    if (this.lastMediapipeResult && this.lastDetectionAt - this.lastMediapipeAt <= MEDIAPIPE_HOLD_MS) {
      this.lastResult = this.lastMediapipeResult;
      return this.lastResult;
    }

    if (!this.detector) {
      return this.skinOrFallback(video, false);
    }

    try {
      const faces = await this.detector.detect(video);
      const face = largestFace(faces);
      if (!face) {
        return this.skinOrFallback(video, true);
      }

      const next = faceToPulseRoi(face.boundingBox, video.videoWidth, video.videoHeight);
      const roi = this.lastResult?.source === "face" ? smoothRoi(this.lastResult.roi, next) : next;
      this.lastResult = {
        roi,
        regions: pulseRegionsFromFaceRoi(roi),
        source: "face",
        detectorSupported: true,
        landmarkCount: 0
      };
      return this.lastResult;
    } catch {
      return this.skinOrFallback(video, true);
    }
  }

  private skinOrFallback(video: HTMLVideoElement, detectorSupported: boolean): FaceRoiResult {
    if (this.lastMediapipeResult && this.lastDetectionAt - this.lastMediapipeAt <= MEDIAPIPE_HOLD_MS) {
      this.lastResult = this.lastMediapipeResult;
      return this.lastResult;
    }

    const skin = this.skinFallback(video);
    this.lastResult = {
      ...(skin ? geometryFromRoi(skin, "skin") : fallbackGeometry(video.videoWidth, video.videoHeight)),
      source: skin ? "skin" : "fallback",
      detectorSupported,
      landmarkCount: 0
    };
    return this.lastResult;
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
    const bounded = constrainSkinFallbackBounds(bounds, targetWidth, targetHeight);
    const paddingX = bounded.width * 0.16;
    const paddingY = bounded.height * 0.12;
    return clampRoi(
      {
        x: (bounded.x - paddingX) / scale,
        y: (bounded.y - paddingY) / scale,
        width: (bounded.width + paddingX * 2) / scale,
        height: (bounded.height + paddingY * 2) / scale
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

function constrainSkinFallbackBounds(
  bounds: { x: number; y: number; width: number; height: number },
  frameWidth: number,
  frameHeight: number
): RoiRect {
  const areaRatio = (bounds.width * bounds.height) / Math.max(1, frameWidth * frameHeight);
  if (areaRatio <= MAX_SKIN_FALLBACK_AREA_RATIO) {
    return bounds;
  }

  const width = frameWidth * 0.36;
  const height = frameHeight * 0.42;
  const centerX = bounds.x + bounds.width / 2;
  const upperCenterY = bounds.y + bounds.height * 0.34;
  return clampRoi(
    {
      x: centerX - width / 2,
      y: upperCenterY - height / 2,
      width,
      height
    },
    frameWidth,
    frameHeight
  );
}

function geometryFromRoi(roi: RoiRect, prefix: string): { roi: RoiRect; regions: PulseRoiRegion[] } {
  return {
    roi,
    regions: [
      {
        id: `${prefix}-forehead-left`,
        x: roi.x + roi.width * 0.2,
        y: roi.y + roi.height * 0.06,
        width: roi.width * 0.2,
        height: roi.height * 0.28
      },
      {
        id: `${prefix}-forehead-center`,
        x: roi.x + roi.width * 0.4,
        y: roi.y + roi.height * 0.06,
        width: roi.width * 0.2,
        height: roi.height * 0.28
      },
      {
        id: `${prefix}-forehead-right`,
        x: roi.x + roi.width * 0.6,
        y: roi.y + roi.height * 0.06,
        width: roi.width * 0.2,
        height: roi.height * 0.28
      },
      {
        id: `${prefix}-left-cheek-upper`,
        x: roi.x + roi.width * 0.08,
        y: roi.y + roi.height * 0.38,
        width: roi.width * 0.34,
        height: roi.height * 0.2
      },
      {
        id: `${prefix}-left-cheek-lower`,
        x: roi.x + roi.width * 0.08,
        y: roi.y + roi.height * 0.58,
        width: roi.width * 0.34,
        height: roi.height * 0.18
      },
      {
        id: `${prefix}-right-cheek-upper`,
        x: roi.x + roi.width * 0.58,
        y: roi.y + roi.height * 0.38,
        width: roi.width * 0.34,
        height: roi.height * 0.2
      },
      {
        id: `${prefix}-right-cheek-lower`,
        x: roi.x + roi.width * 0.58,
        y: roi.y + roi.height * 0.58,
        width: roi.width * 0.34,
        height: roi.height * 0.18
      }
    ]
  };
}

function pulseRegionsFromFaceRoi(roi: RoiRect): PulseRoiRegion[] {
  return [
    {
      id: "forehead-left",
      x: roi.x + roi.width * 0.22,
      y: roi.y + roi.height * 0.02,
      width: roi.width * 0.18,
      height: roi.height * 0.22
    },
    {
      id: "forehead-center",
      x: roi.x + roi.width * 0.41,
      y: roi.y + roi.height * 0.02,
      width: roi.width * 0.18,
      height: roi.height * 0.22
    },
    {
      id: "forehead-right",
      x: roi.x + roi.width * 0.6,
      y: roi.y + roi.height * 0.02,
      width: roi.width * 0.18,
      height: roi.height * 0.22
    },
    {
      id: "left-cheek-upper",
      x: roi.x + roi.width * 0.07,
      y: roi.y + roi.height * 0.42,
      width: roi.width * 0.32,
      height: roi.height * 0.18
    },
    {
      id: "left-cheek-lower",
      x: roi.x + roi.width * 0.07,
      y: roi.y + roi.height * 0.6,
      width: roi.width * 0.32,
      height: roi.height * 0.16
    },
    {
      id: "right-cheek-upper",
      x: roi.x + roi.width * 0.61,
      y: roi.y + roi.height * 0.42,
      width: roi.width * 0.32,
      height: roi.height * 0.18
    },
    {
      id: "right-cheek-lower",
      x: roi.x + roi.width * 0.61,
      y: roi.y + roi.height * 0.6,
      width: roi.width * 0.32,
      height: roi.height * 0.16
    }
  ];
}

function smoothRoi(previous: RoiRect, next: RoiRect): RoiRect {
  const smoothing = smoothingForTransition(previous, next);
  return {
    x: previous.x * smoothing + next.x * (1 - smoothing),
    y: previous.y * smoothing + next.y * (1 - smoothing),
    width: previous.width * smoothing + next.width * (1 - smoothing),
    height: previous.height * smoothing + next.height * (1 - smoothing)
  };
}

function smoothingForTransition(previous: RoiRect, next: RoiRect): number {
  const previousCenter = roiCenter(previous);
  const nextCenter = roiCenter(next);
  const centerDistance = Math.hypot(nextCenter.x - previousCenter.x, nextCenter.y - previousCenter.y);
  const previousScale = Math.max(previous.width, previous.height, 1);
  return centerDistance > previousScale * FAST_MOVE_RATIO ? FAST_SMOOTHING : SLOW_SMOOTHING;
}

function isPlausibleFaceTransition(previous: RoiRect, next: RoiRect): boolean {
  const previousCenter = roiCenter(previous);
  const nextCenter = roiCenter(next);
  const centerDistance = Math.hypot(nextCenter.x - previousCenter.x, nextCenter.y - previousCenter.y);
  const previousScale = Math.max(previous.width, previous.height, 1);
  const areaRatio = (next.width * next.height) / Math.max(1, previous.width * previous.height);
  return centerDistance <= previousScale * MAX_FACE_JUMP_RATIO && areaRatio >= MIN_FACE_SIZE_RATIO && areaRatio <= MAX_FACE_SIZE_RATIO;
}

function roiCenter(roi: RoiRect): { x: number; y: number } {
  return {
    x: roi.x + roi.width / 2,
    y: roi.y + roi.height / 2
  };
}

function smoothRegions(previous: readonly PulseRoiRegion[], next: readonly PulseRoiRegion[]): PulseRoiRegion[] {
  return next.map((region) => {
    const matching = previous.find((candidate) => candidate.id === region.id);
    if (!matching) return region;
    const polygon = smoothPolygon(matching.polygon, region.polygon);
    return polygon ? { ...region, ...smoothRoi(matching, region), polygon } : { ...region, ...smoothRoi(matching, region) };
  });
}

function smoothPolygon(previous: readonly RoiPoint[] | undefined, next: readonly RoiPoint[] | undefined): RoiPoint[] | undefined {
  if (!next) return undefined;
  if (!previous || previous.length !== next.length) return [...next];
  return next.map((point, index) => ({
    x: previous[index]!.x * SLOW_SMOOTHING + point.x * (1 - SLOW_SMOOTHING),
    y: previous[index]!.y * SLOW_SMOOTHING + point.y * (1 - SLOW_SMOOTHING)
  }));
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
