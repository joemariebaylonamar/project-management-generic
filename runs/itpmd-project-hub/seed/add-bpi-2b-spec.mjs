// Phase 2b (BPI): TPMO role, Baseline snapshot + Program forms, Project.program / Project.active_baseline.
// Idempotent: re-running replaces the entries instead of duplicating them.
import { readFileSync, writeFileSync } from "node:fs";
const file = new URL("../app-spec.json", import.meta.url);
const s = JSON.parse(readFileSync(file, "utf8"));

const projectRef = (required) => ({ id: "project", name: "Project", type: "Reference", required, ref: "itpmd_project", lookup: [{ name: "Project_Name", id: "project_name" }] });
const forms = [
  { id: "itpmd_baseline", name: "ITPMD Baseline", flowType: "Form", _child_tables_lowered: [], fields: [
    projectRef(true),
    { id: "version", name: "Version", type: "Number", required: true },
    { id: "set_date", name: "Set_Date", type: "Date", required: true },
    { id: "set_by", name: "Set_By", type: "User", required: false },
    { id: "note", name: "Note", type: "Text", required: false },
    { id: "rows_json", name: "Rows_Json", type: "Textarea", required: false },
  ] },
  { id: "itpmd_program", name: "ITPMD Program", flowType: "Form", _child_tables_lowered: [], fields: [
    { id: "program_name", name: "Program_Name", type: "Text", required: true },
    { id: "segment", name: "Segment", type: "Text", required: false },
    { id: "description", name: "Description", type: "Textarea", required: false },
    { id: "program_manager", name: "Program_Manager", type: "User", required: false },
  ] },
];
const ids = new Set(forms.map((f) => f.id));

// role
if (!s.roles.some((r) => r.name === "TPMO")) s.roles.push({ id: "tpmo", name: "TPMO" });

// forms (new) + extra fields on the project form
s.forms = [...s.forms.filter((f) => !ids.has(f.id)), ...forms];
const proj = s.forms.find((f) => f.id === "itpmd_project");
const extra = [
  { id: "program", name: "Program", type: "Reference", required: false, ref: "itpmd_program", lookup: [{ name: "Program_Name", id: "program_name" }] },
  { id: "active_baseline", name: "Active_Baseline", type: "Number", required: false },
];
proj.fields = [...proj.fields.filter((f) => !extra.some((e) => e.id === f.id)), ...extra];

// permissions: every hub role gets Editable on the new forms; TPMO = union of PSC Member + Hub Administrator on existing forms
const hub = s.roles.map((r) => r.name);
s.permissions = s.permissions.filter((p) => !ids.has(p.model) && p.role !== "TPMO");
const tpmoBase = s.permissions.filter((p) => p.role === "PSC Member" || p.role === "Hub Administrator");
const seen = new Set();
for (const p of tpmoBase) { if (seen.has(p.model)) continue; seen.add(p.model); s.permissions.push({ role: "TPMO", model: p.model, level: "Editable", scope: "all" }); }
for (const r of hub) for (const f of forms) s.permissions.push({ role: r, model: f.id, level: "Editable", scope: "all" });

writeFileSync(file, JSON.stringify(s, null, 2) + "\n");
console.log(`app-spec: roles=${s.roles.length} forms=${s.forms.length} permissions=${s.permissions.length}`);
