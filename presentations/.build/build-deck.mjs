import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = "/Users/joemarieamar/kissflow/bpi/apps/bpi-itpm";
const runtime = "/Users/joemarieamar/.cache/codex-runtimes/codex-primary-runtime/dependencies";
const skill = "/Users/joemarieamar/.codex/plugins/cache/openai-primary-runtime/presentations/26.1110.11613/skills/presentations";
process.env.RUNTIME_NODE_MODULES = `${runtime}/node/node_modules`;
process.env.RUNTIME_NODE = `${runtime}/node/bin/node`;
process.env.RUNTIME_BIN_DIR = `${runtime}/bin`;
const { Presentation, PresentationFile } = await import(pathToFileURL(`${runtime}/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs`));
const { finalizePresentation } = await import(pathToFileURL(`${skill}/container_tools/artifact_tool_utils.mjs`));
const build = `${root}/presentations/.build`;
const out = `${root}/presentations/output`;
await fs.mkdir(`${build}/previews`, { recursive: true });
const p = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const C = { red: "#A9242A", dark: "#681C23", ink: "#272526", muted: "#645C5B", cream: "#FAF7F2", gold: "#B99948", white: "#FFFFFF" };
const src = `${root}/docs/Solutioning_Requirements_Elicitation.md`;
const delivery = `${root}/docs/superpowers/specs/2026-10-28-bpi-rebrand-and-gap-closure-design.md`;

function text(s, content, x, y, w, h, size = 26, color = C.ink, bold = false) {
  const sh = s.shapes.add({ geometry: "textbox", position: { left: x, top: y, width: w, height: h }, fill: "none", line: { fill: "none", width: 0 } });
  sh.text = content;
  sh.text.style = { fontFamily: "Arial", fontSize: size, color, bold, verticalAlignment: "top", insets: 0 };
  return sh;
}
function slide(title, subtitle, dark = false) {
  const s = p.slides.add();
  s.background.fill = dark ? C.dark : C.cream;
  const fg = dark ? C.white : C.ink;
  text(s, title, 72, 56, 1136, 106, 44, fg, true);
  if (subtitle) text(s, subtitle, 74, 166, 1118, 65, 23, dark ? "#F1DDE0" : C.muted);
  text(s, String(p.slides.items.length).padStart(2, "0"), 1152, 654, 56, 25, 16, dark ? "#E7C7CB" : C.muted);
  s.speakerNotes.text = `Sources: ${src}\n${delivery}\nPrepared from repository requirements and recorded delivery notes. These are not independent acceptance results. Unconfirmed dates, targets and decisions remain marked for confirmation.`;
  return s;
}
function rows(s, entries, y = 266, gap = 88, labelWidth = 300) {
  entries.forEach(([label, body], i) => {
    text(s, label, 74, y + i * gap, labelWidth - 24, 62, 25, C.red, true);
    text(s, body, 74 + labelWidth, y + i * gap, 1130 - labelWidth, 74, 25);
  });
}
function columns(s, entries, top = 290) {
  const width = 514;
  entries.forEach(([heading, body], i) => {
    const x = 74 + i * 604;
    text(s, heading, x, top, width, 68, 30, C.red, true);
    text(s, body, x, top + 90, width, 220, 29);
  });
}

