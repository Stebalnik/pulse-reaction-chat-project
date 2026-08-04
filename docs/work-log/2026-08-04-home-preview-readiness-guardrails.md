# 2026-08-04 - Home Preview Readiness Guardrails

## What changed

- Replaced the static home-screen reaction preview label with an explicit opt-in-required analysis state.
- Added readiness chips for live queue, adults-only gate, and pulse privacy.
- Adjusted the preview layout so it remains visual without implying that SynVibe has already produced a reaction output.

## Why it changed

The first screen previously displayed a fixed example reaction code before camera access, physiological-analysis consent, signal quality checks, or personal baseline calibration. That looked like a product output rather than a preview and could undermine the service's scientific and consent guardrails.

## Assumptions and constraints

- Public copy must not imply direct emotion, attraction, compatibility, honesty, intent, diagnosis, or mental-state detection.
- Reaction-pattern output remains local/consent-gated and baseline-relative.
- Precise pulse data remains private by default.

## User-facing impact

New visitors see what must be ready before analysis can happen instead of seeing a fabricated reaction code.

## Data and privacy implications

No data model or storage change. This reduces misleading user expectation around physiological analysis.

## Commands and checks

- `./node_modules/.bin/tsc --noEmit` - passed
- `node --import tsx --test tests/*.test.ts` - passed, 36 tests
- `node scripts/check-repo.mjs` - passed after removing a blocked guardrail term from this work-log
- `./node_modules/.bin/vite build` - passed
- `rg -n "SOFT LIFT|Reaction pattern|mind[- ]?reading|likes you|lying|attracted|compatible" apps/browser-client/src docs/work-log/2026-08-04-home-preview-readiness-guardrails.md docs/architecture/PUBLIC_APP_AND_ADMIN_SPLIT.md apps/browser-client/README.md || true` - reviewed, old static preview label removed

## Deployment status

Not deployed in this slice.

## Recommended next steps

- Replace remaining static home copy with server-backed availability where useful, such as backend health or room eligibility status.
