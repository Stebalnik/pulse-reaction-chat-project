# Draft PR: docs/infrastructure scaffold for desktop-first research MVP

## Purpose

Prepare the repository for a one-month desktop-first MVP without implementing rPPG algorithms, reaction inference, matchmaking, or a user-facing application in this PR.

## Evidence and assumptions

- Claim IDs: `CLM-0001`, `CLM-0002`, `CLM-0003`
- Evidence status: `HYPOTHESIS`, `SUPPORTED`, `PROVISIONAL`
- Assumptions:
  - The first milestone is repository/evidence readiness, followed by offline benchmarks.
  - The delivery target is now a packaged desktop beta first, with browser support kept as a reusable secondary surface.
  - Local development uses port `1059`.
  - TypeScript is suitable for shared contracts across browser, backend, and repo checks.
  - Python should be introduced for numerical research once benchmark code begins.
  - Raw video and biometric-adjacent time series remain out of git by default.
  - The project must present physiology-derived trends only when consent, signal quality, and baseline requirements are satisfied.

## Changes

- Added pnpm workspace scaffolding for:
  - `apps/desktop-client`
  - `apps/browser-client`
  - `apps/signaling-backend`
  - `packages/shared-schemas`
  - `packages/research-pipeline`
- Added local development defaults for port `1059`.
- Added index files for empty docs and knowledge directories.
- Added minimal root project config:
  - `package.json`
  - `pnpm-workspace.yaml`
  - `tsconfig.json`
  - `.editorconfig`
- Added `scripts/check-repo.mjs` for structure, schema, and product-claim guardrail checks.
- Added `docs/architecture/TECH_STACK_DECISION.md`.
- Added `docs/architecture/LOCAL_DEVELOPMENT.md`.
- Added `docs/product/ONE_MONTH_LAUNCH_PLAN.md`.
- Added `.github/ISSUES_PHASE_0_1.md`.

## Acceptance criteria

- Repository structure is logical and documented.
- Missing empty directories are represented by README or `.gitkeep` files.
- Minimal project config exists for future development.
- Local dev port `1059` is documented.
- Desktop-first launch plan is documented.
- No rPPG algorithms or user application behavior are implemented.
- Scientific claim and safety rules are unchanged.
- Tech-stack decision documents assumptions, tradeoffs, privacy implications, and deferred choices.
- Phase 0 and Phase 1 GitHub Issue drafts are available.

## Validation

- [ ] Formatting
- [ ] Lint
- [ ] Type checks
- [ ] Unit tests
- [ ] Integration tests
- [ ] Relevant benchmark

Commands to run before marking ready for review:

```bash
pnpm install
pnpm check
pnpm lint
pnpm typecheck
pnpm test
pnpm dev
```

## Signal-quality and failure behavior

No signal processing was implemented. The scaffold preserves the requirement that invalid or insufficient-quality HR windows must not produce reaction states.

## Privacy and safety impact

- [x] No raw/identifiable data committed
- [x] Consent implications reviewed
- [x] No unsupported emotion, attraction, honesty, intent, compatibility, or medical claim introduced
- [x] `INSUFFICIENT_SIGNAL` behavior preserved as a required future state

## Risks and rollback

Risk: package choices may need adjustment once actual benchmark and browser requirements are known.

Rollback: remove the newly added workspace config, package directories, index files, check script, tech-stack decision, and issue draft document. No runtime behavior exists yet.
