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
  MatchChatBatch,
  MatchChatMessage,
  MatchChatMessageDeletionRequest,
  MatchChatMessageRequest,
  ModerationReportQueue,
  ModerationReportQueueItem,
  ModerationReportStatusFilter,
  WebRtcSignalBatch,
  WebRtcSignalMessage,
  WebRtcSignalRequest,
  ConsentEventRecord,
  ConsentEventRequest,
  ModerationReportRecord,
  ModerationReportRequest,
  ModerationReportedMessageStatus,
  ModerationReportResolutionRequest
} from "@pulse-reaction/shared-schemas";

const DEFAULT_DB_PATH = resolve(process.cwd(), "data/synvibe.sqlite");
const DEFAULT_CHAT_RETENTION_HOURS = 24;

export class ProfileHandleConflictError extends Error {
  constructor(readonly handle: string) {
    super(`Profile handle is already taken: ${handle}`);
    this.name = "ProfileHandleConflictError";
  }
}

export class SynVibeStore {
  readonly dbPath: string;
  readonly chatRetentionHours: number;

  constructor(dbPath = process.env.SYNVIBE_DB_PATH ?? DEFAULT_DB_PATH) {
    this.dbPath = dbPath;
    this.chatRetentionHours = readRetentionHours(process.env.SYNVIBE_CHAT_RETENTION_HOURS);
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
        age_bracket TEXT,
        languages_json TEXT NOT NULL DEFAULT '[]',
        match_intent TEXT,
        preferred_age_brackets_json TEXT NOT NULL DEFAULT '[]',
        preferred_languages_json TEXT NOT NULL DEFAULT '[]',
        topic_tags_json TEXT NOT NULL DEFAULT '[]',
        conversation_pace TEXT,
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
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL REFERENCES matches(id),
        sender_user_id TEXT NOT NULL REFERENCES users(id),
        body TEXT NOT NULL,
        deleted_at TEXT,
        deleted_by_user_id TEXT REFERENCES users(id),
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
        reported_message_id TEXT REFERENCES chat_messages(id),
        type TEXT NOT NULL,
        reason TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        reviewer_notes TEXT,
        reviewer_id TEXT,
        resolved_at TEXT,
        created_at TEXT NOT NULL
      );
    `);
    this.ensureProfileColumns();
    this.ensureChatMessageColumns();
    this.ensureModerationReportColumns();
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
    const handleOwner = this.queryOne<ProfileRow>(`SELECT * FROM profiles WHERE handle = ${sql(input.handle)};`);
    if (handleOwner && handleOwner.user_id !== user.id) throw new ProfileHandleConflictError(input.handle);
    if (existing) {
      this.execute(`
        UPDATE profiles
        SET
          display_name = ${sql(input.displayName)},
          handle = ${sql(input.handle)},
          age_bracket = ${nullableSql(input.ageBracket)},
          languages_json = ${sql(JSON.stringify(input.languages ?? []))},
          match_intent = ${nullableSql(input.matchIntent)},
          preferred_age_brackets_json = ${sql(JSON.stringify(input.preferredAgeBrackets ?? []))},
          preferred_languages_json = ${sql(JSON.stringify(input.preferredLanguages ?? []))},
          topic_tags_json = ${sql(JSON.stringify(input.topicTags ?? []))},
          conversation_pace = ${nullableSql(input.conversationPace)},
          updated_at = ${sql(now)}
        WHERE id = ${sql(existing.id)};
      `);
      return mapProfile({
        ...existing,
        display_name: input.displayName,
        handle: input.handle,
        age_bracket: input.ageBracket ?? null,
        languages_json: JSON.stringify(input.languages ?? []),
        match_intent: input.matchIntent ?? null,
        preferred_age_brackets_json: JSON.stringify(input.preferredAgeBrackets ?? []),
        preferred_languages_json: JSON.stringify(input.preferredLanguages ?? []),
        topic_tags_json: JSON.stringify(input.topicTags ?? []),
        conversation_pace: input.conversationPace ?? null,
        updated_at: now
      });
    }

    const record: ProfileRecord = {
      id: randomUUID(),
      userId: user.id,
      displayName: input.displayName,
      handle: input.handle,
      ageBracket: input.ageBracket ?? null,
      languages: input.languages ?? [],
      matchIntent: input.matchIntent ?? null,
      preferredAgeBrackets: input.preferredAgeBrackets ?? [],
      preferredLanguages: input.preferredLanguages ?? [],
      topicTags: input.topicTags ?? [],
      conversationPace: input.conversationPace ?? null,
      createdAtIso: now,
      updatedAtIso: now
    };
    this.execute(`
      INSERT INTO profiles (
        id, user_id, display_name, handle, age_bracket, languages_json, match_intent,
        preferred_age_brackets_json, preferred_languages_json, topic_tags_json, conversation_pace, created_at, updated_at
      )
      VALUES (
        ${sql(record.id)},
        ${sql(record.userId)},
        ${sql(record.displayName)},
        ${sql(record.handle)},
        ${nullableSql(record.ageBracket)},
        ${sql(JSON.stringify(record.languages))},
        ${nullableSql(record.matchIntent)},
        ${sql(JSON.stringify(record.preferredAgeBrackets))},
        ${sql(JSON.stringify(record.preferredLanguages))},
        ${sql(JSON.stringify(record.topicTags))},
        ${nullableSql(record.conversationPace)},
        ${sql(now)},
        ${sql(now)}
      );
    `);
    return record;
  }

  getProfileByLocalUserId(localUserId: string): ProfileRecord | null {
    const user = this.upsertAnonymousUser(localUserId);
    return this.getProfileByUserId(user.id);
  }

  private getProfileByUserId(userId: string): ProfileRecord | null {
    const row = this.queryOne<ProfileRow>(`SELECT * FROM profiles WHERE user_id = ${sql(userId)};`);
    return row ? mapProfile(row) : null;
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
    if (!this.hasActiveConsent(user.id, "physiological_analysis", input.sessionId)) {
      throw new Error("Physiological analysis consent is required for reaction output");
    }
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

  hasActiveConsent(userId: string, type: ConsentEventRequest["type"], sessionId?: string): boolean {
    const sessionClause = sessionId ? `AND (session_id = ${sql(sessionId)} OR session_id IS NULL)` : "";
    const latest = this.queryOne<{ decision: ConsentEventRequest["decision"] }>(`
      SELECT decision
      FROM consent_events
      WHERE user_id = ${sql(userId)}
        AND type = ${sql(type)}
        ${sessionClause}
      ORDER BY created_at DESC, rowid DESC
      LIMIT 1;
    `);
    return latest?.decision === "granted";
  }

  hasActiveConsentForLocalUser(localUserId: string, type: ConsentEventRequest["type"], sessionId?: string): boolean {
    const user = this.upsertAnonymousUser(localUserId);
    return this.hasActiveConsent(user.id, type, sessionId);
  }

  recordModerationReport(input: ModerationReportRequest): ModerationReportRecord {
    this.pruneExpiredChatMessages();
    const reporter = this.upsertAnonymousUser(input.localUserId);
    const reported = input.reportedLocalUserId ? this.upsertAnonymousUser(input.reportedLocalUserId) : null;
    const now = new Date().toISOString();
    const record: ModerationReportRecord = {
      id: randomUUID(),
      reporterUserId: reporter.id,
      reportedUserId: reported?.id ?? null,
      matchId: input.matchId ?? null,
      reportedMessageId: input.reportedMessageId ?? null,
      type: input.type,
      reason: input.reason,
      status: "open",
      createdAtIso: now
    };
    if (record.matchId) this.ensureMatchBelongsToReporter(record.matchId, reporter.id);
    if (record.reportedMessageId) this.ensureReportedMessageReference(record, reporter.id);
    this.execute(`
      INSERT INTO moderation_reports (id, reporter_user_id, reported_user_id, match_id, reported_message_id, type, reason, notes, created_at)
      VALUES (
        ${sql(record.id)},
        ${sql(record.reporterUserId)},
        ${record.reportedUserId ? sql(record.reportedUserId) : "NULL"},
        ${record.matchId ? sql(record.matchId) : "NULL"},
        ${record.reportedMessageId ? sql(record.reportedMessageId) : "NULL"},
        ${sql(record.type)},
        ${sql(record.reason)},
        ${input.notes ? sql(input.notes) : "NULL"},
        ${sql(now)}
      );
    `);
    return record;
  }

  getModerationReports(limit: number, statusFilter: ModerationReportStatusFilter = "all"): ModerationReportQueue {
    this.pruneExpiredChatMessages();
    const statusClause = statusFilter === "all" ? "" : `WHERE COALESCE(moderation_reports.status, 'open') = ${sql(statusFilter)}`;
    const rows = this.query<ModerationReportQueueRow>(`
      SELECT
        moderation_reports.id,
        reporter.local_user_id AS reporter_local_user_id,
        reported.local_user_id AS reported_local_user_id,
        message_sender.local_user_id AS reported_message_sender_local_user_id,
        (
          SELECT COUNT(*)
          FROM moderation_reports AS repeat_reports
          WHERE repeat_reports.reported_user_id = moderation_reports.reported_user_id
        ) AS reported_user_total_reports,
        (
          SELECT COUNT(*)
          FROM moderation_reports AS repeat_reports
          WHERE repeat_reports.reported_user_id = moderation_reports.reported_user_id
            AND COALESCE(repeat_reports.status, 'open') = 'open'
        ) AS reported_user_open_reports,
        moderation_reports.match_id,
        moderation_reports.reported_message_id,
        CASE
          WHEN moderation_reports.reported_message_id IS NULL THEN NULL
          WHEN reported_message.id IS NULL THEN 'expired_or_unavailable'
          WHEN reported_message.deleted_at IS NOT NULL THEN 'deleted'
          ELSE 'retained'
        END AS reported_message_status,
        CASE
          WHEN reported_message.id IS NOT NULL AND reported_message.deleted_at IS NULL THEN substr(reported_message.body, 1, 160)
          ELSE NULL
        END AS reported_message_excerpt,
        moderation_reports.type,
        moderation_reports.reason,
        moderation_reports.notes,
        COALESCE(moderation_reports.status, 'open') AS status,
        moderation_reports.reviewer_notes,
        moderation_reports.reviewer_id,
        moderation_reports.resolved_at,
        moderation_reports.created_at
      FROM moderation_reports
      JOIN users AS reporter ON reporter.id = moderation_reports.reporter_user_id
      LEFT JOIN users AS reported ON reported.id = moderation_reports.reported_user_id
      LEFT JOIN chat_messages AS reported_message ON reported_message.id = moderation_reports.reported_message_id
      LEFT JOIN users AS message_sender ON message_sender.id = reported_message.sender_user_id
      ${statusClause}
      ORDER BY CASE COALESCE(moderation_reports.status, 'open') WHEN 'open' THEN 0 ELSE 1 END, moderation_reports.created_at DESC, moderation_reports.id DESC
      LIMIT ${Math.max(1, Math.min(100, Math.floor(limit)))};
    `);
    return {
      reports: rows.map((row) => ({
        id: row.id,
        reporterLocalUserId: row.reporter_local_user_id,
        reportedLocalUserId: row.reported_local_user_id,
        matchId: row.match_id,
        reportedMessageId: row.reported_message_id,
        reportedMessageStatus: row.reported_message_status,
        reportedMessageSenderLocalUserId: row.reported_message_sender_local_user_id,
        reportedMessageExcerpt: row.reported_message_excerpt,
        type: row.type,
        reason: row.reason,
        status: row.status ?? "open",
        notes: row.notes,
        reviewerNotes: row.reviewer_notes,
        reviewerId: row.reviewer_id,
        reportedUserTotalReports: row.reported_user_total_reports,
        reportedUserOpenReports: row.reported_user_open_reports,
        createdAtIso: row.created_at,
        resolvedAtIso: row.resolved_at
      }))
    };
  }

  resolveModerationReport(input: ModerationReportResolutionRequest): ModerationReportQueueItem {
    this.pruneExpiredChatMessages();
    const existing = this.queryOne<ModerationReportQueueRow>(`
      SELECT
        moderation_reports.id,
        reporter.local_user_id AS reporter_local_user_id,
        reported.local_user_id AS reported_local_user_id,
        message_sender.local_user_id AS reported_message_sender_local_user_id,
        (
          SELECT COUNT(*)
          FROM moderation_reports AS repeat_reports
          WHERE repeat_reports.reported_user_id = moderation_reports.reported_user_id
        ) AS reported_user_total_reports,
        (
          SELECT COUNT(*)
          FROM moderation_reports AS repeat_reports
          WHERE repeat_reports.reported_user_id = moderation_reports.reported_user_id
            AND COALESCE(repeat_reports.status, 'open') = 'open'
        ) AS reported_user_open_reports,
        moderation_reports.match_id,
        moderation_reports.reported_message_id,
        CASE
          WHEN moderation_reports.reported_message_id IS NULL THEN NULL
          WHEN reported_message.id IS NULL THEN 'expired_or_unavailable'
          WHEN reported_message.deleted_at IS NOT NULL THEN 'deleted'
          ELSE 'retained'
        END AS reported_message_status,
        CASE
          WHEN reported_message.id IS NOT NULL AND reported_message.deleted_at IS NULL THEN substr(reported_message.body, 1, 160)
          ELSE NULL
        END AS reported_message_excerpt,
        moderation_reports.type,
        moderation_reports.reason,
        moderation_reports.notes,
        COALESCE(moderation_reports.status, 'open') AS status,
        moderation_reports.reviewer_notes,
        moderation_reports.reviewer_id,
        moderation_reports.resolved_at,
        moderation_reports.created_at
      FROM moderation_reports
      JOIN users AS reporter ON reporter.id = moderation_reports.reporter_user_id
      LEFT JOIN users AS reported ON reported.id = moderation_reports.reported_user_id
      LEFT JOIN chat_messages AS reported_message ON reported_message.id = moderation_reports.reported_message_id
      LEFT JOIN users AS message_sender ON message_sender.id = reported_message.sender_user_id
      WHERE moderation_reports.id = ${sql(input.reportId)};
    `);
    if (!existing) throw new Error("Moderation report not found");
    const now = new Date().toISOString();
    const resolvedAt = input.status === "open" ? null : now;
    this.execute(`
      UPDATE moderation_reports
      SET
        status = ${sql(input.status)},
        reviewer_notes = ${input.reviewerNotes ? sql(input.reviewerNotes) : "NULL"},
        reviewer_id = ${input.reviewerId ? sql(input.reviewerId) : "NULL"},
        resolved_at = ${resolvedAt ? sql(resolvedAt) : "NULL"}
      WHERE id = ${sql(input.reportId)};
    `);
    return {
      id: existing.id,
      reporterLocalUserId: existing.reporter_local_user_id,
      reportedLocalUserId: existing.reported_local_user_id,
      matchId: existing.match_id,
      reportedMessageId: existing.reported_message_id,
      reportedMessageStatus: existing.reported_message_status,
      reportedMessageSenderLocalUserId: existing.reported_message_sender_local_user_id,
      reportedMessageExcerpt: existing.reported_message_excerpt,
      type: existing.type,
      reason: existing.reason,
      status: input.status,
      notes: existing.notes,
      reviewerNotes: input.reviewerNotes ?? null,
      reviewerId: input.reviewerId ?? null,
      reportedUserTotalReports: existing.reported_user_total_reports,
      reportedUserOpenReports: existing.reported_user_open_reports,
      createdAtIso: existing.created_at,
      resolvedAtIso: resolvedAt
    };
  }

  joinMatchmaking(input: MatchmakingJoinRequest): MatchmakingStatus {
    const user = this.upsertAnonymousUser(input.localUserId);
    if (!this.hasActiveConsent(user.id, "adult_chat_terms", input.sessionId)) {
      return { status: "ineligible", reason: "adult_chat_terms_required" };
    }
    const current = this.getMatchmakingStatus(input.localUserId);
    if (current.status === "matched") return current;

    const now = new Date().toISOString();
    const candidates = this.query<WaitingQueueRow>(`
      SELECT * FROM waiting_queue
      WHERE status = 'waiting' AND user_id != ${sql(user.id)}
      ORDER BY joined_at ASC;
    `);
    const requesterProfile = this.getProfileByUserId(user.id);
    const peer = candidates.find((candidate) => {
      if (this.usersBlocked(user.id, candidate.user_id)) return false;
      return profilesMutuallyMatch(requesterProfile, this.getProfileByUserId(candidate.user_id));
    });
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

  recordChatMessage(input: MatchChatMessageRequest): MatchChatMessage {
    this.pruneExpiredChatMessages();
    const user = this.upsertAnonymousUser(input.localUserId);
    const match = this.getActiveMatchForUser(input.matchId, user.id);
    const now = new Date().toISOString();
    const message: MatchChatMessage = {
      id: randomUUID(),
      matchId: match.id,
      senderLocalUserId: user.localUserId,
      body: input.body,
      createdAtIso: now,
      deletedAtIso: null,
      deletedByLocalUserId: null
    };
    this.execute(`
      INSERT INTO chat_messages (id, match_id, sender_user_id, body, created_at)
      VALUES (${sql(message.id)}, ${sql(match.id)}, ${sql(user.id)}, ${sql(input.body)}, ${sql(now)});
    `);
    return message;
  }

  deleteChatMessage(input: MatchChatMessageDeletionRequest): MatchChatMessage {
    this.pruneExpiredChatMessages();
    const user = this.upsertAnonymousUser(input.localUserId);
    const match = this.getActiveMatchForUser(input.matchId, user.id);
    const row = this.queryOne<ChatMessageRow>(`
      SELECT
        chat_messages.*,
        sender.local_user_id,
        deleted_by.local_user_id AS deleted_by_local_user_id,
        COALESCE(chat_messages.deleted_at, chat_messages.created_at) || ':' || chat_messages.id AS delivery_cursor
      FROM chat_messages
      JOIN users AS sender ON sender.id = chat_messages.sender_user_id
      LEFT JOIN users AS deleted_by ON deleted_by.id = chat_messages.deleted_by_user_id
      WHERE chat_messages.id = ${sql(input.messageId)}
        AND chat_messages.match_id = ${sql(match.id)}
        AND chat_messages.sender_user_id = ${sql(user.id)};
    `);
    if (!row) throw new Error("Chat message not found for sender");
    const deletedAt = row.deleted_at ?? new Date().toISOString();
    if (!row.deleted_at) {
      this.execute(`
        UPDATE chat_messages
        SET body = '', deleted_at = ${sql(deletedAt)}, deleted_by_user_id = ${sql(user.id)}
        WHERE id = ${sql(row.id)}
          AND match_id = ${sql(match.id)}
          AND sender_user_id = ${sql(user.id)}
          AND deleted_at IS NULL;
      `);
    }
    return mapChatMessage({
      ...row,
      body: "",
      deleted_at: deletedAt,
      deleted_by_user_id: user.id,
      deleted_by_local_user_id: user.localUserId,
      delivery_cursor: `${deletedAt}:${row.id}`
    });
  }

  getChatMessages(localUserId: string, matchId: string, afterCursor: string | null): MatchChatBatch {
    this.pruneExpiredChatMessages();
    const user = this.upsertAnonymousUser(localUserId);
    const match = this.getActiveMatchForUser(matchId, user.id);
    const afterClause = afterCursor ? `AND COALESCE(chat_messages.deleted_at, chat_messages.created_at) || ':' || chat_messages.id > ${sql(afterCursor)}` : "";
    const rows = this.query<ChatMessageRow>(`
      SELECT
        chat_messages.*,
        sender.local_user_id,
        deleted_by.local_user_id AS deleted_by_local_user_id,
        COALESCE(chat_messages.deleted_at, chat_messages.created_at) || ':' || chat_messages.id AS delivery_cursor
      FROM chat_messages
      JOIN users AS sender ON sender.id = chat_messages.sender_user_id
      LEFT JOIN users AS deleted_by ON deleted_by.id = chat_messages.deleted_by_user_id
      WHERE chat_messages.match_id = ${sql(match.id)}
        ${afterClause}
      ORDER BY COALESCE(chat_messages.deleted_at, chat_messages.created_at) ASC, chat_messages.id ASC
      LIMIT 100;
    `);
    const messages = rows.map(mapChatMessage);
    const last = rows.at(-1);
    return {
      messages,
      nextCursor: last ? last.delivery_cursor : afterCursor
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
    this.pruneExpiredChatMessages();
    const chatMessages = this.scalar("SELECT COUNT(*) AS value FROM chat_messages WHERE deleted_at IS NULL;");
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
      chatMessages,
      averageSessionDurationSeconds,
      sufficientSignalRatio: signalCounts.total === 0 ? null : signalCounts.sufficient / signalCounts.total,
      reactionOutputCount: signalCounts.total,
      reactionStateCounts: this.reactionStateCounts(),
      reactionConfidenceCounts: this.reactionConfidenceCounts(),
      reactionRegionAgreementCounts: this.reactionRegionAgreementCounts(),
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
      SELECT
        users.local_user_id,
        profiles.display_name,
        profiles.handle,
        profiles.age_bracket,
        profiles.languages_json,
        profiles.match_intent,
        profiles.topic_tags_json,
        profiles.conversation_pace
      FROM users
      LEFT JOIN profiles ON profiles.user_id = users.id
      WHERE users.id = ${sql(peerUserId)};
    `);
    if (!row) throw new Error("Peer not found");
    return {
      localUserId: row.local_user_id,
      displayName: row.display_name,
      handle: row.handle,
      ageBracket: row.age_bracket,
      languages: parseStringList(row.languages_json ?? "[]") as MatchPeer["languages"],
      matchIntent: row.match_intent,
      topicTags: parseStringList(row.topic_tags_json ?? "[]") as MatchPeer["topicTags"],
      conversationPace: row.conversation_pace
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

  private ensureReportedMessageReference(record: ModerationReportRecord, reporterUserId: string): void {
    if (!record.matchId) throw new Error("Reported message requires match id");
    if (!record.reportedUserId) throw new Error("Reported message requires reported user id");
    const message = this.queryOne<ChatMessageRow>(`
      SELECT
        chat_messages.*,
        sender.local_user_id,
        deleted_by.local_user_id AS deleted_by_local_user_id,
        COALESCE(chat_messages.deleted_at, chat_messages.created_at) || ':' || chat_messages.id AS delivery_cursor
      FROM chat_messages
      JOIN users AS sender ON sender.id = chat_messages.sender_user_id
      LEFT JOIN users AS deleted_by ON deleted_by.id = chat_messages.deleted_by_user_id
      WHERE chat_messages.id = ${sql(record.reportedMessageId ?? "")}
        AND chat_messages.match_id = ${sql(record.matchId)};
    `);
    if (!message) throw new Error("Reported message not found for match");
    if (message.sender_user_id === reporterUserId) throw new Error("Reporter cannot report their own message");
    if (message.sender_user_id !== record.reportedUserId) throw new Error("Reported message sender does not match reported user");
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

  private reactionStateCounts(): AdminSummary["reactionStateCounts"] {
    return this.query<{ state: ReactionOutputRequest["state"]; count: number }>(`
      SELECT state, COUNT(*) AS count
      FROM reaction_outputs
      GROUP BY state
      ORDER BY count DESC, state ASC;
    `);
  }

  private reactionConfidenceCounts(): AdminSummary["reactionConfidenceCounts"] {
    return this.query<{ confidence: ReactionOutputRequest["confidence"]; count: number }>(`
      SELECT confidence, COUNT(*) AS count
      FROM reaction_outputs
      GROUP BY confidence
      ORDER BY count DESC, confidence ASC;
    `);
  }

  private reactionRegionAgreementCounts(): AdminSummary["reactionRegionAgreementCounts"] {
    return this.query<{ regionAgreement: ReactionOutputRequest["regionAgreement"]; count: number }>(`
      SELECT region_agreement AS regionAgreement, COUNT(*) AS count
      FROM reaction_outputs
      GROUP BY region_agreement
      ORDER BY count DESC, region_agreement ASC;
    `);
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

  private ensureProfileColumns(): void {
    const columns = new Set(this.query<{ name: string }>("PRAGMA table_info(profiles);").map((row) => row.name));
    if (!columns.has("age_bracket")) this.execute("ALTER TABLE profiles ADD COLUMN age_bracket TEXT;");
    if (!columns.has("languages_json")) this.execute("ALTER TABLE profiles ADD COLUMN languages_json TEXT NOT NULL DEFAULT '[]';");
    if (!columns.has("match_intent")) this.execute("ALTER TABLE profiles ADD COLUMN match_intent TEXT;");
    if (!columns.has("preferred_age_brackets_json")) this.execute("ALTER TABLE profiles ADD COLUMN preferred_age_brackets_json TEXT NOT NULL DEFAULT '[]';");
    if (!columns.has("preferred_languages_json")) this.execute("ALTER TABLE profiles ADD COLUMN preferred_languages_json TEXT NOT NULL DEFAULT '[]';");
    if (!columns.has("topic_tags_json")) this.execute("ALTER TABLE profiles ADD COLUMN topic_tags_json TEXT NOT NULL DEFAULT '[]';");
    if (!columns.has("conversation_pace")) this.execute("ALTER TABLE profiles ADD COLUMN conversation_pace TEXT;");
  }

  private ensureModerationReportColumns(): void {
    const columns = new Set(this.query<{ name: string }>("PRAGMA table_info(moderation_reports);").map((row) => row.name));
    if (!columns.has("reported_message_id")) this.execute("ALTER TABLE moderation_reports ADD COLUMN reported_message_id TEXT REFERENCES chat_messages(id);");
    if (!columns.has("status")) this.execute("ALTER TABLE moderation_reports ADD COLUMN status TEXT NOT NULL DEFAULT 'open';");
    if (!columns.has("reviewer_notes")) this.execute("ALTER TABLE moderation_reports ADD COLUMN reviewer_notes TEXT;");
    if (!columns.has("reviewer_id")) this.execute("ALTER TABLE moderation_reports ADD COLUMN reviewer_id TEXT;");
    if (!columns.has("resolved_at")) this.execute("ALTER TABLE moderation_reports ADD COLUMN resolved_at TEXT;");
  }

  private ensureChatMessageColumns(): void {
    const columns = new Set(this.query<{ name: string }>("PRAGMA table_info(chat_messages);").map((row) => row.name));
    if (!columns.has("deleted_at")) this.execute("ALTER TABLE chat_messages ADD COLUMN deleted_at TEXT;");
    if (!columns.has("deleted_by_user_id")) this.execute("ALTER TABLE chat_messages ADD COLUMN deleted_by_user_id TEXT REFERENCES users(id);");
  }

  private pruneExpiredChatMessages(): void {
    if (!Number.isFinite(this.chatRetentionHours) || this.chatRetentionHours <= 0) return;
    const cutoff = new Date(Date.now() - this.chatRetentionHours * 60 * 60 * 1000).toISOString();
    this.execute(`DELETE FROM chat_messages WHERE created_at < ${sql(cutoff)};`);
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
  age_bracket: ProfileRecord["ageBracket"];
  languages_json: string;
  match_intent: ProfileRecord["matchIntent"];
  preferred_age_brackets_json: string;
  preferred_languages_json: string;
  topic_tags_json: string;
  conversation_pace: ProfileRecord["conversationPace"];
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
  age_bracket: MatchPeer["ageBracket"];
  languages_json: string | null;
  match_intent: MatchPeer["matchIntent"];
  topic_tags_json: string | null;
  conversation_pace: MatchPeer["conversationPace"];
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

interface ChatMessageRow {
  id: string;
  match_id: string;
  sender_user_id: string;
  local_user_id: string;
  body: string;
  deleted_at: string | null;
  deleted_by_user_id: string | null;
  deleted_by_local_user_id: string | null;
  created_at: string;
  delivery_cursor: string;
}

interface ModerationReportQueueRow {
  id: string;
  reporter_local_user_id: string;
  reported_local_user_id: string | null;
  reported_message_sender_local_user_id: string | null;
  reported_user_total_reports: number;
  reported_user_open_reports: number;
  match_id: string | null;
  reported_message_id: string | null;
  reported_message_status: ModerationReportedMessageStatus | null;
  reported_message_excerpt: string | null;
  type: "report" | "block";
  reason: "safety" | "harassment" | "underage" | "spam" | "other";
  status: "open" | "resolved" | "dismissed";
  notes: string | null;
  reviewer_notes: string | null;
  reviewer_id: string | null;
  resolved_at: string | null;
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
    ageBracket: row.age_bracket,
    languages: parseStringList(row.languages_json) as ProfileRecord["languages"],
    matchIntent: row.match_intent,
    preferredAgeBrackets: parseStringList(row.preferred_age_brackets_json) as ProfileRecord["preferredAgeBrackets"],
    preferredLanguages: parseStringList(row.preferred_languages_json) as ProfileRecord["preferredLanguages"],
    topicTags: parseStringList(row.topic_tags_json) as ProfileRecord["topicTags"],
    conversationPace: row.conversation_pace,
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

function mapChatMessage(row: ChatMessageRow): MatchChatMessage {
  const deleted = Boolean(row.deleted_at);
  return {
    id: row.id,
    matchId: row.match_id,
    senderLocalUserId: row.local_user_id,
    body: deleted ? null : row.body,
    createdAtIso: row.created_at,
    deletedAtIso: row.deleted_at,
    deletedByLocalUserId: row.deleted_by_local_user_id
  };
}

function readRetentionHours(raw: string | undefined): number {
  if (!raw) return DEFAULT_CHAT_RETENTION_HOURS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : DEFAULT_CHAT_RETENTION_HOURS;
}

function parseReasonCodes(raw: string): string[] {
  return parseStringList(raw);
}

function parseStringList(raw: string): string[] {
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

function nullableSql(value: string | null | undefined): string {
  return value ? sql(value) : "NULL";
}

function profilesMutuallyMatch(left: ProfileRecord | null, right: ProfileRecord | null): boolean {
  if (!left || !right) return true;
  return profileAcceptsCandidate(left, right) && profileAcceptsCandidate(right, left);
}

function profileAcceptsCandidate(profile: ProfileRecord, candidate: ProfileRecord): boolean {
  if (profile.preferredAgeBrackets.length > 0 && (!candidate.ageBracket || !profile.preferredAgeBrackets.includes(candidate.ageBracket))) return false;
  if (profile.preferredLanguages.length > 0 && !hasIntersection(profile.preferredLanguages, candidate.languages)) return false;
  if (profile.matchIntent && candidate.matchIntent && profile.matchIntent !== "open_conversation" && candidate.matchIntent !== "open_conversation" && profile.matchIntent !== candidate.matchIntent) {
    return false;
  }
  if (profile.topicTags.length > 0 && candidate.topicTags.length > 0 && !hasIntersection(profile.topicTags, candidate.topicTags)) return false;
  return true;
}

function hasIntersection(left: readonly string[], right: readonly string[]): boolean {
  return left.some((value) => right.includes(value));
}
