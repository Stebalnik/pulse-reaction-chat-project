# Signaling backend

Planned backend for authentication, adults-only controls, matchmaking, WebRTC signaling, feature flags, and privacy-safe operational telemetry.

Current MVP scope:

- Node HTTP API on `SIGNALING_PORT` or `PORT`, defaulting to `1060` for local side-by-side browser development.
- SQLite storage at `SYNVIBE_DB_PATH`, defaulting to `data/synvibe.sqlite`.
- Anonymous users, server-validated unique profile handles with optional search filters, sessions with explicit end records, operational events, and cleaned reaction-output records.
- Dedicated consent-event records for adults-only chat terms, camera access, physiological analysis, and research feedback.
- Adults-only consent enforcement before matchmaking, roulette waiting queue, mutual profile-filter matching, active match records, match leave handling, reason-coded report/block moderation records, message-level report references, admin review queue with status filters and repeated-report indicators, and block-aware rematching.
- WebRTC offer/answer/ICE signaling relay scoped to active matches.
- Active-match text chat scoped to matched participants, with sender delete controls and configurable retention.
- Admin summary metrics for `/admin`, including reaction output state, confidence, and region-agreement breakdowns without exposing raw biometric traces or precise peer BPM.
- Token-gated owner admin API access through `SYNVIBE_ADMIN_TOKEN` and `X-SynVibe-Admin-Token`.
- Least-privilege admin tokens for summary-only metrics and moderation reviewers through `SYNVIBE_ADMIN_SUMMARY_TOKENS` and `SYNVIBE_ADMIN_REVIEWER_TOKENS`.
- Optional owner-token reviewer identity enforcement for moderation resolution through `SYNVIBE_ADMIN_REVIEWER_IDS` and `X-SynVibe-Reviewer-Id`.

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
SYNVIBE_ADMIN_SUMMARY_TOKENS=<summary-token-1>,<summary-token-2>
SYNVIBE_ADMIN_REVIEWER_TOKENS=ops-alex:<reviewer-token-1>,ops-riley:<reviewer-token-2>
SYNVIBE_ADMIN_REVIEWER_IDS=ops-alex,ops-riley
SYNVIBE_CHAT_RETENTION_HOURS=24
```

If all admin tokens for a requested admin scope are missing, `/api/admin/*` returns `admin_auth_not_configured` instead of exposing operational data. `SYNVIBE_ADMIN_TOKEN` remains an owner token for the full admin surface. `SYNVIBE_ADMIN_SUMMARY_TOKENS` can read `/api/admin/summary` only. `SYNVIBE_ADMIN_REVIEWER_TOKENS` entries use `reviewerId:token` and can read/update moderation reports only; moderation resolutions made with a reviewer token automatically store that reviewer ID and reject mismatched `X-SynVibe-Reviewer-Id` headers.

If an owner token is used and `SYNVIBE_ADMIN_REVIEWER_IDS` is set, moderation resolution requires `X-SynVibe-Reviewer-Id` to match one of the configured reviewer IDs. If `SYNVIBE_ADMIN_REVIEWER_ID` is set without an allowlist, it is used as the default reviewer ID for single-operator owner-token deployments.

Deploy:

```bash
SERVER_HOST=root@165.232.145.239 scripts/deploy-signaling-backend.sh
```

Smoke public routing:

```bash
ADMIN_TOKEN=<private token> scripts/smoke-production-api.sh
```

Endpoints:

- `GET /health`
- `GET /api/health`
- `POST /api/users/anonymous`
- `GET /api/profiles?localUserId=...`
- `POST /api/profiles`
- `POST /api/sessions`
- `POST /api/sessions/end`
- `POST /api/events`
- `POST /api/consent-events`
- `POST /api/moderation/reports`
- `GET /api/admin/moderation/reports`
- `POST /api/admin/moderation/reports/resolve`
- `POST /api/matchmaking/join`
- `GET /api/matchmaking/status`
- `POST /api/matchmaking/leave`
- `POST /api/signaling/messages`
- `GET /api/signaling/messages`
- `POST /api/match-chat/messages`
- `GET /api/match-chat/messages`
- `POST /api/match-chat/messages/delete`
- `POST /api/reaction-outputs`
- `GET /api/admin/summary`

Privacy boundary: this service must not receive raw video, raw RGB traces, or another participant's precise BPM by default. WebRTC signaling stores setup payloads for active matches only; media flows through peer connections rather than server storage. Match chat stores user-entered text for active matched participants only, lets the sender replace their own message body with a deletion tombstone, and prunes retained chat rows after `SYNVIBE_CHAT_RETENTION_HOURS` hours. Message-level moderation reports store message IDs and derive current retained/deleted/expired status for review; they do not snapshot deleted or expired message bodies. Reaction output uploads require active `physiological_analysis` consent and are cleaned records with model/method version, confidence, reason codes, quality score, and coarse state only.

Dating safety boundary: `POST /api/matchmaking/join` requires active `adult_chat_terms` consent for the user. If consent is missing or revoked, the backend returns `status: "ineligible"` with `reason: "adult_chat_terms_required"` and does not create a waiting queue entry or match.
