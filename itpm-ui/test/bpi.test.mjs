import { test } from "node:test";
import assert from "node:assert/strict";
import { snapshotRows, applyBaseline, nextVersion, taskPvEv, programRollup, parseSnapshot } from "../src/bpi.js";

const act = (id, o = {}) => ({ id, name: id, dur: 5, pct: 0, ms: false, cost: 0, bStart: "2026-10-01", bFinish: "2026-10-07", fStart: "2026-10-02", fFinish: "2026-10-09", ...o });

test("snapshotRows saves task, duration, start and finish; from the forecast dates when asked", () => {
  const rows = snapshotRows([act("A1", { dur: 3 })], "forecast");
  assert.deepEqual(rows, [{ id: "A1", name: "A1", dur: 3, start: "2026-10-02", finish: "2026-10-09" }]);
  assert.deepEqual(snapshotRows([act("A1", { dur: 3 })], "baseline")[0], { id: "A1", name: "A1", dur: 3, start: "2026-10-01", finish: "2026-10-07" });
});

test("applyBaseline copies snapshot dates onto matching tasks and leaves others alone", () => {
  const acts = [act("A1"), act("A2")];
  const n = applyBaseline(acts, { rows: [{ id: "A1", start: "2026-09-01", finish: "2026-09-05" }] });
  assert.equal(n, 1);
  assert.deepEqual([acts[0].bStart, acts[0].bFinish, acts[1].bStart], ["2026-09-01", "2026-09-05", "2026-10-01"]);
});

test("nextVersion continues after the highest version, never reuses one", () => {
  assert.equal(nextVersion([]), 1);
  assert.equal(nextVersion([{ v: 1 }, { v: 4 }, { v: 2 }]), 5);
});

test("parseSnapshot reads stored JSON and tolerates empty or broken text", () => {
  assert.deepEqual(parseSnapshot('[{"id":"A1","dur":2,"start":"2026-10-01","finish":"2026-10-02"}]'), [{ id: "A1", dur: 2, start: "2026-10-01", finish: "2026-10-02" }]);
  assert.deepEqual(parseSnapshot(""), []);
  assert.deepEqual(parseSnapshot("{oops"), []);
});

test("taskPvEv: PV = budget x planned %, EV = budget x actual %; a milestone or empty budget is 0", () => {
  assert.deepEqual(taskPvEv(act("A1", { cost: 1000, pct: 40 }), 50), { bac: 1000, pv: 500, ev: 400, sv: -100 });
  assert.deepEqual(taskPvEv(act("M1", { cost: 1000, ms: true }), 50), { bac: 0, pv: 0, ev: 0, sv: 0 });
  assert.deepEqual(taskPvEv(act("A2", { cost: 0, pct: 90 }), 50), { bac: 0, pv: 0, ev: 0, sv: 0 });
});

test("programRollup consolidates sub-initiative schedules into one program KPI, date span and worst RAG", () => {
  const planned = (a) => a.exp;
  const p1 = { id: "P1", activities: [act("A", { dur: 10, pct: 50, exp: 50, bStart: "2026-10-01", fFinish: "2026-12-01", bFinish: "2026-11-27" })], rag: "G" };
  const p2 = { id: "P2", activities: [act("B", { dur: 30, pct: 10, exp: 50, bStart: "2026-09-01", fFinish: "2027-01-15", bFinish: "2026-12-31" })], rag: "R" };
  const r = programRollup([p1, p2], planned);
  assert.equal(r.projects, 2);
  assert.equal(r.start, "2026-09-01");
  assert.equal(r.finish, "2027-01-15");
  assert.equal(r.baseFinish, "2026-12-31");
  assert.equal(Math.round(r.complete * 10) / 10, 20);       // (10*50 + 30*10) / 40
  assert.equal(Math.round(r.expected), 50);
  assert.equal(Math.round(r.kpi * 100) / 100, 0.4);
  assert.equal(r.kpiRag, "R");
  assert.equal(r.worst, "R");
});

test("programRollup of no projects or zero planned progress: n/a KPI counts as Green", () => {
  const r0 = programRollup([], () => 0);
  assert.deepEqual([r0.projects, r0.kpi, r0.kpiRag, r0.start], [0, null, "G", ""]);
  const r1 = programRollup([{ id: "P", activities: [act("A", { pct: 0 })], rag: "A" }], () => 0);
  assert.deepEqual([r1.kpi, r1.kpiRag, r1.worst], [null, "G", "A"]);
});
