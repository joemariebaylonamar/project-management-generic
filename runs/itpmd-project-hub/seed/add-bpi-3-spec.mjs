// Phase 3 (BPI project binder): one form for the register (PB003/PB004), CR tally (PB010), metrics log (PB013/PB014).
// Dependencies, defects and change requests are whole records here; a risk or issue keeps its own record and gets a linked
// entry (item_type Risk/Issue + linked_id) carrying the register fields it lacks. Idempotent.
import { readFileSync, writeFileSync } from "node:fs";
const file = new URL("../app-spec.json", import.meta.url);
const s = JSON.parse(readFileSync(file, "utf8"));
const sel = (id, name, list, required = false) => ({ id, name, type: "Select", required, referredList: list });
const txt = (id, name, required = false) => ({ id, name, type: "Text", required });
const area = (id, name) => ({ id, name, type: "Textarea", required: false });
const date = (id, name, required = false) => ({ id, name, type: "Date", required });
const user = (id, name) => ({ id, name, type: "User", required: false });
const form = { id: "itpmd_binder_item", name: "ITPMD Binder Item", flowType: "Form", _child_tables_lowered: [], fields: [
  { id: "project", name: "Project", type: "Reference", required: true, ref: "itpmd_project", lookup: [{ name: "Project_Name", id: "project_name" }] },
  sel("item_type", "Item_Type", "itpmd_binder_item_type", true),
  txt("linked_id", "Linked_Id"), txt("item_no", "Item_No"),
  area("description", "Event_Description"), sel("event_category", "Event_Category", "itpmd_event_category"), area("additional_info", "Additional_Info"),
  sel("priority", "Priority_Level", "itpmd_priority_level"), txt("milestone", "Milestone_Identified"),
  user("raised_by", "Raised_By"), date("date_assigned", "Date_Assigned"), txt("notification_source", "Initial_Notification_Source"),
  area("planned_actions", "Planned_Actions"), user("assigned_to", "Assigned_To"), txt("org_unit", "Org_Unit"),
  date("target_date", "Target_Date"), date("date_executed", "Date_Executed"),
  txt("action_item", "Action_Item"), sel("action_item_status", "Action_Item_Status", "itpmd_action_item_status"), area("action_result", "Results_Of_Action_Item"),
  sel("overall_status", "Overall_Status", "itpmd_binder_status"), date("last_status_update", "Last_Status_Update"),
  sel("cr_kind", "CR_Kind", "itpmd_cr_kind"), sel("cr_status", "CR_Status", "itpmd_cr_status"), date("cr_approval_date", "CR_Approval_Date"),
] };
const lists = [
  { id: "itpmd_binder_item_type", name: "ITPMD Binder Item Type", items: ["Risk", "Issue", "Dependency", "Defect", "Change Request"] },
  { id: "itpmd_event_category", name: "ITPMD Event Category", items: ["Technical", "Resource", "Schedule", "Budget", "Vendor", "Regulatory", "Scope", "Other"] },
  { id: "itpmd_action_item_status", name: "ITPMD Action Item Status", items: ["Open", "In Progress", "Done"] },
  { id: "itpmd_binder_status", name: "ITPMD Binder Status", items: ["Open", "In Progress", "Closed"] },
  { id: "itpmd_cr_kind", name: "ITPMD CR Kind", items: ["Reschedule", "Rebaseline", "Scope change", "Budget change", "Other"] },
  { id: "itpmd_cr_status", name: "ITPMD CR Status", items: ["Pending", "Approved", "Rejected"] },
];
s.forms = [...s.forms.filter((f) => f.id !== form.id), form];
const lid = new Set(lists.map((l) => l.id));
s.lists = [...s.lists.filter((l) => !lid.has(l.id)), ...lists];
s.permissions = s.permissions.filter((p) => p.model !== form.id);
for (const r of s.roles) s.permissions.push({ role: r.name, model: form.id, level: "Editable", scope: "all" });
writeFileSync(file, JSON.stringify(s, null, 2) + "\n");
console.log(`app-spec: forms=${s.forms.length} lists=${s.lists.length} permissions=${s.permissions.length}`);
