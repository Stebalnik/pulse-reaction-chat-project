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
  SessionRequest
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

  getAdminSummary(): AdminSummary {
    const visits = this.countEvents("visit");
    const roomStarts = this.countEvents("room_start");
    const cameraGrants = this.countEvents("camera_grant");
    const registeredUsers = this.scalar("SELECT COUNT(*) AS value FROM profiles;");
    const totalUsers = this.scalar("SELECT COUNT(*) AS value FROM users;");
    const activeSessions = this.scalar("SELECT COUNT(*) AS value FROM sessions WHERE ended_at IS NULL;");
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
