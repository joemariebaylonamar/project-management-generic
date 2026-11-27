// Phase 5 (BPI dashboards): MVP/Release form (DAS008), project status recorded on each weekly report (DAS002 history),
// and the extra lifecycle statuses (Ongoing, Completed, Implemented, Cancelled). Idempotent.
import { readFileSync, writeFileSync } from "node:fs";
const file = new URL("../app-spec.json", import.meta.url);
const s = JSON.parse(readFileSync(file, "utf8"));
const form = { id: "itpmd_release", name: "ITPMD Release", flowType: "Form", _child_tables_lowered: [], fields: [
  { id: "project", name: "Project", type: "Reference", required: true, ref: "itpmd_project", lookup: [{ name: "Project_Name", id: "project_name" }] },
  { id: "release_name", name: "Release_Name", type: "Text", required: true },
  { id: "is_mvp", name: "Is_MVP", type: "Boolean", required: false },
  { id: "planned_date", name: "Planned_Date", type: "Date", required: true },
  { id: "forecast_date", name: "Forecast_Date", type: "Date", required: false },
  { id: "implemented_date", name: "Implemented_Date", type: "Date", required: false },
  { id: "notes", name: "Notes", type: "Textarea", required: false },
] };
s.forms = [...s.forms.filter((f) => f.id !== form.id), form];
s.permissions = s.permissions.filter((p) => p.model !== form.id);
for (const r of s.roles) s.permissions.push({ role: r.name, model: form.id, level: "Editable", scope: "all" });
const wk = s.forms.find((f) => f.id === "itpmd_weekly_report");
if (!wk.fields.some((f) => f.id === "project_status")) wk.fields.push({ id: "project_status", name: "Project_Status", type: "Text", required: false });
const lst = s.lists.find((l) => l.id === "itpmd_project_status");
for (const it of ["Ongoing", "Completed", "Implemented", "Cancelled"]) if (!lst.items.includes(it)) lst.items.push(it);
writeFileSync(file, JSON.stringify(s, null, 2) + "\n");
console.log(`forms=${s.forms.length} project_status items=${lst.items.join(", ")}`);
