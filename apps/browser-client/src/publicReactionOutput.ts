import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import type { ReactionOutputRequest } from "@pulse-reaction/shared-schemas";
import { PulseTrendMonitor } from "@pulse-reaction/rppg-engine";
import { recordReactionOutput } from "./api.js";
import { FaceRoiTracker } from "./prototype/faceRoi.js";
import { PulseSampler, type RoiRect } from "./prototype/pulseSampler.js";
import { reactionOutputFromTrend } from "./reactionOutputMapper.js";

const PUBLIC_REACTION_UPLOAD_INTERVAL_MS = 3_000;

export interface PublicReactionOutputState {
  status: "disabled" | "collecting" | "uploaded" | "offline";
  state: ReactionOutputRequest["state"] | null;
  confidence: ReactionOutputRequest["confidence"] | null;
  bpmEstimate: number | null;
  qualityScore: number | null;
  reasonCodes: string[];
  roi: RoiRect | null;
}

export function usePublicReactionOutput(input: {
  active: boolean;
  localUserId: string;
  sessionId: string | undefined;
  videoRef: RefObject<HTMLVideoElement | null>;
}): PublicReactionOutputState {
  const samplerRef = useRef(new PulseSampler());
  const roiTrackerRef = useRef(new FaceRoiTracker());
  const trendMonitorRef = useRef(
    new PulseTrendMonitor({
      minBaselineSamples: 4,
      minBaselineSpanMs: 10_000,
      minAcceptedEstimateSpacingMs: 1_250,
      maxMotionForTrend: 0.65,
      maxIlluminationForTrend: 0.28,
      minSignalQualityForTrend: 0.22
    })
  );
  const uploadRef = useRef<{ lastAtMs: number; signature: string | null }>({ lastAtMs: 0, signature: null });
  const [state, setState] = useState<PublicReactionOutputState>({
    status: "disabled",
    state: null,
    confidence: null,
    bpmEstimate: null,
    qualityScore: null,
    reasonCodes: [],
    roi: null
  });

  useEffect(() => {
    if (!input.active) {
      samplerRef.current.reset();
      roiTrackerRef.current.reset();
      trendMonitorRef.current.reset();
      uploadRef.current = { lastAtMs: 0, signature: null };
      setState({ status: "disabled", state: null, confidence: null, bpmEstimate: null, qualityScore: null, reasonCodes: [], roi: null });
      return;
    }

    let cancelled = false;
    let animationId = 0;
    let lastSampleAt = 0;

    const loop = (timestampMs: number): void => {
      const video = input.videoRef.current;
      if (video && timestampMs - lastSampleAt >= 16) {
        lastSampleAt = timestampMs;
        void roiTrackerRef.current.locate(video, timestampMs).then(async (roi) => {
          if (cancelled) return;
          const snapshot = samplerRef.current.sample(video, roi.regions, timestampMs);
          if (!snapshot) {
            setState((current) => {
              if (current.status === "offline") return current;
              const next = { ...current, status: "collecting" as const, bpmEstimate: null, roi: roi.roi };
              return samePublicReactionState(current, next) ? current : next;
            });
            return;
          }
          const trend = trendMonitorRef.current.update(snapshot.estimate);
          const output = reactionOutputFromTrend({
            localUserId: input.localUserId,
            sessionId: input.sessionId,
            trend,
            methodVersion: snapshot.estimate.methodVersion,
            regionAgreement: snapshot.regionAgreement.stable
          });
          const signature = reactionOutputSignature(output);
          const shouldUpload = timestampMs - uploadRef.current.lastAtMs >= PUBLIC_REACTION_UPLOAD_INTERVAL_MS || signature !== uploadRef.current.signature;
          if (!shouldUpload) {
            setStateIfChanged(setState, reactionUiState("collecting", output, snapshot.estimate.bpm, roi.roi));
            return;
          }

          const uploaded = await recordReactionOutput(output);
          if (cancelled) return;
          if (uploaded) uploadRef.current = { lastAtMs: timestampMs, signature };
          setStateIfChanged(setState, reactionUiState(uploaded ? "uploaded" : "offline", output, snapshot.estimate.bpm, roi.roi));
        });
      }
      animationId = window.requestAnimationFrame(loop);
    };

    animationId = window.requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationId);
    };
  }, [input.active, input.localUserId, input.sessionId, input.videoRef]);

  return state;
}

function reactionUiState(
  status: PublicReactionOutputState["status"],
  output: ReactionOutputRequest,
  bpmEstimate: number | null,
  roi: RoiRect
): PublicReactionOutputState {
  return {
    status,
    state: output.state,
    confidence: output.confidence,
    bpmEstimate,
    qualityScore: output.qualityScore,
    reasonCodes: output.reasonCodes,
    roi
  };
}

function setStateIfChanged(
  setState: (updater: (current: PublicReactionOutputState) => PublicReactionOutputState) => void,
  next: PublicReactionOutputState
): void {
  setState((current) => (samePublicReactionState(current, next) ? current : next));
}

function samePublicReactionState(left: PublicReactionOutputState, right: PublicReactionOutputState): boolean {
  return (
    left.status === right.status &&
    left.state === right.state &&
    left.confidence === right.confidence &&
    sameBpmEstimate(left.bpmEstimate, right.bpmEstimate) &&
    left.qualityScore === right.qualityScore &&
    sameRoi(left.roi, right.roi) &&
    left.reasonCodes.length === right.reasonCodes.length &&
    left.reasonCodes.every((reason, index) => reason === right.reasonCodes[index])
  );
}

function sameBpmEstimate(left: number | null, right: number | null): boolean {
  if (left === null || right === null) return left === right;
  return Math.round(left) === Math.round(right);
}

function sameRoi(left: RoiRect | null, right: RoiRect | null): boolean {
  if (!left || !right) return left === right;
  return (
    Math.round(left.x) === Math.round(right.x) &&
    Math.round(left.y) === Math.round(right.y) &&
    Math.round(left.width) === Math.round(right.width) &&
    Math.round(left.height) === Math.round(right.height)
  );
}

function reactionOutputSignature(output: ReactionOutputRequest): string {
  return [output.state, output.confidence, Math.round(output.qualityScore * 10), output.regionAgreement, output.reasonCodes.join("|")].join(":");
}
