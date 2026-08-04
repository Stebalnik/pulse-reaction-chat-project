# Chat Retention Deletion Controls

Date: 2026-08-04

## Summary

Added sender deletion controls and time-limited retention for active-match chat.

## What Changed

- Added `POST /api/match-chat/messages/delete` for deleting the sender's own active-match message.
- Chat messages now return deletion tombstone metadata instead of exposing deleted text.
- Chat polling cursors now redeliver updated tombstones so the peer sees deletion state.
- Added configurable chat row pruning through `SYNVIBE_CHAT_RETENTION_HOURS`, defaulting to 24 hours.
- Added a public-room delete icon for the current user's own non-deleted chat messages.
- Updated backend, architecture, privacy, and handoff docs.
- Added regression coverage for sender-only deletion, peer tombstone delivery, retained-message counts, and retention pruning.

## Why

The dating chat needed a real data lifecycle before message-level safety references could be added. User-entered chat is sensitive conversation data, so the MVP should not keep it indefinitely or leave users without a deletion control.

## Assumptions

- Sender deletion clears the message body for both participants and leaves a tombstone so clients can keep conversation order.
- Retention defaults to 24 hours until product, legal, and safety review choose a production value.
- Deleted message bodies are not available through the public API.
- Message-level moderation references should reference IDs and deletion state without bypassing the retention policy.

## Safety And Privacy

No raw video, raw RGB traces, biometric time series, precise peer BPM, or emotion labels are stored or exposed. This change affects user-entered chat text only. Deletion and retention controls reduce retained conversation data while preserving enough tombstone state for clear UI behavior.

## Checks

```bash
./node_modules/.bin/tsc --noEmit
node --import tsx --test tests/*.test.ts
node scripts/check-repo.mjs
./node_modules/.bin/vite build
```

All checks passed. Also smoke-tested a temporary backend on port `1166`: two users matched, one sent a chat message, the sender deleted it, and the peer poll after the previous cursor returned a tombstone with `body: null`. Verified that the `chat_messages` migration columns can be added to an existing SQLite table.

## Deployment

Not deployed in this slice.

## Next Steps

1. Add reviewer identity after authenticated admin accounts exist.
2. Add WebSocket transport once HTTP polling becomes the bottleneck.
3. Add production API error reporting and client-visible retry states.
