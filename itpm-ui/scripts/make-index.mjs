// Generates index.html from the approved prototype, changing ONLY its data layer:
//   • load()/save() → the Kissflow bridge (src/bridge.js)
//   • TODAY → the real date (Asia/Manila)
//   • boot waits for live data
// Re-run after the prototype changes:  node scripts/make-index.mjs
import { readFileSync, writeFileSync } from "node:fs";
const SRC = new URL("../../ITPMD_Project_Hub_Prototype_BPI.html", import.meta.url);
let h = readFileSync(SRC, "utf8");
const must = (cond, what) => { if (!cond) throw new Error(`make-index: anchor not found — ${what}`); };

// BPI identity: tab title + favicon.
must(h.includes("<title>ITPMD Project Hub"), "title");
h = h.replace("</head>", '<link rel="icon" href="/bpi-logo.webp"></head>');

const scriptStart = "<script>\n(() => {";
must(h.includes(scriptStart), "prototype script start");
h = h.replace(scriptStart,
  `<script>window.__ITPH_READY = new Promise((r) => (window.__ITPH_RESOLVE = r));</script>\n<script type="module" src="/src/bridge.js"></script>\n` + scriptStart);

// nowStamp() stamps chat messages, audit and schedule history. The prototype joins the page-load TODAY with the
// browser's local hours — wrong after midnight on a page left open, and for a browser outside Manila time.
const nowRe = /const nowStamp = \(\) => \{[^\n]*\};/;
must(nowRe.test(h), "nowStamp");
h = h.replace(nowRe, "const nowStamp = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 19).replace('T', ' '); // live Asia/Manila clock");

must(/const TODAY = '\d{4}-\d{2}-\d{2}';/.test(h), "TODAY");
h = h.replace(/const TODAY = '\d{4}-\d{2}-\d{2}';/, "const TODAY = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); // live date (Asia/Manila)");

// Light or dark only (no "Match system"): first open is light; a picked theme is remembered in localStorage,
// and an old "system" choice falls back to light.
const themeDefault = "ui.theme = localStorage.getItem(PREF + '-theme') || 'system'; } catch (e) { ui.theme = 'system'; }";
must(h.includes(themeDefault), "theme default");
h = h.replace(themeDefault, "ui.theme = localStorage.getItem(PREF + '-theme') === 'dark' ? 'dark' : 'light'; } catch (e) { ui.theme = 'light'; }");
const themeSys = ", ['system', 'Match system', ic.monitor]]";
must(h.includes(themeSys), "theme system option");
h = h.replace(themeSys, "]");

const loadRe =/function load\(\) \{[\s\S]*?S = seed\(\); postSeed\(\);\n\}\nfunction save\(\) \{[^\n]*\}/;
must(loadRe.test(h), "load()/save()");
h = h.replace(loadRe, `function load() { S = window.__ITPH_STATE; HOL = new Set(S.holidays.map(h => h.date)); if (S.__ui) Object.assign(ui, S.__ui); }
function save() { try { window.__ITPH_SAVE && window.__ITPH_SAVE(S); } catch (e) { console.error(e); } }`);

const bootRe = /\nload\(\); (ui\.logo = [\s\S]*?S\.projects\.forEach\(schedule\);) render\(\); initTala\(\);/;
must(bootRe.test(h), "boot line");
// PSRs loaded from Kissflow have no snapshot (the prototype builds it at creation) — build it from the live figures.
const fillSnap = "window.__ITPH = { health, fin, render, makePSR }; S.projects.forEach(p => (p.psrs || []).forEach(r => { if (!r.snap) { try { r.snap = makePSR(p, r.period, true).snap; } catch (e) { console.error('psr snapshot', e); } } }));";
h = h.replace(bootRe, (_, mid) => `\nwindow.__ITPH_READY.then(() => { load(); ${mid} ${fillSnap} window.__ITPH_BASELINE && window.__ITPH_BASELINE(S); render(); initTala(); });`);

// "Reset sample data" rebuilds the prototype's sample projects — on live data that would push a second
// copy into Kissflow. Make it a plain refresh of the live data instead (label unchanged).
const resetRe = /reset: \(\) => \{ if \(ui\.confirm !== 'reset'\)[^\n]*\},/;
must(resetRe.test(h), "reset handler");
h = h.replace(resetRe, "reset: () => { toast('Reloading live data from Kissflow…'); setTimeout(() => location.reload(), 300); },");
h = h.replace("title=\"Restore the sample data\"", "title=\"Reload live data from Kissflow\"");


