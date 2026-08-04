# 2026-08-03 Public MVP Handoff

## Summary

This chat moved SynVibe from a research-first repository and rPPG debug prototype toward a public MVP shell. The current production site at `https://synvibe.app` now has a no-login entry, a user room shell, and an internal admin/debug split. The current rPPG console remains available at `/admin/debug`.

The next chat should focus on the first server-backed MVP: own-server identity, sessions, analytics events, and cleaned reaction-pattern output storage. Do not add external analytics databases for the first version.

## What Changed

- Created and deployed a browser client with these routes:
  - `/`: public no-login entry;
  - `/room`: public video-room shell;
  - `/admin`: internal platform control room scaffold;
  - `/admin/debug`: existing rPPG/debug console.
- Added local anonymous user IDs in the browser with IDs shaped like `SV-XXXXXX-XXXXXX`.
- Added a local registration placeholder stored on the device.
- Kept the debug console separate from the public product surface.
- Added legal draft docs:
  - `docs/legal/TERMS_DRAFT.md`;
  - `docs/legal/PRIVACY_DRAFT.md`.
- Added architecture doc:
  - `docs/architecture/PUBLIC_APP_AND_ADMIN_SPLIT.md`.
- Added `PEAK_INTERVAL` as a time-domain rPPG candidate in `packages/rppg-engine`.
- Added region-group diagnostics for `forehead`, `left-cheek`, and `right-cheek`.
- Added multi-zone face ROI, MediaPipe face landmarks, illumination correction, temporal outlier handling, and debug session logging in earlier commits on this branch.
- Deployed latest public shell release to the SynVibe server.

## Why

The project needs real user traffic soon, but the research/debug interface is too technical for public use. The split allows:

- public users to start quickly without account friction;
- the founder/admin to keep the full signal debugging console;
- future backend analytics to attach to `/admin`;
- privacy-sensitive rPPG processing to remain device-first while the server stores only cleaned operational outputs.

## Current Production State

- Domain: `https://synvibe.app`.
- Server: self-hosted nginx on `165.232.145.239`.
- Active deployment after the public/admin split:
  - release: `/var/www/synvibe.app/releases/20260803032437`;
  - JS bundle: `index-Bjeflo8J.js`;
  - CSS bundle: `index-C3F2ci-n.css`.
- Branch: `feat/on-device-pulse-engine`.
- Latest commit in this stage: `8a0b66c feat(app): add public shell and admin split`.

## Important Commits

- `8a0b66c feat(app): add public shell and admin split`
- `ee0c34b feat(rppg): add peak interval estimator`
- `a38f5a3 feat(rppg): add region agreement diagnostics`
- `81e4b10 fix(rppg): fast-confirm agreed temporal jumps`
- `cff1188 feat(vision): add multi-zone roi sampling`
- `296c297 feat(rppg): add monochrome illumination correction`

## rPPG State

The browser debug console currently uses:

- on-device MediaPipe Face Landmarker ROI;
- 7 face/skin candidate zones;
- grouped region diagnostics for `forehead`, `left-cheek`, and `right-cheek`;
- aggregate RGB trace with skin and brightness consistency filtering;
- GREEN, CHROM, POS, and PEAK_INTERVAL candidates;
- fusion and agreement gates;
- personal baseline trend monitor;
- local debug session logging with schema `debug-session-log-0.1.1`.

Current known issues:

- low light still causes lower effective FPS, stronger camera gain, and unstable candidates;
- per-region traces are only diagnostics and not yet used for dynamic weighting of the main aggregate trace;
- current public room is a shell, not real roulette matching;
- public room does not yet show live peer-derived reaction patterns because WebRTC/signaling is not implemented in this browser shell.

## Safety And Privacy

Non-negotiable constraints remain:

- do not call SynVibe a system for exact internal-state detection;
- do not expose precise BPM to another participant by default;
- do not retain raw video by default;
- do not retain raw biometric time series by default;
- require consent before physiological analysis;
- keep user-facing outputs as coarse reaction-pattern visuals or baseline-relative pulse-response language;
- invalid HR windows must not emit reaction-pattern output.

The legal docs are drafts only and require qualified counsel before launch.

## Assumptions

- First public launch can begin with browser web rather than desktop packaging if it accelerates validation.
- The dedicated SynVibe server is the primary production target.
- The first backend should use local server storage, preferably SQLite, before any external database or analytics platform.
- Server receives operational records and cleaned outputs, not raw frames or raw traces by default.
- A future model-improvement pipeline will need explicit consent, schema versions, retention rules, and dataset governance.

## Checks

The latest public/admin split was verified with:

```bash
pnpm typecheck
pnpm test
pnpm check
pnpm --filter @pulse-reaction/browser-client build
```

Playwright smoke checks covered:

- `/`
- `/room`
- `/admin`
- `/admin/debug`

Production route checks returned HTTP `200` for:

- `https://synvibe.app/`
- `https://synvibe.app/room`
- `https://synvibe.app/admin`
- `https://synvibe.app/admin/debug`

## Deployment

Deploy command used by this project:

```bash
RELEASE_ID=$(date -u +%Y%m%d%H%M%S) scripts/deploy-browser-client.sh
```

The deploy script builds `apps/browser-client/dist`, uploads it to `/var/www/synvibe.app/releases/<release>`, switches `/var/www/synvibe.app/current`, tests nginx, and reloads.

## Plan For The Next Chat

Goal: make the public MVP useful for early users and make `/admin` show real platform analytics from own-server data.

Recommended sequence:

1. Build `apps/signaling-backend` MVP on the existing server.
2. Add SQLite storage on the server for:
   - users;
   - profiles;
   - sessions;
   - events;
   - consent events;
   - room/match events;
   - cleaned reaction-pattern outputs;
   - quality metrics and reason codes.
3. Add backend endpoints:
   - `POST /api/users/anonymous`;
   - `POST /api/profiles`;
   - `POST /api/sessions`;
   - `POST /api/events`;
   - `POST /api/reaction-outputs`;
   - `GET /api/admin/summary`.
4. Connect browser client to backend:
   - replace local-only registration placeholder with server profile creation;
   - record visits, room starts, camera grants, analysis starts, exits;
   - keep raw video and raw traces local.
5. Add `/admin` real analytics:
   - visits;
   - room starts;
   - camera grant rate;
   - active sessions;
   - average session duration;
   - sufficient-signal ratio;
   - top rejection reasons;
   - registered vs guest users.
6. Add simple admin access control before exposing operational data.
7. Add roulette signaling:
   - waiting queue;
   - peer match;
   - WebRTC offer/answer/candidate relay;
   - disconnect/requeue;
   - report/block placeholders.
8. Add consented cleaned output upload:
   - model version;
   - method version;
   - confidence;
   - reason codes;
   - region agreement summary;
   - no raw video, no raw RGB trace.
9. Update docs and schemas after each meaningful step.
10. Add a new `docs/work-log/YYYY-MM-DD-*.md` entry at the end of the task.

## Open Product Questions

- Should public `/room` start with the bot peer until matching is live, or show a waiting queue immediately?
- What minimum profile fields are needed for registration before chat history/contact features exist?
- What admin auth is acceptable for the first private server release: nginx basic auth, signed admin token, or server login?
- What exact cleaned reaction-pattern outputs are useful enough for model improvement without storing sensitive raw traces?
