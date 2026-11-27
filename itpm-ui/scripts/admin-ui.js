/* ---------- BPI admin and reports (ADM004 · ADM006 · ADM012 · REP001) — logic in src/tpl.js, src/report.js, src/export.js ---------- */
const bpiTpl = type => (S.templates || []).filter(t => t.type === type);
const bpiTplOne = (type, fallback) => { const t = bpiTpl(type).find(x => x.isDefault) || bpiTpl(type)[0]; return t ? window.__ITPH_TPL.parseTemplate(JSON.stringify(t.data), fallback) : fallback; };
window.__ITPH_TPL_REMAP = (from, to) => { if (ui.tplSel === from) ui.tplSel = to; if (ui.rbSel === from) ui.rbSel = to; };

/* REP001 — export bar above every table */
function bpiAfterRender() {
  document.querySelectorAll('.tbl-wrap').forEach((w, i) => {
    if (w.previousElementSibling?.classList?.contains('exp-bar') || w.closest('[data-noexp]')) return;
    const t = w.querySelector('table'); if (!t || t.querySelectorAll('tbody tr').length < 1) return;
    const bar = document.createElement('div'); bar.className = 'exp-bar';
    bar.innerHTML = `<span>Export</span>${[['csv', 'CSV'], ['xlsx', 'Excel'], ['pptx', 'PPT'], ['pdf', 'PDF']].map(([f, l]) => `<button class="btn sm ghost" data-a="exp" data-f="${f}" data-i="${i}">${l}</button>`).join('')}`;
    w.parentNode.insertBefore(bar, w);
  });
}
function bpiReadTable(w) {
  const t = w.querySelector('table'); const heads = [...t.querySelectorAll('thead th')]; const keep = heads.map((h, i) => ({ i, name: h.innerText.replace(/\s+/g, ' ').trim() })).filter(x => x.name);
  const num = s => /^-?\d{1,3}(,\d{3})*(\.\d+)?$|^-?\d+(\.\d+)?$/.test(s) && !/^0\d/.test(s) ? Number(s.replace(/,/g, '')) : s;
  const rows = [...t.querySelectorAll('tbody tr')].map(tr => [...tr.children]).filter(c => c.length > 1).map(c => keep.map(k => num((c[k.i]?.innerText || '').replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim())));
  const card = w.closest('.card'); const h = card?.querySelector('h3'); const title = ((h?.childNodes[0]?.textContent || document.querySelector('h1')?.textContent || 'Export').replace(/\s+/g, ' ').trim()) || 'Export';
  return { title, cols: keep.map(k => k.name), rows };
}
async function bpiExport(fmt, i) {
  const w = document.querySelectorAll('.tbl-wrap')[i]; if (!w) return; const { title, cols, rows } = bpiReadTable(w);
  try { const f = await window.__ITPH_EXPORT.save(fmt, title, cols, rows, TODAY, `Exported ${fd(TODAY)} · ${ROLE_LABEL[role()]}`); audit('Export', `${title} (${fmt.toUpperCase()})`); toast(`${f} downloaded`); }
  catch (e) { console.error(e); toast('Could not create the file: ' + (e.message || e)); }
}

