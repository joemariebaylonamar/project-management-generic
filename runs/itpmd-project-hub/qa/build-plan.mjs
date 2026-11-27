#!/usr/bin/env node
// build-plan.mjs — generates qa/test-plan.json from the engine universe + app-spec (offline, no network).
// Usage: node runs/current/qa/build-plan.mjs   (run from the app root)
import { readFileSync, writeFileSync } from "node:fs";
const spec = JSON.parse(readFileSync("runs/current/app-spec.json", "utf8"));
const U = JSON.parse(readFileSync("runs/current/qa/universe.json", "utf8")).items;
const byId = new Map(U.map((u) => [u.id, u]));
const nameToId = Object.fromEntries(spec.forms.map((f) => [f.name, f.id]));
const idToName = Object.fromEntries(spec.forms.map((f) => [f.id, f.name]));
const grant = new Map(spec.permissions.map((p) => [p.role + "::" + p.model, p]));
const roles = spec.roles.map((r) => r.name || r);

// ---- home journey of every flow (BA grouping only) --------------------------------------------
const HOME = {
  itpmd_hub_settings: "J-16", itpmd_holiday_calendar: "J-16",
  itpmd_project: "J-01", itpmd_project__contracts: "J-01", itpmd_project__project_team: "J-01", itpmd_project__budget_changes: "J-01", itpmd_program: "J-01",
  itpmd_project__baseline_history: "J-02", itpmd_baseline: "J-02", itpmd_activity: "J-02", itpmd_activity__predecessors: "J-02", itpmd_release: "J-02", itpmd_template: "J-02",
  itpmd_weekly_report: "J-04",
  itpmd_issue: "J-05", itpmd_action_item: "J-05", itpmd_project__decision_log: "J-05", itpmd_binder_item: "J-05",
  itpmd_risk: "J-06",
  itpmd_cost_entry: "J-07", itpmd_cost_entry__invoices: "J-07",
  itpmd_psr: "J-08", itpmd_psr__schedule_highlights: "J-08", itpmd_psr__next_period_plan: "J-08", itpmd_psr__key_issues_and_risks: "J-08",
  itpmd_portfolio_report: "J-15", itpmd_portfolio_report__project_summaries: "J-15",
  itpmd_discussion_message: "J-11", itpmd_notification: "J-11", itpmd_discussion_read: "J-11",
};
const JROLE = { "J-11": "Team Member", "J-12": "Department Head", "J-13": "Project Sponsor", "J-14": "PSC Member", "J-15": "PSC Member", "J-16": "Hub Administrator", "J-17": "Hub Administrator", "J-18": "Hub Administrator" };
const jrole = (j) => JROLE[j] || "Project Manager";

