import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import type {
  ConsentEventRequest,
  MatchChatMessageDeletionRequest,
  EventRequest,
  MatchChatMessageRequest,
  MatchmakingJoinRequest,
  MatchmakingLeaveRequest,
  ModerationReportRequest,
  ModerationReportResolutionRequest,
  ProfileRequest,
  ReactionOutputRequest,
  SessionEndRequest,
  SessionRequest,
  WebRtcSignalRequest
} from "@pulse-reaction/shared-schemas";
import { SynVibeStore } from "./storage.js";

const PORT = Number(process.env.SIGNALING_PORT ?? process.env.PORT ?? 1060);
const ADMIN_TOKEN = process.env.SYNVIBE_ADMIN_TOKEN ?? null;
const store = new SynVibeStore();

const server = createServer(async (request, response) => {
  try {
    await route(request, response);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "internal_error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`SynVibe signaling backend listening on http://127.0.0.1:${PORT}`);
});

async function route(request: IncomingMessage, response: ServerResponse): Promise<void> {
  setCors(response);
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  if (request.method === "GET" && (url.pathname === "/health" || url.pathname === "/api/health")) {
    sendJson(response, 200, { ok: true });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/admin/summary") {
    if (!isAdminAuthorized(request, response)) return;
    sendJson(response, 200, store.getAdminSummary());
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/admin/moderation/reports") {
    if (!isAdminAuthorized(request, response)) return;
    const limit = Number(url.searchParams.get("limit") ?? "20");
    sendJson(response, 200, store.getModerationReports(Number.isFinite(limit) ? limit : 20, readModerationReportStatusFilter(url.searchParams.get("status"))));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/admin/moderation/reports/resolve") {
    if (!isAdminAuthorized(request, response)) return;
    const body = await readJson(request);
    const reviewerNotes = readOptionalString(body, "reviewerNotes", 500);
    const input: ModerationReportResolutionRequest = {
      reportId: readString(body, "reportId", 64),
      status: readModerationReportStatus(body),
      ...(reviewerNotes ? { reviewerNotes } : {})
    };
    sendJson(response, 200, store.resolveModerationReport(input));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/users/anonymous") {
    const body = await readJson(request);
    const localUserId = readString(body, "localUserId", 64);
    sendJson(response, 200, store.upsertAnonymousUser(localUserId));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/profiles") {
    const body = await readJson(request);
    const input: ProfileRequest = {
      localUserId: readString(body, "localUserId", 64),
      displayName: readString(body, "displayName", 80),
      handle: normalizeHandle(readString(body, "handle", 40))
    };
    sendJson(response, 200, store.upsertProfile(input));
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/profiles") {
    const localUserId = url.searchParams.get("localUserId");
    if (!localUserId) {
      sendJson(response, 400, { error: "missing_local_user_id" });
      return;
    }
    const profile = store.getProfileByLocalUserId(localUserId.slice(0, 64));
    if (!profile) {
      sendJson(response, 404, { error: "profile_not_found" });
      return;
    }
    sendJson(response, 200, profile);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/sessions") {
    const body = await readJson(request);
    const input: SessionRequest = {
      localUserId: readString(body, "localUserId", 64),
      route: readString(body, "route", 120)
    };
    sendJson(response, 201, store.createSession(input));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/sessions/end") {
    const body = await readJson(request);
    const input: SessionEndRequest = {
      localUserId: readString(body, "localUserId", 64),
      sessionId: readString(body, "sessionId", 64),
      reason: readSessionEndReason(body)
    };
    sendJson(response, 200, store.endSession(input));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/events") {
    const body = await readJson(request);
    const sessionId = readOptionalString(body, "sessionId", 64);
    const routeValue = readOptionalString(body, "route", 120);
    const metadata = readRecord(body, "metadata");
    const input: EventRequest = {
      localUserId: readString(body, "localUserId", 64),
      type: readString(body, "type", 40) as EventRequest["type"],
      ...(sessionId ? { sessionId } : {}),
      ...(routeValue ? { route: routeValue } : {}),
      ...(metadata ? { metadata } : {})
    };
    store.recordEvent(input);
    sendJson(response, 202, { ok: true });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/consent-events") {
    const body = await readJson(request);
    const sessionId = readOptionalString(body, "sessionId", 64);
    const metadata = readRecord(body, "metadata");
    const input: ConsentEventRequest = {
      localUserId: readString(body, "localUserId", 64),
      ...(sessionId ? { sessionId } : {}),
      type: readConsentType(body),
      decision: readConsentDecision(body),
      policyVersion: readString(body, "policyVersion", 80),
      ...(metadata ? { metadata } : {})
    };
    sendJson(response, 201, store.recordConsentEvent(input));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/moderation/reports") {
    const body = await readJson(request);
    const matchId = readOptionalString(body, "matchId", 64);
    const reportedLocalUserId = readOptionalString(body, "reportedLocalUserId", 64);
    const notes = readOptionalString(body, "notes", 500);
    const input: ModerationReportRequest = {
      localUserId: readString(body, "localUserId", 64),
      ...(matchId ? { matchId } : {}),
      ...(reportedLocalUserId ? { reportedLocalUserId } : {}),
      type: readModerationReportType(body),
      reason: readModerationReportReason(body),
      ...(notes ? { notes } : {})
    };
    sendJson(response, 201, store.recordModerationReport(input));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/matchmaking/join") {
    const body = await readJson(request);
    const sessionId = readOptionalString(body, "sessionId", 64);
    const input: MatchmakingJoinRequest = {
      localUserId: readString(body, "localUserId", 64),
      ...(sessionId ? { sessionId } : {})
    };
    const status = store.joinMatchmaking(input);
    store.recordEvent({
      localUserId: input.localUserId,
      ...(sessionId ? { sessionId } : {}),
      type: status.status === "matched" ? "match_start" : "match_wait",
      route: "/room",
      metadata:
        status.status === "matched"
          ? { matchId: status.match.id }
          : status.status === "waiting"
            ? { queuePosition: status.queuePosition }
            : {}
    });
    sendJson(response, 200, status);
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/matchmaking/status") {
    const localUserId = url.searchParams.get("localUserId");
    if (!localUserId) {
      sendJson(response, 400, { error: "missing_local_user_id" });
      return;
    }
    sendJson(response, 200, store.getMatchmakingStatus(localUserId.slice(0, 64)));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/matchmaking/leave") {
    const body = await readJson(request);
    const matchId = readOptionalString(body, "matchId", 64);
    const input: MatchmakingLeaveRequest = {
      localUserId: readString(body, "localUserId", 64),
      ...(matchId ? { matchId } : {}),
      reason: readLeaveReason(body)
    };
    const status = store.leaveMatchmaking(input);
    store.recordEvent({
      localUserId: input.localUserId,
      type: input.reason === "reported" ? "report" : input.reason === "blocked" ? "block" : "match_leave",
      route: "/room",
      metadata: { matchId: input.matchId ?? null, reason: input.reason }
    });
    sendJson(response, 200, status);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/signaling/messages") {
    const body = await readJson(request);
    const input: WebRtcSignalRequest = {
      localUserId: readString(body, "localUserId", 64),
      matchId: readString(body, "matchId", 64),
      type: readSignalType(body),
      payload: readRequiredRecord(body, "payload")
    };
    sendJson(response, 202, store.recordSignal(input));
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/signaling/messages") {
    const localUserId = url.searchParams.get("localUserId");
    const matchId = url.searchParams.get("matchId");
    if (!localUserId || !matchId) {
      sendJson(response, 400, { error: "missing_signaling_query" });
      return;
    }
    sendJson(response, 200, store.getSignals(localUserId.slice(0, 64), matchId.slice(0, 64), url.searchParams.get("after")));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/match-chat/messages") {
    const body = await readJson(request);
    const input: MatchChatMessageRequest = {
      localUserId: readString(body, "localUserId", 64),
      matchId: readString(body, "matchId", 64),
      body: readString(body, "body", 800)
    };
    const message = store.recordChatMessage(input);
    store.recordEvent({
      localUserId: input.localUserId,
      type: "chat_message",
      route: "/room",
      metadata: { matchId: input.matchId, messageId: message.id, bodyLength: input.body.length }
    });
    sendJson(response, 201, message);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/match-chat/messages/delete") {
    const body = await readJson(request);
    const input: MatchChatMessageDeletionRequest = {
      localUserId: readString(body, "localUserId", 64),
      matchId: readString(body, "matchId", 64),
      messageId: readString(body, "messageId", 64)
    };
    const message = store.deleteChatMessage(input);
    store.recordEvent({
      localUserId: input.localUserId,
      type: "chat_delete",
      route: "/room",
      metadata: { matchId: input.matchId, messageId: input.messageId }
    });
    sendJson(response, 200, message);
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/match-chat/messages") {
    const localUserId = url.searchParams.get("localUserId");
    const matchId = url.searchParams.get("matchId");
    if (!localUserId || !matchId) {
      sendJson(response, 400, { error: "missing_chat_query" });
      return;
    }
    sendJson(response, 200, store.getChatMessages(localUserId.slice(0, 64), matchId.slice(0, 64), url.searchParams.get("after")));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/reaction-outputs") {
    const body = await readJson(request);
    const sessionId = readOptionalString(body, "sessionId", 64);
    const input: ReactionOutputRequest = {
      localUserId: readString(body, "localUserId", 64),
      ...(sessionId ? { sessionId } : {}),
      occurredAtIso: readString(body, "occurredAtIso", 40),
      modelVersion: readString(body, "modelVersion", 80),
      methodVersion: readString(body, "methodVersion", 80),
      state: readString(body, "state", 40) as ReactionOutputRequest["state"],
      confidence: readString(body, "confidence", 12) as ReactionOutputRequest["confidence"],
      reasonCodes: readStringArray(body, "reasonCodes", 20),
      qualityScore: readNumber(body, "qualityScore"),
      regionAgreement: readString(body, "regionAgreement", 20) as ReactionOutputRequest["regionAgreement"]
    };
    store.recordReactionOutput(input);
    sendJson(response, 202, { ok: true });
    return;
  }

  sendJson(response, 404, { error: "not_found" });
}

function setCors(response: ServerResponse): void {
  response.setHeader("Access-Control-Allow-Origin", process.env.LOCAL_APP_ORIGIN ?? "http://127.0.0.1:1059");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "content-type");
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function isAdminAuthorized(request: IncomingMessage, response: ServerResponse): boolean {
  if (!ADMIN_TOKEN) {
    sendJson(response, 503, { error: "admin_auth_not_configured" });
    return false;
  }
  const suppliedToken = request.headers["x-synvibe-admin-token"];
  if (typeof suppliedToken !== "string" || !tokensEqual(suppliedToken, ADMIN_TOKEN)) {
    sendJson(response, 401, { error: "admin_auth_required" });
    return false;
  }
  return true;
}

function tokensEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (!isRecord(parsed)) throw new Error("Expected JSON object body");
  return parsed;
}

