# Decisions — ITPMD Project Hub

## D1 · Build MVP (Phase 1) scope only
Per the orchestrator's scope decision and BRD §4.3, this build models only the MVP module set.
Phase 2/3 items are deferred and NOT modeled in the domain: Liquidated Damages, Change Requests,
forecast validation/approval workflow and automatic forecast recalculation, MoM and Lessons
Learned, Project Discussions, the LEAF AI assistant (Basic, Advanced and governance), SIEM/AD-LDAP
integration, and the drag-and-drop interactive Gantt.

## D2 · Platform-level NFRs are "platform/not-authored"
Password/lockout policy specifics, MFA mechanism, single-session/idle-timeout behavior, HTTPS,
backup/restore, and SIEM log transport are things Kissflow provides natively or that are
infrastructure/ops concerns, not app metadata. They are not modeled as domain entities or business
rules in this or any downstream artifact; they are tracked only as informational NFRs for the
security/ops review, outside this pipeline's scope.

## D3 · QA persona retained, but has no MVP journey
BRD §5.1's access matrix gives QA create/edit ("C") access to the risk register, but every one of
QA's substantively-described responsibilities (the cross-project risk repository, ITPH-0052; the
lessons-learned repository, ITPH-00112) is explicitly Phase 2. Rather than invent an MVP journey for
QA to justify the persona, QA is kept as a persona (named in the BRD) with no MVP journey, and the
access-matrix conflict is flagged as an assumable open question (default: QA is view-only on the
risk register for MVP; QA's create/edit access activates with the Phase 2 repository).

## D4 · Authorized Approver persona excluded entirely
"Authorized Approver" (BRD §5) exists only to approve/reject/return Change Requests, forecasts and
LD overrides — all three are Phase 2/3. It is excluded from the MVP domain model rather than kept as
an empty/orphan persona.

## D5 · Issue / Action Item / Decision modeled as three related entities, not one
BRD §12's data-entities table lists "Issue / Action / Decision" as a single row, but §8.3 assigns
each a distinct set of CRUD verbs and its own lifecycle (ITPH-0031–0034 issue; 0035–0037 action item;
0038 decision). Modeling them as three related entities (Issue has many Action Items; Issue/Decision
cross-reference) is truer to the requirements than a single blended entity, and gives the downstream
data architect a clean shape to lower.

## D6 · Cost Entry and Invoice modeled as two entities, not one
Similarly, BRD §12's "Cost / Invoice" row is split into "Cost Entry" (actual/committed/forecast
amounts, ITPH-0058/0059/0062) and "Invoice" (its own numbered-document lifecycle with invoice/DO
number, vendor, date paid, status; ITPH-0057) — distinct attributes and distinct owners of truth.

## D7 · Milestone's "price of deliverable" attribute dropped from the MVP entity
BRD §12 lists "price of deliverable (for LD)" as a Milestone attribute, but its only stated use is
feeding the Liquidated Damages calculation (BR-07, Phase 2). It is dropped from the MVP Milestone
entity to avoid carrying a Phase-2-only field into the MVP data model; it can be reintroduced when LD
is built in Phase 2.

## D8 · Vendor Rate excluded from MVP entities
ITPH-0072 (cost per man-day, by vendor and position) is explicitly Phase 2 in §8.5's requirement
table, so "Vendor rate" (listed in §12) is excluded from the MVP entity set.

## D9 · Contract-expiry business rule (BR-12) excluded from MVP business rules
BR-12's alert behavior (60/30/7-day contract expiry alerts) is Phase 2 per the MVP-scope table in
§4.3 ("Contract/PO expiry" listed under deferred alerts). The underlying data capture it would alert
on — NOA/PO/NTP/contract-expiry dates (ITPH-008, on the Procurement/Contract entity) — remains in
MVP; only the alerting rule itself is deferred.

## D10 · Two supplementary escalation rules added beyond §7's BR-01–BR-20 table
§6.3 (Issue and risk escalation) states escalation logic that is not restated verbatim as one of the
BRD's own numbered BR-01–BR-20 rules. It is captured here as BR-21 (issue escalation) and BR-22 (risk
escalation) so the escalation behavior that ITPH-0039/0040/0048/0049 depend on is not lost.

## D11 · Deny-all access control and PSR lifecycle stated as explicit business rules (BR-23, BR-24, BR-25)
ITPH-00225's "deny all unless allowed" access principle, §6.2's PSR status model, and ITPH-00116's
mandatory-return-comment requirement are all stated plainly in the BRD but outside the §7 rules table.
They are promoted to first-class business rules (BR-23/24/25) here because they gate who can do what
and how the PSR moves — core "business rules" per this agent's brief, not merely workflow mechanics.

## D12 · Architecture: 10 flows, all app-prefixed "ITPMD ..."
kf-architect lowered 20 entities into 10 flows: 6 Forms (Project, Activity, Risk, Cost Entry,
Portfolio Status Report, Holiday Calendar, Hub Settings — 7 incl. config), 2 Boards (Issue, Action
Item), 1 Process (Project Status Report). Every flow name starts with "ITPMD " so it cannot collide
with account-wide names like "Project" (LESSONS §5).

