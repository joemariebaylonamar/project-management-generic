// Phase B: READ-ONLY live metadata: member ACL per flow, child-table schema (allfields), integrations, PSR/case metadata.
import { rq, c, q, A, acc } from "./lib.mjs";
import fs from "node:fs";
const spec = JSON.parse(fs.readFileSync("runs/current/app-spec.json", "utf8"));
const idmap = JSON.parse(fs.readFileSync("runs/current/id-map.json", "utf8")).genToServer;
const out = { acl: {}, allfields: {}, integrations: [], roles: null };
for (const f of spec.forms.filter((x) => !x.childOf)) {
  const fam = f.flowType === "Process" ? "process" : f.flowType === "Case" ? "case" : "form";
  const sid = idmap[f.id];
  const r = await rq("GET", `/flow/2/${acc}/${fam}/${sid}/member?${q}`);
  out.acl[f.id] = { status: r.status, fam, sid, members: Array.isArray(r.body) ? r.body.map((m) => ({ name: m.Name, id: m._id, kind: m.Kind, role: m.Role, perm: m.Permission })) : r.body };
  const af = await rq("GET", `/${fam}/2/${acc}/${sid}/allfields?${q}`);
  out.allfields[f.id] = { status: af.status, body: af.status < 300 ? af.body : null };
  console.log(f.id, r.status, af.status, Array.isArray(r.body) ? r.body.map((m) => m.Name + ":" + m.Role + "[" + (m.Permission || []).join("") + "]").join(", ") : "");
}
const rl = await rq("GET", `/app_role/2/${acc}/list?_application_id=${A}`);
out.roles = { status: rl.status, body: rl.body };
console.log("roles", rl.status, JSON.stringify(rl.body).slice(0, 600));
const ex = await rq("GET", `/flow/2/${acc}/integration?_application_id=${A}`);
out.integrations = Array.isArray(ex.body) ? ex.body.map((i) => ({ id: i._id, name: i.Name, active: i.IsActive, status: i.Status })) : ex.body;
fs.writeFileSync("runs/current/qa/live/phaseB.json", JSON.stringify(out, null, 1));
console.log("done");
