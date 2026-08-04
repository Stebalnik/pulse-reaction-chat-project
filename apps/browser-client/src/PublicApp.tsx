import { Activity, Camera, CircleUserRound, HeartPulse, Play, ShieldCheck, UserPlus, Video } from "lucide-react";
import type { JSX, MutableRefObject, RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MatchmakingStatus, WebRtcSignalMessage } from "@pulse-reaction/shared-schemas";
import {
  createServerSession,
  endServerSession,
  ensureAnonymousUser,
  joinMatchmaking,
  leaveMatchmaking,
  loadMatchmakingStatus,
  loadSignals,
  recordConsentEvent,
  recordEvent,
  recordModerationReport,
  saveServerProfile,
  sendSignal
} from "./api.js";
import { getOrCreateAnonymousUserId, loadLocalProfile, saveLocalProfile, type LocalProfile } from "./identity.js";

const APP_NAME = import.meta.env.VITE_APP_NAME ?? "SynVibe";
const SHOW_ADMIN_LINK = import.meta.env.VITE_SHOW_ADMIN_LINK === "true";
const ADULT_CHAT_CONSENT_KEY = "synvibe.consent.adultChatTerms.v1";
const ADULT_CHAT_POLICY_VERSION = "adult-chat-terms-2026-08-04";