## D13 · Project Status Report is the one Process; Sponsor step is conditional
PSR = Process: Draft (PM, start) > DH Review > PS Approval (step condition per BR-10: health Red, or a
baseline/budget change was requested, or the project is flagged "PS approval required") > Approved.
"Returned" is not a modeled step. It uses the native send-back with a mandatory comment, which covers
BR-25 (owner-confirmed 2026-07-14). The approved snapshot (BR-13) is built from Project lookup autofill
plus 3 child tables (Schedule Highlights, Next Period Plan, Key Issues and Risks).

## D14 · Milestone folded into Activity; Activity Assignment collapsed
A milestone is modeled as an Activity with a milestone flag (a zero-duration schedule line). This way
the Gantt, S-curve, assignment (J-03) and the BR-03 missed-milestone test all use one table. Activity
Assignment (E-16) becomes the Activity's Responsible Person field plus assigned-by/at. The
reassignment history comes from native item history (ITPH-00254). Assumption: native item history is
enough as the "schedule history" for ITPH-0014 and ITPH-00254.

## D15 · Activity is a Form, not a Board
An Activity's status is DERIVED from % complete (BR-15). Users do not move it between columns, so the
Process-vs-Board rule gives Form. A Form also lets Gantt, S-curve, My Tasks and dashboard list cards
read it directly. WBS hierarchy is stored as a WBS code plus a summary flag, with no parent
self-reference. Dependencies are a "Predecessors" child table whose rows reference ITPMD Activity.
This is a self-flow reference. If the build rejects it, store the predecessor as its WBS code (text).

## D16 · Issue and Action Item are Boards; Action Item is NOT a child of Issue
Issue is shaped like a ticket, and Action Item is a to-do moved by its assignee. Both are unstructured
user-moved statuses, so both are Boards. The suggested "actions under issues" child table was
rejected because action items must appear on each assignee's My Tasks across all projects
(ITPH-00258) and can exist without an Issue. Consequence for experience: buildPage has no Case
component, so board data reaches the PSC and My Tasks views through Kanban pages or filtered case
views, not list cards.

## D17 · Child tables used for tightly-owned sub-records
Project has 5 child tables: Contracts, Project Team (= Project Assignment E-19), Budget Changes
(E-11), Baseline History (E-06) and Decision Log (E-09). Cost Entry has an Invoices child table.
Activity has Predecessors. Portfolio Status Report has Project Summaries (rows reference approved
PSRs). No separate baseline-approval process is built for MVP. The approval is recorded in the row.
A re-baseline or budget change reaches the Sponsor through the PSR's BR-10 flag.

## D18 · Configuration becomes 2 dataforms; platform entities are not flows
Holiday Calendar and Hub Settings are Forms because the engine has no Dataset builder. Notification,
User Account and Audit Log Entry are covered natively by Kissflow (step/assignment notifications
plus notify automations, users/app roles, audit log/item history). They are not authored.

## D19 · Roles: 6. System Admin merged into Hub Administrator; QA dropped for MVP
Roles: Project Manager, Team Member, Department Head, Project Sponsor, PSC Member, Hub Administrator.
P-07 and P-08 are merged into Hub Administrator: in the app they maintain the calendar, settings and
Project Team, and the rest is Kissflow-native admin. QA (P-06) has no MVP journey, so no role is
created (build for journeys). Reinstate it as read-only on ITPMD Risk if LANDBANK expects QA logins
at UAT.

## D20 · KNOWN GAPS passed to security: BR-23 row scoping and BR-15 field-level edit
(a) BR-23 deny-all per project needs row-level scoping. The platform supports this (owner Q3), but
the engine does not know the shape yet. Today a permission entry grants view on ALL items.
(b) BR-15 "an assignee edits only % complete and actuals of their OWN activity" cannot be enforced
with Form flow-level permissions. Team Member access to ITPMD Activity is all-or-nothing.
kf-security-designer must choose a mitigation for both and record it. It must not assume they are
enforced.

