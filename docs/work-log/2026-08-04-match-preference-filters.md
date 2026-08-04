# 2026-08-04 - Match Preference Filters

## What changed

- Added optional profile search parameters: age bracket, spoken languages, preferred age brackets, preferred languages, conversation intent, topic tags, and conversation pace.
- Stored the new parameters on the own-server backend with SQLite migrations for existing profile rows.
- Added mutual matching logic so filtered matches are created only when both profiles accept each other's voluntary parameters.
- Kept broad guest roulette available when a user has no profile filters.
- Exposed voluntary peer parameters in the matched peer card.
- Updated the public registration dialog with compact filter controls and mobile-safe scrolling.

## Why it changed

Users could already enter the roulette room and match with the first available eligible peer, but they had no way to describe what kind of conversation they were looking for. A dating-service roulette needs optional search parameters and server-side filtering before it feels useful beyond random pairing.

## Assumptions and constraints

- Filters are user-entered search constraints, not claims about compatibility, attraction, emotion, honesty, intent detection, or medical state.
- Age is stored as a coarse adult bracket, not a birth date or exact age.
- Guests can still enter quickly with broad matching.
- Physiological analysis remains separate, opt-in, local/baseline-relative, and private by default.

## User-facing impact

Users can simply enter as guests or register a profile with filters to narrow incoming matches by language, age bracket, intent, topics, and pace. Matched users see a short voluntary profile summary for the peer.

## Data and privacy implications

The change stores voluntary profile preferences and coarse age bracket data. It does not store identity documents, raw video, raw audio, biometric traces, precise peer BPM, or emotion labels.

## Commands and checks

- `./node_modules/.bin/tsc --noEmit` - passed
- `node --import tsx --test tests/*.test.ts` - passed, 37 tests
- `node scripts/check-repo.mjs` - passed
- `./node_modules/.bin/vite build` - passed

## Deployment status

Not deployed in this slice.

## Recommended next steps

- Add availability and match-quality analytics for filter usage and unmatched waiting time.
- Add account-backed sessions and verified profile recovery.
- Add minimum-cohort thresholds before exposing any aggregate filter analytics.