export function PublicApp(): JSX.Element {
  const userId = useMemo(() => getOrCreateAnonymousUserId(), []);
  const [profile, setProfile] = useState<LocalProfile | null>(() => loadLocalProfile());
  const [registerOpen, setRegisterOpen] = useState(false);
  const [safetyGateOpen, setSafetyGateOpen] = useState(false);
  const [adultChatAccepted, setAdultChatAccepted] = useState(() => window.localStorage.getItem(ADULT_CHAT_CONSENT_KEY) === ADULT_CHAT_POLICY_VERSION);
  const [inRoom, setInRoom] = useState(location.pathname === "/room");

  const enterRoom = (): void => {
    if (!adultChatAccepted) {
      setSafetyGateOpen(true);
      return;
    }
    history.pushState(null, "", "/room");
    void recordEvent({ localUserId: userId, type: "room_start", route: "/room" });
    setInRoom(true);
  };

  useEffect(() => {
    void ensureAnonymousUser(userId);
    void recordEvent({ localUserId: userId, type: "visit", route: location.pathname });
  }, [userId]);

  useEffect(() => {
    const onPopState = (): void => setInRoom(location.pathname === "/room");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return (
    <main className="publicShell">
      <header className="publicTopBar">
        <a className="publicBrand" href="/" onClick={() => setInRoom(false)}>
          <HeartPulse aria-hidden="true" />
          <span>{APP_NAME}</span>
        </a>
        <div className="publicIdentity">
          <span>{profile?.displayName ?? "Guest"}</span>
          <strong>{userId}</strong>
          <button className="textButton" type="button" onClick={() => setRegisterOpen(true)}>
            <UserPlus aria-hidden="true" />
            Register
          </button>
          {SHOW_ADMIN_LINK && (
            <a className="textButton ghost" href="/admin">
              Admin
            </a>
          )}
        </div>
      </header>

      {inRoom && adultChatAccepted ? (
        <PublicRoom userId={userId} profile={profile} />
      ) : inRoom ? (
        <PublicSafetyGate
          onAccept={() => {
            acceptAdultChatTerms(userId);
            setAdultChatAccepted(true);
            void recordEvent({ localUserId: userId, type: "room_start", route: "/room" });
          }}
          onLeave={() => {
            history.pushState(null, "", "/");
            setInRoom(false);
          }}
        />
      ) : (
        <PublicHome userId={userId} profile={profile} onEnterRoom={enterRoom} onRegister={() => setRegisterOpen(true)} />
      )}

      {registerOpen && (
        <RegisterDialog
          current={profile}
          onClose={() => setRegisterOpen(false)}
          onSave={(next) => {
            const saved = saveLocalProfile(next);
            setProfile(saved);
            void saveServerProfile({ localUserId: userId, displayName: saved.displayName, handle: saved.handle });
            setRegisterOpen(false);
          }}
        />
      )}

      {safetyGateOpen && (
        <SafetyGateDialog
          onClose={() => setSafetyGateOpen(false)}
          onAccept={() => {
            acceptAdultChatTerms(userId);
            setAdultChatAccepted(true);
            setSafetyGateOpen(false);
            history.pushState(null, "", "/room");
            void recordEvent({ localUserId: userId, type: "room_start", route: "/room" });
            setInRoom(true);
          }}
        />
      )}
    </main>
  );
}

function acceptAdultChatTerms(userId: string): void {
  window.localStorage.setItem(ADULT_CHAT_CONSENT_KEY, ADULT_CHAT_POLICY_VERSION);
  void recordConsentEvent({
    localUserId: userId,
    type: "adult_chat_terms",
    decision: "granted",
    policyVersion: ADULT_CHAT_POLICY_VERSION,
    metadata: { route: "/room" }
  });
  void recordEvent({ localUserId: userId, type: "consent_grant", route: "/room", metadata: { consentType: "adult_chat_terms" } });
}

function PublicHome({
  userId,
  profile,
  onEnterRoom,
  onRegister
}: {
  userId: string;
  profile: LocalProfile | null;
  onEnterRoom: () => void;
  onRegister: () => void;
}): JSX.Element {
  return (
    <section className="publicHome">
      <div className="publicHero">
        <div className="heroCopy">
          <span className="productSignal">Live video roulette</span>
          <h1>See reaction patterns while you talk.</h1>
          <p>
            Start instantly as {profile?.displayName ?? "a guest"}. Your device receives an ID now; a registered profile can unlock
            saved rooms and contact features later.
          </p>
          <div className="heroActions">
            <button className="primaryAction" type="button" onClick={onEnterRoom}>
              <Play aria-hidden="true" />
              Start video chat
            </button>
            <button className="secondaryAction" type="button" onClick={onRegister}>
              <CircleUserRound aria-hidden="true" />
              Register profile
            </button>
          </div>
        </div>
        <div className="heroPreview" aria-label="SynVibe preview">
          <div className="previewVideo">
            <Video aria-hidden="true" />
            <span>Your camera</span>
          </div>
          <div className="previewPeer">
            <Activity aria-hidden="true" />
            <span>Reaction pattern</span>
            <strong>SOFT LIFT</strong>
          </div>
        </div>
      </div>

      <div className="publicStats">
        <MetricBlock label="Your ID" value={userId} />
        <MetricBlock label="Mode" value={profile ? "Registered profile" : "Guest access"} />
        <MetricBlock label="Chat history" value={profile ? "Reserved" : "Registration required"} />
      </div>
    </section>
  );
}

function PublicSafetyGate({ onAccept, onLeave }: { onAccept: () => void; onLeave: () => void }): JSX.Element {
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const canContinue = adultConfirmed && safetyConfirmed;

  return (
    <section className="publicHome">
      <div className="adminHero">
        <span className="productSignal">Safety gate</span>
        <h1>Adults-only video chat</h1>
        <p>
          Continue only if you are 18 or older and agree to use report, block, and pause controls when needed. Physiological
          analysis and sharing require separate opt-in consent.
        </p>
        <div className="safetyChecks">
          <label className="checkRow">
            <input checked={adultConfirmed} onChange={(event) => setAdultConfirmed(event.target.checked)} type="checkbox" />
            I confirm I am 18 or older.
          </label>
          <label className="checkRow">
            <input checked={safetyConfirmed} onChange={(event) => setSafetyConfirmed(event.target.checked)} type="checkbox" />
            I will not use reaction patterns to pressure another person.
          </label>
        </div>
        <div className="heroActions">
          <button className="primaryAction" type="button" onClick={onAccept} disabled={!canContinue}>
            <ShieldCheck aria-hidden="true" />
            I agree
          </button>
          <button className="secondaryAction" type="button" onClick={onLeave}>
            Leave
          </button>
        </div>
      </div>
    </section>
  );
}

function SafetyGateDialog({ onClose, onAccept }: { onClose: () => void; onAccept: () => void }): JSX.Element {
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const canContinue = adultConfirmed && safetyConfirmed;

  return (
    <div className="dialogBackdrop" role="presentation">
      <form
        className="registerDialog"
        onSubmit={(event) => {
          event.preventDefault();
          if (canContinue) onAccept();
        }}
      >
        <div>
          <h2>Adults-only chat</h2>
          <p>SynVibe requires adults-only use, immediate pause/report/block controls, and separate opt-in before physiological analysis.</p>
        </div>
        <label className="checkRow">
          <input checked={adultConfirmed} onChange={(event) => setAdultConfirmed(event.target.checked)} type="checkbox" />
          I confirm I am 18 or older.
        </label>
        <label className="checkRow">
          <input checked={safetyConfirmed} onChange={(event) => setSafetyConfirmed(event.target.checked)} type="checkbox" />
          I will not use reaction patterns to pressure another person.
        </label>
        <div className="dialogActions">
          <button className="secondaryAction compact" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primaryAction compact" type="submit" disabled={!canContinue}>
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}

function PublicRoom({ userId, profile }: { userId: string; profile: LocalProfile | null }): JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalCursorRef = useRef<string | null>(null);
  const offerStartedRef = useRef<string | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const endedSessionIdsRef = useRef<Set<string>>(new Set());
  const callLifecycleEventsRef = useRef<Set<string>>(new Set());
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [matchStatus, setMatchStatus] = useState<MatchmakingStatus>({ status: "idle" });
  const [matchingOnline, setMatchingOnline] = useState(true);

  useEffect(() => {
    void createServerSession(userId, "/room").then((session) => {
      setSessionId(session?.id);
      setMatchingOnline(Boolean(session));
    });
  }, [userId]);

  useEffect(() => {
    if (!sessionId) return;
    const endSessionOnce = (reason: "left" | "unload", transport: "fetch" | "beacon"): void => {
      if (endedSessionIdsRef.current.has(sessionId)) return;
      endedSessionIdsRef.current.add(sessionId);
      void endServerSession({ localUserId: userId, sessionId, reason }, transport);
    };
    const onPageHide = (): void => endSessionOnce("unload", "beacon");
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      endSessionOnce("left", "fetch");
    };
  }, [sessionId, userId]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const refresh = async (): Promise<void> => {
      const status = await loadMatchmakingStatus(userId);
      if (!cancelled && status) {
        setMatchStatus(status);
        setMatchingOnline(true);
      }
    };

    void joinMatchmaking(userId, sessionId).then((status) => {
      if (cancelled) return;
      if (status) {
        setMatchStatus(status);
        setMatchingOnline(true);
      } else {
        setMatchingOnline(false);
      }
    });
    const intervalId = window.setInterval(refresh, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [sessionId, userId]);

  const leaveCurrentMatch = async (reason: "left" | "reported" | "blocked"): Promise<void> => {
    const matchId = matchStatus.status === "matched" ? matchStatus.match.id : undefined;
    const reportedLocalUserId = matchStatus.status === "matched" ? matchStatus.match.peer.localUserId : undefined;
    closePeerConnection(peerConnectionRef, remoteVideoRef, setHasRemoteStream, setConnectionState);
    if (reason !== "left") {
      await recordModerationReport({
        localUserId: userId,
        ...(matchId ? { matchId } : {}),
        ...(reportedLocalUserId ? { reportedLocalUserId } : {}),
        type: reason === "blocked" ? "block" : "report",
        reason: "safety"
      });
    }
    const status = await leaveMatchmaking({
      localUserId: userId,
      ...(matchId ? { matchId } : {}),
      reason
    });
    setMatchStatus(status ?? { status: "idle" });
    if (reason === "left") {
      const next = await joinMatchmaking(userId, sessionId);
      if (next) setMatchStatus(next);
    }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    if (!cameraEnabled) {
      stopVideo(videoRef.current);
      setLocalStream(null);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 60, min: 6 }
        },
        audio: false
      })
      .then((nextStream) => {
        if (cancelled) {
          nextStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = nextStream;
        if (videoRef.current) videoRef.current.srcObject = nextStream;
        setLocalStream(nextStream);
        setCameraError(null);
        void recordRoomEvent(userId, sessionId, "camera_grant");
      })
      .catch(() => setCameraError("Camera unavailable"));

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
      if (stream) void recordRoomEvent(userId, sessionId, "camera_pause");
    };
  }, [cameraEnabled, sessionId, userId]);

  useEffect(() => {
    if (matchStatus.status !== "matched" || !localStream) {
      closePeerConnection(peerConnectionRef, remoteVideoRef, setHasRemoteStream, setConnectionState);
      offerStartedRef.current = null;
      signalCursorRef.current = null;
      pendingIceCandidatesRef.current = [];
      return;
    }

    const match = matchStatus.match;
    let cancelled = false;
    const connection = ensurePeerConnection({
      peerConnectionRef,
      remoteVideoRef,
      localStream,
      onRemoteStream: () => setHasRemoteStream(true),
      onConnectionState: setConnectionState,
      onSignal: (type, payload) => void sendSignal({ localUserId: userId, matchId: match.id, type, payload })
    });

    const handleMessages = async (messages: WebRtcSignalMessage[]): Promise<void> => {
      for (const message of messages) {
        if (message.type === "offer") {
          const offer = readSessionDescription(message.payload);
          if (!offer) continue;
          await connection.setRemoteDescription(offer);
          await drainPendingIceCandidates(connection, pendingIceCandidatesRef);
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          await sendSignal({ localUserId: userId, matchId: match.id, type: "answer", payload: answerToPayload(answer) });
        } else if (message.type === "answer") {
          const answer = readSessionDescription(message.payload);
          if (answer && !connection.currentRemoteDescription) {
            await connection.setRemoteDescription(answer);
            await drainPendingIceCandidates(connection, pendingIceCandidatesRef);
          }
        } else if (message.type === "candidate") {
          const candidate = readIceCandidate(message.payload);
          if (candidate) {
            if (connection.remoteDescription) {
              await connection.addIceCandidate(candidate);
            } else {
              pendingIceCandidatesRef.current.push(candidate);
            }
          }
        }
      }
    };

    const pollSignals = async (): Promise<void> => {
      const batch = await loadSignals({ localUserId: userId, matchId: match.id, after: signalCursorRef.current });
      if (!batch || cancelled) return;
      signalCursorRef.current = batch.nextCursor;
      await handleMessages(batch.messages);
    };

    if (match.localRole === "caller" && offerStartedRef.current !== match.id) {
      offerStartedRef.current = match.id;
      void connection.createOffer().then(async (offer) => {
        await connection.setLocalDescription(offer);
        await sendSignal({ localUserId: userId, matchId: match.id, type: "offer", payload: answerToPayload(offer) });
      });
    }
    void pollSignals();
    const intervalId = window.setInterval(() => void pollSignals(), 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [localStream, matchStatus, userId]);

  useEffect(() => {
    if (matchStatus.status !== "matched") return;
    const eventType =
      connectionState === "connected"
        ? "call_connect"
        : connectionState === "disconnected"
          ? "call_disconnect"
          : connectionState === "failed"
            ? "call_fail"
            : null;
    if (!eventType) return;
    const key = `${matchStatus.match.id}:${eventType}`;
    if (callLifecycleEventsRef.current.has(key)) return;
    callLifecycleEventsRef.current.add(key);
    void recordEvent({
      localUserId: userId,
      ...(sessionId ? { sessionId } : {}),
      type: eventType,
      route: "/room",
      metadata: { matchId: matchStatus.match.id, connectionState }
    });
  }, [connectionState, matchStatus, sessionId, userId]);

  return (
    <section className="publicRoom">
      <div className="roomHeader">
        <div>
          <span>Roulette room</span>
          <strong>{roomStatusText(matchStatus, matchingOnline)}</strong>
          <small>{profile?.displayName ?? userId}</small>
        </div>
        <div className="roomActions">
          {matchStatus.status === "matched" && (
            <>
              <button className="secondaryAction compact" type="button" onClick={() => void leaveCurrentMatch("reported")}>
                Report
              </button>
              <button className="secondaryAction compact danger" type="button" onClick={() => void leaveCurrentMatch("blocked")}>
                Block
              </button>
              <button className="secondaryAction compact" type="button" onClick={() => void leaveCurrentMatch("left")}>
                Next
              </button>
            </>
          )}
          {matchStatus.status === "idle" && matchingOnline && (
            <button
              className="secondaryAction compact"
              type="button"
              onClick={() => void joinMatchmaking(userId, sessionId).then((status) => status && setMatchStatus(status))}
            >
              Find peer
            </button>
          )}
          <button className={`primaryAction compact ${cameraEnabled ? "active" : ""}`} type="button" onClick={() => setCameraEnabled((value) => !value)}>
            <Camera aria-hidden="true" />
            {cameraEnabled ? "Pause camera" : "Enable camera"}
          </button>
        </div>
      </div>

      <div className="publicCallGrid">
        <article className="publicVideoPane">
          {cameraEnabled ? <video ref={videoRef} autoPlay muted playsInline /> : <EmptyVideo label="Camera off" />}
          {cameraError && <div className="publicStatus danger">{cameraError}</div>}
          <div className="publicVideoLabel">You</div>
        </article>
        <article className="publicVideoPane peerPane">
          <PeerPane
            status={matchStatus}
            online={matchingOnline}
            remoteVideoRef={remoteVideoRef}
            hasRemoteStream={hasRemoteStream}
            connectionState={connectionState}
            cameraEnabled={cameraEnabled}
          />
          <div className="publicVideoLabel">Peer</div>
        </article>
      </div>
    </section>
  );
}

function PeerPane({
  status,
  online,
  remoteVideoRef,
  hasRemoteStream,
  connectionState,
  cameraEnabled
}: {
  status: MatchmakingStatus;
  online: boolean;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  hasRemoteStream: boolean;
  connectionState: RTCPeerConnectionState;
  cameraEnabled: boolean;
}): JSX.Element {
  if (!online) {
    return (
      <div className="peerMock">
        <ShieldCheck aria-hidden="true" />
        <span>Matching offline</span>
        <strong>Start the backend to use the live queue</strong>
      </div>
    );
  }

  if (status.status === "matched") {
    return (
      <>
        <video ref={remoteVideoRef} className={hasRemoteStream ? "remoteVideo active" : "remoteVideo"} autoPlay playsInline />
        <div className={`peerMock matched ${hasRemoteStream ? "connected" : ""}`}>
          <Activity aria-hidden="true" />
          <span>Matched</span>
          <strong>{status.match.peer.displayName ?? status.match.peer.localUserId}</strong>
          {status.match.peer.handle && <em>@{status.match.peer.handle}</em>}
          <small>{cameraEnabled ? connectionStateText(connectionState) : "Enable camera to connect video"}</small>
        </div>
        <div className="publicReactionStack" aria-label="Peer reaction pattern availability">
          <ReactionChip code="PENDING" label="Consented signal" />
          <ReactionChip code="LOCAL_ONLY" label="Precise BPM private" />
        </div>
      </>
    );
  }

  if (status.status === "waiting") {
    return (
      <div className="peerMock">
        <ShieldCheck aria-hidden="true" />
        <span>In live queue</span>
        <strong>Position {status.queuePosition}</strong>
      </div>
    );
  }

  return (
    <div className="peerMock">
      <ShieldCheck aria-hidden="true" />
      <span>Ready</span>
      <strong>Join the live queue</strong>
    </div>
  );
}

function RegisterDialog({
  current,
  onClose,
  onSave
}: {
  current: LocalProfile | null;
  onClose: () => void;
  onSave: (profile: { displayName: string; handle: string }) => void;
}): JSX.Element {
  const [displayName, setDisplayName] = useState(current?.displayName ?? "");
  const [handle, setHandle] = useState(current?.handle ?? "");
  const canSave = displayName.trim().length >= 2 && handle.trim().length >= 3;

  return (
    <div className="dialogBackdrop" role="presentation">
      <form
        className="registerDialog"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) return;
          onSave({ displayName: displayName.trim(), handle: handle.trim().replace(/^@/, "") });
        }}
      >
        <div>
          <h2>Register profile</h2>
          <p>Registration reserves your name on this device for the current MVP. Server accounts are the next release layer.</p>
        </div>
        <label>
          Display name
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Alex" autoFocus />
        </label>
        <label>
          Handle
          <input value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="synvibe_alex" />
        </label>
        <div className="dialogActions">
          <button className="secondaryAction compact" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primaryAction compact" type="submit" disabled={!canSave}>
            Save profile
          </button>
        </div>
      </form>
    </div>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="metricBlock">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyVideo({ label }: { label: string }): JSX.Element {
  return (
    <div className="publicEmptyVideo">
      <Camera aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function ReactionChip({ code, label }: { code: string; label: string }): JSX.Element {
  return (
    <div className={`reactionChip ${code.toLowerCase()}`}>
      <span>{label}</span>
      <strong>{code}</strong>
    </div>
  );
}

function roomStatusText(status: MatchmakingStatus, online: boolean): string {
  if (!online) return "Matching backend offline";
  if (status.status === "matched") return `Matched with ${status.match.peer.displayName ?? status.match.peer.localUserId}`;
  if (status.status === "waiting") return `Waiting in queue, position ${status.queuePosition}`;
  return "Ready to match";
}

function ensurePeerConnection({
  peerConnectionRef,
  remoteVideoRef,
  localStream,
  onRemoteStream,
  onConnectionState,
  onSignal
}: {
  peerConnectionRef: MutableRefObject<RTCPeerConnection | null>;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  localStream: MediaStream;
  onRemoteStream: () => void;
  onConnectionState: (state: RTCPeerConnectionState) => void;
  onSignal: (type: "candidate", payload: Record<string, unknown>) => void;
}): RTCPeerConnection {
  if (peerConnectionRef.current) return peerConnectionRef.current;
  const connection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });
  peerConnectionRef.current = connection;
  localStream.getTracks().forEach((track) => connection.addTrack(track, localStream));
  connection.ontrack = (event) => {
    const [remoteStream] = event.streams;
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      onRemoteStream();
    }
  };
  connection.onconnectionstatechange = () => onConnectionState(connection.connectionState);
  connection.onicecandidate = (event) => {
    if (event.candidate) onSignal("candidate", event.candidate.toJSON() as Record<string, unknown>);
  };
  return connection;
}

