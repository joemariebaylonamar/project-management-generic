import { call, c, q, sleep } from "./kf.mjs";
const CI = `/case/2/${c.acc}/ITPMD_Issue_A00`; const id = "ITP-0001"; const to = "Status_87cghd";
for (const [m, p, b] of [
  ["POST", `${CI}/${id}/move?${q}`, { _status_id: to }],
  ["PUT", `${CI}/${id}/status?${q}`, { _status_id: to }],
  ["POST", `${CI}/${id}/status/${to}?${q}`, {}],
  ["POST", `${CI}/${id}?${q}`, { _status_id: to }],
  ["PUT", `${CI}/${id}?${q}`, { _status_id: to }],
]) { const x = await call(m, p, b, 1); const g = await call("GET", `${CI}/${id}?${q}`); console.log(m, p.split(id)[1].split("?")[0] || "/", x.status, "→", g.body._status_name, JSON.stringify(x.body).slice(0, 120)); if (g.body._status_name === "In Progress") break; await sleep(400); }
