import { test } from "node:test";
import assert from "node:assert/strict";
import { typeOf, fromKfType, toKfType, splitRows, tree, findRow, children } from "../src/wbs.js";

const leaf = (id, extra = {}) => ({ id, name: id, dur: 5, preds: [], pct: 0, owner: "U1", ms: false, bStart: "2026-10-01", bFinish: "2026-10-07", pStart: "2026-10-01", pFinish: "2026-10-07", aStart: "", aFinish: "", ...extra });
const proj = (rows) => { const { activities, wbs, warnings } = splitRows(rows); return { start: "2026-10-01", pm: "PM1", activities, wbs, warnings }; };

test("type mapping reads Kissflow values and legacy flags", () => {
  assert.equal(fromKfType("Phase", false), "phase");
  assert.equal(fromKfType({ Name: "Deliverable" }, false), "deliverable");
  assert.equal(fromKfType("", true), "milestone");
  assert.equal(fromKfType(null, false), "task");
  assert.equal(toKfType("subtask"), "Subtask");
  assert.equal(typeOf({ ms: true }), "milestone");
});

test("legacy rows load flat: all work items, top level, no warnings, order = load order", () => {
  const p = proj([leaf("A1"), leaf("A2", { preds: ["A1"] }), leaf("M1", { ms: true })]);
  assert.deepEqual(p.activities.map((r) => r.id), ["A1", "A2", "M1"]);
  assert.equal(p.wbs.length, 0);
  assert.deepEqual(p.warnings, []);
  assert.deepEqual(p.activities.map((r) => [r.type, r.parent, r.order, r.sum]), [["task", null, 0, false], ["task", null, 1, false], ["milestone", null, 2, false]]);
});

test("phases are always summary rows; deliverables/tasks with children become summary rows", () => {
  const p = proj([
    { id: "P1", name: "Initiation", type: "phase" },
    { id: "P2", name: "Empty phase", type: "phase" },
    leaf("D3", { type: "deliverable", parent: "P1" }),
    leaf("N4", { type: "task", parent: "D3" }),
    leaf("N5", { type: "task", parent: "P1" }),
    leaf("N6", { type: "subtask", parent: "N5" }),
    leaf("X7", { type: "milestone", parent: "P1", ms: true }),
  ]);
  assert.deepEqual(p.wbs.map((r) => r.id).sort(), ["D3", "N5", "P1", "P2"]);
  assert.deepEqual(p.activities.map((r) => r.id).sort(), ["N4", "N6", "X7"]);
  assert.ok(p.wbs.every((r) => r.sum) && p.activities.every((r) => !r.sum));
});

test("orphans go to the top level with a warning", () => {
  const p = proj([leaf("N1", { parent: "GONE" })]);
  assert.equal(findRow(p, "N1").parent, null);
  assert.match(findRow(p, "N1").warn, /GONE/);
  assert.equal(p.warnings.length, 1);
});

test("a parent cycle is broken and flagged", () => {
  const p = proj([leaf("N1", { type: "task", parent: "D2" }), leaf("D2", { type: "deliverable", parent: "N1" })]);
  const tops = children(p, null).map((r) => r.id);
  assert.equal(tops.length, 1);
  assert.ok(p.warnings.some((w) => /Circular/.test(w)));
});