## D21 · Workflow design: PSR process, Issue/Action Item caseflows (kf-workflow-designer)
PSR (Process) is 4 steps: Draft (PM) -> Department Head Review (approval) -> Sponsor Approval
(approval, `condition: Sponsor_Approval_Required = "Yes"` per BR-10) -> Approved (automation,
terminal, locked snapshot per BR-13). The Sponsor Approval step needed a step AFTER it precisely
because a step condition cannot sit on the terminal step (STEP_CONDITION_TERMINAL) — "Approved" is
therefore modeled explicitly, not merely implied, satisfying D13's stated sequence. No "Returned" step
or second terminal is modeled: reject/return is native on every approval step (mandatory comment,
routes to Draft), covering BR-25/ITPH-00116 per LESSONS §"rejection is already there". Per-record
assignee routing (the PSR's own Department_Head/Project_Sponsor/Project_Manager user fields, not just
the role) is called out in `_workflow_notes` as a scoping requirement for kf-security-designer (ties
into D20's BR-23 row-scoping gap) — the engine's actor primitive is role-only, so the role is the
workflow actor and the user field is the fine-grained routing kf-security-designer must scope.

ITPMD Issue (Board): Open(initial) -> In Progress -> Escalated -> Resolved -> Closed(terminal), plus
Resolved -> In Progress (reopen) and In Progress -> Resolved. Open/In Progress -> Escalated is the
one AUTO transition (BR-21/§6.3: Critical priority, or overdue past the configured aging period) —
modeled as a transition with `trigger:"auto"`, to be realized as a scheduled automation by
kf-integration-analyst. Every status reachable, every non-terminal has an outward move.

ITPMD Action Item (Board): Open(initial) -> In Progress -> Overdue -> Done(terminal), with
Open/In Progress -> Overdue as the auto transition (past due date, ITPH-0037/00155) and both
In Progress and Overdue able to reach Done. Every status reachable, every non-terminal has an
outward move.

Wrote `flowType` was deliberately NOT re-stated in the workflow slice (only `workflow`/`caseflow`
keys) to avoid a concurrent-write clash with kf-data-architect's own `flowType` value on the same
`forms[]` entries — architecture.flows already declares Process/Board correctly.

SLAs/notifications (BR-11 PSR reminders 3-day/1-day/overdue; DH/PS step-entry notifications;
return notification with mandatory comment; BR-21 issue escalation notify; ITPH-0037/00155 action-item
overdue notify) are recorded as hints under `workflow_meta.slas`/`workflow_meta.notifications` for
kf-integration-analyst to realize as automations — not authored here as executable logic.

## D22 · Data model complete (kf-data-architect): fields, lists, aggregates, formulas
All 10 flows now carry full field lists, child tables, references and computed values (see
`app-spec.json#forms`/`#lists`). Highlights:
- **BR-02/03/05/06 health roll-ups**: ITPMD Project carries cross-flow `aggregate` fields (Sum_Weighted_Complete,
  Sum_Planned_Duration, Max_Forecast_Finish, Max_Baseline_Finish, Missed_Milestone_Count, Total_Actual/Committed/
  Forecast_Cost, Escalated/Critical_Risk_Count, Escalated/Critical_Issue_Count, Overdue_Action_Count — each
  `match:{field:"Project",equals:"_id"}` against the child flow's own `Project` reference field) plus same-form
  `formula` fields reading those aggregates as siblings (Weighted_Percent_Complete, Schedule/Cost/Risk/Issue/
  Overall_Health, Needs_Management_Attention_Flag). Cost Entry models `Actual_Amount`/`Committed_Amount`/
  `Forecast_Amount` as three separate Currency columns per line (not one Amount+Type field) precisely so these
  are plain unfiltered SUMs — the engine's cross-flow aggregate join is field=field only (no literal-value
  filter), so a single polymorphic Amount+Type column could not be summed by type. Same reasoning applied to
  Project's Budget Changes child table (`Budget_Change_Amount` / `Contingency_Draw_Amount` as separate columns).
- **FORMULA_LITERAL_TYPE avoidance**: every Text-typed "band"/"health" field (Risk_Rating_Band, Schedule_Health,
  Cost_Health, Risk_Health, Issue_Health, Overall_Health, Activity.Status) is computed via an intermediate
  Number "_Code" field (numeric thresholds, `>`/`>=` live there) and the Text field itself only does `=`
  string-equality lookups against that code — the validator's FORMULA_LITERAL_TYPE check (LESSONS: numeric
  comparisons on a non-Number target compile as string compares) forced this two-step pattern; keep it for any
  future Text-band formula.
