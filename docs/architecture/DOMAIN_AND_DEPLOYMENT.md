# Domain and deployment

Status: `HYPOTHESIS` for launch operations until the first production deploy succeeds.

## Domain

- Public domain: `synvibe.app`
- Display name: `SynVibe`
- Local development origin: `http://localhost:1059`
- Local browser prototype: `http://127.0.0.1:1059/`
- First production host: GitHub Pages
- First production artifact: `apps/browser-client/dist`

## Repository setup

The browser prototype is prepared for GitHub Pages deployment through `.github/workflows/deploy-pages.yml`.

Deployment source:

1. `main` branch push triggers a build.
2. GitHub Actions installs dependencies with pnpm.
3. Guardrail checks, type checks, and tests run before deployment.
4. Vite builds `apps/browser-client`.
5. The Pages artifact includes `apps/browser-client/public/CNAME` with `SYNVIBE.app`.

## GitHub setup

Current repository status:

- GitHub Pages is enabled with `build_type=workflow`.
- Custom domain is set to `synvibe.app`.
- HTTPS enforcement is waiting on DNS and certificate readiness.

Required repository settings:

1. Enable GitHub Pages.
2. Set the Pages source to GitHub Actions.
3. Set custom domain to `synvibe.app`.
4. Enable HTTPS enforcement after DNS verification succeeds.

Important: add the custom domain in GitHub Pages before pointing DNS records at GitHub Pages to reduce custom-domain takeover risk.

## Registrar DNS setup

Set these records at the domain registrar or DNS provider.

Current DNS observation: `synvibe.app` still resolves to the registrar parking address `162.255.119.220`, and `www.synvibe.app` resolves to `parkingpage.namecheap.com`.

For the apex domain `synvibe.app`:

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |

For `www.synvibe.app`:

| Type | Host | Value |
| --- | --- | --- |
| CNAME | `www` | `Stebalnik.github.io` |

Do not create wildcard DNS records for this launch unless a later threat model explicitly approves them.

## Assumptions

- `synvibe.app` is the intended public domain for the first browser prototype.
- GitHub Pages is sufficient for the first static browser prototype.
- Signaling and desktop distribution will need separate deployment decisions after the local prototype is validated.
- No raw video, biometric time series, or precise BPM sharing is enabled by this static deployment.
- DNS propagation can take up to 24 hours after registrar records are changed.
