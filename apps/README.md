# Apps

Runtime application surfaces live here.

- `browser-client/`: consent-first browser experience for public roulette video chat, local analysis controls, active-match chat, and internal admin/debug views.
- `signaling-backend/`: adults-only consent enforcement, matchmaking, WebRTC signaling relay, operational metrics, scoped admin access, and abuse-prevention services.

The browser client now includes a public no-login MVP shell and an internal admin/debug surface. The backend now covers anonymous identity, validated profile save/load with unique handles, adults-only room consent events, roulette matching, WebRTC signaling, active-match chat, moderation records, retention controls, privacy-safe analytics, and scoped admin tokens. Account-backed identity and richer production operations remain later milestones.