// 01
{
  const s = p.slides.add(); s.background.fill = C.dark;
  text(s, "BPI", 76, 58, 360, 72, 56, C.white, true);
  text(s, "ITPMD\nProject Hub", 72, 217, 1080, 195, 76, C.white, true);
  text(s, "Project planning, weekly reporting and portfolio oversight", 78, 462, 1040, 85, 30, "#F1DDE0");
  text(s, "TPMO project review", 78, 594, 570, 34, 23, "#DEC78E");
  text(s, "[Presenter]   [Presentation date]", 78, 641, 820, 30, 19, "#F1DDE0");
  s.speakerNotes.text = `Sources: ${src}\n${delivery}\nThe BPI delivery notes retain the product name ITPMD Project Hub. BPI text here is a typographic identifier, not a recreated logo. Confirm presenter and presentation date before distribution.`;
}
// 02
{
  const s = slide("Executive Overview", "The Hub connects project updates with TPMO reporting and oversight");
  columns(s, [
    ["Project teams", "Maintain workplans, progress and project registers. Prepare weekly reports using the same source data."],
    ["TPMO", "Review project and program performance. Compare status trends and focus discussion on milestones or items needing action."]
  ]);
  text(s, "Expected value: less repeated reporting and clearer visibility of project performance", 74, 598, 1120, 50, 24, C.red, true);
}
// 03
{
  const s = slide("Business Background", "BPI’s requirements place TPMO at the center of project oversight");
  rows(s, [
    ["Project level", "Teams maintain task ownership, schedules, progress and project events."],
    ["Program level", "Related sub-initiatives contribute to a consolidated schedule and program KPIs."],
    ["Portfolio level", "TPMO compares project health, milestones and quarterly release commitments."],
    ["Requirements baseline", "36 functional requirements marked essential, P1 and in scope for the POC."]
  ]);
}
// 04
{
  const s = slide("Current Challenges", "Working hypotheses for confirmation with BPI process owners");
  rows(s, [
    ["Schedule consolidation", "Separate workplans make project and program dependencies harder to review."],
    ["Baseline traceability", "Teams need a clear record of rebaselines and the version driving schedule KPIs."],
    ["Weekly reporting", "Repeated data entry can slow reporting and create inconsistent figures."],
    ["Management attention", "Aging risks, issues and delayed commitments need consistent visibility."]
  ]);
}
// 05
{
  const s = slide("Project Objectives", "Success measures need an agreed starting point and target");
  rows(s, [
    ["Consistent reporting", "Measure weekly reports completed by the agreed deadline. Target: [confirm]."],
    ["Less preparation effort", "Measure time to prepare a weekly report before and after adoption. Target: [confirm]."],
    ["Traceable planning", "Measure pilot projects with an agreed baseline and current task updates. Target: [confirm]."],
    ["Useful oversight", "Measure overdue items with an owner and action plan. Target: [confirm]."]
  ]);
}
// 06
{
  const s = slide("Project Scope", "The BPI requirements define six connected areas");
  rows(s, [
    ["Workplan", "Tasks, dependencies, critical path, baselines, earned value and program roll-up."],
    ["Project Binder", "Risks, issues, dependencies, defects and change requests with aging metrics."],
    ["Weekly reporting", "Source-data pull, nine qualitative sections and three-page PPT/PDF output."],
    ["Portfolio and admin", "Dashboards, project profiles, templates, report definitions and standard exports."]
  ]);
  text(s, "Release boundaries, integrations and exclusions: [confirm with BPI]", 74, 631, 1070, 32, 20, C.muted);
}
// 07
{
  const s = slide("Proposed Solution", "A BPI-branded Project Hub on Kissflow");
  text(s, "Project data feeds\nweekly and portfolio views", 74, 285, 540, 183, 48, C.red, true);
  text(s, "Workplans and Binder records supply operational data.\n\nWeekly reports capture narrative and reporting snapshots.\n\nProgram and portfolio views support management review.", 696, 273, 510, 320, 27);
}
// 08
{
  const s = slide("Key Capabilities", "Capabilities grouped by the business decisions they support");
  rows(s, [
    ["Plan and compare", "Hierarchical tasks, predecessors, successors, lead/lag, critical path and baseline selection."],
    ["Monitor exceptions", "Binder ownership, target dates, aging RAG and the most severe risk/issue indicator."],
    ["Explain performance", "Schedule KPI, weekly highlights and report downloads with required-input checks."],
    ["Review the portfolio", "Monthly status, weekly RAG, milestone forecasts and quarterly MVP/release commitments."]
  ]);
}
// 09
{
  const s = slide("End-to-End Process", "A representative weekly operating cycle");
  const items = [
    ["01", "Set up", "Create the profile, workplan, owners and baseline."],
    ["02", "Maintain", "Update progress, actual dates and Binder actions."],
    ["03", "Report", "Review pulled figures and complete weekly highlights."],
    ["04", "Review", "Export the report and inspect portfolio exceptions."],
    ["05", "Act", "Assign follow-up actions and update the next cycle."]
  ];
  items.forEach(([n, a, b], i) => {
    const y = 253 + i * 76;
    text(s, n, 74, y, 70, 40, 29, C.gold, true);
    text(s, a, 180, y, 230, 44, 28, C.red, true);
    text(s, b, 426, y, 766, 60, 26);
  });
}
// 10
{
  const s = slide("Roles and Responsibilities", "Confirm the final access matrix and approval ownership before UAT");
  rows(s, [
    ["TPMO", "Review portfolio and program performance. Govern reporting standards and exceptions."],
    ["Project Manager", "Maintain the project plan, baseline and registers. Prepare status reporting."],
    ["Project team", "Update assigned work and actions within the approved access model."],
    ["Hub Administrator", "Manage project profiles, reusable templates and report definitions."]
  ]);
}
// 11
{
  const s = slide("Solution Walkthrough", "Representative example: a milestone forecast moves beyond its baseline");
  rows(s, [
    ["Workplan", "Review the task dependency, current progress and selected baseline."],
    ["Binder", "Record the issue, accountable owner, target date and recovery action."],
    ["Weekly Report", "Check schedule KPI and explain the impact in the weekly highlights."],
    ["Dashboards", "Review the milestone forecast and decide which management action is needed."]
  ]);
  s.speakerNotes.text += "\nThis is an illustrative demonstration sequence, not a real project incident or a screenshot of the application. Use an agreed pilot project for the live demonstration.";
}
// 12
{
  const s = slide("Expected Benefits", "Benefit targets remain subject to BPI validation");
  columns(s, [
    ["For project teams", "Reuse source data in weekly reporting.\n\nCompare progress with a selected baseline.\n\nKeep actions and ownership visible."],
    ["For management", "Review a consistent view of project status.\n\nSpot aging items and forecast delays.\n\nCompare commitments across programs."]
  ], 262);
  text(s, "Baseline measurements, target improvements and benefit owner: [confirm]", 74, 625, 1120, 35, 21, C.muted);
}
// 13
{
  const s = slide("Implementation Roadmap", "Delivery notes record six workstreams completed on 28 October 2026");
  text(s, "Recorded delivery", 74, 267, 440, 50, 29, C.red, true);
  text(s, "BPI branding\nScheduling and baselines\nProject Binder\nWeekly reporting\nDashboards\nAdministration and exports", 74, 337, 510, 262, 27);
  text(s, "Acceptance and rollout", 696, 267, 510, 50, 29, C.red, true);
  text(s, "Confirm rules and reporting template.\n\nComplete requirement-level UAT.\n\nAgree pilot and production readiness.\n\nOwners and dates: [confirm].", 696, 337, 500, 285, 27);
  text(s, "Recorded completion does not establish business acceptance. The verification tracker remains blank.", 74, 639, 1100, 34, 19, C.muted);
}
// 14
{
  const s = slide("Risks and Dependencies", "The following items need resolution for a clear acceptance baseline");
  rows(s, [
    ["Reporting template", "BPI’s WSR template is pending. Confirm the required layout before final acceptance."],
    ["Calculation rules", "Confirm aging boundaries, KPI thresholds, PV/EV definitions and zero planned progress."],
    ["History and data quality", "Validate project data and weekly snapshots used for trend comparisons."],
    ["Acceptance evidence", "Complete requirement-level results, role checks and readiness sign-off."]
  ]);
}
// 15
{
  const s = slide("Next Steps and Decisions", "Proposed owners and target dates require BPI confirmation");
  rows(s, [
    ["Rules and template", "TPMO / process owners: agree formulas and provide the WSR template. Due: [date]."],
    ["Pilot and UAT", "PMs / QA: select pilot data and record results against each requirement. Due: [date]."],
    ["Access and readiness", "App owner / IT: confirm roles and production readiness criteria. Due: [date]."],
    ["Rollout decision", "Business owner: approve the release scope, training and support plan. Due: [date]."]
  ]);
}
// 16
{
  const s = slide("Questions and Discussion", "Feedback to guide acceptance and rollout", true);
  text(s, "Does the weekly cycle fit how teams work?", 74, 294, 1110, 68, 36, C.white);
  text(s, "Which management decisions must the dashboards support?", 74, 394, 1110, 90, 36, C.white);
  text(s, "What must BPI confirm before the pilot begins?", 74, 514, 1110, 80, 36, "#DEC78E");
}

