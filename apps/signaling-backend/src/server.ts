import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { EventRequest, ProfileRequest, ReactionOutputRequest, SessionRequest } from "@pulse-reaction/shared-schemas";
import { SynVibeStore } from "./storage.js";

const PORT = Number(process.env.SIGNALING_PORT ?? process.env.PORT ?? 1060);
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
  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/admin/summary") {
    sendJson(response, 200, store.getAdminSummary());
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
  if (request.method === "POST" && url.pathname === "/api/sessions") {
    const body = await readJson(request);
    const input: SessionRequest = {
      localUserId: readString(body, "localUserId", 64),
      route: readString(body, "route", 120)
    };
    sendJson(response, 201, store.createSession(input));
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

function normalizeHandle(handle: string): string {
  return handle.replace(/^@/, "").toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
