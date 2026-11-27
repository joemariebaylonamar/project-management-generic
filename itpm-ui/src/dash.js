// Dashboard rules (DAS002, DAS003, DAS004, DAS008, DAS010). Pure functions; the UI reaches them through window.__ITPH_DASH.
import { weekStart } from "./wsr.js";
export const CATS = ["Planning", "Completed", "Implemented", "Ongoing (On-Track)", "Ongoing (At Risk)", "Ongoing (Not Met)", "On Hold", "Cancelled"];
const ONGOING = { G: "Ongoing (On-Track)", A: "Ongoing (At Risk)", R: "Ongoing (Not Met)" };
// Kissflow lifecycle status (+ health) -> one of the eight categories (Planning plus the seven required statuses).
export function statusCategory(status, rag) {
  if (CATS.includes(status)) return status;
  if (status === "Ongoing" || status === "Active") return ONGOING[rag] || ONGOING.G;
  if (status === "Planning") return "Planning";
  if (status === "Completed" || status === "Closed") return "Completed";
  if (status === "Implemented" || status === "On Hold" || status === "Cancelled") return status;
  return null;
}
const D = (s) => new Date(s + "T00:00:00Z"); const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = D(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const calDays = (a, b) => Math.round((D(b) - D(a)) / 864e5);
export function lastMonths(today, n) {
  const out = []; let y = +today.slice(0, 4), m = +today.slice(5, 7);
  for (let i = 0; i < n; i++) { out.unshift(`${y}-${String(m).padStart(2, "0")}`); m--; if (m === 0) { m = 12; y--; } }
  return out;
}
const monthEnd = (m) => { const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)); return iso(d); };
const emptyCounts = () => Object.fromEntries(CATS.map((c) => [c, 0]));
// Per month: the project's category per the last weekly report on or before month end; the current month uses the live value.
export function statusTrend(projects, months, today) {
  const cur = today.slice(0, 7);
  return months.map((month) => {
    const counts = emptyCounts(); let total = 0; const end = monthEnd(month);
    for (const p of projects) {
      if (p.start && p.start > end) continue;
      let cat = null;
      if (month === cur) cat = p.live;
      else { const r = (p.reports || []).filter((x) => x.weekOf <= end).sort((a, b) => a.weekOf.localeCompare(b.weekOf)).at(-1); cat = r ? r.cat : null; }
      if (cat && counts[cat] !== undefined) { counts[cat]++; total++; }
    }
    return { month, counts, total };
  });
}
// Change of each category between the last month that has data and the one before it (null when there is no earlier month).
export function deltaVsPrevious(trend) {
  const withData = trend.filter((r) => r.total > 0); if (withData.length < 2) return null;
  const [a, b] = [withData.at(-2), withData.at(-1)];
  return Object.fromEntries(CATS.map((c) => [c, (b.counts[c] || 0) - (a.counts[c] || 0)]));
}
export function lastWeeks(today, n) { const cur = weekStart(today); return Array.from({ length: n }, (_, i) => addDays(cur, -7 * (n - 1 - i))); }
export function ragTrend(projects, weeks, today) {
  const curW = weekStart(today);
  return weeks.map((week) => {
    const row = { week, G: 0, A: 0, R: 0, total: 0 };
    for (const p of projects) {
      const r = (p.reports || []).find((x) => x.weekOf === week); const rag = r ? r.rag : week === curW ? p.live : null;
      if (rag && row[rag] !== undefined) { row[rag]++; row.total++; }
    }
    return row;
  });
}
export const quarterOf = (d) => (d ? `${d.slice(0, 4)}-Q${Math.floor((+d.slice(5, 7) - 1) / 3) + 1}` : "");
const AT_RISK_DAYS = 7;
// on time / at risk (1 to 7 days late) / delayed (more than 7 days late, or past due and not done)
function classify(base, fore, today, doneOn) {
  if (doneOn) return doneOn <= base ? "onTime" : "delayed";
  const late = calDays(base, fore || base);
  if (base < today && late <= 0) return "delayed";   // past due and still not achieved
  return late <= 0 ? "onTime" : late <= AT_RISK_DAYS ? "atRisk" : "delayed";
}
export function milestoneForecast(ms, today) {
  const by = new Map();
  for (const m of ms) {
    if (!m.base) continue; const q = quarterOf(m.base);
    const row = by.get(q) || { q, onTime: 0, atRisk: 0, delayed: 0, delayedItems: [] }; const c = classify(m.base, m.fore, today, m.done ? (m.achieved || m.fore) : "");
    row[c]++; if (c === "delayed") row.delayedItems.push({ name: m.name, base: m.base, fore: m.done ? (m.achieved || m.fore) : m.fore });
    by.set(q, row);
  }
  return [...by.values()].sort((a, b) => a.q.localeCompare(b.q)).map((r) => ({ ...r, delayedItems: r.delayedItems.sort((a, b) => a.name.localeCompare(b.name)) }));
}
export function releaseForecast(releases, today) {
  const by = new Map();
  for (const r of releases) {
    if (!r.planned) continue; const q = quarterOf(r.planned);
    const row = by.get(q) || { q, planned: 0, implemented: 0, onTime: 0, atRisk: 0, delayed: 0, atRiskOrDelayed: 0, items: [] };
    const c = classify(r.planned, r.forecast, today, r.implemented || "");
    row.planned++; if (r.implemented) row.implemented++; row[c]++; if (c !== "onTime") row.atRiskOrDelayed++; row.items.push({ ...r, cls: c });
    by.set(q, row);
  }
  return [...by.values()].sort((a, b) => a.q.localeCompare(b.q));
}
// Dashboard filters: segment, RAG, and a date window that must overlap the project's start–end.
export function filterProjects(ps, f) {
  return ps.filter((p) => (!f.segment || p.segment === f.segment) && (!f.rag || p.rag === f.rag)
    && (!f.from || !p.end || p.end >= f.from) && (!f.to || !p.start || p.start <= f.to));
}
