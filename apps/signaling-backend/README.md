# Signaling backend

Planned backend for authentication, adults-only controls, matchmaking, WebRTC signaling, feature flags, and privacy-safe operational telemetry.

Current MVP scope:

- Node HTTP API on `SIGNALING_PORT` or `PORT`, defaulting to `1060` for local side-by-side browser development.
- SQLite storage at `SYNVIBE_DB_PATH`, defaulting to `data/synvibe.sqlite`.
- Anonymous users, profiles, sessions, operational events, and cleaned reaction-output records.
- Roulette waiting queue, active match records, match leave/report/block handling, and block-aware rematching.
- WebRTC offer/answer/ICE signaling relay scoped to active matches.
- Admin summary metrics for `/admin`.
- Token-gated admin API access through `SYNVIBE_ADMIN_TOKEN` and `X-SynVibe-Admin-Token`.

Run locally:

```bash
pnpm --filter @pulse-reaction/signaling-backend dev
```

Production environment:

```bash
SIGNALING_PORT=1060
LOCAL_APP_ORIGIN=https://synvibe.app
SYNVIBE_DB_PATH=/var/lib/synvibe/synvibe.sqlite
SYNVIBE_ADMIN_TOKEN=<private random token>
```

If `SYNVIBE_ADMIN_TOKEN` is missing, `/api/admin/*` returns `admin_auth_not_configured` instead of exposing operational data.

Endpoints:

- `GET /health`
- `GET /api/health`
- `POST /api/users/anonymous`
- `POST /api/profiles`
- `POST /api/sessions`
- `POST /api/events`
- `POST /api/matchmaking/join`
- `GET /api/matchmaking/status`
- `POST /api/matchmaking/leave`
- `POST /api/signaling/messages`
- `GET /api/signaling/messages`
- `POST /api/reaction-outputs`
- `GET /api/admin/summary`

Privacy boundary: this service must not receive raw video, raw RGB traces, or another participant's precise BPM by default. WebRTC signaling stores setup payloads for active matches only; media flows through peer connections rather than server storage. Reaction output uploads are cleaned records with model/method version, confidence, reason codes, quality score, and coarse state only.
