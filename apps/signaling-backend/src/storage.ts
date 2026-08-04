import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  AdminSummary,
  AnonymousUserRecord,
  EventRequest,
  ProfileRecord,
  ProfileRequest,
  ReactionOutputRequest,
  SessionRecord,
  SessionEndRequest,
  SessionRequest,
  MatchmakingJoinRequest,
  MatchmakingLeaveRequest,
  MatchmakingStatus,
  MatchPeer,
  WebRtcSignalBatch,
  WebRtcSignalMessage,
  WebRtcSignalRequest,
  ConsentEventRecord,
  ConsentEventRequest,
  ModerationReportRecord,
  ModerationReportRequest
} from "@pulse-reaction/shared-schemas";

const DEFAULT_DB_PATH = resolve(process.cwd(), "data/synvibe.sqlite");

export class SynVibeStore {
  readonly dbPath: string;

  constructor(dbPath = process.env.SYNVIBE_DB_PATH ?? DEFAULT_DB_PATH) {
    this.dbPath = dbPath;
    mkdirSync(dirname(this.dbPath), { recursive: true });
    this.execute(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        local_user_id TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
        display_name TEXT NOT NULL,
        handle TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        route TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT
      );
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        session_id TEXT REFERENCES sessions(id),
        type TEXT NOT NULL,
        route TEXT,
        metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS reaction_outputs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        session_id TEXT REFERENCES sessions(id),
        occurred_at TEXT NOT NULL,
        model_version TEXT NOT NULL,
        method_version TEXT NOT NULL,
        state TEXT NOT NULL,
        confidence TEXT NOT NULL,
        reason_codes_json TEXT NOT NULL,
        quality_score REAL NOT NULL,
        region_agreement TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS waiting_queue (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        session_id TEXT REFERENCES sessions(id),
        status TEXT NOT NULL,
        joined_at TEXT NOT NULL,
        matched_at TEXT
      );
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        user_a_id TEXT NOT NULL REFERENCES users(id),
        user_b_id TEXT NOT NULL REFERENCES users(id),
        session_a_id TEXT REFERENCES sessions(id),
        session_b_id TEXT REFERENCES sessions(id),
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        ended_at TEXT,
        ended_reason TEXT
      );
      CREATE TABLE IF NOT EXISTS blocked_users (
        blocker_user_id TEXT NOT NULL REFERENCES users(id),
        blocked_user_id TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL,
        PRIMARY KEY (blocker_user_id, blocked_user_id)
      );
      CREATE TABLE IF NOT EXISTS signaling_messages (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL REFERENCES matches(id),
        sender_user_id TEXT NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS consent_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        session_id TEXT REFERENCES sessions(id),
        type TEXT NOT NULL,
        decision TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS moderation_reports (
        id TEXT PRIMARY KEY,
        reporter_user_id TEXT NOT NULL REFERENCES users(id),
        reported_user_id TEXT REFERENCES users(id),
        match_id TEXT REFERENCES matches(id),
        type TEXT NOT NULL,
        reason TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL
      );
    `);
  }

  upsertAnonymousUser(localUserId: string): AnonymousUserRecord {
    const now = new Date().toISOString();
    const existing = this.getUserByLocalId(localUserId);
    if (existing) {
      this.execute(`UPDATE users SET last_seen_at = ${sql(now)} WHERE id = ${sql(existing.id)};`);
      return { ...existing, lastSeenAtIso: now };
    }

    const record: AnonymousUserRecord = {
      id: randomUUID(),
      localUserId,
      createdAtIso: now,
      lastSeenAtIso: now
    };
    this.execute(`
      INSERT INTO users (id, local_user_id, created_at, last_seen_at)
      VALUES (${sql(record.id)}, ${sql(record.localUserId)}, ${sql(record.createdAtIso)}, ${sql(record.lastSeenAtIso)});
    `);
    return record;
  }

  upsertProfile(input: ProfileRequest): ProfileRecord {
    const user = this.upsertAnonymousUser(input.localUserId);
    const now = new Date().toISOString();
    const existing = this.queryOne<ProfileRow>(`SELECT * FROM profiles WHERE user_id = ${sql(user.id)};`);
    if (existing) {
      this.execute(`
        UPDATE profiles
        SET display_name = ${sql(input.displayName)}, handle = ${sql(input.handle)}, updated_at = ${sql(now)}
        WHERE id = ${sql(existing.id)};
      `);
      return mapProfile({ ...existing, display_name: input.displayName, handle: input.handle, updated_at: now });
    }

    const record: ProfileRecord = {
      id: randomUUID(),
      userId: user.id,
      displayName: input.displayName,
      handle: input.handle,
      createdAtIso: now,
      updatedAtIso: now
    };
    this.execute(`
      INSERT INTO profiles (id, user_id, display_name, handle, created_at, updated_at)
      VALUES (${sql(record.id)}, ${sql(record.userId)}, ${sql(record.displayName)}, ${sql(record.handle)}, ${sql(now)}, ${sql(now)});
    `);
    return record;
  }

  createSession(input: SessionRequest): SessionRecord {
    const user = this.upsertAnonymousUser(input.localUserId);
    const now = new Date().toISOString();
    const record: SessionRecord = {
      id: randomUUID(),
      userId: user.id,
      route: input.route,
      startedAtIso: now,
      endedAtIso: null
    };
    this.execute(`
      INSERT INTO sessions (id, user_id, route, started_at, ended_at)
      VALUES (${sql(record.id)}, ${sql(record.userId)}, ${sql(record.route)}, ${sql(now)}, NULL);
    `);
    return record;
  }

  endSession(input: SessionEndRequest): SessionRecord {
    const user = this.upsertAnonymousUser(input.localUserId);
    const now = new Date().toISOString();
    const session = this.queryOne<SessionRow>(`
      SELECT * FROM sessions
      WHERE id = ${sql(input.sessionId)} AND user_id = ${sql(user.id)};
    `);
    if (!session) throw new Error("Session not found for user");

    const endedAt = session.ended_at ?? now;
    if (!session.ended_at) {
      this.execute(`
        UPDATE sessions SET ended_at = ${sql(endedAt)}
        WHERE id = ${sql(input.sessionId)} AND user_id = ${sql(user.id)} AND ended_at IS NULL;
      `);
      this.recordEvent({
        localUserId: input.localUserId,
        sessionId: input.sessionId,
        type: "room_exit",
        route: session.route,
        metadata: { reason: input.reason }
      });
    }
    return mapSession({ ...session, ended_at: endedAt });
  }

  recordEvent(input: EventRequest): void {
    const user = this.upsertAnonymousUser(input.localUserId);
    this.execute(`
      INSERT INTO events (id, user_id, session_id, type, route, metadata_json, created_at)
      VALUES (
        ${sql(randomUUID())},
        ${sql(user.id)},
        ${input.sessionId ? sql(input.sessionId) : "NULL"},
        ${sql(input.type)},
        ${input.route ? sql(input.route) : "NULL"},
        ${sql(JSON.stringify(input.metadata ?? {}))},
        ${sql(new Date().toISOString())}
      );
    `);
  }

  recordReactionOutput(input: ReactionOutputRequest): void {
    const user = this.upsertAnonymousUser(input.localUserId);
    this.execute(`
      INSERT INTO reaction_outputs (
        id, user_id, session_id, occurred_at, model_version, method_version, state, confidence,
        reason_codes_json, quality_score, region_agreement, created_at
      )
      VALUES (
        ${sql(randomUUID())},
        ${sql(user.id)},
        ${input.sessionId ? sql(input.sessionId) : "NULL"},
        ${sql(input.occurredAtIso)},
        ${sql(input.modelVersion)},
        ${sql(input.methodVersion)},
        ${sql(input.state)},
        ${sql(input.confidence)},
        ${sql(JSON.stringify(input.reasonCodes))},
        ${input.qualityScore},
        ${sql(input.regionAgreement)},
        ${sql(new Date().toISOString())}
      );
    `);
  }

  recordConsentEvent(input: ConsentEventRequest): ConsentEventRecord {
    const user = this.upsertAnonymousUser(input.localUserId);
    const now = new Date().toISOString();
    const record: ConsentEventRecord = {
      id: randomUUID(),
      userId: user.id,
      sessionId: input.sessionId ?? null,
      type: input.type,
      decision: input.decision,
      policyVersion: input.policyVersion,
      createdAtIso: now
    };
    this.execute(`
      INSERT INTO consent_events (id, user_id, session_id, type, decision, policy_version, metadata_json, created_at)
      VALUES (
        ${sql(record.id)},
        ${sql(record.userId)},
        ${record.sessionId ? sql(record.sessionId) : "NULL"},
        ${sql(record.type)},
        ${sql(record.decision)},
        ${sql(record.policyVersion)},
        ${sql(JSON.stringify(input.metadata ?? {}))},
        ${sql(now)}
      );
    `);
    return record;
  }

  recordModerationReport(input: ModerationReportRequest): ModerationReportRecord {
    const reporter = this.upsertAnonymousUser(input.localUserId);
    const reported = input.reportedLocalUserId ? this.upsertAnonymousUser(input.reportedLocalUserId) : null;
    const now = new Date().toISOString();
    const record: ModerationReportRecord = {
      id: randomUUID(),
      reporterUserId: reporter.id,
      reportedUserId: reported?.id ?? null,
      matchId: input.matchId ?? null,
      type: input.type,
      reason: input.reason,
      createdAtIso: now
    };
    if (record.matchId) this.ensureMatchBelongsToReporter(record.matchId, reporter.id);
    this.execute(`
      INSERT INTO moderation_reports (id, reporter_user_id, reported_user_id, match_id, type, reason, notes, created_at)
      VALUES (
        ${sql(record.id)},
        ${sql(record.reporterUserId)},
        ${record.reportedUserId ? sql(record.reportedUserId) : "NULL"},
        ${record.matchId ? sql(record.matchId) : "NULL"},
        ${sql(record.type)},
        ${sql(record.reason)},
        ${input.notes ? sql(input.notes) : "NULL"},
        ${sql(now)}
      );
    `);
    return record;
  }

  joinMatchmaking(input: MatchmakingJoinRequest): MatchmakingStatus {
    const user = this.upsertAnonymousUser(input.localUserId);
    const current = this.getMatchmakingStatus(input.localUserId);
    if (current.status === "matched") return current;

    const now = new Date().toISOString();
    const candidates = this.query<WaitingQueueRow>(`
      SELECT * FROM waiting_queue
      WHERE status = 'waiting' AND user_id != ${sql(user.id)}
      ORDER BY joined_at ASC;
    `);
    const peer = candidates.find((candidate) => !this.usersBlocked(user.id, candidate.user_id));
    if (peer) {
      const matchId = randomUUID();
      this.execute(`
        UPDATE waiting_queue SET status = 'matched', matched_at = ${sql(now)} WHERE id = ${sql(peer.id)};
        UPDATE waiting_queue SET status = 'matched', matched_at = ${sql(now)} WHERE user_id = ${sql(user.id)} AND status = 'waiting';
        INSERT INTO matches (id, user_a_id, user_b_id, session_a_id, session_b_id, status, created_at, ended_at, ended_reason)
        VALUES (
          ${sql(matchId)},
          ${sql(peer.user_id)},
          ${sql(user.id)},
          ${peer.session_id ? sql(peer.session_id) : "NULL"},
          ${input.sessionId ? sql(input.sessionId) : "NULL"},
          'active',
          ${sql(now)},
          NULL,
          NULL
        );
      `);
      return {
        status: "matched",
        match: {
          id: matchId,
          startedAtIso: now,
          localRole: "caller",
          peer: this.getPeerForUser(matchId, user.id)
        }
      };
    }

    const existingWait = this.queryOne<WaitingQueueRow>(`
      SELECT * FROM waiting_queue WHERE user_id = ${sql(user.id)} AND status = 'waiting';
    `);
    if (existingWait) {
      return {
        status: "waiting",
        joinedAtIso: existingWait.joined_at,
        queuePosition: this.queuePosition(existingWait.joined_at)
      };
    }

    this.execute(`
      INSERT INTO waiting_queue (id, user_id, session_id, status, joined_at, matched_at)
      VALUES (${sql(randomUUID())}, ${sql(user.id)}, ${input.sessionId ? sql(input.sessionId) : "NULL"}, 'waiting', ${sql(now)}, NULL);
    `);
    return {
      status: "waiting",
      joinedAtIso: now,
      queuePosition: this.queuePosition(now)
    };
  }

  getMatchmakingStatus(localUserId: string): MatchmakingStatus {
    const user = this.upsertAnonymousUser(localUserId);
    const activeMatch = this.queryOne<MatchRow>(`
      SELECT * FROM matches
      WHERE status = 'active' AND (user_a_id = ${sql(user.id)} OR user_b_id = ${sql(user.id)})
      ORDER BY created_at DESC
      LIMIT 1;
    `);
    if (activeMatch) {
      return {
        status: "matched",
        match: {
          id: activeMatch.id,
          startedAtIso: activeMatch.created_at,
          localRole: activeMatch.user_b_id === user.id ? "caller" : "callee",
          peer: this.getPeerForUser(activeMatch.id, user.id)
        }
      };
    }

    const wait = this.queryOne<WaitingQueueRow>(`
      SELECT * FROM waiting_queue
      WHERE user_id = ${sql(user.id)} AND status = 'waiting'
      ORDER BY joined_at DESC
      LIMIT 1;
    `);
    if (wait) {
      return {
        status: "waiting",
        joinedAtIso: wait.joined_at,
        queuePosition: this.queuePosition(wait.joined_at)
      };
    }

    return { status: "idle" };
  }

  recordSignal(input: WebRtcSignalRequest): WebRtcSignalMessage {
    const user = this.upsertAnonymousUser(input.localUserId);
    const match = this.getActiveMatchForUser(input.matchId, user.id);
    const now = new Date().toISOString();
    const message: WebRtcSignalMessage = {
      id: randomUUID(),
      matchId: match.id,
      senderLocalUserId: user.localUserId,
      type: input.type,
      payload: input.payload,
      createdAtIso: now
    };
    this.execute(`
      INSERT INTO signaling_messages (id, match_id, sender_user_id, type, payload_json, created_at)
      VALUES (${sql(message.id)}, ${sql(match.id)}, ${sql(user.id)}, ${sql(input.type)}, ${sql(JSON.stringify(input.payload))}, ${sql(now)});
    `);
    return message;
  }

  getSignals(localUserId: string, matchId: string, afterCursor: string | null): WebRtcSignalBatch {
    const user = this.upsertAnonymousUser(localUserId);
    const match = this.getActiveMatchForUser(matchId, user.id);
    const afterClause = afterCursor ? `AND signaling_messages.created_at || ':' || signaling_messages.id > ${sql(afterCursor)}` : "";
    const rows = this.query<SignalRow>(`
      SELECT signaling_messages.*, users.local_user_id
      FROM signaling_messages
      JOIN users ON users.id = signaling_messages.sender_user_id
      WHERE match_id = ${sql(match.id)}
        AND sender_user_id != ${sql(user.id)}
        ${afterClause}
      ORDER BY signaling_messages.created_at ASC, signaling_messages.id ASC
      LIMIT 100;
    `);
    const messages = rows.map(mapSignal);
    const last = rows.at(-1);
    return {
      messages,
      nextCursor: last ? `${last.created_at}:${last.id}` : afterCursor
    };
  }

  leaveMatchmaking(input: MatchmakingLeaveRequest): MatchmakingStatus {
    const user = this.upsertAnonymousUser(input.localUserId);
    const now = new Date().toISOString();
    this.execute(`
      UPDATE waiting_queue
      SET status = 'cancelled'
      WHERE user_id = ${sql(user.id)} AND status = 'waiting';
    `);

    const match = input.matchId
      ? this.queryOne<MatchRow>(`SELECT * FROM matches WHERE id = ${sql(input.matchId)} AND status = 'active';`)
      : this.queryOne<MatchRow>(`
          SELECT * FROM matches
          WHERE status = 'active' AND (user_a_id = ${sql(user.id)} OR user_b_id = ${sql(user.id)})
          ORDER BY created_at DESC
          LIMIT 1;
        `);
    if (match) {
      this.execute(`
        UPDATE matches
        SET status = 'ended', ended_at = ${sql(now)}, ended_reason = ${sql(input.reason)}
        WHERE id = ${sql(match.id)};
      `);
      if (input.reason === "blocked") {
        const peerUserId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id;
        this.execute(`
          INSERT OR IGNORE INTO blocked_users (blocker_user_id, blocked_user_id, created_at)
          VALUES (${sql(user.id)}, ${sql(peerUserId)}, ${sql(now)});
        `);
      }
    }

    return { status: "idle" };
  }

  getAdminSummary(): AdminSummary {
    const visits = this.countEvents("visit");
    const roomStarts = this.countEvents("room_start");
    const cameraGrants = this.countEvents("camera_grant");
    const registeredUsers = this.scalar("SELECT COUNT(*) AS value FROM profiles;");
    const totalUsers = this.scalar("SELECT COUNT(*) AS value FROM users;");
    const activeSessions = this.scalar("SELECT COUNT(*) AS value FROM sessions WHERE ended_at IS NULL;");
    const waitingUsers = this.scalar("SELECT COUNT(*) AS value FROM waiting_queue WHERE status = 'waiting';");
    const activeMatches = this.scalar("SELECT COUNT(*) AS value FROM matches WHERE status = 'active';");
    const matchStarts = this.countEvents("match_start");
    const callConnects = this.countEvents("call_connect");
    const callDisconnects = this.countEvents("call_disconnect");
    const callFailures = this.countEvents("call_fail");
    const reportCount = this.scalar("SELECT COUNT(*) AS value FROM moderation_reports WHERE type = 'report';");
    const blockCount = this.scalar("SELECT COUNT(*) AS value FROM moderation_reports WHERE type = 'block';");
    const averageSessionDurationSeconds = this.queryOne<{ value: number | null }>(`
      SELECT AVG(strftime('%s', ended_at) - strftime('%s', started_at)) AS value
      FROM sessions
      WHERE ended_at IS NOT NULL;
    `)?.value ?? null;
    const signalCounts = this.queryOne<{ sufficient: number; total: number }>(`
      SELECT
        SUM(CASE WHEN state != 'INSUFFICIENT_SIGNAL' THEN 1 ELSE 0 END) AS sufficient,
        COUNT(*) AS total
      FROM reaction_outputs;
    `) ?? { sufficient: 0, total: 0 };

    return {
      generatedAtIso: new Date().toISOString(),
      visits,
      roomStarts,
      cameraGrants,
      cameraGrantRate: roomStarts === 0 ? 0 : cameraGrants / roomStarts,
      activeSessions,
      waitingUsers,
      activeMatches,
      callConnects,
      callDisconnects,
      callFailures,
      callSetupSuccessRate: matchStarts === 0 ? null : callConnects / matchStarts,
      averageSessionDurationSeconds,
      sufficientSignalRatio: signalCounts.total === 0 ? null : signalCounts.sufficient / signalCounts.total,
      topRejectionReasons: this.topRejectionReasons(),
      reportCount,
      blockCount,
      topModerationReasons: this.topModerationReasons(),
      registeredUsers,
      guestUsers: Math.max(0, totalUsers - registeredUsers)
    };
  }

  private countEvents(type: string): number {
    return this.scalar(`SELECT COUNT(*) AS value FROM events WHERE type = ${sql(type)};`);
  }

  private queuePosition(joinedAtIso: string): number {
    return this.scalar(`SELECT COUNT(*) AS value FROM waiting_queue WHERE status = 'waiting' AND joined_at <= ${sql(joinedAtIso)};`);
  }

  private usersBlocked(userAId: string, userBId: string): boolean {
    return (
      this.scalar(`
        SELECT COUNT(*) AS value FROM blocked_users
        WHERE (blocker_user_id = ${sql(userAId)} AND blocked_user_id = ${sql(userBId)})
          OR (blocker_user_id = ${sql(userBId)} AND blocked_user_id = ${sql(userAId)});
      `) > 0
    );
  }

  private getPeerForUser(matchId: string, userId: string): MatchPeer {
    const match = this.queryOne<MatchRow>(`SELECT * FROM matches WHERE id = ${sql(matchId)};`);
    if (!match) throw new Error("Match not found");
    const peerUserId = match.user_a_id === userId ? match.user_b_id : match.user_a_id;
    const row = this.queryOne<PeerRow>(`
      SELECT users.local_user_id, profiles.display_name, profiles.handle
      FROM users
      LEFT JOIN profiles ON profiles.user_id = users.id
      WHERE users.id = ${sql(peerUserId)};
    `);
    if (!row) throw new Error("Peer not found");
    return {
      localUserId: row.local_user_id,
      displayName: row.display_name,
      handle: row.handle
    };
  }

  private getActiveMatchForUser(matchId: string, userId: string): MatchRow {
    const match = this.queryOne<MatchRow>(`
      SELECT * FROM matches
      WHERE id = ${sql(matchId)}
        AND status = 'active'
        AND (user_a_id = ${sql(userId)} OR user_b_id = ${sql(userId)});
    `);
    if (!match) throw new Error("Active match not found for user");
    return match;
  }

  private ensureMatchBelongsToReporter(matchId: string, userId: string): void {
    const matchCount = this.scalar(`
      SELECT COUNT(*) AS value FROM matches
      WHERE id = ${sql(matchId)} AND (user_a_id = ${sql(userId)} OR user_b_id = ${sql(userId)});
    `);
    if (matchCount === 0) throw new Error("Match not found for reporter");
  }

  private topRejectionReasons(): Array<{ reasonCode: string; count: number }> {
    const rows = this.query<ReactionReasonRow>(`
      SELECT reason_codes_json FROM reaction_outputs WHERE state = 'INSUFFICIENT_SIGNAL';
    `);
    const counts = new Map<string, number>();
    for (const row of rows) {
      const reasonCodes = parseReasonCodes(row.reason_codes_json);
      for (const reasonCode of reasonCodes) counts.set(reasonCode, (counts.get(reasonCode) ?? 0) + 1);
    }
    return Array.from(counts, ([reasonCode, count]) => ({ reasonCode, count }))
      .sort((a, b) => b.count - a.count || a.reasonCode.localeCompare(b.reasonCode))
      .slice(0, 5);
  }

  private topModerationReasons(): AdminSummary["topModerationReasons"] {
    return this.query<{ reason: AdminSummary["topModerationReasons"][number]["reason"]; count: number }>(`
      SELECT reason, COUNT(*) AS count
      FROM moderation_reports
      GROUP BY reason
      ORDER BY count DESC, reason ASC
      LIMIT 5;
    `);
  }

  private getUserByLocalId(localUserId: string): AnonymousUserRecord | null {
    const row = this.queryOne<UserRow>(`SELECT * FROM users WHERE local_user_id = ${sql(localUserId)};`);
    return row ? mapUser(row) : null;
  }

  private scalar(statement: string): number {
    return Number(this.queryOne<{ value: number | null }>(statement)?.value ?? 0);
  }

  private queryOne<T>(statement: string): T | null {
    return this.query<T>(statement)[0] ?? null;
  }

  private query<T>(statement: string): T[] {
    const output = execFileSync("sqlite3", ["-json", this.dbPath, statement], { encoding: "utf8" }).trim();
    return output ? (JSON.parse(output) as T[]) : [];
  }

  private execute(statement: string): void {
    execFileSync("sqlite3", [this.dbPath, statement], { stdio: "pipe" });
  }
}

interface UserRow {
  id: string;
  local_user_id: string;
  created_at: string;
  last_seen_at: string;
}

interface ProfileRow {
  id: string;
  user_id: string;
  display_name: string;
  handle: string;
  created_at: string;
  updated_at: string;
}

interface SessionRow {
  id: string;
  user_id: string;
  route: string;
  started_at: string;
  ended_at: string | null;
}

interface ReactionReasonRow {
  reason_codes_json: string;
}

interface WaitingQueueRow {
  id: string;
  user_id: string;
  session_id: string | null;
  status: string;
  joined_at: string;
  matched_at: string | null;
}

interface MatchRow {
  id: string;
  user_a_id: string;
  user_b_id: string;
  session_a_id: string | null;
  session_b_id: string | null;
  status: string;
  created_at: string;
  ended_at: string | null;
  ended_reason: string | null;
}

interface PeerRow {
  local_user_id: string;
  display_name: string | null;
  handle: string | null;
}

interface SignalRow {
  id: string;
  match_id: string;
  sender_user_id: string;
  local_user_id: string;
  type: "offer" | "answer" | "candidate";
  payload_json: string;
  created_at: string;
}

function mapUser(row: UserRow): AnonymousUserRecord {
  return {
    id: row.id,
    localUserId: row.local_user_id,
    createdAtIso: row.created_at,
    lastSeenAtIso: row.last_seen_at
  };
}

function mapProfile(row: ProfileRow): ProfileRecord {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    handle: row.handle,
    createdAtIso: row.created_at,
    updatedAtIso: row.updated_at
  };
}

function mapSession(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    route: row.route,
    startedAtIso: row.started_at,
    endedAtIso: row.ended_at
  };
}

function mapSignal(row: SignalRow): WebRtcSignalMessage {
  return {
    id: row.id,
    matchId: row.match_id,
    senderLocalUserId: row.local_user_id,
    type: row.type,
    payload: parsePayload(row.payload_json),
    createdAtIso: row.created_at
  };
}

function parseReasonCodes(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function parsePayload(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function sql(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
