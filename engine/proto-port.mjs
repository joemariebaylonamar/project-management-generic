// proto-port.mjs — turn an approved prototype page into a PORT BRIEF for a runtime page agent.
//
//   node proto-port.mjs <run-dir> <pageId>
//
// Quick mode already produced a finished, reviewed UI: the prototype settled every layout decision,
// widget choice, column set, aggregation and label, and the user signed off on it. Regenerating the
// runtime page from the spec throws all of that away — the agent re-reads the catalog, re-picks
// widgets, re-words headings — and the live app ends up recognisably a different product from the
// one that was approved (observed on hire-onboard, 2026-08-02).
//
// So the runtime agent should PORT, not redesign. This file assembles everything that port needs:
//   · the prototype markup + renderer for that one page          (proto-extract)
//   · SEED collection -> live Kissflow flow id, type             (app-spec + id-map)
//   · seed record key -> real Kissflow field name + type         (matched, with confidence)
//   · the primitive each prototype pattern becomes               (starter/src/components/kf)
// Everything the brief cannot resolve deterministically is listed as UNRESOLVED rather than guessed,
// because a confident-but-wrong field name fails silently at runtime as an empty column.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { extractPage } from "./proto-extract.mjs";

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const singular = (s) => s.replace(/ies$/, "y").replace(/s$/, "");
const initials = (s) => String(s || "").split(/[\s_-]+/).filter(Boolean).map((w) => w[0].toLowerCase()).join("");

export function readPrototype(dir) {
  const index = join(dir, "prototype", "index.html");
  if (existsSync(index)) return readFileSync(index, "utf8");
  const parts = join(dir, "prototype", "parts");
  if (existsSync(parts) && statSync(parts).isDirectory())
    return readdirSync(parts).filter((f) => f.endsWith(".html")).map((f) => readFileSync(join(parts, f), "utf8")).join("\n");
  return null;
}

/** window.SEED / window.ROLES are JS object literals, not JSON — evaluate them in a bare sandbox */
export function readGlobals(html) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  for (const name of ["SEED", "ROLES"]) {
    const m = new RegExp(`window\\.${name}\\s*=\\s*`).exec(html);
    if (!m) continue;
    const end = html.indexOf("</script>", m.index);
    try { vm.runInContext(`window.${name} = ${html.slice(m.index + m[0].length, end).replace(/;\s*$/, "")};`, ctx, { timeout: 2000 }); }
    catch { /* a malformed literal just means that half of the brief is thinner */ }
  }
  return ctx.window;
}

/** match one seed record key to a Kissflow field, reporting how sure we are */
function matchField(key, fields) {
  const k = norm(key);
  const exact = fields.find((f) => norm(f.name) === k);
  if (exact) return { field: exact, confidence: "exact" };
  // A prototype-local row id is not a business field; and a 1–2 character key produces nonsense
  // substring hits ("id" matches "Cand-id-ate"), which is worse than no match because it reads as
  // an answer. Below three characters, only the initials rule may claim a match.
  if (k === "id") return { field: null, confidence: "unresolved", note: "prototype row id — use `_id`" };
  const sub = k.length < 3 ? [] : fields.filter((f) => norm(f.name).includes(k) || k.includes(norm(f.name)));
  if (sub.length === 1) return { field: sub[0], confidence: "likely" };
  if (sub.length > 1) return { field: null, confidence: "ambiguous", candidates: sub };
  const init = fields.filter((f) => initials(f.name) === k && k.length >= 2);
  if (init.length === 1) return { field: init[0], confidence: "likely" };
  return { field: null, confidence: "unresolved" };
}

/** match a SEED collection to a flow in the spec, and to its live id */
function matchFlow(collection, flows, idMap) {
  const c = norm(singular(collection));
  const flow = flows.find((f) => norm(f.name) === c) || flows.find((f) => norm(f.name).includes(c) || c.includes(norm(f.name)));
  if (!flow) return null;
  const gen = `${flow.name.replace(/\s+/g, "_")}_A00`;
  return { ...flow, liveId: idMap?.genToServer?.[gen] || gen };
}

