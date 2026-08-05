import {
  Activity,
  Bot,
  Camera,
  ChartNoAxesColumn,
  Download,
  Gauge,
  MessageCircle,
  Mic,
  Pause,
  Play,
  Send,
  ShieldCheck,
  Target,
  Trash2,
  Video
} from "lucide-react";
import type { CSSProperties, JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PulseTrendMonitor,
  type HeartRateDiagnostics,
  type HeartRateEstimate,
  type MethodEstimateDiagnostic,
  type PulseTrendEstimate,
  type PulseTrendState
} from "@pulse-reaction/rppg-engine";
import { FaceRoiTracker, type FaceRoiResult } from "./faceRoi.js";
import { PulseSampler, type PulseMethodSignal, type PulseRegionAgreement, type RoiRect } from "./pulseSampler.js";

const APP_NAME = import.meta.env.VITE_APP_NAME ?? "SynVibe";

interface ChatMessage {
  id: number;
  author: "you" | "bot";
  text: string;
}

const BOT_LINES = [
  "Signal check is live on your side.",
  "I can hold the room while you tune the camera.",
  "Try steady light and a still posture for a cleaner window.",
  "The chat flow is ready for a human peer later."
];

const DEBUG_LOG_STORAGE_KEY = "synvibe.debug.latestSession";
const DEBUG_LOG_MAX_EVENTS = 1_200;
const DEBUG_LOG_INTERVAL_MS = 1_000;

interface PulseSnapshot {
  sampleCount: number;
  sampleRateHz: number;
  skinCoverage: number;
  validPixelCount: number;
  validRegionCount: number;
  roi: FaceRoiResult;
  estimate: HeartRateEstimate;
  diagnostics: HeartRateDiagnostics;
  trend: PulseTrendEstimate;
  signals: PulseMethodSignal[];
  regionAgreement: PulseRegionAgreement;
}

interface PulseHistoryEntry {
  timestampMs: number;
  bpm: number;
  signalQuality: number;
}

type ReactionBadgeCode =
  | "STATIC"
  | "TUNING"
  | "STEADY"
  | "SOFT_LIFT"
  | "QUICK_LIFT"
  | "SURGE"
  | "PEAK"
  | "SETTLING"
  | "COOLDOWN";

interface ReactionBadgeModel {
  code: ReactionBadgeCode;
  symbol: string;
  title: string;
  intensity: 0 | 1 | 2 | 3;
}

interface DebugLogEvent {
  timestampMs: number;
  wallClockIso: string;
  eventType: "frame";
  cameraEnabled: boolean;
  analysisEnabled: boolean;
  video: {
    width: number;
    height: number;
  };
  roi: {
    source: FaceRoiResult["source"];
    detectorSupported: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    areaRatio: number;
    validRegionCount: number;
    regionCount: number;
    skinCoverage: number;
    validPixelCount: number;
    landmarkCount: number;
  };
  estimate: {
    bpm: number | null;
    confidence: HeartRateEstimate["confidence"];
    signalQuality: number;
    reasonCodes: string[];
    method: string;
    motionScore: number;
    illuminationInstability: number;
  };
  diagnostics: {
    selectedMethod: string;
    methodSpreadBpm: number | null;
    methodEstimates: Array<{
      method: string;
      bpm: number | null;
      signalQuality: number;
      reasonCodes: string[];
    }>;
  };
  regionAgreement: {
    validGroupCount: number;
    spreadBpm: number | null;
    stable: boolean | null;
    estimates: Array<{
      groupId: string;
      bpm: number | null;
      signalQuality: number;
      sampleCount: number;
      reasonCodes: string[];
    }>;
  };
  trend: {
    state: PulseTrendState;
    confidence: number;
    baselineBpm: number | null;
    baselineMaturity: number;
    deltaBpm: number | null;
    acceptedCount: number;
    baselineSpanMs: number;
  };
  badge: {
    code: ReactionBadgeCode;
    title: string;
    intensity: number;
  };
  sampling: {
    sampleCount: number;
    sampleRateHz: number;
  };
  calibration: {
    groundTruthBpm: number | null;
    selectedReferenceMethod: string | null;
    closestMethod: string | null;
    methodErrors: Array<{
      method: string;
      errorBpm: number | null;
    }>;
  };
}

interface DebugSessionLog {
  schemaVersion: "debug-session-log-0.1.1";
  sessionId: string;
  startedAtIso: string;
  updatedAtIso: string;
  eventCount: number;
  assumptions: string[];
  events: DebugLogEvent[];
}

interface CalibrationDebugState {
  groundTruthBpm: number | null;
  selectedReferenceMethod: string | null;
}

