import { test } from "node:test";
import assert from "node:assert/strict";
import { CATS, statusCategory, lastMonths, statusTrend, deltaVsPrevious, lastWeeks, ragTrend, quarterOf, milestoneForecast, releaseForecast, filterProjects } from "../src/dash.js";

test("eight project statuses (Planning plus the seven required), Ongoing split by RAG", () => {
  assert.deepEqual(CATS, ["Planning", "Completed", "Implemented", "Ongoing (On-Track)", "Ongoing (At Risk)", "Ongoing (Not Met)", "On Hold", "Cancelled"]);
  assert.equal(statusCategory("Ongoing", "G"), "Ongoing (On-Track)");
  assert.equal(statusCategory("Active", "A"), "Ongoing (At Risk)");
  assert.equal(statusCategory("Ongoing", "R"), "Ongoing (Not Met)");
  assert.equal(statusCategory("Closed", "G"), "Completed");
  assert.equal(statusCategory("On Hold", "R"), "On Hold");
  assert.equal(statusCategory("Planning", "G"), "Planning");
  assert.equal(statusCategory("", "G"), null);
  assert.equal(statusCategory("Ongoing (At Risk)", "G"), "Ongoing (At Risk)");   // an already-stored category passes through
});

test("lastMonths ends with the current month", () => {
  assert.deepEqual(lastMonths("2026-10-28", 4), ["2026-07", "2026-08", "2026-09", "2026-10"]);
  assert.deepEqual(lastMonths("2026-02-10", 3), ["2025-12", "2026-01", "2026-02"]);
});

test("statusTrend: current month is live, earlier months use the last weekly report up to then, projects not yet started are left out", () => {
  const P = [
    { id: "A", start: "2026-01-01", live: "Ongoing (At Risk)", reports: [{ weekOf: "2026-08-24", cat: "Ongoing (On-Track)" }, { weekOf: "2026-09-21", cat: "Ongoing (At Risk)" }] },
    { id: "B", start: "2026-10-05", live: "Ongoing (On-Track)", reports: [] },
    { id: "C", start: "2026-01-01", live: "Completed", reports: [] },
  ];
  const t = statusTrend(P, ["2026-08", "2026-09", "2026-10"], "2026-10-28");
  assert.deepEqual(t.map((r) => r.total), [1, 1, 3]);                       // C has no history before October; B starts in October
  assert.equal(t[0].counts["Ongoing (On-Track)"], 1);
  assert.equal(t[1].counts["Ongoing (At Risk)"], 1);
  assert.equal(t[2].counts["Completed"], 1);
});

test("deltaVsPrevious compares the last month that has data with the one before it", () => {
  const t = [{ month: "2026-09", counts: { "On Hold": 2 }, total: 2 }, { month: "2026-10", counts: { "On Hold": 1, Completed: 1 }, total: 2 }];
  const d = deltaVsPrevious(t);
  assert.equal(d["On Hold"], -1); assert.equal(d["Completed"], 1); assert.equal(d["Cancelled"], 0);
  assert.deepEqual(deltaVsPrevious([t[1]]), null);
});

test("ragTrend counts projects per RAG by week; the current week falls back to live RAG", () => {
  const P = [{ id: "A", live: "R", reports: [{ weekOf: "2026-10-19", rag: "R" }, { weekOf: "2026-10-12", rag: "A" }] }, { id: "B", live: "G", reports: [{ weekOf: "2026-10-19", rag: "R" }] }];
  const w = lastWeeks("2026-10-28", 3);
  assert.deepEqual(w, ["2026-10-12", "2026-10-19", "2026-10-26"]);
  const t = ragTrend(P, w, "2026-10-28");
  assert.deepEqual(t.map((r) => [r.G, r.A, r.R]), [[0, 1, 0], [0, 0, 2], [1, 0, 1]]);
});

test("quarterOf", () => { assert.equal(quarterOf("2026-10-28"), "2026-Q4"); assert.equal(quarterOf("2027-01-01"), "2027-Q1"); assert.equal(quarterOf(""), ""); });

test("milestoneForecast: on time, at risk (1-7 days late), delayed (over 7 days or missed); delayed ones list the forecast date", () => {
  const ms = [
    { name: "M1", base: "2026-11-10", fore: "2026-11-10", done: false }, { name: "M2", base: "2026-11-10", fore: "2026-11-15", done: false },
    { name: "M3", base: "2026-11-10", fore: "2026-12-20", done: false }, { name: "M4", base: "2026-09-10", fore: "2026-09-08", done: true, achieved: "2026-09-08" },
    { name: "M5", base: "2026-09-10", fore: "2026-09-30", done: true, achieved: "2026-09-30" }, { name: "M6", base: "2026-10-01", fore: "2026-11-02", done: false },
  ];
  const q = milestoneForecast(ms, "2026-10-28");
  const q4 = q.find((x) => x.q === "2026-Q4"), q3 = q.find((x) => x.q === "2026-Q3");
  assert.deepEqual([q4.onTime, q4.atRisk, q4.delayed], [1, 1, 2]);
  assert.deepEqual([q3.onTime, q3.atRisk, q3.delayed], [1, 0, 1]);
  assert.deepEqual(q4.delayedItems.map((d) => [d.name, d.fore]), [["M3", "2026-12-20"], ["M6", "2026-11-02"]]);
});

test("releaseForecast: planned, implemented, and at-risk-or-delayed counts per quarter", () => {
  const r = [
    { name: "R1", planned: "2026-09-15", implemented: "2026-09-14" }, { name: "R2", planned: "2026-09-30", implemented: "2026-10-20" },
    { name: "R3", planned: "2026-12-10", forecast: "2026-12-10" }, { name: "R4", planned: "2026-12-20", forecast: "2026-12-24" }, { name: "R5", planned: "2026-12-20", forecast: "2027-02-01" },
  ];
  const q = releaseForecast(r, "2026-10-28");
  const q3 = q.find((x) => x.q === "2026-Q3"), q4 = q.find((x) => x.q === "2026-Q4");
  assert.deepEqual([q3.planned, q3.implemented, q3.atRiskOrDelayed, q3.onTime, q3.delayed], [2, 2, 1, 1, 1]);
  assert.deepEqual([q4.planned, q4.implemented, q4.onTime, q4.atRisk, q4.delayed, q4.atRiskOrDelayed], [3, 0, 1, 1, 1, 2]);
});

test("filterProjects by segment, RAG and date window on the project's dates", () => {
  const P = [{ id: "A", segment: "Retail", rag: "G", start: "2026-01-01", end: "2026-12-31" }, { id: "B", segment: "Treasury", rag: "R", start: "2026-06-01", end: "2027-03-01" }];
  assert.deepEqual(filterProjects(P, { segment: "Retail" }).map((p) => p.id), ["A"]);
  assert.deepEqual(filterProjects(P, { rag: "R" }).map((p) => p.id), ["B"]);
  assert.deepEqual(filterProjects(P, { from: "2027-02-01", to: "2027-04-01" }).map((p) => p.id), ["B"]);
  assert.deepEqual(filterProjects(P, {}).length, 2);
});
