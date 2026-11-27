import { readFileSync } from "node:fs";
import { call, c, q, sleep } from "./kf.mjs";
const map = JSON.parse(readFileSync(new URL("../id-map.json", import.meta.url))).genToServer;
const ids = Object.entries(map).filter(([k]) => /^auto_/.test(k));
console.log("integration ids in id-map:", ids.length);
const list = await call("GET", `/flow/2/${c.acc}/application/ITPMD_Project_Hub_A00/flow?page_number=1&page_size=500&${q}`);
const flows = Array.isArray(list.body) ? list.body : list.body?.Data || [];
const ints = flows.filter((f) => /integration/i.test(f.Type || f.FlowType || ""));
console.log("integrations in app:", ints.length);
for (const it of ints.slice(0, 12)) {
  const d = await call("GET", `/metadata/2/${c.acc}/integration/${it._id}/draft`, undefined, 2);
  const b = d.body || {};
  const props = Object.values(b).filter((v) => v && v.Kind === "Property");
  const empty = props.filter((p) => p.Value === undefined || p.Value === "" || p.Value === null).length;
  console.log(String(it.Name).slice(0, 52).padEnd(54), "IsActive:", it.IsActive, "| status:", it.Status, "| props:", props.length, "empty:", empty);
  await sleep(300);
}
