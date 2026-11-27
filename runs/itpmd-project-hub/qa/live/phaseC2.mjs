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
const issueBody = { issue_title: "QA-Issue 1", project: P, issue_category: "Technical", priority: "Critical", issue_owner: ME, target_resolution_date: "2026-10-01", hub_settings: { _id: hubId } };
await caseReq("ITPMD_Issue_A00", "issue", issueBody, ["issue_title", "project", "issue_category", "priority", "issue_owner"]);
const iss = await caseCreate("ITPMD_Issue_A00", "issue", issueBody);
EV.cases.issue.create = { status: iss.r.status, id: iss.id, msg: iss.id ? "" : errMsg(iss.r) };
if (iss.id) { await sleep(800); const g = await rq("GET", `${CS("ITPMD_Issue_A00")}/${iss.id}?${q}`); EV.cases.issue.readback = g.body; EV.cases.issue.readStatus = g.status; }
log("issue", iss.id, iss.r.status, iss.id ? "" : errMsg(iss.r)); save();
const actBody = { action_description: "QA-Action 1", project: P, assignee: ME, due_date: "2026-10-01", ...(iss.id ? { related_issue: { _id: iss.id } } : {}) };
await caseReq("ITPMD_Action_Item_A00", "action", actBody, ["action_description", "project", "assignee"]);
const ai = await caseCreate("ITPMD_Action_Item_A00", "action", actBody);
EV.cases.action.create = { status: ai.r.status, id: ai.id, msg: ai.id ? "" : errMsg(ai.r) };
if (ai.id) { await sleep(800); const g = await rq("GET", `${CS("ITPMD_Action_Item_A00")}/${ai.id}?${q}`); EV.cases.action.readback = g.body; EV.cases.action.readStatus = g.status; }
log("action", ai.id, ai.r.status, ai.id ? "" : errMsg(ai.r)); save();

log("PHASE C2 done");
