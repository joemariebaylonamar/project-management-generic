// Give every hub role Editable (Member + Delete) access to the three discussion forms, sequentially.
// Apply fires grants in parallel and some 423 (member-write lock) — this re-sends them one by one.
import { call, c, A, sleep } from "./kf.mjs";
import { withGrantPatience } from "../../../engine/agentic.mjs";
const FORMS = ["ITPMD_Discussion_Message_A00", "ITPMD_Notification_A00", "ITPMD_Discussion_Read_A00"];
const HUB = ["Project Manager", "Team Member", "Department Head", "Project Sponsor", "PSC Member", "Hub Administrator"];
const roles = ((await call("GET", `/app_role/2/${c.acc}/list?_application_id=${A}`)).body || []).filter((r) => HUB.includes(r.Name));
if (roles.length !== HUB.length) throw new Error(`expected ${HUB.length} hub roles, found ${roles.map((r) => r.Name).join(", ")}`);
let bad = 0;
for (const f of FORMS) for (const r of roles) {
  const m = { _id: r._id, Name: r.Name, _application_id: A, Role: "Member", Permission: ["Delete"], Kind: "AppRole" };
  const res = await withGrantPatience(() => c.call("POST", `/flow/2/${c.acc}/form/${f}/member/batch?_application_id=${A}`, [m]));
  console.log(`${f} ← ${r.Name}: ${res.status}`);
  if (res.status >= 300) bad++;
  await sleep(400);
}
if (bad) { console.error(`${bad} grant(s) failed`); process.exit(1); }
