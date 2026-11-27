import { readFileSync } from "node:fs";
import { call, c, q } from "./kf.mjs";
const ids = JSON.parse(readFileSync(new URL("./seeded-ids.json", import.meta.url))).projects;
for (const [k, id] of Object.entries(ids)) { const r = await call("GET", `/form/2/${c.acc}/ITPMD_Project_A00/${id}?${q}`); console.log(k, id, r.body.project_name); }
const P = `/process/2/${c.acc}/ITPMD_Project_Status_Report_A00`;
const l = await call("GET", `${P}/myitems/InProgress?page_number=1&page_size=10&apply_preference=false&${q}`);
for (const it of l.body?.Data || []) { const d = await call("GET", `${P}/${it._id}/${it._activity_instance_id}?${q}`); console.log("PSR", it._id, "→", d.body?.project?.project_name, "|", (d.body?.narrative_update || "").slice(0, 45)); }
