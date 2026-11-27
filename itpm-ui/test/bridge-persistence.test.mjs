import { test } from "node:test";
import assert from "node:assert/strict";
import { bridgeHarness, projectRow } from "./bridge-harness.mjs";

const PROJECT = "ITPMD_Project_A00", COST = "ITPMD_Cost_Entry_A00", ISSUE = "ITPMD_Issue_A00", ACTION = "ITPMD_Action_Item_A00";
const rowsWithProject = extra => ({ [PROJECT]: [projectRow()], ...extra });

test("reloading attaches a saved PSR to its mapped project and prepares it for display", async () => {
  const h = bridgeHarness({ rows: rowsWithProject({}), reports: [{ _id: "R1", project: { _id: "P1" }, _status: "Draft", _activity_instance_id: "D1", reporting_period_month: "2026-10-01", narrative_update: '{"acc":"Delivered"}' }] });
  const state = await h.load();
  h.window.__ITPH = { makePSR: () => ({ snap: { health: { overall: "G" } } }) };
  await h.attach();
  assert.equal(state.projects[0].psrs.length, 1);
  const r = state.projects[0].psrs[0];
  assert.equal(r.id, "R1"); assert.equal(r.narrative.acc, "Delivered");
  assert.equal(r.snap?.health.overall, "G");
});

for (const change of ["resolve", "escalate", "complete", "reopen"]) test(`${change} persists to the board and survives reload`, async () => {
  const h = bridgeHarness({ rows: rowsWithProject({
    [ISSUE]: [{ _id: "I1", project: { _id: "P1" }, issue_title: "Issue", _status_name: "Open" }],
    [ACTION]: [{ _id: "A1", project: { _id: "P1" }, related_issue: { _id: "I1" }, action_description: "Action", _status_name: change === "reopen" ? "Done" : "Open" }]
  }) });
  const state = await h.load(); h.baseline(state);
  const issue = state.projects[0].issues[0];
  if (change === "resolve") issue.status = "Resolved";
  if (change === "escalate") issue.escalated = true;
  if (change === "complete") issue.actions[0].status = "Done";
  if (change === "reopen") issue.actions[0].status = "Open";
  await h.sync(state);
  const again = (await h.load()).projects[0].issues[0];
  if (change === "resolve") assert.equal(again.status, "Resolved");
  if (change === "escalate") assert.equal(again.escalated, true);
  if (change === "complete") assert.equal(again.actions[0].status, "Done");
  if (change === "reopen") assert.equal(again.actions[0].status, "Open");
  assert.ok(h.writes.some(w => w.method === "PUT" && w.path.includes("/move")));
  assert.ok(h.writes.every(w => !("_hubStatus" in (w.body || {}))));
});

for (const invoiceOnly of [false, true]) test(invoiceOnly ? "editing invoices leaves multiple cost-entry totals unchanged" : "editing aggregate costs does not count other cost entries twice", async () => {
  const h = bridgeHarness({ rows: rowsWithProject({ [COST]: [
    { _id: "C1", project: { _id: "P1" }, cost_entry_title: "Cost position", actual_amount: "100 PHP", committed_amount: "20 PHP", forecast_amount: "120 PHP" },
    { _id: "C2", project: { _id: "P1" }, cost_entry_title: "Other entry", actual_amount: "50 PHP", committed_amount: "10 PHP", forecast_amount: "60 PHP" }
  ] }) });
  const state = await h.load(); h.baseline(state);
  if (invoiceOnly) state.projects[0].fin.invoices.push({ no: "INV-1", amt: 5, status: "Pending" });
  else Object.assign(state.projects[0].fin, { actual: 160, committed: 40, eac: 200 });
  await h.sync(state);
  const actual = (await h.load()).projects[0].fin;
  assert.equal(actual.actual, invoiceOnly ? 150 : 160);
  assert.equal(actual.committed, invoiceOnly ? 30 : 40);
  assert.equal(actual.eac, invoiceOnly ? 180 : 200);
  assert.equal(h.rows[COST][1].actual_amount, "50 PHP");
});

