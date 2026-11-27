import { test } from "node:test";
import assert from "node:assert/strict";
const mod = await import("../src/project-agents.js").catch(() => ({}));
const p = { id: "P1", code: "BPI-001", name: "Payments", dh: "DH1", ps: "PS1", psRequired: false };
const r = { id: "R1", status: "Submitted", period: { y: 2026, m: 11 }, narrative: { acc: "Test completed" }, history: [{ action: "Returned", comment: "Explain recovery" }], snap: { health: { overall: "R", reasons: ["Late milestone"] }, behind: [{ id: "A1" }], issues: [{ id: "I1" }], risks: [], sched: {}, fin: {} } };
test("Theo is limited to the named approver at the current review step", () => {
  assert.equal(typeof mod.canBriefApproval, "function");
  assert.equal(mod.canBriefApproval(p, r, { userId: "DH1", role: "DH", advanced: true }), true);
  for (const actor of [{ userId: "OTHER", role: "DH", advanced: true }, { userId: "DH1", role: "PM", advanced: true }, { userId: "DH1", role: "DH", advanced: false }, { userId: "PS1", role: "PS", advanced: true }]) assert.equal(mod.canBriefApproval(p, r, actor), false);
  assert.equal(mod.canBriefApproval(p, { ...r, status: "For PS Approval" }, { userId: "PS1", role: "PS", advanced: true }), true);
  for (const status of ["Draft", "Returned", "Approved"]) assert.equal(mod.canBriefApproval(p, { ...r, status }, { userId: "DH1", role: "DH", advanced: true }), false);
});
test("Theo context copies saved report separately and never offers a draft or decision", () => {
  assert.equal(typeof mod.approvalContext, "function");
  const before = JSON.stringify(r);
  const ctx = mod.approvalContext(p, r, { userId: "DH1", role: "DH", advanced: true }, { today: "2026-11-27", current: { findings: [{ id: "A2" }] } });
  assert.equal(ctx.agent, "theo"); assert.equal(ctx.may_propose_psr, false);
  assert.equal(ctx.report.snapshot.health.overall, "R"); assert.equal(ctx.routing.sponsorRequired, true);
  assert.equal(ctx.current_review.findings[0].id, "A2"); assert.equal(ctx.report.history[0].comment, "Explain recovery");
  ctx.report.snapshot.health.overall = "G"; assert.equal(JSON.stringify(r), before);
  assert.throws(() => mod.approvalContext(p, r, { userId: "OTHER", role: "DH", advanced: true }), /access|assigned/i);
});
test("built-in Theo briefing reports snapshot evidence, routing and human decision without writes", () => {
  assert.equal(typeof mod.approvalBrief, "function");
  const before = JSON.stringify(r);
  const result = mod.approvalBrief(mod.approvalContext(p, r, { userId: "DH1", role: "DH", advanced: true }));
  assert.match(result, /Red|red/); assert.match(result, /Sponsor/); assert.match(result, /Explain recovery/); assert.match(result, /Approve|Return/); assert.equal(JSON.stringify(r), before);
});
test("agent connections are independent and retain a validated connection after a bad replacement", async () => {
  assert.equal(typeof mod.createAgentConnections, "function");
  const memory = new Map(); const storage = { getItem: k => memory.get(k), setItem: (k,v) => memory.set(k,v) };
  const contract = { Readiness: { Ready: true }, Definition: { Inputs: ["request", "context"].map(Key => ({ Key, DataType: "Text" })), Outputs: ["answer", "accomplishments", "next_period", "issues"].map(Key => ({ Key, DataType: "string" })).concat({ Key: "propose_psr", DataType: "boolean" }) } };
  const sdk = { app: { getAgent: id => ({ getContract: async () => { if (id === "AgBad") throw Error("invalid"); return contract; } }) } };
  const c = mod.createAgentConnections(sdk, { account: "A", app: "B", ids: { ava: "AgAva" }, storage });
  assert.equal(c.ava.getId(), "AgAva"); assert.equal(c.ari.getId(), ""); assert.equal(c.theo.getId(), "");
  await c.ari.configure("AgAri"); assert.equal(c.ava.getId(), "AgAva");
  await assert.rejects(c.ari.configure("AgBad")); assert.equal(c.ari.getId(), "AgAri");
  assert.equal(mod.createAgentConnections(sdk, { account: "A", app: "OTHER", storage }).ari.getId(), "");
});
