# Domain and deployment

Status: `PROVISIONAL` for launch operations after the first server deploy succeeds.

## Domain

- Public domain: `synvibe.app`
- Display name: `SynVibe`
- Local development origin: `http://localhost:1059`
- Local browser prototype: `http://127.0.0.1:1059/`
- First production host: self-hosted nginx on `165.232.145.239`
- First production artifact: `apps/browser-client/dist`
- GitHub Pages role: static fallback while the dedicated server becomes the primary launch path

## Repository setup

The browser prototype is prepared for two deployment paths:

1. Primary: build locally and sync `apps/browser-client/dist` to the project server.
2. Fallback: GitHub Pages deployment through `.github/workflows/deploy-pages.yml`.

Server deployment source:

1. Build `apps/browser-client` with Vite.
2. Upload the generated `dist` files to `/var/www/synvibe.app/releases/<timestamp>`.
3. Switch `/var/www/synvibe.app/current` to the new release.
4. Serve `current` through nginx for `synvibe.app` and `www.synvibe.app`.

Backend deployment source:

1. Run `apps/signaling-backend` as a local-only service on `127.0.0.1:1060`.
2. Store production environment values in `/etc/synvibe/signaling-backend.env`.
3. Store SQLite data in `/var/lib/synvibe/synvibe.sqlite`.
4. Proxy `/api/` from nginx to `http://127.0.0.1:1060`.
5. Protect `/admin` and `/admin/debug` with nginx basic auth.
6. Require `SYNVIBE_ADMIN_TOKEN` for `/api/admin/*`; the browser sends it through `X-SynVibe-Admin-Token` after the admin enters it.

Templates:

- `deployment/nginx/synvibe.app.conf.example`
- `deployment/systemd/synvibe-signaling-backend.service.example`
- `apps/signaling-backend/.env.production.example`

Automation:

- `scripts/deploy-browser-client.sh` deploys the static browser bundle.
- `scripts/deploy-signaling-backend.sh` syncs the repository, installs dependencies, installs/restarts the systemd service, optionally installs nginx proxy config, and checks local backend health.
- `scripts/smoke-production-api.sh` checks public `/api/health`, verifies `/api/admin/summary` rejects missing tokens, and optionally checks authenticated admin summary when `ADMIN_TOKEN` is set.

Backend deploy command:

```bash
SERVER_HOST=root@165.232.145.239 scripts/deploy-signaling-backend.sh
```

Production API smoke command:

```bash
ADMIN_TOKEN=<private token> scripts/smoke-production-api.sh
```

Current server status:

- Server SSH target: `root@165.232.145.239`
- Deployed release: `/var/www/synvibe.app/releases/20260728032427`
- Active symlink: `/var/www/synvibe.app/current`
- Nginx site: `/etc/nginx/sites-available/synvibe.app`
- Current protocol: HTTPS with HTTP-to-HTTPS redirect.
- TLS certificate: Let's Encrypt certificate for `synvibe.app` and `www.synvibe.app`, expiring on 2026-10-26 with certbot auto-renewal enabled.

GitHub Pages fallback source:

1. `main` branch push triggers a build.
2. GitHub Actions installs dependencies with pnpm.
3. Guardrail checks, type checks, and tests run before deployment.
4. Vite builds `apps/browser-client`.
5. The Pages artifact includes `apps/browser-client/public/CNAME` with `synvibe.app`.

## GitHub Pages fallback setup

Current repository status:

- GitHub Pages is enabled with `build_type=workflow`.
- Custom domain is set to `synvibe.app`.
- HTTPS enforcement is waiting while the project server is the primary deployment path.

Required repository settings:

1. Enable GitHub Pages.
2. Set the Pages source to GitHub Actions.
3. Set custom domain to `synvibe.app`.
4. Enable HTTPS enforcement after DNS verification succeeds.

Important: if GitHub Pages becomes primary again, add the custom domain in GitHub Pages before pointing DNS records at GitHub Pages to reduce custom-domain takeover risk.

## Cloudflare DNS setup

Set these records at the domain registrar or DNS provider.

Current DNS observation:

- Nameservers are delegated to Cloudflare: `kate.ns.cloudflare.com`, `paul.ns.cloudflare.com`.
- `synvibe.app` resolves to `165.232.145.239`.
- `www.synvibe.app` is a CNAME to `synvibe.app`.

Cloudflare records to remove:

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | `162.255.119.220` |
| Any proxied A/CNAME | `www` | registrar parking or non-GitHub target |

Cloudflare records to create for the primary server:

For the apex domain `synvibe.app`:

| Type | Host | Value | Proxy status |
| --- | --- | --- | --- |
| A | `@` | `165.232.145.239` | DNS only |

For `www.synvibe.app`:

| Type | Host | Value | Proxy status |
| --- | --- | --- | --- |
| CNAME | `www` | `synvibe.app` | DNS only |

Keep `DNS only` for the initial launch. Cloudflare proxying can be reconsidered as a separate deployment decision after WebSocket, WebRTC signaling, and certificate behavior are tested end to end.

## Admin Access

Use two layers for the first private admin release:

1. Nginx basic auth for `/admin` and `/admin/debug`, using `/etc/nginx/synvibe-admin.htpasswd`.
2. Backend token auth for `/api/admin/*`, using `SYNVIBE_ADMIN_TOKEN`.

The admin token is not compiled into the browser bundle. The admin enters it locally in `/admin`, and the browser stores it in local storage for subsequent summary requests.

If GitHub Pages becomes primary again, replace these records with the GitHub Pages A/AAAA records and `www -> Stebalnik.github.io`.

Do not create wildcard DNS records for this launch unless a later threat model explicitly approves them.

## Assumptions

- `synvibe.app` is the intended public domain for the first browser prototype.
- The dedicated server is the primary deployment target because the product will need signaling, WebSocket sessions, API routes, and future desktop distribution support.
- TURN configuration and desktop distribution will need separate deployment decisions after the local prototype is validated.
- No raw video, biometric time series, or precise BPM sharing is enabled by this static browser deployment.
- DNS propagation can take up to 24 hours after registrar records are changed.
