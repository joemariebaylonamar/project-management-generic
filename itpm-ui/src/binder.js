// Project binder rules (PB003, PB004, PB010, PB013, PB014). Pure functions; the UI reaches them through window.__ITPH_BINDER.
const RANK = { G: 0, A: 1, R: 2 };
const days = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);

export const worstRag = (rags) => rags.reduce((w, r) => (RANK[r] > RANK[w] ? r : w), "G");

// Aging = calendar days past the target date while the item is still open (its action item not Done). Not yet due = 0.
export function agingDays(item, today) {
  if (item.closed || item.actionStatus === "Done" || !item.target) return 0;
  return Math.max(0, days(item.target, today));
}
// Red 8+ days, Amber 3 to 7, Green up to 2 (the requirement's 2-day overlap resolved to Green).
export const agingRag = (d) => (d >= 8 ? "R" : d >= 3 ? "A" : "G");

export function tally(items, today) {
  const t = { R: 0, A: 0, G: 0, total: 0 };
  for (const i of items) { if (i.closed) continue; t[agingRag(agingDays(i, today))]++; t.total++; }
  return t;
}
// Risks and issues are the leading indicators: each is as bad as its worst open item; overall is the worse of the two.
export function leadingIndicator(items, today) {
  const of = (type) => worstRag(items.filter((i) => i.type === type && !i.closed).map((i) => agingRag(agingDays(i, today))));
  const risk = of("Risk"), issue = of("Issue");
  return { risk, issue, overall: worstRag([risk, issue]) };
}
// Approved reschedule and rebaseline change requests per approval month.
export function crTally(crs) {
  const m = new Map();
  for (const c of crs) {
    if (c.crStatus !== "Approved" || !c.approved || (c.crKind !== "Reschedule" && c.crKind !== "Rebaseline")) continue;
    const k = c.approved.slice(0, 7);
    const row = m.get(k) || { month: k, reschedule: 0, rebaseline: 0 };
    row[c.crKind === "Reschedule" ? "reschedule" : "rebaseline"]++; m.set(k, row);
  }
  return [...m.values()].sort((a, b) => a.month.localeCompare(b.month));
}
const PREFIX = { Dependency: "DEP", Defect: "DEF", "Change Request": "CR", Risk: "R", Issue: "I" };
export function nextItemNo(type, existing) {
  const pre = PREFIX[type] || "X";
  const max = existing.reduce((m, e) => { const x = new RegExp(`^${pre}-(\\d+)$`).exec(e.no || ""); return x ? Math.max(m, +x[1]) : m; }, 0);
  return `${pre}-${String(max + 1).padStart(3, "0")}`;
}