/* report datasets built from live state (what the signed-in user can see) */
function bpiDataset(name) {
  const B = window.__ITPH_BINDER; const ps = role() === 'APPADMIN' ? S.projects : myProjects(); const out = []; // administrators (Hub Administrator, TPMO) see every project
  for (const p of ps) {
    const h = health(p); const sc = h.sc; const pn = p.name;
    if (name === 'projects') out.push({ name: pn, code: p.code, bu: p.bu, segment: ((S.programs || []).find(g => g.id === p.program)?.segment) || p.bu || '', program: (S.programs || []).find(g => g.id === p.program)?.name || '', status: p.status || '', pm: uname(p.pm), dh: uname(p.dh), sponsor: uname(p.ps), rag: RAGL[h.overall], kpi: sc.kpi === null ? '' : +sc.kpi.toFixed(2), complete: +sc.complete.toFixed(1), planned: +sc.expected.toFixed(1), baseFinish: sc.baseFinish, foreFinish: sc.foreFinish, variance: sc.variance, budget: Math.round(h.f.current), eac: Math.round(p.fin.eac), actualCost: Math.round(p.fin.actual) });
    if (name === 'tasks') for (const a of p.activities) out.push({ project: pn, id: a.id, name: a.name, type: a.ms ? 'Milestone' : 'Task', owner: uname(a.owner), bStart: a.bStart, bFinish: a.bFinish, start: a.fStart, finish: a.fFinish, pct: a.pct, budget: +a.cost || 0, actual: +a.actual || 0, critical: p.crit && p.crit.has(a.id) ? 'Yes' : '' });
    if (name === 'risks') for (const r of p.risks) { const e = bndExt(p, 'Risk', r.id) || {}; out.push({ project: pn, no: r.id, title: r.title, category: r.cat, level: riskLevel(riskScore(r)), owner: uname(r.owner), status: r.status, target: e.target || '', agingRag: RAGL[B.agingRag(B.agingDays({ target: e.target, actionStatus: e.actionStatus, closed: r.status === 'Closed' }, TODAY))] }); }
    if (name === 'issues') for (const i of p.issues) out.push({ project: pn, no: i.id, title: i.title, category: i.cat, priority: i.pri, owner: uname(i.owner), status: i.status, target: i.target, agingRag: RAGL[B.agingRag(B.agingDays({ target: i.target, actionStatus: '', closed: i.status === 'Resolved' }, TODAY))] });
    if (name === 'binder') for (const it of bndItems(p)) { const d = B.agingDays({ target: it.target, actionStatus: it.actionStatus, closed: it.closed }, TODAY); out.push({ project: pn, type: it.type, no: it.no, description: it.desc, category: it.cat, priority: it.pri, assignee: uname(it.assignee), target: it.target, actionStatus: it.actionStatus, aging: d, agingRag: RAGL[B.agingRag(d)], status: it.closed ? 'Closed' : 'Open' }); }
    if (name === 'releases') for (const r of p.releases || []) out.push({ project: pn, name: r.name, kind: r.mvp ? 'MVP' : 'Release', planned: r.planned, forecast: r.forecast, implemented: r.implemented, cls: window.__ITPH_DASH.releaseForecast([{ planned: r.planned, forecast: r.forecast, implemented: r.implemented }], TODAY)[0]?.items[0]?.cls || '' });
    if (name === 'weekly') for (const w of p.wsr || []) out.push({ project: pn, week: w.weekOf, status: w.status, kpi: w.kpi === null ? '' : +(+w.kpi).toFixed(2), kpiRag: RAGL[w.kpiRag] || '', overall: RAGL[w.overall] || '', projectStatus: w.projectStatus });
  }
  return out;
}
/* Reports view — saved report definitions, run and export (ADM012 consumers) */
function vReports() {
  const R = window.__ITPH_REPORT; const reps = bpiTpl('Report'); if (!ui.rpSel || !reps.find(r => r.id === ui.rpSel)) ui.rpSel = reps[0]?.id || null;
  const cur = reps.find(r => r.id === ui.rpSel); const res = cur ? R.runReport(cur.data, bpiDataset(cur.data.dataset)) : null;
  const list = `<div class="list-head"><h2>Reports</h2></div><div class="list-items">${reps.map(r => `<button class="li ${r.id === ui.rpSel ? 'on' : ''}" data-a="rpsel" data-id="${esc(r.id)}"><b>${esc(r.name)}</b><span class="faint">${esc(R.DATASETS[r.data.dataset]?.label || '')}</span></button>`).join('') || '<div class="empty" style="padding:12px">No reports yet. A Hub Administrator or TPMO creates them in Configuration → Reports and dashboards.</div>'}</div>`;
  const chart = res?.chart && res.chart.labels.length ? dashStack(res.chart.labels.map((l, i) => ({ label: String(l).slice(0, 14), v: { planned: res.chart.values[i] } })), ['planned'], cur.name, { names: { planned: 'Count' } }) : '';
  return { list, hasSel: true, detail: cur ? `<div class="head"><div><div class="kicker">${esc(R.DATASETS[cur.data.dataset]?.label)} · ${res.rows.length} row${res.rows.length === 1 ? '' : 's'}</div><h1>${esc(cur.name)}</h1></div></div>${cur.desc ? `<p class="note">${esc(cur.desc)}</p>` : ''}
    ${chart ? `<div class="card"><h3>${esc(cur.name)} <span class="sub">chart</span></h3>${chart}</div>` : ''}
    <div class="tbl-wrap"><table><thead><tr>${res.columns.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${res.rows.map(r => `<tr>${r.map(v => `<td>${typeof v === 'number' ? `<span class="num">${v.toLocaleString('en-PH')}</span>` : esc(v)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${res.columns.length || 1}" class="muted">No rows match.</td></tr>`}</tbody></table></div>` : '<div class="empty">Choose a report.</div>' };
}

/* ADM004 — project profiles */
function aProjects() {
  const O = window.__ITPH_OPTS || { bu: [], portfolio: [], status: ['Planning'] }; const ppl = r => S.users.filter(u => u.role === r && u.status === 'Active');
  const opt = (list, none) => `${none ? `<option value="">${none}</option>` : '<option value="" disabled selected>Choose…</option>'}${list.map(x => typeof x === 'string' ? `<option>${esc(x)}</option>` : `<option value="${x.id}">${esc(x.name)}</option>`).join('')}`;
  const wp = bpiTpl('Workplan');
  return `<div class="head"><div><div class="kicker">Administration</div><h1>Project profiles</h1></div></div>
  <p class="note">Create a project and name its Project Manager, Department Head and Sponsor. Pick a workplan template to start the schedule from it.</p>
  <div class="card"><h3>New project profile <span class="sub">ADM004</span></h3><form class="inline" data-form="newproj">
    <label class="field" style="grid-column:span 2">Project name<input name="name" required></label>
    <label class="field">Business unit<select name="bu" required>${opt(O.bu)}</select></label><label class="field">Portfolio<select name="portfolio" required>${opt(O.portfolio)}</select></label>
    <label class="field">Status<select name="status">${O.status.map(s => `<option ${s === 'Planning' ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
    <label class="field">Project Manager<select name="pm" required>${opt(ppl('PM'))}</select></label><label class="field">Department Head<select name="dh" required>${opt(ppl('DH'))}</select></label>
    <label class="field">Project Sponsor<select name="ps">${opt(ppl('PS'), 'None')}</select></label>
    <label class="field">Program<select name="program">${opt(S.programs || [], 'None')}</select></label>
    <label class="field">Start date<input type="date" name="start" required value="${TODAY}"></label><label class="field">Approved budget (PHP)<input type="number" name="budget" min="0" step="1" required></label>
    <label class="field">Contingency fund (PHP)<input type="number" name="cont" min="0" step="1" required></label><label class="field">Vendor<input name="vendor"></label><label class="field">Contract total (PHP)<input type="number" name="contract" min="0" step="1"></label>
    <label class="field">Workplan template<select name="tpl">${opt(wp, 'None (empty schedule)')}</select></label>
    <button class="btn pri">Create project</button></form></div>
  <div class="tbl-wrap"><table><thead><tr><th>Project</th><th>Code</th><th>Status</th><th>Project manager</th><th>Department head</th><th>Program</th></tr></thead><tbody>
  ${S.projects.map(p => `<tr><td>${esc(p.name)}</td><td class="mono">${esc(p.code)}</td><td>${esc(p.status || '—')}</td><td>${esc(uname(p.pm))}</td><td>${esc(uname(p.dh))}</td><td>${esc((S.programs || []).find(g => g.id === p.program)?.name || '—')}</td></tr>`).join('')}</tbody></table></div>`;
}
function bpiNewProjectExtras(p, g) {
  p.program = g('program') || ''; if (!p.pm) p.pm = ui.me;
  const t = (S.templates || []).find(x => x.id === g('tpl')); if (!t) return;
  const W = window.__ITPH_WBS; const rows = window.__ITPH_TPL.instantiateWorkplan(t.data, p.start, { toWork, nextWD, addWD });
  rows.forEach(r => { if (r.type !== 'phase' && !(r.type === 'deliverable' && !r.dur)) r.owner = p.pm; });
  const sp = W.splitRows(rows); p.activities = sp.activities; p.wbs = sp.wbs; logSchedFor(p, `Schedule created from the workplan template "${t.name}"`);
}
function logSchedFor(p, m) { try { logSched(p, m); } catch (e) { /* history is optional */ } }

/* ADM006 — templates */
function aTemplates() {
  const wp = bpiTpl('Workplan'); if (!wp.find(t => t.id === ui.tplSel)) ui.tplSel = wp[0]?.id || null; const cur = wp.find(t => t.id === ui.tplSel); const rows = cur?.data.rows || [];
  const wsr = bpiTplOne('WSR', window.__ITPH_TPL.DEFAULT_WSR); const dash = bpiTplOne('Dashboard', window.__ITPH_TPL.DEFAULT_DASH); const problems = cur ? window.__ITPH_TPL.validateWorkplan(rows) : [];
  const typeOpts = ['phase', 'deliverable', 'task', 'subtask', 'milestone'].map(t => `<option>${t}</option>`).join('');
  return `<div class="head"><div><div class="kicker">Administration</div><h1>Templates</h1></div></div>
  <div class="card"><h3>Workplan templates <span class="sub">ADM006 · used when a project profile is created</span></h3>
    <div class="row" style="gap:8px;flex-wrap:wrap"><select class="inp" data-c="tplsel" aria-label="Workplan template">${wp.map(t => `<option value="${esc(t.id)}" ${t.id === ui.tplSel ? 'selected' : ''}>${esc(t.name)}</option>`).join('') || '<option value="">No templates yet</option>'}</select>
      ${cur ? `<button class="btn sm danger" data-a="tpldel" data-id="${esc(cur.id)}">${ui.confirm === 'tpl' + cur.id ? 'Confirm delete' : 'Delete template'}</button>` : ''}</div>
    <form class="inline" data-form="tplnew" style="margin-top:10px"><label class="field" style="grid-column:span 2">New workplan template<input name="name" required placeholder="e.g. Standard IT project"></label><button class="btn">Create</button></form>
    ${cur ? `<div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>ID</th><th>Item</th><th>Type</th><th>Parent</th><th class="r">Duration (wd)</th><th>Predecessors</th><th></th></tr></thead><tbody>
      ${rows.map(r => `<tr><td class="mono">${esc(r.id)}</td><td>${esc(r.name)}</td><td>${esc(r.type)}</td><td class="mono">${esc(r.parent || '—')}</td><td class="r num">${r.type === 'phase' ? '—' : r.type === 'milestone' ? '—' : r.dur || 1}</td><td class="mono">${esc((r.preds || []).join(', ') || '—')}</td><td><button class="btn sm danger" data-a="tplrowdel" data-id="${esc(r.id)}">Remove</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">No items yet.</td></tr>'}</tbody></table></div>
      ${problems.length ? `<p class="note" style="color:var(--bad)">${problems.map(esc).join(' · ')}</p>` : ''}
      <form class="inline" data-form="tplrow" style="margin-top:10px"><label class="field">ID<input name="id" required placeholder="A1"></label><label class="field" style="grid-column:span 2">Item name<input name="name" required></label>
        <label class="field">Type<select name="type">${typeOpts}</select></label><label class="field">Parent ID<input name="parent" placeholder="P1"></label><label class="field">Duration (working days)<input type="number" name="dur" min="1" value="5"></label>
        <label class="field">Predecessors<input name="preds" placeholder="A1, A2"></label><button class="btn pri">Add item</button></form>` : ''}</div>
  <div class="card"><h3>Weekly report template <span class="sub">ADM006 · WSR010</span></h3><p class="muted" style="margin:0 0 8px">A prompt shows inside each highlight box. Untick "Required" for a field that need not be filled to download the report.</p>
    <div class="tbl-wrap" data-noexp><table><thead><tr><th>Highlight</th><th>Prompt shown to the writer</th><th>Required</th></tr></thead><tbody>
    ${window.__ITPH_WSR.FIELDS.map(f => `<tr><td>${f.label}</td><td><input class="inp" style="width:100%" data-c="wsrtp" data-k="${f.key}" value="${esc(wsr.fields[f.key].prompt)}"></td><td><input type="checkbox" data-c="wsrtr" data-k="${f.key}" ${wsr.fields[f.key].required !== false ? 'checked' : ''}></td></tr>`).join('')}</tbody></table></div></div>
  <div class="card"><h3>Dashboard template <span class="sub">ADM006 · DAS010</span></h3><div class="row" style="gap:16px;flex-wrap:wrap">
    ${[['status', 'Status by month'], ['rag', 'RAG by week'], ['milestones', 'Milestone forecast'], ['releases', 'MVPs and releases']].map(([k, l]) => `<label class="row" style="gap:6px"><input type="checkbox" data-c="dtc" data-k="${k}" ${dash.cards[k] !== false ? 'checked' : ''}> ${l}</label>`).join('')}</div>
    <div class="row" style="gap:12px;margin-top:10px"><label class="field" style="margin:0">Default segment<input class="inp" data-c="dtf" data-k="segment" value="${esc(dash.filters.segment)}" placeholder="All"></label>
      <label class="field" style="margin:0">Default RAG<select class="inp" data-c="dtf" data-k="rag"><option value="">All</option>${['G', 'A', 'R'].map(k => `<option value="${k}" ${dash.filters.rag === k ? 'selected' : ''}>${RAGL[k]}</option>`).join('')}</select></label></div></div>`;
}
function bpiSetTpl(type, mut) {
  let t = bpiTpl(type)[0];
  if (!t) { t = { id: 'NEWT' + Date.now(), type, name: type === 'WSR' ? 'Weekly report template' : 'Dashboard template', desc: '', isDefault: true, data: {} }; (S.templates || (S.templates = [])).push(t); }
  const base = type === 'WSR' ? window.__ITPH_TPL.DEFAULT_WSR : window.__ITPH_TPL.DEFAULT_DASH; t.data = window.__ITPH_TPL.parseTemplate(JSON.stringify(t.data), base); mut(t.data); audit('Modify', `${type} template`);
}

/* ADM012 — report and dashboard builder */
function aReports() {
  const R = window.__ITPH_REPORT; const reps = bpiTpl('Report'); const d = ui.rb || (ui.rb = { name: '', dataset: 'tasks', columns: ['project', 'name', 'finish'], filters: [{ field: '', op: 'eq', value: '' }], sort: { field: '', dir: 'asc' }, groupBy: '', sumField: '', chart: 'table', desc: '' });
  const ds = R.DATASETS[d.dataset]; const fopts = (sel, blank) => `${blank ? '<option value=""></option>' : ''}${ds.fields.map(f => `<option value="${f.key}" ${f.key === sel ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}`;
  const problems = R.validateReport(d); const res = problems.length ? null : R.runReport(d, bpiDataset(d.dataset));
  return `<div class="head"><div><div class="kicker">Administration</div><h1>Reports and dashboards</h1></div></div>
  <p class="note">Build a report from any dataset. Saved reports appear in the Reports menu for everyone who can see the data, and can be exported to CSV, Excel, PPT and PDF.</p>
  <div class="card"><h3>Saved reports <span class="sub">ADM012</span></h3><div class="tbl-wrap" data-noexp><table><thead><tr><th>Name</th><th>Dataset</th><th></th></tr></thead><tbody>
    ${reps.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(R.DATASETS[r.data.dataset]?.label || '')}</td><td style="white-space:nowrap"><button class="btn sm ghost" data-a="rbedit" data-id="${esc(r.id)}">Edit</button><button class="btn sm danger" data-a="rbdel" data-id="${esc(r.id)}">${ui.confirm === 'rb' + r.id ? 'Confirm' : 'Delete'}</button></td></tr>`).join('') || '<tr><td colspan="3" class="muted">None yet.</td></tr>'}</tbody></table></div></div>
  <div class="card"><h3>${ui.rbSel ? 'Edit report' : 'New report'}</h3><div class="grid g3" style="gap:12px">
    <label class="field">Name<input class="inp" data-c="rb" data-k="name" value="${esc(d.name)}"></label>
    <label class="field">Dataset<select class="inp" data-c="rb" data-k="dataset">${Object.entries(R.DATASETS).map(([k, v]) => `<option value="${k}" ${d.dataset === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
    <label class="field">Description<input class="inp" data-c="rb" data-k="desc" value="${esc(d.desc || '')}"></label></div>
    <div style="margin-top:10px"><b style="font-size:12.5px">Columns</b><div class="row" style="gap:6px 14px;flex-wrap:wrap;margin-top:4px">${ds.fields.map(f => `<label class="row" style="gap:5px"><input type="checkbox" data-c="rbcol" data-k="${f.key}" ${d.columns.includes(f.key) ? 'checked' : ''}> ${esc(f.label)}</label>`).join('')}</div></div>
    <div style="margin-top:10px"><b style="font-size:12.5px">Filters</b>${d.filters.map((fl, i) => `<div class="row" style="gap:8px;margin-top:4px"><select class="inp" data-c="rbf" data-i="${i}" data-k="field">${fopts(fl.field, true)}</select><select class="inp" data-c="rbf" data-i="${i}" data-k="op">${R.OPS.map(([o, l]) => `<option value="${o}" ${fl.op === o ? 'selected' : ''}>${l}</option>`).join('')}</select><input class="inp" data-c="rbf" data-i="${i}" data-k="value" value="${esc(fl.value)}" placeholder="value"></div>`).join('')}
      <button class="btn sm ghost" data-a="rbaddf" style="margin-top:6px">+ Add filter</button></div>
    <div class="grid g3" style="gap:12px;margin-top:10px"><label class="field">Sort by<select class="inp" data-c="rbs" data-k="field">${fopts(d.sort.field, true)}</select></label><label class="field">Direction<select class="inp" data-c="rbs" data-k="dir"><option value="asc" ${d.sort.dir === 'asc' ? 'selected' : ''}>Ascending</option><option value="desc" ${d.sort.dir === 'desc' ? 'selected' : ''}>Descending</option></select></label>
      <label class="field">Group by (counts rows)<select class="inp" data-c="rb" data-k="groupBy">${fopts(d.groupBy, true)}</select></label>
      <label class="field">Sum of (number field)<select class="inp" data-c="rb" data-k="sumField"><option value=""></option>${ds.fields.filter(f => f.type === 'num').map(f => `<option value="${f.key}" ${d.sumField === f.key ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}</select></label>
      <label class="field">Show as<select class="inp" data-c="rb" data-k="chart"><option value="table" ${d.chart !== 'bar' ? 'selected' : ''}>Table</option><option value="bar" ${d.chart === 'bar' ? 'selected' : ''}>Table and bar chart (when grouped)</option></select></label></div>
    ${problems.length ? `<p class="note" style="color:var(--bad)">${problems.map(esc).join(' · ')}</p>` : ''}
    <div class="row" style="margin-top:10px;gap:8px"><button class="btn pri" data-a="rbsave" ${problems.length ? 'disabled' : ''}>Save report</button><button class="btn" data-a="rbnew">Start a new one</button></div></div>
  ${res ? `<div class="card"><h3>Preview <span class="sub">${res.rows.length} row${res.rows.length === 1 ? '' : 's'}</span></h3><div class="tbl-wrap"><table><thead><tr>${res.columns.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${res.rows.slice(0, 50).map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="9" class="muted">No rows match.</td></tr>'}</tbody></table></div></div>` : ''}`;
}
