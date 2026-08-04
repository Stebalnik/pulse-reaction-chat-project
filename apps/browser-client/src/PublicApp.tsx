import { Activity, Camera, CircleUserRound, HeartPulse, Play, ShieldCheck, UserPlus, Video } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createServerSession, ensureAnonymousUser, recordEvent, saveServerProfile } from "./api.js";
import { getOrCreateAnonymousUserId, loadLocalProfile, saveLocalProfile, type LocalProfile } from "./identity.js";

const APP_NAME = import.meta.env.VITE_APP_NAME ?? "SynVibe";

export function PublicApp(): JSX.Element {
  const userId = useMemo(() => getOrCreateAnonymousUserId(), []);
  const [profile, setProfile] = useState<LocalProfile | null>(() => loadLocalProfile());
  const [registerOpen, setRegisterOpen] = useState(false);
  const [inRoom, setInRoom] = useState(location.pathname === "/room");

  const enterRoom = (): void => {
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
          <a className="textButton ghost" href="/admin">
            Admin
          </a>
        </div>
      </header>

      {inRoom ? (
        <PublicRoom userId={userId} profile={profile} />
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
    </main>
  );
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

function PublicRoom({ userId, profile }: { userId: string; profile: LocalProfile | null }): JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();

  useEffect(() => {
    void createServerSession(userId, "/room").then((session) => setSessionId(session?.id));
  }, [userId]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    if (!cameraEnabled) {
      stopVideo(videoRef.current);
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
        setCameraError(null);
        void recordRoomEvent(userId, sessionId, "camera_grant");
      })
      .catch(() => setCameraError("Camera unavailable"));

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      if (stream) void recordRoomEvent(userId, sessionId, "camera_pause");
    };
  }, [cameraEnabled, sessionId, userId]);

  return (
    <section className="publicRoom">
      <div className="roomHeader">
        <div>
          <span>Roulette room</span>
          <strong>{profile?.displayName ?? userId}</strong>
        </div>
        <button className={`primaryAction compact ${cameraEnabled ? "active" : ""}`} type="button" onClick={() => setCameraEnabled((value) => !value)}>
          <Camera aria-hidden="true" />
          {cameraEnabled ? "Pause camera" : "Enable camera"}
        </button>
      </div>

      <div className="publicCallGrid">
        <article className="publicVideoPane">
          {cameraEnabled ? <video ref={videoRef} autoPlay muted playsInline /> : <EmptyVideo label="Camera off" />}
          {cameraError && <div className="publicStatus danger">{cameraError}</div>}
          <div className="publicVideoLabel">You</div>
        </article>
        <article className="publicVideoPane peerPane">
          <div className="peerMock">
            <ShieldCheck aria-hidden="true" />
            <span>Waiting for peer</span>
            <strong>Reaction patterns will appear here</strong>
          </div>
          <div className="publicReactionStack" aria-label="Peer reaction patterns">
            <ReactionChip code="STEADY" label="Steady" />
            <ReactionChip code="SOFT_LIFT" label="Soft lift" />
            <ReactionChip code="SETTLING" label="Settling" />
          </div>
          <div className="publicVideoLabel">Peer</div>
        </article>
      </div>
    </section>
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
