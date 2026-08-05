import { Activity, Camera, CircleUserRound, Flag, HeartPulse, MessageCircle, Play, Send, ShieldCheck, Trash2, UserPlus, Video } from "lucide-react";
import type { CSSProperties, JSX, MutableRefObject, RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ConversationPace, MatchAgeBracket, MatchChatMessage, MatchIntent, MatchLanguage, MatchPeer, MatchmakingStatus, MatchTopicTag, ModerationReportReason, ProfileRecord, WebRtcSignalMessage } from "@pulse-reaction/shared-schemas";
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
import type { RoiRect } from "./prototype/pulseSampler.js";

const APP_NAME = import.meta.env.VITE_APP_NAME ?? "SynVibe";
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
const AGE_BRACKET_OPTIONS: Array<{ value: MatchAgeBracket; label: string }> = [
  { value: "18_24", label: "18-24" },
  { value: "25_34", label: "25-34" },
  { value: "35_44", label: "35-44" },
  { value: "45_54", label: "45-54" },
  { value: "55_plus", label: "55+" }
];
const LANGUAGE_OPTIONS: Array<{ value: MatchLanguage; label: string }> = [
  { value: "en", label: "English" },
  { value: "ru", label: "Russian" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "other", label: "Other" }
];
const INTENT_OPTIONS: Array<{ value: MatchIntent; label: string }> = [
  { value: "open_conversation", label: "Open conversation" },
  { value: "friendship", label: "Friendship" },
  { value: "dating", label: "Dating" },
  { value: "long_term", label: "Long-term dating" }
];
const TOPIC_OPTIONS: Array<{ value: MatchTopicTag; label: string }> = [
  { value: "music", label: "Music" },
  { value: "travel", label: "Travel" },
  { value: "sports", label: "Sports" },
  { value: "tech", label: "Tech" },
  { value: "art", label: "Art" },
  { value: "wellness", label: "Wellness" },
  { value: "games", label: "Games" },
  { value: "food", label: "Food" }
];
const PACE_OPTIONS: Array<{ value: ConversationPace; label: string }> = [
  { value: "calm", label: "Calm" },
  { value: "balanced", label: "Balanced" },
  { value: "high_energy", label: "High energy" }
];

