import { call, c, q } from "./kf.mjs";
const P = `/process/2/${c.acc}/ITPMD_Project_Status_Report_A00`;
const l = await call("GET", `${P}/myitems?page_number=1&page_size=100&apply_preference=false&${q}`);
for (const x of l.body?.Data || []) console.log(x._id, x._status, "/", x._current_step, "| project:", x.project?.project_name, "| overall:", x.overall_health, "| sponsor req:", x.sponsor_approval_required, "| assigned:", JSON.stringify(x._current_assigned_to)?.slice(0, 80));
