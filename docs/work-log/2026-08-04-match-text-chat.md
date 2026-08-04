# Match Text Chat

Date: 2026-08-04

## What changed

Added first-pass server-backed text chat for active public-room matches.

- Added shared match-chat request, message, and batch contracts.
- Added SQLite `chat_messages` storage.
- Added `POST /api/match-chat/messages` and `GET /api/match-chat/messages`.
- Added backend enforcement that only active match participants can send or read match chat.
- Added public-room chat UI with polling, cursor handling, dedupe, and send-on-enter.
- Added admin summary `chatMessages` count.
- Added regression coverage for active-match chat delivery and ended-match rejection.

## Why it changed

The public dating room had live video and matching, but no real text conversation path. A dating service needs a basic matched-participant chat channel before richer contact, safety, or post-match flows.

## Assumptions and constraints

- Chat is scoped to active matches only in this slice.
- Message retention and deletion policy still need product/legal decisions before post-match chat history.
- Chat content is user-entered conversation data and remains separate from biometric or reaction-pattern records.
- This does not introduce emotion, attraction, compatibility, honesty, intent, or medical labels.

## User-facing impact

Matched users can exchange text messages during a live match. If chat polling fails, the UI shows a reconnecting state and keeps the draft.

## Data and privacy implications

The backend stores message body, sender user ID, match ID, and timestamp. It does not store raw video, raw audio, raw biometric traces, precise peer BPM, or direct emotion labels.

## Commands and checks run

```bash
./node_modules/.bin/tsc --noEmit
node --import tsx --test tests/*.test.ts
node scripts/check-repo.mjs
./node_modules/.bin/vite build
```

All checks passed. Also smoke-tested two local users joining a match, `POST /api/match-chat/messages`, and peer `GET /api/match-chat/messages` on a temporary backend.

## Deployment status

Not deployed in this slice.

## Recommended next steps

1. Add moderation queue views that can reference reported match IDs and message IDs when explicitly reported.
2. Add WebSocket transport once HTTP polling becomes the bottleneck.
3. Add role-scoped admin accounts and least-privilege reviewer access.
