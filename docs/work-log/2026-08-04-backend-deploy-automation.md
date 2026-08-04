# 2026-08-04 Backend Deploy Automation

## Summary

Added reproducible deployment and smoke-test automation for the SynVibe signaling backend. This turns the production routing templates into a guarded deploy path instead of a manual checklist.

## What Changed

- Added `scripts/deploy-signaling-backend.sh`.
- Added `scripts/smoke-production-api.sh`.
- Kept secret values out of the repository; deploy fails if the server env file or admin token is missing.
- Kept nginx admin exposure guarded; deploy fails if `/etc/nginx/synvibe-admin.htpasswd` is missing when nginx config deployment is enabled.
- Updated backend and deployment docs with deploy/smoke commands.

## Why

The service now has real backend APIs, matching, signaling, and admin metrics. A dating-service beta needs these deployed reproducibly, with safety checks that prevent accidentally exposing admin surfaces or running without the token gate.

## Assumptions And Constraints

- The production host is `root@165.232.145.239` by default.
- Backend app root is `/opt/synvibe/pulse-reaction-chat-project`.
- Backend data lives in `/var/lib/synvibe`.
- Server secrets live in `/etc/synvibe/signaling-backend.env`.
- Nginx basic auth file lives at `/etc/nginx/synvibe-admin.htpasswd`.

## User-Facing Impact

No public UI change in this slice. It prepares the backend for safer production rollout behind `synvibe.app`.

## Data And Privacy

No biometric data handling changed. The automation reinforces admin access controls and keeps secrets out of source control.

## Commands And Checks

```bash
PATH="/Users/aliaksandrstsebikhau/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc --noEmit
PATH="/Users/aliaksandrstsebikhau/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node --import tsx --test tests/*.test.ts
PATH="/Users/aliaksandrstsebikhau/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node scripts/check-repo.mjs
```

## Deployment Status

Not deployed in this task. The script is ready for a guarded server run after the server env file and nginx htpasswd are provisioned.

## Recommended Next Steps

1. Provision `/etc/synvibe/signaling-backend.env` with a private `SYNVIBE_ADMIN_TOKEN`.
2. Provision `/etc/nginx/synvibe-admin.htpasswd`.
3. Run `scripts/deploy-signaling-backend.sh`.
4. Run `ADMIN_TOKEN=<private token> scripts/smoke-production-api.sh`.
