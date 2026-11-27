import { test } from "node:test";
import assert from "node:assert/strict";
import { isGone, deleteIfPresent } from "../src/kf-errors.js";

test("isGone recognises Kissflow 'record not found' answers from REST and from the SDK", () => {
  assert.equal(isGone(Object.assign(new Error("x"), { status: 404 })), true);
  assert.equal(isGone(new Error("DELETE /form/2/…/ITPMD_Activity_A00/PkE → The item, PkE, could not be located within ITPMD Activity.")), true);
  assert.equal(isGone(Object.assign(new Error("x"), { status: 403 })), false);
  assert.equal(isGone(new Error("network down")), false);
});

test("deleteIfPresent treats an already-deleted record as done, but still throws other errors", async () => {
  const gone = async () => { throw Object.assign(new Error("The item, A1, could not be located within ITPMD Activity."), { status: 404 }); };
  assert.equal(await deleteIfPresent(gone), false);
  const ok = async () => ({});
  assert.equal(await deleteIfPresent(ok), true);
  const denied = async () => { throw Object.assign(new Error("forbidden"), { status: 403 }); };
  await assert.rejects(() => deleteIfPresent(denied), /forbidden/);
});
