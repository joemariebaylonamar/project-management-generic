// Add a user to every ITPMD Project Hub app role (keeps existing members).
// Usage: node add-user-to-roles.mjs <name-or-email fragment>
import { call, c, A, sleep } from "./kf.mjs";
import { withGrantPatience } from "../../../engine/agentic.mjs";
const people = await call("GET", `/user/2/${c.acc}?page_size=50`);
const who = process.argv[2];
if (!who) throw new Error("usage: add-user-to-roles.mjs <name-or-email>");
const hits = (Array.isArray(people.body) ? people.body : []).filter((p) => (p.Email + " " + p.Name).toLowerCase().includes(who.toLowerCase()));
if (hits.length !== 1) throw new Error(`expected 1 user matching "${who}", found ${hits.length}: ${hits.map((h) => h.Email).join(", ")}`);
const charu = hits[0];
console.log("User:", charu._id, charu.Email, charu.Name);
const roles = (await call("GET", `/app_role/2/${c.acc}/list?_application_id=${A}`)).body || [];
for (const r of roles) {
  const cur = (await call("GET", `/app_role/2/${c.acc}/${r._id}?_application_id=${A}`)).body?.Members || [];
  if (cur.some((m) => m._id === charu._id)) { console.log(`${r.Name}: already member`); continue; }
  const users = [...cur.filter((m) => !m.Kind || m.Kind === "User").map((m) => ({ _id: m._id })), { _id: charu._id }];
  const put = await withGrantPatience(() => c.call("PUT", `/app_role/2/${c.acc}/${r._id}?_application_id=${A}`, { Users: users }));
  const after = (await call("GET", `/app_role/2/${c.acc}/${r._id}?_application_id=${A}`)).body?.Members || [];
  console.log(`${r.Name}: PUT ${put.status}; members now ${after.map((m) => m.Name || m._id).join(", ")}`);
  await sleep(800);
}
