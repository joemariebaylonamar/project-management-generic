// Adds the WBS fields (item type, parent, acceptance, sibling order) to the Activity form in the app-spec.
// Idempotent: re-running replaces the entries instead of duplicating them.
import { readFileSync, writeFileSync } from "node:fs";
const file = new URL("../app-spec.json", import.meta.url);
const s = JSON.parse(readFileSync(file, "utf8"));
const act = s.forms.find((f) => f.id === "itpmd_activity");
if (!act) throw new Error("itpmd_activity not found in app-spec");
const add = [
  { id: "item_type", name: "Item_Type", type: "Select", required: false, referredList: "itpmd_wbs_item_type" },
  { id: "parent_code", name: "Parent_Code", type: "Text", required: false },
  { id: "deliverable_accepted", name: "Deliverable_Accepted", type: "Boolean", required: false, default: false },
  { id: "accepted_date", name: "Accepted_Date", type: "Date", required: false },
  { id: "sort_order", name: "Sort_Order", type: "Number", required: false },
  { id: "planned_cost", name: "Planned_Cost", type: "Currency", required: false, default: 0, currency: "PHP" },
  { id: "actual_cost", name: "Actual_Cost", type: "Currency", required: false, default: 0, currency: "PHP" },
];
const ids = new Set(add.map((f) => f.id));
act.fields = [...act.fields.filter((f) => !ids.has(f.id)), ...add];
if (!act.fields.some((f) => f.id === "is_summary")) throw new Error("expected is_summary on itpmd_activity");
const list = { id: "itpmd_wbs_item_type", name: "ITPMD WBS Item Type", items: ["Phase", "Deliverable", "Task", "Subtask", "Milestone"] };
s.lists = [...s.lists.filter((l) => l.id !== list.id), list];
writeFileSync(file, JSON.stringify(s, null, 2) + "\n");
console.log(`app-spec: itpmd_activity +${add.length} fields, +1 list`);
