// Bridge between the approved prototype UI (index.html, generated from the prototype by
// scripts/make-index.mjs) and the live Kissflow app ITPMD_Project_Hub_A00.
//
//   load  : Kissflow records → the prototype's state object `S` (same shape as its seed()).
//   save  : the prototype calls save() after every change → we diff S against the last
//           synced copy and write creates/updates/deletes back to Kissflow.
//
// Inside Kissflow it uses the real SDK (kf.api). Opened directly in dev it uses the
// preview SDK (src/dev/preview-sdk.js → /__kf proxy). Everything else is the prototype.
import * as avaRules from "./ava.js";
import { executionResult } from "./ava-agent.js";
import * as projectAgents from "./project-agents.js";
window.__ITPH_AGENT_RULES = projectAgents;
window.__ITPH_AVA_RULES = { ...avaRules, executionResult };

import KFSDK from "@kissflow/lowcode-client-sdk";
import schema from "../lib/kf-schema.json";
import { showLoader, hideLoader } from "./loader.js";
import { createDiscussions } from "./discussions-sync.js";
import { makeRenderSoon } from "./render-soon.js";
import * as wbs from "./wbs.js";
import * as bpi from "./bpi.js";
import * as binder from "./binder.js";
import * as wsr from "./wsr.js";
import * as dash from "./dash.js";
import * as tpl from "./tpl.js";
import * as report from "./report.js";
import { deleteIfPresent } from "./kf-errors.js";
import { planRows } from "./sync-plan.js";
window.__ITPH_TPL = tpl; window.__ITPH_REPORT = report; // templates and report builder (scripts/admin-ui.js)
// REP001: one place that turns a table into a downloaded CSV / Excel / PowerPoint / PDF file
window.__ITPH_EXPORT = { async save(fmt, title, cols, rows, date, subtitle = "") {
  const E = await import("./export.js"); let buf, type;
  if (fmt === "csv") { buf = new TextEncoder().encode(E.toCsv(cols, rows)); type = "text/csv;charset=utf-8"; }
  else if (fmt === "xlsx") { buf = await E.toXlsx(cols, rows, title.slice(0, 31)); type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; }
  else { const W = await import("./wsr-export.js"); const deck = E.tableDeck({ title, subtitle, cols, rows });
    if (fmt === "pptx") { buf = await W.toPptx(deck); type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"; } else { buf = await W.toPdf(deck); type = "application/pdf"; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([buf], { type })); a.download = E.fileName(title, fmt, date); document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); return a.download; } };
window.__ITPH_DASH = dash; // dashboard rules (scripts/dash-ui.js)
window.__ITPH_WSR = { ...wsr, toPptx: (d) => import("./wsr-export.js").then((m) => m.toPptx(d)), toPdf: (d) => import("./wsr-export.js").then((m) => m.toPdf(d)) }; // weekly report (scripts/bpi-ui.js)
window.__ITPH_BINDER = binder; // project binder rules (scripts/bpi-ui.js)
window.__ITPH_BPI = bpi; // baselines, per-task PV/EV and program roll-up (scripts/bpi-ui.js)
window.__ITPH_WBS = wbs; // the prototype's schedule/Gantt/PSR patches call this (scripts/wbs-ui.js)

const APP = "ITPMD_Project_Hub_A00";
const M = {
  project: "ITPMD_Project_A00", activity: "ITPMD_Activity_A00", risk: "ITPMD_Risk_A00", cost: "ITPMD_Cost_Entry_A00",
  issue: "ITPMD_Issue_A00", action: "ITPMD_Action_Item_A00", psr: "ITPMD_Project_Status_Report_A00",
  holiday: "ITPMD_Holiday_Calendar_A00", settings: "ITPMD_Hub_Settings_A00", baseline: "ITPMD_Baseline_A00", program: "ITPMD_Program_A00", binder: "ITPMD_Binder_Item_A00", weekly: "ITPMD_Weekly_Report_A00", release: "ITPMD_Release_A00", template: "ITPMD_Template_A00",
};
// Kissflow role → prototype role code
const ROLE = { "Project Manager": "PM", "Team Member": "TEAM", "Department Head": "DH", "Project Sponsor": "PS", "PSC Member": "PSC", "Hub Administrator": "APPADMIN", Admin: "APPADMIN", TPMO: ["PSC", "APPADMIN"] };
const ROLE_LABEL = { PM: "Project Manager", TEAM: "Team Member", DH: "Department Head", PS: "Project Sponsor", PSC: "PSC Member", APPADMIN: "Hub Administrator" };
const LANDING = { PM: "projects", TEAM: "mytasks", DH: "approvals", PS: "approvals", PSC: "portfolio", APPADMIN: "admin" };
const ROLE_ID = { PM: "RoERtv3vbU79", DH: "RoERtv4trgpx", PS: "RoERtv5LLAbI" };
// Choices of the ITPMD Project select fields (Kissflow lists itpmd_business_unit / itpmd_portfolio_list /
// itpmd_project_status) — used by the prototype's new-project form.
window.__ITPH_OPTS = {
  bu: ["Retail Banking", "Corporate Banking", "Treasury", "Operations", "IT Shared Services", "Risk Management", "Compliance", "Lending", "Branch Banking", "IT Operations"],
  portfolio: ["Core Banking Modernization", "Digital Channels", "Regulatory and Compliance", "Infrastructure and Security", "Data and Analytics", "Core Banking", "Infrastructure", "Digital Workplace"],
  status: ["Planning", "Ongoing", "On Hold", "Completed", "Implemented", "Cancelled"],
};
// PSR workflow step names (live) → prototype status
const STEP = { draft: "Draft", dh: "Department Head Review", ps: "Sponsor Approval" };
// Existing BPI board columns, verified against the connected app. Status is changed via a board move,
// not by putting system status fields in a form update.
const BOARD_STATUS = {
  [M.issue]: { Open: "Status_l3jjzr", "In Progress": "Status_87cghd", Escalated: "Status_8fqyx7", Resolved: "Status_150cqqx", Closed: "Status_pcyljz" },
  [M.action]: { Open: "Status_16bbge2", "In Progress": "Status_41trys", Overdue: "Status_qmwfxe", Done: "Status_16b2yr2" }
};

const framed = (() => { try { return window.self !== window.top; } catch { return true; } })();
let kf, acc, api;
const q = `_application_id=${APP}`;
const num = (v) => (v == null || v === "" ? 0 : typeof v === "number" ? v : parseFloat(String(v).split(" ")[0]) || 0);
const php = (n) => `${Math.round(Number(n) || 0)} PHP`;
const d10 = (v) => (v ? String(v).slice(0, 10) : "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// run fn over items, `n` at a time; stops starting new ones after the first failure and rethrows it
async function pool(items, fn, n = 4) {
  let i = 0, failed = null;
  const run = async () => { while (!failed && i < items.length) { const x = items[i++]; try { await fn(x); } catch (e) { failed = { e }; } } };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, run));
  if (failed) throw failed.e;
}

function status(msg, isError) {
  const el = document.getElementById("app");
  if (el && !window.__ITPH_BOOTED) el.innerHTML = `<div style="font:500 14px/1.5 'IBM Plex Sans',system-ui;padding:40px;color:${isError ? "#B8321F" : "#6B6060"}">${msg}</div>`;
}
function toast(msg, bad) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = `position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9999;padding:9px 14px;border-radius:9px;font:500 12.5px 'IBM Plex Sans',system-ui;color:#fff;background:${bad ? "#B8321F" : "#4A0A0D"};box-shadow:0 8px 24px rgba(0,0,0,.18)`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

async function initSdk() {
  if (framed) {
    kf = await KFSDK.initialize();
    acc = kf.account?._id || kf.user?.AccountId;
    api = async (method, path, body) => {
      let out;
      try {
        out = await kf.api(path, { method, ...(body !== undefined ? { body } : {}) });
      } catch (e) {
        const err = new Error(`${method} ${path.split("?")[0].replace(/\/2\/[^/]+\//, "/2/…/")} → ${e?.message || e?.error || JSON.stringify(e)}`);
        err.cause = e; throw err;
      }
      if (out && typeof out.json === "function") out = await out.json(); // a raw Response
      if (typeof out === "string") { try { out = JSON.parse(out); } catch { /* leave as text */ } }
      // kf.api resolves (not rejects) on an HTTP error — the body is Kissflow's error JSON
      const e0 = Array.isArray(out) ? out[0] : out;
      if (e0 && typeof e0 === "object" && (e0.error_code || e0.ErrorJson || e0.status === "error")) {
        const err = new Error(`${method} ${path.split("?")[0].replace(/\/2\/[^/]+\//, "/2/…/")} → ${kfErr(out)}`); err.cause = out; throw err;
      }
      return out;
    };
  } else if (import.meta.env.DEV) {
    const { createPreviewSdk } = await import("./dev/preview-sdk.js");
    kf = await createPreviewSdk();
    acc = kf.account._id;
    api = (method, path, body) => kf.api(path, { method, body });
  } else {
    throw new Error("Open this app inside Kissflow.");
  }
  let agentStorage;
  try { agentStorage = localStorage; } catch {}
  window.__ITPH_AGENTS = projectAgents.createAgentConnections(kf, {
    account: acc, app: APP, storage: agentStorage,
    ids: { ava: import.meta.env.VITE_AVA_AGENT_ID, ari: import.meta.env.VITE_ARI_AGENT_ID, theo: import.meta.env.VITE_THEO_AGENT_ID }
  });
  window.__ITPH_AVA = window.__ITPH_AGENTS.ava;
}
const list = async (kind, id) => (await api("GET", `/${kind}/2/${acc}/${id}/list?page_number=1&page_size=1000&${q}`))?.Data || [];

/* ---------------- rows → state, shared by the first load and the dashboard refresh ---------------- */
const weeklyOf = (rows, pid) => rows.filter((r) => r.project?._id === pid).map((r) => ({ id: r._id, _kfId: r._id, weekOf: d10(r.week_of),
      text: Object.fromEntries(wsr.FIELDS.map((f) => [f.key, r[f.key] || ""])), status: (r.report_status && typeof r.report_status === "object" ? r.report_status.Name : r.report_status) || "Draft",
      kpi: r.schedule_kpi === undefined || r.schedule_kpi === null || r.schedule_kpi === "" ? null : num(r.schedule_kpi), kpiRag: r.kpi_rag || "G", overall: r.overall_rag || "G",
      actual: num(r.pct_actual), planned: num(r.pct_planned), snapshot: r.snapshot_json || "", projectStatus: r.project_status || "" })).sort((a, b) => a.weekOf.localeCompare(b.weekOf));
const releasesOf = (rows, pid) => rows.filter((r) => r.project?._id === pid).map((r) => ({ id: r._id, _kfId: r._id, name: r.release_name || "", mvp: !!r.is_mvp, planned: d10(r.planned_date), forecast: d10(r.forecast_date),
      implemented: d10(r.implemented_date), notes: r.notes || "" })).sort((a, b) => a.planned.localeCompare(b.planned));

/* ---------------- baselines: one Kissflow record per saved baseline ---------------- */
// Version 1 of a project that has no saved snapshot yet is "live": it stands for the baseline dates already on the
// activities, and is saved (with its rows) the first time the PM sets a new baseline.
function baselinesOf(p, rows, pm, u) {
  const mine = rows.filter((r) => r.project?._id === p._id).sort((a, b) => num(a.version) - num(b.version))
    .map((r) => ({ v: num(r.version), date: d10(r.set_date), by: r.set_by ? u(r.set_by, "PM") : pm, note: r.note || "", rows: bpi.parseSnapshot(r.rows_json), _kfId: r._id }));
  return mine.length ? mine : [{ v: 1, date: d10(p.project_start_date), by: pm, note: "Initial approved baseline", live: true }];
}
const binderRow = (p, x) => {
  const e = (v) => (v === "" || v === undefined ? null : v);
  const link = (x.type === "Risk" ? p.risks : x.type === "Issue" ? p.issues : []).find((r) => r.id === x.link);
  return { project: { _id: p._kfId }, item_type: x.type, linked_id: link?._kfId || null, item_no: e(x.no), description: e(x.desc), event_category: e(x.cat), additional_info: e(x.info), priority: e(x.pri),
    milestone: e(x.milestone), raised_by: kfUser(x.raisedBy) || null, date_assigned: e(x.dateAssigned), notification_source: e(x.source), planned_actions: e(x.planned), assigned_to: kfUser(x.assignee) || null,
    org_unit: e(x.org), target_date: e(x.target), date_executed: e(x.executed), action_item: e(x.action), action_item_status: e(x.actionStatus), action_result: e(x.result), overall_status: e(x.status),
    last_status_update: e(x.lastUpdate), cr_kind: e(x.crKind), cr_status: e(x.crStatus), cr_approval_date: e(x.approved) };
};
// a new record takes only fields that have a value
const binderWrite = (model, x, row) => formWrite(model, x, x._kfId ? row : Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null && v !== undefined)));
const wsrRow = (p, w) => ({ project: { _id: p._kfId }, week_of: w.weekOf, ...Object.fromEntries(wsr.FIELDS.map((f) => [f.key, w.text[f.key] || null])), report_status: w.status, schedule_kpi: w.kpi, kpi_rag: w.kpiRag,
  overall_rag: w.overall, project_status: w.projectStatus || null, pct_actual: Math.round(w.actual * 10) / 10, pct_planned: Math.round(w.planned * 10) / 10, snapshot_json: w.snapshot || null });
const releaseRow = (p, r) => ({ project: { _id: p._kfId }, release_name: r.name, is_mvp: !!r.mvp, planned_date: r.planned || null, forecast_date: r.forecast || null, implemented_date: r.implemented || null, notes: r.notes || null });
const baselineRow = (p, b) => ({ project: { _id: p._kfId }, version: b.v, set_date: b.date || null, ...(kfUser(b.by) ? { set_by: kfUser(b.by) } : {}), note: b.note || "", rows_json: JSON.stringify(b.rows || []) });

// PSRs: the ones I started (PM) + the ones waiting on me (DH / PS approval tasks) + the ones I acted on.
// The three sources are independent, so they are read together; the list omits the project link (and narrative),
// so each report's detail is read too — its progress gives the live step (status + the activity instance to
// approve / send back) and who acted when (history). Reports are read in parallel; the two calls per report
// stay in order (the detail path needs the activity instance from progress).
async function loadPsrItems() {
  const proc = framed ? kf.app?.getProcess?.(M.psr) : null;
  const sources = [
    api("GET", `/process/2/${acc}/${M.psr}/myitems?page_number=1&page_size=500&apply_preference=false&${q}`).then((r) => r?.Data).catch(() => []), // no PSR access for this role
    ...(proc ? ["getMyTasksItems", "getParticipatedItems"].map((fn) => proc[fn]({ pageSize: 500 }).then((r) => r?.Data).catch((e) => { console.warn(`[itph] PSR ${fn}`, e?.message || e); return []; })) : []),
  ];
  const psrById = new Map();
  for (const rows of await Promise.all(sources)) for (const x of rows || []) if (x && x._id && !psrById.has(x._id)) psrById.set(x._id, x);
  const psrItems = [...psrById.values()].filter((x) => x._status !== "Withdrawn");
  await Promise.all(psrItems.map(async (x) => {
    try {
      x._progress = await api("GET", `/process/2/${acc}/${M.psr}/${x._id}/progress?${q}`);
      const cur = (x._progress?.Steps || []).find((s) => s._status === "InProgress");
      if (cur?._activity_instance_id) x._activity_instance_id = cur._activity_instance_id;
      if (x._progress?._status) x._status = x._progress._status;
    } catch (e) { console.warn("[itph] PSR progress", x._id, e.message); }
    try {
      const d = await api("GET", `/process/2/${acc}/${M.psr}/${x._id}/${x._activity_instance_id}?${q}`);
      x.project = d.project; x.narrative_update = d.narrative_update; x.reporting_period_month = d.reporting_period_month || x.reporting_period_month;
    } catch (e) { console.warn("[itph] PSR detail", x._id, e.message); }
  }));
  return psrItems.filter((x) => x._status !== "Withdrawn");
}

// people who can be named Department Head / Project Sponsor on a new project (the app-role members).
// Needs role-read access; without it the choices fall back to the people already on projects.
async function loadRoleMembers() {
  const roleMembers = {};
  await Promise.all(Object.entries(ROLE_ID).map(async ([code, id]) => {
    try { roleMembers[code] = ((await api("GET", `/app_role/2/${acc}/${id}?${q}`))?.Members || []).filter((m) => !m.Kind || m.Kind === "User"); }
    catch { roleMembers[code] = []; }
  }));
  return roleMembers;
}

// Reports are the slowest thing to read (two calls each), so the hub opens without them and load() hands back a
// function that fills them in (and re-draws) once they are read. Set by load().
let attachPsrs = null;

/* ---------------- load: Kissflow → S ---------------- */
async function load() {
  const psrP = loadPsrItems().catch((e) => { console.warn("[itph] PSR load failed", e?.message || e); return []; });
  const [projects, activities, risks, costs, issues, actions, holidays, settings, baselineRows, programRows, binderRows, weeklyRows, releaseRows, templateRows, roleMembers] = await Promise.all([
    list("form", M.project), list("form", M.activity), list("form", M.risk), list("form", M.cost),
    list("case", M.issue), list("case", M.action), list("form", M.holiday).catch(() => []), list("form", M.settings).catch(() => []),
    list("form", M.baseline).catch(() => []), list("form", M.program).catch(() => []), list("form", M.binder).catch(() => []), list("form", M.weekly).catch(() => []), list("form", M.release).catch(() => []), list("form", M.template).catch(() => []),
    loadRoleMembers(),
  ]);

  // who am I, and which roles do I hold
  let myRoles = [];
  if (kf.preview) myRoles = ["PM", "TEAM", "DH", "PS", "PSC", "APPADMIN"]; // dev preview: every role, via the prototype's own switcher
  else {
    const idName = Object.fromEntries((schema.roles || []).map((r) => [r.id, r.name]));
    const nameOf = (r) => { const v = typeof r === "string" ? r : r?.Name || r?.name || r?._id || ""; return idName[v] || v; };
    myRoles = [...new Set((kf.user?.AppRoles || []).flatMap((r) => [].concat(ROLE[nameOf(r)] || ROLE[Object.keys(ROLE).find((k) => nameOf(r).toLowerCase() === k.toLowerCase())] || [])))];
    if (!myRoles.length) { try { const r = await kf.app.getRoles(); myRoles = [...new Set((r.currentRoles || []).flatMap((x) => [].concat(ROLE[x.Name] || [])))]; } catch { /* derive below */ } }
  }
  const meId = kf.user?._id;

  // users: one prototype user per (Kissflow user × role context), so the prototype's role logic
  // (pm / dh / ps / owners) and its user switcher keep working even when one person holds many roles.
  const users = new Map();
  const u = (kfUser, role) => {
    if (!kfUser || !kfUser._id) return "";
    const id = `${kfUser._id}:${role}`;
    if (!users.has(id)) users.set(id, { id, uid: (kfUser.Email || kfUser.Name || kfUser._id).split("@")[0], name: kfUser.Name || kfUser._id, role, unit: ROLE_LABEL[role] || "", status: "Active", last: "", kfUser: kfUser._id });
    return id;
  };
  const pmOf = {};
  const S = { holidays: [], users: [], projects: [], audit: [], notes: [], chat: {}, reads: {},
    config: { schedAmber: 1, schedRed: 10, costAmber: 100, costRed: 105, contAmber: 75, ldRate: 0.001, ldWarn: 8, ldCap: 10, escalateDays: 5, riskEscalate: "High", pwdMin: 12, pwdExpiry: 90, pwdHistory: 1, lockAttempts: 3, lockMinutes: 30, idleMinutes: 15, mfa: true, singleSession: true } };
  const hs = settings[0];
  if (hs) { S.config.escalateDays = num(hs.issue_aging_period_days) || 5; S.config._kfId = hs._id; }
  S.templates = templateRows.map((t) => ({ id: t._id, _kfId: t._id, type: (t.template_type && typeof t.template_type === "object" ? t.template_type.Name : t.template_type) || "", name: t.template_name || "", desc: t.description || "",
    isDefault: !!t.is_default, data: (() => { try { return JSON.parse(t.content_json || "{}"); } catch { return {}; } })() })).sort((a, b) => a.name.localeCompare(b.name));
  S.programs = programRows.map((g) => ({ id: g._id, name: g.program_name, segment: g.segment || "", desc: g.description || "", _kfId: g._id })).sort((a, b) => a.name.localeCompare(b.name));
  S.holidays = holidays.map((h) => ({ date: d10(h.holiday_date), name: h.holiday_name, coverage: h.coverage || "Nationwide", _kfId: h._id })).sort((a, b) => a.date.localeCompare(b.date));

  for (const p of projects) {
    const pm = u(p.RoERtv3vbU79, "PM"), dh = u(p.RoERtv4trgpx, "DH"), ps = u(p.RoERtv5LLAbI || p.RoERtv4trgpx, "PS");
    pmOf[p._id] = p.RoERtv3vbU79?._id;
    const owner = (kfUser) => (kfUser && kfUser._id === pmOf[p._id] ? pm : u(kfUser, "TEAM"));
    const pc = costs.filter((x) => x.project?._id === p._id);
    const position = pc.find((x) => x.cost_entry_title === "Cost position") || pc[0];
    const otherCosts = pc.filter((x) => x !== position);
    const changes = num(p.approved_changes_total), drawn = num(p.contingency_drawn);
    const acts = activities.filter((a) => a.project?._id === p._id)
      .sort((a, b) => String(a.baseline_start || a.planned_start).localeCompare(String(b.baseline_start || b.planned_start)) || String(a.wbs_code).localeCompare(String(b.wbs_code)))
      .map((a) => {
        const bStart = d10(a.baseline_start || a.planned_start), bFinish = d10(a.baseline_finish || a.planned_finish);
        return { id: a.wbs_code || a._id, name: a.activity_name, dur: 0, preds: wbs.parsePreds(a.predecessor_codes).ids, lags: wbs.parsePreds(a.predecessor_codes).lags,
          pct: num(a.percent_complete), owner: owner(a.responsible_person), ms: !!a.is_milestone, price: 0, manualFinish: "",
          bStart, bFinish, pStart: d10(a.planned_start) || bStart, pFinish: d10(a.planned_finish) || bFinish, aStart: d10(a.actual_start), aFinish: d10(a.actual_finish), _kfId: a._id,
          type: wbs.fromKfType(a.item_type, !!a.is_milestone), parent: a.parent_code || null,
          order: a.sort_order === undefined || a.sort_order === null || a.sort_order === "" ? null : num(a.sort_order),
          _needsOrder: a.sort_order === undefined || a.sort_order === null || a.sort_order === "",
          accepted: !!a.deliverable_accepted, acceptedDate: d10(a.accepted_date), cost: num(a.planned_cost), actual: num(a.actual_cost) };
      });
    const tree = wbs.splitRows(acts);
    if (tree.warnings.length) console.warn(`[itph] WBS ${p.project_code || p._id}:`, tree.warnings.join("; "));
    const pIssues = issues.filter((i) => i.project?._id === p._id).map((i) => {
      const st = i._status_name || "Open";
      return { id: i._id, title: i.issue_title, cat: i.issue_category || "", pri: i.priority || "Medium", owner: owner(i.issue_owner), raised: d10(i._created_at), target: d10(i.target_resolution_date),
        status: /resolved|closed/i.test(st) ? "Resolved" : /progress/i.test(st) ? "In progress" : "Open", escalated: /escalat/i.test(st), _kfId: i._id, _kfStatusName: st,
        actions: actions.filter((x) => x.related_issue?._id === i._id).map((x) => ({ id: x._id, text: x.action_description, who: owner(x.assignee), due: d10(x.due_date), status: /done/i.test(x._status_name || "") ? "Done" : "Open", _kfId: x._id, _kfStatusName: x._status_name || "Open" })) };
    });
    S.projects.push({
      id: p._id, code: p.project_code || p._id, name: p.project_name, bu: p.business_unit || "", portfolio: p.portfolio || "", pm, dh, ps, psRequired: !!p.ps_approval_required,
      vendor: p.vendor || "", contract: num(p.contract_total), noa: d10(p.noa_issued), po: d10(p.po_issued), poNo: p.po_no || "", ntp: d10(p.ntp_issued), expiry: d10(p.contract_expiry), start: d10(p.project_start_date),
      fin: { budget: num(p.approved_budget), contingency: num(p.contingency_fund),
        changes: changes ? [{ id: "BC", amt: changes, date: "", reason: "Approved budget changes" }] : [],
        draws: drawn ? [{ id: "CD", amt: drawn, date: "", reason: "Contingency drawn to date" }] : [],
        actual: pc.reduce((s, x) => s + num(x.actual_amount), 0), committed: pc.reduce((s, x) => s + num(x.committed_amount), 0), eac: pc.reduce((s, x) => s + num(x.forecast_amount), 0), invoices: invoicesOf(position), _costKfId: position?._id,
        _otherCosts: { actual: otherCosts.reduce((s, x) => s + num(x.actual_amount), 0), committed: otherCosts.reduce((s, x) => s + num(x.committed_amount), 0), eac: otherCosts.reduce((s, x) => s + num(x.forecast_amount), 0) } },
      // display id in the prototype's format (R-<project no.>-<nn>, oldest first); the Kissflow Risk form has no code field
      risks: risks.filter((r) => r.project?._id === p._id).sort((a, b) => String(a._created_at || "").localeCompare(String(b._created_at || ""))).map((r, n) => ({ id: `R-${String(p.project_code || p._id).slice(-3)}-${String(n + 1).padStart(2, "0")}`, title: r.risk_title, cat: r.risk_category || "", p: num(r.probability), i: num(r.impact), owner: owner(r.risk_owner), resp: r.response_strategy || "Mitigate",
        mit: r.mitigation_actions || "", rp: num(r.residual_probability), ri: num(r.residual_impact), status: r.status || "Open", raised: d10(r._created_at), _kfId: r._id })),
      issues: pIssues, decisions: [], activities: tree.activities, wbs: tree.wbs,
      status: (p.status && typeof p.status === "object" ? p.status.Name : p.status) || "", baselines: baselinesOf(p, baselineRows, pm, u), activeBaseline: num(p.active_baseline) || 0, program: p.program?._id || "", schedHistory: [],
      psrs: [],
      _kfId: p._id,
    });
    // project binder: dependencies / defects / change requests are whole records; a risk or issue has a linked entry
    {
      const sp = S.projects.at(-1); const sv = (v) => (v && typeof v === "object" ? v.Name || v._id || "" : v || "");
      const fromRow = (r) => ({ id: r._id, _kfId: r._id, type: sv(r.item_type), no: r.item_no || "", desc: r.description || "", cat: sv(r.event_category), info: r.additional_info || "", pri: sv(r.priority),
        milestone: r.milestone || "", raisedBy: owner(r.raised_by), dateAssigned: d10(r.date_assigned), source: r.notification_source || "", planned: r.planned_actions || "", assignee: owner(r.assigned_to),
        org: r.org_unit || "", target: d10(r.target_date), executed: d10(r.date_executed), action: r.action_item || "", actionStatus: sv(r.action_item_status), result: r.action_result || "",
        status: sv(r.overall_status) || "Open", lastUpdate: d10(r.last_status_update), crKind: sv(r.cr_kind), crStatus: sv(r.cr_status), approved: d10(r.cr_approval_date) });
      const mine = binderRows.filter((r) => r.project?._id === p._id).map(fromRow);
      const byKf = new Map([...sp.risks, ...sp.issues].map((x) => [x._kfId, x.id]));
      sp.binder = mine.filter((x) => x.type !== "Risk" && x.type !== "Issue");
      sp.ext = mine.filter((x) => x.type === "Risk" || x.type === "Issue").map((x) => ({ ...x, link: byKf.get(binderRows.find((r) => r._id === x.id)?.linked_id) || "" })).filter((x) => x.link);
    }
    // weekly status reports (one per project per week)
    S.projects.at(-1).wsr = weeklyOf(weeklyRows, p._id);
    S.projects.at(-1).releases = releasesOf(releaseRows, p._id);
    S.chat[p._id] = [];
  }
  // everyone who holds the Department Head / Project Sponsor role (new-project choices)
  for (const [code, members] of Object.entries(roleMembers)) for (const m of members) u(m, code);
  // my own role users (so every role I hold is reachable in the switcher, even with no data yet)
  const me = { _id: meId, Name: kf.user?.Name, Email: kf.user?.Email };
  const heldRoles = myRoles.length ? myRoles : [...new Set([...users.values()].filter((x) => x.kfUser === meId).map((x) => x.role))];
  if (!heldRoles.length) throw new Error("Your account has no ITPMD Project Hub role, so no project data can be shown. Ask the Hub Administrator to give you a role.");
  for (const r of heldRoles) u(me, r);
  S.users = [...users.values()].map(({ kfUser, ...x }) => ({ ...x, _kfUser: kfUser }));
  // The prototype's own chatThread() hardcodes 'U05'/'U06' (its sample PSC Member and QA) as fixed
  // discussion participants on every project. Neither role has a real assignable person in MVP scope
  // (QA has no MVP journey; kf-ba D3/D4) — these are inert role placeholders, not real people, so
  // user('U05')/('U06') resolve with an .id and .status instead of crashing chatThread's initialsOf().
  // They never appear in the switch-user menu (excluded from S.__myUserIds below).
  if (!S.users.some((u) => u.id === "U05")) S.users.push({ id: "U05", uid: "psc-member", name: "PSC Member", role: "PSC", unit: "Project Steering Committee", status: "Active" });
  if (!S.users.some((u) => u.id === "U06")) S.users.push({ id: "U06", uid: "qa", name: "QA", role: "QA", unit: "ITPMD – Quality Assurance", status: "Active" });
  // ACCESS LIMIT (BR-23 / ITPH-00225): keep only the projects this person may see through a role they hold.
  // PM: managed by me · DH: I am the named DH · PS: I am the sponsor · Team: I own an activity/issue/action · PSC: all.
  // (A UI-level limit: Kissflow's roles grant whole-flow access, not per-record — see decisions D29.)
  const isMe = (id) => !!id && String(id).startsWith(meId + ":");
  const held = new Set(heldRoles);
  const canSee = (p) => held.has("PSC") || (held.has("PM") && isMe(p.pm)) || (held.has("DH") && isMe(p.dh)) || (held.has("PS") && isMe(p.ps)) ||
    (held.has("TEAM") && (p.activities.some((a) => isMe(a.owner)) || p.issues.some((i) => isMe(i.owner) || (i.actions || []).some((a) => isMe(a.who)))));
  S.projects = S.projects.filter(canSee);
  for (const x of S.users) { S.reads[x.id] = {}; for (const p of S.projects) S.reads[x.id][p.id] = 0; }

  // durations in working days (the prototype's own engine recomputes forecasts at boot)
  const HOL = new Set(S.holidays.map((h) => h.date));
  const isWork = (s) => { const w = new Date(s + "T00:00:00Z").getUTCDay(); return w !== 0 && w !== 6 && !HOL.has(s); };
  const wd = (a, b) => { if (!a || !b) return 1; let n = 0; const d = new Date(a + "T00:00:00Z"); const e = new Date(b + "T00:00:00Z"); while (d <= e) { if (isWork(d.toISOString().slice(0, 10))) n++; d.setUTCDate(d.getUTCDate() + 1); } return Math.max(1, n); };
  // duration = the CURRENT plan (planned start → planned finish), so a Gantt stretch survives a reload;
  // the baseline dates stay as they were for variance.
  for (const p of S.projects) for (const a of p.activities) a.dur = a.ms ? 1 : wd(a.pStart || a.bStart, a.pFinish || a.bFinish);

  // initial view: the landing of my primary role
  const mine = S.users.filter((x) => x._kfUser === meId);
  const primary = mine.find((x) => x.role === heldRoles[0]) || mine[0] || S.users[0];
  S.__ui = { me: primary?.id, sel: S.projects[0]?.id || null, view: LANDING[primary?.role] || "projects" };
  S.__myUserIds = mine.map((x) => x.id);
  // fill the reports in once they are read: attach them to the projects this person sees and add the people who
  // acted on them
  attachPsrs = async () => {
    const psrItems = await psrP;
    const seen = new Set(S.users.map((x) => x.id));
    for (const p of S.projects) {
      const loaded = psrItems.filter((x) => x.project?._id === p._kfId).map((x) => {
        const r = psrFromKf(x, p.pm, u);
        // Reports can arrive after the initial render, so prepare their display snapshot here too.
        r.snap = window.__ITPH?.makePSR?.(p, r.period, true)?.snap || null;
        return r;
      });
      const ids = new Set(loaded.map((r) => r._kfId));
      p.psrs = [...loaded, ...(p.psrs || []).filter((r) => !r._kfId || !ids.has(r._kfId))]; // keep a report started before this arrived
      p._psrLoaded = loaded;
    }
    for (const x of users.values()) if (!seen.has(x.id)) {
      const { kfUser, ...r } = x; S.users.push({ ...r, _kfUser: kfUser });
      S.reads[r.id] = Object.fromEntries(S.projects.map((p) => [p.id, 0]));
    }
  };
  return S;
}

// Kissflow PSR → prototype PSR. Status and history come from the item's workflow progress:
//   Draft step → Draft (or Returned, once an approver has sent it back) · Department Head Review → Submitted
//   · Sponsor Approval → For PS Approval · Completed → Approved.
function psrFromKf(x, pm, u) {
  const d = d10(x.reporting_period_month) || new Date().toISOString().slice(0, 10);
  const steps = x._progress?.Steps || [];
  const cur = steps.find((s) => s._status === "InProgress");
  const code = (name) => (name === STEP.dh ? "DH" : name === STEP.ps ? "PS" : "PM");
  const returned = (s) => /sent|back|reject/i.test(s._status || "");
  const acted = steps.filter((s) => s.ActedAt && s.ActedBy?.length).sort((a, b) => String(a.ActedAt).localeCompare(String(b.ActedAt)));
  const history = []; let submits = 0;
  for (const s of acted) {
    const c = code(s.Name), who = c === "PM" ? pm : u(s.ActedBy[0], c);
    const at = String(s.ActedAt).replace("T", " ").replace("Z", "").slice(0, 19);
    if (c === "PM") history.push({ at, who, action: submits++ ? "Resubmitted" : "Submitted", comment: s._note || "" });
    else if (returned(s)) history.push({ at, who, action: `Returned (${c})`, comment: s._note || "" });
    else if (/completed/i.test(s._status || "")) history.push({ at, who, action: `Approved (${c})`, comment: s._note || "" });
  }
  const st = x._status === "Completed" ? "Approved" : x._status === "Rejected" ? "Returned"
    : cur?.Name === STEP.ps ? "For PS Approval" : cur?.Name === STEP.dh ? "Submitted"
    : cur ? (history.some((h) => h.action.startsWith("Returned")) ? "Returned" : "Draft")
    : /draft/i.test(x._current_step || "") || x._status === "Draft" ? "Draft" : /sponsor/i.test(x._current_step || "") ? "For PS Approval" : "Submitted";
  let narrative = { acc: "", next: "", issues: "" };
  try { const n = JSON.parse(x.narrative_update || "{}"); narrative = { ...narrative, ...n }; } catch { narrative.acc = x.narrative_update || ""; }
  return { id: x._id, period: { y: +d.slice(0, 4), m: +d.slice(5, 7) }, status: st, created: d10(x._created_at), createdBy: pm, historic: false, snap: null, narrative, attachments: [], history, _kfId: x._id, _aiid: x._activity_instance_id };
}

// Invoices (ITPH-0071) have no Kissflow form of their own (the designed child table can't be written through the
// API), so the UI keeps them as JSON in the project's "Cost position" Cost Entry description.
function invoicesOf(cost) {
  try { const x = JSON.parse(cost?.cost_description || "{}"); return Array.isArray(x.invoices) ? x.invoices : []; } catch { return []; }
}

/* ---------------- save: diff S → Kissflow ---------------- */
// the prototype keeps the selected template id in its UI state; a new template gets its Kissflow id on first save
const ui_sel_fix = (from, to) => { window.__ITPH_TPL_REMAP && window.__ITPH_TPL_REMAP(from, to); };
let last = null; let chain = Promise.resolve(); let userMap = {};
// per model+project: the record ids that exist in Kissflow (deletes are worked out from these, see sync-plan.js)
const knownIds = new Map();
const DISCUSSIONS_ENABLED = false;
let disc = null; // Project Discussions (null if its forms can't be read for this user)
const clone = (o) => JSON.parse(JSON.stringify(o));
const kfUser = (protoUserId) => { const x = userMap[protoUserId]; return x ? { _id: x } : undefined; };

// working-day arithmetic for the planned finish (weekends + the holiday calendar skipped)
let HOLS = new Set();
function addWorkDays(start, n) {
  const d = new Date(start + "T00:00:00Z"); const ok = () => { const w = d.getUTCDay(); return w !== 0 && w !== 6 && !HOLS.has(d.toISOString().slice(0, 10)); };
  while (!ok()) d.setUTCDate(d.getUTCDate() + 1);
  for (let i = 0; i < n; i++) { d.setUTCDate(d.getUTCDate() + 1); while (!ok()) d.setUTCDate(d.getUTCDate() + 1); }
  return d.toISOString().slice(0, 10);
}
// planned finish carries the activity's current duration (what a Gantt stretch changes): a finish set by hand
// on a started activity, else planned start + duration.
function plannedFinish(a) {
  const start = a.pStart || a.bStart;
  if (a.manualFinish && !a.aFinish) return a.manualFinish;
  if (start && a.dur && !a.ms) return addWorkDays(start, a.dur - 1);
  return a.pFinish || a.bFinish;
}
function actRow(p, a) {
  const o = { activity_name: a.name, project: { _id: p._kfId }, wbs_code: a.id, is_milestone: !!a.ms, percent_complete: a.pct,
    planned_start: a.pStart || a.bStart, planned_finish: plannedFinish(a), baseline_start: a.bStart, baseline_finish: a.bFinish,
    forecast_start: a.fStart || null, forecast_finish: (a.manualFinish || a.fFinish) || null, actual_start: a.aStart || null, actual_finish: a.aFinish || null, predecessor_codes: wbs.formatPreds(a.preds, a.lags),
    ...wbsFields(a), is_summary: false };
  const who = kfUser(a.owner); if (who) o.responsible_person = who;
  return o;
}
// WBS position of any row (work item or summary)
function wbsFields(r) {
  return { item_type: wbs.toKfType(wbs.typeOf(r)), parent_code: r.parent || "", deliverable_accepted: !!r.accepted, accepted_date: r.acceptedDate || null, planned_cost: php(r.cost || 0), actual_cost: php(r.actual || 0),
    ...(r.order !== undefined && r.order !== null ? { sort_order: r.order } : {}) };
}
// summary rows (phases, deliverables/tasks with children) carry their rolled-up dates and % so Kissflow reports show real figures
function sumRow(p, s) {
  return { activity_name: s.name, project: { _id: p._kfId }, wbs_code: s.id, is_milestone: false, is_summary: true, percent_complete: Math.round(s.pct || 0),
    planned_start: s.fStart || null, planned_finish: s.fFinish || null, baseline_start: s.bStart || null, baseline_finish: s.bFinish || null,
    forecast_start: s.fStart || null, forecast_finish: s.fFinish || null, predecessor_codes: "", ...wbsFields(s) };
}
const riskRow = (p, r) => ({ risk_title: r.title, project: { _id: p._kfId }, risk_category: r.cat, probability: r.p, impact: r.i, mitigation_actions: r.mit, response_strategy: r.resp, residual_probability: r.rp, residual_impact: r.ri, status: r.status, ...(kfUser(r.owner) ? { risk_owner: kfUser(r.owner) } : {}) });
function issueBoardStatus(i) {
  if (i.status === "Resolved") return i._kfStatusName === "Closed" ? "Closed" : "Resolved";
  if (i.escalated && i._kfStatusName !== "Escalated") return "Escalated";
  if (i.status === "In progress") return "In Progress";
  return i.escalated ? "Escalated" : "Open";
}
const issueRow = (p, i) => ({ _hubStatus: issueBoardStatus(i), issue_title: i.title, project: { _id: p._kfId }, issue_category: i.cat, priority: i.pri, target_resolution_date: i.target || null, ...(kfUser(i.owner) ? { issue_owner: kfUser(i.owner) } : {}) });
const actionRow = (p, i, a) => ({ _hubStatus: a.status === "Done" ? "Done" : a._kfStatusName === "Done" ? "Open" : a._kfStatusName || "Open", action_description: a.text, project: { _id: p._kfId }, related_issue: { _id: i._kfId }, due_date: a.due || null, ...(kfUser(a.who) ? { assignee: kfUser(a.who) } : {}) });
const projRow = (p) => ({ project_name: p.name, business_unit: p.bu, portfolio: p.portfolio, ps_approval_required: !!p.psRequired, vendor: p.vendor, contract_total: php(p.contract),
  noa_issued: p.noa || null, po_issued: p.po || null, po_no: p.poNo, ntp_issued: p.ntp || null, contract_expiry: p.expiry || null, project_start_date: p.start || null,
  approved_budget: php(p.fin.budget), contingency_fund: php(p.fin.contingency), approved_changes_total: php(p.fin.changes.reduce((s, x) => s + x.amt, 0)), contingency_drawn: php(p.fin.draws.reduce((s, x) => s + x.amt, 0)),
  ...(p.status ? { status: p.status } : {}), active_baseline: p.activeBaseline || 0, program: p.program ? { _id: p.program } : null });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// readable reason from a Kissflow error body (or whatever came back instead of the expected record)
const kfErr = (r) => { const x = Array.isArray(r) ? r[0] : r; return x?.en_message || x?.message || x?.ErrorJson?.en_message || JSON.stringify(r ?? null).slice(0, 300); };

// Create one dataform record, returning its _id. Inside Kissflow this goes through the SDK's createItem + submitItem —
// kf.api's POST of an array body (the REST /batch create) is answered 500 there. The dev preview uses REST /batch.
// A create can succeed remotely even when its response is lost. Never replay an unconfirmed create.
async function createOnce(fn) {
  try { return await fn(); }
  catch (error) {
    const e = error instanceof Error ? error : new Error(String(error));
    e.uncertainCreate = true;
    throw e;
  }
}
async function formCreate(model, row) { return createOnce(() => createForm(model, row)); }
async function createForm(model, row) {
  const form = sdkFlow("form", model);
  if (form?.createItem) {
    let r;
    try { r = await form.createItem({ data: row }); }
    catch (e) { throw new Error(`create ${model} → ${e?.message || kfErr(e)}`); }
    const x = Array.isArray(r) ? r[0] : r;
    const xid = typeof x === "string" ? x : x?._id;
    if (!xid) throw new Error(`create ${model} → ${kfErr(r)}`);
    if (realId(x)) return realId(x); // already a real record
    // createItem only opens a DRAFT (its id is "draft_<user>", invisible in lists); submitItem saves it as a
    // real record and answers with the record's real _id.
    let sub;
    try { sub = await form.submitItem({ itemId: xid, data: row }); }
    catch (e) { throw new Error(`save ${model} → ${e?.message || kfErr(e)}`); }
    const y = Array.isArray(sub) ? sub[0] : sub;
    let id = realId(y);
    if (!id) {
      // no id in the answer — find the record just saved by its text values (newest match)
      const txt = Object.entries(row).filter(([, v]) => typeof v === "string" && !/ PHP$/.test(v) && !/^\d{4}-\d{2}-\d{2}/.test(v));
      const items = (await api("GET", `/form/2/${acc}/${model}/list?page_number=1&page_size=1000&apply_preference=false&${q}`))?.Data || [];
      const hit = items.filter((it) => txt.every(([k, v]) => it[k] === v)).sort((a, b) => String(b._created_at || "").localeCompare(String(a._created_at || "")))[0];
      id = hit?._id;
    }
    if (!id) throw new Error(`save ${model} → Kissflow kept it as a draft (${kfErr(sub)})`);
    return id;
  }
  const r = await api("POST", `/form/2/${acc}/${model}/batch?${q}`, [{ _is_created: true, ...row }]);
  if (!r?.[0]?._id) throw new Error(`create ${model} → ${kfErr(r)}`);
  return r[0]._id;
}
async function formWrite(model, obj, row) {
  if (obj._kfId) {
    // inside Kissflow, updates go through the SDK too (kf.api's POST body reaches Kissflow as a list → 403 "Invalid payload data type")
    const form = framed ? kf.app?.getDataform?.(model) : null;
    if (form?.updateItem) {
      try { await form.updateItem({ itemId: obj._kfId, data: row }); }
      catch (e) { throw new Error(`update ${model} → ${e?.message || kfErr(e)}`); }
    } else await api("POST", `/form/2/${acc}/${model}/${obj._kfId}?${q}`, row);
    return;
  }
  obj._kfId = await formCreate(model, row);
}
// Inside Kissflow every write goes through the SDK's flow helpers: kf.api drops or mangles POST bodies there
// (a create arrives with all fields empty, an update as a list). The dev preview keeps plain REST.
const sdkFlow = (kind, id) => (!framed ? null : kind === "case" ? kf.app?.getBoard?.(id) : kind === "process" ? kf.app?.getProcess?.(id) : kf.app?.getDataform?.(id));
async function sdkDo(what, fn) {
  let r;
  try { r = await fn(); } catch (e) { throw new Error(`${what} → ${e?.message || kfErr(e)}`); }
  const x = Array.isArray(r) ? r[0] : r;
  if (x && typeof x === "object" && (x.error_code || x.ErrorJson || x.status === "error")) throw new Error(`${what} → ${kfErr(x)}`);
  return x;
}
// the SDK answers a create with the record, or (boards) just its id as a string, e.g. "ITP-0010"
const realId = (x) => { const id = typeof x === "string" ? x : x?._id || x?.Data?._id || x?.data?._id; return id && !String(id).startsWith("draft_") ? id : null; };
// last resort when a save answers without the new record's id: the newest record whose text values match
async function findSaved(kind, model, row) {
  const txt = Object.entries(row).filter(([, v]) => typeof v === "string" && !/ PHP$/.test(v) && !/^\d{4}-\d{2}-\d{2}/.test(v));
  const items = (await api("GET", `/${kind}/2/${acc}/${model}/list?page_number=1&page_size=1000&apply_preference=false&${q}`))?.Data || [];
  return items.filter((it) => txt.every(([k, v]) => it[k] === v)).sort((a, b) => String(b._created_at || "").localeCompare(String(a._created_at || "")))[0]?._id || null;
}
async function caseWrite(model, obj, payload) {
  const { _hubStatus: target, ...row } = payload;
  const board = sdkFlow("case", model);
  if (board) {
    if (obj._kfId) await sdkDo(`update ${model}`, () => board.updateItem({ instanceId: obj._kfId, data: row }));
    else {
      obj._kfId = await createOnce(async () => {
        const x = await sdkDo(`create ${model}`, () => board.createItem({ data: row }));
        let id = realId(x);
        if (!id && x?._id) { const y = await sdkDo(`save ${model}`, () => board.submitItem({ instanceId: x._id })); id = realId(y) || (await findSaved("case", model, row)); }
        if (!id) throw new Error(`create ${model} → Kissflow returned no record (${kfErr(x)})`);
        return id;
      });
      obj._kfStatusName = "Open";
    }
  } else if (obj._kfId) await api("POST", `/case/2/${acc}/${model}/${obj._kfId}?${q}`, row);
  else {
    obj._kfId = await createOnce(async () => {
      const r = await api("POST", `/case/2/${acc}/${model}?${q}`, row);
      const id = realId(r);
      if (!id) throw new Error(`create ${model} → Kissflow returned no record (${kfErr(r)})`);
      return id;
    });
    obj._kfStatusName = "Open";
  }
  if (target && target !== obj._kfStatusName) {
    const id = BOARD_STATUS[model]?.[target];
    if (!id) throw new Error(`No board column configured for ${model}: ${target}`);
    await api("PUT", `/case/2/${acc}/${model}/${obj._kfId}/${id}/move?${q}`);
    const unchanged = model !== M.issue || issueBoardStatus(obj) === target;
    obj._kfStatusName = target;
    if (model === M.issue && unchanged) {
      obj.status = target === "Resolved" || target === "Closed" ? "Resolved" : target === "In Progress" ? "In progress" : "Open";
      obj.escalated = target === "Escalated";
    }
    return true;
  }
}

// The Kissflow PSR keeps a snapshot of the project's figures (BR-13). The "autofill" lookup can't be used
// (Kissflow refuses to set the project when it's on), so the figures are written here, from the same
// health/finance engine the prototype UI shows — Sponsor routing (BR-10) reads Overall_Health from them.
const RAG = { G: "Green", A: "Amber", R: "Red" };
function psrSnapshot(p) {
  const H = window.__ITPH; if (!H) return {};
  const h = H.health(p), f = h.f;
  const u = (id) => kfUser(id);
  return { ...(u(p.pm) ? { RoERtv3vbU79: u(p.pm) } : {}), ...(u(p.dh) ? { RoERtv4trgpx: u(p.dh) } : {}), ...(u(p.ps) ? { RoERtv5LLAbI: u(p.ps) } : {}),
    ps_approval_required: !!p.psRequired, overall_health: RAG[h.overall], schedule_health: RAG[h.sched], cost_health: RAG[h.cost], risk_health: RAG[h.risk], issue_health: RAG[h.issue],
    weighted_percent_complete: Math.round(h.sc.complete * 10) / 10, current_approved_budget: php(f.current), total_actual_cost: php(p.fin.actual), total_committed_cost: php(p.fin.committed),
    total_forecast_cost: php(p.fin.eac), contingency_remaining: php(f.remainingCont) };
}

async function sync(S) {
  HOLS = new Set((S.holidays || []).map((h) => h.date));
  // discussions first and on their own: disc.sync never throws, so a hub save error can't hold chat back (or vice versa)
  const discWrites = disc ? await disc.sync(S) : 0;
  const prev = last; const byId = (arr) => Object.fromEntries((arr || []).filter((x) => x._kfId).map((x) => [x._kfId, x]));
  const prevP = byId(prev?.projects);
  let writes = 0, rerender = false;
  // programs (admin)
  const opg = byId(prev?.programs);
  for (const g of S.programs || []) { const row = { program_name: g.name, segment: g.segment, description: g.desc }; if (!g._kfId || !opg[g._kfId] || !same(row, { program_name: opg[g._kfId].name, segment: opg[g._kfId].segment, description: opg[g._kfId].desc })) { const tmp = g.id; await formWrite(M.program, g, row); if (tmp !== g._kfId) { g.id = g._kfId; for (const q2 of S.projects) if (q2.program === tmp) q2.program = g._kfId; } writes++; } }
  const keepG = new Set((S.programs || []).map((g) => g._kfId));
  for (const g of prev?.programs || []) if (g._kfId && !keepG.has(g._kfId)) { if (await deleteIfPresent(() => api("DELETE", `/form/2/${acc}/${M.program}/${g._kfId}?${q}`))) writes++; }
  for (const p of S.projects) {
    const pp = prevP[p._kfId];
    if (!p._kfId) {
      // new project from the prototype's form. The sponsor is written only when one was chosen (the UI falls
      // back to the DH as p.ps, the same way load() does for projects without a sponsor).
      const psSet = p._psSet !== false && p.ps && p.ps !== p.dh;
      // only fields with a value (a new record needs no nulls)
      const row = Object.fromEntries(Object.entries({ ...projRow(p), status: p.status || "Ongoing", contract_value: php(p.contract) })
        .filter(([, v]) => v !== null && v !== undefined && v !== ""));
      p._kfId = await formCreate(M.project, { ...row,
        ...(kfUser(p.pm) ? { RoERtv3vbU79: kfUser(p.pm) } : {}), ...(kfUser(p.dh) ? { RoERtv4trgpx: kfUser(p.dh) } : {}), ...(psSet && kfUser(p.ps) ? { RoERtv5LLAbI: kfUser(p.ps) } : {}) });
      writes++;
      try { const d = await api("GET", `/form/2/${acc}/${M.project}/${p._kfId}?${q}`); if (d?.project_code) p.code = d.project_code; } catch (e) { console.warn("[itph] project code", e.message); }
      if (p.code === "Saving…") p.code = p._kfId;
      rerender = true;
    }
    else if (!pp || !same(projRow(p), projRow(pp))) { await formWrite(M.project, p, projRow(p)); writes++; }
    // cost position
    const others = p.fin._otherCosts || {};
    const fr = { actual_amount: php(p.fin.actual - (others.actual || 0)), committed_amount: php(p.fin.committed - (others.committed || 0)), forecast_amount: php(p.fin.eac - (others.eac || 0)), cost_description: JSON.stringify({ invoices: p.fin.invoices || [] }) };
    if (!pp || !same([pp.fin.actual, pp.fin.committed, pp.fin.eac, pp.fin.invoices], [p.fin.actual, p.fin.committed, p.fin.eac, p.fin.invoices])) {
      const obj = { _kfId: p.fin._costKfId };
      await formWrite(M.cost, obj, { cost_entry_title: "Cost position", project: { _id: p._kfId }, entry_date: new Date().toISOString().slice(0, 10), ...fr });
      p.fin._costKfId = obj._kfId; writes++;
    }
    const diffList = async (cur, old, model, rowFn, write, delKind, scope = "") => {
      const key = `${model}:${p._kfId}:${scope}`;
      if (!knownIds.has(key)) knownIds.set(key, new Set((old || []).map((x) => x._kfId).filter(Boolean)));
      const known = knownIds.get(key);
      const plan = planRows(cur, old, rowFn, known);
      // updates and deletes of one list don't depend on each other, so they go out a few at a time (lists stay in
      // order: a binder entry needs its risk's Kissflow id). Creates stay one by one: createItem opens the user's
      // single draft for the model, so two at once would share it.
      const put = async (x) => { if (await write(model, x, rowFn(x))) rerender = true; x._needsOrder = false; if (x._kfId) known.add(x._kfId); writes++; };
      await pool(plan.write.filter((x) => x._kfId), put);
      for (const x of plan.write.filter((x) => !x._kfId)) await put(x);
      await pool(plan.del, async (x) => { if (await deleteIfPresent(() => api("DELETE", `/${delKind}/2/${acc}/${model}/${x._kfId}?${q}`))) writes++; known.delete(x._kfId); });
    };
    // one diff over work items AND summary rows: a row that turns into a summary moves between the two lists
    // and must be updated, not deleted and re-created
    await diffList([...p.activities, ...(p.wbs || [])], [...(pp?.activities || []), ...(pp?.wbs || [])], M.activity,
      (x) => (x.sum ? sumRow(p, x) : actRow(p, x)), formWrite, "form");
    await diffList(p.risks, pp?.risks, M.risk, (r) => riskRow(p, r), formWrite, "form");
    await diffList(p.issues, pp?.issues, M.issue, (i) => issueRow(p, i), caseWrite, "case");
    const oldIssues = byId(pp?.issues);
    for (const i of p.issues) await diffList(i.actions || [], oldIssues[i._kfId]?.actions, M.action, (a) => actionRow(p, i, a), caseWrite, "case", i._kfId);
    // project binder (after risks/issues, so a linked entry can point at their Kissflow ids)
    await diffList(p.binder || [], pp?.binder, M.binder, (x) => binderRow(p, x), binderWrite, "form", "bnd");
    await diffList(p.releases || [], pp?.releases, M.release, (r) => releaseRow(p, r), binderWrite, "form", "rel");
    await diffList(p.wsr || [], pp?.wsr, M.weekly, (w) => wsrRow(p, w), binderWrite, "form", "wsr");
    await diffList((p.ext || []).filter((x) => p.risks.concat(p.issues).some((r) => r.id === x.link)), pp?.ext, M.binder, (x) => binderRow(p, x), binderWrite, "form", "ext");
    // PSRs: create new ones as Kissflow PSR items; push narrative; submit when the prototype submits;
    // approve / send back when a Department Head or Project Sponsor decides in the prototype.
    const oldPsr = byId(pp?.psrs);
    for (const r of p.psrs || []) {
      const row = { project: { _id: p._kfId }, reporting_period_month: `${r.period.y}-${String(r.period.m).padStart(2, "0")}-01`, narrative_update: JSON.stringify(r.narrative || {}), ...(r._kfId ? {} : psrSnapshot(p)) };
      if (!r._kfId) {
        const proc = sdkFlow("process", M.psr);
        const x = await createOnce(async () => {
          const saved = proc ? await sdkDo("create PSR", () => proc.createItem({ data: row })) : await api("POST", `/process/2/${acc}/${M.psr}?${q}`, row);
          if (!realId(saved)) throw new Error(`create PSR → Kissflow returned no item (${kfErr(saved)})`);
          return saved;
        });
        r._kfId = realId(x); r._aiid = x?._activity_instance_id; writes++;
        if (!r._aiid) { const pr = await api("GET", `/process/2/${acc}/${M.psr}/${r._kfId}/progress?${q}`); r._aiid = (pr?.Steps || []).find((s) => s._status === "InProgress")?._activity_instance_id; }
      }
      const o = oldPsr[r._kfId];
      if (!o || !r._aiid) continue;
      const editable = ["Draft", "Returned"].includes(o.status);
      // narrative edited while still with the PM (or in the same save that submits it) — write it BEFORE any submit
      if (editable && JSON.stringify(o.narrative || {}) !== JSON.stringify(r.narrative || {})) {
        try { await psrUpdate(r, { narrative_update: JSON.stringify(r.narrative || {}) }); writes++; }
        catch (e) { if (!/submit this item anymore/i.test(e.message)) throw e; }
      }
      if (o.status === r.status) continue;
      const comment = r.history.at(-1)?.comment || "";
      const once = `${r._kfId}:${r._aiid}`; // one workflow action per step instance, however many saves fire
      if (submittedPsr.has(once)) continue;
      const verb = editable && r.status === "Submitted" ? "submit"
        : ["Submitted", "For PS Approval"].includes(o.status) && ["For PS Approval", "Approved"].includes(r.status) ? "submit"
        : ["Submitted", "For PS Approval"].includes(o.status) && r.status === "Returned" ? "sendback" : null;
      if (!verb) continue;
      submittedPsr.add(once);
      try { await psrAct(verb, r, editable ? "" : comment); writes++; }
      catch (e) { submittedPsr.delete(once); await psrRefresh(r, p).catch(() => {}); if (window.__ITPH_RENDER) window.__ITPH_RENDER(); throw e; }
      await psrRefresh(r, p); rerender = true;
    }
  }
  // baselines: every saved version is kept (the requirement is at least 10); a new one is a new record
  for (const p of S.projects) for (const b of p.baselines || []) {
    if (b._kfId || b.live || !p._kfId) continue;
    b._kfId = await formCreate(M.baseline, Object.fromEntries(Object.entries(baselineRow(p, b)).filter(([, v]) => v !== null && v !== "")));
    writes++;
  }
  // templates and saved reports (admin)
  const otp = byId(prev?.templates); const tplRow = (t) => ({ template_name: t.name, template_type: t.type, description: t.desc || null, is_default: !!t.isDefault, content_json: JSON.stringify(t.data || {}) });
  for (const t of S.templates || []) if (!t._kfId || !otp[t._kfId] || !same(tplRow(t), tplRow(otp[t._kfId]))) { const tmp = t.id; await binderWrite(M.template, t, tplRow(t)); t.id = t._kfId; if (ui_sel_fix) ui_sel_fix(tmp, t.id); writes++; }
  const keepT = new Set((S.templates || []).map((t) => t._kfId));
  for (const t of prev?.templates || []) if (t._kfId && !keepT.has(t._kfId)) { if (await deleteIfPresent(() => api("DELETE", `/form/2/${acc}/${M.template}/${t._kfId}?${q}`))) writes++; }
  // holidays (admin)
  const oh = byId(prev?.holidays);
  for (const h of S.holidays) { const row = { holiday_name: h.name, holiday_date: h.date, coverage: h.coverage }; if (!h._kfId || !oh[h._kfId] || !same(row, { holiday_name: oh[h._kfId].name, holiday_date: oh[h._kfId].date, coverage: oh[h._kfId].coverage })) { await formWrite(M.holiday, h, row); writes++; } }
  const keepH = new Set(S.holidays.map((h) => h._kfId));
  for (const h of prev?.holidays || []) if (h._kfId && !keepH.has(h._kfId)) { if (await deleteIfPresent(() => api("DELETE", `/form/2/${acc}/${M.holiday}/${h._kfId}?${q}`))) writes++; }
  writes += discWrites;
  if (!savePending) last = clone(S); // edits that arrived while writing are re-diffed by the next pass
  if (rerender && window.__ITPH_RENDER) window.__ITPH_RENDER();
  return writes;
}

async function psrUpdate(r, data) {
  const proc = sdkFlow("process", M.psr);
  if (proc) await sdkDo("update PSR", () => proc.updateItem({ instanceId: r._kfId, activityInstanceId: r._aiid, data }));
  else await api("POST", `/process/2/${acc}/${M.psr}/${r._kfId}/${r._aiid}?${q}`, data);
}
// Workflow action on a PSR's current step. Approve = the platform's Submit; Return = native send-back to the
// PM's Draft step with the approver's comment (BR-25). Inside Kissflow the SDK does the send-back.
async function psrAct(verb, r, comment) {
  const proc = sdkFlow("process", M.psr);
  if (verb === "submit") {
    if (proc) await sdkDo("submit PSR", () => proc.submitItem({ instanceId: r._kfId, activityInstanceId: r._aiid, comment: comment || "" }));
    else await api("POST", `/process/2/${acc}/${M.psr}/${r._kfId}/${r._aiid}/submit?${q}`, { Comment: comment || "" });
    return;
  }
  const prog = await api("GET", `/process/2/${acc}/${M.psr}/${r._kfId}/progress?${q}`);
  const draft = (prog?.Steps || []).find((s) => s.Name === STEP.draft);
  if (!draft?.Id) throw new Error("Couldn't find the PSR's Draft step to send it back to");
  // Kissflow resolves the send-back target as an ActivityInstance — the Draft step's completed instance id,
  // not the step definition id (Activity_xxx), which 404s with "could not be located within ActivityInstance".
  const target = draft._activity_instance_id || draft.Id;
  if (proc?.sendbackItem) await sdkDo("return PSR", () => proc.sendbackItem({ instanceId: r._kfId, activityInstanceId: r._aiid, stepId: target, comment }));
  else await api("POST", `/process/2/${acc}/${M.psr}/${r._kfId}/${r._aiid}/sendback?${q}`, { Note: comment, _id: target });
}
// After an action, take the PSR's real state from Kissflow (the Sponsor step is skipped by Kissflow's own
// routing rule, so "Approved" vs "For PS Approval" is Kissflow's call, not the prototype's).
async function psrRefresh(r, p) {
  const x = { _id: r._kfId, _activity_instance_id: r._aiid, reporting_period_month: `${r.period.y}-${String(r.period.m).padStart(2, "0")}-01`, narrative_update: JSON.stringify(r.narrative || {}), _created_at: r.created };
  x._progress = await api("GET", `/process/2/${acc}/${M.psr}/${r._kfId}/progress?${q}`);
  x._status = x._progress?._status;
  const cur = (x._progress?.Steps || []).find((s) => s._status === "InProgress");
  if (cur?._activity_instance_id) x._activity_instance_id = cur._activity_instance_id;
  const u = (kfU, role) => { const id = `${kfU._id}:${role}`; if (!userMap[id]) { userMap[id] = kfU._id; window.__ITPH_STATE?.users.push({ id, uid: (kfU.Email || kfU.Name || kfU._id).split("@")[0], name: kfU.Name || kfU._id, role, unit: ROLE_LABEL[role] || "", status: "Active", last: "", _kfUser: kfU._id }); } return id; };
  const fresh = psrFromKf(x, p?.pm || r.createdBy, u);
  r.status = fresh.status; r._aiid = fresh._aiid;
  if (fresh.history.length) r.history = fresh.history;
}

// Called by the prototype right after its own boot (schedule() fills forecasts) — that state is
// the sync baseline, so the first real edit is the first diff.
window.__ITPH_BASELINE = (S) => { last = clone(S); };

let savePending = false, saveRunning = false, saveTimer = null, saveFailures = 0, saveBlocked = false; const submittedPsr = new Set();
async function runSaves(S) {
  if (saveRunning || saveBlocked) return;
  saveRunning = true;
  try {
    while (savePending) {
      savePending = false;
      try { const n = await sync(S); saveFailures = 0; if (n) toast(`Saved to Kissflow (${n} change${n > 1 ? "s" : ""})`); }
      catch (e) {
        console.error("[itph] save failed", e);
        savePending = true;
        if (e.uncertainCreate) {
          saveBlocked = true;
          clearTimeout(saveTimer);
          toast("Couldn't confirm a new record. Saving is paused to avoid duplicates. Check the saved records in Kissflow, then reload to reconcile before continuing.", true);
          break;
        }
        const delay = Math.min(30000, 1000 * 2 ** Math.min(saveFailures++, 5));
        toast(`Couldn't save to Kissflow. Changes are still pending; retrying in ${delay / 1000}s: ${e.message || e}`, true);
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => runSaves(S), delay);
        break;
      }
    }
  } finally { saveRunning = false; }
}
// The prototype calls save() on every edit, and a form fires several in a row (blur → change → click).
// Wait for the burst to settle so one pass writes the final state (e.g. all three narrative boxes, THEN submit).
window.__ITPH_SAVE = (S) => {
  savePending = true;
  if (saveBlocked) { toast("Saving is paused because a new record couldn't be confirmed. Check Kissflow and reload to reconcile before continuing.", true); return; }
  saveFailures = 0;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => runSaves(S), 500);
};
window.addEventListener("beforeunload", (event) => {
  if (!savePending && !saveRunning) return;
  event.preventDefault();
  event.returnValue = "";
});

