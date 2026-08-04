import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SynVibeStore } from "../apps/signaling-backend/src/storage.js";

test("admin summary counts privacy-safe MVP records", () => {
  const dir = mkdtempSync(join(tmpdir(), "synvibe-store-"));
  try {
    const store = new SynVibeStore(join(dir, "synvibe.sqlite"));
    const localUserId = "SV-ABCDEF-123456";

    store.upsertAnonymousUser(localUserId);
    store.upsertProfile({ localUserId, displayName: "Alex", handle: "alex" });
    const session = store.createSession({ localUserId, route: "/room" });
    store.recordEvent({ localUserId, sessionId: session.id, type: "visit", route: "/" });
    store.recordEvent({ localUserId, sessionId: session.id, type: "room_start", route: "/room" });
    store.recordEvent({ localUserId, sessionId: session.id, type: "camera_grant", route: "/room" });
    store.recordEvent({ localUserId, sessionId: session.id, type: "match_start", route: "/room" });
    store.recordEvent({ localUserId, sessionId: session.id, type: "call_connect", route: "/room" });
    store.recordEvent({ localUserId, sessionId: session.id, type: "call_disconnect", route: "/room" });
    store.recordReactionOutput({
      localUserId,
      sessionId: session.id,
      occurredAtIso: new Date().toISOString(),
      modelVersion: "reaction-model-0.1.0",
      methodVersion: "rppg-engine-0.1.0",
      state: "INSUFFICIENT_SIGNAL",
      confidence: "low",
      reasonCodes: ["MOTION_HIGH", "ROI_TOO_SMALL"],
      qualityScore: 0.2,
      regionAgreement: "low"
    });

    const summary = store.getAdminSummary();

    assert.equal(summary.visits, 1);
    assert.equal(summary.roomStarts, 1);
    assert.equal(summary.cameraGrants, 1);
    assert.equal(summary.cameraGrantRate, 1);
    assert.equal(summary.activeSessions, 1);
    assert.equal(summary.callConnects, 1);
    assert.equal(summary.callDisconnects, 1);
    assert.equal(summary.callFailures, 0);
    assert.equal(summary.callSetupSuccessRate, 1);
    assert.equal(summary.registeredUsers, 1);
    assert.equal(summary.guestUsers, 0);
    assert.equal(summary.reportCount, 0);
    assert.equal(summary.blockCount, 0);
    assert.deepEqual(summary.topModerationReasons, []);
    assert.equal(summary.sufficientSignalRatio, 0);
    assert.deepEqual(summary.topRejectionReasons, [
      { reasonCode: "MOTION_HIGH", count: 1 },
      { reasonCode: "ROI_TOO_SMALL", count: 1 }
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("ending a session records exit state for admin duration metrics", () => {
  const dir = mkdtempSync(join(tmpdir(), "synvibe-session-end-"));
  try {
    const store = new SynVibeStore(join(dir, "synvibe.sqlite"));
    const session = store.createSession({ localUserId: "SV-ENDSES-000001", route: "/room" });

    const ended = store.endSession({ localUserId: "SV-ENDSES-000001", sessionId: session.id, reason: "left" });
    const repeated = store.endSession({ localUserId: "SV-ENDSES-000001", sessionId: session.id, reason: "unload" });
    const summary = store.getAdminSummary();

    assert.equal(ended.id, session.id);
    assert.ok(ended.endedAtIso);
    assert.equal(repeated.endedAtIso, ended.endedAtIso);
    assert.equal(summary.activeSessions, 0);
    assert.equal(typeof summary.averageSessionDurationSeconds, "number");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("matchmaking pairs queued users and supports blocking the match", () => {
  const dir = mkdtempSync(join(tmpdir(), "synvibe-match-"));
  try {
    const store = new SynVibeStore(join(dir, "synvibe.sqlite"));
    store.upsertProfile({ localUserId: "SV-USERAA-000001", displayName: "Ari", handle: "ari" });
    store.upsertProfile({ localUserId: "SV-USERBB-000002", displayName: "Bo", handle: "bo" });
    const sessionA = store.createSession({ localUserId: "SV-USERAA-000001", route: "/room" });
    const sessionB = store.createSession({ localUserId: "SV-USERBB-000002", route: "/room" });

    const first = store.joinMatchmaking({ localUserId: "SV-USERAA-000001", sessionId: sessionA.id });
    assert.equal(first.status, "waiting");
    assert.equal(first.queuePosition, 1);
    assert.equal(store.getAdminSummary().waitingUsers, 1);

    const second = store.joinMatchmaking({ localUserId: "SV-USERBB-000002", sessionId: sessionB.id });
    assert.equal(second.status, "matched");
    assert.equal(second.match.peer.displayName, "Ari");

    const firstPolled = store.getMatchmakingStatus("SV-USERAA-000001");
    assert.equal(firstPolled.status, "matched");
    assert.equal(firstPolled.match.id, second.match.id);
    assert.equal(firstPolled.match.peer.displayName, "Bo");

    let summary = store.getAdminSummary();
    assert.equal(summary.waitingUsers, 0);
    assert.equal(summary.activeMatches, 1);

    const afterBlock = store.leaveMatchmaking({
      localUserId: "SV-USERAA-000001",
      matchId: second.match.id,
      reason: "blocked"
    });
    assert.equal(afterBlock.status, "idle");

    const moderationRecord = store.recordModerationReport({
      localUserId: "SV-USERAA-000001",
      matchId: second.match.id,
      reportedLocalUserId: "SV-USERBB-000002",
      type: "block",
      reason: "safety"
    });
    assert.equal(moderationRecord.type, "block");
    assert.equal(moderationRecord.reason, "safety");

    summary = store.getAdminSummary();
    assert.equal(summary.activeMatches, 0);
    assert.equal(summary.reportCount, 0);
    assert.equal(summary.blockCount, 1);
    assert.deepEqual(summary.topModerationReasons, [{ reason: "safety", count: 1 }]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("signaling relay delivers peer messages only for active matches", () => {
  const dir = mkdtempSync(join(tmpdir(), "synvibe-signal-"));
  try {
    const store = new SynVibeStore(join(dir, "synvibe.sqlite"));
    store.upsertProfile({ localUserId: "SV-SIGNAL-000001", displayName: "Cam", handle: "cam" });
    store.upsertProfile({ localUserId: "SV-SIGNAL-000002", displayName: "Dev", handle: "dev" });

    const first = store.joinMatchmaking({ localUserId: "SV-SIGNAL-000001" });
    assert.equal(first.status, "waiting");
    const second = store.joinMatchmaking({ localUserId: "SV-SIGNAL-000002" });
    assert.equal(second.status, "matched");
    const matchId = second.match.id;

    store.recordSignal({
      localUserId: "SV-SIGNAL-000001",
      matchId,
      type: "offer",
      payload: { type: "offer", sdp: "v=0" }
    });

    const senderBatch = store.getSignals("SV-SIGNAL-000001", matchId, null);
    assert.equal(senderBatch.messages.length, 0);

    const peerBatch = store.getSignals("SV-SIGNAL-000002", matchId, null);
    assert.equal(peerBatch.messages.length, 1);
    assert.equal(peerBatch.messages[0]?.senderLocalUserId, "SV-SIGNAL-000001");
    assert.equal(peerBatch.messages[0]?.type, "offer");
    assert.deepEqual(peerBatch.messages[0]?.payload, { type: "offer", sdp: "v=0" });

    const repeated = store.getSignals("SV-SIGNAL-000002", matchId, peerBatch.nextCursor);
    assert.equal(repeated.messages.length, 0);

    store.leaveMatchmaking({ localUserId: "SV-SIGNAL-000001", matchId, reason: "left" });
    assert.throws(() =>
      store.recordSignal({
        localUserId: "SV-SIGNAL-000002",
        matchId,
        type: "answer",
        payload: { type: "answer", sdp: "v=0" }
      })
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("records adults-only chat consent as a dedicated consent event", () => {
  const dir = mkdtempSync(join(tmpdir(), "synvibe-consent-"));
  try {
    const store = new SynVibeStore(join(dir, "synvibe.sqlite"));
    const session = store.createSession({ localUserId: "SV-CONSNT-000001", route: "/room" });

    const record = store.recordConsentEvent({
      localUserId: "SV-CONSNT-000001",
      sessionId: session.id,
      type: "adult_chat_terms",
      decision: "granted",
      policyVersion: "adult-chat-terms-2026-08-04",
      metadata: { route: "/room" }
    });

    assert.equal(record.sessionId, session.id);
    assert.equal(record.type, "adult_chat_terms");
    assert.equal(record.decision, "granted");
    assert.equal(record.policyVersion, "adult-chat-terms-2026-08-04");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
