// WBS hierarchy for the Project Hub schedule: Phase → Deliverable → Task → Subtask, with ◆ milestones.
// Pure functions over a project p = { start, pm, activities, wbs }:
//   p.activities — work items (leaf tasks/subtasks/deliverables and milestones): what the scheduler,
//                  S-curve, My tasks, PSR, LD and Ava read. Same shape as before.
//   p.wbs        — summary rows (phases, and deliverables/tasks that have children), rolled up from children.
// Every row is one ITPMD Activity record in Kissflow (spec: docs/superpowers/specs/2026-09-30-wbs-hierarchy-design.md).
export const TYPES = ["phase", "deliverable", "task", "subtask", "milestone"];
export const LABEL = { phase: "Phase", deliverable: "Deliverable", task: "Task", subtask: "Subtask", milestone: "Milestone" };
export const PARENTS = { phase: [null], deliverable: [null, "phase"], task: [null, "phase", "deliverable"], subtask: ["task"], milestone: [null, "phase", "deliverable"] };

export const typeOf = (r) => (TYPES.includes(r.type) ? r.type : r.ms ? "milestone" : "task");
export function fromKfType(v, isMs) {
  const raw = v && typeof v === "object" ? v.Name || v.value || v.name || "" : v;
  const t = String(raw || "").toLowerCase();
  return TYPES.includes(t) ? t : isMs ? "milestone" : "task";
}
export const toKfType = (t) => LABEL[t] || "Task";

const all = (p) => [...p.activities, ...(p.wbs || [])];
const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
export const findRow = (p, id) => all(p).find((r) => r.id === id);
export const children = (p, id) => all(p).filter((r) => (r.parent || null) === id).sort(byOrder);
export const descendants = (p, id) => children(p, id).flatMap((k) => [k, ...descendants(p, k.id)]);

export function splitRows(rows) {
  const by = new Map(rows.map((r) => [r.id, r]));
  rows.forEach((r, i) => {
    r.type = typeOf(r); r.parent = r.parent || null; delete r.warn;
    if (r.order === undefined || r.order === null || r.order === "" || Number.isNaN(r.order)) r.order = i;
  });
  for (const r of rows) if (r.parent && !by.has(r.parent)) { r.warn = `Parent ${r.parent} not found`; r.parent = null; }
  for (const r of rows) {
    const seen = new Set([r.id]); let x = r;
    while (x.parent) {
      if (seen.has(x.parent)) { r.warn = "Circular parent link"; r.parent = null; break; }
      seen.add(x.parent); x = by.get(x.parent);
    }
  }
  for (const r of rows) {
    const pt = r.parent ? by.get(r.parent).type : null;
    if (!PARENTS[r.type].includes(pt)) r.warn = r.warn || `${LABEL[r.type]} can't sit under ${pt ? LABEL[pt] : "the top level"}`;
  }
  const hasKids = new Set(rows.filter((r) => r.parent).map((r) => r.parent));
  const activities = [], wbs = [];
  for (const r of rows) {
    r.sum = r.type === "phase" || ((r.type === "deliverable" || r.type === "task") && hasKids.has(r.id));
    (r.sum ? wbs : activities).push(r);
  }
  const warnings = rows.filter((r) => r.warn).map((r) => `${r.id}: ${r.warn}`);
  return { activities, wbs, warnings };
}

// display order with outline numbers; `last` = last of its siblings, `guides[k]` = the level-k ancestor line
// continues below this row (draw │), for tree connector lines
export function tree(p, collapsed = new Set()) {
  const out = [];
  const walk = (parent, depth, prefix, hidden, guides) => {
    const sib = children(p, parent);
    sib.forEach((r, i) => {
      const no = prefix ? `${prefix}.${i + 1}` : String(i + 1);
      const kids = children(p, r.id).length; const last = i === sib.length - 1;
      out.push({ row: r, depth, no, hasKids: kids > 0, hidden, last, guides });
      walk(r.id, depth + 1, no, hidden || collapsed.has(r.id), [...guides, !last]);
    });
  };
  walk(null, 0, "", false, []);
  return out;
}

