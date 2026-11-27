// Phase 6 (BPI admin + reports): templates and saved report definitions in one form; the Hub Administrator can create
// projects and tasks (ADM004). Idempotent.
import { readFileSync, writeFileSync } from "node:fs";
const file = new URL("../app-spec.json", import.meta.url);
const s = JSON.parse(readFileSync(file, "utf8"));
const form = { id: "itpmd_template", name: "ITPMD Template", flowType: "Form", _child_tables_lowered: [], fields: [
  { id: "template_name", name: "Template_Name", type: "Text", required: true },
  { id: "template_type", name: "Template_Type", type: "Select", required: true, referredList: "itpmd_template_type" },
  { id: "description", name: "Description", type: "Textarea", required: false },
  { id: "is_default", name: "Is_Default", type: "Boolean", required: false },
  { id: "content_json", name: "Content_Json", type: "Textarea", required: false },
] };
const list = { id: "itpmd_template_type", name: "ITPMD Template Type", items: ["Workplan", "WSR", "Dashboard", "Report"] };
s.forms = [...s.forms.filter((f) => f.id !== form.id), form];
s.lists = [...s.lists.filter((l) => l.id !== list.id), list];
s.permissions = s.permissions.filter((p) => p.model !== form.id && !(p.role === "Hub Administrator" && (p.model === "itpmd_project" || p.model === "itpmd_activity")));
for (const r of s.roles) s.permissions.push({ role: r.name, model: form.id, level: "Editable", scope: "all" });
for (const m of ["itpmd_project", "itpmd_activity"]) s.permissions.push({ role: "Hub Administrator", model: m, level: "Editable", scope: "all" });
writeFileSync(file, JSON.stringify(s, null, 2) + "\n");
console.log(`forms=${s.forms.length} permissions=${s.permissions.length}`);
