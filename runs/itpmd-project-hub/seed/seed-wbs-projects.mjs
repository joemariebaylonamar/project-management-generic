// Seed 5 more WBS projects: 2 with Charu as PM (Joemarie DH/Sponsor), 3 with Joemarie as PM (Charu DH/Sponsor).
// Each gets phases → deliverables → tasks (some with subtasks) → ◆ gates, budgets spread over the work items,
// progress/actual dates derived from today (one project runs late), 2 risks and a cost position.
// Re-running replaces them. Usage (from app root, after `source .kf-env`): node runs/itpmd-project-hub/seed/seed-wbs-projects.mjs [--remove]
import { call, c, q, sleep } from "./kf.mjs";

const JOEM = { _id: "UsEGq2SRCohs" }, CHARU = { _id: "UsEGq89RLnD9" };
const TODAY = "2026-09-30";
const F = (id) => `/form/2/${c.acc}/${id}`;
const php = (n) => `${Math.round(n)} PHP`;
const iso = (d) => d.toISOString().slice(0, 10);
const isWork = (s) => { const w = new Date(s + "T00:00:00Z").getUTCDay(); return w !== 0 && w !== 6; };
const addDays = (s, n) => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const toWork = (s) => { while (!isWork(s)) s = addDays(s, 1); return s; };
const nextWD = (s) => toWork(addDays(s, 1));
const addWD = (s, n) => { s = toWork(s); for (let i = 0; i < n; i++) s = nextWD(s); return s; };
const wdBetween = (a, b) => { let n = 0; for (let s = a; s <= b; s = addDays(s, 1)) if (isWork(s)) n++; return n; };