const STORY = {
  "J-01": "A project manager sets up a newly approved IT project: its name, business unit, portfolio, the department head and sponsor who oversee it, its contract and purchase-order details, its approved budget and contingency, and who is on the team. The form insists on the key details before it will save, and once saved the project is the single record that schedules, costs and status reports all build on. People who are not on the project, and roles with no business seeing project set-up, are kept out.",
  "J-02": "A project manager builds the project schedule: adds activities with planned dates, links them by dependency, marks milestones, and locks in an approved baseline that later progress is measured against. The system keeps the baseline fixed and records schedule history, and people outside the project team cannot alter the schedule.",
  "J-03": "A project manager hands each activity to a team member and can move it to someone else later. The new owner is told, the change is traceable, and each team member can narrow the schedule down to just their own work.",
  "J-04": "While work is under way, team members record how far along their activities are and the actual start and finish dates, and the project manager updates forecast dates. The system works out whether each activity is on track, and warns the owner when the forecast slips past the approved baseline.",
  "J-05": "A project manager logs a problem as an issue with a category, priority, owner and target date, breaks it into action items with owners, records the decisions taken, and watches overdue items. Critical or long-overdue issues escalate by themselves so the steering committee sees them, and action items past their due date flip to overdue on their own.",
  "J-06": "A project manager keeps the risk register: records each risk, rates its likelihood and impact, assigns an owner and a response plan, and tracks it over time. The overall rating follows the agreed five-by-five scale automatically, and high or critical risks are flagged to the risk owner.",
  "J-07": "A project manager records what has actually been spent, what is committed and what is forecast, including invoices, against the project budget. The totals add up on their own and budget changes and contingency draw-downs are visible against the approved figures.",
  "J-08": "At month end the project manager prepares the monthly status report from live project data, previews it, and submits it. The form insists on the project, the narrative update and the reporting month before it will go forward. Once submitted it lands with the project's department head, who is told it is waiting, and a reminder goes out as the deadline nears.",
  "J-09": "When a reviewer sends a status report back with a comment, it returns to the project manager with everything they entered still intact. The manager is told why, fixes it and resubmits, and it goes back through review from the start.",
  "J-10": "A project manager looks at the cumulative planned, actual and forecast progress curve for a project, with the schedule performance figures and a table view of the same numbers.",
  "J-11": "A team member opens their personal task list and sees only the activities and action items assigned to them across their projects, is told when something new is assigned, and updates their own progress. They cannot see or change other people's work or anything financial.",
  "J-12": "A department head is told a status report is waiting, reviews it and either approves it or sends it back with a comment. When approved, the system decides whether the project's sponsor also has to sign off (for example when the project is red) or whether the report can be finalised straight away.",
  "J-13": "A project sponsor is told a department-head-approved report needs their sign-off, reviews it, and either approves it, which locks the report, or sends it back with a comment.",
  "J-14": "A member of the steering committee sees every project in the portfolio, filters by status, health, risk and business unit, and spots the projects needing attention. They can look at everything but are not allowed to change project data.",
  "J-15": "A steering committee member builds the consolidated portfolio status report from the approved project reports and looks back through earlier reports and their approval status over time.",
  "J-16": "The hub administrator maintains the working calendar of holidays and non-working days and sets the alert thresholds, reminder periods and recipients. Nobody else can change these settings.",
  "J-17": "The hub administrator creates user accounts, puts people into roles, switches access on and off, and assigns people to the projects they should see, so that each person only sees what they are allowed to.",
  "J-18": "The hub administrator reviews the audit trail of what was done by whom, and can trace one status report from creation through submission, approval or return, with comments and timestamps.",
};

// ---- use cases: every universe id belongs to one --------------------------------------------
const ucCovers = Object.fromEntries(Object.keys(STORY).map((j) => [j, []]));
const homeOfForm = (fid) => HOME[fid] || "J-01";
function homeOfItem(u) {
  const p = u.id.split(":");
  if (u.kind === "journey") return p[1];
  if (u.kind === "permission" || u.kind === "scope") return homeOfForm(p[2]);
  if (u.kind === "denial") return homeOfForm(nameToId[p.slice(2).join(":")]);
  if (u.kind === "field" || u.kind === "reference") return homeOfForm(nameToId[p[1]]);
  if (u.kind === "workflow") {
    if (/Return/.test(p[3])) return "J-09";
    if (p[2] === "Draft") return "J-08";
    if (p[2] === "Department Head Review") return "J-12";
    if (p[2] === "Sponsor Approval") return "J-13";
    return "J-13";
  }
  if (u.kind === "automation") {
    const m = { auto_psr_submit_notify_dh: "J-08", auto_psr_dh_approved_notify_sponsor: "J-12", auto_psr_dh_returned_notify_pm: "J-09", auto_psr_sponsor_returned_notify_pm: "J-09", auto_psr_approved_notify_pm: "J-13", auto_psr_deadline_reminder: "J-08", auto_activity_assigned_notify_assignee: "J-03", auto_activity_forecast_past_baseline_alert: "J-04", auto_action_item_assigned_notify_assignee: "J-05", auto_action_item_overdue_notify_assignee: "J-05", auto_issue_escalated_notify_pm_psc: "J-05", auto_risk_escalated_notify_owner_pm: "J-06" };
    return m[p[1]] || "J-08";
  }
  return "J-01";
}
for (const u of U) ucCovers[homeOfItem(u)].push(u.id);

// ---- tests ----------------------------------------------------------------------------------
const tests = [];
const T = (id, title, role, covers, steps, asserts, extra = {}) => tests.push({ id, title, role, covers, steps, asserts, ...extra });
const ids = (pred) => U.filter(pred).map((u) => u.id);

