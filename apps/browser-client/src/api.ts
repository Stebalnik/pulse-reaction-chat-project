import type {
  AdminSummary,
  ConsentEventRequest,
  EventRequest,
  MatchmakingStatus,
  ModerationReportRequest,
  ProfileRecord,
  SessionEndRequest,
  SessionRecord,
  WebRtcSignalBatch,
  WebRtcSignalRequest
} from "@pulse-reaction/shared-schemas";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "";

export async function ensureAnonymousUser(localUserId: string): Promise<void> {
  await post("/api/users/anonymous", { localUserId });
}

export async function saveServerProfile(input: {
  localUserId: string;
  displayName: string;
  handle: string;
}): Promise<ProfileRecord | null> {
  return post<ProfileRecord>("/api/profiles", input);
}

export async function loadServerProfile(localUserId: string): Promise<ProfileRecord | null> {
  try {
    const response = await fetch(`${API_ORIGIN}/api/profiles?localUserId=${encodeURIComponent(localUserId)}`);
    if (!response.ok) return null;
    return (await response.json()) as ProfileRecord;
  } catch {
    return null;
  }
}

export async function createServerSession(localUserId: string, route: string): Promise<SessionRecord | null> {
  return post<SessionRecord>("/api/sessions", { localUserId, route });
}

export async function endServerSession(input: SessionEndRequest, transport: "fetch" | "beacon" = "fetch"): Promise<SessionRecord | null> {
  if (transport === "beacon" && "sendBeacon" in navigator) {
    const blob = new Blob([JSON.stringify(input)], { type: "application/json" });
    navigator.sendBeacon(`${API_ORIGIN}/api/sessions/end`, blob);
    return null;
  }
  return post<SessionRecord>("/api/sessions/end", input);
}

export async function recordEvent(input: EventRequest): Promise<void> {
  await post("/api/events", input);
}

export async function recordConsentEvent(input: ConsentEventRequest): Promise<void> {
  await post("/api/consent-events", input);
}

export async function recordModerationReport(input: ModerationReportRequest): Promise<void> {
  await post("/api/moderation/reports", input);
}

export async function joinMatchmaking(localUserId: string, sessionId: string | undefined): Promise<MatchmakingStatus | null> {
  return post<MatchmakingStatus>("/api/matchmaking/join", {
    localUserId,
    ...(sessionId ? { sessionId } : {})
  });
}

export async function loadMatchmakingStatus(localUserId: string): Promise<MatchmakingStatus | null> {
  try {
    const response = await fetch(`${API_ORIGIN}/api/matchmaking/status?localUserId=${encodeURIComponent(localUserId)}`);
    if (!response.ok) return null;
    return (await response.json()) as MatchmakingStatus;
  } catch {
    return null;
  }
}

export async function leaveMatchmaking(input: {
  localUserId: string;
  matchId?: string;
  reason: "left" | "reported" | "blocked";
}): Promise<MatchmakingStatus | null> {
  return post<MatchmakingStatus>("/api/matchmaking/leave", input);
}

export async function sendSignal(input: WebRtcSignalRequest): Promise<void> {
  await post("/api/signaling/messages", input);
}

export async function loadSignals(input: {
  localUserId: string;
  matchId: string;
  after?: string | null;
}): Promise<WebRtcSignalBatch | null> {
  try {
    const params = new URLSearchParams({
      localUserId: input.localUserId,
      matchId: input.matchId
    });
    if (input.after) params.set("after", input.after);
    const response = await fetch(`${API_ORIGIN}/api/signaling/messages?${params.toString()}`);
    if (!response.ok) return null;
    return (await response.json()) as WebRtcSignalBatch;
  } catch {
    return null;
  }
}

export type AdminSummaryResult =
  | { status: "ok"; summary: AdminSummary }
  | { status: "auth_required" }
  | { status: "not_configured" }
  | { status: "offline" };

export async function loadAdminSummary(adminToken: string | null): Promise<AdminSummaryResult> {
  try {
    const response = await fetch(`${API_ORIGIN}/api/admin/summary`, {
      headers: adminToken ? { "x-synvibe-admin-token": adminToken } : {}
    });
    if (response.status === 401) return { status: "auth_required" };
    if (response.status === 503) return { status: "not_configured" };
    if (!response.ok) return { status: "offline" };
    return { status: "ok", summary: (await response.json()) as AdminSummary };
  } catch {
    return { status: "offline" };
  }
}

async function post<T = unknown>(path: string, body: unknown): Promise<T | null> {
  try {
    const response = await fetch(`${API_ORIGIN}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
