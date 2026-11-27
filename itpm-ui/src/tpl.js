// ADM006 templates: workplan (scheduled when a project is created from it), WSR (prompts and required fields), dashboard (cards and default filters).
import { FIELDS } from "./wsr.js";
export const DEFAULT_WSR = { fields: Object.fromEntries(FIELDS.map((f) => [f.key, { prompt: "", required: true }])) };
export const DEFAULT_DASH = { cards: { status: true, rag: true, milestones: true, releases: true }, filters: { segment: "", rag: "" } };
export function parseTemplate(json, fallback) {
  fallback = JSON.parse(JSON.stringify(fallback)); // never hand out (or let callers edit) the shared defaults
  try { const v = JSON.parse(json || ""); return v && typeof v === "object" ? { ...fallback, ...v, ...(fallback.cards ? { cards: { ...fallback.cards, ...(v.cards || {}) } } : {}), ...(fallback.filters ? { filters: { ...fallback.filters, ...(v.filters || {}) } } : {}), ...(fallback.fields ? { fields: { ...fallback.fields, ...(v.fields || {}) } } : {}) } : fallback; }
  catch { return fallback; }
}
export const wsrRequired = (tpl) => FIELDS.filter((f) => (tpl?.fields?.[f.key] ?? { required: true }).required !== false).map((f) => f.key);

export function validateWorkplan(rows) {
  const out = []; const ids = new Set();
  for (const r of rows) { if (ids.has(r.id)) out.push(`Duplicate id ${r.id}`); ids.add(r.id); if (!String(r.name || "").trim()) out.push(`${r.id}: name is empty`); }
  for (const r of rows) {
    if (r.parent && !ids.has(r.parent)) out.push(`${r.id}: parent ${r.parent} does not exist`);
    for (const p of r.preds || []) if (!ids.has(p)) out.push(`${r.id}: predecessor ${p} does not exist`);
  }
  const by = Object.fromEntries(rows.map((r) => [r.id, r])); const state = {};
  const loop = (id) => { if (state[id] === 2) return false; if (state[id] === 1) return true; state[id] = 1; for (const p of by[id]?.preds || []) if (by[p] && loop(p)) return true; state[id] = 2; return false; };
  if (rows.some((r) => loop(r.id))) out.push("The predecessors make a loop");
  return out;
}
// Schedule a template's rows from `start` (finish-to-start, working days). Returns rows ready for the schedule.
export function instantiateWorkplan(tpl, start, { toWork, nextWD, addWD }) {
  const rows = tpl.rows; const by = Object.fromEntries(rows.map((r) => [r.id, r])); const done = {}; const out = [];
  const place = (r) => {
    if (done[r.id]) return done[r.id];
    if (r.type === "phase" || r.type === "deliverable" && rows.some((x) => x.parent === r.id)) { return (done[r.id] = { id: r.id, name: r.name, type: r.type, parent: r.parent || null }); }
    const ms = r.type === "milestone"; const dur = ms ? 1 : Math.max(1, +r.dur || 1);
    let s = toWork(start);
    for (const p of r.preds || []) { const pr = by[p] && place(by[p]); if (pr && pr.bFinish) { const c = nextWD(pr.bFinish); if (c > s) s = c; } }
    const f = ms ? s : addWD(s, dur - 1);
    return (done[r.id] = { id: r.id, name: r.name, type: ms ? "milestone" : r.type === "subtask" ? "subtask" : r.type === "deliverable" ? "deliverable" : "task", parent: r.parent || null, dur, preds: [...(r.preds || [])], pct: 0, ms, price: 0, manualFinish: "",
      bStart: s, bFinish: f, pStart: s, pFinish: f, aStart: "", aFinish: "", cost: +r.cost || 0, actual: 0 });
  };
  for (const r of rows) out.push(place(r));
  return out;
}
