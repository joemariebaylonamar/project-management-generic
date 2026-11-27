import { call, c, q, sleep } from "./kf.mjs";
const CI = `/case/2/${c.acc}/ITPMD_Issue_A00`; const id = "ITP-0001";
const g = await call("GET", `${CI}/${id}?${q}`); console.log(JSON.stringify({ s: g.body._status_name, sid: g.body._status_id, draft: g.body._is_draft, life: g.body._lifecycle_status }));
const d = await c.getDraft("case", "ITPMD_Issue_A00"); const sts = Object.entries(d.body || {}).filter(([k, v]) => v && /Status/.test(v.Kind || "")).map(([k, v]) => `${k}:${v.Name}`); console.log(sts.join(" | "));
