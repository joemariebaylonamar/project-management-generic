import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
const root = "/Users/joemarieamar/kissflow/bpi/apps/bpi-itpm";
const runtime = "/Users/joemarieamar/.cache/codex-runtimes/codex-primary-runtime/dependencies";
const skill = "/Users/joemarieamar/.codex/plugins/cache/openai-primary-runtime/presentations/26.1110.11613/skills/presentations";
process.env.RUNTIME_NODE_MODULES = `${runtime}/node/node_modules`;
process.env.RUNTIME_NODE = `${runtime}/node/bin/node`;
process.env.RUNTIME_BIN_DIR = `${runtime}/bin`;
const { FileBlob, PresentationFile } = await import(pathToFileURL(`${runtime}/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs`));
const { finalizePresentation } = await import(pathToFileURL(`${skill}/container_tools/artifact_tool_utils.mjs`));
const source = `${root}/presentations/output/BPI-ITPMD-Project-Hub.pptx`;
const build = `${root}/presentations/.build/ava-update`;
await fs.mkdir(`${build}/previews`, { recursive: true });
const p = await PresentationFile.importPptx(await FileBlob.load(source));
const originalSlides = [...p.slides.items];
const snapshot = await p.inspect({ kind: "textbox,slide", maxChars: 200000 });
await fs.writeFile(`${build}/before.ndjson`, snapshot.ndjson);
const records = snapshot.ndjson.split("\n").filter(Boolean).map(line => JSON.parse(line));
function replace(oldText, newText) {
  const record = records.find(r => r.kind === "textbox" && r.text === oldText);
  if (!record) throw new Error(`Missing source text: ${oldText}`);
  p.resolve(record.id).text.replace(oldText, newText);
}
replace("Delivery notes record six workstreams completed on 28 October 2026", "Core delivery recorded in October; AVA integration added in November 2026");
replace("Recorded completion does not establish business acceptance. The verification tracker remains blank.", "AVA integration is implemented locally. Published-agent acceptance remains pending.");
replace("App owner / IT: confirm roles and production readiness criteria. Due: [date].", "App owner / IT: confirm roles, publish AVA and validate its connection. Due: [date].");
const C = { red: "#A9242A", ink: "#272526", muted: "#645C5B", cream: "#FAF7F2" };
function text(s, content, x, y, w, h, size = 25, color = C.ink, bold = false) {
  const sh = s.shapes.add({ geometry: "textbox", position: { left: x, top: y, width: w, height: h }, fill: "none", line: { fill: "none", width: 0 } });
  sh.text = content;
  sh.text.style = { fontFamily: "Arial", fontSize: size, color, bold, verticalAlignment: "top", insets: 0 };
  return sh;
}
const notes = `Sources: ${root}/itpm-ui/index.html (askTala, avaBuiltIn, avaContext, avaUseResult, basicTierAnswer); ${root}/itpm-ui/src/ava.js; ${root}/itpm-ui/src/ava-agent.js; ${root}/docs/AVA-CUSTOM-AGENT.md; ${root}/docs/ava-agent-instructions.txt. Scope reviewed on 23 November 2026. Local implementation and simulated tests do not prove a published agent works in Kissflow. The separate CCAPS readiness control is outside ITPM scope.`;
function addSlide(title, subtitle, entries, footnote) {
  const s = p.slides.add();
  s.background.fill = C.cream;
  text(s, title, 72, 56, 1136, 106, 44, C.ink, true);
  text(s, subtitle, 74, 166, 1118, 65, 23, C.muted);
  entries.forEach(([label, body], i) => {
    text(s, label, 74, 266 + i * 88, 276, 62, 25, C.red, true);
    text(s, body, 374, 266 + i * 88, 830, 74);
  });
  text(s, footnote, 74, 626, 1110, 40, 19, C.muted);
  text(s, "00", 1152, 674, 56, 25, 16, C.muted);
  s.speakerNotes.text = notes;
  return s;
}
const added = [
  addSlide("AVA Capabilities", "One assistant supports project review, reporting and app guidance", [
    ["Project review", "Check overdue activities, milestones and issues; find missing owners, dates and risk mitigations."],
    ["Portfolio briefing", "Summarize visible projects and highlight recorded health factors and follow-up needs."],
    ["PSR drafting", "Prepare accomplishments, next-period plans and issues for the current reporting month."],
    ["Guidance and lookup", "Explain app steps and look up assigned work, ownership, progress and reporting deadlines."]
  ], "AI responses require a published AVA connection. Built-in checks and template drafts are labelled."),
  addSlide("AVA Entry Points and User Control", "Page buttons open AVA chat; changes require a separate user action", [
    ["Project header", "Ask AVA opens a contextual conversation about project health."],
    ["PSR editor", "Draft with AVA requests a narrative for the editable status report."],
    ["Review and apply", "An authorized PM reviews the proposal and clicks Apply. Submission and approval stay separate."],
    ["Basic commands", "Built-in assignment and progress commands prepare proposals for the user to Apply or Dismiss."]
  ], "Available actions follow the user’s role and project access. Suggestions must be enabled to apply changes."),
  addSlide("AVA Availability and Rollout", "Local implementation is distinct from a connected, accepted AI service", [
    ["Implemented", "Custom Agent integration, grounded review checks, PSR proposals and app-side access guards."],
    ["Live AI setup", "Publish AVA, configure its Agent ID and validate responses against actual project records."],
    ["Acceptance checks", "Verify role access, source links, PSR Apply, changed-data rejection and failed-run recovery."],
    ["Outside active scope", "What-if tools, S-curve analysis and broader record actions are not connected to the current agent path."]
  ], "Confirm the published agent and complete live acceptance before presenting AI mode as operational.")
];
added.forEach((s, i) => s.moveTo(8 + i));
// Keep the existing page-number treatment and update numbers after insertion.
const after = await p.inspect({ kind: "textbox", maxChars: 240000 });
for (const line of after.ndjson.split("\n").filter(Boolean)) {
  const r = JSON.parse(line);
  if (r.kind === "textbox" && /^\d{2}$/.test(r.text || "") && r.position?.left >= 1150 && r.position?.top >= 650) p.resolve(r.id).text.replace(r.text, String(r.slideIndex + 1).padStart(2, "0"));
}
for (const s of [originalSlides[12], originalSlides[14]]) s.speakerNotes.text += `\nAVA update: ${notes}`;
const candidate = `${build}/candidate.pptx`;
await (await PresentationFile.exportPptx(p)).save(candidate);
for (let i = 0; i < p.slides.items.length; i++) {
  const blob = await p.export({ slide: p.slides.items[i], format: "png", scale: 1 });
  await fs.writeFile(`${build}/previews/slide-${String(i + 1).padStart(2, "0")}.png`, new Uint8Array(await blob.arrayBuffer()));
  console.log(`Rendered ${i + 1}/${p.slides.items.length}`);
}
const sourceSha = createHash("sha256").update(await fs.readFile(source)).digest("hex");
const result = await finalizePresentation({
  workspaceDir: `${root}/presentations`, candidatePath: candidate,
  finalPath: `${root}/presentations/output/BPI-ITPMD-Project-Hub-AVA.pptx`,
  pythonExecutable: `${runtime}/python/bin/python3`,
  integrityValidatorPath: `${skill}/container_tools/inspect_presentation_package_integrity.py`,
  layoutValidatorPath: `${skill}/container_tools/inspect_presentation_layout_geometry.py`,
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
  explicitTotalSlideCount: 19,
  requiredNativeTableOwnerSlides: [], requiredNativeChartOwnerSlides: [],
  fontPolicy: { basis: "reference", families: ["Arial"], referencePath: source, referenceSha256: sourceSha },
  verifyArtifactToolImport: true,
  receiptPath: `${build}/validation.json`
});
console.log(JSON.stringify(result));
