import { Activity, Camera, CircleUserRound, Flag, HeartPulse, MessageCircle, Play, Send, ShieldCheck, Trash2, UserPlus, Video } from "lucide-react";
import type { JSX, MutableRefObject, RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MatchChatMessage, MatchmakingStatus, ModerationReportReason, WebRtcSignalMessage } from "@pulse-reaction/shared-schemas";
import {
  createServerSession,
  deleteChatMessage,
  endServerSession,
  ensureAnonymousUser,
  joinMatchmaking,
  loadChatMessages,
  leaveMatchmaking,
  loadMatchmakingStatus,
  loadServerProfile,
  loadSignals,
  recordConsentEvent,
  recordEvent,
  recordModerationReport,
  saveServerProfile,
  sendChatMessage,
  sendSignal
} from "./api.js";
import { getOrCreateAnonymousUserId, loadLocalProfile, saveLocalProfile, type LocalProfile } from "./identity.js";
import { usePublicReactionOutput, type PublicReactionOutputState } from "./publicReactionOutput.js";

const APP_NAME = import.meta.env.VITE_APP_NAME ?? "SynVibe";
const SHOW_ADMIN_LINK = import.meta.env.VITE_SHOW_ADMIN_LINK === "true";
const ADULT_CHAT_CONSENT_KEY = "synvibe.consent.adultChatTerms.v1";
const ADULT_CHAT_POLICY_VERSION = "adult-chat-terms-2026-08-04";
const PHYSIOLOGICAL_ANALYSIS_CONSENT_KEY = "synvibe.consent.physiologicalAnalysis.v1";
const PHYSIOLOGICAL_ANALYSIS_POLICY_VERSION = "physiological-analysis-2026-08-04";
const MODERATION_REASONS: Array<{ value: ModerationReportReason; label: string }> = [
  { value: "safety", label: "Safety concern" },
  { value: "harassment", label: "Harassment" },
  { value: "underage", label: "Underage concern" },
  { value: "spam", label: "Spam or scam" },
  { value: "other", label: "Other" }
];

