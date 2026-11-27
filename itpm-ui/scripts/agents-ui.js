/* Agent identity and read-only approval assistance. */
function agentAvatar(name, cls = 'ava-button-avatar') {
  if (name !== 'ari' && name !== 'theo') return aiAv(cls);
  const file = name === 'ari' ? 'ari-robots.png' : 'theo-robots.png';
  return `<span class="${esc(cls)} agent-avatar agent-${name}" role="img" aria-label="${name === 'ari' ? 'Ari' : 'Theo'} robot"><img src="./${file}" alt="" aria-hidden="true"></span>`;
}
function theoActor() {
  return { userId: ui.me, role: role(), advanced: curTier() === 'advanced' };
}
function theoAllowed(p, r) {
  return !!(myProjects().some(x => x.id === p?.id) && window.__ITPH_AGENT_RULES?.canBriefApproval(p, r, theoActor()));
}
function theoStamp(p, r) {
  return JSON.stringify([avaScopeStamp(), avaFingerprint(p), r, p.dh, p.ps, p.psRequired, TODAY, window.__ITPH_AGENTS?.theo?.getId()]);
}
function theoFresh(p, r) {
  const state = T.theo;
  return !!(state && theoAllowed(p, r) && state.projectId === p.id && state.reportId === r.id && state.stamp === theoStamp(p, r));
}
function theoCard(p, r) {
  if (!theoAllowed(p, r)) return '';
  const state = theoFresh(p, r) ? T.theo : null;
  const connected = !!window.__ITPH_AGENTS?.theo?.getId();
  return `<section class="card ava-readiness" data-theo-slot data-p="${esc(p.id)}" data-report="${esc(r.id)}" aria-label="Theo approval briefing">
    <div class="row" style="justify-content:space-between"><h3 class="agent-heading">${agentAvatar('theo')}Theo · Approval briefing</h3><span class="tag">${connected ? 'AI briefing' : 'Built-in briefing'}</span></div>
    <p class="muted">Review saved report evidence, return comments and Sponsor routing. Current project checks are shown separately. You decide Approve or Return to PM.</p>
    <div class="row"><button class="btn ai" data-theo-start data-p="${esc(p.id)}" data-report="${esc(r.id)}" ${T.busy || T.unknownOutcome || T.theo?.pending ? 'disabled' : ''}>${agentAvatar('theo')}${state?.thinking ? 'Preparing brief…' : state?.text ? 'Brief again with Theo' : 'Brief with Theo'}</button>
    ${state?.pending && state.executionId ? `<button class="btn sm" data-theo-check ${T.busy ? 'disabled' : ''}>${agentAvatar('theo')}Check this execution</button>` : ''}
    ${state?.thinking ? '<button class="btn sm" data-t="stop">Stop waiting</button>' : ''}</div>
    ${!connected ? '<p class="note">Theo is not connected. This is a built-in evidence briefing, not an AI response.</p>' : ''}
    ${T.unknownOutcome ? '<p class="note">A request may still be running. Check its status in Kissflow before starting another conversation.</p>' : ''}
    ${T.theo && !state ? '<p class="note">Report evidence or access changed. Run a fresh briefing.</p>' : ''}
    ${state ? `<div class="ava-readiness-answer" role="status">${state.builtIn ? `<p style="white-space:pre-wrap">${esc(state.text || '')}</p>` : md(state.text || '')}</div>${state.note ? `<p class="note">${esc(state.note)}</p>` : ''}${state.executionId ? `<p class="note">Execution: ${esc(state.executionId)}</p>` : ''}
    ${!state.thinking && state.current ? '<h4>Current project checks · separate from saved PSR</h4>' + avaSourceCard(state.current, state.current.findings.length) : ''}` : ''}
  </section>`;
}
function theoRefresh() {
  const slot = document.querySelector('[data-theo-slot]'); if (!slot) return;
  const p = myProjects().find(x => x.id === slot.dataset.p);
  const r = p?.psrs.find(x => x.id === slot.dataset.report);
  slot.outerHTML = p && r ? theoCard(p, r) : '';
}
async function theoStart(projectId, reportId) {
  const p = myProjects().find(x => x.id === projectId), r = p?.psrs.find(x => x.id === reportId);
  if (!theoAllowed(p, r) || T.busy || T.unknownOutcome || T.theo?.pending) return;
  const api = window.__ITPH_AGENTS?.theo;
  const ctl = new AbortController(); const actor = ui.me;
  const state = { projectId, reportId, stamp: theoStamp(p, r), thinking: true, current: avaReview(p), text: '' };
  T.theo = state; T.busy = true; T.ctl = ctl;
  const active = () => T.theo === state && ui.me === actor && theoAllowed(p, r) && state.stamp === theoStamp(p, r);
  theoRefresh();
  try {
    const context = window.__ITPH_AGENT_RULES.approvalContext(p, r, theoActor(), { today: TODAY, current: state.current });
    if (!api?.getId()) { state.builtIn = true; state.text = window.__ITPH_AGENT_RULES.approvalBrief(context); }
    else {
      const serialized = JSON.stringify(context);
      if (serialized.length > 100000) throw new Error('This report has too much evidence for one briefing. Review the report directly.');
      const result = await api.run({ request: 'Brief the assigned approver on this PSR using its saved snapshot, narrative, comments and routing. Separate current project findings. Do not draft, apply, submit or approve anything.', context: serialized }, { signal: ctl.signal, onAccepted: id => { state.executionId = id; state.pending = true; if (active()) theoRefresh(); } });
      if (active()) { state.text = result.items[0].answer; state.executionId = result.executionId; }
      state.pending = false;
    }
  } catch (e) {
    if (e.executionId) state.executionId = e.executionId;
    state.pending = !!state.executionId && !['AVA_INVALID_OUTPUT'].includes(e.code);
    if (active()) state.text = e.message || 'Theo could not complete this briefing.';
    if (e.code === 'AGENT_EXECUTE_OUTCOME_UNKNOWN' && T.theo === state) { T.unknownOutcome = true; state.note = 'The request may have started. It has not been retried.'; }
    else if (state.pending) state.note = 'Check this execution to read the same run without starting another.';
  } finally {
    state.thinking = false;
    if (!active()) { state.text = ''; state.current = null; }
    if (T.ctl === ctl) { T.busy = false; T.ctl = null; renderTala(); theoRefresh(); }
  }
}
async function theoCheck() {
  const state = T.theo;
  const p = myProjects().find(x => x.id === state?.projectId), r = p?.psrs.find(x => x.id === state?.reportId);
  if (!state?.executionId || T.busy || !theoFresh(p, r)) return;
  T.busy = true; theoRefresh();
  try {
    const execution = await window.__ITPH_AGENTS.theo.read(state.executionId);
    if (T.theo !== state || !theoFresh(p, r)) return;
    if (execution.Status === 'Failed') state.pending = false;
    const result = window.__ITPH_AVA_RULES.executionResult(execution);
    if (result) { state.text = result.items[0].answer; state.pending = false; state.note = ''; }
    else state.note = `Execution status: ${execution.Status || 'In progress'}. Check again later.`;
  } catch (e) { if (T.theo === state && theoFresh(p, r)) { state.note = e.message; if (e.code === 'AVA_INVALID_OUTPUT') state.pending = false; } }
  finally { T.busy = false; theoRefresh(); renderTala(); }
}
document.addEventListener('click', e => {
  const start = e.target.closest('[data-theo-start]');
  if (start) { e.preventDefault(); e.stopPropagation(); theoStart(start.dataset.p, start.dataset.report); return; }
  if (e.target.closest('[data-theo-check]')) { e.preventDefault(); e.stopPropagation(); theoCheck(); }
}, true);
