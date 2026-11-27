import { call, c, q, sleep } from "./kf.mjs";
const ids = ["fb4b9519-47a9-428a-a38e-27979872d215","c6ec4f38-26cc-42ca-97fb-323918606a46","80ae2589-aa6e-4900-a23b-444efdd3671e","5056d4b1-dd0b-494b-bff9-c25c270276ee","c168b0b6-7583-48cf-8fff-1cf428fb970b","ff96e06e-c0c8-4914-803c-79c6cf01aa1e","b50b0c2f-b77f-44e4-989a-436bff9533ef","9c6cb63c-c738-47f8-b7d8-71b246ceec48","ca44fd39-4d5a-49f5-b23d-49b7b2be6375","55fd43fb-b252-453b-9c3f-f621521c1340"];
const base = `/metadata/2/${c.acc}/application/ITPMD_Project_Hub_A00/page`;
for (const id of ids) {
  const d = await call("GET", `${base}/${id}/draft?${q}`, undefined, 1); await sleep(400);
  const s = await call("GET", `${base}/${id}/schema?${q}`, undefined, 1); await sleep(400);
  console.log(id.slice(0, 8), "draft", d.status, (d.body?.error_code || ""), "| schema", s.status, (s.body?.error_code || ""));
}
