import { readFileSync } from "node:fs";
import { call, c, q, sleep } from "./kf.mjs";
const ids = JSON.parse(readFileSync(new URL("./seeded-ids.json", import.meta.url))).projects;
const P = `/process/2/${c.acc}/ITPMD_Project_Status_Report_A00`;
const cr = await call("POST", `${P}?${q}`, { reporting_period_month: "2026-08-01" }, 1);
const id = cr.body?._id, aiid = cr.body?._activity_instance_id; console.log("create (no project)", cr.status, id);
await sleep(600);
const show = async (label) => { const d = await call("GET", `${P}/${id}/${aiid}?${q}`); console.log(label.padEnd(30), d.status, d.body?.project?.project_name ?? "(none)"); };
await show("after create, no project");
for (const [m, p, b] of [
  ["POST", `${P}/${id}/${aiid}?${q}`, { project: { _id: ids.P3 } }],
  ["PUT", `${P}/${id}/${aiid}?${q}`, { project: { _id: ids.P3 } }],
  ["POST", `${P}/${id}/${aiid}?${q}`, { project: ids.P3, reporting_period_month: "2026-08-01" }],
]) { const x = await call(m, p, b, 1); console.log(m, "update →", x.status, JSON.stringify(x.body).slice(0, 110)); await sleep(500); await show("  after"); }
const del = await call("DELETE", `${P}/${id}?${q}`, undefined, 1); console.log("cleanup", del.status);