// phases: [name, [[deliverable | null, [[task, dur, [[subtask, dur], …]?], …]], …], gate milestone, gate value]
const PROJECTS = [
  { name: "Mobile Banking App 3.0", bu: "Retail Banking", portfolio: "Digital Channels", pm: CHARU, dh: JOEM, start: "2026-06-01", budget: 25e6, vendor: "Appcraft Solutions Inc.",
    phases: [
      ["Initiation", [["Project charter", [["Draft project charter", 5], ["Charter sign-off", 3]]], [null, [["Stakeholder analysis", 4]]]], "Charter approved", 0],
      ["Design", [["UX design", [["Customer journey mapping", 8], ["UI prototypes", 12, [["Wireframes", 6], ["High-fidelity screens", 6]]]]], ["Solution architecture", [["API and security design", 10]]]], "Design signed off", 3e6],
      ["Build", [["Mobile app release candidate", [["iOS and Android build", 30], ["Biometric login", 12], ["Card controls", 10]]], ["API layer", [["Channel API integration", 20]]]], "Build complete", 8e6],
      ["Test and launch", [["Tested app", [["SIT", 10], ["UAT", 10], ["Penetration test", 5]]], [null, [["App store submission", 5]]]], "Go-live", 6e6],
    ] },
  { name: "AML Transaction Monitoring Upgrade", bu: "Compliance", portfolio: "Regulatory and Compliance", pm: CHARU, dh: JOEM, start: "2026-09-01", budget: 12e6, vendor: "Veritas RegTech Corp.",
    phases: [
      ["Initiation", [["Project charter", [["Regulatory requirements review", 6], ["Draft project charter", 4]]]], "Charter approved", 0],
      ["Planning", [["Scenario catalogue", [["Current scenario assessment", 8], ["New typologies", 10]]], ["Project management plan", [["Schedule and budget", 5]]]], "Plan approved", 2e6],
      ["Implementation", [["Configured monitoring engine", [["Rules configuration", 20], ["Data feeds from core banking", 15]]], ["Tuned scenarios", [["Threshold tuning", 12]]]], "Parallel run complete", 5e6],
      ["Closing", [["Handover pack", [["Analyst training", 5], ["BSP compliance report", 4]]]], "Final acceptance", 3e6],
    ] },
  { name: "Data Warehouse Modernization", bu: "IT Shared Services", portfolio: "Data and Analytics", pm: JOEM, dh: CHARU, start: "2026-06-22", budget: 30e6, vendor: "Northstar Data Systems", late: true,
    phases: [
      ["Initiation", [["Project charter", [["Draft project charter", 5], ["Charter sign-off", 3]]]], "Charter approved", 0],
      ["Planning", [["Data architecture", [["Source system inventory", 10], ["Target data model", 15]]], ["Project management plan", [["Migration strategy", 8]]]], "Plan approved", 4e6],
      ["Execution", [["Data platform", [["Cloud platform setup", 15], ["ETL pipelines", 35, [["Core banking extracts", 15], ["Loans and deposits marts", 20]]]]], ["Reports", [["Regulatory reports rebuild", 25], ["Management dashboards", 20]]]], "Platform go-live", 12e6],
      ["Closing", [["Decommissioned legacy DW", [["Legacy decommission", 10], ["Knowledge transfer", 5]]]], "Final acceptance", 6e6],
    ] },
  { name: "Branch Queue Management System", bu: "Branch Banking", portfolio: "Digital Channels", pm: JOEM, dh: CHARU, start: "2026-06-08", budget: 8e6, vendor: "Qless Philippines Inc.",
    phases: [
      ["Initiation", [["Project charter", [["Draft project charter", 4]]]], "Charter approved", 0],
      ["Pilot", [["Pilot branches live", [["Kiosk installation - 5 branches", 10], ["Queue app configuration", 8]]]], "Pilot accepted", 2e6],
      ["Rollout", [["All branches live", [["Wave 1 - 40 branches", 20], ["Wave 2 - 60 branches", 25]]], [null, [["Branch staff training", 15]]]], "Rollout complete", 3.5e6],
      ["Closing", [["Handover pack", [["Support handover", 5], ["Lessons learned", 2]]]], "Final acceptance", 1.5e6],
    ] },
  { name: "Cybersecurity SOC Enhancement", bu: "IT Operations", portfolio: "Infrastructure and Security", pm: JOEM, dh: CHARU, start: "2026-10-12", budget: 15e6, vendor: "Sentinel Cyber Defense Inc.",
    phases: [
      ["Initiation", [["Project charter", [["Threat landscape assessment", 6], ["Draft project charter", 4]]]], "Charter approved", 0],
      ["Planning", [["SOC design", [["SIEM use cases", 10], ["Playbooks", 8]]]], "Design approved", 3e6],
      ["Implementation", [["SIEM and SOAR platform", [["SIEM deployment", 20], ["SOAR integration", 15]]], ["24x7 monitoring", [["Analyst onboarding", 10]]]], "SOC operational", 7e6],
      ["Closing", [["Handover pack", [["Run book and handover", 5]]]], "Final acceptance", 2e6],
    ] },
];

