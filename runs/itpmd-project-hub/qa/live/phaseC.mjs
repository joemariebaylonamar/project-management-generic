// Phase C: boards (Issue / Action Item) and the PSR process, as the single access-key user.
import { rq, F, CS, PR, q, ME, sleep, track, errMsg, valErrs } from "./lib.mjs";
import fs from "node:fs";
const A = JSON.parse(fs.readFileSync(new URL("./phaseA.json", import.meta.url), "utf8"));
const P = { _id: A.created.project.id };
const EV = { cases: {}, psr: {}, notes: [] };
const save = () => fs.writeFileSync(new URL("./phaseC.json", import.meta.url).pathname, JSON.stringify(EV, null, 1));
const log = (...a) => console.log(...a);
const hubId = A.created.hub_settings.id;
// ---- cases ---------------------------------------------------------------------------------
async function caseCreate(flow, key, body) {
  const r = await rq("POST", `${CS(flow)}?${q}`, body);
  const id = r.status < 300 ? r.body?._id : null;
  if (id) track("case", flow, id);
  return { r, id };
}
async function caseReq(flow, key, body, fields) {
  EV.cases[key] = { required: {} };
  for (const f of fields) {
    const b = { ...body }; delete b[f];
    const { r, id } = await caseCreate(flow, key, b);
    EV.cases[key].required[f] = { status: r.status, refused: r.status >= 400, created: !!id, msg: r.status >= 400 ? errMsg(r) : "", errs: valErrs(r) };
    if (id) await rq("DELETE", `${CS(flow)}/${id}?${q}`); // not accepted? remove (untrack not needed; second delete is harmless)
    log(" case req", key, f, r.status);
    save();
  }
}
const issueBody = { issue_title: "QA-Issue 1", project: P, issue_category: "Technical", priority: "Critical", issue_owner: ME, target_resolution_date: "2026-10-01", hub_settings: { _id: hubId }, Summary: "QA-Issue 1" };
await caseReq("ITPMD_Issue_A00", "issue", issueBody, ["issue_title", "project", "issue_category", "priority", "issue_owner", "Summary"]);
const iss = await caseCreate("ITPMD_Issue_A00", "issue", issueBody);
EV.cases.issue.create = { status: iss.r.status, id: iss.id, msg: iss.id ? "" : errMsg(iss.r) };
if (iss.id) { await sleep(800); const g = await rq("GET", `${CS("ITPMD_Issue_A00")}/${iss.id}?${q}`); EV.cases.issue.readback = g.body; EV.cases.issue.readStatus = g.status; }
log("issue", iss.id, iss.r.status, iss.id ? "" : errMsg(iss.r)); save();
const actBody = { action_description: "QA-Action 1", project: P, assignee: ME, due_date: "2026-10-01", Summary: "QA-Action 1", ...(iss.id ? { related_issue: { _id: iss.id } } : {}) };
await caseReq("ITPMD_Action_Item_A00", "action", actBody, ["action_description", "project", "assignee", "Summary"]);
const ai = await caseCreate("ITPMD_Action_Item_A00", "action", actBody);
EV.cases.action.create = { status: ai.r.status, id: ai.id, msg: ai.id ? "" : errMsg(ai.r) };
if (ai.id) { await sleep(800); const g = await rq("GET", `${CS("ITPMD_Action_Item_A00")}/${ai.id}?${q}`); EV.cases.action.readback = g.body; EV.cases.action.readStatus = g.status; }
log("action", ai.id, ai.r.status, ai.id ? "" : errMsg(ai.r)); save();

// ---- PSR -----------------------------------------------------------------------------------
const PS = "ITPMD_Project_Status_Report_A00";
const base = { project: P, reporting_period_month: "2026-10-01", narrative_update: "QA-PSR narrative", RoERtv3vbU79: ME, RoERtv4trgpx: ME, RoERtv5LLAbI: ME, ps_approval_required: false, baseline_or_budget_change_requested: false, overall_health: "Green" };
async function psrCreate(body) { const r = await rq("POST", `${PR(PS)}?${q}`, body); return r; }
async function psrSubmit(id, aiid) { return rq("POST", `${PR(PS)}/${id}/${aiid}/submit?${q}`, { Comment: "" }); }
async function psrDetail(id) { const g = await rq("GET", `${PR(PS)}/${id}?${q}`); return g.body; }
EV.psr.required = {};
for (const f of ["project", "reporting_period_month", "narrative_update"]) {
  const b = { ...base }; delete b[f];
  const c = await psrCreate(b); const id = c.body?._id, aiid = c.body?._activity_instance_id;
  let sub = null; if (id) { track("process", PS, id, { aiid }); sub = await psrSubmit(id, aiid); }
  const d = id ? await psrDetail(id) : null;
  EV.psr.required[f] = { create: c.status, createMsg: c.status >= 300 ? errMsg(c) : "", submit: sub?.status, submitMsg: sub && sub.status >= 300 ? errMsg(sub) : "", errs: sub ? valErrs(sub) : valErrs(c), stepAfter: d?._current_step, statusAfter: d?._status };
  log(" psr req", f, c.status, sub?.status, d?._current_step, JSON.stringify(valErrs(sub || c) || ""));
  if (id && sub?.status >= 300) { await rq("DELETE", `${PR(PS)}/${id}?${q}`); }
  save();
}
// happy path + sponsor routing: GREEN (expect No) and RED (expect Yes)
for (const [k, over] of [["green", { overall_health: "Green" }], ["red", { overall_health: "Red" }]]) {
  const c = await psrCreate({ ...base, ...over, narrative_update: "QA-PSR " + k });
  const id = c.body?._id, aiid = c.body?._activity_instance_id;
  EV.psr[k] = { create: c.status, id, aiid, msg: id ? "" : errMsg(c) };
  if (!id) { save(); continue; }
  track("process", PS, id, { aiid });
  await sleep(800);
  EV.psr[k].draftDetail = await psrDetail(id);
  const sub = await psrSubmit(id, aiid);
  EV.psr[k].submit = { status: sub.status, msg: sub.status >= 300 ? errMsg(sub) : "" };
  await sleep(1500);
  const d = await psrDetail(id);
  EV.psr[k].after = { step: d._current_step, status: d._status, assigned: (d._current_assigned_to || []).map((x) => x.Name), sponsor_required: d.sponsor_approval_required, aiid: d._activity_instance_id, keys: Object.keys(d).filter((x) => !x.startsWith("_")).join(",") };
  log(k, JSON.stringify(EV.psr[k].after));
  // approver-step attempts (known platform limit): approve then send-back
  const a2 = d._activity_instance_id || aiid;
  const ap = await rq("POST", `${PR(PS)}/${id}/${a2}/submit?${q}`, { Comment: "QA approve", Decision: "Approve" });
  EV.psr[k].approveAttempt = { status: ap.status, msg: ap.status >= 300 ? errMsg(ap) : "", code: ap.body?.error_code };
  const sb = await rq("POST", `${PR(PS)}/${id}/${a2}/sendback?${q}`, { Comment: "QA return" });
  EV.psr[k].returnAttempt = { status: sb.status, msg: sb.status >= 300 ? errMsg(sb) : "", code: sb.body?.error_code };
  const d2 = await psrDetail(id); EV.psr[k].afterAttempts = { step: d2._current_step, status: d2._status };
  log(k, "approve", ap.status, ap.body?.error_code, "return", sb.status, sb.body?.error_code, d2._current_step);
  save();
}
log("PHASE C done");
