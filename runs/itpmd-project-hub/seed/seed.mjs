// Seed the dev app with the approved prototype's sample data (runs/current/seed/proto-state.json,
// captured by running the prototype's own seed()/postSeed()). Idempotent-ish: pass --clean to
// remove existing ACCEPT-TEST / PROBE / previously seeded records first.
import { readFileSync, writeFileSync } from "node:fs";
import { call, c, q, ME, sleep } from "./kf.mjs";

const S = JSON.parse(readFileSync(new URL("./proto-state.json", import.meta.url), "utf8"));
const acc = c.acc;
const php = (n) => `${Math.round(n)} PHP`;
const F = (id) => `/form/2/${acc}/${id}`;
const CS = (id) => `/case/2/${acc}/${id}`;
const log = (...a) => console.log(...a);
const out = { projects: {}, activities: {}, issues: {}, risks: {}, actions: {}, psrs: {} };

async function listAll(kind, id) {
  const r = await call("GET", `/${kind}/2/${acc}/${id}/list?page_size=500&${q}`);
  return r.body?.Data || [];
}
async function formCreate(id, rows) {
  const res = [];
  for (let i = 0; i < rows.length; i += 25) {
    const r = await call("POST", `${F(id)}/batch?${q}`, rows.slice(i, i + 25).map((x) => ({ _is_created: true, ...x })));
    if (r.status >= 300) throw new Error(`${id} create ${r.status}: ${JSON.stringify(r.body).slice(0, 300)}`);
    res.push(...r.body);
    await sleep(300);
  }
  return res;
}
async function caseCreate(id, row) {
  const r = await call("POST", `${CS(id)}?${q}`, row);
  if (r.status >= 300) throw new Error(`${id} create ${r.status}: ${JSON.stringify(r.body).slice(0, 300)}`);
  await sleep(250);
  return r.body._id;
}

async function clean() {
  for (const id of ["ITPMD_Activity_A00", "ITPMD_Risk_A00", "ITPMD_Cost_Entry_A00", "ITPMD_Holiday_Calendar_A00", "ITPMD_Hub_Settings_A00", "ITPMD_Project_A00"]) {
    const rows = await listAll("form", id);
    for (const r of rows) { const d = await call("DELETE", `${F(id)}/${r._id}?${q}`); log(`  delete ${id}/${r._id} → ${d.status}`); await sleep(150); }
  }
  for (const id of ["ITPMD_Action_Item_A00", "ITPMD_Issue_A00"]) {
    const rows = await listAll("case", id);
    for (const r of rows) { const d = await call("DELETE", `${CS(id)}/${r._id}?${q}`); log(`  delete ${id}/${r._id} → ${d.status}`); await sleep(150); }
  }
  // PSR process items (drafts / in-progress test items)
  const psr = `/process/2/${acc}/ITPMD_Project_Status_Report_A00`;
  for (const suffix of ["", "/Draft", "/InProgress"]) {
    const r = await call("GET", `${psr}/myitems${suffix}?page_number=1&page_size=100&apply_preference=false&${q}`);
    for (const it of r.body?.Data || []) { const d = await call("DELETE", `${psr}/${it._id}?${q}`); log(`  delete PSR ${it._id} → ${d.status}`); await sleep(150); }
  }
}

async function seed() {
  // holidays + hub settings
  await formCreate("ITPMD_Holiday_Calendar_A00", S.holidays.map((h) => ({ holiday_name: h.name, holiday_date: h.date, coverage: h.coverage })));
  await formCreate("ITPMD_Hub_Settings_A00", [{ setting_name: "Default", psr_due_working_day: 5, psr_reminder_days_before: 3, psr_reminder_final_day_before: 1, issue_aging_period_days: S.config.escalateDays }]);
  log(`holidays ${S.holidays.length}, settings 1`);

  for (const p of S.projects) {
    const f = p.fin;
    const [proj] = await formCreate("ITPMD_Project_A00", [{
      project_name: p.name, business_unit: p.bu, portfolio: p.portfolio, RoEGt7NaqKtv: ME, RoEGt7OXkCaE: ME, RoEGt7Ov2pUP: ME,
      ps_approval_required: !!p.psRequired, status: "Active", approved_budget: php(f.budget), contingency_fund: php(f.contingency),
      contract_value: php(p.contract), project_start_date: p.start, project_planned_end_date: p.activities.map((a) => a.bFinish).sort().pop(),
      vendor: p.vendor, noa_issued: p.noa, po_no: p.poNo, po_issued: p.po, ntp_issued: p.ntp, contract_expiry: p.expiry,
      approved_changes_total: php(f.changes.reduce((s, x) => s + x.amt, 0)), contingency_drawn: php(f.draws.reduce((s, x) => s + x.amt, 0)),
    }]);
    const pid = proj._id; const ref = { _id: pid };
    out.projects[p.id] = pid;
    const acts = await formCreate("ITPMD_Activity_A00", p.activities.map((a) => ({
      activity_name: a.name, project: ref, wbs_code: a.id, is_milestone: !!a.ms, responsible_person: ME,
      planned_start: a.pStart, planned_finish: a.pFinish, baseline_start: a.bStart, baseline_finish: a.bFinish,
      forecast_start: a.fStart, forecast_finish: a.fFinish, ...(a.aStart ? { actual_start: a.aStart } : {}), ...(a.aFinish ? { actual_finish: a.aFinish } : {}),
      percent_complete: a.pct, predecessor_codes: a.preds.join(","),
    })));
    acts.forEach((x, i) => (out.activities[`${p.id}:${p.activities[i].id}`] = x._id));
    const risks = await formCreate("ITPMD_Risk_A00", p.risks.map((r) => ({
      risk_title: r.title, project: ref, risk_category: r.cat, probability: r.p, impact: r.i, risk_owner: ME, mitigation_actions: r.mit,
      response_strategy: r.resp, residual_probability: r.rp, residual_impact: r.ri, status: r.status,
    })));
    risks.forEach((x, i) => (out.risks[p.risks[i].id] = x._id));
    await formCreate("ITPMD_Cost_Entry_A00", [{ cost_entry_title: "Cost position as of 28 Sep 2026", project: ref, entry_date: "2026-09-28",
      actual_amount: php(f.actual), committed_amount: php(f.committed), forecast_amount: php(f.eac) }]);
    for (const iss of p.issues) {
      const iid = await caseCreate("ITPMD_Issue_A00", { issue_title: iss.title, project: ref, issue_category: iss.cat, priority: iss.pri, issue_owner: ME, target_resolution_date: iss.target, description: "" });
      out.issues[iss.id] = iid;
      for (const ac of iss.actions) {
        out.actions[ac.id] = await caseCreate("ITPMD_Action_Item_A00", { action_description: ac.text, project: ref, related_issue: { _id: iid }, assignee: ME, due_date: ac.due });
      }
    }
    log(`project ${p.name}: ${acts.length} activities, ${risks.length} risks, ${p.issues.length} issues`);
  }
  writeFileSync(new URL("./seeded-ids.json", import.meta.url), JSON.stringify(out, null, 1));
}

if (process.argv.includes("--clean")) { log("cleaning…"); await clean(); }
if (!process.argv.includes("--clean-only")) { log("seeding…"); await seed(); log("done"); }