// flatten a project plan into WBS rows and schedule it (phases run one after another; deliverables inside a phase in
// parallel; tasks in a deliverable in sequence; a task with subtasks runs them in sequence)
function build(pr) {
  const rows = []; let n = 0; const add = (r) => { r.id = `${{ phase: "P", deliverable: "D", milestone: "X" }[r.type] || "N"}${++n}`; r.order = rows.length; rows.push(r); return r; };
  let gate = null; let owners = [pr.pm, pr.dh], oi = 0;
  const work = (name, dur, parent, type, pred) => { const s = pred ? nextWD(pred.finish) : toWork(pr.start); return add({ type, name, parent, dur, preds: pred ? [pred.id] : [], owner: owners[oi++ % 2], start: s, finish: addWD(s, dur - 1) }); };
  for (const [pname, dels, gname, gval] of pr.phases) {
    const ph = add({ type: "phase", name: pname, parent: null }); const ends = [];
    for (const [dname, tasks] of dels) {
      const holder = dname ? add({ type: "deliverable", name: dname, parent: ph.id }) : ph;
      let prev = gate;
      for (const [tname, dur, subs] of tasks) {
        if (subs) { const t = add({ type: "task", name: tname, parent: holder.id }); for (const [sn, sd] of subs) prev = work(sn, sd, t.id, "subtask", prev); }
        else prev = work(tname, dur, holder.id, "task", prev);
      }
      ends.push(prev);
    }
    const last = ends.sort((a, b) => a.finish.localeCompare(b.finish)).pop();
    gate = add({ type: "milestone", name: gname, parent: ph.id, dur: 1, preds: ends.map((e) => e.id), owner: pr.pm, start: last.finish, finish: last.finish, price: gval });
  }
  // progress as of today (a late project gets less done than planned)
  for (const r of rows.filter((x) => x.start)) {
    let pct = r.finish < TODAY ? 100 : r.start > TODAY ? 0 : Math.round((wdBetween(r.start, TODAY) - 1) / r.dur * 100);
    if (pr.late && pct > 0 && r.finish >= addDays(TODAY, -25)) pct = Math.min(pct, r.type === "milestone" ? 0 : Math.round(pct * 0.45 / 5) * 5);
    r.pct = Math.max(0, Math.min(100, pct));
  }
  // budgets: 90% of the approved budget spread over work items by duration
  const items = rows.filter((x) => x.start && x.type !== "milestone"); const tot = items.reduce((s, x) => s + x.dur, 0);
  for (const x of items) x.cost = Math.round(pr.budget * 0.9 * x.dur / tot / 10000) * 10000;
  // roll up summary rows
  const kids = (id) => rows.filter((x) => x.parent === id);
  const leaves = (id) => kids(id).flatMap((k) => (k.start ? [k] : leaves(k.id)));
  for (const s of rows.filter((x) => !x.start)) {
    const l = leaves(s.id); s.start = l.map((x) => x.start).sort()[0]; s.finish = l.map((x) => x.finish).sort().pop(); s.summary = true;
    const w = l.filter((x) => x.type !== "milestone"); const d = w.reduce((a, x) => a + x.dur, 0);
    s.pct = d ? Math.round(w.reduce((a, x) => a + x.dur * x.pct, 0) / d) : 0; s.cost = w.reduce((a, x) => a + (x.cost || 0), 0);
    if (s.type === "deliverable" && s.pct >= 100) s.accepted = addWD(s.finish, 2) < TODAY ? addWD(s.finish, 2) : null;
  }
  return rows;
}

async function list(id) { return (await call("GET", `${F(id)}/list?page_number=1&page_size=500&apply_preference=false&${q}`)).body?.Data || []; }
async function create(id, recs) {
  const out = [];
  for (let i = 0; i < recs.length; i += 25) {
    const r = await call("POST", `${F(id)}/batch?${q}`, recs.slice(i, i + 25).map((x) => ({ _is_created: true, ...x })));
    if (r.status >= 300) throw new Error(`${id} create ${r.status}: ${JSON.stringify(r.body).slice(0, 300)}`);
    out.push(...r.body); await sleep(300);
  }
  return out;
}
async function remove() {
  const names = new Set(PROJECTS.map((p) => p.name));
  const old = (await list("ITPMD_Project_A00")).filter((p) => names.has(p.project_name));
  if (!old.length) return;
  const byModel = {};
  for (const m of ["ITPMD_Activity_A00", "ITPMD_Risk_A00", "ITPMD_Cost_Entry_A00"]) byModel[m] = await list(m);
  for (const p of old) {
    for (const [m, recs] of Object.entries(byModel)) for (const x of recs.filter((x) => x.project?._id === p._id)) { await call("DELETE", `${F(m)}/${x._id}?${q}`); await sleep(100); }
    await call("DELETE", `${F("ITPMD_Project_A00")}/${p._id}?${q}`);
    console.log(`removed ${p.project_code} ${p.project_name}`);
  }
}

