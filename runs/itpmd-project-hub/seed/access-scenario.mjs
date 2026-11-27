import { readFileSync } from "node:fs";
import { call, c, q, ME, sleep } from "./kf.mjs";
const ids = JSON.parse(readFileSync(new URL("./seeded-ids.json", import.meta.url))).projects;
const people = await call("GET", `/user/2/${c.acc}?page_size=50`);
const charu = (Array.isArray(people.body) ? people.body : []).find((p) => /charu/i.test(p.Email + p.Name));
console.log("Charu:", charu?._id, charu?.Email);
const CH = { _id: charu._id, Name: charu.Name, Kind: "User" };
const mode = process.argv[2];
const F = (id) => `/form/2/${c.acc}/ITPMD_Project_A00/${id}?${q}`;
if (mode === "set") {
  console.log("Loan → PM Charu", (await call("POST", F(ids.P1), { RoEGt7NaqKtv: CH })).status);
  await sleep(400);
  console.log("Branch → DH Charu", (await call("POST", F(ids.P2), { RoEGt7OXkCaE: CH })).status);
} else {
  console.log("Loan → PM me", (await call("POST", F(ids.P1), { RoEGt7NaqKtv: ME })).status);
  await sleep(400);
  console.log("Branch → DH me", (await call("POST", F(ids.P2), { RoEGt7OXkCaE: ME })).status);
}
