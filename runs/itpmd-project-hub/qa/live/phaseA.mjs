// Phase A: build QA- data hierarchy through the runtime API as the single access-key user; test required-field
// refusal (draft->submit validation) for every top-level form; record read-backs for later assertions.
import { rq, F, CS, PR, q, ME, sleep, draftSubmit, dropDraft, getForm, track, errMsg, valErrs } from "./lib.mjs";
import fs from "node:fs";
const EV = { required: {}, created: {}, readback: {}, notes: [] };
const save = () => fs.writeFileSync(new URL("./phaseA.json", import.meta.url).pathname, JSON.stringify(EV, null, 1));
const log = (...a) => console.log(...a);

// one test per required field: submit with that field blank -> must be refused naming the field
async function reqTests(flow, key, payload, reqFields) {
  EV.required[key] = {};
  const d0 = await dropDraft(flow); EV.notes.push(`${key}: dropDraft ${d0.status}`);
  for (const f of reqFields) {
    const r = await draftSubmit(flow, payload, { nulls: [f] });
    const ve = valErrs(r.submit || r.draft);
    const refused = r.submit && r.submit.status >= 400 && ve && Object.keys(ve).some((k) => k === f || k.toLowerCase() === f.toLowerCase());
    const otherRefusal = r.submit && r.submit.status >= 400 && !refused;
    EV.required[key][f] = { refused: !!refused, submitStatus: r.submit?.status, draftStatus: r.draft?.status, errs: ve ? Object.keys(ve) : null, msg: !refused ? errMsg(r.submit || r.draft) : "", createdAnyway: !!r.id };
    if (r.id) { await rq("DELETE", `${F(flow)}/${r.id}?${q}`); } // accidental acceptance: remove at once
    log(" req", key, f, refused ? "REFUSED" : "NOT-REFUSED " + (r.submit?.status ?? r.draft?.status));
    const dd = await dropDraft(flow);
    save();
  }
}
async function mk(flow, key, payload, reqFields = []) {
  if (reqFields.length) await reqTests(flow, key, payload, reqFields);
  await dropDraft(flow);
  const r = await draftSubmit(flow, payload);
  EV.created[key] = { id: r.id, draft: r.draft?.status, submit: r.submit?.status, err: r.id ? "" : errMsg(r.submit || r.draft), errs: valErrs(r.submit || r.draft) };
  log("CREATE", key, r.id || "FAILED " + errMsg(r.submit || r.draft));
  if (r.id) { await sleep(500); EV.readback[key] = await getForm(flow, r.id); }
  save();
  return r.id;
}
const today = "2026-10-30";
const progId = await mk("ITPMD_Program_A00", "program", { program_name: "QA-Program", segment: "QA" }, ["program_name"]);
await mk("ITPMD_Hub_Settings_A00", "hub_settings", { setting_name: "QA-Settings", psr_due_working_day: 5, issue_aging_period_days: 5 }, ["setting_name", "psr_due_working_day", "issue_aging_period_days"]);
await mk("ITPMD_Holiday_Calendar_A00", "holiday", { holiday_name: "QA-Holiday", holiday_date: "2026-12-31" }, ["holiday_name", "holiday_date"]);
const projP = { project_name: "QA-Project Alpha", business_unit: "Retail Banking", portfolio: "Digital Channels", RoERtv3vbU79: ME, RoERtv4trgpx: ME, RoERtv5LLAbI: ME, status: "Active", approved_budget: "1000000 PHP", contingency_fund: "100000 PHP", project_start_date: "2026-11-02", project_planned_end_date: "2026-12-31", ps_approval_required: false, ...(progId ? { program: { _id: progId } } : {}) };
const pid = await mk("ITPMD_Project_A00", "project", projP, ["project_name", "business_unit", "portfolio", "RoERtv3vbU79", "RoERtv4trgpx", "status", "approved_budget", "contingency_fund"]);
if (!pid) { log("no project; abort"); process.exit(2); }
const P = { _id: pid };
const act = (n, extra) => ({ activity_name: "QA-Activity " + n, project: P, wbs_code: n, planned_start: "2026-11-02", planned_finish: "2026-11-06", ...extra });
const a1 = await mk("ITPMD_Activity_A00", "activity1", act("1", { responsible_person: ME, baseline_start: "2026-11-02", baseline_finish: "2026-11-06", forecast_start: "2026-11-02", forecast_finish: "2026-11-06", actual_start: "2026-11-02", actual_finish: "2026-11-06", percent_complete: 100 }), ["activity_name", "project", "wbs_code", "planned_start", "planned_finish"]);
const a2 = await mk("ITPMD_Activity_A00", "activity2", act("2", { planned_start: "2026-01-05", planned_finish: "2026-01-15", is_milestone: true, baseline_start: "2026-01-05", baseline_finish: "2026-01-15", percent_complete: 0 }));
const a3 = await mk("ITPMD_Activity_A00", "activity3", act("3", { planned_start: "2026-11-09", planned_finish: "2026-11-13", baseline_start: "2026-11-09", baseline_finish: "2026-11-13", forecast_start: "2026-11-09", forecast_finish: "2026-11-20", percent_complete: 0 }));
const riskP = (n, p, i) => ({ risk_title: "QA-Risk " + n, project: P, risk_category: "Technical", probability: p, impact: i, risk_owner: ME, status: "Open", response_strategy: "Mitigate", mitigation_actions: "QA", residual_probability: 2, residual_impact: 2 });
await mk("ITPMD_Risk_A00", "risk1", riskP(1, 5, 4), ["risk_title", "project", "risk_category", "probability", "impact", "risk_owner", "status"]);
await mk("ITPMD_Risk_A00", "risk2", riskP(2, 1, 1));
await mk("ITPMD_Cost_Entry_A00", "cost", { cost_entry_title: "QA-Cost 1", project: P, entry_date: today, actual_amount: "300000 PHP", committed_amount: "200000 PHP", forecast_amount: "1100000 PHP" }, ["cost_entry_title", "project", "entry_date"]);
await mk("ITPMD_Portfolio_Status_Report_A00", "portfolio", { report_period: "2026-10-01", portfolio_narrative: "QA" }, ["report_period"]);
await mk("ITPMD_Discussion_Message_A00", "dmsg", { project: P, author: ME, sent_at: "2026-10-30T09:00:00Z", message_text: "QA-message" }, ["project", "author", "sent_at", "message_text"]);
await mk("ITPMD_Notification_A00", "notif", { recipient: ME, notification_type: "Alert", title: "QA-Notification", project: P }, ["recipient", "notification_type", "title"]);
await mk("ITPMD_Discussion_Read_A00", "dread", { reader: ME, project: P, last_read_at: "2026-10-30T09:00:00Z" }, ["reader", "project", "last_read_at"]);
await mk("ITPMD_Baseline_A00", "baseline", { project: P, version: 1, set_date: today, set_by: ME, note: "QA-baseline" }, ["project", "version", "set_date"]);
await mk("ITPMD_Binder_Item_A00", "binder", { project: P, item_type: "Risk", description: "QA-binder" }, ["project", "item_type"]);
await mk("ITPMD_Weekly_Report_A00", "weekly", { project: P, week_of: "2026-10-26", weekly_summary: "QA-weekly" }, ["project", "week_of"]);
await mk("ITPMD_Release_A00", "release", { project: P, release_name: "QA-Release 1", planned_date: "2026-12-15" }, ["project", "release_name", "planned_date"]);
await mk("ITPMD_Template_A00", "template", { template_name: "QA-Template", template_type: "Workplan" }, ["template_name", "template_type"]);
log("PHASE A done");