export function PublicApp(): JSX.Element {
  const userId = useMemo(() => getOrCreateAnonymousUserId(), []);
  const [profile, setProfile] = useState<LocalProfile | null>(() => loadLocalProfile());
  const [registerOpen, setRegisterOpen] = useState(false);
  const [profileSyncStatus, setProfileSyncStatus] = useState<"unknown" | "server" | "local_only">("unknown");
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
    void loadServerProfile(userId).then((serverProfile) => {
      if (!serverProfile) return;
      const saved = saveLocalProfile({ displayName: serverProfile.displayName, handle: serverProfile.handle });
      setProfile(saved);
      setProfileSyncStatus("server");
    });
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
        <PublicHome userId={userId} profile={profile} profileSyncStatus={profileSyncStatus} onEnterRoom={enterRoom} onRegister={() => setRegisterOpen(true)} />
      )}

      {registerOpen && (
        <RegisterDialog
          current={profile}
          onClose={() => setRegisterOpen(false)}
          onSave={(next) => {
            const saved = saveLocalProfile(next);
            setProfile(saved);
            void saveServerProfile({ localUserId: userId, displayName: saved.displayName, handle: saved.handle }).then((serverProfile) => {
              setProfileSyncStatus(serverProfile ? "server" : "local_only");
            });
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
  void syncAdultChatTerms(userId, undefined, "explicit_accept");
  void recordEvent({ localUserId: userId, type: "consent_grant", route: "/room", metadata: { consentType: "adult_chat_terms" } });
}

async function syncAdultChatTerms(userId: string, sessionId: string | undefined, source: "explicit_accept" | "room_entry_assertion"): Promise<void> {
  await recordConsentEvent({
    localUserId: userId,
    ...(sessionId ? { sessionId } : {}),
    type: "adult_chat_terms",
    decision: "granted",
    policyVersion: ADULT_CHAT_POLICY_VERSION,
    metadata: { route: "/room", source }
  });
}

function PublicHome({
  userId,
  profile,
  profileSyncStatus,
  onEnterRoom,
  onRegister
}: {
  userId: string;
  profile: LocalProfile | null;
  profileSyncStatus: "unknown" | "server" | "local_only";
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
            Start instantly as {profile?.displayName ?? "a guest"}. Your profile name can be saved to the SynVibe server for live matching,
            while precise pulse data stays private by default.
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
        <MetricBlock label="Profile sync" value={profileSyncText(profileSyncStatus, profile)} />
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
  const chatCursorRef = useRef<string | null>(null);
  const offerStartedRef = useRef<string | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const endedSessionIdsRef = useRef<Set<string>>(new Set());
  const callLifecycleEventsRef = useRef<Set<string>>(new Set());
  const analysisStartEventsRef = useRef<Set<string>>(new Set());
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [physiologicalAnalysisAccepted, setPhysiologicalAnalysisAccepted] = useState(
    () => window.localStorage.getItem(PHYSIOLOGICAL_ANALYSIS_CONSENT_KEY) === PHYSIOLOGICAL_ANALYSIS_POLICY_VERSION
  );
  const [analysisConsentOpen, setAnalysisConsentOpen] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new");
  const [chatMessages, setChatMessages] = useState<MatchChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatOnline, setChatOnline] = useState(true);
  const [moderationAction, setModerationAction] = useState<{ type: "report" | "block"; reportedMessageId?: string } | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [matchStatus, setMatchStatus] = useState<MatchmakingStatus>({ status: "idle" });
  const [matchingOnline, setMatchingOnline] = useState(true);
  const analysisActive = cameraEnabled && physiologicalAnalysisAccepted;
  const reactionOutput = usePublicReactionOutput({
    active: analysisActive,
    localUserId: userId,
    sessionId,
    videoRef
  });

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

    void syncAdultChatTerms(userId, sessionId, "room_entry_assertion")
      .then(() => joinMatchmaking(userId, sessionId))
      .then((status) => {
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
    closePeerConnection(peerConnectionRef, remoteVideoRef, setHasRemoteStream, setConnectionState);
    const status = await leaveMatchmaking({
      localUserId: userId,
      ...(matchId ? { matchId } : {}),
      reason
    });
    setMatchStatus(status ?? { status: "idle" });
    if (reason === "left") {
      await syncAdultChatTerms(userId, sessionId, "room_entry_assertion");
      const next = await joinMatchmaking(userId, sessionId);
      if (next) setMatchStatus(next);
    }
  };

  const submitModerationAction = async (input: { reason: ModerationReportReason; notes?: string }): Promise<void> => {
    if (!moderationAction || matchStatus.status !== "matched") return;
    const matchId = matchStatus.match.id;
    const reportedLocalUserId = matchStatus.match.peer.localUserId;
    await recordModerationReport({
      localUserId: userId,
      matchId,
      reportedLocalUserId,
      ...(moderationAction.reportedMessageId ? { reportedMessageId: moderationAction.reportedMessageId } : {}),
      type: moderationAction.type,
      reason: input.reason,
      ...(input.notes ? { notes: input.notes } : {})
    });
    const leaveReason = moderationAction.type === "block" ? "blocked" : "reported";
    setModerationAction(null);
    await leaveCurrentMatch(leaveReason);
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
    if (matchStatus.status !== "matched") {
      chatCursorRef.current = null;
      setChatMessages([]);
      setChatDraft("");
      setChatOnline(true);
      return;
    }

    const matchId = matchStatus.match.id;
    let cancelled = false;
    chatCursorRef.current = null;
    setChatMessages([]);
    setChatOnline(true);

    const pollChat = async (): Promise<void> => {
      const batch = await loadChatMessages({ localUserId: userId, matchId, after: chatCursorRef.current });
      if (cancelled) return;
      if (!batch) {
        setChatOnline(false);
        return;
      }
      chatCursorRef.current = batch.nextCursor;
      setChatOnline(true);
      if (batch.messages.length) {
        setChatMessages((current) => mergeChatMessages(current, batch.messages));
      }
    };

    void pollChat();
    const intervalId = window.setInterval(() => void pollChat(), 1500);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [matchStatus, userId]);

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

  useEffect(() => {
    if (!analysisActive) return;
    const key = sessionId ?? "local-session";
    if (analysisStartEventsRef.current.has(key)) return;
    analysisStartEventsRef.current.add(key);
    void recordEvent({
      localUserId: userId,
      ...(sessionId ? { sessionId } : {}),
      type: "analysis_start",
      route: "/room",
      metadata: { mode: "local_only", precisePeerBpmShared: false }
    });
  }, [analysisActive, sessionId, userId]);

  const submitChatMessage = async (): Promise<void> => {
    if (matchStatus.status !== "matched") return;
    const body = chatDraft.trim();
    if (!body) return;
    setChatDraft("");
    const message = await sendChatMessage({ localUserId: userId, matchId: matchStatus.match.id, body });
    if (message) {
      setChatOnline(true);
      setChatMessages((current) => mergeChatMessages(current, [message]));
    } else {
      setChatOnline(false);
      setChatDraft(body);
    }
  };

  const deleteOwnChatMessage = async (messageId: string): Promise<void> => {
    if (matchStatus.status !== "matched") return;
    const message = await deleteChatMessage({ localUserId: userId, matchId: matchStatus.match.id, messageId });
    if (message) {
      setChatOnline(true);
      setChatMessages((current) => mergeChatMessages(current, [message]));
    } else {
      setChatOnline(false);
    }
  };

  const acceptPhysiologicalAnalysis = (): void => {
    window.localStorage.setItem(PHYSIOLOGICAL_ANALYSIS_CONSENT_KEY, PHYSIOLOGICAL_ANALYSIS_POLICY_VERSION);
    setPhysiologicalAnalysisAccepted(true);
    setAnalysisConsentOpen(false);
    void recordConsentEvent({
      localUserId: userId,
      ...(sessionId ? { sessionId } : {}),
      type: "physiological_analysis",
      decision: "granted",
      policyVersion: PHYSIOLOGICAL_ANALYSIS_POLICY_VERSION,
      metadata: { route: "/room", localOnly: true, precisePeerBpmShared: false }
    });
    void recordEvent({
      localUserId: userId,
      ...(sessionId ? { sessionId } : {}),
      type: "consent_grant",
      route: "/room",
      metadata: { consentType: "physiological_analysis", policyVersion: PHYSIOLOGICAL_ANALYSIS_POLICY_VERSION }
    });
  };

  const revokePhysiologicalAnalysis = (): void => {
    window.localStorage.removeItem(PHYSIOLOGICAL_ANALYSIS_CONSENT_KEY);
    setPhysiologicalAnalysisAccepted(false);
    setAnalysisConsentOpen(false);
    void recordConsentEvent({
      localUserId: userId,
      ...(sessionId ? { sessionId } : {}),
      type: "physiological_analysis",
      decision: "revoked",
      policyVersion: PHYSIOLOGICAL_ANALYSIS_POLICY_VERSION,
      metadata: { route: "/room" }
    });
    void recordEvent({
      localUserId: userId,
      ...(sessionId ? { sessionId } : {}),
      type: "consent_revoke",
      route: "/room",
      metadata: { consentType: "physiological_analysis", policyVersion: PHYSIOLOGICAL_ANALYSIS_POLICY_VERSION }
    });
  };

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
              <button className="secondaryAction compact" type="button" onClick={() => setModerationAction({ type: "report" })}>
                Report
              </button>
              <button className="secondaryAction compact danger" type="button" onClick={() => setModerationAction({ type: "block" })}>
                Block
              </button>
              <button className="secondaryAction compact" type="button" onClick={() => void leaveCurrentMatch("left")}>
                Next
              </button>
            </>
          )}
          {(matchStatus.status === "idle" || matchStatus.status === "ineligible") && matchingOnline && (
            <button
              className="secondaryAction compact"
              type="button"
              onClick={() =>
                void syncAdultChatTerms(userId, sessionId, "room_entry_assertion")
                  .then(() => joinMatchmaking(userId, sessionId))
                  .then((status) => status && setMatchStatus(status))
              }
            >
              {matchStatus.status === "ineligible" ? "Confirm and find peer" : "Find peer"}
            </button>
          )}
          <button className={`primaryAction compact ${cameraEnabled ? "active" : ""}`} type="button" onClick={() => setCameraEnabled((value) => !value)}>
            <Camera aria-hidden="true" />
            {cameraEnabled ? "Pause camera" : "Enable camera"}
          </button>
          {physiologicalAnalysisAccepted ? (
            <button className="secondaryAction compact" type="button" onClick={revokePhysiologicalAnalysis}>
              Disable analysis
            </button>
          ) : (
            <button className="secondaryAction compact" type="button" onClick={() => setAnalysisConsentOpen(true)}>
              Enable analysis
            </button>
          )}
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
            analysisActive={analysisActive}
            physiologicalAnalysisAccepted={physiologicalAnalysisAccepted}
            reactionOutput={reactionOutput}
          />
          <div className="publicVideoLabel">Peer</div>
        </article>
      </div>
      <MatchChatPanel
        messages={chatMessages}
        draft={chatDraft}
        onDraftChange={setChatDraft}
        onSubmit={() => void submitChatMessage()}
        onDelete={(messageId) => void deleteOwnChatMessage(messageId)}
        onReportMessage={(messageId) => setModerationAction({ type: "report", reportedMessageId: messageId })}
        localUserId={userId}
        disabled={matchStatus.status !== "matched"}
        online={chatOnline && matchingOnline}
      />
      {moderationAction && (
        <ModerationDialog
          action={moderationAction}
          onClose={() => setModerationAction(null)}
          onSubmit={(input) => void submitModerationAction(input)}
        />
      )}
      {analysisConsentOpen && (
        <PhysiologicalAnalysisDialog
          onClose={() => setAnalysisConsentOpen(false)}
          onAccept={acceptPhysiologicalAnalysis}
        />
      )}
    </section>
  );
}

function PhysiologicalAnalysisDialog({ onClose, onAccept }: { onClose: () => void; onAccept: () => void }): JSX.Element {
  const [localOnlyConfirmed, setLocalOnlyConfirmed] = useState(false);
  const [uncertaintyConfirmed, setUncertaintyConfirmed] = useState(false);
  const canContinue = localOnlyConfirmed && uncertaintyConfirmed;

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
          <h2>Local pulse analysis</h2>
          <p>SynVibe can process your camera frames on this device for coarse pulse-pattern feedback. It does not share precise BPM with your peer by default.</p>
        </div>
        <label className="checkRow">
          <input checked={localOnlyConfirmed} onChange={(event) => setLocalOnlyConfirmed(event.target.checked)} type="checkbox" />
          I agree to local physiological analysis for my own room view.
        </label>
        <label className="checkRow">
          <input checked={uncertaintyConfirmed} onChange={(event) => setUncertaintyConfirmed(event.target.checked)} type="checkbox" />
          I understand pulse changes are not emotion, attraction, honesty, intent, compatibility, or medical labels.
        </label>
        <div className="dialogActions">
          <button className="secondaryAction compact" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primaryAction compact" type="submit" disabled={!canContinue}>
            Enable
          </button>
        </div>
      </form>
    </div>
  );
}

