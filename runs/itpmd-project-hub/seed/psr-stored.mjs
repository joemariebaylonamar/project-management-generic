import { call, c, q } from "./kf.mjs";
const P = `/process/2/${c.acc}/ITPMD_Project_Status_Report_A00`;
const id = process.argv[2];
const l = await call("GET", `${P}/myitems?page_number=1&page_size=50&apply_preference=false&${q}`);
const it = (l.body?.Data || []).find((x) => x._id === id); console.log("list item project:", JSON.stringify(it?.project), "| step:", it?._current_step, "| status:", it?._status);
const d = (await call("GET", `${P}/${id}/${it._activity_instance_id}?${q}`)).body;
console.log(JSON.stringify({ project: d.project?.project_name, pid: d.project?._id, period: d.reporting_period_month, overall: d.overall_health, sched: d.schedule_health, cost: d.cost_health, risk: d.risk_health, issue: d.issue_health, pct: d.weighted_percent_complete, budget: d.current_approved_budget, actual: d.total_actual_cost, forecast: d.total_forecast_cost, contingency: d.contingency_remaining, psReq: d.ps_approval_required, sponsorReq: d.sponsor_approval_required, pm: d.RoEGt7NaqKtv?.Name, dh: d.RoEGt7OXkCaE?.Name }, null, 1));