function readString(body: Record<string, unknown>, key: string, maxLength: number): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`Missing string: ${key}`);
  return value.trim().slice(0, maxLength);
}

function readOptionalString(body: Record<string, unknown>, key: string, maxLength: number): string | undefined {
  const value = body[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, maxLength) : undefined;
}

function readRecord(body: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = body[key];
  return isRecord(value) ? value : undefined;
}

function readRequiredRecord(body: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = readRecord(body, key);
  if (!value) throw new Error(`Missing object: ${key}`);
  return value;
}

function readStringArray(body: Record<string, unknown>, key: string, maxItems: number): string[] {
  const value = body[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").slice(0, maxItems);
}

function readNumber(body: Record<string, unknown>, key: string): number {
  const value = body[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Missing number: ${key}`);
  return value;
}

function readLeaveReason(body: Record<string, unknown>): MatchmakingLeaveRequest["reason"] {
  const reason = readString(body, "reason", 20);
  if (reason === "left" || reason === "reported" || reason === "blocked") return reason;
  throw new Error(`Invalid leave reason: ${reason}`);
}

function readSessionEndReason(body: Record<string, unknown>): SessionEndRequest["reason"] {
  const reason = readString(body, "reason", 20);
  if (reason === "left" || reason === "unload" || reason === "replaced" || reason === "error") return reason;
  throw new Error(`Invalid session end reason: ${reason}`);
}

function readModerationReportType(body: Record<string, unknown>): ModerationReportRequest["type"] {
  const type = readString(body, "type", 20);
  if (type === "report" || type === "block") return type;
  throw new Error(`Invalid moderation report type: ${type}`);
}

function readModerationReportReason(body: Record<string, unknown>): ModerationReportRequest["reason"] {
  const reason = readString(body, "reason", 30);
  if (reason === "safety" || reason === "harassment" || reason === "underage" || reason === "spam" || reason === "other") {
    return reason;
  }
  throw new Error(`Invalid moderation report reason: ${reason}`);
}

function readModerationReportStatus(body: Record<string, unknown>): ModerationReportResolutionRequest["status"] {
  const status = readString(body, "status", 20);
  if (status === "open" || status === "resolved" || status === "dismissed") return status;
  throw new Error(`Invalid moderation report status: ${status}`);
}

function readModerationReportStatusFilter(value: string | null): "all" | ModerationReportResolutionRequest["status"] {
  if (!value || value === "all") return "all";
  if (value === "open" || value === "resolved" || value === "dismissed") return value;
  throw new Error(`Invalid moderation report status filter: ${value}`);
}

function readSignalType(body: Record<string, unknown>): WebRtcSignalRequest["type"] {
  const type = readString(body, "type", 20);
  if (type === "offer" || type === "answer" || type === "candidate") return type;
  throw new Error(`Invalid signal type: ${type}`);
}

function readConsentType(body: Record<string, unknown>): ConsentEventRequest["type"] {
  const type = readString(body, "type", 40);
  if (type === "adult_chat_terms" || type === "camera_access" || type === "physiological_analysis" || type === "research_feedback") return type;
  throw new Error(`Invalid consent type: ${type}`);
}

function readConsentDecision(body: Record<string, unknown>): ConsentEventRequest["decision"] {
  const decision = readString(body, "decision", 20);
  if (decision === "granted" || decision === "revoked") return decision;
  throw new Error(`Invalid consent decision: ${decision}`);
}

function normalizeHandle(handle: string): string {
  return handle.replace(/^@/, "").toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