test("invalid placement is kept where it is and flagged", () => {
  const p = proj([{ id: "P1", name: "Ph", type: "phase" }, leaf("N2", { type: "subtask", parent: "P1" })]);
  assert.equal(findRow(p, "N2").parent, "P1");
  assert.match(findRow(p, "N2").warn, /Subtask can't sit under Phase/);
});

test("tree gives display order, depth, outline numbers and hides collapsed children", () => {
  const p = proj([
    { id: "P1", name: "Initiation", type: "phase", order: 0 },
    leaf("N3", { parent: "P1", order: 2 }),
    leaf("D2", { type: "deliverable", parent: "P1", order: 1 }),
    leaf("N4", { parent: "D2", order: 3 }),
    { id: "P5", name: "Planning", type: "phase", order: 4 },
  ]);
  assert.deepEqual(tree(p).map((n) => [n.row.id, n.depth, n.no, n.hasKids]),
    [["P1", 0, "1", true], ["D2", 1, "1.1", true], ["N4", 2, "1.1.1", false], ["N3", 1, "1.2", false], ["P5", 0, "2", false]]);
  const shut = tree(p, new Set(["D2"]));
  assert.deepEqual(shut.filter((n) => n.hidden).map((n) => n.row.id), ["N4"]);
});

import { rollUp } from "../src/wbs.js";
// test doubles: calendar days as working days; the prototype's actState rules, simplified
const wdDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const actState = (a) => a.pct >= 100 ? { k: "done", l: "Complete", r: "G" } : a.late ? { k: "behind", l: "Behind", r: "R" } : a.pct > 0 ? { k: "prog", l: "In progress", r: "I" } : { k: "ns", l: "Not started", r: "N" };
const fns = { wdDiff, actState };
const sched = (id, bS, bF, fS, fF, extra = {}) => leaf(id, { bStart: bS, bFinish: bF, fStart: fS, fFinish: fF, ...extra });

test("rollUp: dates span children, % is duration-weighted, milestones excluded from %", () => {
  const p = proj([
    { id: "P1", name: "Initiation", type: "phase" },
    sched("N2", "2026-10-01", "2026-10-05", "2026-10-01", "2026-10-05", { parent: "P1", dur: 4, pct: 100 }),
    sched("N3", "2026-10-06", "2026-10-15", "2026-10-06", "2026-10-20", { parent: "P1", dur: 12, pct: 0 }),
    sched("X4", "2026-10-15", "2026-10-15", "2026-10-20", "2026-10-20", { parent: "P1", ms: true, type: "milestone", dur: 1, pct: 0 }),
  ]);
  rollUp(p, fns);
  const s = findRow(p, "P1");
  assert.deepEqual([s.bStart, s.bFinish, s.fStart, s.fFinish], ["2026-10-01", "2026-10-15", "2026-10-01", "2026-10-20"]);
  assert.equal(s.dur, 20);
  assert.equal(s.pct, 25);
  assert.equal(s.state.l, "In progress");
});

test("rollUp: nested summaries roll up through levels; actual start counts as start", () => {
  const p = proj([
    { id: "P1", name: "Ph", type: "phase" },
    leaf("D2", { type: "deliverable", parent: "P1" }),
    sched("N3", "2026-10-05", "2026-10-09", "2026-10-05", "2026-10-09", { parent: "D2", aStart: "2026-10-02", pct: 50 }),
  ]);
  rollUp(p, fns);
  assert.equal(findRow(p, "D2").fStart, "2026-10-02");
  assert.equal(findRow(p, "P1").fStart, "2026-10-02");
  assert.equal(findRow(p, "P1").pct, 50);
});

test("rollUp: status is the worst child; done + not started reads In progress; all done reads Complete", () => {
  const mk = (a, b) => { const p = proj([{ id: "P1", name: "Ph", type: "phase" }, sched("N2", "2026-10-01", "2026-10-02", "2026-10-01", "2026-10-02", { parent: "P1", ...a }), sched("N3", "2026-10-03", "2026-10-04", "2026-10-03", "2026-10-04", { parent: "P1", ...b })]); rollUp(p, fns); return findRow(p, "P1").state.l; };
  assert.equal(mk({ pct: 100 }, { pct: 20, late: true }), "Behind");
  assert.equal(mk({ pct: 100 }, { pct: 0 }), "In progress");
  assert.equal(mk({ pct: 100 }, { pct: 100 }), "Complete");
  assert.equal(mk({ pct: 0 }, { pct: 0 }), "Not started");
});

test("empty phase rolls up to blanks", () => {
  const p = proj([{ id: "P1", name: "Empty", type: "phase" }]);
  rollUp(p, fns);
  const s = findRow(p, "P1");
  assert.deepEqual([s.bStart, s.bFinish, s.fStart, s.fFinish, s.dur, s.pct, s.state], ["", "", "", "", 0, 0, null]);
});

test("rollUp never changes work items and tolerates a project without wbs", () => {
  const p = { start: "2026-10-01", pm: "PM1", activities: [sched("A1", "2026-10-01", "2026-10-02", "2026-10-01", "2026-10-02", { dur: 2, pct: 40 })] };
  const before = JSON.stringify(p.activities);
  rollUp(p, fns);
  assert.equal(JSON.stringify(p.activities), before);
  assert.deepEqual(p.wbs, []);
});

import { allowedParents, nextId, addItem, moveRow, reorder, canDelete, removeRow, breadcrumb } from "../src/wbs.js";
const base = () => proj([
  { id: "P1", name: "Initiation", type: "phase" },
  leaf("N2", { parent: "P1", preds: ["A0"], owner: "U7", pct: 30, aStart: "2026-10-02" }),
  leaf("A0"),
  leaf("N3", { preds: ["N2"] }),
]);

test("allowedParents follows the placement rules and excludes self/descendants", () => {
  const p = base();
  assert.deepEqual(allowedParents(p, "phase").map((o) => o.id), [null]);
  assert.deepEqual(allowedParents(p, "subtask").map((o) => o.id).sort(), ["A0", "N2", "N3"]);
  assert.deepEqual(allowedParents(p, "task", "P1").map((o) => o.id), [null]);
  assert.equal(allowedParents(p, "deliverable")[0].label, "(top level)");
});

test("nextId uses the type prefix and never reuses an id", () => {
  assert.equal(nextId(base(), "phase"), "P5");
  assert.equal(nextId(base(), "subtask"), "N5");
  const p = base(); p.activities.push(leaf("X5", { ms: true }));
  assert.equal(nextId(p, "milestone"), "X6");
});

test("addItem adds a phase as a summary row", () => {
  const p = base();
  assert.deepEqual(addItem(p, { id: "P9", name: "Planning", type: "phase", parent: null }), { ok: true, converted: null });
  assert.ok(p.wbs.some((r) => r.id === "P9" && r.sum));
});

test("addItem converts a leaf parent and rewires predecessors", () => {
  const p = base();
  const r = addItem(p, leaf("N9", { type: "subtask", parent: "N2", preds: [] }));
  assert.deepEqual(r, { ok: true, converted: "N2" });
  assert.ok(p.wbs.some((x) => x.id === "N2") && !p.activities.some((x) => x.id === "N2"));
  const child = findRow(p, "N9");
  assert.deepEqual(child.preds, ["A0"]);
  assert.equal(child.owner, "U7"); assert.equal(child.pct, 30); assert.equal(child.aStart, "2026-10-02");
  assert.deepEqual(findRow(p, "N3").preds, ["N9"]);
});

test("addItem rejects a placement the rules forbid", () => {
  const p = base();
  const r = addItem(p, leaf("N9", { type: "subtask", parent: "P1" }));
  assert.equal(r.ok, false);
  assert.match(r.error, /Subtask/);
});

test("moveRow under a leaf converts it and moves its links to the moved item", () => {
  const p = proj([leaf("A0"), leaf("D1", { type: "deliverable", preds: ["A0"] }), leaf("N3", { preds: ["D1"] })]);
  const r = moveRow(p, "N3", "D1");
  assert.equal(r.ok, true);
  assert.equal(r.converted, "D1"); assert.equal(r.movedTo, "N3");
  assert.ok(findRow(p, "D1").sum);
  assert.deepEqual(findRow(p, "N3").preds, ["A0"]); // D1's link moved to N3; N3's own link to D1 is dropped (would be circular)
});

test("moveRow reverts the old parent when its last child leaves", () => {
  const p = proj([leaf("D1", { type: "deliverable" }), leaf("N2", { type: "task", parent: "D1" })]);
  assert.ok(findRow(p, "D1").sum);
  const r = moveRow(p, "N2", null);
  assert.equal(r.reverted, "D1");
  const d = findRow(p, "D1");
  assert.equal(d.sum, false); assert.equal(d.dur, 1); assert.deepEqual(d.preds, []);
  assert.ok(p.activities.includes(d));
});

test("moveRow refuses to move a row under its own descendant", () => {
  const p = proj([leaf("D1", { type: "deliverable" }), leaf("N2", { type: "task", parent: "D1" })]);
  assert.equal(moveRow(p, "D1", "N2").ok, false);
});

test("reorder swaps with the neighbour sibling and stops at the ends", () => {
  const p = proj([leaf("A1"), leaf("A2"), leaf("A3")]);
  assert.equal(reorder(p, "A2", -1), true);
  assert.deepEqual(children(p, null).map((r) => r.id), ["A2", "A1", "A3"]);
  assert.equal(reorder(p, "A2", -1), false);
});

test("removeRow: blocked while it has children; strips predecessors; reverts an emptied deliverable to a work item", () => {
  const p = proj([leaf("D1", { type: "deliverable" }), leaf("N2", { type: "task", parent: "D1" }), leaf("N3", { preds: ["N2"] })]);
  assert.equal(canDelete(p, "D1"), false);
  assert.equal(removeRow(p, "D1").ok, false);
  const r = removeRow(p, "N2");
  assert.deepEqual(r, { ok: true, reverted: "D1" });
  assert.deepEqual(findRow(p, "N3").preds, []);
  assert.equal(findRow(p, "D1").sum, false);
});

test("breadcrumb lists ancestor names", () => {
  const p = proj([{ id: "P1", name: "Initiation", type: "phase" }, leaf("D2", { type: "deliverable", parent: "P1", name: "Charter" }), leaf("N3", { parent: "D2" })]);
  assert.equal(breadcrumb(p, "N3"), "Initiation › Charter");
  assert.equal(breadcrumb(p, "P1"), "");
});

test("moveRow keeps the moved item's own progress and owner (only a newly added child inherits them)", () => {
  const p = proj([leaf("D4", { type: "deliverable", owner: "U9" }), leaf("N2", { pct: 60, aStart: "2026-09-01", owner: "U3" })]);
  const r = moveRow(p, "N2", "D4");
  assert.equal(r.converted, "D4");
  const n = findRow(p, "N2");
  assert.equal(n.pct, 60); assert.equal(n.aStart, "2026-09-01"); assert.equal(n.owner, "U3");
});

import { checkPreds } from "../src/wbs.js";

test("tree gives connector info: last sibling and which ancestor levels continue", () => {
  const p = proj([
    { id: "P1", name: "A", type: "phase", order: 0 },
    leaf("D2", { type: "deliverable", parent: "P1", order: 1 }),
    leaf("N3", { parent: "D2", order: 2 }),
    leaf("N4", { parent: "P1", order: 3 }),
    { id: "P5", name: "B", type: "phase", order: 4 },
  ]);
  assert.deepEqual(tree(p).map((n) => [n.row.id, n.last, n.guides]), [
    ["P1", false, []], ["D2", false, [true]], ["N3", true, [true, true]], ["N4", true, [true]], ["P5", true, []],
  ]);
});

test("addItem can insert right after a sibling", () => {
  const p = proj([{ id: "P1", name: "A", type: "phase" }, leaf("N2", { parent: "P1" }), leaf("N3", { parent: "P1" })]);
  addItem(p, leaf("N9", { type: "task", parent: "P1" }), { after: "N2" });
  assert.deepEqual(children(p, "P1").map((r) => r.id), ["N2", "N9", "N3"]);
  addItem(p, leaf("N8", { type: "task", parent: "P1" }));
  assert.deepEqual(children(p, "P1").map((r) => r.id), ["N2", "N9", "N3", "N8"]);
});

test("checkPreds rejects unknown ids, itself, summary rows and loops", () => {
  const p = proj([{ id: "P1", name: "A", type: "phase" }, leaf("N2", { parent: "P1" }), leaf("N3", { parent: "P1", preds: ["N2"] }), leaf("N4", { preds: ["N3"] })]);
  assert.equal(checkPreds(p, "N4", ["N2", "N3"]), null);
  assert.match(checkPreds(p, "N4", ["ZZ"]), /ZZ/);
  assert.match(checkPreds(p, "N4", ["N4"]), /itself/);
  assert.match(checkPreds(p, "N4", ["P1"]), /P1/);
  assert.match(checkPreds(p, "N2", ["N4"]), /loop/);
});

test("rollUp sums budgets of the work items under each summary row; milestones and empty rows count 0", () => {
  const p = proj([
    { id: "P1", name: "A", type: "phase" },
    leaf("D2", { type: "deliverable", parent: "P1" }),
    sched("N3", "2026-10-01", "2026-10-02", "2026-10-01", "2026-10-02", { parent: "D2", cost: 200000 }),
    sched("N4", "2026-10-03", "2026-10-04", "2026-10-03", "2026-10-04", { parent: "D2", cost: 100000 }),
    sched("N5", "2026-10-05", "2026-10-06", "2026-10-05", "2026-10-06", { parent: "P1" }),
    sched("X6", "2026-10-06", "2026-10-06", "2026-10-06", "2026-10-06", { parent: "P1", ms: true, type: "milestone", cost: 999 }),
    { id: "P7", name: "Empty", type: "phase" },
  ]);
  rollUp(p, fns);
  assert.equal(findRow(p, "D2").cost, 300000);
  assert.equal(findRow(p, "P1").cost, 300000);
  assert.equal(findRow(p, "P7").cost, 0);
});

test("nextId never reuses a number: it continues after the highest id, even one deleted in this session", () => {
  const p = proj([leaf("A1"), leaf("N2"), leaf("N7")]);          // N3–N6 were deleted earlier
  assert.equal(nextId(p, "task"), "N8");
  addItem(p, leaf("N8", { type: "task" }));
  removeRow(p, "N8");
  assert.equal(nextId(p, "milestone"), "X9");                     // N8 was used once; don't hand it out again
});

test("rollUp sums task actual costs into summary rows (milestones excluded, empty rows 0)", () => {
  const p = proj([
    { id: "P1", name: "A", type: "phase" },
    sched("N2", "2026-10-01", "2026-10-02", "2026-10-01", "2026-10-02", { parent: "P1", actual: 120000 }),
    sched("N3", "2026-10-03", "2026-10-04", "2026-10-03", "2026-10-04", { parent: "P1", actual: 30000 }),
    sched("X4", "2026-10-04", "2026-10-04", "2026-10-04", "2026-10-04", { parent: "P1", ms: true, type: "milestone", actual: 5 }),
    { id: "P5", name: "Empty", type: "phase" },
  ]);
  rollUp(p, fns);
  assert.equal(findRow(p, "P1").actual, 150000);
  assert.equal(findRow(p, "P5").actual, 0);
});

import { parsePreds, formatPreds, predConstraint, successorsOf, scheduleKpi, kpiRag } from "../src/wbs.js";

test("parsePreds reads ids with optional lag (+n) or lead (-n) in working days", () => {
  assert.deepEqual(parsePreds("A1, a2+3 ,A3-2"), { ids: ["A1", "A2", "A3"], lags: { A2: 3, A3: -2 } });
  assert.deepEqual(parsePreds(""), { ids: [], lags: {} });
  assert.deepEqual(parsePreds("A1+0, A1"), { ids: ["A1"], lags: {} });
});

test("formatPreds writes the same text parsePreds reads", () => {
  assert.equal(formatPreds(["A1", "A2", "A3"], { A2: 3, A3: -2 }), "A1,A2+3,A3-2");
  assert.equal(formatPreds(["A1"], undefined), "A1");
});

// Mon-Fri calendar without holidays
const D = (s) => new Date(s + "T00:00:00Z");
const iso = (d) => d.toISOString().slice(0, 10);
const isWork = (s) => { const w = D(s).getUTCDay(); return w !== 0 && w !== 6; };
const addDays = (s, n) => { const d = D(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const toWork = (s) => { while (!isWork(s)) s = addDays(s, 1); return s; };
const nextWD = (s) => toWork(addDays(s, 1));
const prevWD = (s) => { s = addDays(s, -1); while (!isWork(s)) s = addDays(s, -1); return s; };
const wdFns = { nextWD, prevWD };

test("predConstraint: earliest start is the next working day after the latest predecessor finish, shifted by lag/lead", () => {
  const by = { A1: { fFinish: "2026-10-09" }, A2: { fFinish: "2026-10-07" } }; // Fri, Wed
  assert.equal(predConstraint({ preds: ["A1", "A2"], lags: {} }, by, wdFns), "2026-10-12");
  assert.equal(predConstraint({ preds: ["A1"], lags: { A1: 2 } }, by, wdFns), "2026-10-14");
  assert.equal(predConstraint({ preds: ["A1"], lags: { A1: -1 } }, by, wdFns), "2026-10-09");
  assert.equal(predConstraint({ preds: ["A2", "A1"], lags: { A2: 5 } }, by, wdFns), "2026-10-15"); // A2 lag later than A1
  assert.equal(predConstraint({ preds: [], lags: {} }, by, wdFns), null);
  assert.equal(predConstraint({ preds: ["ZZ"] }, by, wdFns), null);
});

test("successorsOf lists the work items that list the id as a predecessor", () => {
  const p = { activities: [{ id: "A1", preds: [] }, { id: "A2", preds: ["A1"] }, { id: "A3", preds: ["A1", "A2"] }] };
  assert.deepEqual(successorsOf(p, "A1"), ["A2", "A3"]);
  assert.deepEqual(successorsOf(p, "A3"), []);
});

test("scheduleKpi = %Actual / %Planned; %Planned = 0 gives n/a", () => {
  assert.equal(scheduleKpi(45, 50), 0.9);
  assert.equal(scheduleKpi(0, 0), null);
  assert.equal(scheduleKpi(10, 0), null);
});

test("kpiRag: Red <= 0.70, Green >= 0.90, Amber strictly between, n/a is Green", () => {
  assert.equal(kpiRag(0.7), "R");
  assert.equal(kpiRag(0.69), "R");
  assert.equal(kpiRag(0.71), "A");
  assert.equal(kpiRag(0.899), "A");
  assert.equal(kpiRag(0.9), "G");
  assert.equal(kpiRag(1.3), "G");
  assert.equal(kpiRag(null), "G");
});

import { criticalPath } from "../src/wbs.js";

// working-day index on the Mon-Fri calendar used above
const wdi = (s) => { let n = 0, d = "2026-10-01"; while (d < s) { if (isWork(d)) n++; d = addDays(d, 1); } return n; };
const act = (id, fStart, fFinish, preds = [], lags = {}, pct = 0) => ({ id, fStart, fFinish, preds, lags, pct });

test("criticalPath: the longest chain is critical, a shorter parallel branch has float", () => {
  const acts = [
    act("A", "2026-10-01", "2026-10-02"),                       // Thu-Fri
    act("B", "2026-10-05", "2026-10-09", ["A"]),                // long branch
    act("C", "2026-10-05", "2026-10-06", ["A"]),                // short branch, float
    act("D", "2026-10-12", "2026-10-13", ["B", "C"]),
  ];
  assert.deepEqual([...criticalPath(acts, wdi)].sort(), ["A", "B", "D"]);
});

test("criticalPath: lag on a link keeps its chain critical and a lead is respected", () => {
  const acts = [
    act("A", "2026-10-01", "2026-10-02"),
    act("B", "2026-10-07", "2026-10-08", ["A"], { A: 2 }),      // lag 2 wd: 5th,6th skipped
    act("C", "2026-10-05", "2026-10-05", ["A"]),                // 1 day, huge float
  ];
  const cp = criticalPath(acts, wdi);
  assert.ok(cp.has("A") && cp.has("B") && !cp.has("C"));
});

test("criticalPath: completed work and an empty schedule are never critical", () => {
  assert.equal(criticalPath([], wdi).size, 0);
  const acts = [act("A", "2026-10-01", "2026-10-02", [], {}, 100), act("B", "2026-10-05", "2026-10-06", ["A"])];
  assert.deepEqual([...criticalPath(acts, wdi)], ["B"]);
});
