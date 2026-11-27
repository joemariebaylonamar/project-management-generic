/* ---------------- view: user manual ----------------
   Injected into the prototype by scripts/make-index.mjs (not part of the approved prototype file).
   Sections are the manual's own chapters plus the prototype's built-in HELP topics (the same ones
   Ava answers from), grouped by area and filtered to the current role unless "All roles" is on. */
const MAN_IC = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H16v12H5.5A1.5 1.5 0 0 0 4 16.5z"/><path d="M4 16.5A1.5 1.5 0 0 0 5.5 18H16v-3M7.5 6.5h5M7.5 9h4"/></svg>';
const MAN_GROUP = { theme: 'Getting started', progress: 'Schedule', assign: 'Schedule', gantt: 'Schedule', addact: 'Schedule', baseline: 'Schedule', issue: 'Issues and risks', risk: 'Issues and risks',
  finance: 'Financials', psr: 'Status reports', approve: 'Status reports', ppsr: 'Monitoring and collaboration', chat: 'Monitoring and collaboration', scurve: 'Monitoring and collaboration',
  holiday: 'Administration', threshold: 'Administration' };
const MAN_ORDER = ['Getting started', 'Projects', 'Schedule', 'Issues and risks', 'Financials', 'Status reports', 'Monitoring and collaboration', 'Administration', 'Help'];
const MAN_ROLES = [
  ['PM', 'Creates projects and owns them: schedule, issues, risks, financials. Generates and submits the monthly status report (PSR).', 'Projects you manage'],
  ['TEAM', 'Updates the activities, issues and action items assigned to them from My tasks.', 'Projects where you own an activity, issue or action item'],
  ['DH', 'Reviews and approves or returns PSRs for their projects. Read-only on project data.', 'Projects where you are the named Department Head'],
  ['PS', 'Approves PSRs that need sponsor approval. Read-only on project data.', 'Projects where you are the named Project Sponsor'],
  ['PSC', 'Monitors the whole portfolio and generates the portfolio report (PPSR).', 'All projects'],
  ['APPADMIN', 'Maintains the holiday calendar and alert thresholds.', 'Configuration'],
];
function manSections() {
  const c = S.config;
  const own = [
    { id: 'start', group: 'Getting started', title: 'Welcome to the Project Hub', body: () => `
      <p>The ITPMD Project Hub is where IT projects are planned, tracked and reported. Everything you enter here is saved to Kissflow automatically: a green <b>Saved to Kissflow</b> message confirms it, a red message means the change was not saved and shows why.</p>
      <div class="card" style="margin-top:14px"><h3>Find your way around</h3><dl class="kv">
        <dt>Portfolio</dt><dd>Health of every project you can see, and the portfolio report (PPSR).</dd>
        <dt>Projects</dt><dd>Your projects, with tabs for overview, schedule, issues, risks, financials, S-curve, status reports, discussion and history.</dd>
        <dt>Approvals</dt><dd>Status reports waiting for your decision (Department Head and Project Sponsor).</dd>
        <dt>My tasks</dt><dd>Activities and action items assigned to you.</dd>
        <dt>Discussions</dt><dd>Project conversations with @mentions.</dd>
        <dt>Ask Ava</dt><dd>The assistant at the bottom right. Ask it how to do something, or ask about a project.</dd>
      </dl></div>
      <div class="card" style="margin-top:14px"><h3>If you hold more than one role</h3><p>Click your name at the top right and pick the role to work in, for example switch from Project Manager to Department Head to approve reports. The menu on the left changes with the role.</p></div>` },
    { id: 'roles', group: 'Getting started', title: 'Roles and what you can see', body: () => `
      <p>Access follows the rule "deny all unless allowed": you only see the projects your role connects you to.</p>
      <div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>Role</th><th>What they do</th><th>Projects they see</th></tr></thead><tbody>
      ${MAN_ROLES.map(([r, d, s]) => `<tr><td><b>${esc(ROLE_LABEL[r] || r)}</b>${r === role() ? ' <span class="tag">You</span>' : ''}</td><td>${esc(d)}</td><td>${esc(s)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="note" style="margin-top:12px">Roles are given by the Hub Administrator in Kissflow. If a menu or project you expect is missing, ask them to check your role.</p>` },
    { id: 'newproj', group: 'Projects', title: 'Create a project', roles: ['PM'], go: { view: 'projects' }, body: () => `
      <ol class="man-steps">
        <li>Open <b>Projects</b> and click <b>+ New project</b> at the top of the list.</li>
        <li>Enter the project name, business unit, portfolio and status (new projects usually start as <b>Planning</b>).</li>
        <li>Pick the <b>Department Head</b> (required) and the <b>Project Sponsor</b> (optional). Only people who hold those roles are listed.</li>
        <li>Choose when the Sponsor must approve status reports: <b>Only when overall health is Red</b>, or <b>Always</b>.</li>
        <li>Enter the start date, approved budget and contingency fund, and the vendor and contract total if known.</li>
        <li>Click <b>Create project</b>. You become its Project Manager. When Kissflow has saved it, the Project Code (for example ITP - 0007) replaces "Saving…".</li>
      </ol>
      <p class="note">A project is saved straight away. There is no approval step for creating a project. Next, build the schedule (Schedule tab) and set the baseline.</p>` },
    { id: 'psrflow', group: 'Status reports', title: 'How status report approval works', body: () => `
      <div class="steps" style="margin:6px 0 14px"><span>Draft (PM)</span><span>Department Head review</span><span>Sponsor approval (when required)</span><span>Approved</span></div>
      <ol class="man-steps">
        <li><b>Draft.</b> The Project Manager generates the PSR for the month. Schedule, issues, risks and financials are filled in automatically. Only the PM sees a draft; nobody is asked to approve it yet.</li>
        <li><b>Submit.</b> The PM writes the narrative (accomplishments, next steps, issues) and clicks <b>Submit to DH</b>. The report is due on working day 5 of the following month.</li>
        <li><b>Department Head review.</b> The report appears under the DH's <b>Approvals</b>. <b>Approve</b> moves it on; <b>Return to PM</b> needs a comment and sends it back to Draft.</li>
        <li><b>Sponsor approval.</b> Needed when the project is set to always need sponsor approval, or when the report's overall health is Red. Same choices: approve or return with a comment.</li>
        <li><b>Approved.</b> The report is locked as a snapshot and feeds the project's history and the portfolio report.</li>
      </ol>
      <div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>Status</th><th>Meaning</th><th>Who acts next</th></tr></thead><tbody>
        <tr><td>${statusPill('Draft')}</td><td>Being written</td><td>Project Manager</td></tr>
        <tr><td>${statusPill('Submitted')}</td><td>Waiting for the Department Head</td><td>Department Head</td></tr>
        <tr><td>${statusPill('For PS Approval')}</td><td>DH approved, waiting for the Sponsor</td><td>Project Sponsor</td></tr>
        <tr><td>${statusPill('Returned')}</td><td>Sent back with a comment</td><td>Project Manager edits and resubmits</td></tr>
        <tr><td>${statusPill('Approved')}</td><td>Final and locked</td><td>No one</td></tr>
      </tbody></table></div>` },
    { id: 'health', group: 'Monitoring and collaboration', title: 'How project health (RAG) is worked out', body: () => `
      <p>Each project gets a Green, Amber or Red rating in four areas. The overall health is the worst of the four.</p>
      <div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>Area</th><th>Amber when</th><th>Red when</th></tr></thead><tbody>
        <tr><td><b>Schedule</b></td><td>Forecast finish ${c.schedAmber}+ working day(s) after the baseline</td><td>More than ${c.schedRed} working days late, or a milestone is past due and not achieved</td></tr>
        <tr><td><b>Cost</b></td><td>Forecast cost above ${c.costAmber}% of budget, or ${c.contAmber}%+ of contingency used</td><td>Forecast cost above ${c.costRed}% of budget, or contingency overspent</td></tr>
        <tr><td><b>Risk</b></td><td>An open High risk</td><td>An open Critical risk</td></tr>
        <tr><td><b>Issues</b></td><td>An open High-priority issue</td><td>An open Critical or escalated issue</td></tr>
      </tbody></table></div>
      <p class="note" style="margin-top:12px">These thresholds are set by the Hub Administrator under Configuration → Alert thresholds.</p>` },
    { id: 'trouble', group: 'Help', title: 'Troubleshooting', body: () => `
      <div class="card"><h3>A red "Couldn't save to Kissflow" message</h3><p>The change was not saved. Read the reason in the message, fix the entry, and try again. If it keeps happening, send the message text to the Hub Administrator.</p></div>
      <div class="card" style="margin-top:12px"><h3>I don't see a project or a menu</h3><p>You only see projects your role connects you to (see <b>Roles and what you can see</b>). If you hold several roles, switch role from your name at the top right.</p></div>
      <div class="card" style="margin-top:12px"><h3>A report isn't in my Approvals</h3><p>Reports appear only after the Project Manager submits them, and only for projects where you are the named Department Head or Sponsor.</p></div>
      <div class="card" style="margin-top:12px"><h3>The screen looks out of date after an update</h3><p>Close the tab and open the app again, or press <b>Cmd+Shift+R</b> (Mac) / <b>Ctrl+Shift+R</b> (Windows) to reload.</p></div>
      <div class="card" style="margin-top:12px"><h3>Reload live data</h3><p>Reload the page to get the latest data from Kissflow. It does not delete anything.</p></div>` },
  ];
  const helpTopics = HELP.filter(h => MAN_GROUP[h.id]).map(h => ({ id: 'h-' + h.id, group: MAN_GROUP[h.id], title: h.title, roles: h.roles, go: h.go,
    body: () => `<ol class="man-steps">${h.steps.map(s => `<li>${md(s).replace(/^<p>|<\/p>$/g, '')}</li>`).join('')}</ol>` }));
  return [...own, ...helpTopics];
}
function vManual() {
  const all = manSections();
  const mine = s => !s.roles || s.roles.includes(role());
  const shown = ui.manAll ? all : all.filter(mine);
  if (!ui.manSel) ui.manSel = 'start';
  const cur = all.find(s => s.id === ui.manSel);
  const list = `<div class="list-head"><h2>User manual</h2><span class="muted" style="font-size:12px">${ui.manAll ? 'All roles' : 'Topics for ' + esc(ROLE_LABEL[role()] || role())}</span>
      <button class="btn sm" style="align-self:flex-start;margin-top:6px" data-a="manall">${ui.manAll ? 'Show my role only' : 'Show all roles'}</button></div>
    <div class="list-items">${MAN_ORDER.map(g => { const items = shown.filter(s => s.group === g); return items.length ? `<div class="sect" style="padding:14px 6px 4px;font-size:11px;color:var(--faint);font-weight:600;letter-spacing:.06em;text-transform:uppercase">${esc(g)}</div>${items.map(s => `<button class="li ${ui.manSel === s.id ? 'on' : ''}" data-a="mansel" data-id="${s.id}"><div class="t"><span>${esc(s.title)}</span></div>${s.roles ? `<div class="s"><span>${s.roles.map(r => esc(ROLE_LABEL[r] || r)).join(' · ')}</span></div>` : ''}</button>`).join('')}` : ''; }).join('')}</div>`;
  if (!cur || ui.manSel === '__none') return { list, detail: '<div class="empty">Pick a topic from the list.</div>' };
  const forOthers = cur.roles && !cur.roles.includes(role());
  return { list, hasSel: true, detail: `<button class="btn sm back" data-a="manback">‹ Contents</button>
    <div class="head"><div><div class="kicker">User manual · ${esc(cur.group)}</div><h1>${esc(cur.title)}</h1>
      ${cur.roles ? `<div class="row" style="margin-top:6px;gap:6px">${cur.roles.map(r => `<span class="tag">${esc(ROLE_LABEL[r] || r)}</span>`).join('')}</div>` : ''}</div>
      ${cur.go && !forOthers ? '<div class="row"><button class="btn pri sm" data-a="mango">Take me there</button></div>' : ''}</div>
    ${forOthers ? `<p class="note" style="margin-bottom:12px">This is done by the ${cur.roles.map(r => esc(ROLE_LABEL[r] || r)).join(' or ')}. You can read it to know what to expect.</p>` : ''}
    <div class="man-body">${cur.body()}</div>` };
}
