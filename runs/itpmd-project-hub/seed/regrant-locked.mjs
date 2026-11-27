// Re-send, one at a time, the role→flow grants that an apply run answered with 423 (member-write lock).
// Usage (from app root, after `source .kf-env`): node runs/itpmd-project-hub/seed/regrant-locked.mjs <apply-log>
// Reads "access <Role> → <model> (<family>) 423" lines from the apply log and repeats apply's own grant.
import { readFileSync } from "node:fs";
import { c, A, sleep } from "./kf.mjs";
import { flowGrant } from "../../../engine/client.mjs";
import { withGrantPatience } from "../../../engine/agentic.mjs";
const log = readFileSync(process.argv[2], "utf8");
const spec = JSON.parse(readFileSync(new URL("../app-spec.json", import.meta.url), "utf8"));
const ids = JSON.parse(readFileSync(new URL("../id-map.json", import.meta.url), "utf8")).genToServer;
const roles = (await c.call("GET", `/app_role/2/${c.acc}/list?_application_id=${A}`)).body || [];
const pairs = [...log.matchAll(/access (.+?) → (\S+) \(\w+\) 423/g)].map((m) => ({ role: m[1], model: m[2] }));
let bad = 0;
for (const { role, model } of pairs) {
  const perm = spec.permissions.find((p) => p.role === role && p.model === model);
  const form = spec.forms.find((f) => f.id === model);
  const r = roles.find((x) => x.Name === role);
  if (!perm || !form || !r || !ids[model]) { console.log(`skip ${role} → ${model} (not in spec/id-map)`); bad++; continue; }
  const g = flowGrant(form.flowType || "Form", { editable: (perm.level || "Editable") !== "ReadOnly", admin: /admin|owner|sole mover|coordinat/i.test(perm.intent || "") });
  const member = { _id: r._id, Name: role, _application_id: A, Role: g.role, Permission: g.permission, Kind: "AppRole" };
  const res = await withGrantPatience(() => c.call("POST", `/flow/2/${c.acc}/${g.family}/${ids[model]}/member/batch?_application_id=${A}`, [member]));
  console.log(`${role} → ${model}: ${res.status}`);
  if (res.status >= 300) bad++;
  await sleep(400);
}
if (bad) { console.error(`${bad} grant(s) failed`); process.exit(1); }
