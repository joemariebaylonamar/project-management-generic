// Re-sets Project Manager / Department Head / Project Sponsor on every project to Joms (the BPI dev-account user).
// Needed after the Phase 2b apply re-created those three User fields (their old values were dropped).
import { call, c, q, sleep } from "./kf.mjs";
const ME = { _id: "UsEEQe4PIDoK", Name: "Joms", Kind: "User" }; // joemarie@kissflow.com — the BPI dev-account user the UI showed as PM/Sponsor
const list = await call("GET", `/form/2/${c.acc}/ITPMD_Project_A00/list?page_number=1&page_size=100&${q}`);
for (const p of list.body.Data || []) {
  const body = { RoERtv3vbU79: ME, RoERtv4trgpx: ME, RoERtv5LLAbI: ME };
  const r = await call("POST", `/form/2/${c.acc}/ITPMD_Project_A00/${p._id}?${q}`, body);
  console.log(p.project_name, r.status, r.status >= 300 ? JSON.stringify(r.body).slice(0, 200) : "");
  await sleep(500);
}