const workUnder = (p, id) => descendants(p, id).filter((r) => !r.sum);
const minOf = (xs) => xs.filter(Boolean).sort()[0] || "";
const maxOf = (xs) => xs.filter(Boolean).sort().pop() || "";
const RANK = (s) => (s.k === "behind" ? (s.r === "R" ? 5 : 4) : s.k === "prog" || s.k === "ahead" ? 3 : s.k === "ns" ? 2 : 1);

// summary rows take their dates, % and status from the work items under them (run after schedule(p))
export function rollUp(p, { wdDiff, actState }) {
  if (!p.wbs) p.wbs = [];
  for (const s of p.wbs) {
    const w = workUnder(p, s.id);
    if (!w.length) { Object.assign(s, { bStart: "", bFinish: "", fStart: "", fFinish: "", dur: 0, pct: 0, state: null, cost: 0, actual: 0 }); continue; }
    s.cost = w.filter((a) => !a.ms).reduce((n, a) => n + (+a.cost || 0), 0); // budget: milestones carry a payment value, not a budget
    s.actual = w.filter((a) => !a.ms).reduce((n, a) => n + (+a.actual || 0), 0);
    s.bStart = minOf(w.map((a) => a.bStart)); s.bFinish = maxOf(w.map((a) => a.bFinish));
    s.fStart = minOf(w.map((a) => a.aStart || a.fStart)); s.fFinish = maxOf(w.map((a) => a.fFinish));
    s.dur = s.fStart && s.fFinish ? wdDiff(s.fStart, s.fFinish) + 1 : 0;
    const work = w.filter((a) => !a.ms); const tot = work.reduce((n, a) => n + (a.dur || 0), 0);
    s.pct = tot ? work.reduce((n, a) => n + (a.dur || 0) * (a.pct || 0), 0) / tot : w.every((a) => a.pct >= 100) ? 100 : 0;
    const states = w.map(actState);
    let worst = states.reduce((m, x) => (RANK(x) > RANK(m) ? x : m));
    if (worst.k === "ns" && states.some((x) => x.k !== "ns")) worst = { k: "prog", l: "In progress", r: "I" };
    s.state = worst;
  }
}

const PREFIX = { phase: "P", deliverable: "D", task: "N", subtask: "N", milestone: "X" };

export function allowedParents(p, type, selfId) {
  const bad = selfId ? new Set([selfId, ...descendants(p, selfId).map((r) => r.id)]) : new Set();
  const opts = PARENTS[type].includes(null) ? [{ id: null, label: "(top level)" }] : [];
  for (const r of all(p)) if (!bad.has(r.id) && PARENTS[type].includes(r.type)) opts.push({ id: r.id, label: `${r.id} · ${r.name}` });
  return opts;
}
// ids continue after the highest number in use (or handed out earlier this session), so a deleted item's id
// isn't given to a new one — history lines and links keep meaning what they meant
export function nextId(p, type) {
  const rows = all(p); const used = new Set(rows.map((r) => r.id));
  const high = rows.reduce((m, r) => Math.max(m, +(String(r.id).match(/\d+$/) || [0])[0]), 0);
  let n = Math.max(high, rows.length, p._idHigh || 0) + 1; while (used.has(PREFIX[type] + n)) n++;
  p._idHigh = n;
  return PREFIX[type] + n;
}
export const nextOrder = (p) => all(p).reduce((m, r) => Math.max(m, r.order ?? -1), -1) + 1;
const placeError = (p, type, parent, selfId) => (allowedParents(p, type, selfId).some((o) => o.id === (parent || null))
  ? null : `${LABEL[type]} can't go under ${parent || "the top level"}.`);

