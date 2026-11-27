# Project agents implementation plan

**Goal:** Implement the approved workflow/value document in the app: Ari readiness, AVA drafts, Theo approval briefings, each with its own avatar.
**Spec:** output/pdf/bpi-itpm-agent-workflow-value-one-page.md and user's implementation request.
**Architecture:** Preserve existing PSR decisions and AVA draft guards. Add independent public Custom Agent connections, deterministic evidence, and scoped inline reviewer assistance. No schema or approval-process change is needed.
**Execution:** Inline. No Git repository is available; keep modifications in the current workspace.

- [ ] Add tested agent connections and approval briefing domain logic (`src/project-agents.js`, `test/project-agents.test.mjs`). Restrict Theo to the assigned approver at the active step; isolate frozen report evidence from current data.
- [ ] Connect Ari to readiness; retain AVA draft controls; add Theo brief, retry/read lifecycle, role/data-change invalidation and separate configuration (`scripts/ava-ui.js`, `scripts/agents-ui.js`, `src/bridge.js`).
- [ ] Add the approved distinct robot portraits to UI controls, cards and responses. Extend `scripts/make-index.mjs` rather than editing generated HTML.
- [ ] Add deployment instructions for Ari/Theo, extend browser fixture, run focused/full tests and build; inspect desktop/mobile and package the UI.

Review focus: wrong approver; old report or changed assignment; late/unknown executions; agent reconnect during execution; narrative changes and draft guard; missing timestamps; unsupported hosted APIs. Actual published agent IDs are required for live AI acceptance; local fixture evidence must remain labeled.
