import { call, c, q, sleep } from "./kf.mjs";
const CI = `/case/2/${c.acc}/ITPMD_Issue_A00`; const id = "ITP-0001"; const to = "Status_87cghd";
const g = await call("GET", `${CI}/${id}?${q}`);
for (const b of [{ _status_id: to, _doc_version: g.body._doc_version }, { Status: to, _doc_version: g.body._doc_version }, { _status_id: to, _doc_version: g.body._doc_version, Comment: "" }]) {
  await sleep(1500); const x = await call("POST", `${CI}/${id}/move?${q}`, b, 1); const r = await call("GET", `${CI}/${id}?${q}`);
  console.log(x.status, "→", r.body._status_name, JSON.stringify(x.body).slice(0, 220)); if (r.body._status_name === "In Progress") break;
}