// ACCESS (BRD ITPH-00225 "deny all unless specifically allowed", §5.1 "own projects"):
//  • Department Head sees only projects where they are the named DH (the prototype showed all).
//  • The user switcher lists only the signed-in person's own role-users (never colleagues).
const dhRe = /\['DH', 'PSC', 'QA'\]\.includes\(r\)\) return S\.projects;/;
must(dhRe.test(h), "DH visibility rule");
h = h.replace(dhRe, "['PSC', 'QA'].includes(r)) return S.projects;\n  if (r === 'DH') return S.projects.filter(p => p.dh === ui.me);");
const swRe = /\$\{S\.users\.filter\(u => u\.status === 'Active'\)\.map\(u => `<option value="\$\{u\.id\}"/;
must(swRe.test(h), "user switcher");
h = h.replace(swRe, "${S.users.filter(u => u.status === 'Active' && (!S.__myUserIds || S.__myUserIds.includes(u.id))).map(u => `<option value=\"${u.id}\"");
// Every switcher entry is the signed-in person, so label it by role only ("Department Head", not "Joemarie — Department Head").
const swLabel = "esc(u.name) + ' — ' + ROLE_LABEL[u.role]}</option>`";
must(h.includes(swLabel), "user switcher label");
h = h.replace(swLabel, "(S.__myUserIds ? ROLE_LABEL[u.role] : esc(u.name) + ' — ' + ROLE_LABEL[u.role])}</option>`");

// NEW PROJECT (PM only — the only role with create on ITPMD Project). The prototype had no project
// intake; this adds a "+ New project" button to the Projects list and a form in the detail pane.
// The bridge writes the new project to Kissflow on the next save and reads back its Project_Code.
const listHead = "<div class=\"list-head\"><h2>Projects</h2>";
must(h.includes(listHead), "projects list head");
h = h.replace(listHead, "<div class=\"list-head\"><div class=\"row\" style=\"justify-content:space-between\"><h2>Projects</h2>${role() === 'PM' ? '<button class=\"btn sm pri\" data-a=\"newproj\">+ New project</button>' : ''}</div>");
const selReset = "if (ui.sel !== '__none' && !ps.find(p => p.id === ui.sel)) ui.sel = ps[0]?.id || null;";
must(h.includes(selReset), "projects selection reset");
h = h.replace(selReset, "if (ui.sel !== '__none' && ui.sel !== '__new' && !ps.find(p => p.id === ui.sel)) ui.sel = ps[0]?.id || null;");
const projDetail = "  const p = proj(ui.sel);\n  if (!p) return { list, detail: '<div class=\"empty\">Select a project from the list.</div>' };";
must(h.includes(projDetail), "projects detail");
h = h.replace(projDetail, "  if (ui.sel === '__new') return { list, hasSel: true, detail: role() === 'PM' ? newProjForm() : '<div class=\"empty\">Only a Project Manager can create projects.</div>' };\n" + projDetail);
const newProjForm = `
function newProjForm() {
  const O = window.__ITPH_OPTS || { bu: [], portfolio: [], status: ['Planning', 'Active'] };
  const ppl = r => S.users.filter(u => u.role === r && u.status === 'Active');
  const sel = (name, list, first) => \`<select name="\${name}" \${first ? '' : 'required'}>\${first ? \`<option value="">\${first}</option>\` : '<option value="" disabled selected>Choose…</option>'}\${list.map(x => typeof x === 'string' ? \`<option>\${esc(x)}</option>\` : \`<option value="\${x.id}">\${esc(x.name)}</option>\`).join('')}</select>\`;
  return \`<button class="btn sm back" data-a="unsel">‹ All projects</button>
  <div class="head"><div><div class="kicker">New project</div><h1>Create a project</h1>
    <div class="muted" style="margin-top:6px;font-size:12.5px">You are the Project Manager. The Project Code is assigned by Kissflow when the project is saved.</div></div></div>
  <div class="card"><h3>Project details</h3><form class="inline" data-form="newproj">
    <label class="field" style="grid-column:span 2">Project name<input name="name" required></label>
    <label class="field">Business unit\${sel('bu', O.bu)}</label><label class="field">Portfolio\${sel('portfolio', O.portfolio)}</label>
    <label class="field">Status<select name="status">\${O.status.map(s => \`<option \${s === 'Planning' ? 'selected' : ''}>\${esc(s)}</option>\`).join('')}</select></label>
    <label class="field">Department Head\${sel('dh', ppl('DH'))}</label><label class="field">Project Sponsor\${sel('ps', ppl('PS'), 'None')}</label>
    <label class="field">Sponsor approval of PSRs<select name="psreq"><option value="">Only when overall health is Red</option><option value="1">Always</option></select></label>
    <label class="field">Start date<input type="date" name="start" required></label>
    <label class="field">Approved budget (PHP)<input type="number" name="budget" min="0" step="1" required></label>
    <label class="field">Contingency fund (PHP)<input type="number" name="cont" min="0" step="1" required></label>
    <label class="field">Vendor<input name="vendor"></label>
    <label class="field">Contract total (PHP)<input type="number" name="contract" min="0" step="1"></label>
    <button class="btn pri">Create project</button></form></div>\`;
}
`;
h = h.replace("\nfunction vProjects() {", newProjForm + "\nfunction vProjects() {");
must(h.includes("function newProjForm()"), "newProjForm inserted");
h = h.replace("const A = {\n", "const A = {\n  newproj: () => { ui.sel = '__new'; },\n");
must(h.includes("newproj: () =>"), "A.newproj");
h = h.replace("const F = {\n", `const F = {
  newproj: fd_ => { const g = k => String(fd_.get(k) || '').trim(); const id = 'NEW-' + Date.now().toString(36);
    if (S.projects.some(x => x.name.toLowerCase() === g('name').toLowerCase())) { toast('A project with that name already exists'); return; }
    const p = { id, code: 'Saving…', name: g('name'), bu: g('bu'), portfolio: g('portfolio'), status: g('status') || 'Planning', pm: ui.me, dh: g('dh'), ps: g('ps') || g('dh'), _psSet: !!g('ps'), psRequired: !!g('psreq'),
      vendor: g('vendor'), contract: +g('contract') || 0, noa: '', po: '', poNo: '', ntp: '', expiry: '', start: g('start'),
      fin: { budget: +g('budget') || 0, contingency: +g('cont') || 0, changes: [], draws: [], actual: 0, committed: 0, eac: 0, invoices: [] },
      risks: [], issues: [], decisions: [], activities: [], baselines: [{ v: 1, date: g('start'), by: ui.me, note: 'Initial approved baseline' }], schedHistory: [], psrs: [] };
    S.projects.push(p); S.chat[id] = []; for (const u of S.users) (S.reads[u.id] = S.reads[u.id] || {})[id] = 0;
    ui.sel = id; ui.tab = 'overview'; audit('Create', \`Project \${p.name}\`); toast('Project created. Saving to Kissflow…'); },
`);
must(h.includes("newproj: fd_ =>"), "F.newproj");
// a new project has no activities yet — the S-curve would plot NaN
must(h.includes("function tSCurve(p, h) {\n"), "tSCurve");
h = h.replace("function tSCurve(p, h) {\n", "function tSCurve(p, h) {\n  if (!p.activities.length) return '<div class=\"empty\">Add activities in the Schedule tab to see the S-curve.</div>';\n");
// the bridge re-renders after Kissflow answers (new Project_Code, approval routing)
h = h.replace("window.__ITPH_BASELINE && window.__ITPH_BASELINE(S); render();", "window.__ITPH_BASELINE && window.__ITPH_BASELINE(S); window.__ITPH_RENDER = render; render();");
must(h.includes("window.__ITPH_RENDER = render;"), "render hook");

// USER MANUAL — a "User manual" nav item for every role (view code in scripts/manual.js).
const manual = readFileSync(new URL("./manual.js", import.meta.url), "utf8");
h = h.replace("\nfunction vProjects() {", () => "\n" + manual + "\nfunction vProjects() {");
must(h.includes("function vManual()"), "manual view inserted");
const alertsNav = /(  navs\.push\(\['alerts', 'Notifications'[^\n]*\n)/;
must(alertsNav.test(h), "notifications nav item");
// the Notifications nav item is dropped (the bell in the top bar still opens them)
h = h.replace(alertsNav, () => "  navs.push(['manual', 'User manual', MAN_IC]);\n");
must(h.includes("mytasks: vMyTasks, chat: vChat };"), "views map");
h = h.replace("mytasks: vMyTasks, chat: vChat };", "mytasks: vMyTasks, chat: vChat, manual: vManual };");
must(h.includes("const crumbName = { portfolio: 'Portfolio',"), "crumb names");
h = h.replace("const crumbName = { portfolio: 'Portfolio',", "const crumbName = { manual: 'User manual', portfolio: 'Portfolio',");
h = h.replace("const A = {\n", () => `const A = {
  mansel: el => { ui.manSel = el.dataset.id; }, manback: () => { ui.manSel = '__none'; }, manall: () => { ui.manAll = !ui.manAll; },
  mango: () => { const s = manSections().find(x => x.id === ui.manSel); if (s?.go) leafNavigate(s.go); },
`);
must(h.includes("mansel: el =>"), "manual actions");
h = h.replace("</style>", () => `.man-body{font-size:13.5px;line-height:1.6;max-width:820px}
.man-body p{margin:0 0 10px}
.man-steps{margin:0 0 14px;padding-left:22px;display:grid;gap:8px}
.man-steps li{padding-left:4px}
.man-body .card h3{margin-bottom:6px}
</style>`);

// Remove the prototype client-logo controls from the sidebar.
const logoActs = /\n\s*<div class="logo-actions">[^\n]*<\/div>/;
must(logoActs.test(h), "logo actions");
h = h.replace(logoActs, "");
// The sidebar header shows the product name without a client logo.
const sidebarLogo = /\n[ \t]*\$\{ui\.logo \? `<div class="logo-card"><img src="\$\{ui\.logo\}" alt="Client logo"><\/div>` : ''\}/;
must(sidebarLogo.test(h), "sidebar client logo");
h = h.replace(sidebarLogo, "");

// Invoices (ITPH-0071): the PM can mark an invoice Paid or delete it, and a paid invoice's amount is added
// to the project's Actual cost (taken back off if a paid invoice is deleted). Saved by the bridge as JSON
// in the project's Cost Entry.
const invHead = "<th>Status</th><th>Remarks</th></tr></thead>";
const invRow = "<td>${esc(v.remarks)}</td></tr>`).join('') || '<tr><td colspan=\"9\" class=\"muted\">No invoices recorded.</td></tr>'";
const invTitle = "<h3>Invoices ${req('ITPH-0071')}</h3>";
const invAdd = "  invoice: (fd_, p) => { p.fin.invoices.push({ no: fd_.get('no'), date: fd_.get('date'), doNo: fd_.get('doNo'), doDate: fd_.get('doDate'), vendor: p.vendor, amt: +fd_.get('amt'), paid: fd_.get('paid'), status: fd_.get('status'), remarks: fd_.get('remarks') }); audit('Add', `Invoice ${fd_.get('no')} (${p.code})`); },";
for (const [s, what] of [[invHead, "invoice table head"], ["f.invoices.map(v =>", "invoice rows"], [invRow, "invoice row end"], [invTitle, "invoice title"], [invAdd, "invoice form handler"]]) must(h.includes(s), what);
h = h.replace(invHead, () => "<th>Status</th><th>Remarks</th>${ed ? '<th></th>' : ''}</tr></thead>");
h = h.replace("f.invoices.map(v =>", "f.invoices.map((v, i) =>");
h = h.replace(invRow, () => "<td>${esc(v.remarks)}</td>${ed ? `<td><div class=\"row\" style=\"flex-wrap:nowrap;gap:4px\">${v.status !== 'Paid' ? `<button class=\"btn sm\" data-a=\"invpaid\" data-i=\"${i}\">Mark paid</button>` : ''}<button class=\"btn sm ghost danger\" data-a=\"delinv\" data-i=\"${i}\" aria-label=\"Delete invoice ${esc(v.no)}\">${ui.confirm === 'delinv' + i ? 'Confirm' : '✕'}</button></div></td>` : ''}</tr>`).join('') || `<tr><td colspan=\"${ed ? 10 : 9}\" class=\"muted\">No invoices recorded.</td></tr>`");
h = h.replace(invTitle, () => invTitle + "<p class=\"muted\" style=\"margin:-4px 0 10px;font-size:12.5px\">Paid invoices are added to Actual cost automatically.</p>");
h = h.replace(invAdd, () => `  invoice: (fd_, p) => { const paid = fd_.get('status') === 'Paid'; const amt = +fd_.get('amt');
    p.fin.invoices.push({ no: fd_.get('no'), date: fd_.get('date'), doNo: fd_.get('doNo'), doDate: fd_.get('doDate'), vendor: p.vendor, amt, paid: paid ? (fd_.get('paid') || TODAY) : fd_.get('paid'), status: fd_.get('status'), remarks: fd_.get('remarks') });
    if (paid) { p.fin.actual += amt; toast('Invoice added. Actual cost +' + pesoFull(amt)); } audit('Add', \`Invoice \${fd_.get('no')} (\${p.code})\`); },`);
const confirmKeys = "['reset', 'rebase', 'delact', 'delhol'].includes(k)";
must(h.includes(confirmKeys), "confirm keys");
h = h.replace(confirmKeys, "['reset', 'rebase', 'delact', 'delhol', 'delinv', 'wbsdel', 'bnddel', 'delprog', 'reldel', 'tpldel', 'rbdel'].includes(k)");
h = h.replace("const A = {\n", () => `const A = {
  invpaid: el => { const p = proj(ui.sel); const v = p.fin.invoices[+el.dataset.i]; if (!v || v.status === 'Paid') return; v.status = 'Paid'; v.paid = v.paid || TODAY; p.fin.actual += v.amt; audit('Modify', \`Invoice \${v.no} paid (\${p.code})\`); toast('Marked paid. Actual cost +' + pesoFull(v.amt)); },
  delinv: el => { const k = 'delinv' + el.dataset.i; if (ui.confirm !== k) { ui.confirm = k; return; } const p = proj(ui.sel); const v = p.fin.invoices[+el.dataset.i]; ui.confirm = null; if (!v) return;
    p.fin.invoices.splice(+el.dataset.i, 1); if (v.status === 'Paid') { p.fin.actual = Math.max(0, p.fin.actual - v.amt); toast('Invoice deleted. Actual cost −' + pesoFull(v.amt)); } audit('Delete', \`Invoice \${v.no} (\${p.code})\`); },
`);

// Sidebar footer keeps only the system date: no "Prototype · MVP scope" tag, no "Reset sample data" button.
// help text that pointed at the removed controls
const themeHelp = "'Use the sun, moon and screen buttons at the top right.'";
must(h.includes(themeHelp), "theme help");
h = h.replace(themeHelp, "'Use the sun and moon buttons at the top right.'");

// No notifications screen at all: drop the top-bar bell, its help topic and Ava's "notifications" shortcut.
const bell = /\n\s*<button class="icon-btn" data-a="nav" data-v="alerts"[^\n]*<\/button>/;
const notifTopic = /\n\s*\{ id: 'notif', title: 'Check notifications'[^\n]*\},/;
const notifTarget = /, notifications: \{ view: 'alerts' \}/;
must(bell.test(h), "notification bell"); must(notifTopic.test(h), "notifications help topic"); must(notifTarget.test(h), "Ava notifications target");
h = h.replace(bell, "").replace(notifTopic, "").replace(notifTarget, "");
const protoTag = /\n\s*<span class="proto">Prototype · MVP scope<\/span>/;
const resetBtn = /\n\s*<button data-a="reset"[^\n]*<\/button>/;
must(protoTag.test(h), "prototype tag"); must(resetBtn.test(h), "reset button");
h = h.replace(protoTag, "").replace(resetBtn, "");

// WBS HIERARCHY (spec 2026-09-30): UI functions live in scripts/wbs-ui.js; tree logic in src/wbs.js via window.__ITPH_WBS.
const wbsUi = readFileSync(new URL("./wbs-ui.js", import.meta.url), "utf8");
h = h.replace("\nfunction vProjects() {", () => "\n" + wbsUi + "\nfunction vProjects() {");
must(h.includes("function schedRows("), "wbs-ui inserted");
// summary rows roll up right after every schedule(p)
const schedEnd = "  const baseFinish = p.activities.map(a => a.bFinish).sort().pop();";
must(h.includes(schedEnd), "schedule() end");
h = h.replace(schedEnd, () => "  if (window.__ITPH_WBS) window.__ITPH_WBS.rollUp(p, { wdDiff, actState });\n" + schedEnd);
// table: WBS column + tree rows
const schedHead = "<th>ID</th><th>Activity</th><th>Assigned to</th>";
must(h.includes(schedHead), "schedule table head");
h = h.replace(schedHead, "<th>WBS</th><th>ID</th><th>Item</th><th>Assigned to</th>");
const durHead = '<th>Pred.</th><th class="r">Dur</th><th>Baseline</th>';
must(h.includes(durHead), "schedule Dur header");
h = h.replace(durHead, '<th>Pred.</th><th class="r">Dur</th><th class="r">Budget (₱)</th><th class="r">Actual (₱)</th><th>Baseline</th>');
const finCur = "<dt>Current approved budget</dt><dd class=\"num\"><b>${peso(x.current)}</b></dd></dl>";
must(h.includes(finCur), "Financials approved budget");
h = h.replace(finCur, () => "<dt>Current approved budget</dt><dd class=\"num\"><b>${peso(x.current)}</b></dd><dt>Allocated to WBS</dt><dd class=\"num\">${peso(wbsBudget(p))} <span class=\"faint\">(${x.current ? Math.round(wbsBudget(p) / x.current * 100) : 0}%)</span></dd></dl>");
const schedBody = /  \$\{acts\.map\(a => \{ const st = actState\(a\); const late = a\.fFinish > a\.bFinish; const ea = canEditAct\(p, a\);[\s\S]*?No activities assigned to you in this project\.<\/td><\/tr>`\}/;
must(schedBody.test(h), "schedule table rows");
h = h.replace(schedBody, () => "  ${schedRows(p, acts, ed, assignable)}");
// row actions + Accepted checkbox + Move under…
h = h.replace("const A = {\n", () => `const A = {
  wbstog: el => { const p = proj(ui.sel); const s = wbsCollapsed(p); s.has(el.dataset.id) ? s.delete(el.dataset.id) : s.add(el.dataset.id); wbsKeepCollapsed(p); },
  wbsall: el => { const p = proj(ui.sel); const s = wbsCollapsed(p); s.clear(); if (el.dataset.m === 'shut') (p.wbs || []).forEach(r => s.add(r.id)); wbsKeepCollapsed(p); },
  wbsmenu: el => { ui.wbsMenu = ui.wbsMenu === el.dataset.id ? null : el.dataset.id; },
  wbsup: el => wbsReorder(el.dataset.id, -1),
  wbsdown: el => wbsReorder(el.dataset.id, 1),
  wbsdel: el => wbsDelete(el),
  wbsedit: el => wbsStartEdit(el),
  wbsplus: el => { ui.wbsPlus = ui.wbsPlus === el.dataset.id ? null : el.dataset.id; },
  wbsnew: el => wbsStartNew(el),
  wbspred: el => { ui.wbsPred = el.dataset.id; ui.wbsEdit = null; ui.wbsNew = null; setTimeout(() => document.querySelector('[data-wbs-predq]')?.focus(), 0); },
  wbspredcancel: () => { ui.wbsPred = null; },
  wbspredsave: () => wbsPredSave(),
`);
const filtChange = "  if (c === 'filt') ui.filt[el.dataset.k] = el.value;";
must(h.includes(filtChange), "change handler anchor");
h = h.replace(filtChange, () => "  if (c === 'wbsacc') wbsAccept(el);\n  if (c === 'wbsparent') wbsMove(el);\n" + filtChange);

// BPI (Phase 2b): baseline snapshots + selector, task PV/EV, programs. UI in scripts/bpi-ui.js, logic in src/bpi.js.
const bpiUi = readFileSync(new URL("./bpi-ui.js", import.meta.url), "utf8");
h = h.replace("\nfunction vProjects() {", () => "\n" + bpiUi + "\nfunction vProjects() {");
must(h.includes("function bpiBaselineBar("), "bpi-ui inserted");
const baseRow = /<div class="row muted" style="font-size:12\.5px">Baseline v\$\{p\.baselines\.at\(-1\)\.v\}[^\n]*?: ''\}<\/div><\/div>`;/;
must(baseRow.test(h), "baseline row");
h = h.replace(baseRow, () => "${bpiBaselineBar(p, ed)}</div>`;");
const rebaseRe = /  rebase: \(\) => \{ if \(ui\.confirm !== 'rebase'\)[^\n]*\},\n/;
must(rebaseRe.test(h), "rebase handler");
h = h.replace(rebaseRe, () => `  rebase: () => { if (ui.confirm !== 'rebase') { ui.confirm = 'rebase'; return; } const p = proj(ui.sel); const BP = window.__ITPH_BPI;
    p.baselines.forEach(b => { if (b.live) { b.rows = BP.snapshotRows(p.activities, 'baseline'); b.live = false; } }); // v1 keeps the dates in force before this change
    p.activities.forEach(a => { a.bStart = a.fStart; a.bFinish = a.fFinish; }); const v = BP.nextVersion(p.baselines);
    p.baselines.push({ v, date: TODAY, by: ui.me, note: 'Re-baseline', rows: BP.snapshotRows(p.activities, 'baseline') }); p.activeBaseline = v;
    logSched(p, \`New baseline v\${v} set\`); audit('Modify', \`Baseline v\${v} (\${p.code})\`); ui.confirm = null; toast(\`Baseline v\${v} saved (\${p.baselines.length} kept)\`); },
  delprog: el => { const k = 'prog' + el.dataset.id; if (ui.confirm !== k) { ui.confirm = k; return; } S.programs = S.programs.filter(g => g.id !== el.dataset.id); S.projects.forEach(p => { if (p.program === el.dataset.id) p.program = ''; }); audit('Delete', 'Program'); ui.confirm = null; },
`);
const secsAnchor = "['thresholds', 'Alert thresholds', 'ITPH-003'], ";
must(h.includes(secsAnchor), "admin sections");
h = h.replace(secsAnchor, () => secsAnchor + "['programs', 'Programs', 'WP035 · WP036'], ");
const aMap = "const A = { calendar: aCalendar, thresholds: aThresholds,";
must(h.includes(aMap), "admin map");
h = h.replace(aMap, () => "const A = { calendar: aCalendar, thresholds: aThresholds, programs: aPrograms,");
const wbsAccC = "  if (c === 'wbsacc') wbsAccept(el);\n";
must(h.includes(wbsAccC), "change anchor 2");
h = h.replace(wbsAccC, () => wbsAccC + `  if (c === 'basesel') { const p = proj(ui.sel); const v = +el.value; const b = p.baselines.find(x => x.v === v); if (b && b.rows) { window.__ITPH_BPI.applyBaseline(p.activities, b); p.activeBaseline = v; logSched(p, \`Baseline v\${v} is now the one in force\`); audit('Modify', \`Active baseline v\${v} (\${p.code})\`); toast(\`Baseline v\${v} in force\`); } }
  if (c === 'projprog') { const p = proj(el.dataset.p); p.program = el.value; audit('Modify', \`Program of \${p.code}\`); }
`);
const fAnchor = "const F = {\n";
must(h.includes(fAnchor), "F anchor");
h = h.replace(fAnchor, () => "const F = {\n  program: fd_ => { (S.programs || (S.programs = [])).push({ id: 'NEWPG' + Date.now(), name: fd_.get('name').trim(), segment: (fd_.get('segment') || '').trim(), desc: '' }); audit('Add', 'Program'); },\n");
const invCard = "<div class=\"card\"><h3>Invoices ${req('ITPH-0071')}</h3>";
must(h.split(invCard).length === 2, "invoices card");
h = h.replace(invCard, () => "${bpiPvEvCard(p)}\n  " + invCard);
const portCard = '<div class="card"><h3>Project status <span class="row"><select class="inp" data-c="filt" data-k="health"';
must(h.split(portCard).length === 2, "portfolio card");
h = h.replace(portCard, () => "${bpiProgramsCard(all)}\n    " + portCard);


// BPI (Phase 3): project binder tab + portfolio roll-up.
const tabsAnchor = "['risks', 'Risks'], ";
must(h.split(tabsAnchor).length === 2, "tabs anchor");
h = h.replace(tabsAnchor, () => tabsAnchor + "['binder', 'Binder'], ");
const tMap = "risks: tRisks, ";
must(h.split(tMap).length === 2, "tab map");
h = h.replace(tMap, () => tMap + "binder: tBinder, ");
h = h.replace("${bpiProgramsCard(all)}", () => "${bpiProgramsCard(all)}\n    ${bpiBinderPortfolio(all)}");
const binderChange = "  if (c === 'projprog')";
must(h.includes(binderChange), "binder change anchor");
h = h.replace(binderChange, () => "  if (c === 'bndtype') ui.bndType = el.value;\n" + binderChange);
const bndHandlers = "  delprog: el =>";
must(h.includes(bndHandlers), "binder handlers anchor");
h = h.replace(bndHandlers, () => `  bndopen: el => { ui.bnd = ui.bnd === el.dataset.k ? null : el.dataset.k; },
  bndclose: () => { ui.bnd = null; },
  bnddel: el => { const k = 'bnd' + el.dataset.k; if (ui.confirm !== k) { ui.confirm = k; return; } const p = proj(ui.sel); const it = bndItems(p).find(x => x.key === el.dataset.k); if (it && !it.core) { p.binder = p.binder.filter(x => x !== it.e); audit('Delete', \`\${it.type} \${it.no} (\${p.code})\`); } ui.confirm = null; ui.bnd = null; },
` + bndHandlers);
h = h.replace("const F = {\n", () => `const F = {
  bnd: (fd_, p) => { const it = bndItems(p).find(x => x.key === ui.bnd); if (!it) return; let e = it.e;
    if (it.core) { if (!e.id) { e = { id: 'NEWB' + Date.now(), type: it.type, link: it.core.id, no: it.no, status: 'Open' }; (p.ext || (p.ext = [])).push(e); } }
    const g = k => fd_.get(k);
    const f = ['cat', 'milestone', 'raisedBy', 'dateAssigned', 'source', 'org', 'executed', 'action', 'actionStatus', 'planned', 'info', 'result'];
    for (const k of f) if (fd_.has(k)) e[k] = g(k) || '';
    if (it.type === 'Risk') e.target = g('target') || '';
    if (!it.core) { for (const k of ['desc', 'pri', 'assignee', 'status', 'target']) if (fd_.has(k)) e[k] = g(k) || (k === 'status' ? 'Open' : ''); }
    if (it.type === 'Change Request') { e.crKind = g('crKind') || ''; e.crStatus = g('crStatus') || 'Pending'; e.approved = g('approved') || (e.crStatus === 'Approved' ? TODAY : ''); }
    e.lastUpdate = TODAY; audit('Modify', \`Binder \${it.type} \${it.no} (\${p.code})\`); toast('Saved'); ui.bnd = null; },
  bndnew: (fd_, p) => { const type = fd_.get('type'); const no = window.__ITPH_BINDER.nextItemNo(type, (p.binder || []).filter(x => x.type === type));
    (p.binder || (p.binder = [])).push({ id: 'NEWB' + Date.now() + Math.floor(Math.random() * 99), type, no, desc: fd_.get('desc'), cat: '', info: '', pri: fd_.get('pri'), milestone: '', raisedBy: ui.me, dateAssigned: TODAY, source: '', planned: '', assignee: fd_.get('assignee'), org: '', target: fd_.get('target'), executed: '', action: '', actionStatus: 'Open', result: '', status: 'Open', lastUpdate: TODAY, crKind: type === 'Change Request' ? 'Reschedule' : '', crStatus: type === 'Change Request' ? 'Pending' : '', approved: '' });
    audit('Add', \`\${type} \${no} (\${p.code})\`); toast(\`\${no} added\`); },
`);


// BPI (Phase 4): weekly status report tab (nine highlights, KPI, PPT + PDF download).
const wsrTab = "['binder', 'Binder'], ";
must(h.split(wsrTab).length === 2, "wsr tab anchor");
h = h.replace(wsrTab, () => wsrTab + "['wsr', 'Weekly report'], ");
const wsrMap = "binder: tBinder, ";
must(h.split(wsrMap).length === 2, "wsr tab map");
h = h.replace(wsrMap, () => wsrMap + "wsr: tWsr, ");
const wsrChange = "  if (c === 'bndtype') ui.bndType = el.value;\n";
must(h.includes(wsrChange), "wsr change anchor");
h = h.replace(wsrChange, () => wsrChange + "  if (c === 'wsrweek') ui.wsrWeek = el.value;\n");
const wsrH = "  bndopen: el =>";
must(h.includes(wsrH), "wsr handlers anchor");
h = h.replace(wsrH, () => `  wsrsave: () => wsrSave(false),
  wsrfinal: () => wsrSave(true),
  wsrreopen: () => { const p = proj(ui.sel); const w = wsrOf(p, ui.wsrWeek || window.__ITPH_WSR.weekStart(TODAY)); if (w) { w.status = 'Draft'; w.snapshot = ''; audit('Modify', \`Weekly report reopened (\${p.code})\`); } },
  wsrdl: el => { wsrDownload(el.dataset.f); },
` + wsrH);


// BPI (Phase 5): dashboards view (+ release management in the Binder tab).
const dashUi = readFileSync(new URL("./dash-ui.js", import.meta.url), "utf8");
h = h.replace("\nfunction vProjects() {", () => "\n" + dashUi + "\nfunction vProjects() {");
must(h.includes("function vDash()"), "dash-ui inserted");
const viewsAnchor = "const views = { portfolio: vPortfolio,";
must(h.includes(viewsAnchor), "views map");
h = h.replace(viewsAnchor, () => "const views = { portfolio: vPortfolio, dash: vDash,");
const navAnchor = "navs.push(['portfolio', 'Portfolio', ic.dash]);";
must(h.includes(navAnchor), "portfolio nav");
h = h.replace(navAnchor, () => navAnchor + "\n  if (['PM', 'DH', 'PS', 'PSC', 'QA'].includes(r)) navs.push(['dash', 'Dashboards', ic.dash]);");
const dashChange = "  if (c === 'bndtype') ui.bndType = el.value;\n";
must(h.includes(dashChange), "dash change anchor");
h = h.replace(dashChange, () => dashChange + `  if (c === 'dashf') { (ui.dash || (ui.dash = {})); ui.dash[el.dataset.k] = el.value; }
  if (c === 'relf') { const p = proj(ui.sel); const r = (p.releases || []).find(x => x.id === el.dataset.id); if (r) { r[el.dataset.k] = el.value; audit('Modify', \`Release \${r.name} (\${p.code})\`); } }
`);
const dashH = "  bndopen: el =>";
must(h.includes(dashH), "dash handlers anchor");
h = h.replace(dashH, () => `  dashreset: () => { ui.dash = { segment: '', rag: '', from: '', to: '' }; },
  reldel: el => { const k = 'rel' + el.dataset.id; if (ui.confirm !== k) { ui.confirm = k; return; } const p = proj(ui.sel); p.releases = (p.releases || []).filter(x => x.id !== el.dataset.id); audit('Delete', \`Release (\${p.code})\`); ui.confirm = null; },
` + dashH);
h = h.replace("const F = {\n", () => `const F = {
  rel: (fd_, p) => { (p.releases || (p.releases = [])).push({ id: 'NEWR' + Date.now(), name: fd_.get('name'), mvp: !!fd_.get('mvp'), planned: fd_.get('planned'), forecast: fd_.get('forecast') || '', implemented: '', notes: '' }); audit('Add', \`Release \${fd_.get('name')} (\${p.code})\`); toast('Added'); },
`);


// BPI (Phase 5): lifecycle status on the Overview's master data card (PM sets it; it drives the status dashboard).
const mdAnchor = '<dl class="kv"><dt>Business unit</dt><dd>${esc(p.bu)}</dd>';
must(h.split(mdAnchor).length === 2, "master data anchor");
h = h.replace(mdAnchor, () => '<dl class="kv"><dt>Business unit</dt><dd>${esc(p.bu)}</dd><dt>Status</dt><dd>${canEdit(p) ? `<select class="inp" style="height:28px" data-c="pstatus" data-p="${p.id}" aria-label="Project status"><option value=""></option>${(window.__ITPH_OPTS?.status || []).concat(["Active", "Closed"].filter(x => x === p.status)).map(o => `<option ${p.status === o ? "selected" : ""}>${o}</option>`).join("")}</select>` : esc(p.status || "—")} <span class="faint" style="font-size:12px">${esc(window.__ITPH_DASH.statusCategory(p.status, health(p).overall) || "not counted")}</span></dd>');
const psChange = "  if (c === 'bndtype') ui.bndType = el.value;\n";
h = h.replace(psChange, () => psChange + "  if (c === 'pstatus') { const p = proj(el.dataset.p); p.status = el.value; audit('Modify', `Status of ${p.code}: ${el.value}`); }\n");


// BPI (Phase 6): admin (project profiles, templates, report builder), Reports view, export bar on every table.
const adminUi = readFileSync(new URL("./admin-ui.js", import.meta.url), "utf8");
h = h.replace("\nfunction vProjects() {", () => "\n" + adminUi + "\nfunction vProjects() {");
must(h.includes("function bpiAfterRender()"), "admin-ui inserted");
const afterR = "  if (typeof T !== 'undefined' && T.open) renderTala();\n";
must(h.split(afterR).length === 2, "render tail anchor");
h = h.replace(afterR, () => afterR + "  bpiAfterRender();\n");
h = h.replace("const views = { portfolio: vPortfolio, dash: vDash,", () => "const views = { portfolio: vPortfolio, dash: vDash, reports: vReports,");
const repNav = "  if (r === 'APPADMIN') navs.push(['admin', 'Configuration', ic.gear]);";
must(h.includes(repNav), "admin nav");
h = h.replace(repNav, () => "  if (['PM', 'DH', 'PS', 'PSC', 'QA', 'APPADMIN'].includes(r)) navs.push(['reports', 'Reports', ic.task]);\n" + repNav);
const secs2 = "['programs', 'Programs', 'WP035 · WP036'], ";
must(h.includes(secs2), "admin secs 2");
h = h.replace(secs2, () => secs2 + "['projects', 'Project profiles', 'ADM004'], ['templates', 'Templates', 'ADM006'], ['reports', 'Reports and dashboards', 'ADM012'], ");
const aMap2 = "programs: aPrograms,";
must(h.includes(aMap2), "admin map 2");
h = h.replace(aMap2, () => "programs: aPrograms, projects: aProjects, templates: aTemplates, reports: aReports,");
// the new-project form: admins name the PM; a workplan template can build the schedule
const npA = "pm: ui.me, dh: g('dh')";
must(h.split(npA).length === 2, "newproj pm");
h = h.replace(npA, () => "pm: g('pm') || ui.me, dh: g('dh')");
const npB = "baselines: [{ v: 1, date: g('start'), by: ui.me, note: 'Initial approved baseline' }]";
must(h.split(npB).length === 2, "newproj baseline");
h = h.replace(npB, () => "baselines: [{ v: 1, date: g('start'), by: g('pm') || ui.me, note: 'Initial approved baseline', live: true }]");
const npC = "S.projects.push(p); S.chat[id] = [];";
must(h.split(npC).length === 2, "newproj push");
h = h.replace(npC, () => "bpiNewProjectExtras(p, g); S.projects.push(p); S.chat[id] = [];");
const adminChange = "  if (c === 'bndtype') ui.bndType = el.value;\n";
h = h.replace(adminChange, () => adminChange + `  if (c === 'tplsel') ui.tplSel = el.value;
  if (c === 'wsrtp') bpiSetTpl('WSR', d => { d.fields[el.dataset.k].prompt = el.value; });
  if (c === 'wsrtr') bpiSetTpl('WSR', d => { d.fields[el.dataset.k].required = el.checked; });
  if (c === 'dtc') bpiSetTpl('Dashboard', d => { d.cards[el.dataset.k] = el.checked; });
  if (c === 'dtf') bpiSetTpl('Dashboard', d => { d.filters[el.dataset.k] = el.value; });
  if (c === 'rb') { const d = ui.rb; d[el.dataset.k] = el.value; if (el.dataset.k === 'dataset') { const fs = window.__ITPH_REPORT.DATASETS[el.value].fields; Object.assign(d, { columns: fs.slice(0, 3).map(x => x.key), filters: [{ field: '', op: 'eq', value: '' }], sort: { field: '', dir: 'asc' }, groupBy: '', sumField: '' }); } }
  if (c === 'rbcol') { const d = ui.rb; d.columns = el.checked ? [...d.columns, el.dataset.k] : d.columns.filter(x => x !== el.dataset.k); }
  if (c === 'rbf') ui.rb.filters[+el.dataset.i][el.dataset.k] = el.value;
  if (c === 'rbs') ui.rb.sort[el.dataset.k] = el.value;
`);
const adminH = "  bndopen: el =>";
h = h.replace(adminH, () => `  exp: el => { bpiExport(el.dataset.f, +el.dataset.i); },
  rpsel: el => { ui.rpSel = el.dataset.id; },
  tpldel: el => { const k = 'tpl' + el.dataset.id; if (ui.confirm !== k) { ui.confirm = k; return; } S.templates = S.templates.filter(t => t.id !== el.dataset.id); ui.tplSel = null; ui.confirm = null; audit('Delete', 'Workplan template'); },
  tplrowdel: el => { const t = bpiTpl('Workplan').find(x => x.id === ui.tplSel); if (t) { const id = el.dataset.id; t.data.rows = (t.data.rows || []).filter(r => r.id !== id).map(r => ({ ...r, preds: (r.preds || []).filter(x => x !== id), parent: r.parent === id ? '' : r.parent })); audit('Modify', 'Workplan template'); } },
  rbedit: el => { const t = bpiTpl('Report').find(x => x.id === el.dataset.id); if (t) { ui.rbSel = t.id; ui.rb = { ...JSON.parse(JSON.stringify(t.data)), name: t.name, desc: t.desc || '' }; if (!ui.rb.filters.length) ui.rb.filters.push({ field: '', op: 'eq', value: '' }); } },
  rbdel: el => { const k = 'rb' + el.dataset.id; if (ui.confirm !== k) { ui.confirm = k; return; } S.templates = S.templates.filter(t => t.id !== el.dataset.id); if (ui.rbSel === el.dataset.id) { ui.rbSel = null; ui.rb = null; } ui.confirm = null; audit('Delete', 'Report'); },
  rbaddf: () => { ui.rb.filters.push({ field: '', op: 'eq', value: '' }); },
  rbnew: () => { ui.rbSel = null; ui.rb = null; },
  rbsave: () => { const d = ui.rb; if (window.__ITPH_REPORT.validateReport(d).length) return; const { name, desc, ...def } = d; def.filters = d.filters.filter(f => f.field);
    let t = ui.rbSel && bpiTpl('Report').find(x => x.id === ui.rbSel); if (!t) { t = { id: 'NEWT' + Date.now(), type: 'Report', isDefault: false }; (S.templates || (S.templates = [])).push(t); }
    Object.assign(t, { name: name.trim(), desc, data: def }); ui.rbSel = t.id; audit('Modify', \`Report \${t.name}\`); toast('Report saved'); },
` + adminH);
h = h.replace("const F = {\n", () => `const F = {
  tplnew: fd_ => { const t = { id: 'NEWT' + Date.now(), type: 'Workplan', name: fd_.get('name').trim(), desc: '', isDefault: false, data: { rows: [] } }; (S.templates || (S.templates = [])).push(t); ui.tplSel = t.id; audit('Add', \`Workplan template \${t.name}\`); },
  tplrow: fd_ => { const t = bpiTpl('Workplan').find(x => x.id === ui.tplSel); if (!t) return; const id = fd_.get('id').trim().toUpperCase(); const rows = t.data.rows || (t.data.rows = []);
    if (rows.some(r => r.id === id)) { toast('That ID is already in the template'); return; }
    const type = fd_.get('type'); rows.push({ id, name: fd_.get('name').trim(), type, parent: fd_.get('parent').trim().toUpperCase(), dur: type === 'milestone' ? 1 : +fd_.get('dur') || 1, preds: fd_.get('preds').split(/[\\s,;]+/).map(x => x.trim().toUpperCase()).filter(Boolean) }); audit('Modify', 'Workplan template'); },
`);
h = h.replace("</style>", () => ".exp-bar{display:flex;gap:6px;align-items:center;justify-content:flex-end;font-size:11.5px;color:var(--faint);margin:2px 0 4px}.exp-bar .btn{height:24px;padding:0 8px}\n</style>");

h = h.replace("</style>", () => `.wbs-name{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.wbs-tog{width:18px;height:18px;border:0;background:none;padding:0;color:var(--faint);cursor:pointer;font-size:12px;flex:none;display:inline-grid;place-items:center}
.wbs-tog:hover{color:var(--ink)}
tr.wbs-sum td{background:var(--panel2)}
tr.wbs-phase td{font-weight:600}
.wbs-type{font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--faint);font-weight:600}
.wbs-acc{font-size:11.5px;color:var(--faint);display:inline-flex;align-items:center;gap:4px;font-weight:500}
.wbs-acc.on{color:var(--ok)}
.wbs-warn{color:var(--warn);cursor:help}
.wbs-menu{position:absolute;right:0;top:32px;z-index:20;display:flex;flex-direction:column;align-items:stretch;gap:2px;background:var(--panel);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow-sm);padding:6px;min-width:230px}
.wbs-menu .btn{justify-content:flex-start;white-space:nowrap}
tr.wbs-bar td{padding:4px 8px}
.wbs-tree{display:flex;align-items:center;gap:4px;min-height:28px;position:relative}
.wbs-tree{white-space:nowrap}
.wbs-tc{position:relative}
.g-row .n.wbs-tc{align-self:stretch}
.wbs-ln{position:absolute;top:0;bottom:-1px;width:9px;pointer-events:none}
.wbs-ln::before{content:'';position:absolute;left:0;top:0;bottom:0;border-left:1px solid var(--faint);opacity:.45}
.wbs-ln.l::before{bottom:50%}
.wbs-ln.s::before{top:calc(50% + 7px)}
.wbs-ln.t::after,.wbs-ln.l::after{content:'';position:absolute;left:0;right:0;top:50%;border-top:1px solid var(--faint);opacity:.45}
.wbs-ic{width:16px;height:16px;flex:none;display:inline-grid;place-items:center;color:var(--faint)}
.wbs-ic svg{width:15px;height:15px}
.wbs-ic.phase{color:var(--accent)}.wbs-ic.deliverable{color:var(--info)}.wbs-ic.milestone{color:var(--warn)}
.wbs-nm.sum{font-weight:600}
.wbs-click{cursor:text;border-radius:4px;padding:1px 3px;margin:-1px -3px}
.wbs-click:hover{background:var(--panel2);outline:1px dashed var(--line)}
.wbs-in{height:28px;min-width:180px;font-weight:500}
.wbs-in.xs{min-width:0;width:90px}
.wbs-plus-w{position:relative;display:inline-flex}
.wbs-plus{width:22px;height:22px;border-radius:6px;border:1px solid var(--line);background:var(--panel);color:var(--faint);cursor:pointer;font-size:14px;line-height:1;opacity:0;transition:opacity .12s}
tr:hover .wbs-plus,.wbs-plus:focus,.wbs-plus[aria-expanded="true"]{opacity:1}
.wbs-plus:hover{color:var(--accent);border-color:var(--accent)}
.wbs-plus-menu{position:absolute;left:0;top:26px;z-index:20;display:flex;flex-direction:column;align-items:stretch;background:var(--panel);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow-sm);padding:4px;min-width:190px}
.wbs-plus-menu .btn{justify-content:flex-start;white-space:nowrap}
tr.wbs-new td{background:var(--panel2)}
.g-row .n .wbs-tree{min-height:0}
.wbs-predbtn{background:none;border:0;font:inherit;color:inherit;min-width:24px;text-align:left}
.wbs-bud{font-size:12.5px;color:var(--muted)}
.wbs-bud.over{color:var(--bad)}
.wbs-pd-back{position:fixed;inset:0;background:rgba(10,20,15,.28);z-index:60}
.wbs-pd{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:61;width:min(520px,calc(100vw - 32px));max-height:min(620px,calc(100vh - 48px));display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--line);border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.22)}
.wbs-pd-h{padding:14px 16px 8px;font-size:14px}
.wbs-pd-q{margin:0 16px 8px;height:34px}
.wbs-pd-list{overflow:auto;padding:0 8px;flex:1;border-top:1px solid var(--line2);border-bottom:1px solid var(--line2)}
.wbs-pd-grp{display:flex;align-items:center;gap:6px;font-weight:600;font-size:12.5px;padding-top:8px;padding-bottom:4px;color:var(--ink)}
.wbs-pd-it{display:flex;align-items:center;gap:6px;font-size:13px;padding-top:5px;padding-bottom:5px;border-radius:6px;cursor:pointer}
.wbs-pd-it:hover{background:var(--panel2)}
.wbs-pd-it.off{opacity:.5;cursor:not-allowed}
.wbs-pd-f{padding:10px 16px;gap:8px}
</style>`);

const addCard = /  \$\{ed \? `<div class="card"><h3>Add activity or milestone[\s\S]*?<button class="btn pri">Add to schedule<\/button><\/form><\/div>` : ''\}/;
must(addCard.test(h), "add activity card");
h = h.replace(addCard, () => "  ${wbsPredDialog(p)}"); // adding happens inline in the tree (+ on a row, + Phase / + Task); the predecessor picker renders here
const addHandler = /  act: \(fd_, p\) => \{[\s\S]*?toast\('Added\. It is not in the baseline until you set a new baseline\.'\); \},/;
must(addHandler.test(h), "add activity handler");
h = h.replace(addHandler, "");
const addHelp = /  \{ id: 'addact', title: 'Add an activity or milestone'[^\n]*\},/;
must(addHelp.test(h), "addact help topic");
h = h.replace(addHelp, () => "  { id: 'addact', title: 'Add a phase, deliverable, task or milestone', keys: ['add activity', 'new activity', 'milestone', 'add task', 'wbs', 'phase', 'deliverable', 'subtask'], roles: ['PM'], steps: ['Go to the **Schedule** tab. Use **+ Phase** or **+ Task** above the table for a top-level item.', 'Or click **+** on a row and pick what to add under it or below it (deliverable, task, subtask or milestone).', 'Type the name and press **Enter** (Esc cancels). Keep typing and pressing Enter to add more below.', 'Click a name, duration or predecessor cell to change it in place. Use **⋯** on a row to move it under another item, move it up or down, or delete it.'], go: { view: 'projects', tab: 'schedule' } },");

const ganttBody = /    \$\{acts\.map\(a => \{ const late = a\.fFinish > a\.bFinish; const fs = a\.aStart \|\| a\.fStart;[\s\S]*?<div class="g-today" style="left:\$\{x\(TODAY\)\}%"><\/div><\/div><\/div>`; \}\)\.join\(''\)\}/;
must(ganttBody.test(h), "gantt rows");
h = h.replace(ganttBody, () => "    ${ganttRows(p, acts, ed, x, wdt, months)}");
h = h.replace("</style>", () => `.g-row .n{display:flex;align-items:center;gap:6px}
.g-sumrow .n b{font-weight:600}
.g-sum{position:absolute;top:50%;height:6px;margin-top:-3px;background:var(--ink);opacity:.8;border-radius:1px}
.g-sum::before,.g-sum::after{content:'';position:absolute;top:6px;width:0;height:0;border-top:5px solid var(--ink)}
.g-sum::before{left:0;border-right:5px solid transparent}
.g-sum::after{right:0;border-left:5px solid transparent}
.g-sum i{position:absolute;left:0;top:0;bottom:0;background:var(--accent)}
</style>`);

// PSR: phases and deliverables in the snapshot and the document
const psrMs = "      milestones: acts.filter(a => a.ms),";
must(h.includes(psrMs), "PSR snapshot milestones");
h = h.replace(psrMs, () => psrMs + "\n      phases: psrPhases(p), deliverables: psrDeliverables(p),");
const psrBehind = "<div class=\"grid g2\"><div><h4>Behind schedule ${req('ITPH-00106')}</h4>";
must(h.includes(psrBehind), "PSR behind-schedule block");
h = h.replace(psrBehind, () => "${psrWbsTables(s)}\n    " + psrBehind);
// My tasks: where each item sits in the WBS
const myCrumb = "<div class=\"faint mono\" style=\"font-size:11px\">${a.id} · PM ${esc(uname(p.pm))}</div>";
must(h.includes(myCrumb), "my tasks id line");
h = h.replace(myCrumb, () => "<div class=\"faint mono\" style=\"font-size:11px\">${a.id}${wbsCrumb(p, a.id)} · PM ${esc(uname(p.pm))}</div>");
// discussions: phases and deliverables are linkable and resolve by label
const refOptsA = "const refOpts = [...p.activities.map(a => [`act:${a.id}`, `${a.id} · ${a.name}`]),";
must(h.includes(refOptsA), "chat link options");
h = h.replace(refOptsA, () => "const refOpts = [...[...p.activities, ...(p.wbs || [])].map(a => [`act:${a.id}`, `${a.id} · ${a.name}`]),");
const refLab = "if (t === 'act') { const a = p.activities.find(x => x.id === id);";
must(h.includes(refLab), "refLabel activity lookup");
h = h.replace(refLab, () => "if (t === 'act') { const a = [...p.activities, ...(p.wbs || [])].find(x => x.id === id);");
// Ava: phase / deliverable questions
const leafBullets = "  const bullets = xs => xs.map(x => '- ' + x).join('\\n');";
must(h.includes(leafBullets), "Ava basicAnswer bullets");
h = h.replace(leafBullets, () => leafBullets + "\n  if (p && /\\bphases?\\b/.test(s)) return wbsPhaseAnswer(p);\n  if (p && /deliverables?/.test(s)) return wbsDeliverableAnswer(p);");

// Gantt of a project with only phases (no work items yet) has no date range — show a hint instead of crashing
const ganttHead = "function gantt(p, h, list) {\n";
must(h.includes(ganttHead), "gantt() head");
h = h.replace(ganttHead, () => ganttHead + "  if (!p.activities.length) return '<div class=\"empty\">Add tasks or milestones in the table view to see them on the Gantt chart.</div>';\n");

// S-curve: progress (work days) or cost / earned value (WBS budget) — curvePoints takes the weighting explicitly
const cpHead = "function curvePoints(p) {\n  const acts = p.activities.filter(a => !a.ms); const tot = acts.reduce((s, a) => s + a.dur, 0) || 1;";
must(h.includes(cpHead), "curvePoints head");
const cpRe = /function curvePoints\(p\) \{[\s\S]*?\n\}\n/;
h = h.replace(cpRe, (fn) => fn.replace("function curvePoints(p) {", "function curvePoints(p, mode) {\n  const wt = a => (mode === 'cost' ? (+a.cost || 0) : a.dur);").replace("acts.reduce((s, a) => s + a.dur, 0)", "acts.reduce((s, a) => s + wt(a), 0)").replace(/a\.dur(?= \*)/g, "wt(a)").replace("return s + a.dur; const from", "return s + wt(a); const from"));
must(!/function curvePoints[\s\S]{0,1400}?a\.dur/.test(h.slice(h.indexOf("function curvePoints"), h.indexOf("function curvePoints") + 1600).replace(/const wt = [^\n]*/, "")), "curvePoints fully weighted");
const scRet = "return `<div class=\"grid g4\">\n    <div class=\"card stat\"><span class=\"l\">Planned progress to date";
must(h.includes(scRet), "tSCurve return");
h = h.replace(scRet, () => "return scToggle() + `<div class=\"grid g4\">\n    <div class=\"card stat\"><span class=\"l\">Planned progress to date");
h = h.replace("function tSCurve(p, h) {\n", () => "function tSCurve(p, h) {\n  if (ui.scMode === 'cost' && p.activities.length) return tSCurveCost(p);\n");
h = h.replace("const A = {\n", () => "const A = {\n  scmode: el => { ui.scMode = el.dataset.m; },\n");

// Ava: a suggestion for a task that has since become a parent row (or was deleted) is dropped with a message, not applied
const leafAct = "  const a = x.act ? p.activities.find(y => y.id === x.act) : null;\n";
must(h.includes(leafAct), "applyProposal activity lookup");
h = h.replace(leafAct, () => leafAct + "  if (x.act && !a) { x.status = 'dismissed'; toast(`${x.act} is no longer a task you can update (it now has items under it, or was deleted). Ask Ava again.`); renderTala(); return; }\n");

h = h.replace("AI_IMG = '/ava-avatar.webp'; AI_HERO = '/ava.webp';", "AI_IMG = './ava-avatar.webp'; AI_HERO = './ava.webp';");

// AVA reuses the existing panel and approvals, with the public Kissflow Custom Agent API.
h = h.replaceAll("  return; // Ava is hidden for BPI; remove this return to re-enable\n", "");
h = h.replace(".t-fab,.t-panel,.btn.ai{display:none!important}", "");
const avaUi = readFileSync(new URL("./ava-ui.js", import.meta.url), "utf8");
for (const name of ["askTala", "initTala", "suggestions"]) {
  const re = new RegExp("(?:async )?function " + name + "\\([^]*?\\n\\}\\n");
  must(re.test(h), "AVA existing " + name); h = h.replace(re, "");
}
const avaAnchor = "\nAI_IMG = "; must(h.includes(avaAnchor), "AVA UI insertion");
h = h.replace(avaAnchor, () => "\n" + avaUi + "\nAI_IMG = ");
h = h.replace("const modeTxt = T.mode === 'claude' ? 'Powered by Claude' : T.mode === 'checking' ? 'Connecting…' : 'Offline answers';", "const modeTxt = T.mode === 'kissflow' ? 'Kissflow Custom Agent' : T.mode === 'checking' ? 'Connecting…' : 'Built-in checks · AI not connected';");
h = h.replace("<b>Ava</b><span>", "<b>AVA</b><span>");
h = h.replace("<span>Ask Ava</span>", "<span>Ask AVA</span>");
h = h.replace("<h3>Hi ${esc(me().name.split(' ')[0])}! I'm Ava, ${AI_TAG}.</h3>", "<h3>Review your project with AVA</h3>");
h = h.replace("<div class=\"t-msgs\" id=\"tmsgs\">", "<div class=\"t-msgs\" id=\"tmsgs\" aria-live=\"polite\" aria-relevant=\"additions text\">");
h = h.replace("${m.note ? `<div class=\"t-note\">${esc(m.note)}</div>` : ''}", "${m.note ? `<div class=\"t-note\">${esc(m.note)}</div>` : ''}${m.executionId ? `<div class=\"t-note\">Execution: ${esc(m.executionId)}</div>` : ''}${m.checkable ? `<button class=\"btn sm\" data-ava-check=\"${i}\" ${T.busy ? 'disabled' : ''}>Check this execution</button>` : ''}${m.review ? avaSourceCard(m.review) : ''}");
h = h.replace("${m.basic ? ' · built-in answers' : ''}", "${m.basic ? ' · built-in checks' : ' · Kissflow Custom Agent'}");
h = h.replace("<div class=\"t-ctx\">", "${T.connectionError ? `<div class=\"ava-notice\" role=\"status\">${esc(T.connectionError)}</div>` : ''}<div class=\"t-ctx\">");
h = h.replace("if (k === 'clear') { if (T.ctl)", "if (k === 'clear') { if (T.unknownOutcome && !window.confirm('The previous request may still be running in Kissflow. Start a new conversation?')) return; T.unknownOutcome = false; if (T.ctl)");
h = h.replace("T.msgs = []; T.turns = []; T.busy = false; renderTala();", "T.ctl = null; T.msgs = []; T.turns = []; T.pending = {}; T.psrReadiness = null; T.busy = false; renderTala(); avaRefreshReadiness();");
h = h.replace("if (c === 'who') { if (T.ctl) T.ctl.abort();", "if (c === 'who') { if (T.ctl) T.ctl.abort(); T.ctl = null; T.pending = {}; T.psrReadiness = null; T.unknownOutcome = false;");
const guard = "  const x = T.pending[id]; if (!x || x.status !== 'pending') return; const p = proj(x.pid);\n";
must(h.includes(guard), "AVA apply access guard");
h = h.replace(guard, () => guard + `  if (!p || !myProjects().some(v => v.id === p.id)) { x.status = 'dismissed'; toast('Project access changed. This proposal was dismissed.'); renderTala(); return; }
  if (!actionsAllowed()) { toast('AVA suggestions are turned off by the administrator.'); return; }
  if (x.type === 'psr_narrative' && x.avaFingerprint && (x.avaFingerprint !== avaFingerprint(p) || x.period.y !== curPeriod().y || x.period.m !== curPeriod().m)) { x.status = 'dismissed'; toast('Project data or reporting period changed. Ask AVA to review again.'); renderTala(); return; }
`);
h = h.replace("function makeProposal(input) {\n", () => "function makeProposal(input) {\n  if (!actionsAllowed()) throw new Error('AVA suggestions are turned off by the administrator');\n  if (!['assign', 'move_start', 'set_progress', 'add_risk', 'add_action', 'psr_narrative', 'post_message'].includes(input.type)) throw new Error('Unknown proposal type');\n");
h = h.replace("['ld', 'LD formula', 'ITPH-002 · P2']]", "['ld', 'LD formula', 'ITPH-002 · P2'], ['leaf', 'AVA assistant', 'ITPH-00291 – 00295']]");
h = h.replace("  <div class=\"grid g2\">\n    <div class=\"card\"><h3>Ava Basic", "  ${avaConnectionCard()}\n  <div class=\"grid g2\">\n    <div class=\"card\"><h3>Ava Basic");
h = h.replace("</style>", () => `.t-panel{width:min(460px,100vw)}
.t-hero{width:100px;max-height:120px;object-fit:contain}.t-hello{padding:18px 8px 8px;text-align:left}.t-hello .t-hero{margin:0 0 10px}
.t-bb .ava-review{margin:12px 0 0;background:var(--panel);border-color:var(--line);max-width:100%}
.ava-finding{padding:10px 0;border-top:1px solid var(--line);font-size:12.5px;line-height:1.5}.ava-finding p{margin:5px 0}.ava-finding .pill{font-size:11px}
.ava-notice{padding:10px 16px;color:var(--muted);background:var(--panel2);font-size:12px;border-bottom:1px solid var(--line)}
.t-mode.kissflow{color:var(--accent)}.t-note{overflow-wrap:anywhere}.t-bb{min-width:0}.t-ctx{overflow-wrap:anywhere}
@media(max-width:600px){.t-panel{width:100vw;z-index:80}.t-x,.t-sug button,.t-send,[data-ava-source],[data-ava-check]{min-height:44px}.t-head{padding:12px 16px}.t-tier{flex-wrap:wrap;gap:6px}.t-msgs{padding:12px}.ava-review{font-size:13px}.t-ctx{font-size:12px}}
</style>`);

h = h.replace("I can explain project health, run what-if checks on the schedule, compare projects, read S-curve trends, draft PSR narratives and suggest changes for you to approve.", "I can review project health, find missing updates, brief you on the portfolio and prepare PSR narratives for you to review and apply.");
h = h.replace("Analysis, forecasts, what-ifs and drafting", "Project reviews, missing data and PSR drafting");
h = h.replace("Draft the ${MONF[r.period.m - 1]} PSR narrative", "Draft the ${MONF[r.period.m - 1]} ${r.period.y} PSR narrative");
// Embed readiness in preparation and editable current-period report pages.
const readinessList = '  <div class="tbl-wrap"><table><thead><tr><th>Period</th><th>Status</th><th>Health at submission</th>';
must(h.includes(readinessList), 'PSR list readiness slot');
h = h.replace(readinessList, () => '  ${avaReadinessCard(p)}\n' + readinessList);
const readinessDetail = '  <div class="psr-doc">\n    <div class="head"><div><div class="kicker">Project Status Report';
must(h.includes(readinessDetail), 'PSR detail readiness slot');
h = h.replace(readinessDetail, () => "  ${!fromApprovals ? avaReadinessCard(p, r) : ''}\n" + readinessDetail);
h = h.replace('</style>', `.ava-readiness{margin:14px 0}.ava-readiness h3{margin:0}.ava-readiness .row{flex-wrap:wrap}.ava-readiness-answer{font-size:13px;line-height:1.6;overflow-wrap:anywhere}.ava-readiness .ava-review{max-width:none}.ava-readiness .ava-finding{padding:12px 0}
</style>`);

// Use the existing AVA portrait on every AI request and proposal execution control.
h = h.replaceAll('${TALA_IC}Ask Ava', "${aiAv('ava-button-avatar')}Ask Ava");
h = h.replaceAll('${TALA_IC}Draft with Ava', "${aiAv('ava-button-avatar')}Draft with Ava");
h = h.replace('>${esc(s)}</button>', ">${aiAv('ava-button-avatar')}${esc(s)}</button>");
h = h.replace('<button class="t-send" aria-label="Send"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 10l14-6-5 14-2.5-5.5z"/></svg></button>', `<button class="t-send" aria-label="Send to AVA" title="Send to AVA">\${aiAv('ava-button-avatar')}</button>`);
h = h.replace('data-t="apply" data-id="${x.id}">Apply</button>', `data-t="apply" data-id="\${x.id}">\${aiAv('ava-button-avatar')}Apply</button>`);
h = h.replace('>Check this execution</button>', ">${aiAv('ava-button-avatar')}Check this execution</button>");
h = h.replace('</style>', `.ava-button-avatar{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;flex:0 0 24px;overflow:hidden;border-radius:50%;vertical-align:middle}
.ava-button-avatar img{display:block;width:100%;height:100%;object-fit:cover}
.btn.sm .ava-button-avatar{width:20px;height:20px;flex-basis:20px}
.t-sug button{display:inline-flex;align-items:center;gap:6px}
.t-sug .ava-button-avatar{width:22px;height:22px;flex-basis:22px}
.t-send .ava-button-avatar{width:30px;height:30px;flex-basis:30px}
</style>`);

// Agent identities and inline approval briefing share the existing public-agent lifecycle.
const agentsUi = readFileSync(new URL("./agents-ui.js", import.meta.url), "utf8");
h = h.replace("\nAI_IMG = './ava-avatar.webp';", () => "\n" + agentsUi + "\nAI_IMG = './ava-avatar.webp';");
h = h.replace("${!fromApprovals ? avaReadinessCard(p, r) : ''}", "${!fromApprovals ? avaReadinessCard(p, r) : theoCard(p, r)}");
h = h.replace("<div class=\"t-b\">${aiAv('t-av')}", "<div class=\"t-b\">${agentAvatar(m.agent || 'ava', 't-av')}");
h = h.replace("<div class=\"t-note\">AVA ${m.tier", "<div class=\"t-note\">${m.agent === 'ari' ? 'Ari' : 'AVA'} ${m.tier");
h = h.replaceAll("T.psrReadiness = null;", "T.psrReadiness = null; T.theo = null;");
h = h.replace("avaRefreshReadiness();\n}", "avaRefreshReadiness(); if (typeof theoRefresh === 'function') theoRefresh();\n}");
h = h.replace("['leaf', 'AVA assistant',", "['leaf', 'Project agents',");
h = h.replace('</style>', `.agent-avatar{display:inline-flex;position:relative;overflow:hidden;border-radius:50%;width:28px;height:28px;flex:0 0 28px;background:var(--panel2)}
.agent-avatar img{display:block;width:300%;max-width:none;height:100%;object-fit:fill;flex:none}.agent-theo img{margin-left:-200%}
.agent-heading{display:flex;align-items:center;gap:10px}.agent-heading .agent-avatar,.agent-heading .ava-button-avatar{width:36px;height:36px;flex-basis:36px}
.agent-connections{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.agent-connections form{min-width:0}.agent-connections h4{min-height:48px}.agent-connections input{width:100%;min-width:0}.agent-connections .btn{white-space:normal}
@media(max-width:900px){.agent-connections{grid-template-columns:1fr}}
</style>`);

h = h.replaceAll("Ava", "AVA");

writeFileSync(new URL("../index.html", import.meta.url), h);
console.log("index.html generated from prototype (" + Math.round(h.length / 1024) + " KB)");
