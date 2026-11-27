import { test } from "node:test";
import assert from "node:assert/strict";
const ava = await import("../src/ava.js").catch(() => ({}));
const today = "2026-11-23";
const base = () => ({ id: "P1", code: "BPI-001", name: "Payments", activities: [], issues: [], risks: [], psrs: [] });
const health = { overall: "A", reasons: ["Schedule behind baseline"], sc: { complete: 40, expected: 60, variance: 5 }, f: {} };

test("AVA review identifies missing owners, overdue issues and mitigation with source records", () => {
  assert.equal(typeof ava.reviewProject, "function");
  const p = base();
  p.activities = [{ id: "A1", name: "UAT", pct: 20, fFinish: "2026-11-20" }];
  p.issues = [{ id: "I1", title: "Access", status: "Open", target: "2026-11-19", actions: [] }];
  p.risks = [{ id: "R1", title: "Vendor", status: "Open", p: 4, i: 4, mit: "To be defined" }];
  const before = JSON.stringify(p);
  const r = ava.reviewProject(p, { today, health, validUserIds: ["U1"] });
  assert.ok(r.findings.some(x => x.id === "A1" && x.kind === "owner" && x.tab === "schedule"));
  assert.ok(r.findings.some(x => x.id === "I1" && x.kind === "overdue" && x.tab === "issues"));
  assert.ok(r.findings.some(x => x.id === "R1" && x.kind === "mitigation" && x.tab === "risks"));
  assert.equal(JSON.stringify(p), before);
  assert.equal(r.projectCode, "BPI-001");
});

test("AVA treats missing timestamps as unknown and flags only known stale progress", () => {
  assert.equal(typeof ava.reviewProject, "function");
  const p = base();
  p.activities = [
    { id: "A1", name: "Old", pct: 20, owner: "U1", updatedAt: "2026-11-01", fFinish: "2026-12-01" },
    { id: "A2", name: "Unknown", pct: 20, owner: "U1", fFinish: "2026-12-01" },
    { id: "A3", name: "Done", pct: 100, updatedAt: "2026-10-01" }
  ];
  const r = ava.reviewProject(p, { today, health });
  assert.ok(r.findings.some(x => x.id === "A1" && x.kind === "stale"));
  assert.ok(!r.findings.some(x => x.id === "A2" && x.kind === "stale"));
  assert.equal(r.unverifiedUpdates, 1);
  assert.ok(!r.findings.some(x => x.id === "A3"));
});

test("AVA empty schedule requests data instead of presenting a healthy project", () => {
  assert.equal(typeof ava.reviewProject, "function");
  const r = ava.reviewProject(base(), { today, health });
  assert.ok(r.findings.some(x => x.kind === "empty"));
  assert.equal(r.ready, false);
});

test("AVA ignores closed risks and resolved issues in follow-up checks", () => {
  assert.equal(typeof ava.reviewProject, "function");
  const p = base();
  p.issues = [{ id: "I1", status: "Resolved", target: "2026-01-01" }];
  p.risks = [{ id: "R1", status: "Closed", p: 5, i: 5 }];
  assert.ok(!ava.reviewProject(p, { today, health }).findings.some(x => ["I1", "R1"].includes(x.id)));
});

test("AVA PSR draft includes only this period's completed work through today", () => {
  assert.equal(typeof ava.draftNarrative, "function");
  const p = base();
  p.activities = [
    { id: "A1", name: "October completion", pct: 100, aFinish: "2026-10-31" },
    { id: "A2", name: "November completion", pct: 100, aFinish: "2026-11-02" },
    { id: "A3", name: "Future completion", pct: 100, aFinish: "2026-11-30" },
    { id: "A4", name: "December work", pct: 0, fStart: "2026-12-01", fFinish: "2026-12-15" }
  ];
  const r = ava.draftNarrative(p, { today, period: { y: 2026, m: 11 }, health });
  assert.match(r.acc, /November completion/);
  assert.doesNotMatch(r.acc, /October completion|Future completion/);
  assert.match(r.next, /December work/);
  assert.match(r.acc, /40.*60/);
  assert.ok(!JSON.stringify(p).includes("narrative"));
});

test("AVA draft handles December rollover and missing data without NaN or invented work", () => {
  assert.equal(typeof ava.draftNarrative, "function");
  const p = base();
  p.activities = [{ id: "A1", name: "January launch", pct: 0, fStart: "2027-01-05", fFinish: "2027-01-10" }];
  const r = ava.draftNarrative(p, { today: "2026-12-20", period: { y: 2026, m: 12 } });
  assert.match(r.next, /January launch/);
  assert.doesNotMatch(JSON.stringify(r), /NaN|undefined/);
});
