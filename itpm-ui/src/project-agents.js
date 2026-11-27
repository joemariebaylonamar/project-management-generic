import { createAvaAgent } from "./ava-agent.js";

export function createAgentConnections(kf, { account, app, ids = {}, storage } = {}) {
  return Object.fromEntries(["ava", "ari", "theo"].map(name => {
    const key = `${account}:${app}:${name}-agent-id`;
    let id = ids[name] || "";
    try { id = storage?.getItem(key) || id; } catch {}
    let client = createAvaAgent(kf, id);
    return [name, {
      getId: () => id,
      connect: () => client.connect(),
      run: (...args) => client.run(...args),
      read: (...args) => client.read(...args),
      async configure(next) {
        if (!/^Ag[A-Za-z0-9_]+$/.test(next)) throw new Error("Enter a published Agent ID.");
        const candidate = createAvaAgent(kf, next);
        await candidate.connect();
        id = next; client = candidate;
        try { storage?.setItem(key, id); } catch {}
      }
    }];
  }));
}

export function canBriefApproval(p, r, actor) {
  if (!p || !r || !actor?.advanced || !actor.userId || !r.snap) return false;
  return (r.status === "Submitted" && actor.role === "DH" && p.dh === actor.userId)
    || (r.status === "For PS Approval" && actor.role === "PS" && p.ps === actor.userId);
}

export function approvalContext(p, r, actor, { today, current = null } = {}) {
  if (!canBriefApproval(p, r, actor)) throw new Error("This report is not assigned to you for review.");
  const red = r.snap.health?.overall === "R";
  return JSON.parse(JSON.stringify({
    agent: "theo", today, mode: "advanced", role: actor.role, may_propose_psr: false,
    project: { id: p.id, code: p.code, name: p.name },
    report: { id: r.id, period: r.period, status: r.status, snapshot: r.snap, narrative: r.narrative, history: r.history || [] },
    routing: { sponsorRequired: !!p.psRequired || red, reason: p.psRequired ? "Project requires Sponsor approval for every PSR." : red ? "Saved PSR health is Red." : "Sponsor approval is not required for this PSR." },
    current_review: current,
    evidence_boundary: "Report snapshot is saved report evidence. Current review is later project data, not a replacement for the report. The assigned person decides Approve or Return with comments."
  }));
}

export function approvalBrief(context) {
  const { report, routing, current_review: current } = context;
  const health = { R: "Red", A: "Amber", G: "Green" }[report.snapshot.health?.overall] || "not available";
  const comments = report.history.filter(x => x.comment).map(x => `${x.action || "Review"}: ${x.comment}`);
  return [
    `Saved PSR ${report.id}: ${report.status}; recorded health ${health}.`,
    ...(report.snapshot.health?.reasons || []).map(x => `Saved health factor: ${x}`),
    `Sponsor routing: ${routing.reason}`,
    ...comments.map(x => `Review history: ${x}`),
    current ? `Current project checks (separate from saved PSR): ${current.findings.length} findings; ${current.unverifiedUpdates} open activities without a verifiable update date.` : "Current source checks were not supplied.",
    "Confirm the narrative against the saved report and follow up unresolved questions. You decide Approve or Return to PM with comments. This brief does not record a decision."
  ].join("\n\n");
}