export function buildBrief(runDir, pageId) {
  const html = readPrototype(runDir);
  if (!html) throw new Error(`no prototype found under ${runDir}/prototype`);
  const page = extractPage(existsSync(join(runDir, "prototype", "index.html")) ? join(runDir, "prototype", "index.html") : join(runDir, "prototype", "parts"), pageId);
  if (!page) throw new Error(`page "${pageId}" not found in the prototype`);

  const g = readGlobals(html);
  const spec = existsSync(join(runDir, "app-spec.json")) ? JSON.parse(readFileSync(join(runDir, "app-spec.json"), "utf8")) : {};
  const idMap = existsSync(join(runDir, "id-map.json")) ? JSON.parse(readFileSync(join(runDir, "id-map.json"), "utf8")) : {};
  const flows = spec.forms || spec.flows || [];

  // which role owns this page, and what the nav calls it — the prototype is the authority here
  let owner = null;
  for (const r of g.ROLES || []) {
    const nav = (r.nav || []).find((n) => n.id === pageId);
    if (nav) { owner = { role: r.name || r.slug, slug: r.slug, label: nav.label, landing: r.landing === pageId }; break; }
  }

  const bindings = page.seedKeys.map((key) => {
    const rows = g.SEED?.[key];
    const sample = Array.isArray(rows) ? rows[0] || {} : rows || {};
    const flow = Array.isArray(rows) ? matchFlow(key, flows, idMap) : null;
    const fields = flow?.fields || [];
    return {
      collection: key,
      isRecordSet: Array.isArray(rows),
      count: Array.isArray(rows) ? rows.length : null,
      flow,
      keys: Object.keys(sample).map((k) => ({ key: k, ...matchField(k, fields) })),
      unusedFields: fields.filter((f) => !Object.keys(sample).some((k) => matchField(k, fields).field === f)),
    };
  });

  return { pageId, page, owner, bindings, appId: idMap.app || spec.app?.name || null };
}

const PATTERNS = [
  ["a grid of small stat cards (`data-kpi`)", "`<KpiRow>` + `<KpiCard label value tone>`"],
  ["a `<table>` with a `<tbody data-table>`", "`<DataTable columns rows>`"],
  ["a hand-rolled `<svg>` bar/area/donut", "`<RBar>` / `<RArea>` / `<RPie>` — same series, same order"],
  ["coloured status text or a rounded pill", "`<StatusPill status>` (never a hardcoded colour class)"],
  ["a column-per-status card list", "`<KanbanBoard>`"],
  ["a vertical dated event list", "`<Timeline>`"],
  ["a step/stage indicator", "`<Stepper>`"],
  ["the page title + subtitle block", "`<PageHeader title subtitle actions>`"],
  ["a section wrapper card", "`<Panel title>`"],
  ["an empty branch (`length === 0`)", "`<EmptyState>`"],
];

