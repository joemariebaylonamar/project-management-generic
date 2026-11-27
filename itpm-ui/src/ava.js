// Deterministic checks provide evidence to AVA; they never change project records.
const closed = (s) => ["closed", "resolved", "done", "completed", "cancelled"].includes(String(s || "").toLowerCase());
const date = (s) => /^\d{4}-\d{2}-\d{2}/.test(String(s || "")) ? String(s).slice(0, 10) : "";
const label = (x) => `${x.id}: ${x.name || x.title || x.text || "Untitled"}`;
const ownerMissing = (id, valid) => !id || (valid && !valid.includes(id));
const fmt = (n) => Number.isFinite(Number(n)) ? `${Number(n).toFixed(1)}%` : "not available";

export function reviewProject(p, { today, health = {}, validUserIds, staleDays = 7 } = {}) {
  const findings = [];
  const add = (item, tab, kind, severity, reason, action) => findings.push({ id: item.id || p.id, label: label(item), tab, kind, severity, reason, action });
  const acts = p.activities || [];
  let unverifiedUpdates = 0;
  if (!acts.length) add(p, "schedule", "empty", "warning", "No schedule activities are recorded.", "Add a schedule before assessing delivery health.");
  for (const a of acts.filter(x => +x.pct < 100)) {
    if (ownerMissing(a.owner, validUserIds)) add(a, "schedule", "owner", "warning", "No active owner is recorded.", "Assign an owner and request a progress update.");
    if (!date(a.fFinish)) add(a, "schedule", "date", "warning", "Forecast finish is missing.", "Confirm the expected finish date.");
    else if (a.fFinish < today) add(a, "schedule", "overdue", "critical", `${a.ms ? "Milestone" : "Activity"} is ${+a.pct || 0}% complete after its forecast finish (${a.fFinish}).`, "Confirm the blocker and agree a recovery date.");
    const updated = date(a.updatedAt);
    if (!updated || updated > today) unverifiedUpdates++;
    else if ((Date.parse(today) - Date.parse(updated)) / 86400000 > staleDays) add(a, "schedule", "stale", "warning", `Last recorded update was ${updated}.`, "Request a current progress update from the owner.");
    if (+a.pct > 0 && !date(a.aStart)) add(a, "schedule", "actual", "warning", "Progress is recorded without an actual start date.", "Confirm the actual start date.");
  }
  for (const i of (p.issues || []).filter(x => !closed(x.status))) {
    if (ownerMissing(i.owner, validUserIds)) add(i, "issues", "owner", "warning", "Open issue has no active owner.", "Assign someone to resolve the issue.");
    if (!date(i.target)) add(i, "issues", "date", "warning", "Open issue has no target resolution date.", "Agree a target date with the issue owner.");
    else if (i.target < today) add(i, "issues", "overdue", "critical", `Open issue passed its target (${i.target}).`, "Review the resolution plan and escalation need.");
    for (const a of (i.actions || []).filter(x => !closed(x.status))) {
      if (date(a.due) && a.due < today) add({ ...a, id: a.id || i.id }, "issues", "overdue", "critical", `Action is overdue (${a.due}).`, "Follow up with the action owner.");
    }
  }
  for (const k of (p.risks || []).filter(x => !closed(x.status))) {
    if (ownerMissing(k.owner, validUserIds)) add(k, "risks", "owner", "warning", "Open risk has no active owner.", "Assign a risk owner.");
    if (!String(k.mit || "").trim() || /^(to be defined|tbd|none|n\/a)$/i.test(String(k.mit).trim())) add(k, "risks", "mitigation", "warning", `Risk has no mitigation plan (rating ${(+k.p || 0) * (+k.i || 0)}).`, "Define a mitigation and review date with the risk owner.");
  }
  findings.sort((a, b) => (a.severity === "critical" ? 0 : 1) - (b.severity === "critical" ? 0 : 1));
  return { projectId: p.id, projectCode: p.code, projectName: p.name, asOf: today, health: acts.length ? health.overall : null, reasons: health.reasons || [], findings, unverifiedUpdates, ready: acts.length > 0 && !findings.length };
}

export function draftNarrative(p, { today, period, health = {} }) {
  const start = `${period.y}-${String(period.m).padStart(2, "0")}-01`;
  const nextStart = new Date(Date.UTC(period.y, period.m, 1)).toISOString().slice(0, 10);
  const nextEnd = new Date(Date.UTC(period.y, period.m + 1, 0)).toISOString().slice(0, 10);
  const acts = p.activities || [];
  const done = acts.filter(a => +a.pct >= 100 && date(a.aFinish) >= start && date(a.aFinish) < nextStart && date(a.aFinish) <= today);
  const active = acts.filter(a => +a.pct > 0 && +a.pct < 100);
  const upcoming = acts.filter(a => +a.pct < 100 && date(a.fStart) && date(a.fFinish) && a.fStart <= nextEnd && a.fFinish >= nextStart);
  const openIssues = (p.issues || []).filter(i => !closed(i.status));
  const sc = health.sc || {};
  const progress = health.sc ? ` Current recorded completion is ${fmt(sc.complete)} against ${fmt(sc.expected)} planned as of ${today}.` : " Schedule progress is not available; confirm before reporting.";
  return {
    acc: `${done.length ? `Completed this reporting period: ${done.map(label).join("; ")}.` : "No completed activities are recorded for this reporting period through today."}${active.length ? ` In progress: ${active.map(a => `${label(a)} (${+a.pct}%)`).join("; ")}.` : ""}${progress}`,
    next: upcoming.length ? `Next period: ${upcoming.map(a => `${label(a)} (forecast ${a.fStart} to ${a.fFinish})`).join("; ")}.` : "No activities are scheduled for the next reporting period; confirm the plan with the project team.",
    issues: `${openIssues.length ? `Open issues: ${openIssues.map(i => `${label(i)} (target ${date(i.target) || "not recorded"})`).join("; ")}.` : "No open issues are recorded."}${(health.reasons || []).length ? ` Health factors: ${health.reasons.join("; ")}.` : ""}`
  };
}