// journeys
for (const j of spec.domain.journeys) {
  T(`T-${j.id}`, `Journey: ${j.name}`, jrole(j.id), [`J:${j.id}`],
    ["Sign in as the journey's role (acceptance sandbox user).", ...j.steps.map((s) => s.replace(/\s*\(ITPH[^)]*\)/g, ""))],
    [`Every step completes without a permission or validation error`, `Outcome holds: ${j.outcome}`, ...(j.success_criteria || []).map((c) => `Success criterion observed: ${c}`)],
    { class: "journey" });
}

// permission + scope per form (positive path, per granted role)
const forms = [...new Set(spec.permissions.map((p) => p.model))];
for (const f of forms) {
  const g = spec.permissions.filter((p) => p.model === f);
  const covers = ids((u) => (u.kind === "permission" || u.kind === "scope") && u.id.split(":")[2] === f);
  T(`T-PS-${f}`, `Granted access and data scope on ${idToName[f]}`, "each granted role", covers,
    g.flatMap((p) => [`As ${p.role}: create (if InitiateItems/Editable) or list records on ${f} with the role's own sandbox user.`, `As ${p.role}: read back a record of another user and a record the role owns; count visible rows (${p.role} expects scope '${p.scope}').`]),
    g.map((p) => `${p.role}: ${p.level === "ReadOnly" ? "can read but a write/update attempt is refused" : "can read and write"}; visible rows match scope '${p.scope}'`),
    { class: "permission+scope", note: "Universe fixed: P: ids now carry the granted level (read/edit) from p.level. Single-user run: proven via live member-ACL read (weak evidence); per-role execution needs seeded role users." });
}

// denials per form
for (const f of spec.forms) {
  const covers = ids((u) => u.kind === "denial" && u.id.split(":").slice(2).join(":") === f.name);
  const real = roles.filter((r) => !grant.has(r + "::" + f.id));
  const bogus = roles.filter((r) => grant.has(r + "::" + f.id));
  T(`T-DENY-${f.id}`, `Roles with no grant are blocked from ${f.name}`, real.join(", ") || "n/a", covers,
    real.map((r) => `As ${r}: GET list, GET record, POST create on ${f.id}`),
    [...real.map((r) => `${r}: every attempt returns 403/empty (a success is a SECURITY finding)`),
      ...(f.id.includes("__") ? ["Child table: not independently grantable; a role's access follows the parent flow, so the denial is asserted through the parent flow's ACL (roles that hold the parent grant are recorded as not-independently-grantable, not as failures)."] : [])],
    { class: "denial", realDenials: real, notIndependentlyGrantable: f.id.includes("__") });
}

// fields: required + computed + step overrides, per form
for (const f of spec.forms) {
  const covers = ids((u) => u.kind === "field" && u.id.split(":")[1] === f.name);
  if (!covers.length) continue;
  const req = covers.filter((c) => c.endsWith(":required")).map((c) => c.split(":")[2]);
  const comp = covers.filter((c) => c.endsWith(":computed")).map((c) => c.split(":")[2]);
  const stepc = covers.filter((c) => !c.endsWith(":required") && !c.endsWith(":computed"));
  T(`T-FLD-${f.id}`, `Field rules on ${f.name}`, "Project Manager (or the flow's creator role)", covers,
    [...(req.length ? [`Attempt to save/submit ${f.id} with each required field blank in turn: ${req.join(", ")}`] : []),
     ...(comp.length ? [`Write raw inputs, read back computed fields: ${comp.join(", ")}; then update an input and re-read`] : []),
     ...(stepc.length ? ["Open the item at the Draft step and read each field's permission state"] : [])],
    [...(req.length ? ["Each blank-required attempt is rejected with a 'Value is required' style error"] : []),
     ...(comp.length ? ["Computed values equal the formula result; chained formulas (formula-of-formula) recompute after an input update"] : []),
     ...stepc.map((c) => `State holds: ${c.replace(/^F:/, "")}`)],
    { class: "field" });
}

// references per form
for (const f of spec.forms) {
  const covers = ids((u) => u.kind === "reference" && u.id.split(":")[1] === f.name);
  if (!covers.length) continue;
  T(`T-REF-${f.id}`, `Reference links on ${f.name}`, "Project Manager (or the flow's creator role)", covers,
    ["Create a parent target record, then create a record on this flow pointing at it (try the {_id, Name} shape)", "Read back the stored record"],
    ["The reference value persists (not silently dropped)", "Lookup columns of the target are populated on the record"],
    { class: "reference", knownPlatformLimit: "Reference field runtime writes are dropped on this dev sandbox (MEMORY-LOCAL)" });
}

