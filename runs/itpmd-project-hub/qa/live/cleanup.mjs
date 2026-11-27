import { rq, F, CS, PR, q, readTracked, errMsg } from "./lib.mjs";
import fs from "node:fs";
const list = readTracked().reverse(); const out = [];
for (const t of list) {
  let r;
  if (t.kind === "form") r = await rq("DELETE", `${F(t.flow)}/${t.id}?${q}`);
  else if (t.kind === "case") r = await rq("DELETE", `${CS(t.flow)}/${t.id}?${q}`);
  else if (t.kind === "process") {
    r = await rq("DELETE", `${PR(t.flow)}/${t.id}?${q}`);
    if (r.status >= 300) { const w = await rq("POST", `${PR(t.flow)}/${t.id}/${t.aiid || ""}/withdraw?${q}`, { Comment: "QA cleanup" }); out.push({ ...t, withdraw: w.status, wmsg: w.status >= 300 ? errMsg(w) : "" }); }
  }
  out.push({ ...t, del: r.status, msg: r.status >= 300 ? errMsg(r) : "" });
}
console.log(JSON.stringify(out.map((o) => `${o.kind}:${o.flow}:${o.id} del=${o.del}${o.withdraw ? " withdraw=" + o.withdraw : ""}${o.msg ? " " + o.msg.slice(0, 80) : ""}`), null, 0));
fs.writeFileSync(new URL("./cleanup-result.json", import.meta.url).pathname, JSON.stringify(out, null, 1));
