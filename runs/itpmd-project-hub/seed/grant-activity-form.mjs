// Re-send every hub role's Editable access to the Activity form, one by one (apply's parallel grants can 423).
import { call, c, A, sleep } from "./kf.mjs";
import { withGrantPatience } from "../../../engine/agentic.mjs";
const FORM = "ITPMD_Activity_A00";
const HUB = ["Project Manager", "Team Member", "Department Head", "Project Sponsor", "PSC Member", "Hub Administrator"];
const roles = ((await call("GET", `/app_role/2/${c.acc}/list?_application_id=${A}`)).body || []).filter((r) => HUB.includes(r.Name));
if (roles.length !== HUB.length) throw new Error(`expected ${HUB.length} hub roles, found ${roles.map((r) => r.Name).join(", ")}`);
let bad = 0;
for (const r of roles) {
  const m = { _id: r._id, Name: r.Name, _application_id: A, Role: "Member", Permission: ["Delete"], Kind: "AppRole" };
  const res = await withGrantPatience(() => c.call("POST", `/flow/2/${c.acc}/form/${FORM}/member/batch?_application_id=${A}`, [m]));
  console.log(`${FORM} ← ${r.Name}: ${res.status}`);
  if (res.status >= 300) bad++;
  await sleep(400);
}
if (bad) { console.error(`${bad} grant(s) failed`); process.exit(1); }
