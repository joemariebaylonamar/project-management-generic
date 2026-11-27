/* ---------------- WBS hierarchy UI (Phase → Deliverable → Task → Subtask, ◆ milestones) ----------------
   Injected into the prototype by scripts/make-index.mjs. Tree logic: src/wbs.js (window.__ITPH_WBS). */
function wbsCollapsed(p) {
  ui.wbsShut = ui.wbsShut || {};
  if (!ui.wbsShut[p.id]) { let ids = []; try { ids = JSON.parse(localStorage.getItem(PREF + '-wbs-' + p.id) || '[]'); } catch (e) {} ui.wbsShut[p.id] = new Set(ids); }
  return ui.wbsShut[p.id];
}
function wbsKeepCollapsed(p) { try { localStorage.setItem(PREF + '-wbs-' + p.id, JSON.stringify([...wbsCollapsed(p)])); } catch (e) {} }
const wbsCrumb = (p, id) => { const c = window.__ITPH_WBS ? window.__ITPH_WBS.breadcrumb(p, id) : ''; return c ? ' · ' + esc(c) : ''; };
function wbsTog(p, r, hasKids) {
  if (!hasKids) return '<span class="wbs-tog"></span>';
  const shut = wbsCollapsed(p).has(r.id);
  return `<button class="wbs-tog" data-a="wbstog" data-id="${r.id}" aria-expanded="${!shut}" aria-label="${shut ? 'Expand' : 'Collapse'} ${esc(r.name)}">${shut ? '▸' : '▾'}</button>`;
}
function wbsAcceptCell(p, r, ed) {
  if (r.type !== 'deliverable') return '';
  if (ed) return `<label class="wbs-acc ${r.accepted ? 'on' : ''}"><input type="checkbox" data-c="wbsacc" data-p="${p.id}" data-id="${r.id}" ${r.accepted ? 'checked' : ''}> Accepted${r.accepted && r.acceptedDate ? ' ' + fds(r.acceptedDate) : ''}</label>`;
  return r.accepted ? `<span class="wbs-acc on">Accepted ${fds(r.acceptedDate)}</span>` : '<span class="wbs-acc">Not accepted</span>';
}
const wbsWarn = r => r.warn ? ` <span class="wbs-warn" title="${esc(r.warn)}" aria-label="${esc(r.warn)}">⚠</span>` : '';
function wbsMenu(p, r, ed) {
  if (!ed) return '';
  const open = ui.wbsMenu === r.id;
  const btn = `<button class="btn sm ghost" data-a="wbsmenu" data-id="${r.id}" aria-label="More actions for ${esc(r.id)}" aria-expanded="${open}">⋯</button>`;
  if (!open) return `<span class="wbs-plus-w">${btn}</span>`;
  const opts = window.__ITPH_WBS.allowedParents(p, r.type, r.id);
  return `<span class="wbs-plus-w">${btn}<div class="wbs-menu" role="group" aria-label="Actions for ${esc(r.id)}">
    <button class="btn sm ghost" data-a="wbsup" data-id="${r.id}">Move up</button><button class="btn sm ghost" data-a="wbsdown" data-id="${r.id}">Move down</button>
    <select class="inp" style="height:30px;max-width:200px" data-c="wbsparent" data-p="${p.id}" data-id="${r.id}" aria-label="Move ${esc(r.id)} under"><option value="__">Move under…</option>${opts.map(o => `<option value="${o.id || ''}" ${(o.id || null) === (r.parent || null) ? 'disabled' : ''}>${esc(o.label)}</option>`).join('')}</select>
    <button class="btn sm ghost danger" data-a="wbsdel" data-id="${r.id}">${ui.confirm === 'wbsdel' + r.id ? 'Confirm delete' : 'Delete'}</button></div></span>`;
}
const WBS_ICON = {
  phase: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.75 4.25v8.5c0 .41.34.75.75.75h11c.41 0 .75-.34.75-.75V6.25a.75.75 0 0 0-.75-.75H7.9L6.4 3.5H2.5a.75.75 0 0 0-.75.75z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  deliverable: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.9 13.6 4.8v6.4L8 14.1 2.4 11.2V4.8zM2.6 4.9 8 7.7l5.4-2.8M8 7.7v6.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  task: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="4.2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  subtask: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.4" fill="currentColor"/></svg>',
  milestone: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5 13.5 8 8 13.5 2.5 8z" fill="currentColor"/></svg>',
};
// tree connector lines, drawn over the full height of the cell (its container is position:relative, 12px left
// padding, 16px per level): │ for each ancestor level that continues, ├ / └ into this row, and a stub down from
// an expanded parent's toggle to its first child
function wbsLines(p, n) {
  const x = col => `left:${12 + col * 16 + 7}px`; let out = '';
  for (let k = 1; k < n.depth; k++) if (n.guides[k]) out += `<i class="wbs-ln v" style="${x(k - 1)}"></i>`;
  if (n.depth) out += `<i class="wbs-ln ${n.last ? 'l' : 't'}" style="${x(n.depth - 1)}"></i>`;
  if (n.hasKids && !wbsCollapsed(p).has(n.row.id)) out += `<i class="wbs-ln s" style="${x(n.depth)}"></i>`;
  return out;
}
const wbsIndent = n => `style="padding-left:${n.depth * 16}px"`;
const wbsMoney = n => (+n ? Math.round(+n).toLocaleString('en-PH') : '—');
// "350000", "350,000", "₱350k", "1.2M" → pesos
function wbsParseMoney(v) {
  const m = String(v).replace(/[₱,\s]/g, '').match(/^(\d*\.?\d+)([kKmM]?)$/); if (!m) return null;
  return Math.round(+m[1] * (/k/i.test(m[2]) ? 1e3 : /m/i.test(m[2]) ? 1e6 : 1));
}
// the whole WBS budget (work items; milestones carry payment values, not budget) vs the current approved budget
const wbsBudget = p => p.activities.filter(a => !a.ms).reduce((n, a) => n + (+a.cost || 0), 0);
const wbsActual = p => p.activities.filter(a => !a.ms).reduce((n, a) => n + (+a.actual || 0), 0);
function wbsBudgetNote(p) {
  const tot = wbsBudget(p); const cur = fin(p).current; const gap = cur - tot;
  const act = wbsActual(p); const pa = +p.fin.actual || 0;
  return `<span class="wbs-bud ${gap < 0 ? 'over' : ''}">WBS budget <b>${pesoFull(tot)}</b> of ${pesoFull(cur)} approved · ${gap < 0 ? `<b>${pesoFull(-gap)} over</b>` : `${pesoFull(gap)} not yet allocated`}</span>`
    + (act || pa ? `<span class="wbs-bud"> · Task actuals <b>${pesoFull(act)}</b> of ${pesoFull(pa)} project actual${pa > act ? ` (${pesoFull(pa - act)} not assigned to a task)` : pa < act ? ' (tasks exceed the project figure; update Financials)' : ''}</span>` : '');
}
const wbsIsEditing = (id, f) => ui.wbsEdit && ui.wbsEdit.id === id && ui.wbsEdit.f === f;
const wbsEditInput = (id, f, value, label, cls = '') => `<input class="inp wbs-in ${cls}" data-wbs-edit="${f}" data-id="${id}" value="${esc(value)}" aria-label="${label}">`;
function wbsNameCell(p, n, ed) {
  const r = n.row; const W = window.__ITPH_WBS;
  const name = wbsIsEditing(r.id, 'name') ? wbsEditInput(r.id, 'name', r.name, `Name of ${r.id}`)
    : `<b class="wbs-nm ${r.sum ? 'sum' : ''} ${ed ? 'wbs-click' : ''}" ${ed ? `data-a="wbsedit" data-f="name" data-id="${r.id}" title="Click to rename"` : ''}>${esc(r.name)}</b>`;
  return `${wbsLines(p, n)}<div class="wbs-tree" ${wbsIndent(n)}>${wbsTog(p, r, n.hasKids)}<span class="wbs-ic ${r.type}" title="${W.LABEL[r.type]}">${WBS_ICON[r.type] || ''}</span>${name}${r.sum ? ` <span class="wbs-type">${W.LABEL[r.type]}</span>` : ''}${wbsWarn(r)} ${wbsAcceptCell(p, r, ed)}${wbsPlus(p, r, ed)}</div>`;
}
function wbsWorkRow(p, n, ed, assignable) {
  const a = n.row; const st = actState(a); const late = a.fFinish > a.bFinish; const ea = canEditAct(p, a);
  const W0 = window.__ITPH_WBS; const predTxt = W0.formatPreds(a.preds, a.lags).replace(/,/g, ', '); const succ = W0.successorsOf(p, a.id);
  const preds = (ed ? `<button class="wbs-click wbs-predbtn mono" data-a="wbspred" data-id="${a.id}" title="Choose predecessors, with lead (−) or lag (+) in working days" aria-haspopup="dialog">${predTxt || '+'}</button>` : (predTxt || '—'))
    + (succ.length ? `<div class="faint" style="font-size:10.5px" title="Successors: tasks that start after this one">→ ${succ.join(', ')}</div>` : '');
  const dur = a.ms ? a.dur : wbsIsEditing(a.id, 'dur') ? wbsEditInput(a.id, 'dur', a.dur, `Duration of ${a.id}`, 'xs num')
    : ed && !a.aStart ? `<span class="wbs-click" data-a="wbsedit" data-f="dur" data-id="${a.id}" title="Click to change the duration">${a.dur}</span>` : a.dur;
  return `<tr class="${a.ms ? 'ms' : ''} ${a.pct >= 100 ? 'done' : ''} ${a.owner === ui.me ? 'mine' : ''}"><td class="mono faint">${n.no}</td><td class="mono">${a.id}${p.crit && p.crit.has(a.id) ? '<span class="cp-tag" title="On the critical path: no float">CP</span>' : ''}</td>
    <td class="wbs-tc">${wbsNameCell(p, n, ed)}</td>
    <td>${ed ? `<select class="inp" style="height:30px;max-width:160px" data-c="owner" data-p="${p.id}" data-id="${a.id}" aria-label="Assign ${esc(a.id)}">${assignable.map(u => `<option value="${u.id}" ${u.id === a.owner ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>` : `<span class="who-chip"><span class="av">${initialsOf(a.owner)}</span>${esc(uname(a.owner))}</span>`}</td>
    <td class="mono faint">${preds}</td><td class="r num">${dur}</td>
    <td class="r num">${a.ms ? '<span class="faint">—</span>' : wbsIsEditing(a.id, 'cost') ? wbsEditInput(a.id, 'cost', a.cost || '', `Budget of ${a.id}`, 'xs num')
      : ed ? `<span class="wbs-click" data-a="wbsedit" data-f="cost" data-id="${a.id}" title="Click to set the budget (₱)">${wbsMoney(a.cost)}</span>` : wbsMoney(a.cost)}</td>
    <td class="r num" style="${!a.ms && +a.cost && +a.actual > +a.cost ? 'color:var(--bad);font-weight:600' : ''}">${a.ms ? '<span class="faint">—</span>' : wbsIsEditing(a.id, 'actual') ? wbsEditInput(a.id, 'actual', a.actual || '', `Actual cost of ${a.id}`, 'xs num')
      : ed ? `<span class="wbs-click" data-a="wbsedit" data-f="actual" data-id="${a.id}" title="Click to record the actual cost (₱)">${wbsMoney(a.actual)}</span>` : wbsMoney(a.actual)}</td>
    <td class="num" style="white-space:nowrap">${fds(a.bStart)} – ${fds(a.bFinish)}</td>
    <td>${ea ? `<input type="date" class="inp date" value="${a.aStart}" data-c="act" data-p="${p.id}" data-f="aStart" data-id="${a.id}" aria-label="Actual start ${esc(a.id)}">` : fd(a.aStart)}</td>
    <td>${ea ? `<input type="date" class="inp date" value="${a.aFinish}" data-c="act" data-p="${p.id}" data-f="aFinish" data-id="${a.id}" aria-label="Actual finish ${esc(a.id)}">` : fd(a.aFinish)}</td>
    <td class="r">${ea ? `<input type="number" min="0" max="100" step="5" class="inp xs num" value="${a.pct}" data-c="act" data-p="${p.id}" data-f="pct" data-id="${a.id}" aria-label="Percent complete ${esc(a.id)}">` : a.pct + '%'}</td>
    <td class="num" style="white-space:nowrap;color:${late ? 'var(--bad)' : 'inherit'};font-weight:${late ? 600 : 400}">${fd(a.fFinish)}</td>
    <td>${ed && !a.aFinish ? `<input type="date" class="inp date" value="${a.manualFinish}" data-c="act" data-p="${p.id}" data-f="manualFinish" data-id="${a.id}" aria-label="Manual forecast ${esc(a.id)}">` : '<span class="faint">—</span>'}</td>
    <td>${pill(st.r, st.l)}</td>
    <td><div class="row" style="flex-wrap:nowrap;gap:4px"><button class="btn sm ghost" data-a="discuss" data-p="${p.id}" data-ref="act:${a.id}" title="Discuss this activity" aria-label="Discuss ${esc(a.id)}">${ic.chat}</button>${wbsMenu(p, a, ed)}</div></td></tr>`;
}
function wbsSumRow(p, n, ed) {
  const r = n.row; const blank = !r.fFinish;
  return `<tr class="wbs-sum wbs-${r.type}"><td class="mono faint">${n.no}</td><td class="mono">${r.id}</td>
    <td class="wbs-tc">${wbsNameCell(p, n, ed)}</td>
    <td><span class="faint">—</span></td><td class="mono faint">—</td><td class="r num">${blank ? '—' : r.dur}</td><td class="r num"><b>${wbsMoney(r.cost)}</b></td><td class="r num" style="${+r.cost && +r.actual > +r.cost ? 'color:var(--bad)' : ''}"><b>${wbsMoney(r.actual)}</b></td>
    <td class="num" style="white-space:nowrap">${blank ? '—' : `${fds(r.bStart)} – ${fds(r.bFinish)}`}</td><td class="faint">—</td><td class="faint">—</td>
    <td class="r num">${blank ? '—' : Math.round(r.pct) + '%'}</td><td class="num" style="white-space:nowrap">${blank ? '—' : fd(r.fFinish)}</td><td class="faint">—</td>
    <td>${blank || !r.state ? '<span class="faint">—</span>' : pill(r.state.r, r.state.l)}</td>
    <td><div class="row" style="flex-wrap:nowrap;gap:4px"><button class="btn sm ghost" data-a="discuss" data-p="${p.id}" data-ref="act:${r.id}" title="Discuss" aria-label="Discuss ${esc(r.id)}">${ic.chat}</button>${wbsMenu(p, r, ed)}</div></td></tr>`;
}
// "+" on a row: the valid things to add under it (by the placement rules) or right below it
function wbsAddChoices(p, r) {
  const W = window.__ITPH_WBS; const out = [];
  for (const t of W.TYPES) if (W.PARENTS[t].includes(r.type)) out.push({ t, m: 'under', l: `Add ${W.LABEL[t].toLowerCase()} under` });
  const pt = r.parent ? W.findRow(p, r.parent)?.type || null : null;
  const fitsHere = t => W.PARENTS[t].includes(pt);
  if (fitsHere(r.type)) out.push({ t: r.type, m: 'below', l: `Add ${W.LABEL[r.type].toLowerCase()} below` });
  if (r.type !== 'milestone' && fitsHere('milestone')) out.push({ t: 'milestone', m: 'below', l: 'Add milestone below' });
  return out;
}
function wbsPlus(p, r, ed) {
  if (!ed) return '';
  const ch = wbsAddChoices(p, r); if (!ch.length) return '';
  const open = ui.wbsPlus === r.id;
  return `<span class="wbs-plus-w"><button class="wbs-plus" data-a="wbsplus" data-id="${r.id}" aria-label="Add next to ${esc(r.name)}" aria-expanded="${open}" title="Add">+</button>${open ? `<span class="wbs-plus-menu" role="menu">${ch.map(c => `<button class="btn sm ghost" role="menuitem" data-a="wbsnew" data-id="${r.id}" data-t="${c.t}" data-m="${c.m}">${c.l}</button>`).join('')}</span>` : ''}</span>`;
}
// the row being typed in: ui.wbsNew = { type, parent, after, anchor } — nothing is saved until it has a name
function wbsGhostRow(p, depth) {
  const W = window.__ITPH_WBS; const g = ui.wbsNew;
  return `<tr class="wbs-new"><td class="mono faint">new</td><td></td><td><div class="wbs-tree" style="padding-left:${depth * 16}px"><span class="wbs-tog"></span><span class="wbs-ic ${g.type}">${WBS_ICON[g.type]}</span>
    <input class="inp wbs-in" data-wbs-edit="new" data-id="__new" placeholder="Name of the new ${W.LABEL[g.type].toLowerCase()}" aria-label="Name of the new ${W.LABEL[g.type].toLowerCase()}"></div></td>
    <td colspan="13" class="faint" style="font-size:12px">Enter to add${g.type === 'phase' ? '' : ' · starts today, 5 working days, assigned to the PM (change after)'} · Esc to cancel</td></tr>`;
}
// the tree rows to show: everything (minus collapsed), or — when filtered to "mine" — matching work items and their ancestors
function wbsVisible(p, acts) {
  const W = window.__ITPH_WBS; const nodes = W.tree(p, wbsCollapsed(p));
  if (acts.length === p.activities.length) return nodes.filter(n => !n.hidden);
  const keep = new Set();
  for (const a of acts) { keep.add(a.id); let r = a; while (r && r.parent) { keep.add(r.parent); r = W.findRow(p, r.parent); } }
  return nodes.filter(n => !n.hidden && keep.has(n.row.id));
}
function schedRows(p, acts, ed, assignable) {
  const W = window.__ITPH_WBS; const rows = wbsVisible(p, acts); const filtered = acts.length !== p.activities.length;
  const bar = `<tr class="wbs-bar"><td colspan="16"><div class="row" style="gap:6px">${ed && !filtered ? `<button class="btn sm" data-a="wbsnew" data-t="phase" data-m="top">+ Phase</button><button class="btn sm" data-a="wbsnew" data-t="task" data-m="top">+ Task</button>` : ''}${(p.wbs || []).length ? `<button class="btn sm ghost" data-a="wbsall" data-m="open">Expand all</button><button class="btn sm ghost" data-a="wbsall" data-m="shut">Collapse all</button>` : ''}<span style="flex:1"></span>${p.activities.length ? wbsBudgetNote(p) : ''}</div></td></tr>`;
  const g = ed && ui.wbsNew && ui.wbsNew.pid === p.id ? ui.wbsNew : null;
  // the ghost row goes after the last visible row inside its anchor (the row it was added under / below), else at the end
  let at = rows.length; let depth = 0;
  if (g && g.anchor) {
    const i = rows.findIndex(n => n.row.id === g.anchor);
    if (i >= 0) { const d = rows[i].depth; at = i + 1; while (at < rows.length && rows[at].depth > d) at++; depth = g.mode === 'under' ? d + 1 : d; }
  }
  const html = rows.map(n => n.row.sum ? wbsSumRow(p, n, ed) : wbsWorkRow(p, n, ed, assignable));
  if (g) html.splice(at, 0, wbsGhostRow(p, depth));
  if (!html.length) return bar + `<tr><td colspan="16" class="empty">${filtered ? 'No activities assigned to you in this project.' : 'Nothing in the schedule yet. Use + Phase or + Task above.'}</td></tr>`;
  return bar + html.join('');
}
// predecessor picker (a small dialog; the table container clips pop-overs): valid work items with checkboxes,
// grouped under their phases/deliverables, items that would make a loop disabled, search by ID or name
function wbsPredDialog(p) {
  const W = window.__ITPH_WBS; const a = ui.wbsPred && W.findRow(p, ui.wbsPred); if (!a || a.sum) return '';
  const cur = new Set(a.preds);
  const items = W.tree(p).filter(n => n.row.id !== a.id).map(n => {
    const r = n.row; const pad = `style="padding-left:${8 + n.depth * 16}px"`;
    if (r.sum) return `<div class="wbs-pd-grp" data-q="${esc((r.id + ' ' + r.name).toLowerCase())}" ${pad}><span class="wbs-ic ${r.type}">${WBS_ICON[r.type]}</span>${esc(r.name)} <span class="faint mono">${n.no}</span></div>`;
    const err = cur.has(r.id) ? null : W.checkPreds(p, a.id, [r.id]);
    return `<label class="wbs-pd-it ${err ? 'off' : ''}" data-q="${esc((r.id + ' ' + r.name).toLowerCase())}" ${pad} ${err ? `title="${esc(err)}"` : ''}><input type="checkbox" value="${r.id}" ${cur.has(r.id) ? 'checked' : ''} ${err ? 'disabled' : ''}>
      <span class="wbs-ic ${r.type}">${WBS_ICON[r.type]}</span><span class="mono faint">${r.id}</span> ${esc(r.name)}${err ? ' <span class="faint">(would make a loop)</span>' : ''}
      <input class="inp wbs-pd-lag" type="number" step="1" data-lag="${r.id}" value="${(a.lags || {})[r.id] || 0}" title="Lag (+) or lead (−) in working days" aria-label="Lag in working days after ${esc(r.id)}" style="width:58px;height:24px;margin-left:auto"></label>`;
  }).join('');
  return `<div class="wbs-pd-back" data-a="wbspredcancel"></div><div class="wbs-pd" role="dialog" aria-modal="true" aria-label="Predecessors of ${esc(a.id)}">
    <div class="wbs-pd-h"><b>Predecessors</b> <span class="faint">of <span class="mono">${a.id}</span> ${esc(a.name)}</span></div>
    <input class="inp wbs-pd-q" data-wbs-predq placeholder="Search by ID or name" aria-label="Search predecessors">
    <div class="wbs-pd-list">${items || '<p class="muted" style="padding:8px">No other tasks or milestones yet.</p>'}</div>
    <div class="row wbs-pd-f"><span class="faint" style="font-size:12px">It starts after all the ticked items finish. Lag (+) or lead (−) is in working days.</span><span style="flex:1"></span><button class="btn sm" data-a="wbspredcancel">Cancel</button><button class="btn sm pri" data-a="wbspredsave">Save</button></div></div>`;
}
function wbsPredSave() {
  const p = proj(ui.sel); const W = window.__ITPH_WBS; const a = ui.wbsPred && W.findRow(p, ui.wbsPred); if (!a) { ui.wbsPred = null; return; }
  const list = [...document.querySelectorAll('.wbs-pd input[type="checkbox"]:checked')].map(x => x.value);
  const err = W.checkPreds(p, a.id, list); if (err) { toast(err); return; }
  ui.wbsPred = null;
  const lags = {}; for (const id of list) { const n = parseInt(document.querySelector(`.wbs-pd input[data-lag="${id}"]`)?.value || '0', 10) || 0; if (n) lags[id] = n; }
  if (W.formatPreds(list, lags) === W.formatPreds(a.preds, a.lags)) return;
  logSched(p, `${a.id} ${a.name}: predecessors ${W.formatPreds(a.preds, a.lags) || '—'} → ${W.formatPreds(list, lags) || '—'}`); a.preds = list; a.lags = lags;
  audit('Modify', `Activity ${a.id} (${p.code})`);
}
document.addEventListener('input', e => {
  if (!e.target.matches || !e.target.matches('[data-wbs-predq]')) return;
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('.wbs-pd [data-q]').forEach(x => { x.hidden = !!q && !x.dataset.q.includes(q); });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.wbsPred) { ui.wbsPred = null; render(); } });
function wbsFocusEdit() { setTimeout(() => { const el = document.querySelector('[data-wbs-edit]'); if (el) { el.focus(); if (el.select) el.select(); } }, 0); }
function wbsStartEdit(el) { if (!canEdit(proj(ui.sel))) return; ui.wbsEdit = { id: el.dataset.id, f: el.dataset.f }; ui.wbsNew = null; ui.wbsPlus = null; wbsFocusEdit(); }
function wbsStartNew(el) {
  const p = proj(ui.sel); if (!canEdit(p)) return; const m = el.dataset.m; const anchor = el.dataset.id || null;
  const W = window.__ITPH_WBS; const a = anchor && W.findRow(p, anchor);
  ui.wbsNew = { pid: p.id, type: el.dataset.t, mode: m, anchor: m === 'top' ? null : anchor, parent: m === 'under' ? anchor : m === 'below' ? (a && a.parent) || null : null, after: m === 'below' ? anchor : null };
  if (m === 'under') wbsCollapsed(p).delete(anchor);
  ui.wbsPlus = null; ui.wbsEdit = null; wbsFocusEdit();
}
function wbsCancel(el) { if (el) el.dataset.done = '1'; ui.wbsEdit = null; ui.wbsNew = null; render(); }
// Enter / leaving the field: apply the edit or add the new row, then reschedule, save and redraw
function wbsCommit(el) {
  // one commit per field: redrawing removes the input, which fires focusout on it again
  if (el.dataset.done) return; el.dataset.done = '1';
  const W = window.__ITPH_WBS; const p = proj(ui.sel); const v = el.value.trim(); let msg = null; let changed = false;
  if (el.dataset.wbsEdit === 'new') {
    const g = ui.wbsNew; if (!g) return; ui.wbsNew = null;
    if (!v) { render(); return; }
    const id = W.nextId(p, g.type); const ms = g.type === 'milestone'; const dur = ms ? 1 : 5; const bStart = toWork(TODAY);
    const item = g.type === 'phase' ? { id, name: v, type: 'phase', parent: null }
      : { id, name: v, type: g.type, parent: g.parent, dur, preds: [], pct: 0, owner: p.pm, ms, price: 0, manualFinish: '', bStart, bFinish: addWD(bStart, dur - 1), pStart: bStart, pFinish: addWD(bStart, dur - 1), aStart: '', aFinish: '' };
    const r = W.addItem(p, item, { after: g.after || undefined });
    if (!r.ok) msg = r.error;
    else {
      changed = true;
      logSched(p, `Added ${W.LABEL[g.type].toLowerCase()} ${id} ${v}${g.parent ? ` under ${g.parent}` : ''}${r.converted ? `; ${r.converted} now groups it and its predecessors moved to ${id}` : ''}`);
      audit('Add', `${W.LABEL[g.type]} ${id} (${p.code})`);
      ui.wbsNew = { ...g, mode: 'below', anchor: id, after: id }; // keep typing: the next Enter adds another one below
    }
  } else {
    const e = ui.wbsEdit; if (!e || e.id !== el.dataset.id || e.f !== el.dataset.wbsEdit) return; ui.wbsEdit = null;
    const r = W.findRow(p, e.id); if (!r) { render(); return; }
    if (e.f === 'name') {
      if (v && v !== r.name) { logSched(p, `${r.id}: renamed "${r.name}" → "${v}"`); r.name = v; changed = true; }
    } else if (e.f === 'dur') {
      const d = Math.max(1, Math.round(+v || 0));
      if (r.aStart) msg = `${r.id} has started; drag its Gantt bar or set a manual forecast instead.`;
      else if (d !== r.dur) { logSched(p, `${r.id} ${r.name}: duration ${r.dur} → ${d} working days`); r.dur = d; r.manualFinish = ''; changed = true; }
    } else if (e.f === 'cost' || e.f === 'actual') {
      const c = v === '' ? 0 : wbsParseMoney(v); const what = e.f === 'cost' ? 'budget' : 'actual cost';
      if (c === null) msg = 'Enter an amount in pesos, e.g. 350000, 350k or 1.2M.';
      else if (c !== (+r[e.f] || 0)) { logSched(p, `${r.id} ${r.name}: ${what} ${pesoFull(+r[e.f] || 0)} → ${pesoFull(c)}`); r[e.f] = c; changed = true; }
    } else if (e.f === 'preds') {
      const pp = W.parsePreds(v); const list = pp.ids;
      const err = W.checkPreds(p, r.id, list);
      if (err) msg = err;
      else if (W.formatPreds(list, pp.lags) !== W.formatPreds(r.preds, r.lags)) { logSched(p, `${r.id} ${r.name}: predecessors ${W.formatPreds(r.preds, r.lags) || '—'} → ${W.formatPreds(list, pp.lags) || '—'}`); r.preds = list; r.lags = pp.lags; changed = true; }
    }
    if (changed) audit('Modify', `Activity ${r.id} (${p.code})`);
  }
  if (msg) toast(msg);
  if (changed) { S.projects.forEach(schedule); save(); }
  render(); if (ui.wbsNew) wbsFocusEdit();
}
document.addEventListener('keydown', e => {
  const el = e.target.closest && e.target.closest('[data-wbs-edit]'); if (!el) return;
  if (e.key === 'Enter') { e.preventDefault(); wbsCommit(el); }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); wbsCancel(el); }
}, true);
document.addEventListener('focusout', e => {
  const el = e.target.closest && e.target.closest('[data-wbs-edit]'); if (!el || !el.isConnected) return;
  // leaving an empty new row cancels it; leaving an edited cell saves it
  if (el.dataset.done) return;
  if (el.dataset.wbsEdit === 'new' && !el.value.trim()) { el.dataset.done = '1'; ui.wbsNew = null; setTimeout(render, 0); return; }
  wbsCommit(el);
});
function wbsReorder(id, dir) { const p = proj(ui.sel); if (window.__ITPH_WBS.reorder(p, id, dir)) logSched(p, `${id} moved ${dir < 0 ? 'up' : 'down'}`); }
function wbsDelete(el) {
  const k = 'wbsdel' + el.dataset.id; if (ui.confirm !== k) { ui.confirm = k; return; }
  ui.confirm = null; const p = proj(ui.sel); const W = window.__ITPH_WBS; const r = W.findRow(p, el.dataset.id); if (!r) return;
  const res = W.removeRow(p, r.id); if (!res.ok) { toast(res.error); return; }
  ui.wbsMenu = null;
  logSched(p, `Deleted ${W.LABEL[r.type].toLowerCase()} ${r.id} ${r.name}${res.reverted ? `; ${res.reverted} is a schedulable item again` : ''}`);
  audit('Delete', `${W.LABEL[r.type]} ${r.id} (${p.code})`);
}
function wbsMove(el) {
  if (el.value === '__') return;
  const p = proj(el.dataset.p); const W = window.__ITPH_WBS; const to = el.value || null;
  const res = W.moveRow(p, el.dataset.id, to); ui.wbsMenu = null;
  if (!res.ok) { toast(res.error); return; }
  logSched(p, `Moved ${el.dataset.id} under ${to || 'the top level'}${res.converted ? `; ${res.converted} now groups it${res.movedTo ? ` and its predecessors moved to ${res.movedTo}` : ''}` : ''}${res.reverted ? `; ${res.reverted} is a schedulable item again` : ''}`);
  audit('Modify', `WBS position of ${el.dataset.id} (${p.code})`);
}
function wbsAccept(el) {
  const p = proj(el.dataset.p); const r = window.__ITPH_WBS.findRow(p, el.dataset.id); if (!r) return;
  r.accepted = el.checked; r.acceptedDate = el.checked ? TODAY : '';
  logSched(p, `${r.id} ${r.name}: ${el.checked ? 'accepted' : 'acceptance cleared'}`);
  audit('Modify', `Deliverable ${r.id} ${el.checked ? 'accepted' : 'not accepted'} (${p.code})`);
}
function ganttWorkRow(p, n, ed, x, wdt, months) {
  const a = n.row; const late = a.fFinish > a.bFinish; const fs = a.aStart || a.fStart; const done = a.pct >= 100; const started = !!a.aStart;
  const canMove = ed && !done && !started; const canSize = ed && !done && !a.ms;
  return `<div class="g-row"><div class="n wbs-tc" title="${esc(a.name)} · ${esc(uname(a.owner))}">${wbsLines(p, n)}<span class="wbs-tree" ${wbsIndent(n)}>${wbsTog(p, a, n.hasKids)}<span class="wbs-ic ${a.type}">${WBS_ICON[a.type] || ''}</span><span class="mono">${a.id}</span>${esc(a.name)}</span></div><div class="g-track">
    ${months.map(m => `<div class="g-grid" style="left:${x(m)}%"></div>`).join('')}
    ${a.ms ? `<div class="g-ms-b" style="left:calc(${x(a.bFinish)}% - 4px)"></div><div class="g-ms ${done ? (a.aFinish > a.bFinish ? 'late' : 'done') : late ? 'late' : ''} ${canMove ? 'drag' : ''}" ${canMove ? `data-drag="${a.id}"` : ''} style="left:calc(${x(a.fFinish)}% - 6px)" title="${esc(a.name)}: ${fd(a.fFinish)}"></div>`
      : `<div class="g-base" style="left:${x(a.bStart)}%;width:${wdt(a.bStart, a.bFinish)}%"></div><div class="g-bar ${late ? 'late' : ''} ${(p.crit && p.crit.has(a.id)) ? 'crit' : ''} ${canMove ? 'drag' : ''}" ${canMove ? `data-drag="${a.id}"` : ''} style="left:${x(fs)}%;width:${wdt(fs, a.fFinish)}%" title="${esc(a.name)}: ${fd(fs)} – ${fd(a.fFinish)} · ${a.pct}%${started && !done && ed ? ' · started, drag the right edge to change the forecast finish' : ''}"><i style="width:${a.pct}%"></i>${canSize ? `<span class="g-h" data-rs="${a.id}"></span>` : ''}</div>`}
    <div class="g-today" style="left:${x(TODAY)}%"></div></div></div>`;
}
function ganttSumRow(p, n, x, wdt, months) {
  const r = n.row;
  return `<div class="g-row g-sumrow"><div class="n wbs-tc" title="${esc(r.name)}">${wbsLines(p, n)}<span class="wbs-tree" ${wbsIndent(n)}>${wbsTog(p, r, n.hasKids)}<span class="wbs-ic ${r.type}">${WBS_ICON[r.type] || ''}</span><span class="mono">${r.id}</span><b>${esc(r.name)}</b></span></div><div class="g-track">
    ${months.map(m => `<div class="g-grid" style="left:${x(m)}%"></div>`).join('')}
    ${r.fFinish ? `<div class="g-sum" style="left:${x(r.fStart)}%;width:${wdt(r.fStart, r.fFinish)}%" title="${esc(r.name)}: ${fd(r.fStart)} – ${fd(r.fFinish)} · ${Math.round(r.pct)}%"><i style="width:${r.pct}%"></i></div>` : ''}
    <div class="g-today" style="left:${x(TODAY)}%"></div></div></div>`;
}
function ganttRows(p, acts, ed, x, wdt, months) {
  return wbsVisible(p, acts).map(n => n.row.sum ? ganttSumRow(p, n, x, wdt, months) : ganttWorkRow(p, n, ed, x, wdt, months)).join('');
}
const wbsRowsOf = (p, type) => window.__ITPH_WBS ? window.__ITPH_WBS.tree(p).map(n => n.row).filter(r => r.type === type) : [];
const psrPhases = p => wbsRowsOf(p, 'phase').map(r => ({ id: r.id, name: r.name, fStart: r.fStart, fFinish: r.fFinish, pct: Math.round(r.pct || 0), st: r.state ? r.state.l : '—', r: r.state ? r.state.r : 'N' }));
const psrDeliverables = p => wbsRowsOf(p, 'deliverable').map(r => ({ id: r.id, name: r.name, due: r.fFinish, accepted: !!r.accepted, acceptedDate: r.acceptedDate || '' }));
function psrWbsTables(s) {
  const ph = s.phases || [], dl = s.deliverables || []; if (!ph.length && !dl.length) return '';
  return `<div class="grid g2">
    <div>${ph.length ? `<h4>Phases</h4><div class="tbl-wrap"><table><thead><tr><th>Phase</th><th>Dates</th><th class="r">% done</th><th>Status</th></tr></thead><tbody>${ph.map(x => `<tr><td>${esc(x.name)}</td><td class="num" style="white-space:nowrap">${x.fStart ? `${fds(x.fStart)} – ${fds(x.fFinish)}` : '—'}</td><td class="r num">${x.fStart ? x.pct + '%' : '—'}</td><td>${x.fStart ? pill(x.r, x.st) : '—'}</td></tr>`).join('')}</tbody></table></div>` : ''}</div>
    <div>${dl.length ? `<h4>Deliverables</h4><div class="tbl-wrap"><table><thead><tr><th>Deliverable</th><th>Due</th><th>Accepted</th></tr></thead><tbody>${dl.map(x => `<tr><td>${esc(x.name)}</td><td class="num">${fd(x.due)}</td><td>${x.accepted ? `Yes · ${fds(x.acceptedDate)}` : 'No'}</td></tr>`).join('')}</tbody></table></div>` : ''}</div></div>`;
}
function wbsPhaseAnswer(p) {
  const ph = wbsRowsOf(p, 'phase').filter(r => r.fStart);
  if (!ph.length) return `**${p.name}** has no phases yet. Add one in the Schedule tab with **+ Phase**.`;
  const cur = ph.find(r => r.fStart <= TODAY && TODAY <= r.fFinish) || ph.find(r => r.fStart > TODAY);
  const list = ph.map(r => `- ${r.name}: ${fds(r.fStart)} – ${fds(r.fFinish)}, ${Math.round(r.pct)}% (${r.state ? r.state.l : '—'})`).join('\n');
  return (cur ? `**${p.name}** is in **${cur.name}**: ${Math.round(cur.pct)}% done, finishing ${fd(cur.fFinish)}.` : `All phases of **${p.name}** are past their finish dates.`) + '\n\n' + list;
}
function wbsDeliverableAnswer(p) {
  const dl = wbsRowsOf(p, 'deliverable');
  if (!dl.length) return `**${p.name}** has no deliverables yet.`;
  const open = dl.filter(r => !r.accepted);
  return open.length ? `${open.length} of ${dl.length} deliverables of **${p.name}** are not yet accepted:\n\n${open.map(r => `- ${r.name}, due ${fd(r.fFinish)}`).join('\n')}` : `All ${dl.length} deliverables of **${p.name}** are accepted.`;
}
// S-curve mode switch: progress (weighted by working days) or cost / earned value (weighted by WBS budget)
const scToggle = () => `<div class="row" style="margin-bottom:10px"><div class="seg"><button class="${ui.scMode !== 'cost' ? 'on' : ''}" data-a="scmode" data-m="work">Progress (work days)</button><button class="${ui.scMode === 'cost' ? 'on' : ''}" data-a="scmode" data-m="cost">Cost (earned value)</button></div></div>`;
// cost S-curve: PV / EV / forecast EV are the progress curves weighted by each work item's budget, shown as % of
// BAC (the WBS budget); AC is the project's actual cost to date (Financials), a single point today
function tSCurveCost(p) {
  const bac = wbsBudget(p);
  if (!bac) return scToggle() + '<div class="empty">Set budgets on the tasks (Schedule tab, Budget column) to see the cost S-curve.</div>';
  const pts = curvePoints(p, 'cost'); const now = pts.find(x => x.d === TODAY) || pts.at(-1);
  // AC over time from task actuals: each task's actual cost spread over its actual start → finish (or today)
  const spend = p.activities.filter(a => !a.ms && +a.actual > 0);
  const frac = (s, f, at) => at < s ? 0 : at >= f ? 1 : Math.min(1, (wdDiff(s, at) + 1) / (wdDiff(s, f) + 1));
  const acAt = at => spend.reduce((n, a) => { const s0 = a.aStart || a.bStart; const f0 = a.aFinish || (TODAY > s0 ? TODAY : s0); return n + (+a.actual) * frac(s0, f0, at); }, 0) / bac * 100;
  if (spend.length) pts.forEach(q => { q.acl = q.d <= TODAY ? acAt(q.d) : null; });
  const taskAc = wbsActual(p);
  const pv = bac * now.pl / 100, ev = bac * (now.ac || 0) / 100, ac = +p.fin.actual || 0;
  const spi = pv ? ev / pv : 1, cpi = ac ? ev / ac : null, eac = cpi ? bac / cpi : null, acPct = ac / bac * 100;
  const W = 820, H = 330, L = 46, R = 118, T = 18, B = 36; const top = Math.max(100, Math.ceil(acPct / 25) * 25);
  const t0 = D(pts[0].d).getTime(), t1 = D(pts.at(-1).d).getTime();
  const X = dt => L + (D(dt).getTime() - t0) / (t1 - t0) * (W - L - R); const Y = v => T + (1 - v / top) * (H - T - B);
  const path = k => pts.filter(q => q[k] != null).map((q, i) => `${i ? 'L' : 'M'}${X(q.d).toFixed(1)},${Y(q[k]).toFixed(1)}`).join('');
  const lbl = (x, y, text, cls) => `<text x="${x}" y="${y}" class="${cls}">${esc(text)}</text>`;
  const months = []; let m = pts[0].d.slice(0, 8) + '01'; while (m <= pts.at(-1).d) { if (m >= pts[0].d) months.push(m); const dd = D(m); m = iso(new Date(Date.UTC(dd.getUTCFullYear(), dd.getUTCMonth() + 1, 1))); }
  const step = months.length > 10 ? 2 : 1; const lastPl = pts.at(-1); const fcEnd = pts.filter(q => q.fc != null).at(-1);
  window._sc = { pts, X, Y, W, H, L, R, T, B };
  const col = (v, amber, red) => v == null ? 'inherit' : v < red ? 'var(--bad)' : v < amber ? 'var(--warn)' : 'var(--ok)';
  return scToggle() + `<div class="grid g4">
    <div class="card stat"><span class="l">Planned value (PV)</span><span class="v">${peso(pv)}</span><span class="d">${pct(now.pl)} of the ${peso(bac)} WBS budget (BAC)</span></div>
    <div class="card stat"><span class="l">Earned value (EV)</span><span class="v">${peso(ev)}</span><span class="d">budget of the work done · SPI ${spi.toFixed(2)}</span></div>
    <div class="card stat"><span class="l">Actual cost (AC)</span><span class="v">${peso(ac)}</span><span class="d">from Financials · cost variance ${ev - ac >= 0 ? '+' : '−'}${peso(Math.abs(ev - ac))}</span></div>
    <div class="card stat"><span class="l">Cost performance index</span><span class="v" style="color:${col(cpi, 1, 0.9)}">${cpi == null ? '—' : cpi.toFixed(2)}</span><span class="d">${cpi == null ? 'no actual cost recorded yet' : `EV ÷ AC · estimate at completion ${peso(eac)}`}</span></div>
  </div>
  <div class="card"><h3>Cost S-curve <span class="sub">earned value · % of the WBS budget (${peso(bac)}) · ${fd(pts[0].d)} to ${fd(pts.at(-1).d)}</span></h3>
    <div class="legend" style="margin-bottom:6px"><span><i style="width:22px;height:0;border-top:2px solid var(--s-plan)"></i>Planned value (PV)</span><span><i style="width:22px;height:0;border-top:2.5px solid var(--s-act)"></i>Earned value (EV)</span><span><i style="width:22px;height:0;border-top:2px dashed var(--s-act)"></i>Forecast EV</span>${spend.length ? '<span><i style="width:22px;height:0;border-top:2px solid var(--bad)"></i>Actual cost from tasks</span>' : ''}<span><i style="width:10px;height:10px;border-radius:50%;background:var(--bad)"></i>Project actual cost (AC)</span></div>
    <div class="scurve-wrap"><svg class="scurve" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cost S-curve: PV ${peso(pv)}, EV ${peso(ev)}, AC ${peso(ac)} as of ${fd(TODAY)}">
      ${[0, 25, 50, 75, 100, 125, 150].filter(v => v <= top).map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="sc-grid"/>${lbl(L - 8, Y(v) + 4, v + '%', 'sc-ax sc-r')}`).join('')}
      ${months.map((mm, i) => i % step ? '' : lbl(X(mm), H - B + 18, MON[D(mm).getUTCMonth()] + ' ' + String(D(mm).getUTCFullYear()).slice(2), 'sc-ax sc-c')).join('')}
      <line x1="${X(TODAY)}" x2="${X(TODAY)}" y1="${T}" y2="${H - B}" class="sc-today"/>${lbl(X(TODAY), T - 5, 'Today', 'sc-ax sc-c')}
      <path d="${path('pl')}" class="sc-line sc-plan"/><path d="${path('fc')}" class="sc-line sc-fc"/><path d="${path('ac')}" class="sc-line sc-act"/>
      <circle cx="${X(TODAY)}" cy="${Y(now.ac || 0)}" r="4.5" class="sc-dot"/>
      ${spend.length ? `<path d="${path('acl')}" class="sc-line" style="stroke:var(--bad);stroke-width:2"/><text x="${X(TODAY) - 9}" y="${Y(taskAc / bac * 100) - 8}" class="sc-lab" text-anchor="end">${esc(`AC tasks ${peso(taskAc)}`)}</text>` : ''}
      <circle cx="${X(TODAY)}" cy="${Y(acPct)}" r="5.5" fill="var(--bad)" stroke="var(--panel)" stroke-width="2"/>
      ${lbl(X(lastPl.d) + 8, Y(lastPl.pl) - 6, 'PV', 'sc-lab')}
      ${lbl(X(TODAY) + 9, Y(now.ac || 0) + 16, `EV ${peso(ev)}`, 'sc-lab')}
      ${lbl(X(TODAY) + 9, Y(acPct) - 8, `AC ${peso(ac)}`, 'sc-lab')}
      ${fcEnd ? lbl(X(fcEnd.d) + 8, Y(fcEnd.fc) + 22, `Forecast ${fds(fcEnd.d)}`, 'sc-lab') : ''}
      <line class="sc-hover" x1="0" x2="0" y1="${T}" y2="${H - B}" style="display:none"/>
      <rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent" class="sc-hit"/>
    </svg><div class="sc-tip" hidden></div></div>
    <details style="margin-top:10px"><summary class="muted" style="cursor:pointer;font-size:12.5px">Show data table</summary>
      <div class="tbl-wrap" style="margin-top:8px;max-height:260px;overflow:auto"><table><thead><tr><th>Week of</th><th class="r">PV (₱)</th><th class="r">EV (₱)</th><th class="r">Forecast EV (₱)</th>${spend.length ? '<th class="r">AC from tasks (₱)</th>' : ''}</tr></thead><tbody>
      ${pts.map(q => `<tr${q.d === TODAY ? ' style="font-weight:600"' : ''}><td class="num">${fd(q.d)}${q.d === TODAY ? ' (today)' : ''}</td><td class="r num">${wbsMoney(bac * q.pl / 100)}</td><td class="r num">${q.ac == null ? '—' : wbsMoney(bac * q.ac / 100)}</td><td class="r num">${q.fc == null ? '—' : wbsMoney(bac * q.fc / 100)}</td>${spend.length ? `<td class="r num">${q.acl == null ? '—' : wbsMoney(bac * q.acl / 100)}</td>` : ''}</tr>`).join('')}</tbody></table></div></details>
  </div>
  <p class="note">PV spreads each work item's budget over its baseline dates; EV is each item's budget × its % complete; forecast EV follows the forecast dates. The red line is the actual cost recorded on tasks, spread over each task's actual dates; the red dot is the project's actual cost to date from the Financials tab (CPI uses it, as it includes costs not assigned to a task). SPI = EV ÷ PV, CPI = EV ÷ AC, estimate at completion = BAC ÷ CPI.</p>`;
}
