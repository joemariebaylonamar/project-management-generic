import { call, c, q, sleep } from "./kf.mjs";
const P = `/process/2/${c.acc}/ITPMD_Project_Status_Report_A00`;
for (const sfx of ["/InProgress", "/Draft", ""]) {
  const r = await call("GET", `${P}/myitems${sfx}?page_number=1&page_size=100&apply_preference=false&${q}`);
  console.log(`myitems${sfx || "(all)"}`, r.status, (r.body?.Data || []).map((x) => `${x._id} ${x._status}/${x._current_step} req=${x._request_number} aiid=${x._activity_instance_id}`));
  await sleep(400);
}
// admin view of everything
for (const p of [`${P}/admin/list?page_number=1&page_size=100&${q}`, `${P}/adminitems?page_number=1&page_size=100&${q}`, `${P}/list?page_number=1&page_size=100&${q}`]) {
  const r = await call("GET", p, undefined, 1); console.log(p.split(c.acc)[1].split("?")[0], r.status, JSON.stringify(r.body).slice(0, 120)); await sleep(300);
}
