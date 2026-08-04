# Public App And Admin Split

Status: MVP scaffold.

## Routes

- `/`: public no-login entry.
- `/room`: public video-chat room with server-backed roulette queue when the backend is available.
- `/admin`: internal platform control room.
- `/admin/debug`: current rPPG/debug console.

## Identity

The browser client assigns a stable anonymous user ID on first visit and stores it in local storage. This is enough for device continuity during the MVP, but it is not a server account.

Server-backed identity now has a first MVP implementation in `apps/signaling-backend`:

- `users`: anonymous ID, optional registered profile, created/last seen timestamps;
- `sessions`: session ID, user ID, route, device class, consent state, start/end timestamps;
- `events`: visit, room start, camera grant, analysis start, peer connect, disconnect, registration start, registration complete;
- `consent_events`: adults-only chat terms, camera access, physiological analysis, and research feedback decisions;
- `reaction_outputs`: cleaned output only, with model version, method version, confidence, quality metrics, reason codes, and no raw video.

The browser client posts anonymous user/profile/event records when the API is available and falls back to local-only behavior when it is not.

The public room is adults-only. Browser entry and direct `/room` navigation require local adults-only acknowledgement before matching begins. The acknowledgement is also posted to `POST /api/consent-events` when the backend is available.

## Matching

The first matching MVP is implemented in `apps/signaling-backend` with:

- `waiting_queue`: active queue entries with session linkage;
- `matches`: active and ended match records;
- `blocked_users`: block-aware rematching prevention;
- `POST /api/matchmaking/join`;
- `GET /api/matchmaking/status`;
- `POST /api/matchmaking/leave`.

The browser room joins the live queue after a server session is created, polls status, shows the matched peer profile, records report/block/next actions, and uses the signaling relay to exchange WebRTC offer/answer/ICE payloads for active matches.

## WebRTC Signaling

The first signaling relay is HTTP polling over persisted messages:

- `signaling_messages`: active-match-scoped offer, answer, and ICE candidate payloads;
- `POST /api/signaling/messages`;
- `GET /api/signaling/messages`.

Only users who belong to an active match can post or read signaling messages for that match. The browser caller role creates an offer, the callee role answers, and both sides exchange ICE candidates. The backend does not store media streams.

## Admin

The `/admin` route reads `GET /api/admin/summary` when the own-server backend is available and an admin token is supplied. It shows pending/auth states rather than fake data when the API is offline, unauthorized, or not configured. The first backend summary includes visits, room starts, camera grant rate, active sessions, waiting users, active matches, sufficient-signal ratio, top rejection reasons, and registered-vs-guest counts.

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

Continue in `apps/signaling-backend` with a single-server MVP on the SynVibe server. SQLite remains the first storage layer for operational simplicity. The next backend step is deploying the service behind nginx, then testing two real browser windows with camera permissions and adding TURN for stricter networks.
