// page-designer.mjs — design pages LOCALLY (Claude authors the intermediate) and compile them with
// Kissflow's OWN vendored transformer, instead of calling the hosted /page/create AI endpoint.
//
// WHY: the hosted generator is an LLM behind a fixed 6-agent workflow (SharedFlowResolver →
// FlowContextBuilder → PageDesigner → IntermediateParser → ReportCreator → Transformer). Everything in
// that chain EXCEPT the PageDesigner LLM is already vendored into this plugin byte-identical
// (engine/vendor/page_builder). So we keep their compiler and replace only the design step. That kills
// every failure class we hit with the API:
//   - STUB bindings / hallucinated flows  → we bind real flow ids + real FIELD ids we fetched
//   - fabricated KPI numbers              → we read real counts (or omit the number, never invent one)
//   - identical-looking dashboards        → we pick a per-role ARCHETYPE and compose accordingly
//   - async job hangs / service outages   → no network AI call at all; transform is local + instant
//
// Contract (enforced by the vendored intermediate_validator via page_validate.py):
//   { page:{name}, body:{ style, children:[widget…] }, popups:[…], variables:[…] }
// Widgets: Container|Label|Button|Card|Icon|Image|Divider|ChartReport|ProcessTable|DataformTable|
//          FormView|Tab|Repeater|… (see vendor/page_builder/component_catalog.py)
// NOTE: Card.count is STATIC by design ("always a static value and never a variable") — so a truthful
// number must be written at build time; that is what countItems() is for.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ENGINE_DIR = dirname(fileURLToPath(import.meta.url));
const famOf = (t) => (t === "Process" ? "process" : (t === "Case" || t === "Board") ? "case" : "form");

// FLOW-TYPE GUARDS. The page spec's SUPPORTED_TYPES has NO Case/Board data widget — only ProcessTable
// (process) and DataformTable (dataform). Rendering a Case as a DataformTable produces
// "The <id> Form is not found" at runtime (hit live on "Collections Case"). So Cases/Boards are
// EXCLUDED from every data widget; they can still appear as a stat tile, which is only a count.
export const isCase = (f) => !!f && (f.type === "Case" || f.type === "Board");
export const isForm = (f) => !!f && !isCase(f) && f.type !== "Process";
export const embeddable = (f) => !!f && (f.type === "Process" || isForm(f));

// ── DESIGN SYSTEM ─────────────────────────────────────────────────────────────────────────────────
// Modern/sleek: soft grey canvas, white surfaces with generous radius + a soft positive shadow and NO
// harsh borders, a clear type scale, and a rotating vibrant accent for stat chips. Only tokens the
// platform actually documents are used (Primary.500, Secondary.One/Three.200|600, Gray.*, White,
// Shadow.100.Pos) — an undocumented token resolves to nothing and renders flat/black.
const pad = (n) => ({ paddingTop: n, paddingBottom: n, paddingLeft: n, paddingRight: n });
const SURFACE = { background: "Color.White", borderRadius: "14px", shadowType: "Shadow.100.Pos" };
// PROVEN tint pairs only. "Color.Primary.500" does NOT resolve as a background — it renders as a bare
// icon with no chip behind it (verified live). Stick to the Secondary.*.200/.600 pairs and Gray.
export const ACCENTS = [
  { chipBg: "Color.Secondary.One.200", chipFg: "Color.Secondary.One.600" },
  { chipBg: "Color.Secondary.Three.200", chipFg: "Color.Secondary.Three.600" },
  { chipBg: "Color.Gray.100", chipFg: "Color.Gray.900" },
];

// ── widget builders ───────────────────────────────────────────────────────────────────────────────
export const label = (title, size = "14px", color = "Color.Gray.900", weight = "Font.Weight.Regular") =>
  ({ type: "Label", properties: { title }, style: { width: "auto", height: "auto", fontSize: size, color, fontWeight: weight } });
export const row = (children, style = {}) =>
  ({ type: "Container", layout: "horizontal", style: { width: "100%", height: "auto", wrap: "nowrap", gap: "16px", ...style }, children });
export const col = (children, style = {}) =>
  ({ type: "Container", layout: "vertical", style: { width: "100%", height: "auto", wrap: "nowrap", gap: "16px", ...style }, children });
