import type { AdminSummary, EventRequest, ProfileRecord, SessionRecord } from "@pulse-reaction/shared-schemas";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "";

export async function ensureAnonymousUser(localUserId: string): Promise<void> {
  await post("/api/users/anonymous", { localUserId });
}

export async function saveServerProfile(input: {
  localUserId: string;
  displayName: string;
  handle: string;
}): Promise<ProfileRecord | null> {
  return post<ProfileRecord>("/api/profiles", input);
}

export async function createServerSession(localUserId: string, route: string): Promise<SessionRecord | null> {
  return post<SessionRecord>("/api/sessions", { localUserId, route });
}

export async function recordEvent(input: EventRequest): Promise<void> {
  await post("/api/events", input);
}

export async function loadAdminSummary(): Promise<AdminSummary | null> {
  try {
    const response = await fetch(`${API_ORIGIN}/api/admin/summary`);
    if (!response.ok) return null;
    return (await response.json()) as AdminSummary;
  } catch {
    return null;
  }
}

async function post<T = unknown>(path: string, body: unknown): Promise<T | null> {
  try {
    const response = await fetch(`${API_ORIGIN}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
