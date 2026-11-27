import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// A project with only phases (no work items yet) must not crash the Gantt: it shows a hint instead.
test("gantt() of a project without work items returns an empty-state message", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const src = html.match(/\nfunction gantt\(p, h, list\) \{[\s\S]*?\n\}\n/)[0];
  const gantt = new Function("canEdit", `${src}\nreturn gantt;`)(() => true);
  const out = gantt({ id: "P1", start: "2026-10-01", activities: [], wbs: [{ id: "P2", type: "phase" }] }, {}, []);
  assert.match(out, /class="empty"/);
});