(async () => {
  try {
    showLoader("Loading ITPMD Project Hub", "Connecting to Kissflow…");
    await initSdk();
    showLoader("Loading ITPMD Project Hub", "Fetching projects, reports and risks…");
    const S = await load();
    // Discussions are switched off for BPI (forms stay in Kissflow; the UI no longer reads or polls them).
    try {
      if (!DISCUSSIONS_ENABLED) throw new Error("discussions disabled");
      const sdkWriters = framed ? { create: formCreate, update: (model, kfId, row) => formWrite(model, { _kfId: kfId }, row) } : {};
      disc = createDiscussions({ api, acc, q, meId: kf.user?._id, ...sdkWriters, onError: (e) => { console.error("[itph] discussion save failed", e); toast(`Couldn't save discussion: ${e.message || e}`, true); } });
      await disc.load(S);
    } catch (e) {
      if (DISCUSSIONS_ENABLED) console.warn("[itph] discussions unavailable — the rest of the hub still works", e);
      disc = null;
    }
    userMap = Object.fromEntries(S.users.map((x) => [x.id, x._kfUser]));
    last = clone(S);
    // reports arrive after the hub is up; they go into `last` too, so a save never mistakes them for new
    attachPsrs().then(() => {
      userMap = Object.fromEntries(S.users.map((x) => [x.id, x._kfUser]));
      for (const lp of last.projects) { const sp = S.projects.find((p) => p._kfId === lp._kfId); lp.psrs = clone(sp?._psrLoaded || []); }
      for (const p of S.projects) delete p._psrLoaded;
      if (window.__ITPH_RENDER) window.__ITPH_RENDER();
    }).catch((e) => console.warn("[itph] reports unavailable", e?.message || e));
    window.__ITPH_STATE = S;
    window.__ITPH_RESOLVE();
    window.__ITPH_BOOTED = true;
    if (disc) {
      // Redraw for polled messages without losing typing (see render-soon.js); retry deferred redraws every 2 s.
      const soon = makeRenderSoon({ doc: document, render: () => window.__ITPH?.render?.() });
      setInterval(soon.tick, 2000);
      disc.startPolling(S, { busy: () => saveRunning || savePending, render: soon.request });
    }
    // DAS011: a dashboard picks up other people's weekly reports, releases and status changes without a reload.
    window.__ITPH_REFRESH = async () => {
      if (saveRunning || savePending) return false;
      const [weekly, projs, rels] = await Promise.all([list("form", M.weekly), list("form", M.project), list("form", M.release)]);
      if (saveRunning || savePending) return false;
      const st = (x) => (x.status && typeof x.status === "object" ? x.status.Name : x.status) || "";
      for (const p of S.projects) { const row = projs.find((x) => x._id === p._kfId); if (row) p.status = st(row); p.wsr = weeklyOf(weekly, p._kfId); p.releases = releasesOf(rels, p._kfId); }
      last = clone(S); return true;
    };
    hideLoader();
  } catch (e) {
    hideLoader();
    console.error("[itph] load failed", e);
    const el = document.getElementById("app");
    const detail = [e?.message || String(e), e?.cause ? `cause: ${JSON.stringify(e.cause).slice(0, 400)}` : "", `framed=${framed}`, `user=${kf?.user?._id || "?"}`, `account=${acc || "?"}`].filter(Boolean).join("\n");
    if (el) el.innerHTML = `<div style="font:500 14px/1.5 'IBM Plex Sans',system-ui;padding:40px;max-width:760px"><div style="color:#B8321F;font-weight:600;margin-bottom:8px">Couldn't load data from Kissflow</div><pre style="white-space:pre-wrap;background:#F8FAF9;border:1px solid #E1E7E4;border-radius:8px;padding:12px;font:12px/1.5 'IBM Plex Mono',monospace;color:#15211C">${detail.replace(/</g, "&lt;")}</pre><button onclick="location.reload()" style="margin-top:12px;padding:8px 14px;border-radius:8px;border:1px solid #E1E7E4;background:#fff;cursor:pointer">Retry</button></div>`;
  }
})();
