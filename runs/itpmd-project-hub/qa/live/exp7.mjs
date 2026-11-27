import fs from "node:fs";
import { c, rq, F, q, ME, sleep, draftSubmit, getForm } from "./lib.mjs";
import { compileFormula } from "../../../../engine/builders.mjs";
const FLOW = "ITPMD_Activity_A00";
const list = await rq("GET", `${F(FLOW)}/list?page_number=1&page_size=5&${q}`);
const P = { _id: (list.body.Data || list.body)[0].project._id };
const original = JSON.parse(fs.readFileSync("runs/itpmd-project-hub/activity-draft.pre-isblank.json", "utf8"));
const NUMT = new Set(["Number", "Currency", "Decimal", "Integer"]);
const ftype = (f) => { const t = f?.Type || f?.DataType || "String"; return NUMT.has(t) ? "Number" : /^Date(Time)?$/.test(t) ? t : /^Boolean$/.test(t) ? "Boolean" : "String"; };
const retype = (ents, rootIds) => { const go = (id) => { const n = ents[id]; if (!n) return "String"; const kids = (n["Node::Node"] || []).map(go);
  if (n.Type === "Field") n.DataType = ftype(ents[n.Field]); else if (n.Type === "Static") n.DataType = /^-?\d+(\.\d+)?$/.test(n.Value) ? "Number" : "String";
  else if (n.Type === "Function") { const v = n.Value; n.DataType = /^(=|!=|<|>|<=|>=|AND|OR|NOT|ISBLANK)$/.test(v) ? "Boolean" : v === "IF" ? kids[1] : /^(TODAY)$/.test(v) ? "Date" : v === "DATEDIFF" ? "Number" : n.DataType; }
  return n.DataType; }; rootIds.forEach(go); };
const patch = async (tests) => {
  const r = await c.getDraft("form", FLOW); const b = r.data || r.body || r.json; const ents = b.entities || b;
  for (const [fid, ftype, formula] of tests) {
    const ex = Object.values(ents).find((e) => e && e.Kind === "Expression" && e.Field === fid);
    const drop = (id) => { const n = ents[id]; if (!n) return; (n["Node::Node"] || []).forEach(drop); delete ents[id]; };
    (ex["Expression::Node"] || []).forEach(drop); ex["Expression::Node"] = [];
    const ok = compileFormula(ents, ex.Id, formula, ftype, FLOW); if (!ok) throw new Error("compile " + fid); ex.ExpressionStr = formula; retype(ents, ex["Expression::Node"]);
  }
  const put = await c.putDraft("form", FLOW, b); if (put.status >= 300) throw new Error("put " + put.status + JSON.stringify(put.body).slice(0, 200));
  const pub = await c.publish("form", FLOW); console.log("publish", pub.status); await sleep(2500);
};
const probe = async (tag, extra) => {
  const r = await draftSubmit(FLOW, { activity_name: "QA-OP " + tag, project: P, wbs_code: "QO" + tag, planned_start: "2026-11-02", planned_finish: "2026-11-06", baseline_start: "2026-11-02", baseline_finish: "2026-11-06", forecast_start: "2026-11-02", forecast_finish: "2026-11-06", responsible_person: ME, ...extra });
  if (!r.id) return { tag, err: JSON.stringify(r.submit?.body || r.draft?.body).slice(0, 160) };
  await sleep(3500); const x = await getForm(FLOW, r.id); await rq("DELETE", `${F(FLOW)}/${r.id}?${q}`);
  return { tag, pct: extra.percent_complete, ge: x.status_code, gt: x.missed_milestone_flag, eq: x.schedule_variance_days, str_eq: x.status };
};
try {
  await patch([
    ["status_code", "Number", "IF(Percent_Complete>=100,1,0)"],
    ["missed_milestone_flag", "Number", "IF(Percent_Complete>0,1,0)"],
    ["schedule_variance_days", "Number", "IF(Percent_Complete=100,1,0)"],
    ["status", "Text", 'IF(Percent_Complete>=100,"Complete",IF(Percent_Complete>0,"In Progress","Not Started"))'],
  ]);
  for (const [t, e] of [["A", { percent_complete: 0 }], ["B", { percent_complete: 40 }], ["C", { percent_complete: 100 }]]) console.log(JSON.stringify(await probe(t, e)));
} finally {
  const put = await c.putDraft("form", FLOW, original); const pub = await c.publish("form", FLOW); console.log("RESTORED original: put", put.status, "publish", pub.status);
}
