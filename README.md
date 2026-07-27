# Pulse Reaction Chat

Research-first video chat application that estimates **physiological arousal dynamics** from facial video using remote photoplethysmography (rPPG).

The product must never claim to read thoughts, attraction, truthfulness, or exact emotions. It presents low-confidence, consent-based reaction indicators derived from pulse dynamics, signal quality, context, and personal baseline.

## Repository goals

1. Build a reproducible rPPG pipeline for heart-rate estimation from ordinary RGB video.
2. Establish a versioned scientific knowledge base from reviewed papers.
3. Define and validate a small reaction taxonomy based on observable physiological changes.
4. Build a privacy-preserving real-time video-chat prototype.
5. Separate research evidence, engineering assumptions, and product language.

## Start here

- `AGENTS.md` — binding rules for Codex and contributors.
- `.codex/prompts/ARTICLE_INGESTION.md` — analyze a new paper and update the knowledge base.
- `.codex/prompts/IMPLEMENT_FEATURE.md` — implement a scoped feature.
- `docs/architecture/SYSTEM.md` — target system architecture.
- `docs/architecture/LOCAL_DEVELOPMENT.md` — local ports and environment defaults.
- `docs/architecture/DOMAIN_AND_DEPLOYMENT.md` — production domain and GitHub Pages setup.
- `docs/architecture/TECH_STACK_DECISION.md` — proposed stack and monorepo shape.
- `docs/product/REACTION_MODEL.md` — normalized reaction model.
- `docs/product/ONE_MONTH_LAUNCH_PLAN.md` — desktop-first launch plan.
- `docs/safety/PRODUCT_GUARDRAILS.md` — consent, privacy, claims, and UX restrictions.
- `knowledge/README.md` — evidence storage and update rules.

## Local development

The default local development port is `1059`. Run `pnpm dev` to start the browser prototype at `http://127.0.0.1:1059/`.

## Production domain

The reserved public domain is `synvibe.app`. The first production browser prototype is prepared for GitHub Pages deployment from `apps/browser-client`.

## Current status

Prototype browser client and on-device pulse-rate engine are available for local testing. No medical or unsupported interpretation claims are validated.
