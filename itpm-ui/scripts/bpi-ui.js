/* ---------- BPI additions: baselines, task PV/EV, programs (src/bpi.js via window.__ITPH_BPI) ---------- */
function bpiActive(p) { return p.baselines.find(b => b.v === p.activeBaseline) || p.baselines.at(-1); }
function bpiBaselineBar(p, ed) {
  const B = p.baselines; const cur = bpiActive(p);
  const opts = B.map(b => `<option value="${b.v}" ${b.v === cur.v ? 'selected' : ''}>v${b.v} · ${fd(b.date)}${b.note ? ' · ' + esc(b.note) : ''}</option>`).join('');
  return `<div class="row muted" style="font-size:12.5px;gap:8px;flex-wrap:wrap">Baseline in force
    <select class="inp" style="height:30px" data-c="basesel" aria-label="Baseline used for %Planned, %Actual and RAG status" ${ed ? '' : 'disabled'}>${opts}</select>
    <span class="faint">${B.length} saved · it sets %Planned, the schedule KPI and the RAG status</span>
    ${ed ? `<button class="btn sm warn" data-a="rebase">${ui.confirm === 'rebase' ? 'Click again to confirm' : 'Set new baseline'}</button>` : ''}</div>`;
}
function bpiPvEvCard(p) {
  const BP = window.__ITPH_BPI; const rows = p.activities.filter(a => !a.ms && +a.cost > 0);
  if (!rows.length) return `<div class="card"><h3>Planned and earned value by task</h3><p class="muted" style="margin:0">Give tasks a budget in the Schedule tab to see their planned value (PV) and earned value (EV).</p></div>`;
  const calc = rows.map(a => { const pl = expectedPct(a); return { a, pl, ...BP.taskPvEv(a, pl) }; });
  const t = calc.reduce((s, x) => ({ bac: s.bac + x.bac, pv: s.pv + x.pv, ev: s.ev + x.ev }), { bac: 0, pv: 0, ev: 0 });
  return `<div class="card"><h3>Planned and earned value by task <span class="sub">WP023 · baseline v${bpiActive(p).v}</span></h3>
    <div class="tbl-wrap"><table><thead><tr><th>ID</th><th>Task</th><th class="r">Budget (₱)</th><th class="r">% planned</th><th class="r">PV (₱)</th><th class="r">% complete</th><th class="r">EV (₱)</th><th class="r">EV − PV (₱)</th></tr></thead><tbody>
    ${calc.map(x => `<tr><td class="mono">${esc(x.a.id)}</td><td>${esc(x.a.name)}</td><td class="r num">${pesoFull(x.bac)}</td><td class="r num">${pct(x.pl)}</td><td class="r num">${pesoFull(x.pv)}</td><td class="r num">${pct(x.a.pct)}</td><td class="r num">${pesoFull(x.ev)}</td><td class="r num" style="color:${x.sv < 0 ? 'var(--bad)' : 'inherit'}">${x.sv < 0 ? '−' : ''}${pesoFull(Math.abs(x.sv))}</td></tr>`).join('')}
    <tr style="font-weight:600"><td></td><td>Total</td><td class="r num">${pesoFull(t.bac)}</td><td class="r num">${t.bac ? pct(t.pv / t.bac * 100) : '—'}</td><td class="r num">${pesoFull(t.pv)}</td><td class="r num">${t.bac ? pct(t.ev / t.bac * 100) : '—'}</td><td class="r num">${pesoFull(t.ev)}</td><td class="r num">${t.ev - t.pv < 0 ? '−' : ''}${pesoFull(Math.abs(t.ev - t.pv))}</td></tr></tbody></table></div>
    <p class="note" style="margin:8px 0 0">PV = task budget × % planned by today on the baseline in force. EV = task budget × % complete. SPI ${t.pv ? (t.ev / t.pv).toFixed(2) : 'n/a'}.</p></div>`;
}
function bpiProgramGroups(all) {
  const progs = S.programs || []; const out = [];
  for (const g of progs) { const items = all.filter(x => x.p.program === g.id); if (items.length) out.push({ g, items }); }
  const un = all.filter(x => !x.p.program || !progs.some(g => g.id === x.p.program)); if (un.length && out.length) out.push({ g: { id: '', name: 'Not in a program', segment: '' }, items: un });
  return out;
}
function bpiProgramsCard(all) {
  const BP = window.__ITPH_BPI; const groups = bpiProgramGroups(all); if (!groups.some(x => x.g.id)) return '';
  const rolled = groups.map(({ g, items }) => ({ g, items, r: BP.programRollup(items.map(x => ({ id: x.p.id, activities: x.p.activities, rag: x.h.overall })), expectedPct) }));
  const lo = rolled.map(x => x.r.start).filter(Boolean).sort()[0], hi = rolled.map(x => x.r.finish).filter(Boolean).sort().pop();
  const span = Math.max(1, calDiff(lo, hi)); const X = d => Math.max(0, Math.min(100, calDiff(lo, d) / span * 100));
  return `<div class="card"><h3>Programs <span class="sub">WP035 · WP036 · the schedules of each program's projects, consolidated</span></h3>
    <div class="tbl-wrap"><table><thead><tr><th>Program</th><th>Segment</th><th class="r">Projects</th><th>Start</th><th>Baseline finish</th><th>Forecast finish</th><th class="r">% actual</th><th class="r">% planned</th><th>Schedule KPI</th><th>Worst project</th></tr></thead><tbody>
    ${rolled.map(({ g, r }) => `<tr><td><b>${esc(g.name)}</b></td><td>${esc(g.segment || '—')}</td><td class="r num">${r.projects}</td><td class="num">${fd(r.start)}</td><td class="num">${fd(r.baseFinish)}</td><td class="num">${fd(r.finish)}</td><td class="r num">${pct(r.complete)}</td><td class="r num">${pct(r.expected)}</td><td>${r.kpi === null ? 'n/a ' : r.kpi.toFixed(2) + ' '}${pill(r.kpiRag)}</td><td>${pill(r.worst)}</td></tr>`).join('')}</tbody></table></div>
    <div style="margin-top:12px">${rolled.map(({ g, items }) => `<div style="margin-bottom:10px"><div class="muted" style="font-size:12px;font-weight:600;margin-bottom:4px">${esc(g.name)}</div>
      ${items.map(x => { const s = x.p.activities.map(a => a.bStart).filter(Boolean).sort()[0], f = x.p.activities.map(a => a.fFinish).filter(Boolean).sort().pop(); if (!s) return '';
        return `<div class="hbar"><span>${esc(x.p.name)}</span><div class="track"><div class="b1" style="margin-left:${X(s)}%;width:${Math.max(1.5, X(f) - X(s))}%;background:${x.h.overall === 'R' ? 'var(--bad)' : x.h.overall === 'A' ? 'var(--warn)' : 'var(--accent)'}"></div></div><span class="num">${fds(s)} – ${fds(f)}</span></div>`; }).join('')}</div>`).join('')}</div></div>`;
}
function aPrograms() {
  const ps = S.programs || [];
  return `<div class="head"><div><div class="kicker">Program schedule</div><h1>Programs</h1></div></div>
  <p class="note">A program groups the projects (sub-initiatives) that deliver it. The Portfolio shows one consolidated schedule and KPI per program.</p>
  <form class="inline card" data-form="program"><label class="field" style="grid-column:span 2">Program name<input name="name" required></label><label class="field">Segment<input name="segment"></label><button class="btn pri">Add program</button></form>
  <div class="tbl-wrap"><table><thead><tr><th>Program</th><th>Segment</th><th class="r">Projects</th><th></th></tr></thead><tbody>
  ${ps.map(g => `<tr><td><b>${esc(g.name)}</b></td><td>${esc(g.segment || '—')}</td><td class="r num">${S.projects.filter(p => p.program === g.id).length}</td><td><button class="btn sm danger" data-a="delprog" data-id="${g.id}">${ui.confirm === 'prog' + g.id ? 'Confirm' : 'Remove'}</button></td></tr>`).join('') || '<tr><td colspan="4" class="muted">No programs yet.</td></tr>'}</tbody></table></div>
  <div class="card"><h3>Assign projects</h3><div class="tbl-wrap"><table><thead><tr><th>Project</th><th>Program</th></tr></thead><tbody>
  ${S.projects.map(p => `<tr><td>${esc(p.name)} <span class="mono faint">${p.code}</span></td><td><select class="inp" data-c="projprog" data-p="${p.id}" aria-label="Program of ${esc(p.name)}"><option value="">— none —</option>${ps.map(g => `<option value="${g.id}" ${p.program === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div></div>`;
}

/* ---------- project binder (PB003 register · PB004 aging · PB010 CR tally · PB013 metrics log · PB014 leading indicator) ---------- */
const BND_CATS = ['Technical', 'Resource', 'Schedule', 'Budget', 'Vendor', 'Regulatory', 'Scope', 'Other'];
const BND_PLURAL = { Dependency: 'Dependencies', Risk: 'Risks', Issue: 'Issues', Defect: 'Defects', 'Change Request': 'Change requests' };
const bndCanEdit = p => canEdit(p);
function bndExt(p, type, id) { return (p.ext || []).find(e => e.type === type && e.link === id); }
function bndItems(p) {
  const out = [];
  for (const r of p.risks) { const e = bndExt(p, 'Risk', r.id) || {}; out.push({ p, key: 'Risk:' + r.id, type: 'Risk', core: r, no: r.id, desc: r.title, pri: riskLevel(riskScore(r)), assignee: r.owner, target: e.target || '', actionStatus: e.actionStatus || '', closed: r.status === 'Closed', cat: e.cat || r.cat || '', e }); }
  for (const i of p.issues) { const e = bndExt(p, 'Issue', i.id) || {}; out.push({ p, key: 'Issue:' + i.id, type: 'Issue', core: i, no: i.id, desc: i.title, pri: i.pri, assignee: i.owner, target: i.target || '', actionStatus: e.actionStatus || '', closed: i.status === 'Resolved', cat: e.cat || i.cat || '', e }); }
  for (const x of p.binder || []) out.push({ p, key: x.type + ':' + x.id, type: x.type, core: null, no: x.no, desc: x.desc, pri: x.pri, assignee: x.assignee, target: x.target, actionStatus: x.actionStatus, closed: x.status === 'Closed', cat: x.cat, e: x });
  return out;
}
const bndDot = r => `<span class="dot ${r}"></span>`;
function bndMetrics(items, title) {
  const B = window.__ITPH_BINDER; const li = B.leadingIndicator(items, TODAY);
  const rows = ['Dependency', 'Risk', 'Issue', 'Defect', 'Change Request'].map(t => ({ t, ...B.tally(items.filter(i => i.type === t), TODAY) }));
  return `<div class="card"><h3>${title} <span class="sub">PB013 · open items by aging, as of ${fd(TODAY)}</span></h3>
    <div class="tbl-wrap"><table><thead><tr><th>Type</th><th class="r">${bndDot('R')} Red</th><th class="r">${bndDot('A')} Amber</th><th class="r">${bndDot('G')} Green</th><th class="r">Open</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${BND_PLURAL[r.t]}</td><td class="r num">${r.R}</td><td class="r num">${r.A}</td><td class="r num">${r.G}</td><td class="r num">${r.total}</td></tr>`).join('')}</tbody></table></div>
    <div class="row" style="margin-top:10px;gap:14px;flex-wrap:wrap"><b>Leading indicators</b><span>Risks ${pill(li.risk)}</span><span>Issues ${pill(li.issue)}</span><span>Overall ${pill(li.overall)} <span class="faint">PB014 · the most severe of risks and issues</span></span></div>
    <p class="note" style="margin:8px 0 0">Aging = days past the target date while the action item is not Done. Red 8+ days, Amber 3–7, Green up to 2.</p></div>`;
}
function bndCrCard(items, title) {
  const rows = window.__ITPH_BINDER.crTally(items.filter(i => i.type === 'Change Request').map(i => ({ crKind: i.e.crKind, crStatus: i.e.crStatus, approved: i.e.approved })));
  return `<div class="card"><h3>${title} <span class="sub">PB010 · approved, by approval month</span></h3>
    ${rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>Month</th><th class="r">Reschedules</th><th class="r">Timeline rebaselines</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${MONF[+r.month.slice(5) - 1]} ${r.month.slice(0, 4)}</td><td class="r num">${r.reschedule}</td><td class="r num">${r.rebaseline}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="margin:0">No approved reschedule or rebaseline change requests yet.</p>'}</div>`;
}
function bpiBinderPortfolio(all) {
  const items = all.flatMap(x => bndItems(x.p)); if (!items.length) return '';
  return `<div class="grid g2">${bndMetrics(items, 'Metrics log · portfolio')}${bndCrCard(items, 'Change requests · portfolio')}</div>`;
}
function bndField(name, label, type, val, opts) {
  const v = val ?? '';
  if (type === 'area') return `<label class="field" style="grid-column:1/-1">${label}<textarea name="${name}" rows="2">${esc(v)}</textarea></label>`;
  if (type === 'sel') return `<label class="field">${label}<select name="${name}"><option value=""></option>${opts.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}" ${ov === v ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select></label>`;
  return `<label class="field">${label}<input ${type === 'date' ? 'type="date"' : ''} name="${name}" value="${esc(v)}"></label>`;
}
function bndEditor(p, it, ed) {
  const e = it.e; const own = !it.core; const users = S.users.filter(u => ['PM', 'TEAM'].includes(u.role) && u.status === 'Active').map(u => [u.id, u.name]);
  const ms = [...new Set([...p.activities.filter(a => a.ms).map(a => a.name), e.milestone].filter(Boolean))];
  const fld = (n, l, t, v, o) => bndField(n, l, t, v, o);
  const ro = (l, v) => `<label class="field">${l}<input value="${esc(v || '—')}" disabled></label>`;
  const aging = window.__ITPH_BINDER.agingDays({ target: it.target, actionStatus: it.actionStatus, closed: it.closed }, TODAY);
  return `<div class="card" id="bnd-editor"><h3>${esc(it.no)} · ${it.type} <span class="sub">PB003 · register details</span></h3>
    <form data-form="bnd"><fieldset ${ed ? '' : 'disabled'} style="border:0;padding:0;margin:0"><div class="grid g3">
      ${own ? fld('desc', 'Event description', 'text', e.desc) : ro('Event description', it.desc)}
      ${own ? fld('pri', 'Priority level', 'sel', e.pri, ['Critical', 'High', 'Medium', 'Low']) : ro('Priority level', it.pri)}
      ${fld('cat', 'Event category', 'sel', e.cat || it.cat, BND_CATS)}
      ${fld('milestone', 'Milestone where identified', 'sel', e.milestone, ms)}
      ${fld('raisedBy', 'Raised by', 'sel', e.raisedBy, users)}
      ${fld('dateAssigned', 'Date assigned', 'date', e.dateAssigned)}
      ${fld('source', 'Initial notification source', 'text', e.source)}
      ${own ? fld('assignee', 'Assigned to', 'sel', e.assignee, users) : ro('Assigned to', uname(it.assignee))}
      ${fld('org', 'Org. unit', 'text', e.org)}
      ${it.type === 'Issue' ? ro('Target date', fd(it.target)) : fld('target', 'Target date', 'date', e.target)}
      ${fld('executed', 'Date executed', 'date', e.executed)}
      ${fld('action', 'Action item', 'text', e.action)}
      ${fld('actionStatus', 'Action item status', 'sel', e.actionStatus, ['Open', 'In Progress', 'Done'])}
      ${own ? fld('status', 'Overall status', 'sel', e.status || 'Open', ['Open', 'In Progress', 'Closed']) : ro('Overall status', it.closed ? 'Closed' : 'Open')}
      ${ro('Aging', it.closed || it.actionStatus === 'Done' || !it.target ? '—' : aging + ' day(s) past target')}
      ${it.type === 'Change Request' ? fld('crKind', 'Change request kind', 'sel', e.crKind, ['Reschedule', 'Rebaseline', 'Scope change', 'Budget change', 'Other']) + fld('crStatus', 'CR status', 'sel', e.crStatus || 'Pending', ['Pending', 'Approved', 'Rejected']) + fld('approved', 'CR approval date', 'date', e.approved) : ''}
      ${fld('planned', 'Planned actions', 'area', e.planned)}${fld('info', 'Additional info', 'area', e.info)}${fld('result', 'Results of action item', 'area', e.result)}
    </div></fieldset>
    <div class="row" style="margin-top:10px;gap:8px"><span class="faint" style="font-size:12px">Last status update ${fd(e.lastUpdate)}</span><span style="flex:1"></span><button type="button" class="btn sm" data-a="bndclose">Close</button>${ed ? '<button class="btn sm pri">Save</button>' : ''}</div></form></div>`;
}
function tBinder(p) {
  const ed = bndCanEdit(p); const items = bndItems(p); const B = window.__ITPH_BINDER;
  const f = ui.bndType || ''; const shown = items.filter(i => !f || i.type === f);
  const sel = shown.length ? '' : '';
  const users = S.users.filter(u => ['PM', 'TEAM'].includes(u.role) && u.status === 'Active');
  const open = ui.bnd && items.find(i => i.key === ui.bnd);
  return `<div class="grid g2">${bndMetrics(items, 'Metrics log')}${bndCrCard(items, 'Change requests')}</div>
  <div class="card"><h3>Register <span class="row"><select class="inp" data-c="bndtype" aria-label="Filter by event type"><option value="">All event types</option>${['Risk', 'Issue', 'Dependency', 'Defect', 'Change Request'].map(t => `<option ${f === t ? 'selected' : ''}>${t}</option>`).join('')}</select></span></h3>
    <div class="tbl-wrap"><table><thead><tr><th>No.</th><th>Type</th><th>Description</th><th>Category</th><th>Priority</th><th>Assigned to</th><th>Target</th><th>Action item</th><th>Aging</th><th>Status</th><th></th></tr></thead><tbody>
    ${shown.map(i => { const d = B.agingDays({ target: i.target, actionStatus: i.actionStatus, closed: i.closed }, TODAY); const live = !i.closed && i.actionStatus !== 'Done' && i.target;
      return `<tr class="${ui.bnd === i.key ? 'mine' : ''}"><td class="mono">${esc(i.no)}</td><td>${i.type}</td><td>${esc(i.desc)}</td><td>${esc(i.cat || '—')}</td><td>${esc(i.pri || '—')}</td><td>${esc(uname(i.assignee) || '—')}</td><td class="num">${fd(i.target)}</td><td>${esc(i.actionStatus || '—')}</td>
        <td>${live ? `${pill(B.agingRag(d))} <span class="faint">${d}d</span>` : '<span class="faint">—</span>'}</td><td>${i.closed ? 'Closed' : 'Open'}</td>
        <td style="white-space:nowrap"><button class="btn sm ghost" data-a="bndopen" data-k="${esc(i.key)}">${ed ? 'Details' : 'View'}</button>${ed && !i.core ? `<button class="btn sm danger" data-a="bnddel" data-k="${esc(i.key)}">${ui.confirm === 'bnd' + i.key ? 'Confirm' : 'Remove'}</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="11" class="muted">Nothing in the register yet.</td></tr>'}</tbody></table></div>
    ${ed ? `<form class="inline" data-form="bndnew" style="margin-top:12px"><label class="field">Add<select name="type"><option>Dependency</option><option>Defect</option><option>Change Request</option></select></label>
      <label class="field" style="grid-column:span 2">Event description<input name="desc" required></label>
      <label class="field">Priority<select name="pri"><option>Medium</option><option>High</option><option>Critical</option><option>Low</option></select></label>
      <label class="field">Assigned to<select name="assignee">${users.map(u => `<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select></label>
      <label class="field">Target date<input type="date" name="target" required value="${TODAY}"></label>
      <button class="btn pri">Add to register</button></form>` : ''}</div>
  ${bpiReleasesCard(p, ed)}
  ${open ? bndEditor(p, open, ed) : ''}`;
}

/* ---------- weekly status report (WSR001.2 · WSR004 · WSR010 · WSR016) ---------- */
function wsrOf(p, ws) { return (p.wsr || []).find(w => w.weekOf === ws); }
function wsrSnapshot(p, ws, text) {
  const W = window.__ITPH_WSR, B = window.__ITPH_BINDER; const h = health(p); const sc = h.sc; const items = bndItems(p); const li = B.leadingIndicator(items, TODAY);
  const nS = addDaysISO(ws, 7), nE = addDaysISO(ws, 11);
  const age = i => B.agingRag(B.agingDays({ target: i.target, actionStatus: i.actionStatus, closed: i.closed }, TODAY));
  const top = type => items.filter(i => i.type === type && !i.closed).sort((a, b) => (['Critical', 'High', 'Medium', 'Low'].indexOf(a.pri) + 9) % 9 - (['Critical', 'High', 'Medium', 'Low'].indexOf(b.pri) + 9) % 9).map(i => ({ no: i.no, desc: i.desc, pri: i.pri, aging: age(i) }));
  return { project: { name: p.name, code: p.code, pm: uname(p.pm), sponsor: uname(p.ps), bu: p.bu }, week: { start: ws, end: W.weekEnd(ws), label: `${fds(ws)} – ${fd(W.weekEnd(ws))}` }, generated: TODAY,
    kpi: { value: sc.kpi, rag: sc.kpiRag, actual: sc.complete, planned: sc.expected }, health: { overall: h.overall, sched: h.sched, cost: h.cost, risk: h.risk, issue: h.issue },
    schedule: { base: sc.baseFinish, fore: sc.foreFinish, var: sc.variance }, fin: { budget: h.f.current, eac: p.fin.eac, eacPct: h.f.eacPct, actual: p.fin.actual, contLeft: h.f.remainingCont }, leading: li,
    milestones: p.activities.filter(a => a.ms).map(a => ({ name: a.name, base: a.bFinish, fore: a.fFinish, status: a.pct >= 100 ? (a.aFinish > a.bFinish ? 'Late' : 'Achieved') : a.fFinish > a.bFinish ? 'Late' : 'On track' })),
    risks: top('Risk'), issues: top('Issue'), next: p.activities.filter(a => a.pct < 100 && a.fStart <= nE && a.fFinish >= nS).map(a => ({ id: a.id, name: a.name, start: a.fStart, finish: a.fFinish })), text };
}
function addDaysISO(s, n) { return iso(new Date(D(s).getTime() + n * 864e5)); }
function wsrRead() { const o = {}; document.querySelectorAll('[data-wsr-f]').forEach(el => { o[el.dataset.wsrF] = el.value; }); return o; }
function wsrWeeks(p) { const cur = window.__ITPH_WSR.weekStart(TODAY); const set = new Set([cur, ...(p.wsr || []).map(w => w.weekOf)]); for (let i = 1; i <= 6; i++) set.add(addDaysISO(cur, -7 * i)); return [...set].sort().reverse(); }
function tWsr(p) {
  const W = window.__ITPH_WSR; const ed = canEdit(p); const ws = ui.wsrWeek && wsrWeeks(p).includes(ui.wsrWeek) ? ui.wsrWeek : W.weekStart(TODAY);
  const saved = wsrOf(p, ws); const final = saved?.status === 'Final'; const text = saved ? saved.text : {};
  const snap = final && saved.snapshot ? JSON.parse(saved.snapshot) : wsrSnapshot(p, ws, text); const k = snap.kpi;
  const tw = bpiTplOne('WSR', window.__ITPH_TPL.DEFAULT_WSR); const miss = W.missingFields(text, window.__ITPH_TPL.wsrRequired(tw)); const can = !miss.length;
  return `<div class="row" style="gap:10px;flex-wrap:wrap;margin-bottom:10px"><label class="field" style="margin:0">Week<select class="inp" data-c="wsrweek">${wsrWeeks(p).map(w => `<option value="${w}" ${w === ws ? 'selected' : ''}>${fds(w)} – ${fd(W.weekEnd(w))}${wsrOf(p, w) ? ' · ' + wsrOf(p, w).status : ''}</option>`).join('')}</select></label>
    <span class="muted" style="font-size:12.5px">${final ? 'Final: the figures below were frozen when it was finalised.' : 'Draft: figures are pulled live from the schedule, risks, issues and finance.'}</span></div>
  <div class="grid g4">
    <div class="card stat"><span class="l">Schedule KPI <span class="faint">%Actual ÷ %Planned</span></span><span class="v">${k.value === null ? 'n/a' : k.value.toFixed(2)}</span><span class="d">${pill(k.rag)} ${k.actual.toFixed(1)}% actual · ${k.planned.toFixed(1)}% planned</span></div>
    <div class="card stat"><span class="l">Overall health</span><span class="v">${RAGL[snap.health.overall]}</span><span class="d">Schedule ${pill(snap.health.sched)} Cost ${pill(snap.health.cost)}</span></div>
    <div class="card stat"><span class="l">Leading indicators</span><span class="v">${RAGL[snap.leading.overall]}</span><span class="d">Risks ${pill(snap.leading.risk)} Issues ${pill(snap.leading.issue)}</span></div>
    <div class="card stat"><span class="l">Report</span><span class="v">${W.FIELDS.length - W.missingFields(text).length} / 9</span><span class="d">highlight fields filled in</span></div></div>
  <div class="card"><h3>Highlights <span class="sub">WSR010 · page 2 of the report</span></h3>
    <div class="grid g3" style="gap:12px">${W.FIELDS.map(f => `<label class="field">${f.label}${tw.fields[f.key].required === false ? ' <span class="faint">(optional)</span>' : ''}<textarea rows="4" data-wsr-f="${f.key}" placeholder="${esc(tw.fields[f.key].prompt)}" ${ed && !final ? '' : 'disabled'}>${esc(text[f.key] || '')}</textarea></label>`).join('')}</div>
    <div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap">
      ${ed && !final ? `<button class="btn" data-a="wsrsave">Save draft</button><button class="btn pri" data-a="wsrfinal" ${can ? '' : 'disabled title="Fill in all nine fields first"'}>Finalise report</button>` : ''}
      ${ed && final ? `<button class="btn warn" data-a="wsrreopen">Reopen</button>` : ''}
      <span style="flex:1"></span>
      <button class="btn" data-a="wsrdl" data-f="pptx" ${can ? '' : 'disabled'}>Download PPT</button><button class="btn" data-a="wsrdl" data-f="pdf" ${can ? '' : 'disabled'}>Download PDF</button></div>
    ${can ? '' : `<p class="note" style="margin:8px 0 0">To download, fill in: ${miss.map(esc).join(', ')}. (Save draft keeps what you typed.)</p>`}</div>
  <p class="note">The report has 3 pages: summary and KPI, the nine highlights, then milestones, top risks and issues, and next week's planned activities. Without a BPI template yet, the layout is a standard one; give me the template and I will match it.</p>`;
}
function wsrSave(finalise) {
  const p = proj(ui.sel); const ws = ui.wsrWeek || window.__ITPH_WSR.weekStart(TODAY); const text = wsrRead(); const snap = wsrSnapshot(p, ws, text);
  let w = wsrOf(p, ws); if (!w) { w = { id: 'NEWW' + Date.now(), weekOf: ws, status: 'Draft' }; (p.wsr || (p.wsr = [])).push(w); }
  Object.assign(w, { text, projectStatus: window.__ITPH_DASH.statusCategory(p.status, snap.health.overall) || '', kpi: snap.kpi.value, kpiRag: snap.kpi.rag, overall: snap.health.overall, actual: snap.kpi.actual, planned: snap.kpi.planned });
  if (finalise) { if (window.__ITPH_WSR.missingFields(text, window.__ITPH_TPL.wsrRequired(bpiTplOne('WSR', window.__ITPH_TPL.DEFAULT_WSR))).length) { toast('Fill in the required fields first'); return; } w.status = 'Final'; w.snapshot = JSON.stringify(snap); }
  audit('Modify', `Weekly report ${fds(ws)} (${p.code})`); toast(finalise ? 'Report finalised' : 'Draft saved');
}
async function wsrDownload(kind) {
  const p = proj(ui.sel); const W = window.__ITPH_WSR; const ws = ui.wsrWeek || W.weekStart(TODAY); const saved = wsrOf(p, ws);
  const text = saved?.status === 'Final' ? saved.text : wsrRead(); if (W.missingFields(text, window.__ITPH_TPL.wsrRequired(bpiTplOne('WSR', window.__ITPH_TPL.DEFAULT_WSR))).length) { toast('Fill in the required fields first'); return; }
  const snap = saved?.status === 'Final' && saved.snapshot ? JSON.parse(saved.snapshot) : wsrSnapshot(p, ws, text); const deck = W.buildDeck(snap);
  try {
    const buf = await (kind === 'pptx' ? W.toPptx(deck) : W.toPdf(deck));
    const blob = new Blob([buf], { type: kind === 'pptx' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : 'application/pdf' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `WSR_${p.code.replace(/\s+/g, '')}_${ws}.${kind}`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    audit('Export', `Weekly report ${kind.toUpperCase()} ${fds(ws)} (${p.code})`); toast(`${kind.toUpperCase()} downloaded`);
  } catch (e) { console.error(e); toast('Could not create the file: ' + (e.message || e)); }
}
