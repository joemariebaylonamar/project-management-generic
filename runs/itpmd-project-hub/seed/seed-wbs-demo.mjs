// Seed one demo project that shows the full WBS hierarchy (Phase → Deliverable → Task → Subtask, ◆ gates).
// PM Joemarie; Department Head and Sponsor Charu; work split between both. Re-running replaces the demo project.
// Usage (from app root, after `source .kf-env`): node runs/itpmd-project-hub/seed/seed-wbs-demo.mjs [--remove]
import { call, c, q, sleep } from "./kf.mjs";

const NAME = "Digital Onboarding Platform (WBS demo)";
const JOEM = { _id: "UsEGq2SRCohs" }, CHARU = { _id: "UsEGq89RLnD9" };
const F = (id) => `/form/2/${c.acc}/${id}`;
const php = (n) => `${Math.round(n)} PHP`;
const TODAY = "2026-09-30";

// working days (weekends skipped; the Hub re-schedules against the holiday calendar on load)
const iso = (d) => d.toISOString().slice(0, 10);
const isWork = (s) => { const w = new Date(s + "T00:00:00Z").getUTCDay(); return w !== 0 && w !== 6; };
const addDays = (s, n) => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const toWork = (s) => { while (!isWork(s)) s = addDays(s, 1); return s; };
const nextWD = (s) => toWork(addDays(s, 1));
const addWD = (s, n) => { s = toWork(s); for (let i = 0; i < n; i++) s = nextWD(s); return s; };

// the plan: [type, id, name, parent, { dur, preds, owner, pct, price, accepted }]
const START = "2026-08-17";
const PLAN = [
  ["phase", "P1", "Initiation", null],
  ["deliverable", "D2", "Project charter", "P1", { accepted: "2026-08-26" }],
  ["task", "N3", "Draft project charter", "D2", { dur: 5, owner: JOEM, pct: 100 }],
  ["task", "N4", "Sponsor review of charter", "D2", { dur: 3, preds: ["N3"], owner: CHARU, pct: 100 }],
  ["task", "N5", "Stakeholder register", "P1", { dur: 3, preds: ["N4"], owner: JOEM, pct: 100 }],
  ["milestone", "X6", "Charter approved", "P1", { preds: ["N5"], pct: 100 }],
  ["phase", "P7", "Planning", null],
  ["deliverable", "D8", "Project management plan", "P7", { accepted: "2026-09-17" }],
  ["task", "N9", "WBS and schedule", "D8", { dur: 6, preds: ["X6"], owner: JOEM, pct: 100 }],
  ["task", "N10", "Budget and procurement plan", "D8", { dur: 4, preds: ["N9"], owner: JOEM, pct: 100 }],
  ["deliverable", "D11", "Requirements specification", "P7"],
  ["task", "N12", "Business requirements workshops", "D11", { dur: 10, preds: ["X6"], owner: CHARU, pct: 100 }],
  ["task", "N13", "Functional specification", "D11"],
  ["subtask", "N14", "Draft functional specification", "N13", { dur: 8, preds: ["N12"], owner: CHARU, pct: 100 }],
  ["subtask", "N15", "Review and sign-off", "N13", { dur: 6, preds: ["N14"], owner: CHARU, pct: 60 }],
  ["milestone", "X16", "Plan and requirements approved", "P7", { preds: ["N10", "N15"], price: 2.4e6 }],
  ["phase", "P17", "Execution", null],
  ["deliverable", "D18", "Configured onboarding platform", "P17"],
  ["task", "N19", "Environment setup", "D18", { dur: 5, preds: ["X16"], owner: JOEM }],
  ["task", "N20", "Configure onboarding journeys", "D18", { dur: 15, preds: ["N19"], owner: JOEM }],
  ["task", "N21", "Integrate with core banking and eKYC", "D18", { dur: 12, preds: ["N19"], owner: CHARU }],
  ["deliverable", "D22", "Tested system", "P17"],
  ["task", "N23", "System integration testing", "D22", { dur: 10, preds: ["N20", "N21"], owner: CHARU }],
  ["task", "N24", "User acceptance testing", "D22", { dur: 10, preds: ["N23"], owner: CHARU }],
  ["milestone", "X25", "Go-live", "P17", { preds: ["N24"], price: 6.0e6 }],
  ["phase", "P26", "Closing", null],
  ["deliverable", "D27", "Handover pack", "P26"],
  ["task", "N28", "End-user training", "D27", { dur: 5, preds: ["X25"], owner: CHARU }],
  ["task", "N29", "Operations documentation", "D27", { dur: 5, preds: ["X25"], owner: JOEM }],
  ["task", "N30", "Lessons learned", "P26", { dur: 2, preds: ["N28", "N29"], owner: JOEM }],
  ["milestone", "X31", "Final acceptance", "P26", { preds: ["N30"], price: 1.6e6 }],
];

