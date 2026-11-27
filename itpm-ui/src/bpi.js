// BPI additions to the Project Hub: baseline snapshots (WP017/018/022), per-task PV/EV (WP023) and
// program roll-up (WP035/036). Pure functions; the prototype reaches them through window.__ITPH_BPI.
import { scheduleKpi, kpiRag } from "./wbs.js";

// Save task, duration, start and finish. `from` = "forecast" (a new baseline) or "baseline" (the dates in force now).
export function snapshotRows(activities, from = "forecast") {
  return activities.map((a) => ({ id: a.id, name: a.name, dur: a.dur,
    start: from === "forecast" ? a.fStart : a.bStart, finish: from === "forecast" ? a.fFinish : a.bFinish }));
}
export function parseSnapshot(text) {
  try { const v = JSON.parse(text || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
// Make a snapshot the baseline in force: copy its dates onto matching tasks. Returns how many tasks changed.
export function applyBaseline(activities, snap) {
  const by = new Map((snap?.rows || []).map((r) => [r.id, r]));
  let n = 0;
  for (const a of activities) { const r = by.get(a.id); if (r && r.start && r.finish) { a.bStart = r.start; a.bFinish = r.finish; n++; } }
  return n;
}
export function nextVersion(baselines) {
  return (baselines || []).reduce((m, b) => Math.max(m, b.v || 0), 0) + 1;
}

// PV = budget × planned %, EV = budget × actual % (budget-weighted, as Financials uses). Milestones carry no budget.
export function taskPvEv(a, plannedPct) {
  const bac = a.ms ? 0 : +a.cost || 0;
  const pv = bac * plannedPct / 100, ev = bac * (a.pct || 0) / 100;
  return { bac, pv, ev, sv: ev - pv };
}

// One program schedule from several project schedules. `planned(a)` = the task's %planned today (0-100).
// Each project: { id, activities, rag }. %Actual / %Planned are duration-weighted over all work items.
export function programRollup(projects, planned) {
  let tot = 0, act = 0, exp = 0, start = "", finish = "", baseFinish = "";
  const rank = { G: 0, A: 1, R: 2 }; let worst = "G";
  for (const p of projects) {
    if ((rank[p.rag] ?? 0) > rank[worst]) worst = p.rag;
    for (const a of p.activities) {
      if (a.bStart && (!start || a.bStart < start)) start = a.bStart;
      if (a.fFinish && a.fFinish > finish) finish = a.fFinish;
      if (a.bFinish && a.bFinish > baseFinish) baseFinish = a.bFinish;
      if (a.ms) continue;
      tot += a.dur; act += a.dur * (a.pct || 0) / 100; exp += a.dur * planned(a) / 100;
    }
  }
  const complete = tot ? act / tot * 100 : 0, expected = tot ? exp / tot * 100 : 0;
  const kpi = scheduleKpi(complete, expected);
  return { projects: projects.length, start, finish, baseFinish, complete, expected, kpi, kpiRag: kpiRag(kpi), worst };
}
