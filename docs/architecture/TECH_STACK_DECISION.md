# Tech stack decision

Status: proposed for Phase 0 and Phase 1  
Date: 2026-07-26

## Scope

This decision covers the repository scaffold for a research-first monorepo. It does not implement rPPG algorithms, reaction inference, matchmaking, or a user application.

## Assumptions

- The first usable milestone is an offline benchmark and knowledge base, not a dating product.
- Browser processing should be preferred for physiological analysis where feasible, because video and derived biometric-adjacent time series are sensitive.
- The browser client must support WebRTC later, but Phase 0 only needs structure and contracts.
- Classical GREEN, CHROM, and POS methods will be benchmarked before learned models, consistent with `docs/architecture/SYSTEM.md`.
- Research datasets, if added later, must use explicit consent and must not be committed as raw or identifiable media.
- The team is small enough that TypeScript-first shared contracts reduce coordination cost across browser, backend, and scripts.
- Python remains appropriate for offline scientific analysis when numerical and plotting libraries become necessary.

## Recommended monorepo structure

```text
apps/
  browser-client/
    src/
    README.md
    package.json
  signaling-backend/
    src/
    README.md
    package.json
packages/
  shared-schemas/
    src/
    README.md
    package.json
  research-pipeline/
    src/
    README.md
    package.json
schemas/
  hr-estimate.schema.json
  paper-record.schema.yaml
knowledge/
  papers/
  claims/
  methods/
  experiments/
docs/
  architecture/
  product/
  research/
  safety/
```

## Browser client

Recommendation: TypeScript with a modern browser build tool, selected when Phase 2 starts.

Candidate stack:

- TypeScript for strict contracts and shared schema types.
- React or a similarly mature UI framework for consent, pause controls, quality states, and WebRTC UI.
- WebRTC APIs for peer media once signaling exists.
- Web Workers for compute isolation if local rPPG processing becomes expensive.
- WebAssembly only after baseline JavaScript/TypeScript performance is measured.

Rationale:

- Browser-first processing supports the privacy direction in `AGENTS.md`.
- TypeScript keeps physiological estimates, quality gates, and UI states explicit.
- Deferring framework lock-in avoids premature application work during research setup.

## Signaling backend

Recommendation: TypeScript service with a minimal HTTP/WebSocket foundation when Phase 4 begins.

Candidate stack:

- Node.js TypeScript service.
- WebSocket signaling for WebRTC offer/answer and ICE exchange.
- PostgreSQL only when persistent accounts, consent records, moderation records, or audit logs are required.
- Redis only if matchmaking/session coordination needs low-latency shared state.

Rationale:

- Signaling should never require raw video access.
- TypeScript keeps shared contracts aligned with browser code.
- Persistence should be introduced only for clearly documented consent, safety, or operational needs.

## Shared schemas

Recommendation: JSON Schema as the canonical contract format, with generated TypeScript types later.

Rationale:

- Schemas are already present in `schemas/`.
- JSON Schema works across browser, backend, and research tooling.
- Generated types can be added once package APIs stabilize.

## Research pipeline

Recommendation: Python for numerical experiments and TypeScript for repository governance scripts.

Candidate stack:

- Python with NumPy/SciPy/Pandas/Matplotlib later for offline signal analysis and reports.
- Dataset manifests that reference local or controlled storage, never committed raw identifiable video.
- TypeScript/Node scripts for repo checks, schema checks, and documentation validation.

Rationale:

- Python is the strongest default for reproducible scientific analysis.
- Node-based repo checks avoid adding a Python dependency before research code exists.

## Phase 0 decision

Adopt a pnpm monorepo with placeholder workspace packages:

- `apps/browser-client`
- `apps/signaling-backend`
- `packages/shared-schemas`
- `packages/research-pipeline`

Use a minimal root `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `.editorconfig`, and `scripts/check-repo.mjs`. The only active check validates repository structure, schema parseability, and product-claim guardrails.

## Deferred decisions

- Browser UI framework.
- Backend framework.
- Database and retention model.
- Numerical Python package set.
- Dataset manifest schema.
- Benchmark report format.
- Schema generation tooling.

## Privacy and safety implications

- Keep raw media and biometric-adjacent time series out of git by default.
- Keep consent, pause, signal quality, and insufficient-signal states as first-class product requirements.
- Do not expose precise BPM to another participant by default.
- Do not infer valence, intent, honesty, compatibility, or attraction from heart-rate dynamics.

## Rollback

The scaffold is reversible by removing the newly added workspace config, package directories, index files, and repository check script. No production behavior exists yet.