// schedule the work items (start after latest predecessor finish), then roll dates up into parents
const rows = PLAN.map(([type, id, name, parent, o = {}], order) => ({ type, id, name, parent, order, ...o, preds: o.preds || [] }));
const by = Object.fromEntries(rows.map((r) => [r.id, r]));
const kids = (id) => rows.filter((r) => r.parent === id);
const isLeaf = (r) => r.type !== "phase" && !kids(r.id).length;
const leafUnder = (id) => kids(id).flatMap((k) => (isLeaf(k) ? [k] : leafUnder(k.id)));
const done = new Set();
while (done.size < rows.filter(isLeaf).length) {
  for (const r of rows.filter(isLeaf)) {
    if (done.has(r.id) || !r.preds.every((p) => done.has(p))) continue;
    const pf = r.preds.map((p) => by[p].finish).sort().pop();
    const ms = r.type === "milestone";
    r.start = pf ? (ms ? pf : nextWD(pf)) : toWork(START);
    r.finish = ms ? r.start : addWD(r.start, r.dur - 1);
    done.add(r.id);
  }
}
for (const r of rows.filter((x) => !isLeaf(x))) {
  const l = leafUnder(r.id); r.start = l.map((x) => x.start).sort()[0]; r.finish = l.map((x) => x.finish).sort().pop();
  const w = l.filter((x) => x.type !== "milestone"); const tot = w.reduce((s, x) => s + x.dur, 0);
  r.pct = tot ? Math.round(w.reduce((s, x) => s + x.dur * (x.pct || 0), 0) / tot) : 0;
}
const label = { phase: "Phase", deliverable: "Deliverable", task: "Task", subtask: "Subtask", milestone: "Milestone" };

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
  const old = (await list("ITPMD_Project_A00")).filter((p) => p.project_name === NAME);
  for (const p of old) {
    for (const m of ["ITPMD_Activity_A00", "ITPMD_Risk_A00", "ITPMD_Cost_Entry_A00"])
      for (const x of (await list(m)).filter((x) => x.project?._id === p._id)) { await call("DELETE", `${F(m)}/${x._id}?${q}`); await sleep(120); }
    await call("DELETE", `${F("ITPMD_Project_A00")}/${p._id}?${q}`);
    console.log(`removed previous demo project ${p.project_code || p._id}`);
  }
}

await remove();
if (!process.argv.includes("--remove")) {
  const end = rows.map((r) => r.finish).sort().pop();
  const [proj] = await create("ITPMD_Project_A00", [{
    project_name: NAME, business_unit: "Retail Banking", portfolio: "Digital Channels", status: "Active",
    RoEGt7NaqKtv: JOEM, RoEGt7OXkCaE: CHARU, RoEGt7Ov2pUP: CHARU, ps_approval_required: false,
    approved_budget: php(18e6), contingency_fund: php(1.2e6), contract_value: php(10e6), contract_total: php(10e6),
    project_start_date: START, project_planned_end_date: end, vendor: "Brightpath Digital Inc.",
    noa_issued: "2026-07-27", po_no: "PO-2026-0311", po_issued: "2026-08-05", ntp_issued: "2026-08-17", contract_expiry: "2027-03-31",
    approved_changes_total: php(0), contingency_drawn: php(0),
  }]);
  const ref = { _id: proj._id };
  const acts = await create("ITPMD_Activity_A00", rows.map((r) => {
    const leaf = isLeaf(r); const ms = r.type === "milestone";
    const started = leaf && (r.pct || 0) > 0; const finished = leaf && r.pct >= 100;
    return {
      activity_name: r.name, project: ref, wbs_code: r.id, item_type: label[r.type], parent_code: r.parent || "", sort_order: r.order,
      is_milestone: ms, is_summary: !leaf, percent_complete: r.pct || 0,
      planned_start: r.start, planned_finish: r.finish, baseline_start: r.start, baseline_finish: r.finish,
      forecast_start: r.start, forecast_finish: r.finish, predecessor_codes: leaf ? r.preds.join(",") : "",
      ...(leaf ? { responsible_person: r.owner || JOEM } : {}),
      ...(started ? { actual_start: r.start } : {}), ...(finished ? { actual_finish: r.finish } : {}),
      ...(r.accepted ? { deliverable_accepted: true, accepted_date: r.accepted } : { deliverable_accepted: false }),
    };
  }));
  await create("ITPMD_Risk_A00", [
    { risk_title: "eKYC provider API changes before go-live", project: ref, risk_category: "Vendor", probability: 3, impact: 4, risk_owner: CHARU, mitigation_actions: "Lock API version in contract; weekly sync with provider.", response_strategy: "Mitigate", residual_probability: 2, residual_impact: 3, status: "Open" },
    { risk_title: "Key business SMEs unavailable during UAT", project: ref, risk_category: "Resource", probability: 2, impact: 3, risk_owner: JOEM, mitigation_actions: "Book UAT windows with branch heads now.", response_strategy: "Mitigate", residual_probability: 1, residual_impact: 3, status: "Open" },
  ]);
  await create("ITPMD_Cost_Entry_A00", [{ cost_entry_title: "Cost position", project: ref, entry_date: TODAY,
    actual_amount: php(3.1e6), committed_amount: php(10e6), forecast_amount: php(17.4e6), cost_description: JSON.stringify({ invoices: [] }) }]);
  console.log(`created ${NAME}: ${acts.length} WBS rows (${rows.filter((r) => r.type === "phase").length} phases, ${rows.filter((r) => r.type === "deliverable").length} deliverables, ${rows.filter(isLeaf).length} work items), 2 risks, 1 cost entry; ${rows[0].start} → ${end}`);
}
