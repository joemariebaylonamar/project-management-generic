import { call, c, q } from "./kf.mjs";
const P = `/process/2/${c.acc}/ITPMD_Project_Status_Report_A00`;
for (const [id, aiid] of [["PkEH0wK8iAMc","PkEH0wKCNnt8"],["PkEGtlASsP7u","PkEGtlAZXkHG"]]) {
  const r = await call("GET", `${P}/${id}/${aiid}?${q}`, undefined, 1);
  const b = r.body || {};
  console.log(id, r.status, JSON.stringify({ created_by: b._created_by?.Name, created_at: b._created_at, period: b.reporting_period_month, project: b.project?.project_name || b.project?._id, narrative: (b.narrative_update || "").slice(0, 80), name: b.Name }));
}
const d = await call("DELETE", `${P}/PkEGtlASsP7u?${q}`, undefined, 1); console.log("delete in-progress →", d.status, JSON.stringify(d.body).slice(0, 260));
