// Set budgets (planned_cost) on the WBS demo project's work items and the rolled-up totals on its summary rows.
// Usage (from app root, after `source .kf-env`): node runs/itpmd-project-hub/seed/seed-wbs-budget.mjs
import { call, c, q, sleep } from "./kf.mjs";

const NAME = "Digital Onboarding Platform (WBS demo)";
const BUDGET = {
  N3: 350e3, N4: 150e3, N5: 200e3,                                   // Initiation 0.7M
  N9: 400e3, N10: 300e3, N12: 900e3, N14: 650e3, N15: 350e3,         // Planning 2.6M
  N19: 800e3, N20: 4.2e6, N21: 3.6e6, N32: 600e3, N33: 500e3, N23: 1.6e6, N24: 1.4e6, // Execution 12.7M
  N28: 700e3, N29: 400e3, N30: 100e3,                                // Closing 1.2M
};
const F = `/form/2/${c.acc}/ITPMD_Activity_A00`;
const all = (await call("GET", `${F}/list?page_number=1&page_size=500&apply_preference=false&${q}`)).body?.Data || [];
const rows = all.filter((x) => x.project?.project_name === NAME);
if (!rows.length) throw new Error(`no activities for ${NAME} — run seed-wbs-demo.mjs first`);
const kids = (code) => rows.filter((x) => x.parent_code === code);
const total = (x) => (x.is_summary ? kids(x.wbs_code).reduce((n, k) => n + total(k), 0) : x.is_milestone ? 0 : BUDGET[x.wbs_code] || 0);
let n = 0;
for (const x of rows) {
  const amt = total(x);
  const r = await call("POST", `${F}/${x._id}?${q}`, { planned_cost: `${Math.round(amt)} PHP` });
  if (r.status >= 300) throw new Error(`${x.wbs_code} ${r.status}: ${JSON.stringify(r.body).slice(0, 200)}`);
  n++; await sleep(150);
}
const leaves = rows.filter((x) => !x.is_summary && !x.is_milestone).reduce((s, x) => s + (BUDGET[x.wbs_code] || 0), 0);
console.log(`${NAME}: budgets set on ${n} rows; WBS total ₱${leaves.toLocaleString("en-PH")}`);
