import {
  Activity,
  Bot,
  Camera,
  MessageCircle,
  Mic,
  Pause,
  Play,
  Send,
  ShieldCheck,
  Video
} from "lucide-react";
import type { CSSProperties, JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HeartRateEstimate } from "@pulse-reaction/rppg-engine";
import { PulseSampler, type RoiRect } from "./pulseSampler.js";

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

export function App(): JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const samplerRef = useRef(new PulseSampler());
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [analysisEnabled, setAnalysisEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<{ sampleCount: number; estimate: HeartRateEstimate } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, author: "bot", text: "Room opened. I am the temporary test peer." }
  ]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!cameraEnabled) {
      stopCamera(videoRef.current);
      samplerRef.current.reset();
      setSnapshot(null);
      return;
    }

    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
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
      setSnapshot(null);
      return;
    }

    const id = window.setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      const roi = centerRoi(video.videoWidth, video.videoHeight);
      const next = samplerRef.current.sample(video, roi);
      if (next) setSnapshot(next);
    }, 200);

    return () => window.clearInterval(id);
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
  const roiStyle = useMemo(() => roiOverlayStyle(videoRef.current), [cameraEnabled, snapshot?.sampleCount]);
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
            <div className={`readiness ${readiness}`}>{readinessText(readiness)}</div>
            <div className="bpmReadout">{estimate?.bpm === null || !estimate ? "--" : Math.round(estimate.bpm)}</div>
            <div className="bpmUnit">BPM estimate, local only</div>
            <div className="meterRows">
              <Meter label="Quality" value={estimate?.signalQuality ?? 0} />
              <Meter label="ROI" value={estimate?.roiCoverage ?? 0} />
              <Meter label="Motion" value={estimate?.motionScore ?? 0} invert />
              <Meter label="Light drift" value={estimate?.illuminationInstability ?? 0} invert />
            </div>
            <div className="reasonList">
              {(estimate?.reasonCodes.length ? estimate.reasonCodes : ["collecting_window"]).map((reason) => (
                <span key={reason}>{reason}</span>
              ))}
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

function centerRoi(videoWidth: number, videoHeight: number): RoiRect {
  const width = Math.max(1, videoWidth * 0.28);
  const height = Math.max(1, videoHeight * 0.28);
  return {
    x: (videoWidth - width) / 2,
    y: videoHeight * 0.22,
    width,
    height
  };
}

function roiOverlayStyle(video: HTMLVideoElement | null): CSSProperties {
  if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
    return { opacity: 0 };
  }
  const roi = centerRoi(video.videoWidth, video.videoHeight);
  return {
    left: `${(roi.x / video.videoWidth) * 100}%`,
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

function readinessText(readiness: "good" | "warming" | "blocked"): string {
  if (readiness === "good") return "usable signal";
  if (readiness === "blocked") return "insufficient signal";
  return "collecting window";
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