console.log(`Authored ${p.slides.items.length} slides`);
const candidate = `${build}/candidate.pptx`;
await (await PresentationFile.exportPptx(p)).save(candidate);
console.log("Exported draft");
for (let i = 0; i < p.slides.items.length; i++) {
  const blob = await p.export({ slide: p.slides.items[i], format: "png", scale: 1 });
  await fs.writeFile(`${build}/previews/slide-${String(i + 1).padStart(2, "0")}.png`, new Uint8Array(await blob.arrayBuffer()));
  console.log(`Rendered ${i + 1}`);
}
const result = await finalizePresentation({
  workspaceDir: `${root}/presentations`, candidatePath: candidate,
  finalPath: `${out}/BPI-ITPMD-Project-Hub.pptx`,
  pythonExecutable: `${runtime}/python/bin/python3`,
  integrityValidatorPath: `${skill}/container_tools/inspect_presentation_package_integrity.py`,
  layoutValidatorPath: `${skill}/container_tools/inspect_presentation_layout_geometry.py`,
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
  explicitTotalSlideCount: 16,
  requiredNativeTableOwnerSlides: [], requiredNativeChartOwnerSlides: [],
  fontPolicy: { basis: "design", families: ["Arial"] },
  verifyArtifactToolImport: true,
  receiptPath: `${build}/validation.json`
});
console.log(JSON.stringify(result));
