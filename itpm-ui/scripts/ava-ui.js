/* AVA: public Kissflow Custom Agent integration and grounded project reviews. */
function avaFingerprint(p) { return JSON.stringify([p.activities, p.issues, p.risks, p.fin, (p.psrs || []).map(r => [r.id, r.period, r.status, r.narrative])]); }
function avaScopeStamp() { return JSON.stringify([ui.me, role(), curTier(), myProjects().map(p => p.id).sort()]); }
function avaReview(p) {
  return window.__ITPH_AVA_RULES.reviewProject(p, { today: TODAY, health: health(p), validUserIds: S.users.filter(u => u.status === 'Active').map(u => u.id) });
}
function avaProject(q) {
  const code = String(q).match(/\b[A-Z][A-Z0-9]*-\d{3,4}(?:-\d{2,})?\b/i)?.[0];
  const ps = myProjects();
  if (code) return ps.find(p => p.code.toLowerCase() === code.toLowerCase()) || null;
  const named = ps.find(p => String(q).toLowerCase().includes(p.name.toLowerCase()));
  if (named) return named;
  const current = contextProject();
  return ps.find(p => p.id === current?.id) || null;
}
function avaSourceCard(r, limit = 8) {
  const p = myProjects().find(p => p.id === r.projectId); if (!p) return '';
  return `<div class="t-card ins ava-review"><div class="t-ct">Project review · ${esc(r.asOf)}</div><b>${esc(r.projectCode)} · ${esc(r.projectName)}</b>
    <div class="t-note">${r.findings.length} follow-up checks · ${r.unverifiedUpdates} open activities without a verifiable update date</div>
    ${r.findings.slice(0, limit).map(f => `<div class="ava-finding"><div><span class="pill ${f.severity === 'critical' ? 'R' : 'A'}">${f.severity === 'critical' ? 'Overdue' : 'Review'}</span> <b>${esc(f.label)}</b></div><p>${esc(f.reason)}</p><p class="muted">${esc(f.action)}</p><button class="btn sm ghost" data-ava-source data-p="${esc(p.id)}" data-tab="${esc(f.tab)}">Open ${esc(f.tab)} →</button></div>`).join('')}
    ${r.findings.length > limit ? `<p class="t-note">${r.findings.length - limit} more checks. Review the linked project registers.</p>` : ''}
    ${!r.findings.length ? '<p>No gaps were found by these checks. Confirm data freshness with the team before reporting.</p>' : ''}</div>`;
}
function avaReadinessAllowed(p, r) {
  if (!p || !canEdit(p) || curTier() !== 'advanced' || !myProjects().some(x => x.id === p.id)) return false;
  const cp = curPeriod();
  const report = r || p.psrs.find(x => x.period.y === cp.y && x.period.m === cp.m);
  return !report || (report.period.y === cp.y && report.period.m === cp.m && ['Draft', 'Returned'].includes(report.status));
}
function avaReadinessFresh(p, state) {
  const cp = curPeriod();
  return !!state && state.projectId === p.id && state.fingerprint === avaFingerprint(p) && state.scope === avaScopeStamp() && state.period.y === cp.y && state.period.m === cp.m && state.today === TODAY;
}
function avaReadinessCard(p, r) {
  if (!avaReadinessAllowed(p, r)) return '';
  const state = T.psrReadiness;
  const fresh = avaReadinessFresh(p, state);
  const bot = fresh ? state.bot : null;
  const completed = bot && !bot.thinking && !bot.failed;
  const evidence = bot ? avaReview(p) : null;
  const configured = !!window.__ITPH_AGENTS?.ari?.getId();
  return `<section class="card ava-readiness" data-ava-readiness-slot data-p="${esc(p.id)}" data-report="${esc(r?.id || '')}" aria-label="Ari reporting readiness">
    <div class="row" style="justify-content:space-between"><h3 class="agent-heading">${agentAvatar('ari')}Ari · Reporting readiness</h3><span class="tag">${configured ? 'AI review' : 'Built-in checks'}</span></div>
    <p class="muted">Review missing updates, overdue work, open issues and mitigation gaps before drafting. The PM decides what to resolve and when to submit.</p>
    <div class="row"><button type="button" class="btn ai" data-ava-readiness data-p="${esc(p.id)}" data-report="${esc(r?.id || '')}" ${T.busy || T.unknownOutcome ? 'disabled' : ''}>${agentAvatar('ari')}${bot?.thinking ? 'Reviewing…' : completed ? 'Review again with Ari' : 'Review with Ari'}</button>
    ${completed && actionsAllowed() ? `<button class="btn ai" data-t="askctx" data-q="Draft the ${MONF[curPeriod().m - 1]} ${curPeriod().y} PSR narrative for ${esc(p.code)}">${aiAv('ava-button-avatar')}Draft with AVA</button>` : ''}</div>
    <p class="muted" role="status" aria-live="polite">${bot?.thinking ? 'Ari is reviewing this project. You can continue working.' : bot?.failed ? 'The review did not complete. See the details below.' : completed ? 'Review complete. Validate the findings before drafting.' : state?.projectId === p.id ? 'Project data, access or reporting period changed. Run a new review.' : 'Start a review to see findings here.'}</p>
    ${!configured ? '<p class="note">Ari is not connected. Ari will run built-in project checks; these are not an AI response.</p>' : ''}
    ${T.unknownOutcome ? '<p class="note">A previous request may still be running. Open AVA to check its execution before starting another request.</p>' : ''}
    ${bot ? `<div class="ava-readiness-answer">${bot.thinking ? '' : md(bot.text)}</div>${bot.note ? `<p class="note">${esc(bot.note)}</p>` : ''}${bot.executionId ? `<p class="note">Execution: ${esc(bot.executionId)}</p>` : ''}${bot.checkable ? `<button class="btn sm" data-ava-check="${T.msgs.indexOf(bot)}" ${T.busy ? 'disabled' : ''}>${agentAvatar('ari')}Check this execution</button>` : ''}${avaSourceCard(evidence, evidence.findings.length)}` : ''}
  </section>`;
}
function avaRefreshReadiness() {
  const slot = document.querySelector('[data-ava-readiness-slot]'); if (!slot) return;
  const p = myProjects().find(x => x.id === slot.dataset.p); if (!p) { slot.remove(); return; }
  const r = slot.dataset.report ? p.psrs.find(x => x.id === slot.dataset.report) : null;
  if (slot.dataset.report && !r) { slot.remove(); return; }
  slot.outerHTML = avaReadinessCard(p, r);
}
async function avaStartReadiness(projectId, reportId) {
  const p = myProjects().find(x => x.id === projectId);
  const r = reportId && p?.psrs.find(x => x.id === reportId);
  if ((reportId && !r) || !avaReadinessAllowed(p, r) || T.busy || T.unknownOutcome) return;
  await askTala(`Review project ${p.code} for reporting readiness: identify missing updates, overdue activities, unresolved issues and mitigation gaps. Explain the evidence and prioritize follow-up. Provide a review only; leave all records unchanged.`, { inline: true });
}
function avaContext(q, p) {
  const advanced = curTier() === 'advanced';
  const project = p ? (advanced ? { ...projDetail(p), review: avaReview(p) } : { code: p.code, name: p.name, activities: p.activities.map(a => ({ id: a.id, name: a.name, pct: a.pct, owner: uname(a.owner), forecast_finish: a.fFinish })) }) : null;
  return { today: TODAY, reporting_period: curPeriod(), mode: advanced ? 'advanced' : 'basic', role: ROLE_LABEL[role()], screen: crumbText(), project,
    portfolio: !p ? myProjects().map(x => advanced ? { ...projSummary(x), review: avaReview(x) } : { code: x.code, name: x.name, pm: uname(x.pm) }) : undefined,
    may_propose_psr: !!(advanced && p && canEdit(p) && actionsAllowed() && /draft|narrative|prepare.*(?:psr|report)/i.test(q)),
    conversation: T.turns.filter(x => x.scope === avaScopeStamp()).slice(-6).map(x => ({ role: x.role, content: String(x.content).slice(0, 3000) })) };
}
function avaDraftPeriodMatches(q) {
  const cp = curPeriod();
  const months = MONF.map((name, i) => ({ name: name.toLowerCase(), month: i + 1 }));
  const words = String(q).toLowerCase().match(/[a-z]+/g) || [];
  const mentioned = months.find(x => words.includes(x.name) || words.includes(x.name.slice(0, 3)));
  const year = String(q).match(/\b(20\d{2})\b/)?.[1];
  return (!mentioned || mentioned.month === cp.m) && (!year || +year === cp.y);
}
function avaProposePSR(p, item, fingerprint) {
  if (!p || !canEdit(p) || !actionsAllowed() || curTier() !== 'advanced') return false;
  if (!myProjects().some(x => x.id === p.id) || avaFingerprint(p) !== fingerprint) return false;
  const period = curPeriod();
  const existing = p.psrs.find(r => r.period.y === period.y && r.period.m === period.m);
  if (existing && !['Draft', 'Returned'].includes(existing.status)) return false;
  if (![item.accomplishments, item.next_period, item.issues].every(x => typeof x === 'string' && x.trim())) return false;
  const x = makeProposal({ type: 'psr_narrative', project_code: p.code, accomplishments: item.accomplishments, next_period: item.next_period, issues: item.issues });
  x.avaFingerprint = fingerprint; x.period = { ...period };
  return true;
}
function avaBuiltIn(q, bot, p) {
  bot.basic = true;
  bot.note = 'Built-in project checks, not an AI response. Connect the published AVA agent in Configuration for AI analysis.';
  if (curTier() === 'basic') return basicTierAnswer(q, bot);
  if (/\bhow (do|can|to)\b|\bwhere\b/i.test(q)) return basicTierAnswer(q, bot);
  if (!p) {
    if (/\b[A-Z][A-Z0-9]*-\d{3,4}(?:-\d{2,})?\b/i.test(q)) return 'That project is not available in your current access.';
    const rows = myProjects().map(x => ({ p: x, r: avaReview(x) })).sort((a, b) => b.r.findings.filter(f => f.severity === 'critical').length - a.r.findings.filter(f => f.severity === 'critical').length);
    return rows.length ? '**Portfolio briefing**\n' + rows.map(({ p, r }) => `- **${p.code} ${p.name}**: ${r.health ? RAGL[r.health] : 'schedule unavailable'}; ${r.findings.length} follow-up checks. ${r.reasons.join('; ')}`).join('\n') : 'No projects are available in your current access.';
  }
  const r = avaReview(p); bot.review = r;
  if (/draft|narrative|prepare.*(?:psr|report)/i.test(q)) {
    const d = window.__ITPH_AVA_RULES.draftNarrative(p, { today: TODAY, period: curPeriod(), health: health(p) });
    const offered = avaProposePSR(p, { accomplishments: d.acc, next_period: d.next, issues: d.issues }, avaFingerprint(p));
    return `**${p.code} · PSR draft**\n\n**Accomplishments:** ${d.acc}\n\n**Next period:** ${d.next}\n\n**Issues:** ${d.issues}\n\n${offered ? 'Review the proposal and click Apply to fill the draft PSR.' : 'This is a preview. Applying requires project-manager access, enabled suggestions, and a Draft or Returned PSR.'}`;
  }
  return `**${p.name}** · ${r.health ? RAGL[r.health] : 'Schedule unavailable'}\n${r.reasons.map(x => '- ' + x).join('\n')}\n\n${r.findings.length ? `**Next actions:**\n${r.findings.slice(0, 4).map(f => `- ${f.label}: ${f.action}`).join('\n')}` : 'No gaps found by the available checks.'}\n\n${r.unverifiedUpdates ? `${r.unverifiedUpdates} open activities have no verifiable update date. Confirm their progress with the team.` : 'Review the source records below before reporting.'}`;
}
async function askTala(q, { inline = false } = {}) {
  q = String(q || '').trim(); if (!q || T.busy) return;
  if (T.unknownOutcome) { toast('The last request may still be running. AVA will not submit it again. Check the run in Kissflow before starting a new conversation.'); return; }
  const agent = inline ? 'ari' : 'ava';
  T.open = !inline;
  const p = avaProject(q), actor = ui.me, tier = curTier();
  const fingerprint = p ? avaFingerprint(p) : null;
  const bot = { agent, role: 'bot', text: '', thinking: true, tier, avaProjectId: p?.id, avaFingerprint: fingerprint, avaPeriod: { ...curPeriod() }, avaScope: avaScopeStamp(), avaCanDraft: /draft|narrative|prepare.*(?:psr|report)/i.test(q) };
  if (inline) { bot.avaCanDraft = false; T.psrReadiness = { projectId: p.id, fingerprint, scope: avaScopeStamp(), period: { ...curPeriod() }, today: TODAY, bot }; }
  const ctl = new AbortController(); T.ctl = ctl; T.busy = true;
  addMsg({ role: 'user', text: q }); T.msgs.push(bot); renderTala(); avaRefreshReadiness();
  const active = () => T.ctl === ctl && ui.me === actor;
  try {
    if (bot.avaCanDraft && !avaDraftPeriodMatches(q)) throw new Error('AVA currently drafts only the current reporting period. Open the current month’s PSR and ask again.');
    const api = window.__ITPH_AGENTS?.[agent] || (agent === 'ava' ? window.__ITPH_AVA : null);
    bot.agentId = api?.getId() || '';
    if (!api?.getId()) { bot.text = avaBuiltIn(q, bot, p); if (agent === 'ari') bot.note = 'Built-in readiness checks, not an AI response. Connect Ari in Configuration for AI analysis.'; }
    else {
      if (/\b[A-Z][A-Z0-9]*-\d{3,4}(?:-\d{2,})?\b/i.test(q) && !p) throw new Error('That project is not available in your current access.');
      const context = JSON.stringify({ ...avaContext(q, p), agent, may_propose_psr: bot.avaCanDraft && agent === 'ava', ...(agent === 'ari' ? { conversation: [] } : {}) });
      if (context.length > 100000) throw new Error('There is too much project data for one request. Select a single project and ask again.');
      const result = await api.run({ request: q, context }, { signal: ctl.signal, onAccepted: id => { if (active()) { bot.executionId = id; renderTala(); } } });
      if (!active()) return;
      avaUseResult(bot, result);
      T.mode = 'kissflow';
    }
    if (active()) T.turns.push({ role: 'user', content: q, scope: bot.avaScope }, { role: 'assistant', content: bot.text, scope: bot.avaScope });
  } catch (e) {
    if (!active()) return;
    bot.failed = true;
    bot.text = e.message || e.error || 'AVA could not complete this request.';
    if (e.executionId) bot.executionId = e.executionId;
    bot.checkable = !!bot.executionId && !['AVA_INVALID_OUTPUT'].includes(e.code);
    if (e.code === 'AGENT_EXECUTE_OUTCOME_UNKNOWN') { T.unknownOutcome = true; bot.note = 'Kissflow may have started the request. It has not been retried. Check the run in Kissflow before starting another conversation.'; }
    else if (bot.checkable) bot.note = 'The run may still finish in Kissflow. Check this execution instead of submitting again.';
    T.mode = 'basic';
  } finally {
    if (active()) { bot.thinking = false; T.busy = false; T.ctl = null; renderTala(); avaRefreshReadiness(); }
  }
}
function avaUseResult(bot, result) {
  if (bot.avaScope !== avaScopeStamp()) throw new Error('Your project access or AVA mode changed. Ask AVA again with your current access.');
  const item = result.items[0]; bot.failed = false; bot.text = item.answer; bot.executionId = result.executionId; bot.checkable = false; bot.basic = false;
  const p = myProjects().find(x => x.id === bot.avaProjectId);
  if (p && curTier() === 'advanced') bot.review = avaReview(p);
  if (item.propose_psr === true && bot.avaCanDraft && bot.tier === 'advanced') {
    const cp = curPeriod();
    const offered = cp.y === bot.avaPeriod.y && cp.m === bot.avaPeriod.m && avaProposePSR(p, item, bot.avaFingerprint);
    bot.note = offered ? 'PSR draft prepared below. Review it and click Apply; nothing has been submitted.' : 'A PSR proposal could not be prepared. The project data, reporting period, permissions or report status may have changed. Review again.';
  }
}
async function avaCheckRun(bot) {
  if (!bot?.executionId || T.busy) return;
  const actor = ui.me; T.busy = true; renderTala();
  try {
    const api = window.__ITPH_AGENTS?.[bot.agent || 'ava'] || window.__ITPH_AVA;
    if (!api || (bot.agentId && api.getId() !== bot.agentId)) throw new Error('Agent connection changed. This execution belongs to the previous connection.');
    const execution = await api.read(bot.executionId);
    if (ui.me !== actor || !T.msgs.includes(bot)) return;
    const result = window.__ITPH_AVA_RULES.executionResult(execution);
    if (result) { bot.note = ''; avaUseResult(bot, result); }
    else bot.note = `Kissflow execution status: ${execution.Status || 'In progress'}. Check again later.`;
  } catch (e) { if (ui.me === actor && T.msgs.includes(bot)) bot.note = e.message || e.error || 'Could not read this execution.'; }
  finally { if (ui.me === actor) { T.busy = false; renderTala(); avaRefreshReadiness(); } }
}
function avaConnectionCard() {
  return `<div class="card"><h3>Project agents</h3><p class="muted">Connect each assistant to its published agent. These settings apply to this browser; shared deployment can configure the same connections for everyone.</p>
    <div class="agent-connections">${[['ari', 'Ari', 'Reporting readiness'], ['ava', 'AVA', 'PSR narrative drafting'], ['theo', 'Theo', 'Approval evidence briefing']].map(([key, name, purpose]) => `<form data-ava-connect data-agent="${key}" class="card"><h4 class="agent-heading">${agentAvatar(key)}${name} · ${purpose}</h4><label class="field">Published Agent ID<input name="agentId" aria-label="${name} published Agent ID" placeholder="Ag…" value="${esc((window.__ITPH_AGENTS?.[key] || (key === 'ava' ? window.__ITPH_AVA : null))?.getId() || '')}" required pattern="Ag[A-Za-z0-9_]+"></label><button class="btn pri">${agentAvatar(key)}Save and check ${name}</button><p class="muted" role="status"></p></form>`).join('')}</div></div>`;
}
function suggestions() {
  const p = contextProject();
  if (curTier() === 'basic') return ['How do I update my progress?', 'How do I submit a PSR?', 'What is assigned to me?', 'Open the schedule'];
  const out = p ? ['Review this project before status reporting', 'Find missing updates in this project'] : ['Brief me on portfolio health', 'Which projects need attention?'];
  if (p && canEdit(p)) out.push('Draft this month’s PSR narrative');
  out.push('What should I address first?');
  return out;
}
async function initTala() {
  T.tier = advAllowed() ? 'advanced' : 'basic';
  try { const tier = localStorage.getItem(PREF + '-leaf-tier'); if (tier) T.tier = tier; } catch (e) {}
  T.mode = 'basic'; T.sample = null;
  if (window.__ITPH_AVA?.getId()) {
    T.mode = 'checking'; renderTala();
    try { await window.__ITPH_AVA.connect(); T.mode = 'kissflow'; }
    catch (e) { T.mode = 'basic'; T.connectionError = e.message; }
  }
  renderTala();
}
document.addEventListener('click', e => {
  const readiness = e.target.closest('[data-ava-readiness]');
  if (readiness) { e.preventDefault(); e.stopPropagation(); avaStartReadiness(readiness.dataset.p, readiness.dataset.report); return; }
  const src = e.target.closest('[data-ava-source]');
  if (src) { const p = myProjects().find(p => p.id === src.dataset.p); if (p) { T.open = false; leafNavigate({ view: 'projects', tab: src.dataset.tab }, p.code); renderTala(); } return; }
  const check = e.target.closest('[data-ava-check]'); if (check) avaCheckRun(T.msgs[+check.dataset.avaCheck]);
}, true);
document.addEventListener('submit', async e => {
  if (!e.target.matches('[data-ava-connect]')) return;
  e.preventDefault(); e.stopPropagation(); if (role() !== 'APPADMIN' || T.busy || T.theo?.pending) return;
  const form = e.target, status = form.querySelector('[role="status"]');
  const agent = form.dataset.agent || 'ava';
  const api = window.__ITPH_AGENTS?.[agent] || (agent === 'ava' ? window.__ITPH_AVA : null);
  if (!api) { status.textContent = 'Open this app inside Kissflow to configure agents.'; return; }
  const id = String(new FormData(form).get('agentId') || '').trim();
  if (!/^Ag[A-Za-z0-9_]+$/.test(id)) { status.textContent = 'Enter the published Kissflow Agent ID.'; return; }
  status.textContent = 'Checking published agent…';
  try { await api.configure(id); T.psrReadiness = null; T.theo = null; status.textContent = `${agent.toUpperCase()} is connected to the published Kissflow agent.`; if (agent === 'ava') { T.mode = 'kissflow'; T.connectionError = ''; } }
  catch (e) { status.textContent = e.message || 'Could not connect to AVA.'; T.mode = 'basic'; T.connectionError = status.textContent; }
  renderTala();
}, true);