export function renderBrief(b) {
  const L = [];
  L.push(`# PORT BRIEF — prototype page \`${b.pageId}\`${b.owner ? ` · "${b.owner.label}" · role ${b.owner.role}${b.owner.landing ? " (landing)" : ""}` : ""}`);
  L.push(`
You are **porting an approved prototype page to the live app**, not designing a page. The prototype
below was reviewed and signed off: its layout, widget choices, column sets, orderings, aggregations
and wording are all decisions that have already been made. Reproduce them. The ONLY thing you change
is where the data comes from — \`SEED.*\` arrays become Kissflow SDK reads against the flows below.

Do not research alternatives, do not re-pick widgets, do not reword headings, do not add or drop
columns, and do not "improve" the layout. If something in the prototype looks wrong, port it as-is
and note it at the end; a divergence the user did not approve is a worse outcome than a flaw they did.`);

  L.push(`\n## 1. Data bindings${b.appId ? ` (app \`${b.appId}\`)` : ""}`);
  for (const bd of b.bindings) {
    if (!bd.isRecordSet) { L.push(`\n### \`SEED.${bd.collection}\` — not a record set\nPrototype-only context (\`${JSON.stringify(bd.keys.map((k) => k.key))}\`). Replace with the signed-in user from the SDK, or drop it.`); continue; }
    if (!bd.flow) { L.push(`\n### \`SEED.${bd.collection}\` (${bd.count} rows) — ⚠ NO MATCHING FLOW\nResolve this against the app's flows before writing the page; do not invent a flow id.`); continue; }
    L.push(`\n### \`SEED.${bd.collection}\` (${bd.count} rows) → flow \`${bd.flow.liveId}\` — ${bd.flow.name} [${bd.flow.flowType || bd.flow.type}]\n`);
    L.push(`| prototype key | Kissflow field | type | match |`);
    L.push(`| --- | --- | --- | --- |`);
    for (const k of bd.keys) {
      const cell = k.field ? `\`${k.field.name}\`` : k.candidates ? k.candidates.map((c) => `\`${c.name}\``).join(" or ") : "— **UNRESOLVED**";
      L.push(`| \`${k.key}\` | ${cell} | ${k.field?.type || ""} | ${k.confidence} |`);
    }
    const open = bd.keys.filter((k) => !k.field);
    if (open.length) L.push(`\n⚠ Resolve before coding: ${open.map((k) => `\`${k.key}\``).join(", ")}. Available fields: ${bd.flow.fields.map((f) => `\`${f.name}\``).join(", ")}.`);
    // Only claim a field is unused when nothing is unresolved. With open keys the two lists overlap —
    // the field an unresolved key actually means shows up here as "never shown", and the instruction
    // to leave it out then deletes content the prototype displayed (caught on requisitions, where
    // `id`/`dept` were unresolved and their fields were listed as unused).
    if (bd.unusedFields.length && !open.length)
      L.push(`\nFields the prototype never showed (leave them out — that was a design decision): ${bd.unusedFields.map((f) => `\`${f.name}\``).join(", ")}.`);
    else if (bd.unusedFields.length)
      L.push(`\nNot obviously bound: ${bd.unusedFields.map((f) => `\`${f.name}\``).join(", ")}. Some of these are what the unresolved keys above mean — map those first, and only then treat the remainder as deliberately not shown.`);
  }

  L.push(`\n## 2. Markup to reproduce\n\n\`\`\`html\n${b.page.markup || "(none)"}\n\`\`\``);
  L.push(`\n## 3. Renderer to reproduce — every aggregation, filter, sort, label and column here is a decision to keep\n\n\`\`\`js\n${b.page.render || "(none)"}\n\`\`\``);

  L.push(`\n## 4. Prototype pattern → runtime primitive\n\nThe prototype is hand-rolled HTML; the runtime page is React on the \`kf\` primitives (\`starter/src/components/kf\`). Translate structure, keep semantics:\n`);
  L.push(`| prototype | runtime |`, `| --- | --- |`);
  for (const [a, c] of PATTERNS) L.push(`| ${a} | ${c} |`);

  L.push(`\n## 5. Hard rules\n
- **Tokens only.** No \`bg-green-100\`, no hex literals, no \`dark:\` pairs — colour comes from the primitives and \`TONES\`. The prototype's inline \`style="background-color: …"\` is a prototype shortcut; \`<StatusPill>\` replaces it.
- **Guard dates.** \`new Date(x)\` on a missing value renders "Invalid Date"; every date passes through the \`format\` helpers.
- **Reference fields** come back as objects — read \`.Name\`/\`._id\`, never render the raw object.
- **Empty is a real state.** The live app starts with no records; every list renders \`<EmptyState>\` rather than a bare table or \`NaN\`.
- **Role scope.** This page belongs to ${b.owner ? `\`${b.owner.role}\`` : "its role"} — keep the prototype's own filter (\`SEED.me\`-style "mine" scoping becomes an SDK filter on the signed-in user).`);
  return L.join("\n");
}

if (process.argv[1] && process.argv[1].endsWith("proto-port.mjs")) {
  const [dir, pageId] = process.argv.slice(2);
  if (!dir || !pageId) { console.error("usage: proto-port.mjs <run-dir> <pageId>"); process.exit(2); }
  try {
    const b = buildBrief(dir, pageId);
    if (process.argv.includes("--json")) console.log(JSON.stringify(b, null, 1));
    else console.log(renderBrief(b));
  } catch (e) { console.error(`proto-port: ${e.message}`); process.exit(1); }
}
