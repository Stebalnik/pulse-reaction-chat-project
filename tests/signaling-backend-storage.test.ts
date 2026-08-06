import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
    store.recordConsentEvent({
      localUserId,
      sessionId: session.id,
      type: "physiological_analysis",
      decision: "granted",
      policyVersion: "physiological-analysis-2026-08-04"
    });
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
    assert.equal(summary.chatMessages, 0);
    assert.equal(summary.registeredUsers, 1);
    assert.equal(summary.guestUsers, 0);
    assert.equal(summary.reportCount, 0);
    assert.equal(summary.blockCount, 0);
    assert.deepEqual(summary.topModerationReasons, []);
    assert.equal(summary.sufficientSignalRatio, 0);
    assert.equal(summary.reactionOutputCount, 1);
    assert.deepEqual(summary.reactionStateCounts, [{ state: "INSUFFICIENT_SIGNAL", count: 1 }]);
    assert.deepEqual(summary.reactionConfidenceCounts, [{ confidence: "low", count: 1 }]);
    assert.deepEqual(summary.reactionRegionAgreementCounts, [{ regionAgreement: "low", count: 1 }]);
    assert.deepEqual(summary.topRejectionReasons, [
      { reasonCode: "MOTION_HIGH", count: 1 },
      { reasonCode: "ROI_TOO_SMALL", count: 1 }
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("reaction outputs require active physiological-analysis consent", () => {
  const dir = mkdtempSync(join(tmpdir(), "synvibe-reaction-consent-"));
  try {
    const store = new SynVibeStore(join(dir, "synvibe.sqlite"));
    const localUserId = "SV-RXCONS-000001";
    const session = store.createSession({ localUserId, route: "/room" });
    const output = {
      localUserId,
      sessionId: session.id,
      occurredAtIso: new Date().toISOString(),
      modelVersion: "reaction-model-0.1.0",
      methodVersion: "rppg-engine-0.1.0",
      state: "NEAR_BASELINE" as const,
      confidence: "medium" as const,
      reasonCodes: [],
      qualityScore: 0.82,
      regionAgreement: "high" as const
    };

    assert.throws(() => store.recordReactionOutput(output));
    store.recordConsentEvent({
      localUserId,
      sessionId: session.id,
      type: "physiological_analysis",
      decision: "granted",
      policyVersion: "physiological-analysis-2026-08-04"
    });
    assert.doesNotThrow(() => store.recordReactionOutput(output));
    store.recordConsentEvent({
      localUserId,
      sessionId: session.id,
      type: "physiological_analysis",
      decision: "revoked",
      policyVersion: "physiological-analysis-2026-08-04"
    });
    assert.throws(() => store.recordReactionOutput({ ...output, occurredAtIso: new Date().toISOString() }));
    const summary = store.getAdminSummary();
    assert.equal(summary.sufficientSignalRatio, 1);
    assert.equal(summary.reactionOutputCount, 1);
    assert.deepEqual(summary.reactionStateCounts, [{ state: "NEAR_BASELINE", count: 1 }]);
    assert.deepEqual(summary.reactionConfidenceCounts, [{ confidence: "medium", count: 1 }]);
    assert.deepEqual(summary.reactionRegionAgreementCounts, [{ regionAgreement: "high", count: 1 }]);
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

test("profiles can be loaded and updated by anonymous user id", () => {
  const dir = mkdtempSync(join(tmpdir(), "synvibe-profile-"));
  try {
    const store = new SynVibeStore(join(dir, "synvibe.sqlite"));
    const localUserId = "SV-PROFIL-000001";

    assert.equal(store.getProfileByLocalUserId(localUserId), null);
    const first = store.upsertProfile({ localUserId, displayName: "Mira", handle: "mira" });
    const loaded = store.getProfileByLocalUserId(localUserId);
    const updated = store.upsertProfile({ localUserId, displayName: "Mira K", handle: "mira_k" });

    assert.equal(loaded?.id, first.id);
    assert.equal(loaded?.displayName, "Mira");
    assert.equal(updated.id, first.id);
    assert.equal(store.getProfileByLocalUserId(localUserId)?.handle, "mira_k");
    assert.throws(() => store.upsertProfile({ localUserId: "SV-PROFIL-000002", displayName: "Other Mira", handle: "mira_k" }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("matchmaking requires active adults-only chat consent", () => {
  const dir = mkdtempSync(join(tmpdir(), "synvibe-match-consent-"));
  try {
    const store = new SynVibeStore(join(dir, "synvibe.sqlite"));
    const localUserId = "SV-NOADLT-000001";
    const session = store.createSession({ localUserId, route: "/room" });

    const rejected = store.joinMatchmaking({ localUserId, sessionId: session.id });
    assert.deepEqual(rejected, { status: "ineligible", reason: "adult_chat_terms_required" });
    assert.equal(store.getAdminSummary().waitingUsers, 0);

    grantAdultChatTerms(store, localUserId, session.id);
    const accepted = store.joinMatchmaking({ localUserId, sessionId: session.id });
    assert.equal(accepted.status, "waiting");
    assert.equal(store.getAdminSummary().waitingUsers, 1);
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
    grantAdultChatTerms(store, "SV-USERAA-000001", sessionA.id);
    grantAdultChatTerms(store, "SV-USERBB-000002", sessionB.id);

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
      reason: "harassment",
      notes: "Ignored boundary after warning"
    });
    assert.equal(moderationRecord.type, "block");
    assert.equal(moderationRecord.reason, "harassment");
    const repeatReport = store.recordModerationReport({
      localUserId: "SV-USERCC-000003",
      reportedLocalUserId: "SV-USERBB-000002",
      type: "report",
      reason: "spam",
      notes: "Suspicious payment link"
    });

    const queue = store.getModerationReports(10);
    assert.equal(queue.reports.length, 2);
    assert.equal(queue.reports[0]?.reportedLocalUserId, "SV-USERBB-000002");
    assert.equal(queue.reports[0]?.status, "open");
    assert.equal(queue.reports[0]?.reportedUserOpenReports, 2);
    assert.equal(queue.reports[0]?.reportedUserTotalReports, 2);

    const resolved = store.resolveModerationReport({
      reportId: moderationRecord.id,
      status: "resolved",
      reviewerId: "ops-alex",
      reviewerNotes: "Reviewed and kept block in place"
    });
    assert.equal(resolved.status, "resolved");
    assert.equal(resolved.reviewerId, "ops-alex");
    assert.equal(resolved.reviewerNotes, "Reviewed and kept block in place");
    assert.ok(resolved.resolvedAtIso);

    const reopened = store.resolveModerationReport({ reportId: moderationRecord.id, status: "open", reviewerId: "ops-riley" });
    assert.equal(reopened.status, "open");
    assert.equal(reopened.reviewerId, "ops-riley");
    assert.equal(reopened.resolvedAtIso, null);
    store.resolveModerationReport({ reportId: repeatReport.id, status: "dismissed" });
    const openQueue = store.getModerationReports(10, "open");
    const dismissedQueue = store.getModerationReports(10, "dismissed");
    assert.equal(openQueue.reports.every((report) => report.status === "open"), true);
    assert.equal(dismissedQueue.reports.length, 1);
    assert.equal(dismissedQueue.reports[0]?.status, "dismissed");

    summary = store.getAdminSummary();
    assert.equal(summary.activeMatches, 0);
    assert.equal(summary.reportCount, 1);
    assert.equal(summary.blockCount, 1);
    assert.deepEqual(summary.topModerationReasons, [
      { reason: "harassment", count: 1 },
      { reason: "spam", count: 1 }
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("matchmaking respects mutual profile filters", () => {
  const dir = mkdtempSync(join(tmpdir(), "synvibe-match-filters-"));
  try {
    const store = new SynVibeStore(join(dir, "synvibe.sqlite"));
    store.upsertProfile({
      localUserId: "SV-FILTRA-000001",
      displayName: "Ari",
      handle: "filter_ari",
      ageBracket: "25_34",
      languages: ["en"],
      matchIntent: "dating",
      preferredAgeBrackets: ["25_34"],
      preferredLanguages: ["en"],
      topicTags: ["music", "travel"],
      conversationPace: "balanced"
    });
    store.upsertProfile({
      localUserId: "SV-FILTRB-000002",
      displayName: "Bo",
      handle: "filter_bo",
      ageBracket: "45_54",
      languages: ["ru"],
      matchIntent: "friendship",
      preferredAgeBrackets: ["45_54"],
      preferredLanguages: ["ru"],
      topicTags: ["sports"],
      conversationPace: "calm"
    });
    store.upsertProfile({
      localUserId: "SV-FILTRC-000003",
      displayName: "Cam",
      handle: "filter_cam",
      ageBracket: "25_34",
      languages: ["en"],
      matchIntent: "dating",
      preferredAgeBrackets: ["25_34"],
      preferredLanguages: ["en"],
      topicTags: ["music"],
      conversationPace: "high_energy"
    });
    const sessionA = store.createSession({ localUserId: "SV-FILTRA-000001", route: "/room" });
    const sessionB = store.createSession({ localUserId: "SV-FILTRB-000002", route: "/room" });
    const sessionC = store.createSession({ localUserId: "SV-FILTRC-000003", route: "/room" });
    grantAdultChatTerms(store, "SV-FILTRA-000001", sessionA.id);
    grantAdultChatTerms(store, "SV-FILTRB-000002", sessionB.id);
    grantAdultChatTerms(store, "SV-FILTRC-000003", sessionC.id);

    assert.equal(store.joinMatchmaking({ localUserId: "SV-FILTRA-000001", sessionId: sessionA.id }).status, "waiting");
    assert.equal(store.joinMatchmaking({ localUserId: "SV-FILTRB-000002", sessionId: sessionB.id }).status, "waiting");
    const compatible = store.joinMatchmaking({ localUserId: "SV-FILTRC-000003", sessionId: sessionC.id });

    assert.equal(compatible.status, "matched");
    assert.equal(compatible.match.peer.displayName, "Ari");
    assert.equal(store.getMatchmakingStatus("SV-FILTRB-000002").status, "waiting");
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
    grantAdultChatTerms(store, "SV-SIGNAL-000001");
    grantAdultChatTerms(store, "SV-SIGNAL-000002");

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

test("peer pulse relay delivers estimated BPM only to the matched peer", () => {
  const dir = mkdtempSync(join(tmpdir(), "synvibe-peer-pulse-"));
  try {
    const store = new SynVibeStore(join(dir, "synvibe.sqlite"));
    store.upsertProfile({ localUserId: "SV-PULSEA-000001", displayName: "Cam", handle: "pulsea" });
    store.upsertProfile({ localUserId: "SV-PULSEB-000002", displayName: "Dev", handle: "pulseb" });
    grantAdultChatTerms(store, "SV-PULSEA-000001");
    grantAdultChatTerms(store, "SV-PULSEB-000002");

    const first = store.joinMatchmaking({ localUserId: "SV-PULSEA-000001" });
    assert.equal(first.status, "waiting");
    const second = store.joinMatchmaking({ localUserId: "SV-PULSEB-000002" });
    assert.equal(second.status, "matched");
    const matchId = second.match.id;

    const message = store.recordPeerPulse({
      localUserId: "SV-PULSEA-000001",
      matchId,
      bpmEstimate: 82,
      qualityScore: 0.74,
      occurredAtIso: new Date().toISOString()
    });

    assert.equal(message.senderLocalUserId, "SV-PULSEA-000001");
    const senderBatch = store.getPeerPulseMessages("SV-PULSEA-000001", matchId, null);
    assert.equal(senderBatch.messages.length, 0);

    const peerBatch = store.getPeerPulseMessages("SV-PULSEB-000002", matchId, null);
    assert.equal(peerBatch.messages.length, 1);
    assert.equal(peerBatch.messages[0]?.senderLocalUserId, "SV-PULSEA-000001");
    assert.equal(peerBatch.messages[0]?.bpmEstimate, 82);
    assert.equal(peerBatch.messages[0]?.qualityScore, 0.74);

    const repeated = store.getPeerPulseMessages("SV-PULSEB-000002", matchId, peerBatch.nextCursor);
    assert.equal(repeated.messages.length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("match chat stores messages only for active match participants", () => {
  const dir = mkdtempSync(join(tmpdir(), "synvibe-chat-"));
  try {
    const store = new SynVibeStore(join(dir, "synvibe.sqlite"));
    store.upsertProfile({ localUserId: "SV-CHATX-000001", displayName: "Eli", handle: "eli" });
    store.upsertProfile({ localUserId: "SV-CHATX-000002", displayName: "Fran", handle: "fran" });
    grantAdultChatTerms(store, "SV-CHATX-000001");
    grantAdultChatTerms(store, "SV-CHATX-000002");
    const first = store.joinMatchmaking({ localUserId: "SV-CHATX-000001" });
    assert.equal(first.status, "waiting");
    const second = store.joinMatchmaking({ localUserId: "SV-CHATX-000002" });
    assert.equal(second.status, "matched");
    const matchId = second.match.id;

    const message = store.recordChatMessage({
      localUserId: "SV-CHATX-000001",
      matchId,
      body: "Hi from the live room"
    });
    assert.equal(message.body, "Hi from the live room");

    const peerBatch = store.getChatMessages("SV-CHATX-000002", matchId, null);
    assert.equal(peerBatch.messages.length, 1);
    assert.equal(peerBatch.messages[0]?.senderLocalUserId, "SV-CHATX-000001");
    assert.equal(peerBatch.messages[0]?.body, "Hi from the live room");
    assert.equal(store.getAdminSummary().chatMessages, 1);

    const deleted = store.deleteChatMessage({
      localUserId: "SV-CHATX-000001",
      matchId,
      messageId: message.id
    });
    assert.equal(deleted.id, message.id);
    assert.equal(deleted.body, null);
    assert.equal(deleted.deletedByLocalUserId, "SV-CHATX-000001");
    assert.ok(deleted.deletedAtIso);

    const peerTombstoneBatch = store.getChatMessages("SV-CHATX-000002", matchId, peerBatch.nextCursor);
    assert.equal(peerTombstoneBatch.messages.length, 1);
    assert.equal(peerTombstoneBatch.messages[0]?.id, message.id);
    assert.equal(peerTombstoneBatch.messages[0]?.body, null);
    assert.equal(peerTombstoneBatch.messages[0]?.deletedByLocalUserId, "SV-CHATX-000001");
    assert.equal(store.getAdminSummary().chatMessages, 0);
    assert.throws(() =>
      store.deleteChatMessage({
        localUserId: "SV-CHATX-000002",
        matchId,
        messageId: message.id
      })
    );

    assert.throws(() => store.getChatMessages("SV-CHATX-000003", matchId, null));
    store.leaveMatchmaking({ localUserId: "SV-CHATX-000001", matchId, reason: "left" });
    assert.throws(() =>
      store.recordChatMessage({
        localUserId: "SV-CHATX-000002",
        matchId,
        body: "After close"
      })
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("match chat retention prunes expired message rows", () => {
  const dir = mkdtempSync(join(tmpdir(), "synvibe-chat-retention-"));
  const previousRetention = process.env.SYNVIBE_CHAT_RETENTION_HOURS;
  process.env.SYNVIBE_CHAT_RETENTION_HOURS = "1";
  try {
    const store = new SynVibeStore(join(dir, "synvibe.sqlite"));
    grantAdultChatTerms(store, "SV-KEEPX-000001");
    grantAdultChatTerms(store, "SV-KEEPX-000002");
    const first = store.joinMatchmaking({ localUserId: "SV-KEEPX-000001" });
    assert.equal(first.status, "waiting");
    const second = store.joinMatchmaking({ localUserId: "SV-KEEPX-000002" });
    assert.equal(second.status, "matched");
    const matchId = second.match.id;
    const message = store.recordChatMessage({
      localUserId: "SV-KEEPX-000001",
      matchId,
      body: "This should expire"
    });

    execFileSync("sqlite3", [
      store.dbPath,
      `UPDATE chat_messages SET created_at = '2000-01-01T00:00:00.000Z' WHERE id = '${message.id.replaceAll("'", "''")}';`
    ]);

    const batch = store.getChatMessages("SV-KEEPX-000002", matchId, null);
    assert.equal(batch.messages.length, 0);
    assert.equal(store.getAdminSummary().chatMessages, 0);
  } finally {
    if (previousRetention === undefined) {
      delete process.env.SYNVIBE_CHAT_RETENTION_HOURS;
    } else {
      process.env.SYNVIBE_CHAT_RETENTION_HOURS = previousRetention;
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

test("moderation reports can reference retained or deleted peer messages", () => {
  const dir = mkdtempSync(join(tmpdir(), "synvibe-message-report-"));
  const previousRetention = process.env.SYNVIBE_CHAT_RETENTION_HOURS;
  process.env.SYNVIBE_CHAT_RETENTION_HOURS = "1";
  try {
    const store = new SynVibeStore(join(dir, "synvibe.sqlite"));
    grantAdultChatTerms(store, "SV-MSGRP-000001");
    grantAdultChatTerms(store, "SV-MSGRP-000002");
    const first = store.joinMatchmaking({ localUserId: "SV-MSGRP-000001" });
    assert.equal(first.status, "waiting");
    const second = store.joinMatchmaking({ localUserId: "SV-MSGRP-000002" });
    assert.equal(second.status, "matched");
    const matchId = second.match.id;
    const peerMessage = store.recordChatMessage({
      localUserId: "SV-MSGRP-000002",
      matchId,
      body: "A specific message to review safely"
    });
    const ownMessage = store.recordChatMessage({
      localUserId: "SV-MSGRP-000001",
      matchId,
      body: "Do not let me report myself"
    });

    const report = store.recordModerationReport({
      localUserId: "SV-MSGRP-000001",
      matchId,
      reportedLocalUserId: "SV-MSGRP-000002",
      reportedMessageId: peerMessage.id,
      type: "report",
      reason: "harassment",
      notes: "Message crossed a boundary"
    });
    assert.equal(report.reportedMessageId, peerMessage.id);

    let queue = store.getModerationReports(10, "open");
    assert.equal(queue.reports[0]?.reportedMessageId, peerMessage.id);
    assert.equal(queue.reports[0]?.reportedMessageStatus, "retained");
    assert.equal(queue.reports[0]?.reportedMessageSenderLocalUserId, "SV-MSGRP-000002");
    assert.equal(queue.reports[0]?.reportedMessageExcerpt, "A specific message to review safely");

    store.deleteChatMessage({ localUserId: "SV-MSGRP-000002", matchId, messageId: peerMessage.id });
    queue = store.getModerationReports(10, "open");
    assert.equal(queue.reports[0]?.reportedMessageStatus, "deleted");
    assert.equal(queue.reports[0]?.reportedMessageExcerpt, null);

    execFileSync("sqlite3", [
      store.dbPath,
      `UPDATE chat_messages SET created_at = '2000-01-01T00:00:00.000Z' WHERE id = '${peerMessage.id.replaceAll("'", "''")}';`
    ]);
    queue = store.getModerationReports(10, "open");
    assert.equal(queue.reports[0]?.reportedMessageStatus, "expired_or_unavailable");
    assert.equal(queue.reports[0]?.reportedMessageExcerpt, null);

    assert.throws(() =>
      store.recordModerationReport({
        localUserId: "SV-MSGRP-000001",
        matchId,
        reportedLocalUserId: "SV-MSGRP-000002",
        reportedMessageId: ownMessage.id,
        type: "report",
        reason: "other"
      })
    );
  } finally {
    if (previousRetention === undefined) {
      delete process.env.SYNVIBE_CHAT_RETENTION_HOURS;
    } else {
      process.env.SYNVIBE_CHAT_RETENTION_HOURS = previousRetention;
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

test("records policy-versioned consent grant and revoke events", () => {
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
    const analysisGrant = store.recordConsentEvent({
      localUserId: "SV-CONSNT-000001",
      sessionId: session.id,
      type: "physiological_analysis",
      decision: "granted",
      policyVersion: "physiological-analysis-2026-08-04",
      metadata: { localOnly: true, precisePeerBpmShared: false }
    });
    const analysisRevoke = store.recordConsentEvent({
      localUserId: "SV-CONSNT-000001",
      sessionId: session.id,
      type: "physiological_analysis",
      decision: "revoked",
      policyVersion: "physiological-analysis-2026-08-04"
    });

    assert.equal(analysisGrant.type, "physiological_analysis");
    assert.equal(analysisGrant.decision, "granted");
    assert.equal(analysisRevoke.type, "physiological_analysis");
    assert.equal(analysisRevoke.decision, "revoked");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function grantAdultChatTerms(store: SynVibeStore, localUserId: string, sessionId?: string): void {
  store.recordConsentEvent({
    localUserId,
    ...(sessionId ? { sessionId } : {}),
    type: "adult_chat_terms",
    decision: "granted",
    policyVersion: "adult-chat-terms-2026-08-04",
    metadata: { route: "/room", fixture: true }
  });
}