export const panel = (children, style = {}) => col(children, { ...SURFACE, ...pad("22px"), gap: "14px", ...style });
// Icon chip. Per the platform spec: `bgColor` tints the WRAPPER (not `background`), `color` is the glyph,
// and `padding` is what sizes the glyph inside the wrapper. Using `background` + `size` leaves the chip
// untinted and the glyph overflowing — that was the visible mis-alignment on the first build.
export const icon = (iconUrl, { bg, fg, box = "44px", inset = "12px" } = {}) =>
  ({ type: "Icon", properties: { iconUrl }, style: { width: box, height: box, padding: inset, borderRadius: "12px", bgColor: bg, color: fg } });

// Flow-bound Repeater — the platform's PREFERRED dashboard list widget ("ALWAYS use a Repeater for any
// list-like UI"). Bind to a real dataform/process (Option A/B) and NEVER to a Variable defaultValue:
// that is how the hosted generator fakes a populated app. `fields` must be REAL field ids.
// NOTE: process viewIds mytasks/myitems expose ONLY system fields — use viewId "admin" for custom fields.
export const repeater = (flow, fields, template, { viewId = "admin", layout = "grid", gridColumns = 3, itemHeight = "150px" } = {}) => ({
  type: "Repeater",
  ...(flow.type === "Process" ? { process: { processId: flow.id, viewId } } : { dataform: { formId: flow.id } }),
  fields,
  repeaterLayout: layout,
  ...(layout === "grid" ? { gridColumns } : {}),
  templateStyle: { height: itemHeight },
  template,
});

// VIBRANT stat tile — a custom composition (coloured icon chip + big figure + caption) rather than the
// stock `Card`, which is visually flat and whose `count` is static-only anyway. `value == null` renders
// an em-dash: we never fabricate a number (see countItems).
export const statTile = (labelText, value, iconUrl, width, accent = ACCENTS[0]) =>
  row([
    icon(iconUrl, { bg: accent.chipBg, fg: accent.chipFg }),
    col([
      label(value == null ? "—" : String(value), "28px", "Color.Gray.900", "Font.Weight.SemiBold"),
      label(labelText, "13px", "Color.Gray.500"),
    ], { gap: "2px", width: "auto" }),
  ], { ...SURFACE, ...pad("18px"), width, gap: "14px", alignItems: "center", hoverBackground: "Color.Gray.100" });

// stock Card kept for callers that want the platform component (count is static by design)
export const card = (labelText, count, iconName, width) => ({
  type: "Card",
  properties: { label: labelText, count: count == null ? "—" : count, icon: iconName, cardType: "Type1" },
  style: { width, height: "auto" },
});

// page header — title + subtitle, with optional primary actions pinned right (quick actions at TOP)
export const header = (title, subtitle, actions = []) =>
  row([
    col([ label(title, "26px", "Color.Gray.900", "Font.Weight.SemiBold"),
          ...(subtitle ? [label(subtitle, "14px", "Color.Gray.500")] : []) ], { gap: "4px", width: "auto" }),
    ...(actions.length ? [row(actions, { width: "auto", gap: "10px", justifyContent: "flex-end", alignItems: "center" })] : []),
  ], { ...SURFACE, ...pad("24px"), justifyContent: "space-between", alignItems: "center" });

// section wrapper — heading + optional caption above a widget
export const section = (title, widget, caption) =>
  panel([ col([ label(title, "15px", "Color.Gray.900", "Font.Weight.SemiBold"),
                ...(caption ? [label(caption, "13px", "Color.Gray.500")] : []) ], { gap: "2px" }), widget ]);

// the page canvas
export const pageBody = (children) => ({
  // `layout` is MANDATORY here: the body is a Container too, and an omitted layout falls back to ROW —
  // which lays the ENTIRE page out sideways (verified live). Their own spec: never omit it.
  layout: "vertical",
  style: { width: "100%", height: "auto", wrap: "nowrap", gap: "20px", background: "Color.Gray.100", ...pad("28px") },
  children,
});
export const button = (caption, { openPopup, type = "primary", icon = "plus-solid.svg" } = {}) => {
  const b = { type: "Button", properties: { caption, type, icon }, style: { width: "auto", height: "auto" } };
  if (openPopup) b.openPopup = openPopup;
  return b;
};
export const processTable = (processId, viewId, caption, height = "420px", showform = false) =>
  ({ type: "ProcessTable", process: { processId, viewId }, properties: { caption, showform, newItem: false }, style: { width: "100%", height } });
export const dataformTable = (formId, caption, height = "380px", showform = false) =>
  ({ type: "DataformTable", dataform: { formId }, properties: { caption, showform }, style: { width: "100%", height } });
