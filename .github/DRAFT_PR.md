# Draft PR: on-device pulse engine, test chat prototype, and SynVibe domain setup

## Purpose

Add the first local-only pulse-rate estimation engine and a browser test chat prototype with a temporary peer placeholder, then deploy the public `synvibe.app` browser build to the project server.

## Evidence and assumptions

- Claim IDs: `CLM-0003`, `CLM-0004`, `CLM-0008`, `CLM-0009`, `CLM-0011`, `CLM-0012`, `CLM-0014`
- Evidence status: `PROVISIONAL`/`SUPPORTED` per knowledge records.
- Assumptions:
  - rPPG analysis runs on the user's device by default.
  - The first prototype can use a browser client while desktop packaging is prepared.
  - The temporary test peer is a placeholder for chat-flow testing only.
  - Local development uses port `1059`.
  - `synvibe.app` is the intended first public domain.
  - The dedicated server is now the primary deployment target because the product will need signaling, WebSocket sessions, API routes, and future desktop distribution support.
  - GitHub Pages remains a static fallback path.
  - Signaling and desktop distribution remain separate deployment decisions.
  - No raw video, biometric time series, or precise BPM sharing is enabled by the static deploy.

## Changes

- Added `packages/rppg-engine` with deterministic GREEN, CHROM, POS, and FUSION pulse-estimation baselines.
- Added quality gates for timestamps, ROI coverage, motion, illumination, weak spectra, and estimator disagreement.
- Added unit tests with deterministic synthetic traces.
- Added `apps/browser-client` Vite/React prototype on local port `1059`.
- Added local camera sampling from a center ROI into the on-device pulse engine.
- Added a temporary peer placeholder and chat composer for flow testing.
- Added SynVibe branding for the browser prototype.
- Added GitHub Pages workflow for `apps/browser-client/dist`.
- Added Pages `CNAME` for `synvibe.app`.
- Deployed the browser prototype to nginx on `165.232.145.239`.
- Added `scripts/deploy-browser-client.sh` for repeatable static browser deploys.
- Added `docs/architecture/DOMAIN_AND_DEPLOYMENT.md` with Cloudflare DNS records, server deployment status, and deployment assumptions.

## Acceptance criteria

- HR estimates include timestamp, window, BPM/null, signal quality, confidence, method version, ROI coverage, motion, illumination, and reason codes.
- Invalid windows return `bpm: null` and `confidence: invalid`.
- Browser prototype runs locally at `http://127.0.0.1:1059/`.
- Production build includes `CNAME` for `synvibe.app`.
- Server nginx serves the browser build for `synvibe.app` and `www.synvibe.app`.
- Cloudflare DNS is ready to point `synvibe.app` at `165.232.145.239`.
- No reaction-state inference, medical claim, or unsupported product claim is introduced.

## Validation

- [x] `pnpm check`
- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm --filter @pulse-reaction/browser-client build`
- [x] Verified `apps/browser-client/dist/CNAME` contains `synvibe.app`.
- [x] GitHub Pages site created with `build_type=workflow`.
- [x] GitHub Pages custom domain set to `synvibe.app`.
- [x] Deployed release `/var/www/synvibe.app/releases/20260728032427` to the project server.
- [x] Verified `curl -H 'Host: synvibe.app' http://165.232.145.239/` returns the SynVibe browser build.
- [x] Verified nginx config with `nginx -t` and reloaded nginx.

## DNS status

- Nameservers are delegated to Cloudflare: `kate.ns.cloudflare.com`, `paul.ns.cloudflare.com`.
- Current `synvibe.app` A record resolves to registrar parking: `162.255.119.220`.
- Current `www.synvibe.app` resolves through Cloudflare proxy IPs, which hides the origin from public DNS.
- Cloudflare DNS records should point `@` to `165.232.145.239` and `www` to `synvibe.app` with proxy status set to `DNS only` until server HTTPS is issued.
- Server HTTPS should be issued after DNS verification.

## Signal-quality and failure behavior

Invalidates short windows, timestamp gaps, low ROI coverage, high motion, weak spectra, illumination instability, and estimator disagreement. Invalid HR windows do not emit reaction states.

## Privacy and safety impact

- [x] On-device only pulse analysis in the current prototype.
- [x] No raw video/network/storage behavior for physiological traces.
- [x] No precise BPM sharing with another participant.
- [x] No unsupported emotion, attraction, honesty, intent, compatibility, or medical claim.
- [x] Consent toggle is required before local pulse analysis starts.

## Risks and rollback

Risk: current rPPG estimator is a deterministic baseline for testing, not a validated production model.

Risk: `synvibe.app` will not serve the app until Cloudflare DNS records are updated to point at `165.232.145.239`.

Rollback: remove `packages/rppg-engine`, `apps/browser-client`, the Pages workflow, the CNAME file, the nginx site `/etc/nginx/sites-enabled/synvibe.app`, `/var/www/synvibe.app`, and related docs updates.