test("a failed save remains pending, retries after recovery, and protects unsaved edits on reload", async () => {
  let offline = true;
  const h = bridgeHarness({ rows: rowsWithProject({}), failWrite: () => offline });
  const state = await h.load(); h.baseline(state);
  state.projects[0].name = "Updated";
  h.save(state); await h.advance(500);
  assert.equal(h.pending(), true);
  let prevented = false;
  const event = { preventDefault() { prevented = true; } };
  h.listeners.get("beforeunload")?.(event);
  assert.equal(prevented, true);
  offline = false; await h.advance(30000);
  assert.equal(h.rows[PROJECT][0].project_name, "Updated");
  assert.equal(h.pending(), false);
  prevented = false; h.listeners.get("beforeunload")?.({ preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
});


test("editing details preserves board columns that the UI groups as open or resolved", async () => {
  const h = bridgeHarness({ rows: rowsWithProject({
    [ISSUE]: [{ _id: "I1", project: { _id: "P1" }, issue_title: "Issue", _status_name: "Closed" }],
    [ACTION]: [{ _id: "A1", project: { _id: "P1" }, related_issue: { _id: "I1" }, action_description: "Action", _status_name: "Overdue" }]
  }) });
  const state = await h.load(); h.baseline(state);
  state.projects[0].issues[0].title = "Clarified issue";
  state.projects[0].issues[0].actions[0].text = "Clarified action";
  await h.sync(state);
  assert.equal(h.rows[ISSUE][0]._status_name, "Closed");
  assert.equal(h.rows[ACTION][0]._status_name, "Overdue");
  assert.equal(h.writes.filter(w => w.path.includes("/move")).length, 0);
});

test("successive edits use the cost-position record even when it is not the first entry", async () => {
  const h = bridgeHarness({ rows: rowsWithProject({ [COST]: [
    { _id: "C2", project: { _id: "P1" }, cost_entry_title: "Other entry", actual_amount: "50 PHP" },
    { _id: "C1", project: { _id: "P1" }, cost_entry_title: "Cost position", actual_amount: "100 PHP", cost_description: '{"invoices":[{"no":"INV-1"}]}' }
  ] }) });
  const state = await h.load(); h.baseline(state);
  assert.equal(state.projects[0].fin.invoices[0].no, "INV-1");
  state.projects[0].fin.actual = 160; await h.sync(state);
  state.projects[0].fin.actual = 170; await h.sync(state);
  assert.equal((await h.load()).projects[0].fin.actual, 170);
  assert.equal(h.rows[COST][0].actual_amount, "50 PHP");
});

test("retry keeps the latest edits and backs off during an extended outage", async () => {
  let offline = true, attempts = 0;
  const h = bridgeHarness({ rows: rowsWithProject({}), failWrite: () => { attempts++; return offline; } });
  const state = await h.load(); h.baseline(state);
  state.projects[0].name = "First edit"; h.save(state);
  await h.advance(30000);
  assert.ok(attempts > 1 && attempts < 10);
  assert.equal(h.pending(), true);
  state.projects[0].name = "Latest edit"; h.save(state);
  offline = false; await h.advance(500);
  assert.equal(h.rows[PROJECT][0].project_name, "Latest edit");
  assert.equal(h.pending(), false);
  const saved = h.writes.length; await h.advance(60000);
  assert.equal(h.writes.length, saved);
});


test("an escalated issue can return to In progress and be escalated again", async () => {
  const h = bridgeHarness({ rows: rowsWithProject({ [ISSUE]: [{ _id: "I1", project: { _id: "P1" }, issue_title: "Issue", _status_name: "Escalated" }] }) });
  const state = await h.load(); h.baseline(state);
  const issue = state.projects[0].issues[0];
  issue.status = "In progress"; await h.sync(state);
  assert.equal(h.rows[ISSUE][0]._status_name, "In Progress");
  issue.escalated = true; await h.sync(state);
  assert.equal(h.rows[ISSUE][0]._status_name, "Escalated");
  await h.sync(state);
  assert.equal(h.rows[ISSUE][0]._status_name, "Escalated");
});

test("a lost create response stays pending without creating duplicate records on retry", async () => {
  const RISK = "ITPMD_Risk_A00";
  const h = bridgeHarness({ rows: rowsWithProject({}), failAfterWrite: () => true });
  const state = await h.load(); h.baseline(state);
  state.projects[0].risks.push({ id: "R-NEW", title: "New risk", cat: "Other", p: 2, i: 2, rp: 1, ri: 2, status: "Open" });
  h.save(state); await h.advance(60000);
  assert.equal(h.rows[RISK]?.length, 1);
  assert.equal(h.pending(), true);
  state.projects[0].name = "Another edit"; h.save(state); await h.advance(60000);
  assert.equal(h.rows[RISK].length, 1);
});
