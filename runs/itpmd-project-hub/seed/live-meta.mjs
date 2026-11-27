import { call, c, q } from "./kf.mjs";
const P = "ITPMD_Project_Status_Report_A00";
for (const stage of ["live", "published", "publish", "latest"]) {
  const r = await call("GET", `/metadata/2/${c.acc}/process/${P}/${stage}`, undefined, 1);
  const b = r.body || {};
  if (r.status !== 200 || !b.project) { console.log(stage, r.status, (b.error_code || "")); continue; }
  const col = b.project.Column; const acts = Object.values(b).filter((v) => v && v.Kind === "Activity");
  console.log(stage, "OK — project perms per step:", acts.map((a) => `${a.Name}=${(a["Activity::Permission"] || []).map((id) => b[id]).filter((p) => p && p.Column === col).map((p) => p.Permission)}`).join(" | "));
}
