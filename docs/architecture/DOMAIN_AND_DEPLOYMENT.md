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

Current server status:

- Server SSH target: `root@165.232.145.239`
- Deployed release: `/var/www/synvibe.app/releases/20260728032427`
- Active symlink: `/var/www/synvibe.app/current`
- Nginx site: `/etc/nginx/sites-available/synvibe.app`
- Current protocol: HTTP only until DNS points to the server and a certificate is issued.

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
- `synvibe.app` still resolves to the registrar parking address `162.255.119.220`.
- `www.synvibe.app` resolves through Cloudflare proxy IPs, which hides the origin from public DNS.

Cloudflare records to remove:

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | `162.255.119.220` |
| Any proxied A/CNAME | `www` | registrar parking or non-GitHub target |

Cloudflare records to create for the primary server:

For the apex domain `synvibe.app`:

| Type | Host | Value | Proxy status |
| --- | --- | --- | --- |
| A | `@` | `165.232.145.239` | DNS only until server HTTPS is issued |

For `www.synvibe.app`:

| Type | Host | Value | Proxy status |
| --- | --- | --- | --- |
| CNAME | `www` | `synvibe.app` | DNS only until server HTTPS is issued |

Use `DNS only` until server HTTPS is issued. After that, Cloudflare proxying can be reconsidered as a separate deployment decision.

If GitHub Pages becomes primary again, replace these records with the GitHub Pages A/AAAA records and `www -> Stebalnik.github.io`.

Do not create wildcard DNS records for this launch unless a later threat model explicitly approves them.

## Assumptions

- `synvibe.app` is the intended public domain for the first browser prototype.
- The dedicated server is the primary deployment target because the product will need signaling, WebSocket sessions, API routes, and future desktop distribution support.
- Signaling and desktop distribution will need separate deployment decisions after the local prototype is validated.
- No raw video, biometric time series, or precise BPM sharing is enabled by this static browser deployment.
- DNS propagation can take up to 24 hours after registrar records are changed.
