import { test } from "node:test";
import assert from "node:assert/strict";
import { weekStart, weekEnd, FIELDS, missingFields, fitFont, buildDeck, ragLabel } from "../src/wsr.js";

const snap = (o = {}) => ({
  project: { name: "Loan Origination System Upgrade", code: "ITP-0001", pm: "Joms", sponsor: "Joms", bu: "Lending" },
  week: { start: "2026-10-26", end: "2026-10-30", label: "26 Oct – 30 Oct 2026" }, generated: "2026-10-28",
  kpi: { value: 0.88, rag: "A", actual: 44, planned: 50 }, health: { overall: "A", sched: "A", cost: "G", risk: "G", issue: "R" },
  schedule: { base: "2027-01-21", fore: "2027-03-02", var: 28 }, fin: { budget: 52e6, eac: 51.2e6, eacPct: 98.5, actual: 20e6, contLeft: 0.6e6 },
  leading: { risk: "G", issue: "R", overall: "R" },
  milestones: [{ name: "Milestone 1 – Design accepted", base: "2026-06-01", fore: "2026-06-03", status: "Achieved" }],
  risks: [{ no: "R-001-01", desc: "Vendor delay", pri: "High", aging: "R" }], issues: [{ no: "I-1", desc: "Env outage", pri: "Critical", aging: "A" }],
  next: [{ id: "A5", name: "Build credit scoring", start: "2026-11-02", finish: "2026-11-20" }],
  text: Object.fromEntries(FIELDS.map(f => [f.key, `text for ${f.label}`])), ...o });

test("weekStart is the Monday of the week, weekEnd the Friday", () => {
  assert.equal(weekStart("2026-10-28"), "2026-10-26");   // Wed
  assert.equal(weekStart("2026-10-26"), "2026-10-26");   // Mon
  assert.equal(weekStart("2026-11-01"), "2026-10-26");   // Sun belongs to the week that ended
  assert.equal(weekEnd("2026-10-26"), "2026-10-30");
});

test("nine qualitative fields, in the order of the requirement", () => {
  assert.deepEqual(FIELDS.map(f => f.label), ["Weekly Summary Highlights", "Schedule Highlights", "Budget Highlights", "Risks and Issues Highlights", "Scope Highlights", "Defects Highlights", "Items for Management Attention", "Key Accomplishments for the Week", "Activities for Next Week"]);
});

test("missingFields lists blank or whitespace-only fields; the report is complete only when none are missing", () => {
  const all = Object.fromEntries(FIELDS.map(f => [f.key, "x"]));
  assert.deepEqual(missingFields(all), []);
  assert.deepEqual(missingFields({ ...all, scope_hl: "  ", defects_hl: "" }), ["Scope Highlights", "Defects Highlights"]);
  assert.equal(missingFields({}).length, 9);
});

test("fitFont shrinks long text to fit the box and never goes below the minimum", () => {
  const short = fitFont("Short note.", 4, 1.5, 14, 8);
  const long = fitFont("word ".repeat(400), 4, 1.5, 14, 8);
  assert.equal(short.pt, 14);
  assert.ok(long.pt < 14 && long.pt >= 8);
  assert.equal(fitFont("word ".repeat(5000), 2, 0.5, 14, 8).pt, 8);
  assert.equal(fitFont("word ".repeat(5000), 2, 0.5, 14, 8).clipped, true);
});

test("ragLabel maps G/A/R", () => { assert.deepEqual(["G", "A", "R"].map(ragLabel), ["On track", "At risk", "Critical"]); });

test("buildDeck makes exactly three pages: summary with the KPI, the nine fields, and milestones/risks/next week", () => {
  const d = buildDeck(snap());
  assert.equal(d.pages.length, 3);
  const txt = (i) => JSON.stringify(d.pages[i]);
  assert.match(txt(0), /0\.88/); assert.match(txt(0), /Loan Origination System Upgrade/); assert.match(txt(0), /26 Oct – 30 Oct 2026/);
  for (const f of FIELDS) assert.match(txt(1), new RegExp(f.label));
  assert.match(txt(2), /Milestone 1/); assert.match(txt(2), /Vendor delay/); assert.match(txt(2), /Build credit scoring/);
});

test("buildDeck shows n/a when %Planned is 0 and still builds", () => {
  const d = buildDeck(snap({ kpi: { value: null, rag: "G", actual: 0, planned: 0 } }));
  assert.match(JSON.stringify(d.pages[0]), /n\/a/);
});

import { toPptx, toPdf, pdfSafe } from "../src/wsr-export.js";

test("pdfSafe swaps glyphs the standard PDF fonts lack", () => {
  assert.equal(pdfSafe("₱52.00M ≤ 0.70 ≥ 0.90"), "PHP 52.00M <= 0.70 >= 0.90");
});

test("toPptx writes a zip (PPTX) and toPdf a 3-page PDF", async () => {
  const d = buildDeck(snap());
  const pptx = new Uint8Array(await toPptx(d));
  assert.equal(String.fromCharCode(pptx[0], pptx[1]), "PK");
  assert.ok(pptx.length > 20000);
  const pdf = Buffer.from(await toPdf(d));
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.equal((pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length, 3);
});
