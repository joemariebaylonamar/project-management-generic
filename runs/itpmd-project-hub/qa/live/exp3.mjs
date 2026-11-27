import fs from "node:fs";
import { c, rq, F, q, ME, sleep, draftSubmit, getForm } from "./lib.mjs";
const FLOW = "ITPMD_Activity_A00";
const list = await rq("GET", `${F(FLOW)}/list?page_number=1&page_size=5&${q}`);
const P = { _id: (list.body.Data || list.body)[0].project._id };
const probe = async (tag, extra) => {
  const r = await draftSubmit(FLOW, { activity_name: "QA-ISBLANK " + tag, project: P, wbs_code: "QX" + tag, planned_start: "2026-11-02", planned_finish: "2026-11-06", baseline_start: "2026-11-02", baseline_finish: "2026-11-06", forecast_start: "2026-11-02", forecast_finish: "2026-11-06", responsible_person: ME, ...extra });
  if (!r.id) return { tag, err: JSON.stringify(r.submit?.body || r.draft?.body).slice(0, 160) };
  await sleep(3500); const x = await getForm(FLOW, r.id);
  await rq("DELETE", `${F(FLOW)}/${r.id}?${q}`);
  return { tag, pct: extra.percent_complete, actual_start: extra.actual_start || "(blank)", status_code: x.status_code, status: x.status, missed: x.missed_milestone_flag };
};
const run = async (label) => { console.log("\n" + label); for (const [t, e] of [["A", { percent_complete: 0 }], ["B", { percent_complete: 40, actual_start: "2026-10-20" }], ["C", { percent_complete: 100, actual_start: "2026-10-20", actual_finish: "2026-10-25" }]]) console.log(" ", JSON.stringify(await probe(label[0] + t, e))); };
await run("pre-patch");
// ---- patch status_code: ISBLANK(Actual_Start) -> Actual_Start = ""
const r = await c.getDraft("form", FLOW); const b = r.data || r.body || r.json;
fs.writeFileSync("runs/itpmd-project-hub/activity-draft.pre-isblank.json", JSON.stringify(b));
const ents = b.entities || b; const E = Object.values(ents).filter((x) => x && typeof x === "object");
const ex = E.find((e) => e.Kind === "Expression" && e.Field === "status_code");
const stack = [...(ex["Expression::Node"] || [])]; let node = null;
while (stack.length) { const n = ents[stack.pop()]; if (!n) continue; if (n.Value === "ISBLANK") { node = n; break; } stack.push(...(n["Node::Node"] || [])); }
if (!node) throw new Error("no ISBLANK node in status_code");
const sid = "Node_qaexp" + Date.now().toString(36);
ents[sid] = { Id: sid, Kind: "Node", DataType: "String", Type: "Static", Value: "", Node: node.Id };
node.Value = "="; node.Syntax = "Infix"; node.Category = "Boolean"; node.FieldRefCount = 2; node["Node::Node"] = [...node["Node::Node"], sid];
ex.ExpressionStr = 'IF(Percent_Complete>=100,3,IF(Actual_Start="",1,2))';
const put = await c.putDraft("form", FLOW, b); console.log("\nputDraft", put.status, put.body?.error_code || put.body?.message || "");
if (put.status >= 300) process.exit(1);
const pub = await c.publish("form", FLOW); console.log("publish", pub.status, pub.body?.error_code || "");
await sleep(2000);
await run("post-patch");
