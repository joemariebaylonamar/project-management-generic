import { readFileSync } from "node:fs";
import { call, c, q, sleep } from "./kf.mjs";
const ids = JSON.parse(readFileSync(new URL("./seeded-ids.json", import.meta.url))).projects;
const P = `/process/2/${c.acc}/ITPMD_Project_Status_Report_A00`;
const cr = await call("POST", `${P}?${q}`, { reporting_period_month: "2026-08-01" }, 1);
const id = cr.body._id, aiid = cr.body._activity_instance_id; await sleep(600);
const tries = [
  ["narrative only", { narrative_update: "hello" }],
  ["project only", { project: { _id: ids.P3 } }],
  ["project + narrative", { project: { _id: ids.P3 }, narrative_update: "hello2" }],
  ["project w/ _is_created", { _is_created: true, project: { _id: ids.P3 } }],
];
for (const [k, b] of tries) {
  const x = await call("POST", `${P}/${id}/${aiid}?${q}`, b, 1); await sleep(500);
  const d = (await call("GET", `${P}/${id}/${aiid}?${q}`)).body;
  console.log(k.padEnd(24), x.status, (x.body?.error_code || ""), "| project now:", d.project?.project_name, "| narrative:", d.narrative_update);
}
await call("DELETE", `${P}/${id}?${q}`, undefined, 1);
