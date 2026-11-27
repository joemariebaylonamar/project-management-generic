# Open Questions — ITPMD Project Hub domain model (kf-ba)

None of these block authoring the domain model — each has a sensible, BRD-grounded default (several
are the BRD's own "proposed" defaults). Recorded here so downstream agents and LANDBANK can confirm
or correct before/around UAT, per the BRD's own §15 which already asks LANDBANK most of these.

## Assumable (not blocking)

1. **QA's MVP scope on the risk register.** §5.1's access matrix marks QA "C" (create/edit) on Risk
   register, but every QA responsibility actually described in the requirements (cross-project risk
   and lessons-learned repositories, ITPH-0052/00112) is Phase 2.
   **Assumed default:** QA is view-only on the risk register for MVP; QA's create/edit access and
   repository journeys activate in Phase 2. *(Confirm with LANDBANK before role/permission design.)*

2. **Escalation aging periods — exact values.** §6.3 references "the configured aging period" for
   issue escalation without stating a number; §15 item 6 asks LANDBANK to confirm aging periods and
   escalation levels/recipients.
   **Assumed default:** modeled as an admin-configurable value on the Configuration entity (no
   hardcoded number needed for the domain model itself); a reasonable starting default (e.g. 5
   working days past target date) can be seeded and adjusted by the Application Administrator without
   a rebuild.

3. **Audit log "7 identified events" (ITPH-00213).** §4.5 makes "audit trail verified for all 7 log
   events" an MVP exit criterion, but the BRD itself says the list is unconfirmed by LANDBANK (§15
   item 7).
   **Assumed default:** the Audit Log Entry entity is scoped broadly for MVP — every create/edit/
   delete/submit/approve/return/reassign action across all MVP entities, plus login and configuration
   changes — and the exact "7" is reconciled against this broader log before UAT sign-off, not before
   this domain model is written. *(This must be confirmed before MVP exit, per §4.5 — flagging for
   later-stage attention, not a build blocker now.)*

4. **Assignees outside ITPMD (vendor staff / business users).** §15 item 16 asks whether activities
   can be assigned to non-ITPMD people, and what access they'd get.
   **Assumed default:** MVP User Accounts are Bank/ITPMD staff only (consistent with §3.2's "no
   vendor portal, vendors do not log in"); external-assignee support is deferred pending LANDBANK's
   answer.

5. **PS routing rule, health/attention thresholds, S-curve weighting.** §15 items 3, 5 and 17 ask
   LANDBANK to confirm BR-10 (PS routing), BR-03/05/06 (health thresholds) and BR-17's
   duration-weighting choice.
   **Assumed default:** the BRD's own "proposed" logic in BR-03, BR-05, BR-06, BR-10 and BR-17 is
   taken as-is (these are already the BRD's recommended defaults, not new assumptions introduced
   here).

6. **PSR reporting cadence.** §15 item 4 asks whether the PSR is monthly for every project.
   **Assumed default:** monthly for all projects, due working day 5, per BR-11 (already the BRD's
   stated default) — no per-project cadence variation modeled.

## Out of this agent's lane (informational only, not a domain gap)
- Phased-acceptance contracting terms (§15 item 1), PSR/PPSR template layout (§15 item 2), data
  migration volume/format (§15 item 14), and platform/infrastructure questions (target DB, MFA
  method, session behavior, volumes/retention, availability/DR — §15 items 9–13) are delivery,
  reporting-layout, or platform/ops concerns, not domain (personas/journeys/entities/rules) gaps.
  They are not modeled here and should be tracked directly against the BRD's own §15 checklist.

**Blocking questions: none.**

## Architecture-stage (kf-architect) — assumable
7. **QA login for MVP UAT?** No QA role is created (D19). Confirm whether LANDBANK expects QA users at
   MVP. If yes, add a read-only QA role on ITPMD Risk.
8. **Baseline approval.** No separate baseline-approval workflow exists (D17). The baseline is
   recorded with its approver and date, and a re-baseline reaches the Sponsor through the PSR's BR-10
   flag. Confirm that is enough for ITPH-009.
9. **Row-level project access (BR-23) and own-activity edit (BR-15).** Enforcement is a known engine
   gap (D20). Confirm that the interim mitigation is acceptable for UAT.

## Automations-stage (kf-integration-analyst) — assumable
10. **PSR Approved → Portfolio Status Report roll-up.** BR-24 says an Approved PSR "rolls into ...
    the PPSR" and D17/architecture describe `itpmd_portfolio_report.Project Summaries` as "one row per
    approved PSR in the period", but J-15 also frames the PPSR as something the PSC Member "generates"
    (a monthly artifact), and there is no field identifying which (existing vs new) Portfolio Status
    Report record a given period's row belongs to. Auto-appending a child-table row on every PSR
    approval would need find-or-create-by-`Report_Period` semantics the engine's create/update
    primitives don't express, and could double-insert if the PSC has already generated the period's
    PPSR by hand. **Not authored** as an automation; left as a manual PSC step (J-15) for MVP. Confirm
    with LANDBANK whether the roll-up should be automatic (and, if so, define the period-match key)
    before Phase 2 automation is added.
