import { readFileSync } from "node:fs";
import { call, c, q, sleep } from "./kf.mjs";
const ids = JSON.parse(readFileSync(new URL("./seeded-ids.json", import.meta.url))).projects;
const P = `/process/2/${c.acc}/ITPMD_Project_Status_Report_A00`;
const cr = await call("POST", `${P}?${q}`, { reporting_period_month: "2026-08-01" }, 1);
const id = cr.body._id, aiid = cr.body._activity_instance_id; await sleep(600);
const x = await call("POST", `${P}/${id}/${aiid}?${q}`, { project: { _id: ids.P3 } }, 1);
console.log(JSON.stringify(x.body, null, 1));
await call("DELETE", `${P}/${id}?${q}`, undefined, 1);
