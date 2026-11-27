import { call, c, q, sleep } from "./kf.mjs";
const CI = `/case/2/${c.acc}/ITPMD_Issue_A00`; const id = "ITP-0001";
const g = await call("GET", `${CI}/${id}?${q}`); const b = g.body;
console.log(g.status, JSON.stringify({ _status: b._status, _current_status: b._current_status, _stage: b._stage, keys: Object.keys(b).filter(k => k.startsWith("_")) }));
const st = await call("GET", `/flow/2/${c.acc}/case/ITPMD_Issue_A00/status?_application_id=ITPMD_Project_Hub_A00`); console.log("statuses", st.status, JSON.stringify(st.body).slice(0, 400));
