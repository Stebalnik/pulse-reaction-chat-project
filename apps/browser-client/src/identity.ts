const USER_ID_STORAGE_KEY = "synvibe.userId";
const PROFILE_STORAGE_KEY = "synvibe.profile";

export interface LocalProfile {
  displayName: string;
  handle: string;
  createdAtIso: string;
}

export function getOrCreateAnonymousUserId(): string {
  const existing = window.localStorage.getItem(USER_ID_STORAGE_KEY);
  if (existing) return existing;
  const id = `SV-${randomSegment()}-${randomSegment()}`;
  window.localStorage.setItem(USER_ID_STORAGE_KEY, id);
  return id;
}

export function loadLocalProfile(): LocalProfile | null {
  const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalProfile;
  } catch {
    return null;
  }
}

export function saveLocalProfile(profile: Omit<LocalProfile, "createdAtIso">): LocalProfile {
  const next = {
    ...profile,
    createdAtIso: new Date().toISOString()
  };
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
  return next;
}

function randomSegment(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}
