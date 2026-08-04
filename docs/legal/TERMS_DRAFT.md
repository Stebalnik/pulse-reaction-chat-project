# SynVibe Terms Draft

Status: internal draft for product and legal review.

## Scope

SynVibe provides video-chat experiences with visual reaction-pattern features. Reaction-pattern outputs are SynVibe product interpretations based on available device-side signals and context. They are not medical findings, clinical measurements, psychological diagnoses, or absolute statements about another person.

## Physiological And Reaction Features

- SynVibe may estimate pulse-related dynamics, signal quality, and baseline-relative changes when a participant enables camera-based analysis.
- Outputs may be incomplete, unavailable, delayed, or affected by lighting, movement, camera quality, device performance, and network conditions.
- Users must not rely on SynVibe outputs for medical, mental-health, safety, hiring, legal, financial, or other high-stakes decisions.
- SynVibe does not claim categories prohibited by the product guardrails in `docs/safety/PRODUCT_GUARDRAILS.md`.

## Consent

Participants must receive clear consent controls before camera-based analysis starts. Users must be able to pause or disable analysis during a session.

## Data Handling

- Raw video is not retained by default.
- Raw biometric time series are not retained by default.
- Device-side processing is preferred for physiological features.
- Server-side storage should be limited to account records, session metadata, cleaned outputs, quality metrics, and opt-in debug or research records.
- Data used for research or model improvement must be documented, minimized, and governed by consent and retention controls.

## User Accounts

Guest users may receive an anonymous SynVibe ID. Registered profiles may unlock saved contacts, chat history, and account features once server-side account storage is enabled.

## Prohibited Use

Users must not use SynVibe for covert monitoring, pressure, harassment, medical assessment, or analysis of minors for dating features.

## Review Notes

This draft is not legal advice. It must be reviewed by qualified counsel before production launch.