// workflow
const W = (pred) => ids((u) => u.kind === "workflow" && pred(u.id));
T("T-WF-draft-to-dh", "PSR: manager submits, lands at Department Head Review", "Project Manager", W((i) => /:Draft:advance$/.test(i)).concat(ids((u) => u.kind === "field" && /:Draft:/.test(u.id) && u.id.split(":").length > 4)),
  ["As PM create a PSR with project, narrative and period, submit it", "GET the item's current step, status, assignee"],
  ["Item is at 'Department Head Review', InProgress, assigned to the Department Head role", "At Draft the Project and Narrative fields are Mandatory and Supporting Documents and Reporting Month are Editable"], { class: "workflow" });
T("T-WF-dh-approve", "PSR: DH approves; routes to Sponsor only when required, else Approved", "Department Head", W((i) => /Department Head Review:Approve$/.test(i) || /Sponsor Approval:Approve$/.test(i) || /Approved:advance$/.test(i)),
  ["Two PSRs: one with sponsor approval required = No, one = Yes (Red health)", "As DH approve both", "As Sponsor approve the second"],
  ["No-sponsor PSR goes straight to Approved and locks", "Sponsor-required PSR waits at Sponsor Approval, then Approved", "Approved PSR is read-only"], { class: "workflow", knownPlatformLimit: "Approver-step submit returns 400 via the access key (MEMORY-LOCAL)" });
T("T-WF-return", "PSR: DH and Sponsor return with a comment, item goes back to manager intact", "Department Head, Project Sponsor", W((i) => /:Return$/.test(i)),
  ["As DH send back a PSR with a comment; as Sponsor send back another", "GET both items"],
  ["Each lands back at Draft for the initiator", "Their entered data is unchanged", "A return without a comment is refused"], { class: "workflow", knownPlatformLimit: "Approver-step submit returns 400 via the access key (MEMORY-LOCAL)" });

// automations
for (const a of spec.automations.filter((x) => (x.channel || "internal") !== "external")) {
  const id = `A:${a.id || a.name}`;
  if (!byId.has(id)) continue;
  T(`T-${a.id}`, `Automation: ${a.name}`, "Project Manager", [id],
    [`Fire the trigger for '${a.name}'`, "Poll the integration run log / notification outcome for up to 2 minutes"],
    ["A run record exists and the notification action executed with a recipient, subject and body", "Integration is switched on in the live app (read-only metadata check)"],
    { class: "automation", note: "decisions D30: all 12 integrations were deliberately left OFF and 9 have empty field mappings; 3 have no trigger" });
}

// decision invariants (extra tests, re-claim related ids)
T("T-DEC-D13-sponsor-conditional", "Decision D13/D21: sponsor step is conditional", "Department Head", W((i) => /Sponsor Approval:Approve$/.test(i)), ["Approve a PSR with and without sponsor-required flag"], ["Routing differs by the flag"], { class: "decision-invariant" });
T("T-DEC-D21-reject-to-initiator", "Decision D21/BR-25: rejections return to initiator with data intact and mandatory comment", "Department Head", W((i) => /:Return$/.test(i)), ["Send back with and without comment"], ["Lands at step 1, data intact, comment required"], { class: "decision-invariant" });
T("T-DEC-D29-row-scope", "Decision D29/BR-23: row scoping is UI-only; platform cannot restrict rows", "Department Head", ids((u) => u.kind === "scope" && /Department Head:itpmd_project/.test(u.id)), ["As DH list projects via REST where not named DH"], ["Expected per D29: rows ARE visible via REST (documented limit); record as known design limit, not as a pass"], { class: "decision-invariant" });

writeFileSync("runs/current/qa/test-plan.json", JSON.stringify({
  generatedBy: "runs/current/qa/build-plan.mjs", target: "dev ITPMD_Project_Hub_A00",
  usecases: Object.entries(STORY).map(([id, story]) => ({ id: `UC-${id}`, title: spec.domain.journeys.find((j) => j.id === id).name, role: jrole(id), story, covers: ucCovers[id] })),
  tests,
}, null, 1));
console.log("tests", tests.length, "usecases", Object.keys(STORY).length);
