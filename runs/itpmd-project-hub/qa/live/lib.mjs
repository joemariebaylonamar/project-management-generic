// Shared helpers for the live runtime-QA harness. Credentials come from env (KF_* via itpm-ui/.env) -- never printed.
import { clientFromEnv } from "../../../../engine/client.mjs";
import fs from "node:fs";
export const c = clientFromEnv();
export const A = "ITPMD_Project_Hub_A00";
export const q = `_application_id=${A}`;
export const acc = c.acc;
export const ME = { _id: "UsEEQe4PIDoK", Name: "Joms", Kind: "User" };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CREATED = new URL("./created.json", import.meta.url).pathname;
let last = 0;
export async function rq(method, path, body, { retries = 5 } = {}) {
  for (let i = 0; ; i++) {
    const wait = Math.max(0, 700 - (Date.now() - last)); if (wait) await sleep(wait);
    last = Date.now();
    const r = await c.call(method, path, body, { noRetry: true });
    const cf = r.status === 429 || (typeof r.body === "string" && /Just a moment/.test(r.body));
    if (cf && i < retries) { await sleep(20000 * (i + 1)); continue; }
    if (r.status === 423 && i < 3) { await sleep(2000 * (i + 1)); continue; }
    if (r.status === 500 && method === "GET" && i < 2) { await sleep(1500); continue; }
    return r;
  }
}
export const F = (id) => `/form/2/${acc}/${id}`;
export const CS = (id) => `/case/2/${acc}/${id}`;
export const PR = (id) => `/process/2/${acc}/${id}`;
export const errMsg = (r) => (r.body && (r.body.en_message || r.body.message)) || (typeof r.body === "string" ? r.body.slice(0, 120) : JSON.stringify(r.body).slice(0, 200));
export const valErrs = (r) => (r.body && r.body.args && r.body.args.validation_errors) || null;
// cleanup registry (persisted so a crash can still be cleaned)
export function track(kind, flow, id, extra = {}) {
  const l = fs.existsSync(CREATED) ? JSON.parse(fs.readFileSync(CREATED, "utf8")) : [];
  l.push({ kind, flow, id, ...extra }); fs.writeFileSync(CREATED, JSON.stringify(l, null, 1));
}
export const readTracked = () => (fs.existsSync(CREATED) ? JSON.parse(fs.readFileSync(CREATED, "utf8")) : []);
// draft -> (update) -> submit. nulls = fields to clear. Returns {draft, submit, id}
export async function draftSubmit(flow, payload, { nulls = [], doSubmit = true } = {}) {
  const body = { ...payload }; for (const n of nulls) body[n] = null;
  const d = await rq("POST", `${F(flow)}?${q}`, body);
  if (d.status >= 300 || !d.body?._id) return { draft: d, submit: null, id: null };
  if (!doSubmit) return { draft: d, submit: null, id: d.body._id };
  const s = await rq("POST", `${F(flow)}/${d.body._id}/submit?${q}`, {});
  const id = s.status < 300 ? s.body?._id : null;
  if (id) track("form", flow, id);
  return { draft: d, submit: s, id };
}
export async function dropDraft(flow) { return rq("DELETE", `${F(flow)}/draft_${ME._id}?${q}`); }
export async function getForm(flow, id) { const r = await rq("GET", `${F(flow)}/${id}?${q}`); return r.body; }
export const num = (v) => { if (v == null || v === "") return null; if (typeof v === "number") return v; if (typeof v === "object") return num(v.Value ?? v.value ?? v.Amount); const m = String(v).match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };
