import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// curvePoints(p, 'cost') weights each work item by its budget; the default weights by working days.
test("S-curve progress is weighted by duration by default and by budget in cost mode", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const src = html.match(/\nfunction curvePoints\(p, mode\) \{[\s\S]*?\n\}\n/)[0];
  const day = (s) => Date.parse(s + "T00:00:00Z");
  const addDays = (s, n) => new Date(day(s) + n * 864e5).toISOString().slice(0, 10);
  const wdDiff = (a, b) => Math.round((day(b) - day(a)) / 864e5);
  const TODAY = "2026-10-10";
  const schedule = () => ({ baseFinish: "2026-10-20", foreFinish: "2026-10-20" });
  const curvePoints = new Function("TODAY", "schedule", "addDays", "wdDiff", `${src}\nreturn curvePoints;`)(TODAY, schedule, addDays, wdDiff);
  const t = (id, cost, pct) => ({ id, ms: false, dur: 10, cost, pct, bStart: "2026-10-01", bFinish: "2026-10-10", fStart: "2026-10-01", fFinish: "2026-10-10", aStart: pct ? "2026-10-01" : "", aFinish: pct >= 100 ? "2026-10-10" : "" });
  const p = { start: "2026-10-01", activities: [t("A", 900000, 100), t("B", 100000, 0)] };
  const at = (pts) => pts.find((x) => x.d === TODAY);
  assert.equal(Math.round(at(curvePoints(p)).ac), 50);          // equal durations: A done = half the work
  assert.equal(Math.round(at(curvePoints(p, "cost")).ac), 90);  // by budget: A is 90% of the budget
});
