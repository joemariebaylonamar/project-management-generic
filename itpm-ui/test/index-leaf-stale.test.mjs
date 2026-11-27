import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// A Ava suggestion made for a task that has since become a parent row (or was deleted) must not crash when applied.
test("applyProposal on an activity that is no longer a work item shows a message instead of throwing", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const src = html.match(/\nfunction applyProposal\(id\) \{[\s\S]*?\n\}\n/)[0];
  const toasts = []; let rendered = 0;
  const p = { id: "P1", activities: [], wbs: [{ id: "N5", name: "Now a parent", sum: true }] };
  const T = { pending: { k1: { status: "pending", pid: "P1", type: "set_progress", act: "N5", pct: 50 } } };
  const stubs = { T, myProjects: () => [p], actionsAllowed: () => true, proj: () => p, toast: (m) => toasts.push(m), canEdit: () => true, canEditAct: (pp, a) => a.owner === "me", role: () => "PM", renderTala: () => rendered++ };
  const applyProposal = new Function(...Object.keys(stubs), `${src}\nreturn applyProposal;`)(...Object.values(stubs));
  assert.doesNotThrow(() => applyProposal("k1"));
  assert.match(toasts[0] || "", /no longer/);
  assert.equal(T.pending.k1.status, "dismissed");
});