// a work item that receives its first child becomes a summary row: its links move to `target`, and so do its
// owner and progress when `target` is a newly added child (a moved item keeps its own)
function toSummary(p, row, target, inherit) {
  p.activities = p.activities.filter((r) => r !== row);
  row.sum = true; p.wbs.push(row);
  if (target) {
    target.preds = [...new Set([...(row.preds || []), ...(target.preds || [])])].filter((x) => x !== target.id && x !== row.id);
    if (inherit && !target.sum) Object.assign(target, { owner: row.owner || target.owner, pct: row.pct || 0, aStart: row.aStart || "", aFinish: row.aFinish || "" });
  }
  for (const a of p.activities) if (a !== target) a.preds = (a.preds || []).map((x) => (x === row.id ? (target ? target.id : null) : x)).filter(Boolean);
  row.preds = [];
}
// a deliverable/task whose last child left becomes a work item again
function toLeaf(p, row) {
  if (row.type === "phase" || !row.sum || children(p, row.id).length) return false;
  p.wbs = p.wbs.filter((r) => r !== row);
  const d = row.bStart || p.start;
  Object.assign(row, { sum: false, dur: 1, preds: [], pct: 0, ms: false, price: 0, manualFinish: "", owner: row.owner || p.pm,
    bStart: d, bFinish: d, pStart: d, pFinish: d, aStart: "", aFinish: "" });
  p.activities.push(row);
  return true;
}

// place `item` among its siblings: right after sibling `after`, else last
function placeAmongSiblings(p, item, after) {
  const sib = children(p, item.parent).filter((x) => x !== item);
  const i = after ? sib.findIndex((x) => x.id === after) : -1;
  if (i < 0) { item.order = nextOrder(p); return; }
  sib.splice(i + 1, 0, item);
  sib.forEach((x, k) => { x.order = k; });
}

export function addItem(p, item, { after } = {}) {
  if (!p.wbs) p.wbs = [];
  const err = placeError(p, item.type, item.parent);
  if (err) return { ok: false, error: err };
  item.parent = item.parent || null; placeAmongSiblings(p, item, after);
  if (item.type === "phase") { item.sum = true; p.wbs.push(item); return { ok: true, converted: null }; }
  item.sum = false; item.preds = item.preds || [];
  const parent = item.parent && findRow(p, item.parent);
  let converted = null;
  p.activities.push(item);
  if (parent && !parent.sum) { toSummary(p, parent, item, true); converted = parent.id; }
  return { ok: true, converted };
}

export function moveRow(p, id, newParent) {
  const r = findRow(p, id); if (!r) return { ok: false, error: `${id} not found.` };
  newParent = newParent || null;
  const err = placeError(p, r.type, newParent, id); if (err) return { ok: false, error: err };
  const old = r.parent; r.parent = newParent; r.order = nextOrder(p);
  let converted = null, movedTo = null, reverted = null;
  const np = newParent && findRow(p, newParent);
  if (np && !np.sum) {
    const target = r.sum ? descendants(p, r.id).find((x) => !x.sum) || null : r;
    toSummary(p, np, target, false); converted = np.id; movedTo = target ? target.id : null;
  }
  const op = old && findRow(p, old);
  if (op && toLeaf(p, op)) reverted = op.id;
  return { ok: true, converted, movedTo, reverted };
}

export function reorder(p, id, dir) {
  const r = findRow(p, id); if (!r) return false;
  const sib = children(p, r.parent || null); const i = sib.indexOf(r); const j = i + dir;
  if (j < 0 || j >= sib.length) return false;
  sib.forEach((x, k) => { x.order = k; });
  [sib[i].order, sib[j].order] = [sib[j].order, sib[i].order];
  return true;
}

export const canDelete = (p, id) => !!findRow(p, id) && children(p, id).length === 0;
export function removeRow(p, id) {
  const r = findRow(p, id); if (!r) return { ok: false, reverted: null, error: `${id} not found.` };
  if (!canDelete(p, id)) return { ok: false, reverted: null, error: `${id} still has items under it. Move or delete them first.` };
  p.activities = p.activities.filter((x) => x !== r); p.wbs = (p.wbs || []).filter((x) => x !== r);
  for (const a of p.activities) a.preds = (a.preds || []).filter((x) => x !== id);
  const op = r.parent && findRow(p, r.parent);
  return { ok: true, reverted: op && toLeaf(p, op) ? op.id : null };
}

export function breadcrumb(p, id) {
  const names = []; let r = findRow(p, id);
  while (r && r.parent) { r = findRow(p, r.parent); if (r) names.unshift(r.name); }
  return names.join(" › ");
}

