import { readFileSync } from "node:fs";
import { call, c, q, sleep } from "./kf.mjs";
const ids = JSON.parse(readFileSync(new URL("./seeded-ids.json", import.meta.url))).projects;
const P = `/process/2/${c.acc}/ITPMD_Project_Status_Report_A00`;
const P3 = ids.P3;
const shapes = { plainId: P3, idName: { _id: P3, Name: "ITPMD Project from Joemarie" }, idOnly: { _id: P3 }, idNameProject: { _id: P3, project_name: "Data Center UPS Replacement" } };
for (const [k, v] of Object.entries(shapes)) {
  const cr = await call("POST", `${P}?${q}`, { project: v, reporting_period_month: "2026-08-01" }, 1);
  const id = cr.body?._id, aiid = cr.body?._activity_instance_id; await sleep(600);
  const d = id ? await call("GET", `${P}/${id}/${aiid}?${q}`) : null;
  console.log(k.padEnd(14), cr.status, "→", d?.body?.project?.project_name ?? JSON.stringify(cr.body).slice(0, 100));
  if (id) { const x = await call("DELETE", `${P}/${id}?${q}`, undefined, 1); process.stdout.write(`   (cleanup delete ${x.status})\n`); }
  await sleep(500);
}
