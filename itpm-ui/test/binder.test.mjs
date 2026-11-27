import { test } from "node:test";
import assert from "node:assert/strict";
import { agingDays, agingRag, tally, leadingIndicator, crTally, nextItemNo, worstRag } from "../src/binder.js";

const it = (o) => ({ target: "2026-10-01", actionStatus: "Open", closed: false, type: "Risk", ...o });

test("agingDays counts calendar days past the target date while the item is open", () => {
  assert.equal(agingDays(it({}), "2026-10-09"), 8);
  assert.equal(agingDays(it({}), "2026-10-01"), 0);   // due today is not late
  assert.equal(agingDays(it({}), "2026-09-20"), 0);   // not due yet
});

test("agingDays is 0 when the action item is Done, the item is closed, or there is no target date", () => {
  assert.equal(agingDays(it({ actionStatus: "Done" }), "2026-12-01"), 0);
  assert.equal(agingDays(it({ closed: true }), "2026-12-01"), 0);
  assert.equal(agingDays(it({ target: "" }), "2026-12-01"), 0);
});

test("agingRag: Red from 8 days, Amber 3 to 7, Green up to 2 (2 days is Green)", () => {
  assert.deepEqual([0, 2, 3, 7, 8, 30].map(agingRag), ["G", "G", "A", "A", "R", "R"]);
});

test("tally counts only open items per RAG, with a total", () => {
  const items = [it({ target: "2026-09-01" }), it({ target: "2026-10-05" }), it({ target: "2026-10-30" }), it({ closed: true, target: "2026-01-01" })];
  assert.deepEqual(tally(items, "2026-10-09"), { R: 1, A: 1, G: 1, total: 3 });
});

test("leadingIndicator = most severe RAG across risks and issues; empty is Green", () => {
  const items = [it({ type: "Risk", target: "2026-09-01" }), it({ type: "Issue", target: "2026-10-05" }), it({ type: "Defect", target: "2026-01-01" })];
  assert.deepEqual(leadingIndicator(items, "2026-10-09"), { risk: "R", issue: "A", overall: "R" });   // defect is not a leading indicator
  assert.deepEqual(leadingIndicator([], "2026-10-09"), { risk: "G", issue: "G", overall: "G" });
});

test("worstRag orders G < A < R", () => {
  assert.equal(worstRag(["G", "A"]), "A");
  assert.equal(worstRag(["A", "R", "G"]), "R");
  assert.equal(worstRag([]), "G");
});

test("crTally counts approved reschedules and rebaselines by approval month; ignores pending and other kinds", () => {
  const crs = [
    { crKind: "Reschedule", crStatus: "Approved", approved: "2026-07-03" }, { crKind: "Rebaseline", crStatus: "Approved", approved: "2026-07-20" },
    { crKind: "Rebaseline", crStatus: "Approved", approved: "2026-07-28" }, { crKind: "Rebaseline", crStatus: "Pending", approved: "" },
    { crKind: "Scope change", crStatus: "Approved", approved: "2026-07-09" }, { crKind: "Reschedule", crStatus: "Approved", approved: "2026-08-01" },
  ];
  assert.deepEqual(crTally(crs), [{ month: "2026-07", reschedule: 1, rebaseline: 2 }, { month: "2026-08", reschedule: 1, rebaseline: 0 }]);
});

test("nextItemNo continues after the highest number for that type", () => {
  assert.equal(nextItemNo("Dependency", []), "DEP-001");
  assert.equal(nextItemNo("Change Request", [{ no: "CR-004" }, { no: "CR-002" }]), "CR-005");
  assert.equal(nextItemNo("Defect", [{ no: "DEF-009" }]), "DEF-010");
});