function ModerationDialog({
  action,
  onClose,
  onSubmit
}: {
  action: { type: "report" | "block"; reportedMessageId?: string };
  onClose: () => void;
  onSubmit: (input: { reason: ModerationReportReason; notes?: string }) => void;
}): JSX.Element {
  const [reason, setReason] = useState<ModerationReportReason>("safety");
  const [notes, setNotes] = useState("");
  return (
    <div className="dialogBackdrop" role="presentation">
      <form
        className="registerDialog"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ reason, ...(notes.trim() ? { notes: notes.trim() } : {}) });
        }}
      >
        <div>
          <h2>{action.type === "block" ? "Block participant" : action.reportedMessageId ? "Report message" : "Report participant"}</h2>
          <p>
            {action.type === "block"
              ? "Block prevents rematching with this participant."
              : action.reportedMessageId
                ? "Reports can reference this message while respecting deletion and retention settings."
                : "Reports help review safety issues in matched chats."}
          </p>
        </div>
        <label>
          Reason
          <select value={reason} onChange={(event) => setReason(event.target.value as ModerationReportReason)}>
            {MODERATION_REASONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} />
        </label>
        <div className="dialogActions">
          <button className="secondaryAction compact" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className={`primaryAction compact ${action.type === "block" ? "danger" : ""}`} type="submit">
            {action.type === "block" ? "Block" : "Report"}
          </button>
        </div>
      </form>
    </div>
  );
}

