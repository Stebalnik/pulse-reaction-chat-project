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
  SessionRequest,
  MatchmakingJoinRequest,
  MatchmakingLeaveRequest,
  MatchmakingStatus,
  MatchPeer
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
      averageSessionDurationSeconds,
      sufficientSignalRatio: signalCounts.total === 0 ? null : signalCounts.sufficient / signalCounts.total,
      topRejectionReasons: this.topRejectionReasons(),
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

function parseReasonCodes(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function sql(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