export const formView = (flow) =>
  ({ type: "FormView", ...(flow.type === "Process" ? { process: { processId: flow.id } } : { dataform: { formId: flow.id } }), style: { width: "100%", height: "auto" } });
// chart: prefer an existing reportId; else auto-generate from REAL field ids.
export const chart = (flow, { reportId, dimensionFieldId, measureFieldId, aggregateFunction = "COUNT", chartType, width = "100%", height = "320px" }) => {
  const key = flow.type === "Process" ? { processId: flow.id } : { formId: flow.id };
  const report = reportId ? { ...key, reportId } : { ...key, generate: { dimensionFieldId, measureFieldId, aggregateFunction, ...(chartType ? { chartType } : {}) } };
  return { type: "ChartReport", report, style: { width, height } };
};

// ── flow context: REAL flows, REAL field ids, existing reports ────────────────────────────────────
export async function buildFlowContext(c, acc, appId) {
  const ex = (await c.call("GET", `/flow/2/${acc}/application/${appId}/flow?_application_id=${appId}`)).body;
  const flows = [];
  for (const f of Array.isArray(ex) ? ex : []) {
    const family = famOf(f.Type);
    const d = (await c.call("GET", `/metadata/2/${acc}/${family}/${f._id}/draft`)).body || {};
    const fields = Object.values(d).filter((v) => v && v.Kind === "Field" && !v.IsSystemField)
      .map((v) => ({ id: v.Id, name: v.Name, type: v.Type }));
    let reports = [];
    try {
      const r = await c.call("GET", `/flow/2/${acc}/${family}/${f._id}/report?_application_id=${appId}`);
      reports = (Array.isArray(r.body) ? r.body : []).map((x) => ({ id: x._id, name: x.Name }));
    } catch { /* forms may 403/empty */ }
    flows.push({ id: f._id, name: f.Name, type: f.Type, family, fields, reports });
  }
  return flows;
}

// Real item count for a truthful KPI. Returns a number, or null when it can't be determined —
// callers must render "—" rather than invent a value.
// PAGE SIZE MATTERS: the dataform list response carries the true total in `count`, but if you ask for
// page_size=1 and fall back to Data.length you get 1 for EVERY non-empty flow — which is how a form
// holding 6 borrowers rendered a "1" tile. Ask for a full page and prefer the explicit total.
const PAGE = 500;
export async function countItems(c, acc, appId, flow) {
  const paths = flow.type === "Process"
    ? [`/process/2/${acc}/${flow.id}/myitems?page_size=${PAGE}&_application_id=${appId}`]
    : [`/form/2/${acc}/${flow.id}/list?page_size=${PAGE}&_application_id=${appId}`,
       `/form/2/${acc}/${flow.id}/items?page_size=${PAGE}&_application_id=${appId}`];
  for (const p of paths) {
    const r = await c.call("GET", p).catch(() => ({ status: -1 }));
    if (r.status >= 300 || r.status < 0 || !r.body) continue;
    const b = r.body;
    // explicit totals first; Data.length is only a floor and is capped by PAGE
    const n = b.count ?? b.TotalCount ?? b.total_count ?? b.Total
      ?? (Array.isArray(b) ? b.length : Array.isArray(b.Data) ? b.Data.length : null);
    if (typeof n === "number") return n;
  }
  return null;
}