export function App(): JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const samplerRef = useRef(new PulseSampler());
  const roiTrackerRef = useRef(new FaceRoiTracker());
  const debugLogRef = useRef(createDebugSessionLog());
  const debugLogSignatureRef = useRef<string | null>(null);
  const lastDebugLogAtRef = useRef(0);
  const calibrationRef = useRef<CalibrationDebugState>({ groundTruthBpm: null, selectedReferenceMethod: null });
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
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [analysisEnabled, setAnalysisEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<PulseSnapshot | null>(null);
  const [pulseHistory, setPulseHistory] = useState<PulseHistoryEntry[]>([]);
  const [debugLogCount, setDebugLogCount] = useState(0);
  const [debugLogStatus, setDebugLogStatus] = useState("local session log");
  const [groundTruthInput, setGroundTruthInput] = useState("");
  const [selectedReferenceMethod, setSelectedReferenceMethod] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, author: "bot", text: "Room opened. I am the temporary test peer." }
  ]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    calibrationRef.current = {
      groundTruthBpm: parseGroundTruthBpm(groundTruthInput),
      selectedReferenceMethod
    };
  }, [groundTruthInput, selectedReferenceMethod]);

  useEffect(() => {
    if (!cameraEnabled) {
      stopCamera(videoRef.current);
      samplerRef.current.reset();
      roiTrackerRef.current.reset();
      trendMonitorRef.current.reset();
      setSnapshot(null);
      setPulseHistory([]);
      resetDebugLog(debugLogRef.current);
      setDebugLogCount(0);
      setDebugLogStatus("camera off; log reset");
      return;
    }

    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 60, max: 60 }
        },
        audio: false
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        setCameraError(null);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        setCameraError("Camera unavailable");
        setCameraEnabled(false);
      });

    return () => {
      cancelled = true;
      stopCamera(videoRef.current);
    };
  }, [cameraEnabled]);

  useEffect(() => {
    if (!analysisEnabled || !cameraEnabled) {
      samplerRef.current.reset();
      roiTrackerRef.current.reset();
      trendMonitorRef.current.reset();
      setSnapshot(null);
      setPulseHistory([]);
      setDebugLogStatus("analysis paused");
      return;
    }

    let animationId = 0;
    let lastSampleAt = 0;
    const loop = (timestamp: number): void => {
      const video = videoRef.current;
      if (video && timestamp - lastSampleAt >= 16) {
        lastSampleAt = timestamp;
        void roiTrackerRef.current.locate(video, timestamp).then((roi) => {
          const next = samplerRef.current.sample(video, roi.regions, timestamp);
          if (next) {
            const trend = trendMonitorRef.current.update(next.estimate);
            setSnapshot({
              ...next,
              roi,
              trend
            });
            recordDebugFrame(
              debugLogRef.current,
              {
                ...next,
                roi,
                trend
              },
              reactionBadgeForTrend(trend),
              video,
              calibrationRef.current,
              {
                cameraEnabled: true,
                analysisEnabled: true,
                lastSignature: debugLogSignatureRef.current,
                lastLoggedAt: lastDebugLogAtRef.current
              }
            );
            debugLogSignatureRef.current = latestDebugSignature(debugLogRef.current);
            lastDebugLogAtRef.current = latestDebugTimestamp(debugLogRef.current);
            setDebugLogCount(debugLogRef.current.eventCount);
            setDebugLogStatus(debugSummary(debugLogRef.current));
            const bpm = next.estimate.bpm;
            if (bpm !== null && next.estimate.confidence !== "invalid") {
              setPulseHistory((current) =>
                [
                  ...current,
                  {
                    timestampMs: next.estimate.timestampMs,
                    bpm,
                    signalQuality: next.estimate.signalQuality
                  }
                ].slice(-10)
              );
            }
          }
        });
      }
      animationId = window.requestAnimationFrame(loop);
    };
    animationId = window.requestAnimationFrame(loop);

    return () => window.cancelAnimationFrame(animationId);
  }, [analysisEnabled, cameraEnabled]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setMessages((current) =>
        [
          ...current,
          { id: Date.now(), author: "bot" as const, text: BOT_LINES[Math.floor(Date.now() / 7000) % BOT_LINES.length]! }
        ].slice(-8)
      );
    }, 14_000);
    return () => window.clearInterval(id);
  }, []);

  const estimate = snapshot?.estimate;
  const trend = snapshot?.trend;
  const diagnostics = snapshot?.diagnostics;
  const historyStats = useMemo(() => pulseHistoryStats(pulseHistory), [pulseHistory]);
  const groundTruthBpm = parseGroundTruthBpm(groundTruthInput);
  const methodComparisons = useMemo(
    () => methodComparisonRows(diagnostics?.methodEstimates ?? [], groundTruthBpm),
    [diagnostics?.methodEstimates, groundTruthBpm]
  );
  const closestMethod = methodComparisons.find((comparison) => comparison.isClosest)?.method ?? null;
  const reactionBadge = reactionBadgeForTrend(trend);
  const roiStyle = useMemo(() => roiOverlayStyle(videoRef.current, snapshot?.roi.roi), [cameraEnabled, snapshot?.sampleCount]);
  const readiness = estimate ? readinessLabel(estimate) : "warming";

  function sendMessage(): void {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setMessages((current) =>
      [
        ...current,
        { id: Date.now(), author: "you" as const, text },
        { id: Date.now() + 1, author: "bot" as const, text: "Received. Live peer matching will replace this test peer." }
      ].slice(-8)
    );
  }

  function downloadDebugLog(): void {
    const log = debugLogRef.current;
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `synvibe-debug-${log.sessionId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDebugLogStatus(`downloaded ${log.eventCount} events`);
  }

  function clearDebugLog(): void {
    resetDebugLog(debugLogRef.current);
    debugLogSignatureRef.current = null;
    lastDebugLogAtRef.current = 0;
    setDebugLogCount(0);
    setDebugLogStatus("log cleared");
  }

  return (
    <main className="appShell">
      <section className="topBar" aria-label="Session controls">
        <div className="brand">
          <Activity aria-hidden="true" />
          <span>{APP_NAME}</span>
        </div>
        <div className="toolbar">
          <button className="iconButton" type="button" onClick={() => setCameraEnabled((value) => !value)} title="Camera">
            {cameraEnabled ? <Video aria-hidden="true" /> : <Camera aria-hidden="true" />}
          </button>
          <button
            className="iconButton"
            type="button"
            onClick={() => setAnalysisEnabled((value) => !value)}
            disabled={!cameraEnabled}
            title="Local pulse analysis"
          >
            {analysisEnabled ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
          <div className="consentPill" title="Local analysis consent">
            <ShieldCheck aria-hidden="true" />
            <label>
              <input
                checked={analysisEnabled}
                disabled={!cameraEnabled}
                type="checkbox"
                onChange={(event) => setAnalysisEnabled(event.target.checked)}
              />
              Local analysis
            </label>
          </div>
        </div>
      </section>

      <section className="workspace">
        <div className="callGrid">
          <article className="videoPane localPane">
            <video ref={videoRef} autoPlay muted playsInline />
            <div className="roiBox" style={roiStyle} />
            {!cameraEnabled && (
              <div className="emptyState">
                <Camera aria-hidden="true" />
                <span>Camera off</span>
              </div>
            )}
            {cameraError && <div className="statusBadge danger">{cameraError}</div>}
            <ReactionBadge badge={reactionBadge} compact />
            <div className="videoLabel">You</div>
          </article>

          <article className="videoPane botPane">
            <div className="botStage">
              <div className="botAvatar">
                <Bot aria-hidden="true" />
              </div>
              <div className="botPulse" />
            </div>
            <div className="videoLabel">Test peer</div>
          </article>
        </div>

        <aside className="sidePanel">
          <section className="metricPanel" aria-label="Pulse trend">
            <div className="panelHeader">
              <Activity aria-hidden="true" />
              <span>Pulse trend</span>
            </div>
            <div className="badgePanel">
              <ReactionBadge badge={reactionBadge} />
              <div className="badgeMeta">
                <span>Reaction badge</span>
                <strong>{reactionBadge.code}</strong>
              </div>
            </div>
            <div className={`readiness ${readiness}`}>{readinessText(readiness)}</div>
            <div className={`bpmReadout ${estimate?.bpm === null || !estimate ? "empty" : ""}`}>
              {estimate?.bpm === null || !estimate ? "No signal" : Math.round(estimate.bpm)}
            </div>
            <div className="bpmUnit">BPM estimate, local only</div>
            <div className={`trendCard ${trendClass(trend)}`}>
              <div className="trendLabel">
                <Gauge aria-hidden="true" />
                <span>{trendText(trend)}</span>
              </div>
              <div className="trendGrid">
                <Metric label="Baseline" value={trend?.baselineBpm === null || !trend ? "--" : `${Math.round(trend.baselineBpm)}`} />
                <Metric label="Delta" value={trend?.deltaBpm === null || !trend ? "--" : formatDelta(trend.deltaBpm)} />
                <Metric label="Maturity" value={`${Math.round((trend?.baselineMaturity ?? 0) * 100)}%`} />
                <Metric label="FPS" value={snapshot ? `${Math.round(snapshot.sampleRateHz)}` : "--"} />
                <Metric label="Zones" value={snapshot ? `${snapshot.validRegionCount}/${snapshot.roi.regions.length}` : "--"} />
                <Metric label="Skin px" value={snapshot ? String(snapshot.validPixelCount) : "--"} />
                <Metric label="Accepted" value={trend ? `${trend.evidence.validEstimateCount}` : "--"} />
                <Metric label="Span" value={trend ? `${Math.round(trend.evidence.baselineSpanMs / 1000)}s` : "--"} />
              </div>
            </div>
            <div className="diagnosticPanel">
              <div className="diagnosticTitle">
                <ChartNoAxesColumn aria-hidden="true" />
                <span>Estimator diagnostics</span>
              </div>
              <div className="trendGrid">
                <Metric label="Median" value={historyStats.medianBpm === null ? "--" : `${Math.round(historyStats.medianBpm)}`} />
                <Metric label="Spread" value={historyStats.spreadBpm === null ? "--" : `${Math.round(historyStats.spreadBpm)}`} />
                <Metric label="Recent" value={`${pulseHistory.length}/10`} />
                <Metric label="Method spread" value={diagnostics?.methodSpreadBpm === null || !diagnostics ? "--" : `${Math.round(diagnostics.methodSpreadBpm)}`} />
              </div>
              <div className="historyStrip" aria-label="Recent BPM estimates">
                {pulseHistory.length === 0 ? (
                  <span className="historyEmpty">waiting</span>
                ) : (
                  pulseHistory.map((entry) => (
                    <span key={`${entry.timestampMs}-${entry.bpm}`} title={`Quality ${Math.round(entry.signalQuality * 100)}%`}>
                      {Math.round(entry.bpm)}
                    </span>
                  ))
                )}
              </div>
              <div className="methodRows">
                {(diagnostics?.methodEstimates ?? []).map((methodEstimate) => (
                  <div className="methodRow" key={methodEstimate.method}>
                    <span>{methodLabel(methodEstimate.method)}</span>
                    <strong>{methodEstimate.bpm === null ? "--" : Math.round(methodEstimate.bpm)}</strong>
                    <small>{methodStatusText(methodEstimate.signalQuality, methodEstimate.reasonCodes)}</small>
                  </div>
                ))}
                {!diagnostics?.methodEstimates.length && <div className="methodEmpty">method estimates pending</div>}
              </div>
              <div className="regionAgreement">
                <div className="regionAgreementHeader">
                  <span>Region groups</span>
                  <strong>{regionAgreementText(snapshot?.regionAgreement)}</strong>
                </div>
                <div className="methodRows">
                  {(snapshot?.regionAgreement.estimates ?? []).map((regionEstimate) => (
                    <div className="regionRow" key={regionEstimate.groupId}>
                      <span>{regionLabel(regionEstimate.groupId)}</span>
                      <strong>{regionEstimate.bpm === null ? "--" : Math.round(regionEstimate.bpm)}</strong>
                      <small>{methodStatusText(regionEstimate.signalQuality, regionEstimate.reasonCodes)}</small>
                    </div>
                  ))}
                  {!snapshot?.regionAgreement.estimates.length && <div className="methodEmpty">region estimates pending</div>}
                </div>
              </div>
              <div className="selectionReason">{selectionReasonText(diagnostics)}</div>
            </div>
            <div className="oscilloscopePanel">
              <div className="diagnosticTitle">
                <Target aria-hidden="true" />
                <span>Ground truth check</span>
              </div>
              <div className="groundTruthControls">
                <label>
                  <span>Reference BPM</span>
                  <input
                    value={groundTruthInput}
                    inputMode="numeric"
                    type="number"
                    min="35"
                    max="220"
                    placeholder="75"
                    onChange={(event) => setGroundTruthInput(event.target.value)}
                  />
                </label>
                <button
                  className="textButton"
                  type="button"
                  onClick={() => {
                    setGroundTruthInput("");
                    setSelectedReferenceMethod(null);
                  }}
                >
                  Clear
                </button>
              </div>
              <div className="methodScopes" aria-label="Method signal previews">
                {(["GREEN", "CHROM", "POS"] as const).map((method) => {
                  const signal = snapshot?.signals.find((entry) => entry.method === method);
                  const comparison = methodComparisons.find((entry) => entry.method === method);
                  return (
                    <MethodScope
                      key={method}
                      method={method}
                      signal={signal}
                      comparison={comparison}
                      selected={selectedReferenceMethod === method}
                      closest={closestMethod === method}
                      onSelect={() => setSelectedReferenceMethod(method)}
                    />
                  );
                })}
              </div>
              <div className="selectionReason">
                {groundTruthBpm === null
                  ? "Enter a pulse oximeter or watch BPM to compare methods."
                  : closestMethod
                    ? `${closestMethod} is closest to the current reference; manual selection is ${selectedReferenceMethod ?? "not set"}.`
                    : "Waiting for valid method candidates."}
              </div>
            </div>
            <div className="meterRows">
              <Meter label="Quality" value={estimate?.signalQuality ?? 0} />
              <Meter label="Skin" value={snapshot?.skinCoverage ?? 0} />
              <Meter label="Motion" value={estimate?.motionScore ?? 0} invert />
              <Meter label="Light drift" value={estimate?.illuminationInstability ?? 0} invert />
            </div>
            <div className="roiSource">
              {roiSourceText(snapshot?.roi)}
            </div>
            <div className="reasonList">
              {(estimate?.reasonCodes.length ? estimate.reasonCodes : ["collecting_window"]).map((reason) => (
                <span key={reason}>{reason}</span>
              ))}
            </div>
            <div className="debugLogPanel">
              <div>
                <span>Session log</span>
                <strong>{debugLogCount} events</strong>
                <small>{debugLogStatus}</small>
              </div>
              <div className="debugLogActions">
                <button className="iconButton small" type="button" onClick={downloadDebugLog} title="Download debug log">
                  <Download aria-hidden="true" />
                </button>
                <button className="iconButton small" type="button" onClick={clearDebugLog} title="Clear debug log">
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>

          <section className="chatPanel" aria-label="Chat">
            <div className="panelHeader">
              <MessageCircle aria-hidden="true" />
              <span>Chat</span>
            </div>
            <div className="messages">
              {messages.map((message) => (
                <div className={`message ${message.author}`} key={message.id}>
                  {message.text}
                </div>
              ))}
            </div>
            <div className="composer">
              <button className="iconButton small" type="button" title="Microphone disabled">
                <Mic aria-hidden="true" />
              </button>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendMessage();
                }}
                placeholder="Message"
              />
              <button className="iconButton small primary" type="button" onClick={sendMessage} title="Send">
                <Send aria-hidden="true" />
              </button>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function createDebugSessionLog(): DebugSessionLog {
  const nowIso = new Date().toISOString();
  return {
    schemaVersion: "debug-session-log-0.1.1",
    sessionId: `${nowIso.replaceAll(/[:.]/g, "-")}-${Math.random().toString(16).slice(2, 8)}`,
    startedAtIso: nowIso,
    updatedAtIso: nowIso,
    eventCount: 0,
    assumptions: [
      "Debug log is generated locally in the browser.",
      "Raw video frames and RGB traces are not included.",
      "Live method waveforms are rendered transiently and are not persisted in the debug log.",
      "Region-group diagnostics are aggregated BPM/quality summaries; per-frame region traces are not persisted.",
      "Manual reference BPM is optional user-provided ground truth for local estimator debugging.",
      "Precise participant identity is not included.",
      "Events are for signal-quality debugging, not emotion or attraction inference."
    ],
    events: []
  };
}

function resetDebugLog(log: DebugSessionLog): void {
  const next = createDebugSessionLog();
  log.sessionId = next.sessionId;
  log.startedAtIso = next.startedAtIso;
  log.updatedAtIso = next.updatedAtIso;
  log.eventCount = 0;
  log.events = [];
  persistDebugLog(log);
}

function recordDebugFrame(
  log: DebugSessionLog,
  snapshot: PulseSnapshot,
  badge: ReactionBadgeModel,
  video: HTMLVideoElement,
  calibration: CalibrationDebugState,
  state: {
    cameraEnabled: boolean;
    analysisEnabled: boolean;
    lastSignature: string | null;
    lastLoggedAt: number;
  }
): void {
  const event = debugEventFromSnapshot(snapshot, badge, video, calibration, state.cameraEnabled, state.analysisEnabled);
  const signature = debugEventSignature(event);
  const shouldRecord = event.timestampMs - state.lastLoggedAt >= DEBUG_LOG_INTERVAL_MS || signature !== state.lastSignature;
  if (!shouldRecord) return;

  log.events.push(event);
  while (log.events.length > DEBUG_LOG_MAX_EVENTS) {
    log.events.shift();
  }
  log.eventCount = log.events.length;
  log.updatedAtIso = event.wallClockIso;
  persistDebugLog(log);
}

function debugEventFromSnapshot(
  snapshot: PulseSnapshot,
  badge: ReactionBadgeModel,
  video: HTMLVideoElement,
  calibration: CalibrationDebugState,
  cameraEnabled: boolean,
  analysisEnabled: boolean
): DebugLogEvent {
  const roi = snapshot.roi.roi;
  const frameArea = Math.max(1, video.videoWidth * video.videoHeight);
  const comparisons = methodComparisonRows(snapshot.diagnostics.methodEstimates, calibration.groundTruthBpm);
  return {
    timestampMs: snapshot.estimate.timestampMs,
    wallClockIso: new Date().toISOString(),
    eventType: "frame",
    cameraEnabled,
    analysisEnabled,
    video: {
      width: video.videoWidth,
      height: video.videoHeight
    },
    roi: {
      source: snapshot.roi.source,
      detectorSupported: snapshot.roi.detectorSupported,
      x: roundForLog(roi.x),
      y: roundForLog(roi.y),
      width: roundForLog(roi.width),
      height: roundForLog(roi.height),
      areaRatio: roundForLog((roi.width * roi.height) / frameArea),
      validRegionCount: snapshot.validRegionCount,
      regionCount: snapshot.roi.regions.length,
      skinCoverage: roundForLog(snapshot.skinCoverage),
      validPixelCount: snapshot.validPixelCount,
      landmarkCount: snapshot.roi.landmarkCount
    },
    estimate: {
      bpm: snapshot.estimate.bpm,
      confidence: snapshot.estimate.confidence,
      signalQuality: snapshot.estimate.signalQuality,
      reasonCodes: snapshot.estimate.reasonCodes,
      method: snapshot.estimate.method,
      motionScore: snapshot.estimate.motionScore,
      illuminationInstability: snapshot.estimate.illuminationInstability
    },
    diagnostics: {
      selectedMethod: snapshot.diagnostics.selectedMethod,
      methodSpreadBpm: snapshot.diagnostics.methodSpreadBpm,
      methodEstimates: snapshot.diagnostics.methodEstimates.map((estimate) => ({
        method: estimate.method,
        bpm: estimate.bpm,
        signalQuality: estimate.signalQuality,
        reasonCodes: estimate.reasonCodes
      }))
    },
    regionAgreement: {
      validGroupCount: snapshot.regionAgreement.validGroupCount,
      spreadBpm: snapshot.regionAgreement.spreadBpm,
      stable: snapshot.regionAgreement.stable,
      estimates: snapshot.regionAgreement.estimates.map((estimate) => ({
        groupId: estimate.groupId,
        bpm: estimate.bpm,
        signalQuality: estimate.signalQuality,
        sampleCount: estimate.sampleCount,
        reasonCodes: estimate.reasonCodes
      }))
    },
    trend: {
      state: snapshot.trend.state,
      confidence: snapshot.trend.confidence,
      baselineBpm: snapshot.trend.baselineBpm,
      baselineMaturity: snapshot.trend.baselineMaturity,
      deltaBpm: snapshot.trend.deltaBpm,
      acceptedCount: snapshot.trend.evidence.validEstimateCount,
      baselineSpanMs: snapshot.trend.evidence.baselineSpanMs
    },
    badge: {
      code: badge.code,
      title: badge.title,
      intensity: badge.intensity
    },
    sampling: {
      sampleCount: snapshot.sampleCount,
      sampleRateHz: roundForLog(snapshot.sampleRateHz)
    },
    calibration: {
      groundTruthBpm: calibration.groundTruthBpm,
      selectedReferenceMethod: calibration.selectedReferenceMethod,
      closestMethod: comparisons.find((comparison) => comparison.isClosest)?.method ?? null,
      methodErrors: comparisons.map((comparison) => ({
        method: comparison.method,
        errorBpm: comparison.errorBpm === null ? null : roundForLog(comparison.errorBpm)
      }))
    }
  };
}

function debugEventSignature(event: DebugLogEvent): string {
  return [
    event.roi.source,
    Math.round(event.roi.areaRatio * 100),
    event.estimate.confidence,
    event.estimate.reasonCodes.join("|"),
    event.badge.code
  ].join(":");
}

function latestDebugSignature(log: DebugSessionLog): string | null {
  const event = log.events.at(-1);
  return event ? debugEventSignature(event) : null;
}

function latestDebugTimestamp(log: DebugSessionLog): number {
  return log.events.at(-1)?.timestampMs ?? 0;
}

function debugSummary(log: DebugSessionLog): string {
  const event = log.events.at(-1);
  if (!event) return "waiting for frames";
  const reason = event.estimate.reasonCodes[0] ?? "valid";
  const landmarks = event.roi.landmarkCount > 0 ? `, ${event.roi.landmarkCount} landmarks` : "";
  return `${event.roi.source} roi${landmarks}, ${reason}, fps ${Math.round(event.sampling.sampleRateHz)}`;
}

function persistDebugLog(log: DebugSessionLog): void {
  try {
    window.localStorage.setItem(DEBUG_LOG_STORAGE_KEY, JSON.stringify(log));
  } catch {
    // Local debug logging should never break sampling.
  }
}

function roundForLog(value: number): number {
  return Math.round(value * 1000) / 1000;
}

interface MethodComparisonRow {
  method: MethodEstimateDiagnostic["method"];
  bpm: number | null;
  errorBpm: number | null;
  isClosest: boolean;
}

function parseGroundTruthBpm(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 35 || parsed > 220) return null;
  return parsed;
}

function methodComparisonRows(
  estimates: readonly MethodEstimateDiagnostic[],
  groundTruthBpm: number | null
): MethodComparisonRow[] {
  const rows = estimates.map((estimate) => ({
    method: estimate.method,
    bpm: estimate.bpm,
    errorBpm: groundTruthBpm === null || estimate.bpm === null ? null : Math.abs(estimate.bpm - groundTruthBpm),
    isClosest: false
  }));
  const validRows = rows.filter((row) => row.errorBpm !== null);
  const closestError = validRows.length === 0 ? null : Math.min(...validRows.map((row) => row.errorBpm ?? Number.POSITIVE_INFINITY));
  return rows.map((row) => ({
    ...row,
    isClosest: closestError !== null && row.errorBpm === closestError
  }));
}

function MethodScope({
  method,
  signal,
  comparison,
  selected,
  closest,
  onSelect
}: {
  method: PulseMethodSignal["method"];
  signal: PulseMethodSignal | undefined;
  comparison: MethodComparisonRow | undefined;
  selected: boolean;
  closest: boolean;
  onSelect: () => void;
}): JSX.Element {
  const points = signal?.points ?? [];
  const path = sparklinePath(points, 184, 42);
  return (
    <button
      className={`scopeButton ${method.toLowerCase()} ${selected ? "selected" : ""} ${closest ? "closest" : ""}`}
      type="button"
      onClick={onSelect}
      title={`Use ${method} as manual closest method`}
    >
      <div className="scopeMeta">
        <span>{method}</span>
        <strong>{comparison?.bpm === null || !comparison ? "--" : Math.round(comparison.bpm)}</strong>
        <small>{comparison?.errorBpm === null || !comparison ? "delta --" : `delta ${Math.round(comparison.errorBpm)}`}</small>
      </div>
      <svg className="scopeGraph" viewBox="0 0 184 42" role="img" aria-label={`${method} waveform preview`}>
        <line x1="0" y1="21" x2="184" y2="21" />
        {path ? <path d={path} /> : <text x="92" y="25">waiting</text>}
      </svg>
    </button>
  );
}

function sparklinePath(points: readonly number[], width: number, height: number): string {
  if (points.length < 2) return "";
  return points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height / 2 - Math.max(-1, Math.min(1, value)) * (height * 0.42);
      return `${index === 0 ? "M" : "L"} ${roundForLog(x)} ${roundForLog(y)}`;
    })
    .join(" ");
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="miniMetric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ReactionBadge({ badge, compact = false }: { badge: ReactionBadgeModel; compact?: boolean }): JSX.Element {
  return (
    <div
      className={`reactionBadge ${compact ? "compact" : ""} ${badge.code.toLowerCase()}`}
      title={badge.title}
      aria-label={badge.title}
    >
      <span className="badgeSymbol">{badge.symbol}</span>
      <span className="badgeDots" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <span className={index < badge.intensity ? "on" : ""} key={index} />
        ))}
      </span>
    </div>
  );
}

function reactionBadgeForTrend(trend: PulseTrendEstimate | undefined): ReactionBadgeModel {
  const state = trend?.state ?? "CALIBRATING_BASELINE";
  const delta = trend?.deltaBpm ?? 0;
  const slope = trend?.slopeBpmPerSecond ?? 0;
  const badgeByState: Record<PulseTrendState, ReactionBadgeModel> = {
    INSUFFICIENT_SIGNAL: {
      code: "STATIC",
      symbol: "--",
      title: "Signal unavailable",
      intensity: 0
    },
    CALIBRATING_BASELINE: {
      code: "TUNING",
      symbol: "...",
      title: "Tuning signal",
      intensity: 1
    },
    NEAR_BASELINE: {
      code: delta < -2 ? "COOLDOWN" : "STEADY",
      symbol: "O",
      title: delta < -2 ? "Pulse easing down" : "Steady pulse pattern",
      intensity: 1
    },
    POSSIBLE_ACTIVATION: {
      code: slope > 0.8 ? "QUICK_LIFT" : "SOFT_LIFT",
      symbol: slope > 0.8 ? "++" : "o+",
      title: slope > 0.8 ? "Quick pulse lift" : "Soft pulse lift",
      intensity: 2
    },
    HIGH_ACTIVATION: {
      code: delta >= 20 ? "PEAK" : "SURGE",
      symbol: delta >= 20 ? "**" : "^",
      title: delta >= 20 ? "Pulse peak" : "Pulse surge",
      intensity: 3
    },
    RECOVERY: {
      code: slope < -0.8 ? "COOLDOWN" : "SETTLING",
      symbol: slope < -0.8 ? "v" : "~",
      title: slope < -0.8 ? "Pulse cooling down" : "Pulse settling",
      intensity: 1
    }
  };
  return badgeByState[state];
}

function pulseHistoryStats(history: readonly PulseHistoryEntry[]): { medianBpm: number | null; spreadBpm: number | null } {
  if (history.length === 0) return { medianBpm: null, spreadBpm: null };
  const sorted = history.map((entry) => entry.bpm).sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  const medianBpm = sorted.length % 2 === 0 ? (sorted[midpoint - 1]! + sorted[midpoint]!) / 2 : sorted[midpoint]!;
  return {
    medianBpm,
    spreadBpm: sorted[sorted.length - 1]! - sorted[0]!
  };
}

function methodStatusText(signalQuality: number, reasonCodes: readonly string[]): string {
  if (reasonCodes.length > 0) return reasonCodes[0]!;
  return `q ${Math.round(signalQuality * 100)}%`;
}

function methodLabel(method: string): string {
  return method === "PEAK_INTERVAL" ? "PEAK" : method;
}

function regionAgreementText(agreement: PulseRegionAgreement | undefined): string {
  if (!agreement || agreement.stable === null) return "waiting";
  const spread = agreement.spreadBpm === null ? "--" : `${Math.round(agreement.spreadBpm)}`;
  return agreement.stable ? `${agreement.validGroupCount}/3 stable, spread ${spread}` : `${agreement.validGroupCount}/3 disagree, spread ${spread}`;
}

function regionLabel(groupId: string): string {
  if (groupId === "left-cheek") return "L cheek";
  if (groupId === "right-cheek") return "R cheek";
  return "Forehead";
}

function selectionReasonText(diagnostics: HeartRateDiagnostics | undefined): string {
  if (!diagnostics) return "Selection pending until the first valid analysis window.";
  if (diagnostics.estimate.bpm !== null) {
    const spread = diagnostics.methodSpreadBpm === null ? "n/a" : `${Math.round(diagnostics.methodSpreadBpm)} BPM`;
    return `${diagnostics.selectedMethod} selected from agreeing methods; spread ${spread}.`;
  }
  if (diagnostics.estimate.reasonCodes.length === 0) return "No method selected yet.";
  return `No BPM selected: ${diagnostics.estimate.reasonCodes.join(", ")}.`;
}

function Meter({ label, value, invert = false }: { label: string; value: number; invert?: boolean }): JSX.Element {
  const normalized = Math.max(0, Math.min(1, invert ? 1 - value : value));
  return (
    <div className="meter">
      <div className="meterLabel">
        <span>{label}</span>
        <span>{Math.round(normalized * 100)}%</span>
      </div>
      <div className="meterTrack">
        <div style={{ width: `${normalized * 100}%` }} />
      </div>
    </div>
  );
}

function roiOverlayStyle(video: HTMLVideoElement | null, roi: RoiRect | undefined): CSSProperties {
  if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
    return { opacity: 0 };
  }
  if (!roi) return { opacity: 0 };
  const mirroredX = video.videoWidth - roi.x - roi.width;
  return {
    left: `${(mirroredX / video.videoWidth) * 100}%`,
    top: `${(roi.y / video.videoHeight) * 100}%`,
    width: `${(roi.width / video.videoWidth) * 100}%`,
    height: `${(roi.height / video.videoHeight) * 100}%`,
    opacity: 1
  };
}

function readinessLabel(estimate: HeartRateEstimate): "good" | "warming" | "blocked" {
  if (estimate.confidence === "invalid") return "blocked";
  if (estimate.confidence === "high" || estimate.confidence === "medium") return "good";
  return "warming";
}

function roiSourceText(roi: FaceRoiResult | undefined): string {
  if (!roi) return "ROI waiting";
  if (roi.source === "mediapipe") return `MediaPipe landmarks (${roi.landmarkCount})`;
  if (roi.source === "face") return "Face skin ROI";
  if (roi.source === "skin") return roi.detectorSupported ? "Skin ROI, face not found" : "Skin ROI fallback";
  return roi.detectorSupported ? "Center ROI, face not found" : "Center ROI fallback";
}

function readinessText(readiness: "good" | "warming" | "blocked"): string {
  if (readiness === "good") return "usable signal";
  if (readiness === "blocked") return "insufficient signal";
  return "collecting window";
}

function trendText(trend: PulseTrendEstimate | undefined): string {
  if (!trend) return "calibrating baseline";
  if (trend.state === "INSUFFICIENT_SIGNAL") return "insufficient signal";
  if (trend.state === "CALIBRATING_BASELINE") return "calibrating baseline";
  if (trend.state === "POSSIBLE_ACTIVATION") return "possible activation";
  if (trend.state === "HIGH_ACTIVATION") return "higher activation";
  if (trend.state === "RECOVERY") return "recovery toward baseline";
  return "near baseline";
}

function trendClass(trend: PulseTrendEstimate | undefined): string {
  if (!trend || trend.state === "CALIBRATING_BASELINE") return "warming";
  if (trend.state === "INSUFFICIENT_SIGNAL") return "blocked";
  if (trend.state === "POSSIBLE_ACTIVATION" || trend.state === "HIGH_ACTIVATION") return "active";
  return "stable";
}

function formatDelta(deltaBpm: number): string {
  const rounded = Math.round(deltaBpm);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function stopCamera(video: HTMLVideoElement | null): void {
  const stream = video?.srcObject;
  if (stream instanceof MediaStream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  if (video) {
    video.srcObject = null;
  }
}
