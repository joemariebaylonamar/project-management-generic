// List ITPMD Project Hub app roles with their members, and add/remove one user per role.
// Usage (from app root, after `source .kf-env`):
//   node runs/itpmd-project-hub/seed/roles.mjs                      list roles + members + account users
//   node runs/itpmd-project-hub/seed/roles.mjs add <role> <user>     add user to role (keeps existing members)
//   node runs/itpmd-project-hub/seed/roles.mjs remove <role> <user>  remove user from role
// <role> and <user> are case-insensitive name/email fragments that must match exactly one.
import { call, c, A } from "./kf.mjs";
import { withGrantPatience } from "../../../engine/agentic.mjs";

const [cmd = "list", roleArg, userArg] = process.argv.slice(2);
const roles = (await call("GET", `/app_role/2/${c.acc}/list?_application_id=${A}`)).body || [];
const members = async (r) => ((await call("GET", `/app_role/2/${c.acc}/${r._id}?_application_id=${A}`)).body?.Members || []).filter((m) => !m.Kind || m.Kind === "User");
const pick = (list, frag, label, text) => {
  const hits = list.filter((x) => text(x).toLowerCase().includes(String(frag || "").toLowerCase()));
  const exact = hits.filter((x) => text(x).toLowerCase().split(" ").includes(String(frag).toLowerCase()));
  const h = hits.length === 1 ? hits : exact;
  if (!frag || h.length !== 1) throw new Error(`expected 1 ${label} matching "${frag}", found ${hits.length}: ${hits.map(text).join(" | ")}`);
  return h[0];
};

if (cmd === "list") {
  for (const r of roles) {
    const m = await members(r);
    console.log(`${r.Name.padEnd(32)} ${m.length ? m.map((x) => x.Name || x.Email || x._id).join(", ") : "(no members)"}`);
  }
  const people = (await call("GET", `/user/2/${c.acc}?page_size=200`)).body;
  console.log("\nAccount users:");
  for (const u of Array.isArray(people) ? people : people?.Data || []) console.log(`  ${u.Name} <${u.Email}>`);
} else if (cmd === "add" || cmd === "remove") {
  const role = pick(roles, roleArg, "role", (r) => r.Name);
  const people = (await call("GET", `/user/2/${c.acc}?page_size=200`)).body;
  const user = pick(Array.isArray(people) ? people : people?.Data || [], userArg, "user", (u) => `${u.Name} ${u.Email}`);
  const cur = await members(role);
  const has = cur.some((m) => m._id === user._id);
  if (cmd === "add" && has) { console.log(`${user.Name} already in ${role.Name}`); process.exit(0); }
  if (cmd === "remove" && !has) { console.log(`${user.Name} not in ${role.Name}`); process.exit(0); }
  // PUT sets Users wholesale — always send the full member list.
  const ids = cmd === "add" ? [...cur.map((m) => m._id), user._id] : cur.map((m) => m._id).filter((id) => id !== user._id);
  const put = await withGrantPatience(() => c.call("PUT", `/app_role/2/${c.acc}/${role._id}?_application_id=${A}`, { Users: ids.map((_id) => ({ _id })) }));
  const after = await members(role);
  console.log(`${role.Name}: PUT ${put.status}; members now ${after.map((m) => m.Name || m._id).join(", ") || "(none)"}`);
} else throw new Error(`unknown command "${cmd}" (list | add | remove)`);
