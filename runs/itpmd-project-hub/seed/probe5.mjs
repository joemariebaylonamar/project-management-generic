import { call, c, q, ME, sleep } from "./kf.mjs";
const F = `/form/2/${c.acc}/ITPMD_Project_A00`;
const r = await call("POST", `${F}/batch?${q}`, [{ _is_created: true, project_name: "PROBE Project", business_unit: "Lending", portfolio: "Core Banking", RoEGt7NaqKtv: ME, RoEGt7OXkCaE: ME, status: "Active", approved_budget: "50000000 PHP", contingency_fund: "2600000 PHP" }], 1);
const id = r.body?.[0]?._id; console.log("create", r.status, id, r.body?.[0]?.approved_budget);
const T = "ITPMD_Project_A00__contracts"; const row = { vendor_name: "Northwind", noa_date: "2026-01-26", contract_price: "48500000 PHP" };
for (const [m, p, b] of [
  ["POST", `${F}/${id}/${T}/batch?${q}`, [row]],
  ["POST", `${F}/${id}/${T}?${q}`, row],
  ["PUT", `${F}/${id}?${q}`, { [T]: [row] }],
  ["POST", `${F}/${id}?${q}`, { [T]: [row] }],
]) { const x = await call(m, p, b, 1); console.log(m, p.split(id)[1].split("?")[0], x.status, JSON.stringify(x.body).slice(0, 200)); await sleep(400); }
const g = await call("GET", `${F}/${id}?${q}`); console.log(Object.keys(g.body).filter(k => /__/.test(k)), JSON.stringify(g.body[T] || "").slice(0, 200));
console.log("PROBE_ID", id);
