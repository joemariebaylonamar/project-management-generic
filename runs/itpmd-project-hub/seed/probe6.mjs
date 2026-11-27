import { call, c, q, ME, sleep } from "./kf.mjs";
const P = "PkEGwWhcV_rk";
const a = await call("POST", `/form/2/${c.acc}/ITPMD_Activity_A00/batch?${q}`, [{ _is_created: true, activity_name: "PROBE act", project: { _id: P }, wbs_code: "Z1", planned_start: "2026-10-01", planned_finish: "2026-10-05", percent_complete: 10, responsible_person: ME, predecessor_codes: "Z0" }], 1);
console.log("activity", a.status, JSON.stringify(a.body?.[0]?.project ?? a.body).slice(0, 200));
const aid = a.body?.[0]?._id;
if (aid) { const g = await call("GET", `/form/2/${c.acc}/ITPMD_Activity_A00/${aid}?${q}`); console.log("  readback project:", JSON.stringify(g.body.project)); }
const CI = `/case/2/${c.acc}/ITPMD_Issue_A00`;
for (const [m, p, b] of [
  ["POST", `${CI}/batch?${q}`, [{ _is_created: true, issue_title: "PROBE issue", project: { _id: P }, issue_category: "Vendor", priority: "High", issue_owner: ME, target_resolution_date: "2026-10-09" }]],
  ["POST", `${CI}?${q}`, { issue_title: "PROBE issue 2", project: { _id: P }, issue_category: "Vendor", priority: "High", issue_owner: ME }],
]) { const x = await call(m, p, b, 1); console.log("issue", p.split("ITPMD_Issue_A00")[1].split("?")[0] || "/", x.status, JSON.stringify(x.body).slice(0, 300)); await sleep(400); }
