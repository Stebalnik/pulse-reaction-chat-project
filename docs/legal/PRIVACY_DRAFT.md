# SynVibe Privacy Draft

Status: internal draft for product and legal review.

## MVP Data Principles

- Process camera-derived physiological features on the user's device whenever feasible.
- Do not retain raw video by default.
- Do not retain raw biometric time series by default.
- Store only the minimum server-side records needed for accounts, session operation, safety, analytics, and product improvement.
- Treat rPPG outputs and derived features as sensitive health-adjacent data.

## Current Browser MVP

The browser client can assign a local anonymous user ID and store a local profile on the user's device. The current debug console can export local JSON logs that include cleaned diagnostic metrics such as signal quality, ROI source, method estimates, reason codes, and badge state. These logs do not include raw video frames or raw RGB traces.

The public room requires a separate opt-in before local physiological analysis is considered active. Camera permission and adults-only room acknowledgement are not treated as physiological-analysis consent. Users can revoke this consent from the room controls. The implementation records policy-versioned grant/revoke consent events when the backend is available and does not share precise BPM with the peer by default.

The current backend rejects cleaned reaction-output uploads when active `physiological_analysis` consent is missing or revoked. This is a technical control in addition to the browser consent UI.

## Planned Server MVP

The first server-backed release should store:

- anonymous and registered user records;
- session start/end events;
- room matching events;
- consent and pause events;
- active-match chat text with sender deletion controls and time-limited retention;
- cleaned reaction-pattern outputs;
- quality metrics and rejection reason codes;
- product analytics events such as visit, room start, camera grant, peer connect, disconnect, registration start, and registration complete.

## Current Chat Retention Draft

Match chat is operational conversation data, not biometric data. The current server implementation scopes chat reads and writes to active match participants, lets the sender delete their own message body for the conversation, and prunes retained chat rows after `SYNVIBE_CHAT_RETENTION_HOURS` hours. The engineering default is 24 hours until counsel and safety review set a production policy.

## Model Improvement

Data used to train or evaluate SynVibe models should be separated from operational data, consented, time-limited where required, and documented with schema versions, model versions, and retention rules.

## Review Notes

This draft is not legal advice. It must be reviewed by qualified counsel before production launch.
