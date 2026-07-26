# Codex prompt: implement a project feature

Implement: `<FEATURE>`

## Required process

1. Read `AGENTS.md` and the relevant architecture, safety, schema, evidence, and method records.
2. State the scientific evidence and assumptions supporting the feature.
3. Define typed interfaces before implementation.
4. Keep acquisition, signal extraction, HR estimation, quality assessment, baseline, reaction inference, and UI separate.
5. Include `unknown/insufficient_signal` behavior.
6. Add unit, integration, regression, and benchmark tests appropriate to the change.
7. Record algorithm/configuration versions in outputs.
8. Update docs and schemas.
9. Run all repository checks.
10. Create one focused commit and a draft PR.

## Required PR evidence

- acceptance criteria;
- commands run and results;
- benchmark before/after;
- failure modes;
- privacy impact;
- scientific claim status;
- rollback instructions.
