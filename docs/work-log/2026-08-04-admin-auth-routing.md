# 2026-08-04 Admin Auth And Routing

## Summary

Added the first production-shaped admin access and backend routing layer. Admin summary data now requires a backend token, public UI no longer advertises the admin route by default, and deployment templates define nginx proxying, basic auth, and systemd service setup.

## What Changed

- Added `SYNVIBE_ADMIN_TOKEN` support to `apps/signaling-backend`.
- Gated `/api/admin/summary` with `X-SynVibe-Admin-Token`.
- Returned `admin_auth_not_configured` when the backend token is missing.
- Added admin token entry in `/admin`, stored locally in the browser instead of compiled into the bundle.
- Hid the public `Admin` link unless `VITE_SHOW_ADMIN_LINK=true`.
- Added production examples:
  - `apps/signaling-backend/.env.production.example`;
  - `deployment/nginx/synvibe.app.conf.example`;
  - `deployment/systemd/synvibe-signaling-backend.service.example`.
- Updated deployment and architecture docs.

## Why

Operational metrics and debug tools should not be publicly exposed as the service moves from shell to live dating product. This keeps admin data private while preserving a lightweight first-server deployment path.

## Assumptions And Constraints

- Nginx basic auth protects `/admin` and `/admin/debug`.
- Backend token auth protects `/api/admin/*`.
- Public API endpoints remain available for anonymous users, matchmaking, and WebRTC signaling.
- Secrets are provisioned on the server and are not committed to the repository.

## User-Facing Impact

Public users no longer see an admin link by default. Admin users can still visit `/admin`, pass nginx auth in production, enter the private admin token, and view operational metrics.

## Data And Privacy

No new biometric data is stored. This change reduces exposure risk for operational analytics and internal debug surfaces. Raw video, raw audio, raw pulse traces, and direct emotion labels remain out of default backend storage.

## Commands And Checks

```bash
PATH="/Users/aliaksandrstsebikhau/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc --noEmit
PATH="/Users/aliaksandrstsebikhau/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node --import tsx --test tests/*.test.ts
PATH="/Users/aliaksandrstsebikhau/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node scripts/check-repo.mjs
PATH="/Users/aliaksandrstsebikhau/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/vite build
```

## Deployment Status

Not deployed in this task.

## Recommended Next Steps

1. Apply nginx and systemd templates on the server.
2. Smoke test `/api/health`, public room matching, and `/admin` with basic auth plus token auth.
3. Add TURN server configuration for more reliable WebRTC.
