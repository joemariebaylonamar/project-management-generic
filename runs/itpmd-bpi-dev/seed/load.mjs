// ITPMD Project Hub DEV seed. DEFAULT = DRY RUN (reads live, writes nothing).
//   dry-run : node runs/itpmd-bpi-dev/seed/load.mjs
//   execute : node runs/itpmd-bpi-dev/seed/load.mjs --execute [--psr]
// Env: set -a; . itpm-ui/.env; set +a   (domain must be development-bpi-ai.kissflow.com)
import { readFileSync, writeFileSync } from "node:fs";
import { clientFromEnv } from "../../../engine/client.mjs";
const EXEC = process.argv.includes("--execute"), PSR = process.argv.includes("--psr");
const here = (f) => new URL(f, import.meta.url);
const D = JSON.parse(readFileSync(here("./seed-data.json"), "utf8"));
const c = clientFromEnv(), acc = c.acc, A = "ITPMD_Project_Hub_A00", q = `_application_id=${A}`;
if (!/development-bpi-ai/.test(process.env.KF_DOMAIN || "")) { console.error("REFUSING: KF_DOMAIN is not the DEV domain"); process.exit(2); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const php = (n) => `${Math.round(n)} PHP`;
const ME = { _id: "UsEEQe4PIDoK", Name: "Joms", Kind: "User" };
const PM = "RoERtv3vbU79", DH = "RoERtv4trgpx", PS = "RoERtv5LLAbI"; // new-app User field ids
const res = {}; const rej = [];
const bump = (f, k) => ((res[f] ??= { insert: 0, update: 0, skip: 0, reject: 0 })[k]++);
async function list(kind, id) {
  const out = []; for (let p = 1; ; p++) {
    let r; for (let t = 0; t < 8; t++) { r = await c.call("GET", `/${kind}/2/${acc}/${id}/list?page_number=${p}&page_size=200&${q}`); if (r.status !== 429) break; await new Promise((ok) => setTimeout(ok, 5000 * (t + 1))); }
    if (r.status >= 300) throw new Error(`list ${id} ${r.status}`); const d = r.body?.Data || []; out.push(...d); if (d.length < 200) break; }
  return out;
}
async function write(method, path, body, key, flow) {
  if (!EXEC) return { dry: true };
  let r = await c.call(method, path, body);
  for (let t = 0; r.status >= 500 && t < 2; t++) { // verify-before-retry is done by caller via existence check
    await sleep(2000); const ex = await exists(flow, key); if (ex) return { _id: ex._id, verified: true };
    r = await c.call(method, path, body); }
  if (r.status >= 300) { rej.push({ flow, key, status: r.status, body: r.body }); bump(flow, "reject"); return null; }
  await sleep(250); return r.body;
}
const cache = {};
const exists = async (flow, key) => (await (cache[flow.id] ??= list(flow.kind, flow.id))).find((x) => flow.nk(x) === key);
// ---- 0. option lists: verify only (all 18 already populated live; load only missing values)
for (const L of D.lists) {
  const r = await c.call("GET", `/flow/2/${acc}/list/${L.server}/items?${q}`);
  const have = new Set(Array.isArray(r.body) ? r.body : []); const miss = L.items.filter((x) => !have.has(x));
  res["list:" + L.server] = { insert: miss.length, update: 0, skip: L.items.length - miss.length, reject: 0 };
  if (EXEC && miss.length) await c.putListItems(L.server, [...have, ...miss].map((v) => v)); // full set re-save
}
// ---- generic form/case loader keyed by natural key
async function load(flowName, kind, id, nk, rows, build) {
  const live = await list(kind, id); const idx = new Map(live.map((x) => [nk(x), x]));
  const map = {};
  for (const r of rows) {
    const key = nk(r.__live);
    const hit = idx.get(key);
    if (hit) { bump(flowName, "skip"); map[key] = hit._id; continue; }
    bump(flowName, "insert");
    const body = build(r);
    const path = kind === "form" ? `/form/2/${acc}/${id}/batch?${q}` : `/case/2/${acc}/${id}?${q}`;
    const w = await write("POST", path, kind === "form" ? [{ _is_created: true, ...body }] : body, key, { kind, id, nk });
    if (w && !w.dry) { map[key] = (Array.isArray(w) ? w[0] : w)._id; idx.set(key, { _id: map[key] }); }
    else if (w?.dry) map[key] = `<dry:${key}>`;
  }
  return map;
}
const L = (o) => ({ __live: o });
// ---- 1. hub settings + holidays
await load("Hub_Settings", "form", "ITPMD_Hub_Settings_A00", (x) => x.setting_name, D.hub_settings.map(L), (r) => ({ ...r.__live }));
await load("Holiday_Calendar", "form", "ITPMD_Holiday_Calendar_A00", (x) => x.holiday_date + "|" + x.holiday_name, D.holidays.map(L), (r) => ({ ...r.__live }));
// ---- 2. projects
const pmap = await load("Project", "form", "ITPMD_Project_A00", (x) => x.project_name, D.projects.map((p) => L(p.project)), (r) => {
  const p = { ...r.__live }; return { ...p, approved_budget: php(p.approved_budget), contingency_fund: php(p.contingency_fund), contract_value: php(p.contract_value),
    approved_changes_total: php(p.approved_changes_total), contingency_drawn: php(p.contingency_drawn), [PM]: ME, [DH]: ME, [PS]: ME }; });
// ---- 3. children (resolved to project _id by Project_Name)
const pid = (n) => ({ _id: pmap[n] });
const acts = D.activities.map(L), risks = D.risks.map(L), costs = D.cost_entries.map(L);
await load("Activity", "form", "ITPMD_Activity_A00", (x) => `${x.project_name ?? x.project?.Project_Name}|${x.wbs_code}`, acts, (r) => { const { project_name, ...b } = r.__live; return { ...b, project: pid(project_name), responsible_person: ME }; });
await load("Risk", "form", "ITPMD_Risk_A00", (x) => `${x.project_name ?? x.project?.Project_Name}|${x.risk_title}`, risks, (r) => { const { project_name, ...b } = r.__live; return { ...b, project: pid(project_name), risk_owner: ME }; });
await load("Cost_Entry", "form", "ITPMD_Cost_Entry_A00", (x) => `${x.project_name ?? x.project?.Project_Name}|${x.cost_entry_title}`, costs, (r) => { const { project_name, ...b } = r.__live;
  return { ...b, project: pid(project_name), actual_amount: php(b.actual_amount), committed_amount: php(b.committed_amount), forecast_amount: php(b.forecast_amount) }; });
const imap = await load("Issue", "case", "ITPMD_Issue_A00", (x) => `${x.project_name ?? x.project?.Project_Name}|${x.issue_title}`, D.issues.map(L), (r) => { const { project_name, ...b } = r.__live; return { ...b, project: pid(project_name), issue_owner: ME }; });
await load("Action_Item", "case", "ITPMD_Action_Item_A00", (x) => `${x.project_name ?? x.project?.Project_Name}|${x.action_description}`, D.actions.map(L), (r) => { const { project_name, issue_key, ...b } = r.__live; return { ...b, project: pid(project_name), related_issue: { _id: imap[`${project_name}|${issue_key}`] }, assignee: ME }; });
// ---- 4. PSR (process): create one DRAFT only (no submit) if --psr
if (PSR) { res.PSR = { insert: 1, update: 0, skip: 0, reject: 0 };
  if (EXEC) { const P = `/process/2/${acc}/ITPMD_Project_Status_Report_A00`; const r = await c.call("POST", `${P}?${q}`, { project: pid(D.psr.project_name), reporting_period_month: D.psr.period, narrative_update: D.psr.narrative });
    if (r.status >= 300) { rej.push({ flow: "PSR", status: r.status, body: r.body }); res.PSR = { insert: 0, update: 0, skip: 0, reject: 1 }; } } }
console.log(EXEC ? "EXECUTED on" : "DRY-RUN on", process.env.KF_DOMAIN, A); console.table(res);
writeFileSync(here(EXEC ? "./load-results.json" : "./dry-run-results.json"), JSON.stringify({ mode: EXEC ? "execute" : "dry-run", at: new Date().toISOString(), res, rejects: rej }, null, 1));
