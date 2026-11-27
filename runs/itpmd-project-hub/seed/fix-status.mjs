import { readFileSync } from "node:fs";
import { call, c, q, sleep } from "./kf.mjs";
const S = JSON.parse(readFileSync(new URL("./proto-state.json", import.meta.url)));
const ids = JSON.parse(readFileSync(new URL("./seeded-ids.json", import.meta.url)));
const ST = { issue: { Resolved: "Status_150cqqx", "In progress": "Status_87cghd" }, action: { Done: "Status_16b2yr2" } };
const todo = [];
for (const p of S.projects) for (const i of p.issues) {
  if (i.status !== "Open") todo.push(["issue", "ITPMD_Issue_A00", ids.issues[i.id], ST.issue[i.status], i.title]);
  for (const a of i.actions) if (a.status === "Done") todo.push(["action", "ITPMD_Action_Item_A00", ids.actions[a.id], ST.action.Done, a.text]);
}
console.log("to move:", todo.length);
for (const [kind, model, id, to, label] of todo) {
  const base = `/case/2/${c.acc}/${model}/${id}`;
  let ok = false;
  for (let attempt = 0; attempt < 4 && !ok; attempt++) {
    const g = (await call("GET", `${base}?${q}`)).body;
    const x = await call("POST", `${base}/move?${q}`, { _status_id: to, _doc_version: g._doc_version }, 1);
    await sleep(1200);
    const after = (await call("GET", `${base}?${q}`)).body;
    ok = after._status_id === to;
    console.log(kind.padEnd(6), label.slice(0, 44).padEnd(46), "attempt", attempt + 1, "→", x.status, x.body?.error_code || "", "| now:", after._status_name);
    if (!ok) await sleep(2500);
  }
}
