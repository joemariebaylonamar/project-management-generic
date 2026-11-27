# Acceptance run — ITPMD Project Hub (dev sandbox)

Env: `development-landbank-ai` / account `AcE26a5HoPDd`, app `ITPMD_Project_Hub_A00`.
Credential: the account's single access-key (KF_ACCESS_KEY_ID/SECRET) — no per-role user
impersonation is available. The account has 2 real users: `joemarie@kissflow.com` (member of
ALL 6 app roles) and `charumathi@kissflow.com` (member of NONE). See `acceptance.json` for the
full scenario detail; this is the short version.

## Verdict: FAIL to close MVP acceptance — 2 blockers found, both structural/platform, not scenario bugs

## What passed (real, observed)
- **J-01** Project creation (PM): full record created live, `Project_Code` auto-sequenced
  `ITP - 0001`, currencies stored correctly. `_id PkEGtbmUaHf1`.
- **J-08** PM submits a PSR: created + submitted 200, and a follow-up detail GET confirmed the
  item genuinely advanced — `_current_step: "Department Head Review"`, `_status: "InProgress"`,
  `_current_assigned_to: [Department Head]`. Real workflow movement, not a simulated pass.
  Two independent PSR items: `PkEGtj2c_B95`, `PkEGtlASsP7u`.

## What failed
- **Risk rating formula (priority 3)**: `Risk_Rating = Probability*Impact` computes and
  recomputes correctly (20, then 25 after an update). `Risk_Rating_Band` (a formula reading
  another formula field, `Risk_Band_Code`) never (re)computes — stayed `"Low"` at rating 20 and
  25, should be `"Critical"`. Same defect reproduced on Activity's `Status` field (stuck
  `"In Progress"` at 0%/40% complete with `Actual_Start` blank; should be `"Not Started"`).
  **Owner: kf-data-architect** (chained formula-of-formula fields don't recompute).
- **Issue/Action Item board creation (priority 2)**: blocked entirely — see BLK-1 below. Zero
  board items could be created, so zero status-move scenarios could be run.
- **Activity/Risk/Cost Entry linked to a Project (priorities 1/3/4)**: blocked — see BLK-1.

## The two blockers

**BLK-1 — Reference-field writes are broken on the runtime API.** Every payload shape tried for
a required `Reference` field (pointing at a real Project record) either silently drops (200, but
absent on read-back, then submit 400s "Value is required") or 500-crashes. Tried: `{_id}`,
`{_id,Name}`, `{_id,Name,Kind:'Form'|'Model'}`, `{Id}`, plain id string, arrays of the above, via
draft-create, batch-create (`_is_created:true`), and post-create update. This blocks creating ANY
record that must link to its parent Project — Activity, Risk, Cost Entry, Issue, Action Item all
require it; the PSR process was the one exception (its own required Project reference is not
enforced the same way at create/submit, which is how J-08 above could run at all, but the
resulting PSR items are also unlinked). **Owner: kf-data-architect / engine** — needs the real
write shape confirmed, or a platform fix.

**BLK-2 — the approving actor step cannot be completed via this credential.** Submitting the
PM-owned Draft step works. Submitting the very next step (Department Head Review, an approval
UserTask) 400s every time — `KISSFLOW_ERROR_050302` "no permission" or `050201` "moved out of
your queue" — even using the freshest correct `activity_instance_id` read from `_current_context`
immediately beforehand. No `/claim`, `/pick`, `/self-pick`, `/selfpick` endpoint exists (all 404).
This blocks **J-09, J-12, J-13** (DH return, PM resubmit, DH approve + BR-10 Yes/No routing, PS
sign-off) entirely — untested, not failed. **Owner: platform/orchestrator** — the access-key
credential can act as process initiator but not as a named approver role, even though the
underlying human user is a member of that role.

## What's structurally correct but NOT behaviorally provable
- Team Member has zero grant on Cost Entry (confirmed in `app-spec.json#permissions` /
  `#security.data_scope` — no entry at all for that role×flow pair).
- Department Head is `ReadOnly` (not `Editable`) on Project.
Both match design intent, but with only one usable credential (a member of all 6 roles) there is
no way to attempt either action AS a denied role and observe a real 403/permission block. Flagged
per the task's own instruction rather than claimed as a pass.

## A build anomaly noticed in passing
`Project_Manager`/`Department_Head`/`Project_Sponsor` User-type fields on both `ITPMD_Project_A00`
and `ITPMD_Project_Status_Report_A00` have their field `Id` equal to the matching AppRole's own
server `_id` (e.g. field id `RoEGt7NaqKtv` == the Project Manager role's id) — every other User
field in the app got a normal snake_case id. Writes worked once this was discovered, so it did not
block acceptance, but it's worth a kf-workflow/kf-data-architect look.

## Test records created (prefix ACCEPT-TEST where the flow allows a user-set Name)
- `ITPMD_Project_A00` / `PkEGtbmUaHf1` — ACCEPT-TEST Project Alpha
- `ITPMD_Risk_A00` / `PkEGtcamdgyT` — ACCEPT-TEST Risk - Vendor delay
- `ITPMD_Activity_A00` / `PkEGtiDt16UN` — ACCEPT-TEST Activity - Design Phase
- `ITPMD_Cost_Entry_A00` — ~10 probe rows, all orphaned (reference-shape probing), titles prefixed
  `ACCEPT-TEST refshape*` / `ACCEPT-TEST CostEntry refcheck*`
- `ITPMD_Project_Status_Report_A00` / `PkEGtj2c_B95`, `PkEGtlASsP7u` — server-named (Process items
  have no user-set Name), both stuck at Department Head Review
All are orphaned/unlinked from real project data — safe to bulk-delete from the dev sandbox.

Full detail: `runs/current/acceptance.json`.
