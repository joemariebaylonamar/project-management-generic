import fs from "node:fs";
const spec = JSON.parse(fs.readFileSync("../../app-spec.json", "utf8"));
const B = JSON.parse(fs.readFileSync("phaseB.json", "utf8"));
export function compare() {
  const roles = spec.roles.map((r) => r.name);
  const grant = new Map(spec.permissions.map((p) => [p.role + "::" + p.model, p]));
  const res = {};
  for (const f of spec.forms.filter((x) => !x.childOf)) {
    const fam = B.acl[f.id].fam; const members = B.acl[f.id].members || [];
    for (const role of roles) {
      const live = members.find((m) => m.name === role);
      const g = grant.get(role + "::" + f.id);
      let expect = g ? (g.level === "Editable" ? "edit" : "read") : "none";
      let actual = "none";
      if (live) {
        const perm = live.perm || [];
        if (fam === "form") actual = perm.includes("Delete") ? "edit" : live.role === "Viewer" ? "read" : "edit?";
        else if (fam === "process") actual = perm.includes("InitiateItems") ? "edit" : perm.includes("View") ? "read" : "?";
        else actual = live.role === "Viewer" ? "read" : "edit";
      }
      res[role + "::" + f.id] = { expect, actual, live: live ? `${live.role}[${(live.perm || []).join(",")}]` : "-" };
    }
  }
  return res;
}
if (process.argv[1].endsWith("acl-compare.mjs")) {
  const r = compare(); const bad = Object.entries(r).filter(([, v]) => v.expect !== v.actual);
  const by = {}; for (const [k, v] of bad) { const key = v.expect + "->" + v.actual; (by[key] = by[key] || []).push(k); }
  console.log("total pairs", Object.keys(r).length, "mismatches", bad.length);
  for (const [k, v] of Object.entries(by)) console.log(k, v.length, v.map((x) => x.replace("::itpmd_", "::")).join("; "));
}
