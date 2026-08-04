export type SynVibeEventType =
  | "visit"
  | "room_start"
  | "camera_grant"
  | "camera_pause"
  | "analysis_start"
  | "room_exit"
  | "consent_grant"
  | "consent_revoke"
  | "match_wait"
  | "match_start"
  | "match_end"
  | "match_leave"
  | "call_connect"
  | "call_disconnect"
  | "call_fail"
  | "chat_message"
  | "report"
  | "block";

export interface AnonymousUserRequest {
  localUserId: string;
}

export interface AnonymousUserRecord {
  id: string;
  localUserId: string;
  createdAtIso: string;
  lastSeenAtIso: string;
}

export interface ProfileRequest {
  localUserId: string;
  displayName: string;
  handle: string;
}

export interface ProfileRecord {
  id: string;
  userId: string;
  displayName: string;
  handle: string;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface SessionRequest {
  localUserId: string;
  route: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  route: string;
  startedAtIso: string;
  endedAtIso: string | null;
}

export interface SessionEndRequest {
  localUserId: string;
  sessionId: string;
  reason: "left" | "unload" | "replaced" | "error";
}

export interface EventRequest {
  localUserId: string;
  sessionId?: string;
  type: SynVibeEventType;
  route?: string;
  metadata?: Record<string, unknown>;
}

export interface ReactionOutputRequest {
  localUserId: string;
  sessionId?: string;
  occurredAtIso: string;
  modelVersion: string;
  methodVersion: string;
  state: "INSUFFICIENT_SIGNAL" | "CALIBRATING_BASELINE" | "NEAR_BASELINE" | "POSSIBLE_ACTIVATION" | "HIGHER_ACTIVATION" | "RECOVERY";
  confidence: "low" | "medium" | "high";
  reasonCodes: string[];
  qualityScore: number;
  regionAgreement: "not_reported" | "low" | "medium" | "high";
}

export type ConsentEventType = "adult_chat_terms" | "camera_access" | "physiological_analysis" | "research_feedback";
export type ConsentDecision = "granted" | "revoked";

export interface ConsentEventRequest {
  localUserId: string;
  sessionId?: string;
  type: ConsentEventType;
  decision: ConsentDecision;
  policyVersion: string;
  metadata?: Record<string, unknown>;
}

export interface ConsentEventRecord {
  id: string;
  userId: string;
  sessionId: string | null;
  type: ConsentEventType;
  decision: ConsentDecision;
  policyVersion: string;
  createdAtIso: string;
}

export type ModerationReportType = "report" | "block";
export type ModerationReportReason = "safety" | "harassment" | "underage" | "spam" | "other";

export interface ModerationReportRequest {
  localUserId: string;
  matchId?: string;
  reportedLocalUserId?: string;
  type: ModerationReportType;
  reason: ModerationReportReason;
  notes?: string;
}

export interface ModerationReportRecord {
  id: string;
  reporterUserId: string;
  reportedUserId: string | null;
  matchId: string | null;
  type: ModerationReportType;
  reason: ModerationReportReason;
  createdAtIso: string;
}

export interface ModerationReportQueueItem {
  id: string;
  reporterLocalUserId: string;
  reportedLocalUserId: string | null;
  matchId: string | null;
  type: ModerationReportType;
  reason: ModerationReportReason;
  notes: string | null;
  createdAtIso: string;
}

export interface ModerationReportQueue {
  reports: ModerationReportQueueItem[];
}

export interface AdminSummary {
  generatedAtIso: string;
  visits: number;
  roomStarts: number;
  cameraGrants: number;
  cameraGrantRate: number;
  activeSessions: number;
  waitingUsers: number;
  activeMatches: number;
  callConnects: number;
  callDisconnects: number;
  callFailures: number;
  callSetupSuccessRate: number | null;
  chatMessages: number;
  averageSessionDurationSeconds: number | null;
  sufficientSignalRatio: number | null;
  topRejectionReasons: Array<{ reasonCode: string; count: number }>;
  reportCount: number;
  blockCount: number;
  topModerationReasons: Array<{ reason: ModerationReportReason; count: number }>;
  registeredUsers: number;
  guestUsers: number;
}

export interface MatchmakingJoinRequest {
  localUserId: string;
  sessionId?: string;
}

export interface MatchmakingLeaveRequest {
  localUserId: string;
  matchId?: string;
  reason: "left" | "reported" | "blocked";
}

export interface MatchPeer {
  localUserId: string;
  displayName: string | null;
  handle: string | null;
}

export interface MatchRecord {
  id: string;
  startedAtIso: string;
  localRole: "caller" | "callee";
  peer: MatchPeer;
}

export type MatchmakingStatus =
  | { status: "idle" }
  | { status: "waiting"; joinedAtIso: string; queuePosition: number }
  | { status: "matched"; match: MatchRecord };

export type WebRtcSignalType = "offer" | "answer" | "candidate";

export interface WebRtcSignalRequest {
  localUserId: string;
  matchId: string;
  type: WebRtcSignalType;
  payload: Record<string, unknown>;
}

export interface WebRtcSignalMessage {
  id: string;
  matchId: string;
  senderLocalUserId: string;
  type: WebRtcSignalType;
  payload: Record<string, unknown>;
  createdAtIso: string;
}

export interface WebRtcSignalBatch {
  messages: WebRtcSignalMessage[];
  nextCursor: string | null;
}

export interface MatchChatMessageRequest {
  localUserId: string;
  matchId: string;
  body: string;
}

export interface MatchChatMessage {
  id: string;
  matchId: string;
  senderLocalUserId: string;
  body: string;
  createdAtIso: string;
}

export interface MatchChatBatch {
  messages: MatchChatMessage[];
  nextCursor: string | null;
}
