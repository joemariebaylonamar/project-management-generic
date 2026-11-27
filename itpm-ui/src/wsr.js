// Weekly Status Report (WSR001.2, WSR002, WSR004, WSR010, WSR016): week maths, required-field check, text autofit and
// the 3-page layout model. The same model feeds the PPTX and PDF writers (src/wsr-export.js), so the two match.
export const FIELDS = [
  { key: "weekly_summary", label: "Weekly Summary Highlights" }, { key: "schedule_hl", label: "Schedule Highlights" },
  { key: "budget_hl", label: "Budget Highlights" }, { key: "risks_issues_hl", label: "Risks and Issues Highlights" },
  { key: "scope_hl", label: "Scope Highlights" }, { key: "defects_hl", label: "Defects Highlights" },
  { key: "mgmt_attention", label: "Items for Management Attention" }, { key: "accomplishments", label: "Key Accomplishments for the Week" },
  { key: "next_week", label: "Activities for Next Week" },
];
const D = (s) => new Date(s + "T00:00:00Z");
const iso = (d) => d.toISOString().slice(0, 10);
const add = (s, n) => { const d = D(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
export function weekStart(date) { const dow = D(date).getUTCDay(); return add(date, dow === 0 ? -6 : 1 - dow); }
export const weekEnd = (ws) => add(ws, 4);
// `required` = the field keys the WSR template demands (default: all nine)
export const missingFields = (r, required) => FIELDS.filter((f) => (!required || required.includes(f.key)) && !String(r?.[f.key] ?? "").trim()).map((f) => f.label);
export const ragLabel = (r) => ({ G: "On track", A: "At risk", R: "Critical" }[r] || "—");

// Largest font (pt) at which `text` fits a w×h inch box; a rough width model (avg glyph = 0.5 em, line = 1.25 em).
export function fitFont(text, w, h, maxPt = 14, minPt = 8) {
  const paras = String(text || "").split(/\n/);
  const need = (pt) => { const cpl = Math.max(1, Math.floor(w * 72 / (pt * 0.48))); return paras.reduce((n, p) => n + Math.max(1, Math.ceil(p.length / cpl)), 0) * pt * 1.25 / 72; };
  for (let pt = maxPt; pt >= minPt; pt--) if (need(pt) <= h) return { pt, clipped: false };
  return { pt: minPt, clipped: need(minPt) > h };
}

const C = { red: "B11116", gold: "B89040", ink: "211A1A", mute: "6B6060", line: "E8E1E1", panel: "FBF9F9", G: "17803F", A: "A96A00", R: "B11116" };
const peso = (n) => `₱${(n / 1e6).toFixed(2)}M`;
const dfmt = (s) => { if (!s) return "—"; const d = D(s); return `${d.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const header = (title, s, page) => [
  { t: "rect", x: 0, y: 0, w: 13.333, h: 0.9, fill: C.red },
  { t: "text", x: 0.5, y: 0.12, w: 9, h: 0.4, text: title, size: 20, bold: true, color: "FFFFFF" },
  { t: "text", x: 0.5, y: 0.52, w: 10, h: 0.3, text: `${s.project.name} · ${s.project.code} · Week of ${s.week.label}`, size: 11, color: "F1D9DA" },
  { t: "text", x: 10.3, y: 0.3, w: 2.6, h: 0.3, text: "BPI · TPMO", size: 12, bold: true, color: "F1D9DA", align: "right" },
  { t: "text", x: 0.5, y: 7.1, w: 9, h: 0.25, text: `Generated ${dfmt(s.generated)} from the ITPMD Project Hub`, size: 8, color: C.mute },
  { t: "text", x: 11.8, y: 7.1, w: 1.0, h: 0.25, text: `${page} / 3`, size: 8, color: C.mute, align: "right" },
];
const tile = (x, y, w, label, value, sub, rag) => [
  { t: "rect", x, y, w, h: 1.25, fill: "FFFFFF", line: C.line }, { t: "rect", x, y, w: 0.09, h: 1.25, fill: rag ? C[rag] : C.gold },
  { t: "text", x: x + 0.2, y: y + 0.08, w: w - 0.3, h: 0.3, text: label, size: 10, color: C.mute },
  { t: "text", x: x + 0.2, y: y + 0.36, w: w - 0.3, h: 0.5, text: value, size: 24, bold: true, color: rag ? C[rag] : C.ink },
  { t: "text", x: x + 0.2, y: y + 0.88, w: w - 0.3, h: 0.3, text: sub, size: 9, color: C.mute },
];
export function buildDeck(s) {
  const k = s.kpi; const kv = k.value === null || k.value === undefined ? "n/a" : k.value.toFixed(2);
  const p1 = [...header("Weekly Status Report · Summary", s, 1),
    ...tile(0.5, 1.25, 3.9, "Schedule KPI (%Actual ÷ %Planned)", kv, `${ragLabel(k.rag)} · ${k.actual.toFixed(1)}% actual vs ${k.planned.toFixed(1)}% planned`, k.rag),
    ...tile(4.7, 1.25, 3.9, "Overall project health", ragLabel(s.health.overall), `Schedule ${ragLabel(s.health.sched)} · Cost ${ragLabel(s.health.cost)}`, s.health.overall),
    ...tile(8.9, 1.25, 3.9, "Leading indicators (risks, issues)", ragLabel(s.leading.overall), `Risks ${ragLabel(s.leading.risk)} · Issues ${ragLabel(s.leading.issue)}`, s.leading.overall),
    { t: "text", x: 0.5, y: 6.75, w: 12, h: 0.25, text: "Schedule KPI = %Actual / %Planned against the baseline in force. Red <= 0.70, Amber between, Green >= 0.90. n/a when nothing was planned yet.", size: 8, color: C.mute },
    { t: "text", x: 0.5, y: 2.75, w: 6, h: 0.3, text: "Schedule and cost", size: 13, bold: true, color: C.ink },
    { t: "table", x: 0.5, y: 3.1, w: 6.0, cols: [3.0, 3.0], size: 11, rows: [
      ["Baseline finish", dfmt(s.schedule.base)], ["Forecast finish", dfmt(s.schedule.fore)], ["Variance (working days)", `${s.schedule.var > 0 ? "+" : ""}${s.schedule.var}`],
      ["Approved budget", peso(s.fin.budget)], ["Forecast at completion", `${peso(s.fin.eac)} (${s.fin.eacPct.toFixed(1)}%)`], ["Actual cost to date", peso(s.fin.actual)], ["Contingency left", peso(s.fin.contLeft)]] },
    { t: "text", x: 7.0, y: 2.75, w: 5.8, h: 0.3, text: "Project", size: 13, bold: true, color: C.ink },
    { t: "table", x: 7.0, y: 3.1, w: 5.8, cols: [2.4, 3.4], size: 11, rows: [
      ["Project manager", s.project.pm || "—"], ["Project sponsor", s.project.sponsor || "—"], ["Business unit", s.project.bu || "—"],
      ["Risk health", ragLabel(s.health.risk)], ["Issue health", ragLabel(s.health.issue)]] }];
  const p2 = [...header("Weekly Status Report · Highlights", s, 2)];
  FIELDS.forEach((f, i) => {
    const col = i % 3, row = Math.floor(i / 3); const x = 0.5 + col * 4.15, y = 1.15 + row * 1.95, w = 3.95, h = 1.8;
    const txt = String(s.text?.[f.key] || "").trim() || "—"; const fit = fitFont(txt, w - 0.2, h - 0.45, 12, 7);
    p2.push({ t: "rect", x, y, w, h, fill: "FFFFFF", line: C.line }, { t: "rect", x, y, w, h: 0.32, fill: C.panel, line: C.line },
      { t: "text", x: x + 0.1, y: y + 0.03, w: w - 0.2, h: 0.26, text: f.label, size: 10, bold: true, color: C.red },
      { t: "text", x: x + 0.1, y: y + 0.38, w: w - 0.2, h: h - 0.45, text: txt, size: fit.pt, color: C.ink, fit: true });
  });
  const items = (list) => list.slice(0, 5).map((r) => [r.no, r.desc, r.pri || "—", ragLabel(r.aging)]);
  const p3 = [...header("Weekly Status Report · Milestones, risks and next week", s, 3),
    { t: "text", x: 0.5, y: 1.1, w: 6, h: 0.3, text: "Milestones", size: 13, bold: true },
    { t: "table", x: 0.5, y: 1.45, w: 6.0, cols: [2.8, 1.0, 1.0, 1.2], size: 9, head: ["Milestone", "Baseline", "Forecast", "Status"],
      rows: (s.milestones.slice(0, 7).map((m) => [m.name, dfmt(m.base), dfmt(m.fore), m.status])) },
    { t: "text", x: 6.9, y: 1.1, w: 6, h: 0.3, text: "Top risks", size: 13, bold: true },
    { t: "table", x: 6.9, y: 1.45, w: 5.9, cols: [0.9, 3.1, 0.9, 1.0], size: 9, head: ["No.", "Risk", "Priority", "Aging"], rows: items(s.risks) },
    { t: "text", x: 6.9, y: 3.55, w: 6, h: 0.3, text: "Top issues", size: 13, bold: true },
    { t: "table", x: 6.9, y: 3.9, w: 5.9, cols: [0.9, 3.1, 0.9, 1.0], size: 9, head: ["No.", "Issue", "Priority", "Aging"], rows: items(s.issues) },
    { t: "text", x: 0.5, y: 4.35, w: 6, h: 0.3, text: "Planned next week (from the schedule)", size: 13, bold: true },
    { t: "table", x: 0.5, y: 4.7, w: 6.0, cols: [0.8, 3.2, 1.0, 1.0], size: 9, head: ["ID", "Activity", "Start", "Finish"],
      rows: s.next.slice(0, 7).map((a) => [a.id, a.name, dfmt(a.start), dfmt(a.finish)]) }];
  return { w: 13.333, h: 7.5, title: `WSR ${s.project.code} ${s.week.start}`, pages: [p1, p2, p3] };
}
