// Set task actual costs (actual_cost) on the WBS demo projects: budget × % done × a spend factor
// (Data Warehouse runs ~15% over; the others vary a little around budget). Summary rows get the rolled-up totals.
// Usage (from app root, after `source .kf-env`): node runs/itpmd-project-hub/seed/seed-wbs-actuals.mjs
import { call, c, q, sleep } from "./kf.mjs";

const PROJECTS = { "Digital Onboarding Platform (WBS demo)": 1.02, "Mobile Banking App 3.0": 0.98, "AML Transaction Monitoring Upgrade": 1.0,
  "Data Warehouse Modernization": 1.15, "Branch Queue Management System": 0.96, "Cybersecurity SOC Enhancement": 1.0 };
const F = `/form/2/${c.acc}/ITPMD_Activity_A00`;
const num = (v) => parseFloat(String(v ?? 0)) || 0;
const all = (await call("GET", `${F}/list?page_number=1&page_size=1000&apply_preference=false&${q}`)).body?.Data || [];
for (const [name, factor] of Object.entries(PROJECTS)) {
  const rows = all.filter((x) => x.project?.project_name === name);
  if (!rows.length) { console.log(`skip ${name} (not found)`); continue; }
  const jitter = (code) => 1 + ((code.charCodeAt(code.length - 1) % 7) - 3) / 100; // ±3% per task, repeatable
  const own = (x) => (x.is_summary || x.is_milestone ? 0 : Math.round(num(x.planned_cost) * num(x.percent_complete) / 100 * factor * jitter(x.wbs_code) / 1000) * 1000);
  const kids = (code) => rows.filter((x) => x.parent_code === code);
  const total = (x) => (x.is_summary ? kids(x.wbs_code).reduce((n, k) => n + total(k), 0) : own(x));
  let sum = 0;
  for (const x of rows) {
    const amt = total(x); if (!x.is_summary) sum += amt;
    const r = await call("POST", `${F}/${x._id}?${q}`, { actual_cost: `${amt} PHP` });
    if (r.status >= 300) throw new Error(`${name} ${x.wbs_code} ${r.status}: ${JSON.stringify(r.body).slice(0, 200)}`);
    await sleep(120);
  }
  console.log(`${name}: task actuals ₱${sum.toLocaleString("en-PH")} on ${rows.length} rows`);
}