export function PublicApp(): JSX.Element {
  const userId = useMemo(() => getOrCreateAnonymousUserId(), []);
  const [profile, setProfile] = useState<LocalProfile | null>(() => loadLocalProfile());
  const [registerOpen, setRegisterOpen] = useState(false);
  const [profileSyncStatus, setProfileSyncStatus] = useState<"unknown" | "server" | "local_only">("unknown");
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [safetyGateOpen, setSafetyGateOpen] = useState(false);
  const [roomConsentAccepted, setRoomConsentAccepted] = useState(() => hasRoomConsent());
  const [inRoom, setInRoom] = useState(location.pathname === "/room");

  const enterRoom = (): void => {
    if (!roomConsentAccepted) {
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
      const saved = saveLocalProfile(profileFromServer(serverProfile));
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
        </div>
      </header>

      {inRoom && roomConsentAccepted ? (
        <PublicRoom userId={userId} profile={profile} />
      ) : inRoom ? (
        <PublicSafetyGate
          onAccept={() => {
            acceptRoomTerms(userId);
            setRoomConsentAccepted(true);
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
          error={profileSaveError}
          onClose={() => {
            setProfileSaveError(null);
            setRegisterOpen(false);
          }}
          onSave={async (next) => {
            setProfileSaveError(null);
            const result = await saveServerProfile({ localUserId: userId, displayName: next.displayName, handle: next.handle });
            if (result.status === "handle_taken") {
              setProfileSaveError("That handle is already taken. Choose another one.");
              return false;
            }
            if (result.status === "invalid_profile") {
              setProfileSaveError("Use 2+ characters for the name and 3-30 letters, numbers, or underscores for the handle.");
              return false;
            }
            const saved = saveLocalProfile(result.status === "saved" ? profileFromServer(result.profile) : next);
            setProfile(saved);
            setProfileSyncStatus(result.status === "saved" ? "server" : "local_only");
            setRegisterOpen(false);
            return true;
          }}
        />
      )}

      {safetyGateOpen && (
        <SafetyGateDialog
          onClose={() => setSafetyGateOpen(false)}
          onAccept={() => {
            acceptRoomTerms(userId);
            setRoomConsentAccepted(true);
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

function hasRoomConsent(): boolean {
  return (
    window.localStorage.getItem(ADULT_CHAT_CONSENT_KEY) === ADULT_CHAT_POLICY_VERSION &&
    window.localStorage.getItem(PHYSIOLOGICAL_ANALYSIS_CONSENT_KEY) === PHYSIOLOGICAL_ANALYSIS_POLICY_VERSION
  );
}

function acceptRoomTerms(userId: string): void {
  window.localStorage.setItem(ADULT_CHAT_CONSENT_KEY, ADULT_CHAT_POLICY_VERSION);
  window.localStorage.setItem(PHYSIOLOGICAL_ANALYSIS_CONSENT_KEY, PHYSIOLOGICAL_ANALYSIS_POLICY_VERSION);
  void syncAdultChatTerms(userId, undefined, "explicit_accept");
  void recordEvent({ localUserId: userId, type: "consent_grant", route: "/room", metadata: { consentType: "adult_chat_terms" } });
  void recordConsentEvent({
    localUserId: userId,
    type: "physiological_analysis",
    decision: "granted",
    policyVersion: PHYSIOLOGICAL_ANALYSIS_POLICY_VERSION,
    metadata: { route: "/room", source: "room_entry_gate", localOnly: true, precisePeerBpmShared: false }
  });
  void recordEvent({
    localUserId: userId,
    type: "consent_grant",
    route: "/room",
    metadata: { consentType: "physiological_analysis", policyVersion: PHYSIOLOGICAL_ANALYSIS_POLICY_VERSION }
  });
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
            <span>Local analysis</span>
            <strong>Opt-in required</strong>
          </div>
          <div className="previewReadiness" aria-label="Launch readiness">
            <span>Live queue</span>
            <span>Adults-only gate</span>
            <span>Pulse private by default</span>
          </div>
        </div>
      </div>

      <div className="publicStats">
        <MetricBlock label="Your ID" value={userId} />
        <MetricBlock label="Mode" value={profile ? "Registered profile" : "Guest access"} />
        <MetricBlock label="Profile sync" value={profileSyncText(profileSyncStatus, profile)} />
        <MetricBlock label="Search filters" value={profileFilterText(profile)} />
      </div>
    </section>
  );
}

function PublicSafetyGate({ onAccept, onLeave }: { onAccept: () => void; onLeave: () => void }): JSX.Element {
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [analysisConfirmed, setAnalysisConfirmed] = useState(false);
  const canContinue = adultConfirmed && safetyConfirmed && analysisConfirmed;

  return (
    <section className="publicHome">
      <div className="adminHero">
        <span className="productSignal">Safety gate</span>
        <h1>Adults-only video chat</h1>
        <p>
          Continue only if you are 18 or older, agree to use report, block, and pause controls when needed, and consent to on-device reaction-pattern analysis while you are in the chat.
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
          <label className="checkRow">
            <input checked={analysisConfirmed} onChange={(event) => setAnalysisConfirmed(event.target.checked)} type="checkbox" />
            I consent to camera and microphone access, automatic on-device pulse-pattern analysis, and uncertainty-safe feedback during the chat.
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
  const [analysisConfirmed, setAnalysisConfirmed] = useState(false);
  const canContinue = adultConfirmed && safetyConfirmed && analysisConfirmed;

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
          <p>SynVibe requires adults-only use, immediate pause/report/block controls, and consent to on-device pulse-pattern analysis before joining the chat.</p>
        </div>
        <label className="checkRow">
          <input checked={adultConfirmed} onChange={(event) => setAdultConfirmed(event.target.checked)} type="checkbox" />
          I confirm I am 18 or older.
        </label>
        <label className="checkRow">
          <input checked={safetyConfirmed} onChange={(event) => setSafetyConfirmed(event.target.checked)} type="checkbox" />
          I will not use reaction patterns to pressure another person.
        </label>
        <label className="checkRow">
          <input checked={analysisConfirmed} onChange={(event) => setAnalysisConfirmed(event.target.checked)} type="checkbox" />
          I consent to camera and microphone access, automatic on-device pulse-pattern analysis, and uncertainty-safe feedback during the chat.
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
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");
  const [callLayout, setCallLayout] = useState<"peer_main" | "self_main">("peer_main");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [audioOutputReady, setAudioOutputReady] = useState(false);
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
  const analysisActive = cameraEnabled;
  const reactionOutput = usePublicReactionOutput({
    active: analysisActive,
    localUserId: userId,
    sessionId,
    videoRef
  });
  const selfVideoStyle = faceFramingStyle(reactionOutput.roi, videoRef.current);

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
          frameRate: { ideal: 60, min: 6 },
          facingMode: { ideal: cameraFacingMode }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
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
        setAudioOutputReady(nextStream.getAudioTracks().length > 0);
        void recordRoomEvent(userId, sessionId, "camera_grant");
      })
      .catch(() => {
        setCameraError("Camera or microphone unavailable");
        setAudioOutputReady(false);
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
      setAudioOutputReady(false);
      if (stream) void recordRoomEvent(userId, sessionId, "camera_pause");
    };
  }, [cameraEnabled, cameraFacingMode, sessionId, userId]);

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
            {cameraEnabled ? "Pause call media" : "Resume call media"}
          </button>
          {cameraEnabled && (
            <button className="secondaryAction compact" type="button" onClick={() => setCameraFacingMode((mode) => (mode === "user" ? "environment" : "user"))}>
              Flip camera
            </button>
          )}
          <span className="mediaStatus">{audioOutputReady ? "Mic on / audio ready" : cameraEnabled ? "Awaiting mic" : "Media paused"}</span>
        </div>
      </div>

      <div className={`publicCallStage ${callLayout}`}>
        <article
          className={`publicVideoPane selfPane ${callLayout === "self_main" ? "mainPane" : "pipPane"}`}
          onClick={() => callLayout !== "self_main" && setCallLayout("self_main")}
        >
          {cameraEnabled ? (
            <video
              ref={videoRef}
              className={cameraFacingMode === "user" ? "selfVideo mirrored" : "selfVideo"}
              style={selfVideoStyle}
              autoPlay
              muted
              playsInline
            />
          ) : (
            <EmptyVideo label="Media paused" />
          )}
          <PulseHeartOverlay active={analysisActive} bpmEstimate={reactionOutput.bpmEstimate} qualityScore={reactionOutput.qualityScore} />
          {cameraError && <div className="publicStatus danger">{cameraError}</div>}
          <div className="publicVideoLabel">{cameraFacingMode === "user" ? "You" : "Rear camera"}</div>
        </article>
        <article
          className={`publicVideoPane peerPane ${callLayout === "peer_main" ? "mainPane" : "pipPane"}`}
          onClick={() => callLayout !== "peer_main" && setCallLayout("peer_main")}
        >
          <PeerPane
            status={matchStatus}
            online={matchingOnline}
            remoteVideoRef={remoteVideoRef}
            hasRemoteStream={hasRemoteStream}
            connectionState={connectionState}
            cameraEnabled={cameraEnabled}
            analysisActive={analysisActive}
            reactionOutput={reactionOutput}
          />
          <div className="publicVideoLabel">Peer</div>
        </article>
        <button className="callSwapButton" type="button" onClick={() => setCallLayout((layout) => (layout === "peer_main" ? "self_main" : "peer_main"))}>
          Swap view
        </button>
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
    </section>
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
  reactionOutput
}: {
  status: MatchmakingStatus;
  online: boolean;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  hasRemoteStream: boolean;
  connectionState: RTCPeerConnectionState;
  cameraEnabled: boolean;
  analysisActive: boolean;
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
          <small>{peerProfileSummary(status.match.peer)}</small>
          <small>{cameraEnabled ? connectionStateText(connectionState) : "Resume call media to connect video and audio"}</small>
        </div>
        <div className="publicReactionStack" aria-label="Physiological analysis availability">
          <ReactionChip code={reactionOutputChipCode(reactionOutput, analysisActive)} label="Local analysis" />
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

function PulseHeartOverlay({
  active,
  bpmEstimate,
  qualityScore
}: {
  active: boolean;
  bpmEstimate: number | null;
  qualityScore: number | null;
}): JSX.Element {
  const boundedBpm = bpmEstimate === null ? null : Math.max(42, Math.min(180, bpmEstimate));
  const durationSeconds = boundedBpm === null ? 1.2 : 60 / boundedBpm;
  const quality = Math.max(0, Math.min(1, qualityScore ?? 0));
  const style = {
    "--pulse-heart-duration": `${durationSeconds.toFixed(3)}s`,
    "--pulse-heart-quality": quality.toFixed(3)
  } as CSSProperties;
  const label = boundedBpm === null ? "Pulse estimate waiting" : `Estimated pulse ${Math.round(boundedBpm)} BPM`;

  return (
    <div className={`pulseHeartOverlay ${active && boundedBpm !== null ? "active" : "waiting"}`} style={style} aria-label={label}>
      <HeartPulse aria-hidden="true" />
      <span className="pulseHeartBpm">{boundedBpm === null ? "--" : Math.round(boundedBpm)}</span>
      <span className="pulseHeartUnit">BPM est.</span>
    </div>
  );
}

function faceFramingStyle(roi: RoiRect | null, video: HTMLVideoElement | null): CSSProperties | undefined {
  if (!roi || !video || video.videoWidth <= 0 || video.videoHeight <= 0) return undefined;
  const frameArea = video.videoWidth * video.videoHeight;
  const faceAreaRatio = (roi.width * roi.height) / frameArea;
  if (faceAreaRatio <= 0.15) return undefined;
  const scale = Math.max(0.64, Math.min(1, Math.sqrt(0.15 / faceAreaRatio)));
  return {
    transform: `scale(${scale.toFixed(3)})`
  };
}

function RegisterDialog({
  current,
  error,
  onClose,
  onSave
}: {
  current: LocalProfile | null;
  error: string | null;
  onClose: () => void;
  onSave: (profile: Omit<LocalProfile, "createdAtIso">) => Promise<boolean>;
}): JSX.Element {
  const [displayName, setDisplayName] = useState(current?.displayName ?? "");
  const [handle, setHandle] = useState(current?.handle ?? "");
  const [ageBracket, setAgeBracket] = useState<MatchAgeBracket | "">(current?.ageBracket ?? "");
  const [languages, setLanguages] = useState<MatchLanguage[]>(current?.languages ?? []);
  const [matchIntent, setMatchIntent] = useState<MatchIntent | "">(current?.matchIntent ?? "");
  const [preferredAgeBrackets, setPreferredAgeBrackets] = useState<MatchAgeBracket[]>(current?.preferredAgeBrackets ?? []);
  const [preferredLanguages, setPreferredLanguages] = useState<MatchLanguage[]>(current?.preferredLanguages ?? []);
  const [topicTags, setTopicTags] = useState<MatchTopicTag[]>(current?.topicTags ?? []);
  const [conversationPace, setConversationPace] = useState<ConversationPace | "">(current?.conversationPace ?? "");
  const [saving, setSaving] = useState(false);
  const normalizedHandle = handle.trim().replace(/^@/, "").toLowerCase();
  const canSave = displayName.trim().length >= 2 && /^[a-z0-9_]{3,30}$/.test(normalizedHandle) && !saving;

  return (
    <div className="dialogBackdrop" role="presentation">
      <form
        className="registerDialog"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) return;
          setSaving(true);
          void onSave({
            displayName: displayName.trim(),
            handle: normalizedHandle,
            ageBracket: ageBracket || null,
            languages,
            matchIntent: matchIntent || null,
            preferredAgeBrackets,
            preferredLanguages,
            topicTags,
            conversationPace: conversationPace || null
          }).then(
            (saved) => {
              if (!saved) setSaving(false);
            },
            () => setSaving(false)
          );
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
        <label>
          Your age group
          <select value={ageBracket} onChange={(event) => setAgeBracket(event.target.value as MatchAgeBracket | "")}>
            <option value="">Prefer not to say</option>
            {AGE_BRACKET_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Looking for
          <select value={matchIntent} onChange={(event) => setMatchIntent(event.target.value as MatchIntent | "")}>
            <option value="">No preference</option>
            {INTENT_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Conversation pace
          <select value={conversationPace} onChange={(event) => setConversationPace(event.target.value as ConversationPace | "")}>
            <option value="">No preference</option>
            {PACE_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <ChipSelector label="Languages you speak" options={LANGUAGE_OPTIONS} selected={languages} onChange={setLanguages} />
        <ChipSelector label="Preferred languages" options={LANGUAGE_OPTIONS} selected={preferredLanguages} onChange={setPreferredLanguages} />
        <ChipSelector label="Preferred age groups" options={AGE_BRACKET_OPTIONS} selected={preferredAgeBrackets} onChange={setPreferredAgeBrackets} />
        <ChipSelector label="Conversation topics" options={TOPIC_OPTIONS} selected={topicTags} onChange={setTopicTags} />
        <p className="formHint">Filters are mutual and optional. Empty fields keep roulette matching broad.</p>
        {error && <p className="formError">{error}</p>}
        <div className="dialogActions">
          <button className="secondaryAction compact" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primaryAction compact" type="submit" disabled={!canSave}>
            {saving ? "Saving" : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ChipSelector<T extends string>({
  label,
  options,
  selected,
  onChange
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  selected: T[];
  onChange: (next: T[]) => void;
}): JSX.Element {
  return (
    <fieldset className="chipSelector">
      <legend>{label}</legend>
      <div>
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              className={active ? "active" : ""}
              type="button"
              onClick={() => onChange(active ? selected.filter((value) => value !== option.value) : [...selected, option.value])}
              key={option.value}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
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

function reactionOutputChipCode(output: PublicReactionOutputState, analysisActive: boolean): string {
  if (!analysisActive) return "MEDIA_PAUSED";
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

function profileFilterText(profile: LocalProfile | null): string {
  if (!profile) return "Broad roulette";
  const count =
    (profile.ageBracket ? 1 : 0) +
    profile.languages.length +
    (profile.matchIntent ? 1 : 0) +
    profile.preferredAgeBrackets.length +
    profile.preferredLanguages.length +
    profile.topicTags.length +
    (profile.conversationPace ? 1 : 0);
  return count === 0 ? "Broad roulette" : `${count} active`;
}

function profileFromServer(profile: ProfileRecord): Omit<LocalProfile, "createdAtIso"> {
  return {
    displayName: profile.displayName,
    handle: profile.handle,
    ageBracket: profile.ageBracket,
    languages: profile.languages,
    matchIntent: profile.matchIntent,
    preferredAgeBrackets: profile.preferredAgeBrackets,
    preferredLanguages: profile.preferredLanguages,
    topicTags: profile.topicTags,
    conversationPace: profile.conversationPace
  };
}

function peerProfileSummary(peer: MatchPeer): string {
  const parts = [
    peer.matchIntent ? optionLabel(INTENT_OPTIONS, peer.matchIntent) : null,
    peer.languages.length ? peer.languages.map((language) => optionLabel(LANGUAGE_OPTIONS, language)).join(", ") : null,
    peer.topicTags.length ? peer.topicTags.slice(0, 2).map((topic) => optionLabel(TOPIC_OPTIONS, topic)).join(", ") : null
  ].filter(Boolean);
  return parts.length ? parts.join(" / ") : "Broad profile";
}

function optionLabel<T extends string>(options: Array<{ value: T; label: string }>, value: T): string {
  return options.find((option) => option.value === value)?.label ?? value;
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
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.volume = 1;
      void remoteVideoRef.current.play().catch(() => undefined);
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