// predecessors of work item `id` must be other work items and must not make a dependency loop
export function checkPreds(p, id, preds) {
  const work = new Map(p.activities.map((a) => [a.id, a]));
  for (const x of preds) {
    if (x === id) return `${id} can't depend on itself.`;
    if (!work.has(x)) return findRow(p, x) ? `${x} is a summary row; link to one of its tasks or milestones instead.` : `${x} doesn't exist in this schedule.`;
  }
  const dependsOn = (from, seen = new Set()) => {
    if (from === id) return true; if (seen.has(from)) return false; seen.add(from);
    return (work.get(from)?.preds || []).some((x) => dependsOn(x, seen));
  };
  const loop = preds.find((x) => dependsOn(x));
  return loop ? `${loop} already depends on ${id}; that would make a loop.` : null;
}

/* ---------- predecessors with lead/lag (WP003, WP004) ---------- */
// Text form: "A1, A2+3, A3-2" — id, then optional +n lag / -n lead in working days (finish-to-start).
export function parsePreds(text) {
  const ids = [], lags = {};
  for (const tok of String(text || "").split(/[\s,;]+/)) {
    const m = /^([A-Za-z0-9_.]+?)(?:([+-])(\d+))?$/.exec(tok.trim());
    if (!m) continue;
    const id = m[1].toUpperCase();
    if (!ids.includes(id)) ids.push(id);
    const n = m[2] ? (m[2] === "-" ? -1 : 1) * Number(m[3]) : 0;
    if (n) lags[id] = n;
  }
  return { ids, lags };
}
export function formatPreds(ids, lags) {
  return (ids || []).map((id) => { const n = (lags || {})[id] || 0; return n ? `${id}${n > 0 ? "+" : "-"}${Math.abs(n)}` : id; }).join(",");
}
// Earliest start allowed by the predecessors, or null when there are none. `fns` = { nextWD, prevWD } (holiday-aware).
export function predConstraint(a, by, fns) {
  let best = null;
  for (const id of a.preds || []) {
    if (!by[id]) continue;
    let d = fns.nextWD(by[id].fFinish);
    const lag = (a.lags || {})[id] || 0;
    for (let i = 0; i < Math.abs(lag); i++) d = lag > 0 ? fns.nextWD(d) : fns.prevWD(d);
    if (!best || d > best) best = d;
  }
  return best;
}
export function successorsOf(p, id) {
  return p.activities.filter((a) => (a.preds || []).includes(id)).map((a) => a.id);
}

/* ---------- schedule KPI (WP027, WSR004) ---------- */
// KPI = %Actual / %Planned. %Planned = 0 → null (shown "n/a", RAG Green).
export function scheduleKpi(actualPct, plannedPct) {
  return plannedPct > 0 ? actualPct / plannedPct : null;
}
// Red <= 0.70, Green >= 0.90, Amber strictly between.
export function kpiRag(k) {
  if (k === null || k === undefined || Number.isNaN(k)) return "G";
  return k <= 0.7 ? "R" : k >= 0.9 ? "G" : "A";
}

/* ---------- critical path (WP010) ---------- */
// Zero total float on the forecast dates. `idx(date)` maps a date to a working-day number (holiday-aware).
// Link rule (finish-to-start): start(succ) >= finish(pred) + 1 + lag, in working days. Completed items are not critical.
export function criticalPath(acts, idx) {
  const by = new Map(acts.map((a) => [a.id, a]));
  const succ = new Map(acts.map((a) => [a.id, []]));
  for (const a of acts) for (const x of a.preds || []) if (by.has(x)) succ.get(x).push(a);
  const ES = new Map(), EF = new Map();
  for (const a of acts) { ES.set(a.id, idx(a.fStart)); EF.set(a.id, idx(a.fFinish)); }
  const end = acts.length ? Math.max(...acts.map((a) => EF.get(a.id))) : 0;
  const LF = new Map();
  const lf = (a) => {
    if (LF.has(a.id)) return LF.get(a.id);
    let v = end;
    for (const s of succ.get(a.id)) {
      const lag = (s.lags || {})[a.id] || 0;
      v = Math.min(v, lf(s) - (EF.get(s.id) - ES.get(s.id)) - 1 - lag);
    }
    LF.set(a.id, v); return v;
  };
  const out = new Set();
  for (const a of acts) if ((a.pct || 0) < 100 && lf(a) - EF.get(a.id) <= 0) out.add(a.id);
  return out;
}
