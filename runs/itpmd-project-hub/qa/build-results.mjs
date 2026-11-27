// Writes qa/results.json for a run where NO live execution was possible (no credentials in session).
import { readFileSync, writeFileSync } from "node:fs";
const plan = JSON.parse(readFileSync("runs/current/qa/test-plan.json", "utf8"));
const U = JSON.parse(readFileSync("runs/current/qa/universe.json", "utf8")).items;
const spec = JSON.parse(readFileSync("runs/current/app-spec.json", "utf8"));
const grant = new Set(spec.permissions.map((p) => p.role + "::" + p.model));
const nameToId = Object.fromEntries(spec.forms.map((f) => [f.name, f.id]));
const items = U.map((u) => {
  const tests = plan.tests.filter((t) => t.covers.includes(u.id)).map((t) => t.id);
  let status = "blocked", evidence = "none", note = "Not executed: no Kissflow dev credentials were available to this session.";
  if (u.kind === "denial") {
    const [, role, ...rest] = u.id.split(":"); const fid = nameToId[rest.join(":")];
    if (grant.has(role + "::" + fid)) { status = "invalid-obligation"; note = "Universe defect: this role IS granted access to this form in the permission matrix; the D: id is a false denial (engine keys grants by form id, denials by form name)."; }
  }
  return { id: u.id, tests, pass: 0, fail: 0, status, evidence, note };
});
const ucs = plan.usecases.map((u) => ({ id: u.id, outcome: "blocked", summary: "Could not be tested at runtime: the test session had no access to the live development app, so nothing was executed. The plan to prove this journey is written and ready to run once access is supplied." }));
writeFileSync("runs/current/qa/results.json", JSON.stringify({
  verdict: "BLOCKED - 0 of 614 obligations executed (no credentials). Coverage of the PLAN is 100%; coverage of EXECUTION is 0%.",
  executed: 0, planned: U.length, usecases: ucs, items,
  staticFindings: [
    "[QA-FAIL] engine/qa-universe.mjs deriveUniverse D: — 114 of 210 denial ids are false (role HAS a grant on that form): 'granted' is keyed role::model-id but denials iterate forms by NAME. Fix: key on f.id (or f.name->id map).",
    "[QA-FAIL] engine/qa-universe.mjs deriveUniverse P: — reads p.access but the spec carries p.level; all 114 P: ids say ':edit' including the 23 ReadOnly grants. Fix: use p.access || (p.level==='ReadOnly'?'view':'edit').",
    "[QA-NOTE] engine/qa-universe.mjs D: — 77 of the 96 true denials are child tables that have no independent grant (they follow the parent flow); denial should be asserted on the parent, not on the child model.",
  ],
}, null, 1));