// ── validate against the platform's OWN intermediate_validator ────────────────────────────────────
export function validateIntermediate(intermediate) {
  const r = spawnSync("python3", [join(ENGINE_DIR, "page_validate.py")], { input: JSON.stringify(intermediate), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) return { valid: false, errors: [`validator bridge failed: ${(r.stderr || "").slice(0, 200)}`] };
  try { return JSON.parse(r.stdout); } catch (e) { return { valid: false, errors: [`bad validator output: ${e.message}`] }; }
}

// Compile an intermediate with the VENDORED platform transformer (same bridge client.mjs uses).
export function transformIntermediate(intermediate, applicationId, pageId, log = () => {}) {
  const input = JSON.stringify({ intermediate, applicationId, pageId });
  const r = spawnSync("python3", [join(ENGINE_DIR, "page_transform.py")], { input, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
  if (r.status !== 0) { log(`  transformer error: ${(r.stderr || r.error?.message || "").slice(0, 200)}`); return null; }
  try { return JSON.parse(r.stdout); } catch (e) { log(`  transformer bad output: ${e.message}`); return null; }
}

// ── create page shell → transform (vendored) → draft → publish ────────────────────────────────────
export async function publishDesignedPage(c, acc, appId, pageName, intermediate, { log = () => {} } = {}) {
  const v = validateIntermediate(intermediate);
  if (!v.valid) { log(`  page "${pageName}": INVALID intermediate — ${v.errors.slice(0, 4).join("; ")}`); return null; }
  const pr = await c.call("POST", `/flow/2/${acc}/application/${appId}/page/`, { Name: pageName });
  const pid = pr.body?._id;
  if (!pid) { log(`  page "${pageName}": create ${pr.status}`); return null; }
  const meta = transformIntermediate(intermediate, appId, pid, log);
  if (!meta) { log(`  page "${pageName}": transform failed`); return null; }
  const base = `/metadata/2/${acc}/application/${appId}/page/${pid}`;
  const pd = await c.call("PUT", `${base}/draft`, meta);
  const pub = pd.status < 300 ? await c.call("POST", `${base}/publish`, {}) : { status: -1 };
  const comps = Object.values(meta).filter((x) => x && x.Kind === "Component").length;
  log(`  ✓ page "${pageName}" → ${pid} (${comps} components) draft ${pd.status} publish ${pub.status}`);
  return { pid, comps };
}

// ── archetype selection: a role's page shape follows its position in the work, not a template ─────
// approver  — acts on OTHERS' items (queue-first: big mytasks table, decision context, light KPIs)
// initiator — raises items (create-first: New button + popup form, my-items list, my status)
// operations— runs the day-to-day across several flows (multi-flow tabs + throughput charts)
// admin     — curates reference/master data (management tables, minimal analytics)
export function pickArchetype(roleName, ir = {}) {
  const n = String(roleName || "").toLowerCase();
  // NOTE the word boundaries. `it\b` (no leading boundary) matches the tail of "Credit", which sent
  // "Credit Analyst" to the admin console. And a bare `manager` is too broad — a Relationship Manager
  // ORIGINATES applications, so it is an initiator, not an approver. Both verified on the lending app.
  if (/approv|committee|underwrit|analyst|\bhead\b|director/.test(n)) return "approver";
  if (/\badmin\b|config|setup|master data|\bit\b/.test(n)) return "admin";
  if (/audit|complian|finance|treasury|\bops\b|operation|servic|collection|desk/.test(n)) return "operations";
  return "initiator";
}

// ── ROLE-OPTIMIZED COMPOSERS ──────────────────────────────────────────────────────────────────────
// Each archetype composes a genuinely DIFFERENT page — the failure mode of the hosted generator is that
// every role gets the same stat-row → chart → table recipe. Shape follows the role's job:
//   approver   queue-FIRST: the decision queue is the hero; metrics are supporting, no create action
//   initiator  create-FIRST: a New button (popup form) up top, then "my requests" and my status mix
//   operations breadth: one tab per flow it runs, plus throughput analytics
//   admin      curation: management tables over the master data, analytics only if reports exist
const ICONS = ["thumbs-up-solid.svg", "shopping-cart-solid.svg", "users-solid.svg", "chart-bar-solid.svg", "bell-solid.svg", "star-solid.svg"];
const chartsFor = (flow, max = 2) => (flow?.reports || []).slice(0, max).map((r, i) =>
  section(r.name || `By ${i ? "Category" : "Status"}`, chart(flow, { reportId: r.id, height: "300px" })));

// A card-grid Repeater over a real flow — the platform's preferred dashboard list widget. Binds to up to
// four human-readable REAL fields via {{item.<fieldId>}}. Never a Variable source (that is the fake-data
// anti-pattern). Returns [] when the flow has too few displayable fields to make a decent card.
const repeaterSection = (flow, title) => {
  if (!flow) return [];
  const pick = (flow.fields || []).filter((f) => /^(Text|Select|Email|Currency|Number|Date)$/i.test(f.type)).slice(0, 4);
  if (pick.length < 2) return [];
  const [a, b, c2, d] = pick;
  const chips = [c2, d].filter(Boolean).map((f, i) =>
    label(`{{item.${f.id}}}`, "12px", i ? "Color.Secondary.One.600" : "Color.Secondary.Three.600", "Font.Weight.SemiBold"));
  const tpl = [col([
    label(`{{item.${a.id}}}`, "15px", "Color.Gray.900", "Font.Weight.SemiBold"),
    ...(b ? [label(`{{item.${b.id}}}`, "13px", "Color.Gray.500")] : []),
    ...(chips.length ? [row(chips, { gap: "8px", alignItems: "center" })] : []),
  ], { background: "Color.Gray.100", borderRadius: "12px", ...pad("16px"), gap: "8px", height: "100%" })];
  return [section(title || flow.name, repeater(flow, pick.map((f) => f.id), tpl, { layout: "grid", gridColumns: 3, itemHeight: "150px" }))];
};
// prefer the flow that actually HAS records — an empty repeater teaches the viewer nothing
const richestForm = (flows, counts) => flows.filter(isForm)
  .sort((x, y) => (counts[y.id] || 0) - (counts[x.id] || 0))[0];

export function designRolePage({ role, archetype, flows, counts = {}, title, subtitle }) {
  const proc = flows.find((f) => f.type === "Process");
  const forms = flows.filter(isForm);
  const primary = proc || flows.find(isForm) || null;
  const tile = (f, i) => statTile(f.name, counts[f.id], ICONS[i % ICONS.length], `calc(${100 / Math.min(flows.length || 1, 4)}% - ${Math.round((16 * ((Math.min(flows.length || 1, 4)) - 1)) / Math.min(flows.length || 1, 4))}px)`, ACCENTS[i % ACCENTS.length]);
  const tiles = flows.slice(0, 4).map(tile);
  const popupId = "createPrimary";
  const createBtn = primary ? [button(`New ${primary.name}`, { openPopup: popupId })] : [];
  const popups = primary ? [{ id: popupId, title: `New ${primary.name}`, children: [formView(primary)] }] : [];

  let children, pops = [];
  if (archetype === "approver") {
    // the queue IS the page — tall, first, no create action
    children = [
      header(title || `${role} Workbench`, subtitle || "Items awaiting your decision"),
      ...(proc ? [section("Awaiting My Approval", processTable(proc.id, "mytasks", "Awaiting My Approval", "480px"), "Approve, reject or comment without leaving this page")] : []),
      ...(tiles.length ? [row(tiles)] : []),
      ...repeaterSection(richestForm(flows, counts)),
      ...(chartsFor(proc, 2).length ? [row(chartsFor(proc, 2).map((s) => ({ ...s, style: { ...s.style, width: "calc(50% - 8px)" } })))] : []),
    ];
  } else if (archetype === "operations") {
    // breadth across every flow it runs
    const tabs = flows.filter(embeddable).slice(0, 4).map((f) => ({
      name: f.name,
      children: [f.type === "Process" ? processTable(f.id, "myitems", f.name, "420px") : dataformTable(f.id, f.name, "420px")],
    }));
    children = [
      header(title || `${role} Operations`, subtitle || "Live workload across every queue you run", createBtn),
      ...(tiles.length ? [row(tiles)] : []),
      ...(tabs.length ? [section("Work Queues", { type: "Tab", tabs, style: { width: "100%", height: "auto" } })] : []),
      ...repeaterSection(richestForm(flows, counts)),
      ...(chartsFor(proc, 2).length ? [row(chartsFor(proc, 2).map((s) => ({ ...s, style: { ...s.style, width: "calc(50% - 8px)" } })))] : []),
    ];
    pops = popups;
  } else if (archetype === "admin") {
    // curation of master data — management tables, analytics only where reports exist
    children = [
      header(title || `${role} Console`, subtitle || "Manage reference and master data", createBtn),
      ...(tiles.length ? [row(tiles)] : []),
      ...repeaterSection(richestForm(flows, counts)),
      ...forms.slice(0, 2).map((f) => section(f.name, dataformTable(f.id, f.name, "360px"), `All ${f.name} records — click a row to edit`)),
      ...chartsFor(proc, 1),
    ];
    pops = popups;
  } else {
    // initiator — create-first, then my own work
    children = [
      header(title || `${role} Dashboard`, subtitle || "Raise a request and track your submissions", createBtn),
      ...(tiles.length ? [row(tiles)] : []),
      ...(proc ? [section("My Requests", processTable(proc.id, "myitems", "My Requests", "420px"), "Everything you have submitted")] : []),
      ...repeaterSection(richestForm(flows, counts)),
      ...chartsFor(proc, 1),
    ];
    pops = popups;
  }
  return { page: { name: title || `${role} Dashboard` }, body: pageBody(children), ...(pops.length ? { popups: pops } : {}) };
}
