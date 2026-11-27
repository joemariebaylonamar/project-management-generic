import { call, c, q, sleep } from "./kf.mjs";
const kinds = [["form","ITPMD_Project_A00"],["form","ITPMD_Activity_A00"],["form","ITPMD_Risk_A00"],["form","ITPMD_Cost_Entry_A00"],["form","ITPMD_Holiday_Calendar_A00"],["form","ITPMD_Hub_Settings_A00"],["form","ITPMD_Portfolio_Status_Report_A00"],["case","ITPMD_Issue_A00"],["case","ITPMD_Action_Item_A00"]];
for (const [k, id] of kinds) {
  const r = await call("GET", `/${k}/2/${c.acc}/${id}/list?page_number=1&page_size=500&${q}`); const d = r.body?.Data || [];
  const bad = d.filter((x) => /ACCEPT-TEST|PROBE|refcheck/i.test(JSON.stringify(x)));
  console.log(id.replace(/ITPMD_|_A00/g, "").padEnd(24), "records", String(d.length).padStart(3), " test/probe leftovers:", bad.length, bad.map((x) => x._id).join(","));
  await sleep(350);
}
