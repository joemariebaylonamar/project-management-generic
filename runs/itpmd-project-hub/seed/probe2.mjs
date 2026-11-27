import { call, c, q, ME, sleep } from "./kf.mjs";
const base = { project_name: "PROBE Project", business_unit: "Lending", portfolio: "Core Banking", RoEGt7NaqKtv: ME, RoEGt7OXkCaE: ME, status: "Active", approved_budget: "500000 USD", contingency_fund: "50000 USD" };
const variants = {
  base,
  php: { ...base, approved_budget: "50000000 PHP", contingency_fund: "2600000 PHP" },
  contracts: { ...base, itpmd_project__contracts: [{ vendor_name: "Northwind", noa_date: "2026-01-26" }] },
  bc: { ...base, itpmd_project__budget_changes: [{ change_type: "Contingency Draw", effective_date: "2026-07-10", reason: "probe" }] },
};
for (const [k, b] of Object.entries(variants)) {
  const r = await call("POST", `/form/2/${c.acc}/ITPMD_Project_A00/batch?${q}`, [b], 1);
  const id = Array.isArray(r.body) ? r.body[0]?._id : null;
  console.log(k, r.status, id || JSON.stringify(r.body).slice(0, 160));
  if (id) { const g = await call("GET", `/form/2/${c.acc}/ITPMD_Project_A00/${id}?${q}`); const o = g.body; console.log("   ", o.approved_budget, JSON.stringify(o.itpmd_project__contracts || o.itpmd_project__budget_changes || "").slice(0, 200)); await call("DELETE", `/form/2/${c.acc}/ITPMD_Project_A00/${id}?${q}`); }
  await sleep(500);
}
