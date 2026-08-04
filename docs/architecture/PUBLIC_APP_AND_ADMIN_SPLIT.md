# Public App And Admin Split

Status: MVP scaffold.

## Routes

- `/`: public no-login entry.
- `/room`: public video-chat room shell.
- `/admin`: internal platform control room.
- `/admin/debug`: current rPPG/debug console.

## Identity

The browser client assigns a stable anonymous user ID on first visit and stores it in local storage. This is enough for device continuity during the MVP, but it is not a server account.

Server-backed identity now has a first MVP implementation in `apps/signaling-backend`:

- `users`: anonymous ID, optional registered profile, created/last seen timestamps;
- `sessions`: session ID, user ID, route, device class, consent state, start/end timestamps;
- `events`: visit, room start, camera grant, analysis start, peer connect, disconnect, registration start, registration complete;
- `reaction_outputs`: cleaned output only, with model version, method version, confidence, quality metrics, reason codes, and no raw video.

The browser client posts anonymous user/profile/event records when the API is available and falls back to local-only behavior when it is not.

## Admin

The `/admin` route reads `GET /api/admin/summary` when the own-server backend is available. It shows pending states rather than fake data when the API is offline. The first backend summary includes visits, room starts, camera grant rate, active sessions, sufficient-signal ratio, top rejection reasons, and registered-vs-guest counts.

Next admin analytics should add:

- acquisition: visits, referrers, landing-to-room conversion;
- room funnel: camera grant, waiting, peer matched, call duration, disconnect reason;
- signal quality: sufficient-signal ratio, FPS distribution, ROI source, rejection reason codes;
- product outputs: badge distribution and baseline maturity, without exposing raw biometric traces;
- user experience: guest vs registered usage, repeat visits, registration conversion;
- operations: errors, API health, signaling queue size.

## Boundaries

Public UI must not claim to detect specific emotions, attraction, honesty, intent, compatibility, or medical state. It can display SynVibe reaction-pattern visuals and baseline-relative pulse-response language. Precise BPM must not be exposed to another participant by default.

## Next Backend Step

Continue in `apps/signaling-backend` with a single-server MVP on the SynVibe server. SQLite remains the first storage layer for operational simplicity. The next backend step is simple admin access control before exposing operational data, followed by roulette signaling and WebRTC offer/answer/candidate relay.