- **DATA→WORKFLOW field ids** (as requested by the orchestrator for kf-workflow-designer, on ITPMD Project
  Status Report / `itpmd_psr`): `Department_Head`, `Project_Sponsor`, `Project_Manager` (all User, autofilled
  from the linked `itpmd_project`'s same-named fields via the `Project` reference's lookup+autofill).
  `Sponsor_Approval_Required` was authored as a **Select** field (`referredList: itpmd_yes_no`, items
  `["Yes","No"]`), NOT Boolean — the parallel kf-workflow-designer slice (`runs/current/slices/workflow.json`,
  mirrored in D21) already wrote the step condition as the string comparison
  `Sponsor_Approval_Required = "Yes"`; a Boolean field would not satisfy that literal string equality, so the
  field type was matched to the already-authored condition rather than the other way around. Its formula:
  `IF(OR(Overall_Health="Red", Baseline_Or_Budget_Change_Requested, PS_Approval_Required),"Yes","No")` — BR-10's
  three routing conditions (project health Red, a baseline/budget change requested this period, or the
  project's own `PS_Approval_Required` flag) computed automatically, so the step condition just reads it.
- **Self-reference**: ITPMD Activity's `Predecessors` child table holds `Predecessor_Activity` as a genuine
  Reference back to `itpmd_activity` (self-flow) — verify passed clean, so the WBS-code-text fallback (D15)
  was not needed.
- Lists (14, all `ITPMD `-prefixed): Business Unit, Portfolio List, Project Status, Dependency Type, Risk
  Category, Risk Response Strategy, Risk Status, Issue Category, Priority Level, Invoice Status, Budget Change
  Type, Project Team Role, Holiday Coverage, Schedule Highlight Type, plus Yes No (added for D22 above).
  Business Unit / Portfolio List items are generic placeholders (BRD does not enumerate the Bank's actual
  business-unit/portfolio names) — flag for LANDBANK to confirm/replace the list items pre-UAT.
- Board data fields (ITPMD Issue, ITPMD Action Item) are authored here (flowType:"Case"); their `caseflow`
  statuses are kf-workflow-designer's slice (D21) — the two CASE_NO_STATUSES verify errors seen at this stage
  are expected until the two slices are merged.

## D23 · Security: permission matrix, data scope, and D20's BR-23/BR-15 mitigations (kf-security-designer)
Flat `permissions[]` (role x flow -> level/scope) written for all 10 flows, mapped from BRD §5.1's
C/V/A access matrix: Project Manager Editable/`my` on every project-scoped flow (initiator);
Team Member Editable/`my` only where BRD marks "C*" (Activity, Issue, Action Item — their own
assigned work) and ReadOnly/`my` elsewhere it marks V (Project, Risk, PSR), none on Cost Entry (BRD
"—"); Department Head and Project Sponsor ReadOnly/`my-team` on project data, Editable/`my-team` on
the PSR (they act their own workflow step) and ReadOnly/`all` on the Portfolio Report; PSC Member
ReadOnly/`all` everywhere except Editable/`all` on the Portfolio Report (its creator, per BRD "C" in
that column); Hub Administrator Editable/`all` on Hub Settings + Holiday Calendar only (BRD's
Configuration row; the BRD gives Hub Administrator no access to project data, so none was granted —
matches the App Admin / Sys Admin "—" cells collapsed into one role). `security.data_scope` mirrors
`permissions[]` as the canonical role x flow -> scope map for the data-architect's views and the
experience-designer's dashboards to reuse (spelled `my`/`my-team`/`all`, never `my-items`).
`security.initiators_accessors` names creators/readers per flow explicitly — every flow has >=1
creator and >=1 reader (no lockouts): masters/sub-records included (Project -> PM; Activity -> PM +
Team Member; Issue/Action Item -> PM + Team Member; Hub Settings/Holiday Calendar -> Hub
Administrator only; Portfolio Report -> PSC Member).

Workflow step field_permissions lowered onto the PSR process (the only Process flow): the Draft step
gets `Narrative_Update: Mandatory, Supporting_Documents: Editable, Reporting_Period_Month: Editable`
(the PM's genuine per-period inputs); every other PSR field is left at default ReadOnly at every step
— which is itself the correct enforcement of BR-13 ("static/computed PSR fields come from project
master data / formulas and an Approved PSR is never changed"): DH and PS review and decide
(native Approve/Return) without an editable field surface, and the Approved step is a true locked
snapshot by construction, not by a field override.

**D20's two named gaps, resolved as documented mitigations, not fabricated features:**
- **BR-23 (deny-all per assigned project)**: the engine's permission scope keyword (`my`/`my-team`/
  `all`) is a coarse view-layer convention, not a row-level ACL (owner-confirmed 2026-07-03 memory:
  "data_scope is view-convention, not row security"). Mitigation: `my`/`my-team` are defined in
  `security.scope_legend` as "filtered by the per-project Department_Head/Project_Sponsor/Project
  Team/Responsible_Person fields" and the data-architect's views/reports must implement that filter;
  this is a VIEW-layer approximation of BR-23, not a platform-enforced ACL — recorded as a residual
  gap in `security.residual_gaps`, not assumed solved.
- **BR-15 (assignee edits only %complete/actual dates of THEIR OWN activity)**: ITPMD Activity is a
  Form (D15), so there is no per-step `field_permissions` mechanism to narrow which fields a Team
  Member may edit (that mechanism exists only on Process/Case steps). Team Member is granted
  flow-level Editable/`my` on Activity — an all-or-nothing approximation, recorded as a residual gap:
  the permission layer cannot express "editable fields depend on whether this row is assigned to me."
- A third, related gap surfaced by the matrix itself: Department Head and Project Sponsor need
  Editable on the PSR process to act their own approval step, which per LESSONS §18 also grants them
  `InitiateItems` (no narrower "act on my step, cannot raise new items" grant exists in the engine) —
  recorded as a residual gap, mitigated at the experience layer by not giving DH/PS a "+ New PSR"
  entry point.

**Verify/gate result**: `engine verify` is clean (0 errors, 1 warning — NO_PAGES, expected pre-pages).
`engine gate` additionally reports `PERM_INERT` (no page card yet reaches any flow) and `FORM_NO_UI`
— both are strict downstream consequences of NO_PAGES (no pages exist until kf-experience-designer
runs) and are expected to clear once pages are built, same bucket as NO_PAGES itself.
`ROLE_ACCESS_COLLAPSE` (Department Head / Project Sponsor have identical capability breadth) is
flagged but intentional: BRD §5.1 gives them literally the same C/V/A pattern on every row; what
distinguishes them in practice is *which* projects each is named on (per-project
Department_Head/Project_Sponsor user fields, D21), not a different permission level — a data-scope
distinction the flat role-level matrix cannot show, addressed instead in
`security.initiators_accessors`/`scope_legend`. `CONFIG_LITERAL_DIVERGENCE` (Cost Entry defaults) and
`AUTOMATIONS_MISSING` are outside this agent's lane (data/automation authoring), left for their
owning stages.

## kf-design-director — Design identity (Ledger anchor, LANDBANK green)
- **Anchor**: `ledger` ("compact rows, stark numerals, raised cards and still motion. Ledgers,
  invoicing, treasury.") picked via `theme-anchors.mjs pick` (score 3, tied with `realty` on keyword
  overlap only) — deliberately chosen over the tie because Ledger's dense-tabular, still-motion
  register fits schedules/budgets/invoices/monthly-PSR approvals, and its `body: IBM Plex Sans` font
  matches BRD §11.3's mandated typeface verbatim with no override needed. `realty`'s serif/breathable
  personality (property listings) does not fit a bank ITPM hub.
- **Hue override (documented overrule of the +/-40 guardrail)**: BRD §9.8 ITPH-00296 is a hard MVP
  requirement — "the system shall use the Bank's visual identity (logo and green colour palette)" —
  and the approved prototype `ITPMD_Project_Hub_Prototype_LANDBANK (4).html` pins exact hex values
  (`--accent:#2F7D32` primary green, `--brand:#74BC44`, `--side:#123A1C` sidebar green). Ledger's
  native primary hue is 175 (teal); `--hue-shift -53` was computed by solving for the shift that lands
  HSL primary at hue 122 — the exact hue of #2F7D32 — so the app reads as LANDBANK green rather than
  generic teal/finance-teal. This exceeds the usual +/-40 guardrail but is justified: an explicit,
  evidenced brand mandate overrides the general "stay within family" guidance meant for looser
  domain-fit variation. Font pairing (Space Grotesk / IBM Plex Sans), radius (0.75rem) and
  shadow/motion character were left untouched per the immutable-anchor-grammar rule.
- **Shell archetype**: `rail-dark` — renders the prototype's dark-green navigation rail via the
  anchor's own dark-mode palette (`sidebarDark: 146 10% 8%`, a near-black desaturated green close to
  #123A1C) rather than a hand-picked color, matching BRD §11.3's "Sidebar green — Navigation
  background" and the institutional/premium tone appropriate for a government bank's IT governance
  hub.
- **Density**: left at Ledger's default `compact` — PSR schedules, risk registers and financial
  tables are dense grids that need to stay legible at the BRD's required tablet/phone widths (§9.8
  ITPH-00298) without excess scroll.
- **Output**: `runs/current/slices/design.json` (top-level key `design`); smoke-tested via
  `buildShell()` in `engine/design-language.mjs` — renders without throwing.

## D24 · Automations: 12 internal notify stitches, 0 external, 0 create/update (kf-integration-analyst)
Wrote `runs/current/slices/automations.json#automations` (12 entries, all `channel:"internal"`,
`action.type:"notify"`, realizing `workflow_meta.slas`/`.notifications` + the two journey-map
automation mentions (J-03 assignment notification, J-04 forecast-past-baseline alert) as typed IR:
- PSR: Draft submitted -> notify DH; DH-approved (Sponsor_Approval_Required="Yes") -> notify Sponsor;
  DH Review / Sponsor Approval rejected -> notify PM (BR-25 return comment); Approved (terminal) ->
  notify PM (BR-13 lock); Draft SLA reminder 3-day/1-day/daily-overdue (BR-11).
- Activity: assigned/reassigned -> notify Responsible_Person (J-03); forecast past baseline Red
  (Schedule_Variance_Days > 10 or missed milestone, BR-03) -> notify Responsible_Person (J-04's named
  "forecast-past-baseline alert automation").
- Action Item: created -> notify Assignee; auto-Overdue -> notify Assignee (ITPH-0037/00155).
- Issue: auto-Escalated (BR-21) -> notify Issue_Owner/PM (+ PSC reach is native board visibility, not
  a separate field).
- Risk: Escalation_Flag=1 (BR-22, High/Critical) -> notify Risk_Owner (BRD ITPH-00150).
No `create`/`update` cross-flow stitches were authored: the BR-02/03/05/06 rollups are already
cross-flow **aggregate fields** on ITPMD Project (kf-data-architect, D22) — computed lookups, not
integration automations, per LESSONS "in-app math is a formula, not a stitch". The one candidate
create/update stitch — an Approved PSR appending a row to the Portfolio Status Report's Project
Summaries child table (BR-24's "rolls into the PPSR") — was deliberately **not authored**: the target
record for a given reporting period is ambiguous (find-or-create-by-period isn't an engine primitive)
and J-15 frames PPSR generation as a manual PSC Member action; recorded as open-questions.md #10 for
LANDBANK/Phase-2 instead of guessing a field map. No EXTERNAL (email/SMS/webhook) automations were
flagged: BRD §8.12 does not name a distinct external channel for MVP notifications — Kissflow's native
step/assignment notification IS the "in-app" channel these stitches realize.
Self-check: merged the slice onto a scratch copy of app-spec.json and ran `engine verify` / `engine
gate` — 0 errors from automations (only expected `AUTO_SELF` warnings, since every notify stitch's
source and target are intentionally the same flow — a same-record status/field-change notification,
not a cross-flow create/update). The gate's single blocker (`FORM_NO_UI` on ITPMD Activity.Project) and
all `PERM_INERT`/`NO_PAGES` warnings are pre-existing, pages-stage concerns (kf-experience-designer
running in parallel), not automations issues.

## D25 · Experience: role landings, process-organized nav, derived dashboards (kf-experience-designer)
Wrote top-level `pages[]` (18) and `nav.menus[]` (10 menus) directly onto `runs/current/app-spec.json`
(this agent's IR slice is the pages/nav keys, no separate slice file). Every `source_flow` is the
flow's own `id` (e.g. `itpmd_psr`), not its display name — `ITPMD Project Status Report`'s id is the
abbreviated `itpmd_psr`, and the gate's `PERM_INERT`/`NAV_GRANT_ESCALATION` checks norm-compare
`card.source_flow` straight against `permissions[].model` (unlike `experience.mjs#modelResolver`,
which canonicalizes id↔name) — a name-based `source_flow` on an abbreviated-id flow silently failed
that comparison and produced false PERM_INERT positives during a first pass.

**Per-role landing + nav** (Home menu → each role's dashboard; one process-organized menu per flow →
`My Requests`/`Approvals` submenus):
- **Project Manager** → `PM Project Cockpit`: 6 KPIs (active projects, PSRs in progress, open risks,
  open issues, overdue action items, total actual cost), 1 chart (PSRs by Sponsor_Approval_Required),
  5 create actions (Project/Activity/Risk/Cost Entry/PSR) — PM is Editable/`my` on every project-scoped
  flow, so every card is safe. Nav: `My Requests` on Projects/Activities/Risks/Cost Entries/PSRs.
- **Team Member** → `My Tasks` (BRD §8.14): 4 KPIs + a My Activities list, scoped `my` — cards only on
  Activity (Editable) + the two Boards (Editable); no Project/Risk/PSR cards (ReadOnly for this role).
  Nav: `Activities → My Requests` (their own assigned rows, no create button — TM is not Activity's
  initiator per `security.initiators_accessors`, only PM is, despite the BR-15 all-or-nothing Editable
  grant) + the two Board menus.
- **Department Head / Project Sponsor** → `DH/PS Approval & Portfolio Health`: PSR-approval KPI +
  health-distribution chart + the PSR list itself doubling as the project-health view (PSR rows carry
  the BR-13 snapshot of Overall_Health/Schedule_Health/Cost_Health/budget-vs-actual — so the one flow
  DH/PS may act on (Editable/`my-team`) already surfaces "their projects' health" without needing a
  card on Project/Activity/Risk/Cost Entry, which are ReadOnly for both roles). Nav: `Project Status
  Reports → Approvals` only (list card, no create — D20/D23's "withhold '+ New PSR' from DH/PS" is
  enforced here by simply never emitting an `action` card for this role/flow, not by a permission
  change).
- **PSC Member** → `Portfolio Command Center`: Portfolio Status Report KPI + create + list (Editable/
  `all`, PSC's one initiated flow) — the PPSR's own Project Summaries child rows (one per approved PSR,
  autofilled health/%complete/cost per D17) are this role's portfolio-health reporting surface, since
  Project/Risk/Cost Entry/PSR/Issue/Action Item are all ReadOnly for PSC. Nav: `Portfolio Status
  Reports → My Requests` only.
- **Hub Administrator** → `Hub Administration`: Holiday Calendar + Hub Settings KPIs/actions
  (Editable/`all`, the only two flows this role touches). Nav: `Hub Settings` menu (2 submenus).

**Boards (Issue, Action Item) — D20's "reach via Kanban, not list-card" honored literally**: no
`ir.pages` entry for either board carries a list/chart/action card (`buildPage` has no Case component).
Two placeholder pages (`ITPMD Issue Board`, `ITPMD Action Item Board`, `kind:"kanban"`, empty `cards`)
exist purely so `nav`'s `Issues`/`Action Items` menus resolve to a real page name — the actual UI is
`client.mjs`'s auto-applied Kanban page (same name, `applyKanbanPage`) with its native "+ New <Item>"
button serving as the create affordance for PM/Team Member (the two `initiators_accessors` creators);
every role (PM/TM/DH/PS/PSC) is `visibleTo` the board menu since read access to a Board's Kanban view
carries no create right by itself.

**A genuine engine-level residual gap surfaced here (documented, not fabricated around)**: applying
ANY page/nav-reachable card (`kpi`/`list`/`chart`/`action`, regardless of view type) grants the VIEWING
role Member+Delete (Form) or InitiateItems (Process) on that flow via `client.mjs`'s page-driven-grant
loop — there is no read-only card. `checkGateIR#NAV_GRANT_ESCALATION` correctly blocks this for Forms/
Processes, but (unlike the live `client.mjs#fam()` helper) does **not** special-case Case/Board as a
zero-grant family — a KPI card on `itpmd_issue`/`itpmd_action_item` for a role ReadOnly on the board is
flagged as if it grants Delete, even though the real apply-time grant would be `Permission:[]` (safe).
Rather than fight the static check, DH/PS/PSC dashboards simply carry NO card on any flow where
`security.permissions` declares them ReadOnly (Project, Activity, Risk, Cost Entry, Issue, Action Item
for DH/PS/PSC; PSR/Portfolio Report additionally ReadOnly for PSC) — the BRD's aspiration that these
roles see broad read-only reporting tiles for those flows is **not represented as page cards**; their
actual `security.permissions` ReadOnly grant (Member+View, View-report) still exists and would let a
native Kissflow view/report show the data, but no custom nav path reaches it from this app's designed
navigation. Recorded here (not invented around) exactly like D20/D23's two named gaps — a candidate
fix is a future `flowGrant`-aware `NAV_GRANT_ESCALATION` (or an actual read-only card verb) at the
engine layer, out of this agent's lane.

**Verify/gate result**: `engine verify` — 0 errors, 0 warnings. `engine gate` — 1 blocker
(`AUTOMATIONS_MISSING`, kf-integration-analyst's `runs/current/slices/automations.json` not yet merged
into `app-spec.json`, expected per the parallel-stage design) + 28 warnings (`PERM_INERT` — the
documented ReadOnly-reachability gap above, one entry per role×flow pair left uncarded on purpose;
`CONFIG_LITERAL_DIVERGENCE` on Cost Entry defaults and `ROLE_ACCESS_COLLAPSE` DH/PS — both pre-existing,
outside this agent's lane per D23/D24). Zero `NAV_DANGLING_PAGE` / `ORPHAN_PAGE` / `NAV_NO_AUDIENCE` /
`ROLE_NO_LANDING` / `ROLE_NO_REACHABLE_PAGE` / `PERSONA_NO_LANDING` / `FORM_NO_UI` / `MODEL_NO_PERMISSION`
— every role has a real landing, every nav item resolves to an existing page, every page (except the
6 landings) is nav-reachable, and every flow has at least one accessor role's page/nav home (the two
Boards via the Kanban pointer pages; every Form/Process via its initiator's worklist and/or the acting
approver's queue).

## D26 · Coherence gate: PSC portfolio view restored; Gantt/S-curve routed (kf-coherence-critic)
**Ruling on D25's concern:** D25's "no cards on ReadOnly flows" left the PSC Member's Portfolio Command
Center with only its own PPSR form. That breaks J-14 (ITPH-00124/00126/00130/00132, BR-06: see
portfolio health and projects needing attention) and the PSR-history/approval-status steps of J-15.
The BRD 5.1 matrix gives PSC "C" on the Portfolio dashboard/PPSR and "V" on PSRs. **Fix (minimal,
0 gate errors):**
- PSC Member → `itpmd_psr` changed ReadOnly → **Editable**. This is the only gate-clean way to put a
  PSR card on PSC's page. The live effect is Member+InitiateItems on PSR. That is the same residual
  DH/PS already carry (SEC-1). It is judged harmless: PSC gets no action card or "+ New", and any PSR
  it raised would still need DH review, so it grants no approval authority. Recorded as
  `security.residual_gaps` RG-PSC-PSR-INITIATE.
- The Portfolio Command Center gets **5 report-based charts on PSR** (all items, grouped by
  Overall/Schedule/Cost/Risk/Issue Health). These give the portfolio distribution, the Red "needs
  attention" band, and the high/critical risk and issue bands. **No PSR list card was added:**
  ProcessTable binds to `myitems`, so the list would be empty for a non-initiator.
- The PSR lookup on the Portfolio Status Report's Project Summaries now also shows Schedule_Health,
  Cost_Health, Risk_Health and Issue_Health. Each PPSR therefore names *which* projects are Red and
  which have critical risks or issues.
- Critical issues and overdue actions are still reached through the Issue/Action Item Kanban boards.
  These have case-family Viewer grants and add no escalation.

**Rejected:** Form cards for PSC/DH/PS on Project, Risk and Cost Entry. They would grant Member+Delete
on those registers, which is a real weakening of BRD 5.1/ITPH-00225 and not harmless. DH/PS journeys
(J-12/J-13) are PSR approvals and are already served by their PSR landings, so they were left as-is.

**Routed, not fixable in ir.pages:** J-02's Gantt (ITPH-0024) and J-10's S-curve (ITPH-00266–269,
MVP per BRD §4.3) have no surface, because buildPage has no Gantt or S-curve component. Owner:
kf-experience-designer via the /add-page custom-component chain, plus kf-data-architect for the
BR-17 weekly series. Acceptance stays blocked on these two until they are built or the user waives them.

**Verdict:** 16/18 journeys satisfiable, 1 partial (J-02), 1 unsatisfied (J-10). PASS to build,
FAIL to acceptance pending those two items. Full matrix: `app-spec.json#coherence`.

## D27 · Apply to dev: 3 passes run, residual engine idempotency gaps found (kf-author)
**Apply succeeded on pass 1** (04:01–04:07): app `ITPMD_Project_Hub_A00` created with all 6 roles,
15 lists (seeded), 7 forms, 1 process, 2 cases + caseflows (Issue 6 statuses, Action Item 5 statuses),
2 board pages, 6 reports/table-views, 6 AI role dashboards (all `publish 200`), Home nav wired to all
6 dashboards, flow access granted per role, and 12 internal notify automations created+published
(`IsActive:false`, per design — user turns on in builder). Verified 37 flow-family entities Live.

**Passes 2 and 3** were run per the 423-grant-lock lesson (LESSONS §16: re-grant after a publish,
since access-grant calls intermittently 423 mid-apply) — each pass did clear more of the outstanding
423s on role↔flow access grants (down to a handful of stragglers by pass 3: Team Member↔issue,
PM/PSC↔action_item, DH/PSC↔cost_entry, PS/TM↔psr, DH↔portfolio_report all still 423 as of pass 3).
**But each re-apply pass also re-ran the AI-page and board-page branches non-idempotently**, which is
an ENGINE gap, not an IR defect:
- **Board pages** (`itpmd_issue_Board`, `itpmd_action_item_Board`): pass 1 created them (200/200/200).
  Passes 2–3 re-attempted `create` unconditionally and got `400` (Kissflow itself rejects the duplicate
  name) — no new board page is left behind, this is a clean no-op failure, but the branch needs an
  "already exists — skip" guard like automations already have (client.mjs applyIR).
- **AI dashboards**: pass 1's 6 dashboards published cleanly with human-readable ids
  (`Project_Manager_Dashboard_A00`, `Team_Member_Dashboard_A00`, `Department_Head_Dashboard_A00`,
  `Project_Sponsor_Dashboard_A00`, `Hub_Administrator_Dashboard_A00`, `PSC_Member_Dashboard_A00`) and
  are the ones Home nav points at — confirmed still intact. Passes 2 and 3 re-invoked the AI page
  generator for the SAME role names with no existence check, minting 10 brand-new raw-UUID page ids
  that all failed `publish 404` (orchestrator confirmed live: `GET page/9c6cb63c…/draft` → 404
  MetadataNotFoundException, "Metadata not found ... for the stage draft" — the id the generator
  returns is not yet a materialized page at the moment publish is attempted). These 10 are orphaned,
  UNPUBLISHED draft-stage artifacts, NOT wired into nav (nav still resolves to pass-1's 6 pages) and
  believed harmless to live users, but they exist server-side and should be cleaned up:
  - pass 2: `fb4b9519-47a9-428a-a38e-27979872d215` (PM), `c6ec4f38-26cc-42ca-97fb-323918606a46` (TM),
    `80ae2589-aa6e-4900-a23b-444efdd3671e` (DH), `5056d4b1-dd0b-494b-bff9-c25c270276ee` (PS),
    `c168b0b6-7583-48cf-8fff-1cf428fb970b` (PSC), `ff96e06e-c0c8-4914-803c-79c6cf01aa1e` (Hub)
  - pass 3: `b50b0c2f-b77f-44e4-989a-436bff9533ef` (TM), `9c6cb63c-c738-47f8-b7d8-71b246ceec48` (PM),
    `ca44fd39-4d5a-49f5-b23d-49b7b2be6375` (DH), `55fd43fb-b252-453b-9c3f-f621521c1340` (PS)
  **Not deleted by this agent** — flagging for the user / kf-app-builder to remove via the builder UI
  or a dedicated cleanup script; deleting live metadata is outside this agent's authoring lane without
  explicit instruction.
- Two automations (`PSR submitted…`, `PSR DH-approved…`) show the identical non-idempotent-retry
  pattern (`create:400` with a fresh random id on passes 2/3) — same root cause, same "no duplicate
  actually persisted" outcome, no cleanup needed.

**STOPPED after pass 3** per the orchestrator's instruction — no further re-apply loops. The account
hit a Cloudflare 429 on a page-list probe during diagnosis; no further API calls were made beyond the
read-only checks already reported.

**Recommended engine fix (out of this agent's lane to apply mid-run):** guard the `ai-pages` and
`board-page` branches of `client.mjs`'s `applyIR` with the same "does a page/board with this name
already exist? skip" check the automations branch already has, so a resumed/incremental apply is
truly idempotent instead of minting new ids every pass.

**Residual 423s as of pass 3** (role↔flow access grants not yet confirmed 200): Team Member↔itpmd_issue,
Project Manager↔itpmd_action_item, PSC Member↔itpmd_action_item, Department Head↔itpmd_cost_entry,
PSC Member↔itpmd_cost_entry, Project Sponsor↔itpmd_psr, Team Member↔itpmd_psr,
Department Head↔itpmd_portfolio_report. These are Kissflow's transient grant-lock (423) and typically
clear on the next grant attempt — left for a future incremental apply pass, not a fourth pass now
given the rate-limit signal.
