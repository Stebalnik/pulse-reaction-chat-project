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
    assert.equal(summary.registeredUsers, 1);
    assert.equal(summary.guestUsers, 0);
    assert.equal(summary.sufficientSignalRatio, 0);
    assert.deepEqual(summary.topRejectionReasons, [
      { reasonCode: "MOTION_HIGH", count: 1 },
      { reasonCode: "ROI_TOO_SMALL", count: 1 }
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
