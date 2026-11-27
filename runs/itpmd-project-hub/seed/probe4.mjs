import { call, c, q, sleep } from "./kf.mjs";
const F = `/form/2/${c.acc}/ITPMD_Holiday_Calendar_A00`;
const tries = [
  ["POST", `${F}?${q}`, { holiday_name: "PROBE a", holiday_date: "2026-12-25" }],
  ["POST", `${F}/batch?${q}`, [{ holiday_name: "PROBE b", holiday_date: "2026-12-25", _is_created: true }]],
  ["POST", `${F}/batch?${q}`, [{ Holiday_Name: "PROBE c", Holiday_Date: "2026-12-25" }]],
];
for (const [m, p, b] of tries) { const r = await call(m, p, b, 1); console.log(r.status, JSON.stringify(r.body).slice(0, 260)); await sleep(500); }
