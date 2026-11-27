import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as rules from "../src/project-agents.js";
let source = ""; try { source = readFileSync(new URL("../scripts/agents-ui.js", import.meta.url), "utf8"); } catch {}
function fn(name, stubs) {
  const code = source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}\\n`))?.[0];
  assert.ok(code, `${name} exists`);
  return new Function(...Object.keys(stubs), `${code}; return ${name};`)(...Object.values(stubs));
}
const p = { id: "P1", code: "PRJ-2026-014", name: "Payments", dh: "U1", ps: "U2", psrs: [] };
const r = { id: "R1", status: "Submitted", snap: { health: { overall: "R", reasons: [] } }, history: [], narrative: {}, period: { y: 2026, m: 11 } }; p.psrs.push(r);
test("Theo card stays hidden for unauthorized roles and preserves human approval", () => {
  const render = fn("theoCard", { theoAllowed: () => false });
  assert.equal(render(p, r), "");
});
test("Theo result is invalidated by report or source changes", () => {
  const fresh = fn("theoFresh", { theoAllowed: () => true, theoStamp: () => "new", T: { theo: { projectId: "P1", reportId: "R1", stamp: "old" } } });
  assert.equal(fresh(p, r), false);
});
function harness(run) {
  const state = { busy: false }; let permission = true; let stamp = "original";
  const api = { getId: () => "AgTheo", run };
  const stubs = { T: state, myProjects: () => [p], theoAllowed: () => permission, theoStamp: () => stamp, theoActor: () => ({ userId: "U1", role: "DH", advanced: true }),
    window: { __ITPH_AGENTS: { theo: api }, __ITPH_AGENT_RULES: rules }, TODAY: "2026-11-27", avaReview: () => ({ findings: [], unverifiedUpdates: 0 }), AbortController, theoRefresh: () => {}, renderTala: () => {}, toast: () => {}, ui: { me: "U1" } };
  return { start: fn("theoStart", stubs), state, revoke: () => { permission = false; }, change: () => { stamp = "changed"; } };
}
test("Theo executes once without applying drafts or approval mutations", async () => {
  let calls = 0; const before = JSON.stringify(p);
  const h = harness(async ({ context }) => { calls++; const c = JSON.parse(context); assert.equal(c.may_propose_psr, false); return { executionId: "Ex1", items: [{ answer: "Review the saved evidence", propose_psr: true }] }; });
  await h.start(p.id, r.id); assert.equal(calls, 1); assert.equal(h.state.theo.text, "Review the saved evidence"); assert.equal(JSON.stringify(p), before);
});
test("Theo discards a late answer when access or source evidence changes", async () => {
  for (const change of ["revoke", "change"]) {
    let release; const h = harness(() => new Promise(resolve => { release = resolve; }));
    const pending = h.start(p.id, r.id); h[change](); release({ items: [{ answer: "OLD SECRET" }] }); await pending;
    assert.notEqual(h.state.theo?.text, "OLD SECRET"); assert.equal(h.state.busy, false);
  }
});
test("Theo unknown execute outcome blocks duplicate requests", async () => {
  let calls = 0; const h = harness(async () => { calls++; throw Object.assign(Error("Unknown"), { code: "AGENT_EXECUTE_OUTCOME_UNKNOWN" }); });
  await h.start(p.id, r.id); await h.start(p.id, r.id); assert.equal(calls, 1); assert.equal(h.state.unknownOutcome, true);
});
