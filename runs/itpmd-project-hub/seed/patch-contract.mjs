import { readFileSync } from "node:fs";
import { call, c, q, sleep } from "./kf.mjs";
const S = JSON.parse(readFileSync(new URL("./proto-state.json", import.meta.url)));
const ids = JSON.parse(readFileSync(new URL("./seeded-ids.json", import.meta.url))).projects;
for (const p of S.projects) { const r = await call("POST", `/form/2/${c.acc}/ITPMD_Project_A00/${ids[p.id]}?${q}`, { contract_total: `${Math.round(p.contract)} PHP` }); console.log(p.code, r.status); await sleep(300); }
