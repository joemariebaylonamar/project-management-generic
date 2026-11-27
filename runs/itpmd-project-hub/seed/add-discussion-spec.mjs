// Adds the three Project Discussions forms (+ their lists and role permissions) to the app-spec.
// Idempotent: re-running replaces the entries instead of duplicating them.
import { readFileSync, writeFileSync } from "node:fs";
const file = new URL("../app-spec.json", import.meta.url);
const s = JSON.parse(readFileSync(file, "utf8"));

const projectRef = (required) => ({ id: "project", name: "Project", type: "Reference", required, ref: "itpmd_project", lookup: [{ name: "Project_Name", id: "project_name" }] });
const forms = [
  { id: "itpmd_discussion_message", name: "ITPMD Discussion Message", flowType: "Form", _child_tables_lowered: [], fields: [
    projectRef(true),
    { id: "author", name: "Author", type: "User", required: true },
    { id: "sent_at", name: "Sent_At", type: "DateTime", required: true },
    { id: "message_text", name: "Message_Text", type: "Textarea", required: true },
    { id: "linked_item_type", name: "Linked_Item_Type", type: "Select", required: false, referredList: "itpmd_discussion_link_type" },
    { id: "linked_item", name: "Linked_Item", type: "Text", required: false },
    { id: "mentioned_users", name: "Mentioned_Users", type: "Text", required: false },
  ] },
  { id: "itpmd_notification", name: "ITPMD Notification", flowType: "Form", _child_tables_lowered: [], fields: [
    { id: "recipient", name: "Recipient", type: "User", required: true },
    { id: "notification_type", name: "Notification_Type", type: "Select", required: true, referredList: "itpmd_notification_type" },
    { id: "title", name: "Title", type: "Text", required: true },
    { id: "detail", name: "Detail", type: "Textarea", required: false },
    { id: "link_target", name: "Link_Target", type: "Text", required: false },
    projectRef(false),
    { id: "is_read", name: "Is_Read", type: "Boolean", required: false, default: false },
  ] },
  { id: "itpmd_discussion_read", name: "ITPMD Discussion Read", flowType: "Form", _child_tables_lowered: [], fields: [
    { id: "reader", name: "Reader", type: "User", required: true },
    projectRef(true),
    { id: "last_read_at", name: "Last_Read_At", type: "DateTime", required: true },
  ] },
];
const lists = [
  { id: "itpmd_discussion_link_type", name: "ITPMD Discussion Link Type", items: ["Activity", "Issue"] },
  { id: "itpmd_notification_type", name: "ITPMD Notification Type", items: ["Mention", "Assignment", "Approval", "Alert"] },
];
const ids = new Set(forms.map((f) => f.id));
const listIds = new Set(lists.map((l) => l.id));
s.forms = [...s.forms.filter((f) => !ids.has(f.id)), ...forms];
s.lists = [...s.lists.filter((l) => !listIds.has(l.id)), ...lists];
s.permissions = [...s.permissions.filter((p) => !ids.has(p.model)),
  ...s.roles.flatMap((r) => forms.map((f) => ({ role: r.name, model: f.id, level: "Editable", scope: "all" })))];
writeFileSync(file, JSON.stringify(s, null, 2) + "\n");
console.log(`app-spec: +${forms.length} forms, +${lists.length} lists, ${s.roles.length * forms.length} permissions`);
