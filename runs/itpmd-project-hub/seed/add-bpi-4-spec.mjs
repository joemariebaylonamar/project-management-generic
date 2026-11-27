// Phase 4 (BPI weekly status report): one record per project per week with the nine qualitative fields (WSR010)
// and the frozen KPI/RAG figures the report and the weekly trend dashboards read (WSR004, DAS003). Idempotent.
import { readFileSync, writeFileSync } from "node:fs";
const file = new URL("../app-spec.json", import.meta.url);
const s = JSON.parse(readFileSync(file, "utf8"));
const area = (id, name) => ({ id, name, type: "Textarea", required: false });
const form = { id: "itpmd_weekly_report", name: "ITPMD Weekly Report", flowType: "Form", _child_tables_lowered: [], fields: [
  { id: "project", name: "Project", type: "Reference", required: true, ref: "itpmd_project", lookup: [{ name: "Project_Name", id: "project_name" }] },
  { id: "week_of", name: "Week_Of", type: "Date", required: true },
  area("weekly_summary", "Weekly_Summary_Highlights"), area("schedule_hl", "Schedule_Highlights"), area("budget_hl", "Budget_Highlights"),
  area("risks_issues_hl", "Risks_And_Issues_Highlights"), area("scope_hl", "Scope_Highlights"), area("defects_hl", "Defects_Highlights"),
  area("mgmt_attention", "Items_For_Management_Attention"), area("accomplishments", "Key_Accomplishments_For_The_Week"), area("next_week", "Activities_For_Next_Week"),
  { id: "report_status", name: "Report_Status", type: "Select", required: false, referredList: "itpmd_wsr_status" },
  { id: "schedule_kpi", name: "Schedule_KPI", type: "Number", required: false },
  { id: "kpi_rag", name: "KPI_RAG", type: "Text", required: false },
  { id: "overall_rag", name: "Overall_RAG", type: "Text", required: false },
  { id: "pct_actual", name: "Pct_Actual", type: "Number", required: false },
  { id: "pct_planned", name: "Pct_Planned", type: "Number", required: false },
  { id: "snapshot_json", name: "Snapshot_Json", type: "Textarea", required: false },
] };
const list = { id: "itpmd_wsr_status", name: "ITPMD WSR Status", items: ["Draft", "Final"] };
s.forms = [...s.forms.filter((f) => f.id !== form.id), form];
s.lists = [...s.lists.filter((l) => l.id !== list.id), list];
s.permissions = s.permissions.filter((p) => p.model !== form.id);
for (const r of s.roles) s.permissions.push({ role: r.name, model: form.id, level: "Editable", scope: "all" });
writeFileSync(file, JSON.stringify(s, null, 2) + "\n");
console.log(`app-spec: forms=${s.forms.length} lists=${s.lists.length} permissions=${s.permissions.length}`);
