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

export interface AdminSummary {
  generatedAtIso: string;
  visits: number;
  roomStarts: number;
  cameraGrants: number;
  cameraGrantRate: number;
  activeSessions: number;
  averageSessionDurationSeconds: number | null;
  sufficientSignalRatio: number | null;
  topRejectionReasons: Array<{ reasonCode: string; count: number }>;
  registeredUsers: number;
  guestUsers: number;
}
