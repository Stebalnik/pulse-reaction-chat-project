# Signaling backend

Planned backend for authentication, adults-only controls, matchmaking, WebRTC signaling, feature flags, and privacy-safe operational telemetry.

Current MVP scope:

- Node HTTP API on `SIGNALING_PORT` or `PORT`, defaulting to `1060` for local side-by-side browser development.
- SQLite storage at `SYNVIBE_DB_PATH`, defaulting to `data/synvibe.sqlite`.
- Anonymous users, profiles, sessions, operational events, and cleaned reaction-output records.
- Admin summary metrics for `/admin`.

Run locally:

```bash
pnpm --filter @pulse-reaction/signaling-backend dev
```

Endpoints:

- `GET /health`
- `POST /api/users/anonymous`
- `POST /api/profiles`
- `POST /api/sessions`
- `POST /api/events`
- `POST /api/reaction-outputs`
- `GET /api/admin/summary`

Privacy boundary: this service must not receive raw video, raw RGB traces, or another participant's precise BPM by default. Reaction output uploads are cleaned records with model/method version, confidence, reason codes, quality score, and coarse state only.
