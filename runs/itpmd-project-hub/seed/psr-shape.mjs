import { call, c, q } from "./kf.mjs";
const P = `/process/2/${c.acc}/ITPMD_Project_Status_Report_A00`;
const l = await call("GET", `${P}/myitems/InProgress?page_number=1&page_size=10&apply_preference=false&${q}`);
const it = l.body?.Data?.[0]; console.log("list item keys:", Object.keys(it || {}).join(", "));
console.log("columns:", (l.body?.Columns || []).map((x) => x.Id).slice(0, 40).join(", "));
const d = await call("GET", `${P}/${it._id}/${it._activity_instance_id}?${q}`); const b = d.body || {};
console.log("detail", d.status, JSON.stringify({ project: b.project, overall: b.overall_health, sponsor: b.sponsor_approval_required, pmField: b.RoEGt7NaqKtv?.Name, period: b.reporting_period_month, narr: (b.narrative_update || "").slice(0, 50) }));
