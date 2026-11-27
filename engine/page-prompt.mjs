// page-prompt.mjs — assemble the PageDesigner prompt for THIS LLM (Claude) using Kissflow's own
// SYSTEM_PROMPT verbatim, plus the two things their hosted pipeline supplies internally:
//   1. REAL flow context (the SharedFlowResolver + FlowContextBuilder stages) — real flow ids, real
//      FIELD ids, and the reports that actually exist. Injecting these is why our pages never contain
//      the stub/hallucinated bindings the hosted generator emits.
//   2. A role brief (their wrapper only passes "User Request" + RoleId).
//
// The system prompt is vendored byte-faithfully at vendor/page_designer_prompt.txt (doubled braces
// unescaped — it is a .format template at rest; the surviving {{item.field}} are binding placeholders).
// We do NOT edit it: all of our additions live in the USER message, mirroring their own wrapper
// (`Page ID / Application ID / Role IDs / User Request / Build this page exactly as described above`).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ENGINE_DIR = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = join(ENGINE_DIR, "vendor", "page_designer_prompt.txt");

export function systemPrompt() {
  return readFileSync(PROMPT_PATH, "utf8");
}

// Archetype briefs — the differentiation lever. The hosted generator makes every role the same
// stat-row → chart → table page; naming the role's JOB shape is what makes the layouts diverge.
export const ARCHETYPE_BRIEF = {
  approver:
    "This role APPROVES other people's work. Make the decision queue the HERO of the page: put the " +
    "ProcessTable bound to viewId \"mytasks\" first and give it real height so a reviewer can work " +
    "straight from it. Do NOT put a create/New button on this page — approvers do not initiate. " +
    "Supporting metrics and one or two charts belong BELOW the queue, not above it.",
  initiator:
    "This role RAISES requests. Lead with the create action: a primary \"New <flow>\" button in the " +
    "header opening a popup that contains a FormView for that flow. Then show the person their OWN " +
    "work — a ProcessTable bound to viewId \"myitems\" — and a light read on their submissions.",
  operations:
    "This role RUNS the day-to-day across several flows. Favour breadth: a Tab component with one " +
    "table per flow it operates, plus throughput/aging analytics. Keep metrics compact so the work " +
    "queues dominate.",
  admin:
    "This role CURATES master and reference data. Favour management surfaces: DataformTable per master " +
    "list with create enabled, minimal analytics. This is a console for maintaining data, not a KPI wall.",
};

const fieldLine = (f) => `${f.id} (${f.type})`;

// Render the app's REAL flows so the model can only bind to things that exist.
export function flowContextBlock(flows) {
  return flows.map((f) => {
    const key = f.type === "Process" ? `processId: ${f.id}` : `formId: ${f.id}`;
    const reports = (f.reports || []).length
      ? (f.reports || []).map((r) => `    - reportId: ${r.id}  ("${r.name}")`).join("\n")
      : "    - (none — do NOT use a ChartReport for this flow)";
    return `### ${f.name}  —  ${key}   [${f.type}]\n` +
      `  Fields (use these EXACT ids):\n    ${(f.fields || []).map(fieldLine).join(", ") || "(none)"}\n` +
      `  Existing reports:\n${reports}`;
  }).join("\n\n");
}

/**
 * Build {system, user} for a page design request.
 * @param {object} o
 * @param {Array}  o.flows    from buildFlowContext() — real ids, fields, reports
 * @param {object} o.counts   { [flowId]: number|null } REAL record counts (null = unknown)
 * @param {string} o.role     role display name
 * @param {string} o.archetype approver|initiator|operations|admin
 * @param {string} o.appId, o.appName, o.pageId, o.pageName
 * @param {string} [o.extra]  any additional instruction from the caller
 */
export function buildDesignerPrompt({ flows, counts = {}, role, archetype, appId, appName, pageId, pageName, extra = "" }) {
  const countLines = flows.map((f) => `  - ${f.name}: ${counts[f.id] == null ? "UNKNOWN" : counts[f.id]}`).join("\n");
  const user =
`Page ID: ${pageId}
Application ID: ${appId}
Application: ${appName}
Role: ${role}

## Flows available in THIS application
Bind every data widget to one of these, using the EXACT ids below. Never invent a flow, a field id, or
a report id — anything not listed here does not exist and will fail to render.

${flowContextBlock(flows)}

## Reports
Use ONLY the existing reportIds listed above (report.reportId). Do NOT use "report.generate" — creating
new reports is not available in this pipeline, so a generated report renders as an unconfigured widget.
If a flow has no report, do not put a ChartReport on it.

## Real record counts (as of now)
${countLines}
A Card's "count" is static and can never be live, so it must be TRUE at build time: use the real number
above. Where a count is UNKNOWN, use "—". Never invent a plausible-looking figure.

## Role brief
${ARCHETYPE_BRIEF[archetype] || ARCHETYPE_BRIEF.initiator}

## Page
Name: "${pageName}"
Design this page for the ${role}. Make it visually modern and distinct to this role's job — do not
produce the same generic stat-row + chart + table layout you would give every other role.
${extra}

Build this page exactly as described above.`;
  return { system: systemPrompt(), user };
}
