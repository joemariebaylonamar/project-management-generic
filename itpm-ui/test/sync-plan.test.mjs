import { test } from "node:test";
import assert from "node:assert/strict";
import { planRows } from "../src/sync-plan.js";

const row = (x) => ({ name: x.name, order: x.order });
const r = (id, name, order, extra = {}) => ({ _kfId: id, name, order, ...extra });

test("unchanged rows are not written, changed and new ones are, removed ones are deleted", () => {
  const old = [r("K1", "a", 0), r("K2", "b", 1), r("K3", "c", 2)];
  const cur = [r("K1", "a", 0), r("K2", "B", 1), { name: "new", order: 3 }];
  const plan = planRows(cur, old, row);
  assert.deepEqual(plan.write.map((x) => x.name), ["B", "new"]);
  assert.deepEqual(plan.del.map((x) => x._kfId), ["K3"]);
});

test("rows loaded without a stored order are written with it the first time anything in the list changes", () => {
  const old = [r("K1", "a", 0, { _needsOrder: true }), r("K2", "b", 1, { _needsOrder: true })];
  const quiet = planRows([r("K1", "a", 0, { _needsOrder: true }), r("K2", "b", 1, { _needsOrder: true })], old, row);
  assert.deepEqual(quiet.write, []);
  const cur = [r("K1", "a", 0, { _needsOrder: true }), r("K2", "b", 1, { _needsOrder: true }), { name: "x", order: 2 }];
  assert.deepEqual(planRows(cur, old, row).write.map((x) => x.name), ["a", "b", "x"]);
});

test("a record saved in an earlier pass is deleted even when the last snapshot predates it (known ids)", () => {
  const known = new Set(["K1", "K5"]);            // K5 was created by a pass that ended while another edit was queued
  const staleOld = [r("K1", "a", 0)];              // snapshot taken before K5 existed
  const cur = [r("K1", "a", 0)];                   // the user then deleted K5
  assert.deepEqual(planRows(cur, staleOld, row, known).del.map((x) => x._kfId), ["K5"]);
});
