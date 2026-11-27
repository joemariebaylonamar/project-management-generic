import { call, c, q, sleep } from "./kf.mjs";
const ids = ["PSR_submitted_notify_Department_He_A00","PSR_DH_approved_sponsor_required_n_A00","PSR_returned_at_DH_Review_notify_P_A00","PSR_returned_at_Sponsor_Approval_n_A00","PSR_Approved_locked_notify_PM_A00","PSR_deadline_reminders_3_day_1_day_A00","Activity_assigned_reassigned_notif_A00","Activity_forecast_past_baseline_Re_A00","Action_item_created_assigned_notif_A00","Action_item_Overdue_auto_notify_As_A00","Issue_Escalated_auto_notify_Issue__A00","Risk_escalated_High_Critical_notif_A00"];
for (const id of ids) {
  const d = await call("GET", `/metadata/2/${c.acc}/integration/${id}/draft`, undefined, 2);
  const b = d.body || {};
  const vals = Object.values(b);
  const props = vals.filter((v) => v && v.Kind === "Property");
  const trig = vals.find((v) => v && v.Kind === "Trigger"), act = vals.find((v) => v && v.Kind === "Action");
  const empty = props.filter((p) => p.Value === undefined || p.Value === "" || p.Value === null || (Array.isArray(p.Value) && !p.Value.length));
  console.log(id.slice(0, 40).padEnd(42), d.status, "| trigger:", trig?.Name || "?", "| action:", act?.Name || "?", "| props", props.length, "| empty:", empty.map((p) => p.Name || p.Id).join(",") || "-");
  await sleep(300);
}
const one = await call("GET", `/metadata/2/${c.acc}/integration/${ids[0]}/draft`, undefined, 1);
console.log("keys of first:", Object.values(one.body || {}).map((v) => v?.Kind).filter(Boolean).reduce((m, k) => ((m[k] = (m[k] || 0) + 1), m), {}));
