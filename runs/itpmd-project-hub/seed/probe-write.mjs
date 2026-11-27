import { call, c, q, ME } from "./kf.mjs";
const body = [{ _is_created: true, project_name: "PROBE Project", business_unit: "Lending", portfolio: "Core Banking", RoEGt7NaqKtv: ME, RoEGt7OXkCaE: ME, RoEGt7Ov2pUP: ME, status: "Active",
  approved_budget: "50000000 PHP", contingency_fund: "2600000 PHP", contract_value: "48500000 PHP", project_start_date: "2026-03-02",
  ITPMD_Project_A00__contracts: [{ vendor_name: "Northwind", noa_date: "2026-01-26", po_number: "PO-1", contract_price: "48500000 PHP" }],
  ITPMD_Project_A00__budget_changes: [{ change_type: "Contingency Draw", contingency_draw_amount: "900000 PHP", effective_date: "2026-07-10", reason: "probe" }] }];
const r = await call("POST", `/form/2/${c.acc}/ITPMD_Project_A00/batch?${q}`, body);
console.log("create", r.status, JSON.stringify(r.body).slice(0, 400));
const id = Array.isArray(r.body) ? r.body[0]?._id : r.body?._id;
if (id) { const g = await call("GET", `/form/2/${c.acc}/ITPMD_Project_A00/${id}?${q}`); console.log(JSON.stringify(g.body).slice(0, 1500)); }
