// Phase D: update/recompute tests + read-only metadata (child-table schema, pages, history).
import { rq, F, CS, PR, q, ME, sleep, errMsg, acc, A as APP } from "./lib.mjs";
import fs from "node:fs";
const D = new URL(".", import.meta.url).pathname;
const PA = JSON.parse(fs.readFileSync(D + "phaseA.json", "utf8"));
const EV = { updates: {}, meta: {}, pages: null, history: {} };
const save = () => fs.writeFileSync(D + "phaseD.json", JSON.stringify(EV, null, 1));
const log = (...a) => console.log(...a);
// 1. risk recompute after input update (5x5 = 25 -> Critical)
const rid = PA.created.risk1.id;
const u = await rq("POST", `${F("ITPMD_Risk_A00")}/${rid}?${q}`, { probability: 5, impact: 5 });
await sleep(1200); const rr = (await rq("GET", `${F("ITPMD_Risk_A00")}/${rid}?${q}`)).body;
EV.updates.risk = { status: u.status, rating: rr.risk_rating, band: rr.risk_rating_band, esc: rr.escalation_flag, crit: rr.critical_flag }; log("risk", JSON.stringify(EV.updates.risk)); save();
// 2. activity reassign + progress update
const aid = PA.created.activity3.id;
const u2 = await rq("POST", `${F("ITPMD_Activity_A00")}/${aid}?${q}`, { responsible_person: ME, assigned_by: ME, percent_complete: 40, actual_start: "2026-11-09" });
await sleep(1200); const ar = (await rq("GET", `${F("ITPMD_Activity_A00")}/${aid}?${q}`)).body;
EV.updates.activity = { status: u2.status, msg: u2.status >= 300 ? errMsg(u2) : "", resp: ar.responsible_person?.Name, pct: ar.percent_complete, wcv: ar.weighted_complete_value, status_text: ar.status, assigned_by: ar.assigned_by?.Name, assigned_at: ar.assigned_at }; log("act", JSON.stringify(EV.updates.activity)); save();
// 3. hub settings / holiday update (admin config journey)
const hs = PA.created.hub_settings.id;
const u3 = await rq("POST", `${F("ITPMD_Hub_Settings_A00")}/${hs}?${q}`, { psr_reminder_days_before: 4, escalation_recipients: ME });
await sleep(800); const hr = (await rq("GET", `${F("ITPMD_Hub_Settings_A00")}/${hs}?${q}`)).body;
EV.updates.hub = { status: u3.status, remind: hr.psr_reminder_days_before }; log("hub", JSON.stringify(EV.updates.hub)); save();
// 4. child-table + draft metadata (read-only)
for (const [k, type, id] of [["activity", "form", "ITPMD_Activity_A00"], ["cost", "form", "ITPMD_Cost_Entry_A00"], ["portfolio", "form", "ITPMD_Portfolio_Status_Report_A00"]]) {
  const m = await rq("GET", `/metadata/2/${acc}/${type}/${id}/draft`); fs.writeFileSync(D + `meta_${k}.json`, JSON.stringify(m.body, null, 1)); EV.meta[k] = m.status; log("meta", k, m.status);
}
// 5. pages + nav (read-only)
const pg = await rq("GET", `/flow/2/${acc}/page?_application_id=${APP}`); EV.pages = { status: pg.status, list: Array.isArray(pg.body) ? pg.body.map((p) => ({ id: p._id, name: p.Name, status: p.Status })) : pg.body }; log("pages", pg.status, Array.isArray(pg.body) ? pg.body.length : ""); save();
// 6. audit / history probes (read-only)
const psrId = JSON.parse(fs.readFileSync(D + "created.json", "utf8")).filter((x) => x.kind === "process").slice(-1)[0];
for (const [k, p] of [["form_activity", `${F("ITPMD_Activity_A00")}/${aid}/history?${q}`], ["form_activity_timeline", `${F("ITPMD_Activity_A00")}/${aid}/timeline?${q}`], ["psr_timeline", `${PR("ITPMD_Project_Status_Report_A00")}/${psrId.id}/${psrId.aiid}/timeline?${q}`], ["psr_history", `${PR("ITPMD_Project_Status_Report_A00")}/${psrId.id}/${psrId.aiid}/history?${q}`], ["psr_comments", `${PR("ITPMD_Project_Status_Report_A00")}/${psrId.id}/${psrId.aiid}/comment?${q}`]]) {
  const r = await rq("GET", p); EV.history[k] = { status: r.status, sample: JSON.stringify(r.body).slice(0, 300) }; log("hist", k, r.status);
}
save(); log("PHASE D done");