function closePeerConnection(
  peerConnectionRef: MutableRefObject<RTCPeerConnection | null>,
  remoteVideoRef: RefObject<HTMLVideoElement | null>,
  setHasRemoteStream: (value: boolean) => void,
  setConnectionState: (value: RTCPeerConnectionState) => void
): void {
  peerConnectionRef.current?.close();
  peerConnectionRef.current = null;
  if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  setHasRemoteStream(false);
  setConnectionState("closed");
}

async function drainPendingIceCandidates(
  connection: RTCPeerConnection,
  pendingIceCandidatesRef: MutableRefObject<RTCIceCandidateInit[]>
): Promise<void> {
  const candidates = pendingIceCandidatesRef.current.splice(0);
  for (const candidate of candidates) await connection.addIceCandidate(candidate);
}

function answerToPayload(description: RTCSessionDescriptionInit): Record<string, unknown> {
  return {
    type: description.type,
    sdp: description.sdp
  };
}

function readSessionDescription(payload: Record<string, unknown>): RTCSessionDescriptionInit | null {
  if ((payload.type === "offer" || payload.type === "answer") && typeof payload.sdp === "string") {
    return { type: payload.type, sdp: payload.sdp };
  }
  return null;
}

function readIceCandidate(payload: Record<string, unknown>): RTCIceCandidateInit | null {
  if (typeof payload.candidate !== "string") return null;
  return {
    candidate: payload.candidate,
    sdpMid: typeof payload.sdpMid === "string" ? payload.sdpMid : null,
    sdpMLineIndex: typeof payload.sdpMLineIndex === "number" ? payload.sdpMLineIndex : null,
    ...(typeof payload.usernameFragment === "string" ? { usernameFragment: payload.usernameFragment } : {})
  };
}

function connectionStateText(state: RTCPeerConnectionState): string {
  if (state === "connected") return "Video connected";
  if (state === "connecting") return "Connecting video";
  if (state === "failed") return "Video connection failed";
  if (state === "disconnected") return "Peer video interrupted";
  if (state === "closed") return "Video closed";
  return "Preparing video";
}

function stopVideo(video: HTMLVideoElement | null): void {
  const stream = video?.srcObject instanceof MediaStream ? video.srcObject : null;
  stream?.getTracks().forEach((track) => track.stop());
  if (video) video.srcObject = null;
}

function recordRoomEvent(userId: string, sessionId: string | undefined, type: "camera_grant" | "camera_pause"): void {
  void recordEvent({
    localUserId: userId,
    ...(sessionId ? { sessionId } : {}),
    type,
    route: "/room"
  });
}
