import { call, c, q, sleep } from "./kf.mjs";
const P = `/process/2/${c.acc}/ITPMD_Project_Status_Report_A00`;
// 1) my stray empty Draft
let r = await call("DELETE", `${P}/PkEH0wK8iAMc?${q}`, undefined, 1); console.log("delete draft", r.status, JSON.stringify(r.body).slice(0, 200)); await sleep(500);
if (r.status >= 300) { r = await call("DELETE", `${P}/PkEH0wK8iAMc/PkEH0wKCNnt8?${q}`, undefined, 1); console.log("delete draft (with aiid)", r.status, JSON.stringify(r.body).slice(0, 200)); await sleep(500); }
// 2) the two ACCEPT-TEST in-progress items: try withdraw (initiator action)
for (const [id, aiid] of [["PkEGtlASsP7u","PkEGtlAZXkHG"],["PkEGtj2c_B95","PkEGtj2ghB11"]]) {
  for (const [m, p, b] of [["POST", `${P}/${id}/withdraw?${q}`, { Comment: "Test data cleanup" }], ["POST", `${P}/${id}/${aiid}/withdraw?${q}`, { Comment: "Test data cleanup" }]]) {
    const x = await call(m, p, b, 1); console.log(id, "withdraw", p.split(id)[1].split("?")[0], x.status, JSON.stringify(x.body).slice(0, 160)); await sleep(500); if (x.status < 300) break;
  }
}
const l = await call("GET", `${P}/myitems?page_number=1&page_size=100&apply_preference=false&${q}`);
console.log("remaining:", (l.body?.Data || []).map((x) => `${x._id} ${x._status}/${x._current_step}`));
