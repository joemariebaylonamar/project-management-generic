import { call, c, q } from "./kf.mjs";
const r = await call("GET", `/flow/2/${c.acc}/application/ITPMD_Project_Hub_A00/page?${q}`);
const arr = Array.isArray(r.body) ? r.body : r.body?.Data || [];
console.log("status", r.status, "pages", arr.length);
for (const p of arr) console.log(String(p._id).padEnd(38), (p.Name || "").padEnd(34), p.Status || p._status || p.LifeCycleStatus || "", p.FlowType || p.Type || "");
const f = await call("GET", `/flow/2/${c.acc}/application/ITPMD_Project_Hub_A00/flow?page_number=1&page_size=500&parent_flows=true&${q}`);
const fl = Array.isArray(f.body) ? f.body : f.body?.Data || [];
console.log("--- all flow-type entities:", fl.length); for (const x of fl) if (/page|dashboard|board/i.test((x.FlowType||x.Type||"")+x.Name)) console.log(String(x._id).padEnd(38), x.Name, x.FlowType || x.Type);
