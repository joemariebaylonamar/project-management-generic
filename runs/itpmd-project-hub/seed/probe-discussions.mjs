// Round-trips one record per discussion form and deletes it. Fails loudly if a field didn't persist.
import { call, c, q, ME, sleep } from "./kf.mjs";
const proj = ((await call("GET", `/form/2/${c.acc}/ITPMD_Project_A00/list?page_number=1&page_size=1&${q}`)).body?.Data || [])[0];
if (!proj) throw new Error("no project to link to");
const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z"); // Kissflow DateTime accepts only YYYY-MM-DDTHH:MM:SSZ
const cases = {
  ITPMD_Discussion_Message_A00: { project: { _id: proj._id }, author: { _id: ME._id }, sent_at: now, message_text: "PROBE message", linked_item_type: "Activity", linked_item: "PROBE-ACT", mentioned_users: ME._id },
  ITPMD_Notification_A00: { recipient: { _id: ME._id }, notification_type: "Mention", title: "PROBE", detail: "probe detail", link_target: JSON.stringify(["chat", proj._id]), project: { _id: proj._id }, is_read: false },
  ITPMD_Discussion_Read_A00: { reader: { _id: ME._id }, project: { _id: proj._id }, last_read_at: now },
};
let failed = 0;
for (const [model, row] of Object.entries(cases)) {
  const created = await call("POST", `/form/2/${c.acc}/${model}/batch?${q}`, [{ _is_created: true, ...row }]);
  const id = created.body?.[0]?._id;
  if (!id) { console.error(model, "create failed", created.status, JSON.stringify(created.body).slice(0, 300)); failed++; continue; }
  const back = (await call("GET", `/form/2/${c.acc}/${model}/${id}?${q}`)).body || {};
  for (const k of Object.keys(row)) {
    const v = back[k]; const want = row[k];
    const ok = want && typeof want === "object" ? v?._id === want._id : k.endsWith("_at") ? Date.parse(v) === Date.parse(want) : v === want;
    console.log(`${model}.${k}: ${ok ? "ok" : "MISSING/DIFFERENT"} → ${JSON.stringify(v)}`);
    if (!ok) failed++;
  }
  await call("DELETE", `/form/2/${c.acc}/${model}/${id}?${q}`); await sleep(300);
}
if (failed) { console.error(`${failed} problem(s) — check the field ids in the live form before continuing`); process.exit(1); }
console.log("probe ok");
