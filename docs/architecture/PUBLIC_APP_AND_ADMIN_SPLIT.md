# Public App And Admin Split

Status: MVP scaffold.

## Routes

- `/`: public no-login entry.
- `/room`: public video-chat room shell.
- `/admin`: internal platform control room.
- `/admin/debug`: current rPPG/debug console.

## Identity

The browser client assigns a stable anonymous user ID on first visit and stores it in local storage. This is enough for device continuity during the MVP, but it is not a server account.

Server-backed identity should be added next:

- `users`: anonymous ID, optional registered profile, created/last seen timestamps;
- `sessions`: session ID, user ID, route, device class, consent state, start/end timestamps;
- `events`: visit, room start, camera grant, analysis start, peer connect, disconnect, registration start, registration complete;
- `reaction_outputs`: cleaned output only, with model version, method version, confidence, quality metrics, reason codes, and no raw video.

## Admin

The current `/admin` route is a scaffold for platform analytics. It intentionally does not show fake data. The first backend analytics release should populate:

- acquisition: visits, referrers, landing-to-room conversion;
- room funnel: camera grant, waiting, peer matched, call duration, disconnect reason;
- signal quality: sufficient-signal ratio, FPS distribution, ROI source, rejection reason codes;
- product outputs: badge distribution and baseline maturity, without exposing raw biometric traces;
- user experience: guest vs registered usage, repeat visits, registration conversion;
- operations: errors, API health, signaling queue size.

## Boundaries

Public UI must not claim to detect specific emotions, attraction, honesty, intent, compatibility, or medical state. It can display SynVibe reaction-pattern visuals and baseline-relative pulse-response language. Precise BPM must not be exposed to another participant by default.

## Next Backend Step

Use the existing `apps/signaling-backend` workspace for a single-server MVP with local storage on the SynVibe server. Start with SQLite for operational simplicity, then migrate only if usage requires it. No external analytics database is required for the first launch.
