# Message Level Report References

Date: 2026-08-04

## Summary

Added explicit message-level references to moderation reports while preserving chat deletion and retention boundaries.

## What Changed

- Added optional `reportedMessageId` to public moderation report requests and records.
- Added backend validation that a reported message belongs to the reported peer in the same match.
- Added admin queue fields for reported message ID, sender anonymous ID, current message reference status, and retained excerpt.
- Admin excerpts are derived only when the message row is still retained and not deleted.
- Added a report icon on peer chat messages in the public room.
- Updated backend and architecture documentation.
- Added regression coverage for retained, deleted, and expired message references.

## Why

Safety review needs more precise context than a match-level report, but the system should not create hidden copies of deleted or retention-expired chat text. This gives moderators a concrete ID and current state without bypassing the chat lifecycle.

## Assumptions

- Message reports require a match ID and reported peer ID.
- A user cannot report their own message as a peer safety issue.
- Deleted or retention-expired message bodies are not returned through moderation queue data.
- Message IDs are operational safety metadata, not behavioral labels or evidence of intent by themselves.

## Safety And Privacy

No raw media, biometric traces, precise peer BPM, or emotion labels are stored or exposed. Message-level reports reference user-entered chat only. Deleted and retention-expired message bodies are not snapshotted into moderation reports.

## Checks

```bash
./node_modules/.bin/tsc --noEmit
node --import tsx --test tests/*.test.ts
node scripts/check-repo.mjs
./node_modules/.bin/vite build
```

All checks passed. Also smoke-tested a temporary backend on port `1167`: two users matched, the peer sent a chat message, the local user reported that specific message ID, and the admin moderation queue returned `reportedMessageStatus: "retained"` with the peer sender ID and retained excerpt.

## Deployment

Not deployed in this slice.

## Next Steps

1. Add reviewer identity after authenticated admin accounts exist.
2. Add WebSocket transport once HTTP polling becomes the bottleneck.
3. Add production API error reporting and client-visible retry states.
