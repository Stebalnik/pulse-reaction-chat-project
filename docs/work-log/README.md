# Project Work Log

This directory is the durable handoff journal for SynVibe development.

## When To Add An Entry

Add a dated Markdown file after meaningful work, especially when a task changes:

- product scope or user flow;
- rPPG, baseline, reaction-pattern, quality, or ROI behavior;
- privacy, consent, retention, or analytics behavior;
- deployment, infrastructure, domain, or server setup;
- schemas, data contracts, or debug log formats;
- launch plan, roadmap, or research evidence.

Small typo-only changes do not need a new entry unless they affect safety or product claims.

## File Naming

Use:

```text
YYYY-MM-DD-short-topic.md
```

Examples:

```text
2026-08-03-public-mvp-handoff.md
2026-08-04-backend-events-mvp.md
```

## Required Sections

Each entry should include:

- `Summary`
- `What Changed`
- `Why`
- `Assumptions`
- `Safety And Privacy`
- `Checks`
- `Deployment`
- `Next Steps`

## Boundaries

Do not include secrets, credentials, raw video, raw biometric time series, private user data, or unsupported product claims. Use language consistent with `AGENTS.md` and `docs/safety/PRODUCT_GUARDRAILS.md`.
