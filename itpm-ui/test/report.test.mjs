import { test } from "node:test";
import assert from "node:assert/strict";
import { DATASETS, runReport, validateReport } from "../src/report.js";
import { instantiateWorkplan, validateWorkplan, DEFAULT_WSR, DEFAULT_DASH, parseTemplate, wsrRequired } from "../src/tpl.js";
import { FIELDS, missingFields } from "../src/wsr.js";

const rows = [
  { project: "Loan", id: "A1", name: "Kick-off", pct: 100, budget: 100, finish: "2026-10-01", owner: "Joms" },
  { project: "Loan", id: "A2", name: "Design", pct: 40, budget: 300, finish: "2026-11-10", owner: "Charu" },
  { project: "Branch", id: "B1", name: "Rollout", pct: 10, budget: 600, finish: "2026-12-01", owner: "Joms" },
];

test("datasets expose labelled fields", () => {
  assert.ok(["projects", "tasks", "risks", "issues", "binder", "releases", "weekly"].every((d) => DATASETS[d]?.fields.length));
  assert.ok(DATASETS.tasks.fields.every((f) => f.key && f.label && ["text", "num", "date"].includes(f.type)));
});

test("runReport selects columns, filters (eq, contains, gt, lt) and sorts", () => {
  const r = runReport({ dataset: "tasks", columns: ["project", "name", "pct"], filters: [{ field: "project", op: "eq", value: "Loan" }, { field: "pct", op: "lt", value: "100" }], sort: { field: "pct", dir: "desc" } }, rows);
  assert.deepEqual(r.columns.map((c) => c.label), ["Project", "Task", "% complete"]);
  assert.deepEqual(r.rows, [["Loan", "Design", 40]]);
  assert.equal(runReport({ dataset: "tasks", columns: ["name"], filters: [{ field: "name", op: "contains", value: "ROLL" }] }, rows).rows.length, 1);
  assert.equal(runReport({ dataset: "tasks", columns: ["name"], filters: [{ field: "finish", op: "gt", value: "2026-11-01" }] }, rows).rows.length, 2);
  assert.deepEqual(runReport({ dataset: "tasks", columns: ["id"], sort: { field: "budget", dir: "desc" } }, rows).rows.map((x) => x[0]), ["B1", "A2", "A1"]);
});

test("runReport groups with a count and an optional sum, and gives chart data", () => {
  const r = runReport({ dataset: "tasks", columns: [], groupBy: "project", sumField: "budget", chart: "bar" }, rows);
  assert.deepEqual(r.columns.map((c) => c.label), ["Project", "Count", "Sum of Budget"]);
  assert.deepEqual(r.rows, [["Branch", 1, 600], ["Loan", 2, 400]]);
  assert.deepEqual(r.chart, { labels: ["Branch", "Loan"], values: [1, 2] });
});

test("runReport ignores unknown fields and filters on empty values; validateReport names the problems", () => {
  assert.equal(runReport({ dataset: "tasks", columns: ["nope", "id"], filters: [{ field: "zzz", op: "eq", value: "x" }, { field: "id", op: "eq", value: "" }] }, rows).rows.length, 3);
  assert.deepEqual(validateReport({ name: "", dataset: "tasks", columns: [] }), ["Give the report a name", "Choose at least one column, or a group-by field"]);
  assert.deepEqual(validateReport({ name: "R", dataset: "x", columns: ["a"] }), ["Unknown dataset"]);
  assert.deepEqual(validateReport({ name: "R", dataset: "tasks", columns: ["id"] }), []);
});

test("instantiateWorkplan schedules a template from a start date: durations, predecessors, milestones, holidays", () => {
  const D = (s) => new Date(s + "T00:00:00Z"), iso = (d) => d.toISOString().slice(0, 10);
  const add = (s, n) => { const d = D(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  const hol = new Set(["2026-11-03"]); const isW = (s) => { const w = D(s).getUTCDay(); return w !== 0 && w !== 6 && !hol.has(s); };
  const toWork = (s) => { while (!isW(s)) s = add(s, 1); return s; }; const nextWD = (s) => toWork(add(s, 1)); const addWD = (s, n) => { s = toWork(s); for (let i = 0; i < n; i++) s = nextWD(s); return s; };
  const tpl = { rows: [
    { id: "P1", name: "Initiation", type: "phase" },
    { id: "A1", name: "Kick-off", type: "task", parent: "P1", dur: 2 },
    { id: "A2", name: "Plan", type: "task", parent: "P1", dur: 3, preds: ["A1"] },
    { id: "M1", name: "Plan approved", type: "milestone", parent: "P1", preds: ["A2"] },
  ] };
  const r = instantiateWorkplan(tpl, "2026-11-02", { toWork, nextWD, addWD });   // Mon; Tue 3rd is a holiday
  const by = Object.fromEntries(r.map((x) => [x.id, x]));
  assert.deepEqual([by.A1.bStart, by.A1.bFinish], ["2026-11-02", "2026-11-04"]);
  assert.deepEqual([by.A2.bStart, by.A2.bFinish], ["2026-11-05", "2026-11-09"]);
  assert.deepEqual([by.M1.bStart, by.M1.bFinish, by.M1.ms], ["2026-11-10", "2026-11-10", true]);
  assert.equal(by.P1.type, "phase"); assert.equal(by.A1.parent, "P1"); assert.equal(by.A1.pct, 0);
});

test("validateWorkplan finds duplicates, unknown ids, loops, bad parents", () => {
  assert.deepEqual(validateWorkplan([{ id: "A", name: "a", type: "task", dur: 1 }]), []);
  assert.match(validateWorkplan([{ id: "A", name: "a", type: "task" }, { id: "A", name: "b", type: "task" }]).join(), /Duplicate id A/);
  assert.match(validateWorkplan([{ id: "A", name: "a", type: "task", preds: ["Z"] }]).join(), /A: predecessor Z/);
  assert.match(validateWorkplan([{ id: "A", name: "a", type: "task", preds: ["B"] }, { id: "B", name: "b", type: "task", preds: ["A"] }]).join(), /loop/);
  assert.match(validateWorkplan([{ id: "A", name: "a", type: "task", parent: "Q" }]).join(), /A: parent Q/);
  assert.match(validateWorkplan([{ id: "A", name: "", type: "task" }]).join(), /A: name/);
});

test("WSR template: defaults require all nine fields; a template can relax some and add prompts", () => {
  assert.equal(Object.keys(DEFAULT_WSR.fields).length, 9);
  assert.deepEqual(wsrRequired(DEFAULT_WSR), FIELDS.map((f) => f.key));
  const t = { fields: { ...DEFAULT_WSR.fields, defects_hl: { prompt: "", required: false } } };
  assert.equal(wsrRequired(t).includes("defects_hl"), false);
  assert.deepEqual(missingFields(Object.fromEntries(FIELDS.map((f) => [f.key, f.key === "defects_hl" ? "" : "x"])), wsrRequired(t)), []);
  assert.deepEqual(missingFields({}, ["scope_hl"]), ["Scope Highlights"]);
});

test("parseTemplate falls back on empty or broken JSON; dashboard default shows all four cards", () => {
  assert.deepEqual(parseTemplate("", DEFAULT_DASH), DEFAULT_DASH);
  assert.deepEqual(parseTemplate("{broken", DEFAULT_DASH), DEFAULT_DASH);
  assert.deepEqual(parseTemplate('{"cards":{"status":false}}', DEFAULT_DASH).cards, { status: false, rag: true, milestones: true, releases: true });
});
