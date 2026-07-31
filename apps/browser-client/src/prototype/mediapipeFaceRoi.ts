import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { PulseRoiRegion, RoiRect } from "./pulseSampler.js";

export interface MediapipeFaceRoiResult {
  roi: RoiRect;
  regions: PulseRoiRegion[];
  landmarkCount: number;
}

const MODEL_ASSET_PATH = "/vendor/mediapipe/face_landmarker.task";
const WASM_BASE_PATH = "/vendor/mediapipe";
const LEFT_CHEEK = [36, 205, 206, 207, 187, 123, 116, 117, 118, 119, 100, 47];
const RIGHT_CHEEK = [266, 425, 426, 427, 411, 352, 345, 346, 347, 348, 329, 277];
const FOREHEAD_ANCHORS = [10, 67, 69, 104, 108, 151, 299, 333, 337, 338];

export class MediapipeFaceRoiTracker {
  private landmarkerPromise: Promise<FaceLandmarker | null> | null = null;

  async locate(video: HTMLVideoElement, timestampMs: number): Promise<MediapipeFaceRoiResult | null> {
    const landmarker = await this.landmarker();
    if (!landmarker) return null;
    const result = landmarker.detectForVideo(video, timestampMs);
    const landmarks = result.faceLandmarks[0];
    if (!landmarks || landmarks.length === 0) return null;
    return faceRoiFromLandmarks(landmarks, video.videoWidth, video.videoHeight);
  }

  reset(): void {
    // The MediaPipe instance is retained across camera pauses to avoid reloading the model.
  }

  private async landmarker(): Promise<FaceLandmarker | null> {
    if (!this.landmarkerPromise) {
      this.landmarkerPromise = this.createLandmarker();
    }
    return this.landmarkerPromise;
  }

  private async createLandmarker(): Promise<FaceLandmarker | null> {
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE_PATH);
      return await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_PATH,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.55,
        minFacePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false
      });
    } catch {
      return null;
    }
  }
}

function faceRoiFromLandmarks(landmarks: readonly NormalizedLandmark[], frameWidth: number, frameHeight: number): MediapipeFaceRoiResult {
  const visibleLandmarks = landmarks.filter(isUsableLandmark);
  const faceBox = expandRoi(boundingRect(visibleLandmarks, frameWidth, frameHeight), frameWidth, frameHeight, 0.04);
  const leftCheek = regionFromLandmarks("left-cheek", landmarks, LEFT_CHEEK, frameWidth, frameHeight, 0.24);
  const rightCheek = regionFromLandmarks("right-cheek", landmarks, RIGHT_CHEEK, frameWidth, frameHeight, 0.24);
  const forehead = foreheadRegion(landmarks, faceBox, frameWidth, frameHeight);
  return {
    roi: faceBox,
    regions: [forehead, leftCheek, rightCheek],
    landmarkCount: landmarks.length
  };
}

function regionFromLandmarks(
  id: string,
  landmarks: readonly NormalizedLandmark[],
  indices: readonly number[],
  frameWidth: number,
  frameHeight: number,
  paddingRatio: number
): PulseRoiRegion {
  const points = indices
    .map((index) => landmarks[index])
    .filter((landmark): landmark is NormalizedLandmark => landmark !== undefined && isUsableLandmark(landmark));
  const rect = boundingRect(points, frameWidth, frameHeight);
  const paddingX = rect.width * paddingRatio;
  const paddingY = rect.height * paddingRatio;
  return {
    id,
    ...clampRoi(
      {
        x: rect.x - paddingX,
        y: rect.y - paddingY,
        width: rect.width + paddingX * 2,
        height: rect.height + paddingY * 2
      },
      frameWidth,
      frameHeight
    )
  };
}

function foreheadRegion(
  landmarks: readonly NormalizedLandmark[],
  faceBox: RoiRect,
  frameWidth: number,
  frameHeight: number
): PulseRoiRegion {
  const anchorBox = regionFromLandmarks("forehead", landmarks, FOREHEAD_ANCHORS, frameWidth, frameHeight, 0.12);
  const width = Math.max(anchorBox.width, faceBox.width * 0.34);
  const height = Math.max(anchorBox.height, faceBox.height * 0.14);
  return {
    id: "forehead",
    ...clampRoi(
      {
        x: faceBox.x + faceBox.width * 0.33,
        y: Math.max(0, anchorBox.y - faceBox.height * 0.08),
        width,
        height
      },
      frameWidth,
      frameHeight
    )
  };
}

function boundingRect(landmarks: readonly NormalizedLandmark[], frameWidth: number, frameHeight: number): RoiRect {
  if (landmarks.length === 0) {
    return clampRoi({ x: frameWidth * 0.35, y: frameHeight * 0.16, width: frameWidth * 0.3, height: frameHeight * 0.42 }, frameWidth, frameHeight);
  }

  let minX = frameWidth;
  let minY = frameHeight;
  let maxX = 0;
  let maxY = 0;
  for (const landmark of landmarks) {
    const x = landmark.x * frameWidth;
    const y = landmark.y * frameHeight;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return clampRoi({ x: minX, y: minY, width: maxX - minX, height: maxY - minY }, frameWidth, frameHeight);
}

function expandRoi(roi: RoiRect, frameWidth: number, frameHeight: number, paddingRatio: number): RoiRect {
  const paddingX = roi.width * paddingRatio;
  const paddingY = roi.height * paddingRatio;
  return clampRoi(
    {
      x: roi.x - paddingX,
      y: roi.y - paddingY,
      width: roi.width + paddingX * 2,
      height: roi.height + paddingY * 2
    },
    frameWidth,
    frameHeight
  );
}

function isUsableLandmark(landmark: NormalizedLandmark): boolean {
  const visibility = landmark.visibility ?? 1;
  return landmark.x >= -0.05 && landmark.x <= 1.05 && landmark.y >= -0.05 && landmark.y <= 1.05 && visibility >= 0.5;
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
