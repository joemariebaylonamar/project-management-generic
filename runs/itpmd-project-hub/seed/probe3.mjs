import { call, c, q, ME, sleep } from "./kf.mjs";
const tries = [
  ["POST", `/form/2/${c.acc}/ITPMD_Project_A00/batch?${q}`, [{ project_name: "PROBE min" }]],
  ["POST", `/form/2/${c.acc}/ITPMD_Project_A00/?${q}`, { project_name: "PROBE min single" }],
  ["POST", `/form/2/${c.acc}/ITPMD_Holiday_Calendar_A00/batch?${q}`, [{ holiday_name: "PROBE", holiday_date: "2026-12-25" }]],
  ["POST", `/form/2/${c.acc}/ITPMD_Risk_A00/batch?${q}`, [{ risk_title: "PROBE risk", probability: 2, impact: 2 }]],
];
for (const [m, p, b] of tries) { const r = await call(m, p, b, 1); console.log(p.split("/").slice(4, 6).join("/"), r.status, JSON.stringify(r.body).slice(0, 220)); await sleep(500); }
