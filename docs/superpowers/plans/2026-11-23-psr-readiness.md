# PSR Readiness Implementation Plan

**Goal:** Embed AVA readiness review in the current PSR preparation process, as approved in conversation.

**Architecture:** Reuse deterministic project checks and the existing agent lifecycle. Keep inline results transient and bound to user, project data and reporting period. Retain explicit Apply and normal submission/approval.

**Scope:** Current reporting period; PM-owned projects; Draft/Returned reports or preparation before generation. Advanced access required. Built-in results must be labeled when no agent is configured. Never infer freshness from missing timestamps.

- [x] Add regression tests for eligibility, stale results, inline execution, failure and source links.
- [x] Add inline readiness card and execute through the existing AVA runner without opening chat.
- [x] Regenerate the page, run all tests and build, inspect connected and unconnected browser fixtures.
- [x] Document real-agent validation requirements; no production publish or workflow changes.

**Review focus:** Historical/submitted reports; role changes; source changes during execution; failed/unknown execution outcomes; duplicate requests while busy.

**Environment:** No Git repository is present, so changes remain in this workspace. No shared AVA Agent ID is configured; live validation requires a published agent and signed-in Kissflow host.

**Verification:** 168/168 tests passed; production build passed. Browser verified inline simulated-agent review, source navigation, explicit draft Apply, built-in Draft detail review and 390px mobile layout. Final review found a conversation-clear lifecycle issue; regression test added and fixed. Browser detail inspection found an ambiguous insertion anchor; corrected to the individual PSR and covered detail/portfolio rendering in a regression test. Real-agent acceptance remains pending a published Agent ID and signed-in host.