await remove();
if (!process.argv.includes("--remove")) {
  const label = { phase: "Phase", deliverable: "Deliverable", task: "Task", subtask: "Subtask", milestone: "Milestone" };
  for (const pr of PROJECTS) {
    const rows = build(pr); const end = rows.map((r) => r.finish).sort().pop();
    const work = rows.filter((r) => !r.summary && r.type !== "milestone"); const d = work.reduce((a, x) => a + x.dur, 0);
    const done = d ? work.reduce((a, x) => a + x.dur * x.pct, 0) / d / 100 : 0;
    const [proj] = await create("ITPMD_Project_A00", [{
      project_name: pr.name, business_unit: pr.bu, portfolio: pr.portfolio, status: pr.start > TODAY ? "Planning" : "Active",
      RoEGt7NaqKtv: pr.pm, RoEGt7OXkCaE: pr.dh, RoEGt7Ov2pUP: pr.dh, ps_approval_required: false,
      approved_budget: php(pr.budget), contingency_fund: php(pr.budget * 0.06), contract_value: php(pr.budget * 0.6), contract_total: php(pr.budget * 0.6),
      project_start_date: pr.start, project_planned_end_date: end, vendor: pr.vendor,
      noa_issued: addDays(pr.start, -30), po_no: `PO-2026-${String(400 + PROJECTS.indexOf(pr) * 17).padStart(4, "0")}`, po_issued: addDays(pr.start, -20), ntp_issued: pr.start, contract_expiry: addDays(end, 90),
      approved_changes_total: php(0), contingency_drawn: php(pr.late ? pr.budget * 0.03 : 0),
    }]);
    const ref = { _id: proj._id };
    await create("ITPMD_Activity_A00", rows.map((r) => {
      const leaf = !r.summary; const ms = r.type === "milestone";
      return {
        activity_name: r.name, project: ref, wbs_code: r.id, item_type: label[r.type], parent_code: r.parent || "", sort_order: r.order,
        is_milestone: ms, is_summary: !leaf, percent_complete: r.pct || 0, planned_cost: php(ms ? 0 : r.cost || 0),
        planned_start: r.start, planned_finish: r.finish, baseline_start: r.start, baseline_finish: r.finish, forecast_start: r.start, forecast_finish: r.finish,
        predecessor_codes: leaf ? (r.preds || []).join(",") : "", ...(leaf ? { responsible_person: r.owner } : {}),
        ...(leaf && r.pct > 0 ? { actual_start: r.start } : {}), ...(leaf && r.pct >= 100 ? { actual_finish: r.finish } : {}),
        deliverable_accepted: !!r.accepted, ...(r.accepted ? { accepted_date: r.accepted } : {}),
      };
    }));
    await create("ITPMD_Risk_A00", [
      { risk_title: `${pr.vendor} delivery capacity`, project: ref, risk_category: "Vendor", probability: pr.late ? 4 : 2, impact: 4, risk_owner: pr.pm, mitigation_actions: "Weekly delivery review with the vendor; escalation path agreed.", response_strategy: "Mitigate", residual_probability: pr.late ? 3 : 1, residual_impact: 3, status: "Open" },
      { risk_title: "Business SMEs unavailable for testing", project: ref, risk_category: "Resource", probability: 2, impact: 3, risk_owner: pr.dh, mitigation_actions: "Reserve SME time with unit heads before each test window.", response_strategy: "Mitigate", residual_probability: 1, residual_impact: 3, status: "Open" },
    ]);
    await create("ITPMD_Cost_Entry_A00", [{ cost_entry_title: "Cost position", project: ref, entry_date: TODAY,
      actual_amount: php(pr.budget * 0.9 * done * (pr.late ? 1.15 : 1)), committed_amount: php(pr.budget * 0.6), forecast_amount: php(pr.budget * (pr.late ? 1.04 : 0.95)), cost_description: JSON.stringify({ invoices: [] }) }]);
    const pm = pr.pm === CHARU ? "Charu" : "Joemarie", dh = pr.dh === CHARU ? "Charu" : "Joemarie";
    console.log(`${proj.project_code || proj._id} ${pr.name}: PM ${pm}, DH/Sponsor ${dh}; ${rows.length} WBS rows; ${pr.start} → ${end}; ${Math.round(done * 100)}% done${pr.late ? " (running late)" : ""}`);
  }
}