function MatchChatPanel({
  messages,
  draft,
  onDraftChange,
  onSubmit,
  onDelete,
  onReportMessage,
  localUserId,
  disabled,
  online
}: {
  messages: MatchChatMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onDelete: (messageId: string) => void;
  onReportMessage: (messageId: string) => void;
  localUserId: string;
  disabled: boolean;
  online: boolean;
}): JSX.Element {
  return (
    <section className="matchChatPanel" aria-label="Match chat">
      <div className="matchChatHeader">
        <span>
          <MessageCircle aria-hidden="true" />
          Chat
        </span>
        <strong>{disabled ? "Waiting for match" : online ? "Live" : "Reconnecting"}</strong>
      </div>
      <div className="matchMessages">
        {messages.length === 0 ? (
          <p>{disabled ? "Match with someone to start chatting." : "Say hello when you are ready."}</p>
        ) : (
          messages.map((message) => (
            <div className={message.senderLocalUserId === localUserId ? "matchMessage you" : "matchMessage peer"} key={message.id}>
              <span className={message.deletedAtIso ? "deletedMessageBody" : ""}>{message.deletedAtIso ? "Message deleted" : message.body}</span>
              {message.senderLocalUserId === localUserId && !message.deletedAtIso && (
                <button className="messageDeleteButton" type="button" onClick={() => onDelete(message.id)} title="Delete message" aria-label="Delete message">
                  <Trash2 aria-hidden="true" />
                </button>
              )}
              {message.senderLocalUserId !== localUserId && !message.deletedAtIso && (
                <button className="messageDeleteButton" type="button" onClick={() => onReportMessage(message.id)} title="Report message" aria-label="Report message">
                  <Flag aria-hidden="true" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
      <div className="matchComposer">
        <input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSubmit();
          }}
          placeholder={disabled ? "Waiting for match" : "Message"}
          disabled={disabled}
          maxLength={800}
        />
        <button className="iconButton small primary" type="button" onClick={onSubmit} disabled={disabled || draft.trim().length === 0} title="Send message">
          <Send aria-hidden="true" />
        </button>
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
  cameraEnabled,
  analysisActive,
  physiologicalAnalysisAccepted,
  reactionOutput
}: {
  status: MatchmakingStatus;
  online: boolean;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  hasRemoteStream: boolean;
  connectionState: RTCPeerConnectionState;
  cameraEnabled: boolean;
  analysisActive: boolean;
  physiologicalAnalysisAccepted: boolean;
  reactionOutput: PublicReactionOutputState;
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
        <div className="publicReactionStack" aria-label="Physiological analysis availability">
          <ReactionChip code={reactionOutputChipCode(reactionOutput, analysisActive, physiologicalAnalysisAccepted)} label="Local analysis" />
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

  if (status.status === "ineligible") {
    return (
      <div className="peerMock">
        <ShieldCheck aria-hidden="true" />
        <span>Adults-only confirmation required</span>
        <strong>Confirm terms before matching</strong>
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
          <p>Registration saves your display name and handle for matching. It does not share precise pulse data with another participant.</p>
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

function reactionOutputChipCode(output: PublicReactionOutputState, analysisActive: boolean, physiologicalAnalysisAccepted: boolean): string {
  if (!physiologicalAnalysisAccepted) return "OPT_IN";
  if (!analysisActive) return "CAMERA_PAUSED";
  if (output.status === "offline") return "SYNC_WAIT";
  if (output.state === "INSUFFICIENT_SIGNAL") return "SIGNAL_LOW";
  if (output.state === "CALIBRATING_BASELINE") return "CALIBRATING";
  if (output.state) return output.state;
  return "COLLECTING";
}

function roomStatusText(status: MatchmakingStatus, online: boolean): string {
  if (!online) return "Matching backend offline";
  if (status.status === "matched") return `Matched with ${status.match.peer.displayName ?? status.match.peer.localUserId}`;
  if (status.status === "waiting") return `Waiting in queue, position ${status.queuePosition}`;
  if (status.status === "ineligible") return "Adults-only confirmation required";
  return "Ready to match";
}

function profileSyncText(status: "unknown" | "server" | "local_only", profile: LocalProfile | null): string {
  if (!profile) return "Not registered";
  if (status === "server") return "Server saved";
  if (status === "local_only") return "Local only";
  return "Checking";
}

function mergeChatMessages(current: MatchChatMessage[], incoming: MatchChatMessage[]): MatchChatMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) {
    byId.set(message.id, message);
  }
  return Array.from(byId.values())
    .sort((left, right) => left.createdAtIso.localeCompare(right.createdAtIso) || left.id.localeCompare(right.id))
    .slice(-100);
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
