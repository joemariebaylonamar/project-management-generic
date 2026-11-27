/* ---------- dashboards (DAS002 · DAS003 · DAS004 · DAS008 · DAS010 · DAS011) — rules in src/dash.js ---------- */
const DASH_COL = { 'Planning': 'color-mix(in srgb, var(--info) 35%, var(--faint))', 'Completed': 'var(--info)', 'Implemented': 'color-mix(in srgb, var(--ok) 50%, var(--info))', 'Ongoing (On-Track)': 'var(--ok)', 'Ongoing (At Risk)': 'var(--warn)', 'Ongoing (Not Met)': 'var(--bad)', 'On Hold': 'var(--faint)', 'Cancelled': 'var(--muted)',
  G: 'var(--ok)', A: 'var(--warn)', R: 'var(--bad)', onTime: 'var(--ok)', atRisk: 'var(--warn)', delayed: 'var(--bad)', planned: 'var(--info)', implemented: 'var(--ok)', atRiskOrDelayed: 'var(--bad)' };
function dashStack(rows, keys, label, opt = {}) {
  const W = 560, H = opt.h || 230, L = 30, B = 28, T = 10; const tot = r => keys.reduce((s, k) => s + (r.v[k] || 0), 0); const max = Math.max(1, ...rows.map(tot));
  const step = rows.length ? (W - L) / rows.length : 1; const bw = Math.min(54, step * 0.62); const Y = v => T + (1 - v / max) * (H - T - B);
  const ticks = [...new Set([0, Math.ceil(max / 2), max])];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" style="width:100%;height:auto;max-height:${H + 20}px">
    ${ticks.map(t => `<line x1="${L}" x2="${W}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--line)"/><text x="${L - 6}" y="${Y(t) + 4}" text-anchor="end" font-size="10" fill="var(--muted)">${t}</text>`).join('')}
    ${rows.map((r, i) => { const cx = L + step * i + step / 2; let acc = 0; const segs = keys.map(k => { const v = r.v[k] || 0; if (!v) return ''; const y0 = Y(acc + v), y1 = Y(acc); acc += v;
        return `<rect x="${cx - bw / 2}" y="${y0}" width="${bw}" height="${Math.max(0, y1 - y0 - 1)}" rx="2" fill="${DASH_COL[k]}"><title>${esc(r.label)} · ${esc(opt.names?.[k] || k)}: ${v}</title></rect>${y1 - y0 > 14 ? `<text x="${cx}" y="${(y0 + y1) / 2 + 4}" text-anchor="middle" font-size="11" font-weight="600" fill="#fff">${v}</text>` : ''}`; }).join('');
      return `${segs}<text x="${cx}" y="${H - 9}" text-anchor="middle" font-size="10.5" fill="var(--muted)">${esc(r.label)}</text>${tot(r) ? `<text x="${cx}" y="${Y(tot(r)) - 4}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${tot(r)}</text>` : ''}`; }).join('')}</svg>`;
}
const dashLegend = (keys, names = {}) => `<div class="legend" style="margin-top:6px">${keys.map(k => `<span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${DASH_COL[k]}"></i>${esc(names[k] || k)}</span>`).join('')}</div>`;
const dashDelta = n => n === null || n === undefined ? '' : `<span style="color:${n === 0 ? 'var(--faint)' : 'var(--ink2)'};font-size:12px">${n > 0 ? '▲' : n < 0 ? '▼' : '='} ${Math.abs(n)}</span>`;
function dashProjects(ps) { // the shape src/dash.js works on
  const DS = window.__ITPH_DASH;
  return ps.map(p => { const h = health(p); const seg = ((S.programs || []).find(g => g.id === p.program)?.segment) || p.bu || '';
    const ends = p.activities.map(a => a.fFinish || a.bFinish).filter(Boolean).sort();
    return { p, id: p.id, segment: seg, rag: h.overall, start: p.start || p.activities.map(a => a.bStart).filter(Boolean).sort()[0] || '', end: ends.at(-1) || '', live: DS.statusCategory(p.status, h.overall),
      reports: (p.wsr || []).filter(w => w.weekOf).map(w => ({ weekOf: w.weekOf, cat: w.projectStatus || DS.statusCategory(p.status, w.overall), rag: w.overall })) }; });
}
function vDash() {
  const DS = window.__ITPH_DASH; const dt = bpiTplOne('Dashboard', window.__ITPH_TPL.DEFAULT_DASH); const f = ui.dash || (ui.dash = { segment: dt.filters.segment, rag: dt.filters.rag, from: '', to: '' });
  const all = dashProjects(myProjects()); const segs = [...new Set(all.map(x => x.segment).filter(Boolean))].sort();
  const sc = DS.filterProjects(all, f);
  const months = DS.lastMonths(TODAY, 6); const trend = DS.statusTrend(sc, months.filter(m => (!f.from || m >= f.from.slice(0, 7)) && (!f.to || m <= f.to.slice(0, 7))), TODAY); const delta = DS.deltaVsPrevious(trend); const curRow = trend.at(-1);
  const weeks = DS.lastWeeks(TODAY, 8); const rt = DS.ragTrend(sc, weeks, TODAY); const withData = rt.filter(r => r.total > 0); const nowR = withData.at(-1), prevR = withData.at(-2);
  const ms = sc.flatMap(x => x.p.activities.filter(a => a.ms).map(a => ({ proj: x.p.code, name: a.name, base: a.bFinish, fore: a.fFinish, done: a.pct >= 100, achieved: a.aFinish }))).filter(m => (!f.from || m.base >= f.from) && (!f.to || m.base <= f.to));
  const mf = DS.milestoneForecast(ms, TODAY);
  const rel = sc.flatMap(x => (x.p.releases || []).map(r => ({ ...r, proj: x.p.code, planned: r.planned, forecast: r.forecast, implemented: r.implemented }))).filter(r => (!f.from || r.planned >= f.from) && (!f.to || r.planned <= f.to));
  const rf = DS.releaseForecast(rel, TODAY);
  const sel = (k, label, opts) => `<label class="field" style="margin:0">${label}<select class="inp" data-c="dashf" data-k="${k}"><option value="">All</option>${opts.map(o => `<option value="${esc(o[0])}" ${f[k] === o[0] ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label>`;
  const names = { onTime: 'On time', atRisk: 'At risk', delayed: 'Delayed', planned: 'Planned', implemented: 'Implemented', atRiskOrDelayed: 'At risk or delayed', G: 'On track', A: 'At risk', R: 'Critical' };
  const off = Object.keys(dt.cards).filter(k => dt.cards[k] === false);
  return { detail: `<style>${off.map(k => `[data-dc="${k}"]{display:none}`).join('')}</style><div class="head"><div><div class="kicker">Overall project dashboard · ${esc(ROLE_LABEL[role()])}</div><h1>${sc.length} project${sc.length === 1 ? '' : 's'} in view</h1></div>
      <div class="row" style="gap:8px"><span class="faint" style="font-size:12px" id="dash-fresh">Live · refreshes every minute</span></div></div>
    <div class="card"><div class="row" style="gap:12px;flex-wrap:wrap;align-items:flex-end">${sel('segment', 'Segment', segs.map(s => [s, s]))}${sel('rag', 'RAG status', [['G', 'On track'], ['A', 'At risk'], ['R', 'Critical']])}
      <label class="field" style="margin:0">From<input type="date" class="inp" data-c="dashf" data-k="from" value="${f.from}"></label><label class="field" style="margin:0">To<input type="date" class="inp" data-c="dashf" data-k="to" value="${f.to}"></label>
      <button class="btn sm" data-a="dashreset">Clear filters</button></div></div>
    <div class="card" data-dc="status"><h3>Projects by status, by month <span class="sub">DAS002 · vs previous month</span></h3>
      ${trend.some(r => r.total) ? `<div class="grid g2" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:16px;align-items:start"><div>${dashStack(trend.map(r => ({ label: MON[+r.month.slice(5) - 1] + ' ' + r.month.slice(2, 4), v: r.counts })), DS.CATS, 'Projects by status per month')}${dashLegend(DS.CATS)}</div>
        <div class="tbl-wrap"><table><thead><tr><th>Status</th><th class="r">${MON[+curRow.month.slice(5) - 1]}</th><th class="r">vs prev.</th></tr></thead><tbody>${DS.CATS.map(c => `<tr><td><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${DASH_COL[c]};margin-right:6px"></i>${c}</td><td class="r num">${curRow.counts[c]}</td><td class="r">${delta ? dashDelta(delta[c]) : '<span class="faint">—</span>'}</td></tr>`).join('')}</tbody></table></div></div>
      <p class="note" style="margin:8px 0 0">Earlier months come from the weekly reports filed then (the last one up to month end); the current month is live. History builds up as weekly reports are saved.</p>` : '<p class="muted" style="margin:0">No projects match the filters.</p>'}</div>
    <div class="card" data-dc="rag"><h3>Projects by RAG status, by week <span class="sub">DAS003 · vs the last reporting date</span></h3>
      ${nowR ? `<div class="row" style="gap:18px;flex-wrap:wrap;margin-bottom:8px">${['R', 'A', 'G'].map(k => `<span><span class="dot ${k}"></span> <b>${nowR[k]}</b> ${names[k]} ${prevR ? dashDelta(nowR[k] - prevR[k]) : ''}${prevR ? `<span class="faint" style="font-size:12px"> (${prevR[k]} on ${fds(prevR.week)})</span>` : ''}</span>`).join('')}</div>
      ${dashStack(rt.map(r => ({ label: fds(r.week), v: r })), ['R', 'A', 'G'], 'Projects by RAG per week', { names })}${dashLegend(['R', 'A', 'G'], names)}` : '<p class="muted" style="margin:0">No data yet.</p>'}
      <p class="note" style="margin:8px 0 0">A week counts a project if a weekly report was saved for it; the current week uses live status.</p></div>
    <div class="grid g2">
    <div class="card" data-dc="milestones"><h3>Milestone forecast by quarter <span class="sub">DAS004</span></h3>
      ${mf.length ? `${dashStack(mf.map(r => ({ label: r.q.replace('-', ' '), v: r })), ['onTime', 'atRisk', 'delayed'], 'Committed milestones per quarter', { names })}${dashLegend(['onTime', 'atRisk', 'delayed'], names)}
      ${mf.some(r => r.delayed) ? `<div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>Delayed milestone</th><th>Committed</th><th>Realistic forecast</th></tr></thead><tbody>${ms.filter(m => mf.some(r => r.delayedItems.some(d => d.name === m.name && d.base === m.base))).map(m => { const d = mf.flatMap(r => r.delayedItems).find(x => x.name === m.name && x.base === m.base); return `<tr><td>${esc(m.name)} <span class="mono faint">${esc(m.proj)}</span></td><td class="num">${fd(m.base)}</td><td class="num"><b>${fd(d.fore)}</b></td></tr>`; }).join('')}</tbody></table></div>` : ''}` : '<p class="muted" style="margin:0">No milestones in view.</p>'}
      <p class="note" style="margin:8px 0 0">By committed (baseline) date. On time: forecast on or before it. At risk: up to 7 days late. Delayed: more than 7 days late, or past due and not achieved.</p></div>
    <div class="card" data-dc="releases"><h3>MVPs and releases by quarter <span class="sub">DAS008</span></h3>
      ${rf.length ? `${dashStack(rf.map(r => ({ label: r.q.replace('-', ' '), v: r })), ['onTime', 'atRisk', 'delayed'], 'Releases per quarter by on-time status', { names })}${dashLegend(['onTime', 'atRisk', 'delayed'], names)}
      <div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>Quarter</th><th class="r">Planned</th><th class="r">Implemented</th><th class="r">At risk or delayed</th></tr></thead><tbody>${rf.map(r => `<tr><td>${r.q.replace('-', ' ')}</td><td class="r num">${r.planned}</td><td class="r num">${r.implemented}</td><td class="r num">${r.atRiskOrDelayed}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="margin:0">No MVPs or releases yet. A project manager adds them in the project\'s Binder tab.</p>'}</div></div>` };
}
function dashRefresh() {
  if (ui.view !== 'dash' || !window.__ITPH_REFRESH) return;
  window.__ITPH_REFRESH().then(ok => { if (ok && ui.view === 'dash') { render(); } }).catch(e => console.warn('[itph] refresh', e));
}
if (!window.__dashTimer) window.__dashTimer = setInterval(dashRefresh, 60000);
function bpiReleasesCard(p, ed) {
  const rs = p.releases || [];
  return `<div class="card"><h3>MVPs and releases <span class="sub">DAS008</span></h3>
    <div class="tbl-wrap"><table><thead><tr><th>Release</th><th>Type</th><th>Planned</th><th>Forecast</th><th>Implemented</th><th></th></tr></thead><tbody>
    ${rs.map(r => `<tr><td>${esc(r.name)}</td><td>${r.mvp ? 'MVP' : 'Release'}</td><td class="num">${fd(r.planned)}</td>
      <td>${ed ? `<input type="date" class="inp" style="height:28px" data-c="relf" data-id="${r.id}" data-k="forecast" value="${r.forecast || ''}">` : fd(r.forecast)}</td>
      <td>${ed ? `<input type="date" class="inp" style="height:28px" data-c="relf" data-id="${r.id}" data-k="implemented" value="${r.implemented || ''}">` : fd(r.implemented)}</td>
      <td>${ed ? `<button class="btn sm danger" data-a="reldel" data-id="${r.id}">${ui.confirm === 'rel' + r.id ? 'Confirm' : 'Remove'}</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">None yet.</td></tr>'}</tbody></table></div>
    ${ed ? `<form class="inline" data-form="rel" style="margin-top:12px"><label class="field" style="grid-column:span 2">Name<input name="name" required></label><label class="field">Type<select name="mvp"><option value="">Release</option><option value="1">MVP</option></select></label>
      <label class="field">Planned date<input type="date" name="planned" required></label><label class="field">Forecast date<input type="date" name="forecast"></label><button class="btn pri">Add</button></form>` : ''}</div>`;
}
