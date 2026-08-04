import type {
  AdminSummary,
  ConsentEventRequest,
  EventRequest,
  MatchChatBatch,
  MatchChatMessage,
  MatchChatMessageDeletionRequest,
  MatchChatMessageRequest,
  MatchmakingStatus,
  ModerationReportQueue,
  ModerationReportQueueItem,
  ModerationReportRequest,
  ModerationReportResolutionRequest,
  ModerationReportStatusFilter,
  ProfileRecord,
  ReactionOutputRequest,
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

export async function recordReactionOutput(input: ReactionOutputRequest): Promise<boolean> {
  return (await post("/api/reaction-outputs", input)) !== null;
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

export async function sendChatMessage(input: MatchChatMessageRequest): Promise<MatchChatMessage | null> {
  return post<MatchChatMessage>("/api/match-chat/messages", input);
}

export async function deleteChatMessage(input: MatchChatMessageDeletionRequest): Promise<MatchChatMessage | null> {
  return post<MatchChatMessage>("/api/match-chat/messages/delete", input);
}

export async function loadChatMessages(input: {
  localUserId: string;
  matchId: string;
  after?: string | null;
}): Promise<MatchChatBatch | null> {
  try {
    const params = new URLSearchParams({
      localUserId: input.localUserId,
      matchId: input.matchId
    });
    if (input.after) params.set("after", input.after);
    const response = await fetch(`${API_ORIGIN}/api/match-chat/messages?${params.toString()}`);
    if (!response.ok) return null;
    return (await response.json()) as MatchChatBatch;
  } catch {
    return null;
  }
}

export type AdminSummaryResult =
  | { status: "ok"; summary: AdminSummary }
  | { status: "auth_required" }
  | { status: "forbidden" }
  | { status: "not_configured" }
  | { status: "offline" };

export type ModerationReportsResult =
  | { status: "ok"; queue: ModerationReportQueue }
  | { status: "auth_required" }
  | { status: "forbidden" }
  | { status: "not_configured" }
  | { status: "offline" };

export async function loadAdminSummary(adminToken: string | null): Promise<AdminSummaryResult> {
  try {
    const response = await fetch(`${API_ORIGIN}/api/admin/summary`, {
      headers: adminToken ? { "x-synvibe-admin-token": adminToken } : {}
    });
    if (response.status === 401) return { status: "auth_required" };
    if (response.status === 403) return { status: "forbidden" };
    if (response.status === 503) return { status: "not_configured" };
    if (!response.ok) return { status: "offline" };
    return { status: "ok", summary: (await response.json()) as AdminSummary };
  } catch {
    return { status: "offline" };
  }
}

export async function loadModerationReports(adminToken: string | null, statusFilter: ModerationReportStatusFilter = "all"): Promise<ModerationReportsResult> {
  try {
    const params = new URLSearchParams({ limit: "20", status: statusFilter });
    const response = await fetch(`${API_ORIGIN}/api/admin/moderation/reports?${params.toString()}`, {
      headers: adminToken ? { "x-synvibe-admin-token": adminToken } : {}
    });
    if (response.status === 401) return { status: "auth_required" };
    if (response.status === 403) return { status: "forbidden" };
    if (response.status === 503) return { status: "not_configured" };
    if (!response.ok) return { status: "offline" };
    return { status: "ok", queue: (await response.json()) as ModerationReportQueue };
  } catch {
    return { status: "offline" };
  }
}

export async function resolveModerationReport(adminToken: string | null, reviewerId: string | null, input: ModerationReportResolutionRequest): Promise<ModerationReportQueueItem | null> {
  try {
    const response = await fetch(`${API_ORIGIN}/api/admin/moderation/reports/resolve`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(adminToken ? { "x-synvibe-admin-token": adminToken } : {}),
        ...(reviewerId ? { "x-synvibe-reviewer-id": reviewerId } : {})
      },
      body: JSON.stringify(input)
    });
    if (!response.ok) return null;
    return (await response.json()) as ModerationReportQueueItem;
  } catch {
    return null;
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
