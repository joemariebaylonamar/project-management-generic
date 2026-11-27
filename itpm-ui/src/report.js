// ADM012 report builder: datasets, a small query engine (columns, filters, sort, group by) and validation.
// The UI builds the dataset rows (objects keyed by field key) from live state; this module only shapes them.
const f = (key, label, type = "text") => ({ key, label, type });
export const DATASETS = {
  projects: { label: "Projects", fields: [f("name", "Project"), f("code", "Code"), f("bu", "Business unit"), f("segment", "Segment"), f("program", "Program"), f("status", "Status"), f("pm", "Project manager"), f("dh", "Department head"), f("sponsor", "Sponsor"), f("rag", "Health"), f("kpi", "Schedule KPI", "num"), f("complete", "% actual", "num"), f("planned", "% planned", "num"), f("baseFinish", "Baseline finish", "date"), f("foreFinish", "Forecast finish", "date"), f("variance", "Variance (wd)", "num"), f("budget", "Approved budget", "num"), f("eac", "Forecast cost", "num"), f("actualCost", "Actual cost", "num")] },
  tasks: { label: "Tasks and milestones", fields: [f("project", "Project"), f("id", "ID"), f("name", "Task"), f("type", "Type"), f("owner", "Assigned to"), f("bStart", "Baseline start", "date"), f("bFinish", "Baseline finish", "date"), f("start", "Forecast start", "date"), f("finish", "Forecast finish", "date"), f("pct", "% complete", "num"), f("budget", "Budget", "num"), f("actual", "Actual cost", "num"), f("critical", "Critical path")] },
  risks: { label: "Risks", fields: [f("project", "Project"), f("no", "No."), f("title", "Risk"), f("category", "Category"), f("level", "Rating"), f("owner", "Owner"), f("status", "Status"), f("target", "Target date", "date"), f("agingRag", "Aging")] },
  issues: { label: "Issues", fields: [f("project", "Project"), f("no", "No."), f("title", "Issue"), f("category", "Category"), f("priority", "Priority"), f("owner", "Owner"), f("status", "Status"), f("target", "Target date", "date"), f("agingRag", "Aging")] },
  binder: { label: "Binder register", fields: [f("project", "Project"), f("type", "Event type"), f("no", "No."), f("description", "Description"), f("category", "Category"), f("priority", "Priority"), f("assignee", "Assigned to"), f("target", "Target date", "date"), f("actionStatus", "Action item status"), f("aging", "Days past target", "num"), f("agingRag", "Aging"), f("status", "Status")] },
  releases: { label: "MVPs and releases", fields: [f("project", "Project"), f("name", "Release"), f("kind", "Type"), f("planned", "Planned", "date"), f("forecast", "Forecast", "date"), f("implemented", "Implemented", "date"), f("cls", "On-time status")] },
  weekly: { label: "Weekly reports", fields: [f("project", "Project"), f("week", "Week of", "date"), f("status", "Report status"), f("kpi", "Schedule KPI", "num"), f("kpiRag", "KPI RAG"), f("overall", "Overall RAG"), f("projectStatus", "Project status")] },
};
export const OPS = [["eq", "is"], ["ne", "is not"], ["contains", "contains"], ["gt", "after / more than"], ["lt", "before / less than"]];
const cmp = (a, b) => (typeof a === "number" && typeof b === "number" ? a - b : String(a ?? "").localeCompare(String(b ?? "")));
function pass(v, op, want, type) {
  const num = type === "num"; const a = num ? Number(v) : String(v ?? ""); const b = num ? Number(want) : String(want);
  if (num && (Number.isNaN(a) || Number.isNaN(b))) return false;
  switch (op) { case "eq": return String(v ?? "").toLowerCase() === String(want).toLowerCase(); case "ne": return String(v ?? "").toLowerCase() !== String(want).toLowerCase();
    case "contains": return String(v ?? "").toLowerCase().includes(String(want).toLowerCase()); case "gt": return a > b; case "lt": return a < b; default: return true; }
}
export function runReport(def, data) {
  const ds = DATASETS[def.dataset]; const meta = Object.fromEntries(ds.fields.map((x) => [x.key, x]));
  let rows = data.filter((r) => (def.filters || []).every((fl) => !meta[fl.field] || fl.value === "" || fl.value === undefined || pass(r[fl.field], fl.op, fl.value, meta[fl.field].type)));
  if (def.sort && meta[def.sort.field]) rows = [...rows].sort((a, b) => cmp(a[def.sort.field], b[def.sort.field]) * (def.sort.dir === "desc" ? -1 : 1));
  if (def.groupBy && meta[def.groupBy]) {
    const g = new Map(); const sum = meta[def.sumField]?.type === "num" ? def.sumField : "";
    for (const r of rows) { const k = r[def.groupBy] ?? ""; const e = g.get(k) || { n: 0, s: 0 }; e.n++; if (sum) e.s += Number(r[sum]) || 0; g.set(k, e); }
    const keys = [...g.keys()].sort((a, b) => cmp(a, b));
    const columns = [{ key: def.groupBy, label: meta[def.groupBy].label }, { key: "count", label: "Count" }, ...(sum ? [{ key: "sum", label: `Sum of ${meta[sum].label}` }] : [])];
    return { columns, rows: keys.map((k) => [k, g.get(k).n, ...(sum ? [g.get(k).s] : [])]), chart: def.chart === "bar" ? { labels: keys.map(String), values: keys.map((k) => g.get(k).n) } : null };
  }
  const cols = (def.columns || []).filter((k) => meta[k]).map((k) => ({ key: k, label: meta[k].label }));
  return { columns: cols, rows: rows.map((r) => cols.map((c) => r[c.key] ?? "")), chart: null };
}
export function validateReport(def) {
  const out = [];
  if (!String(def.name || "").trim()) out.push("Give the report a name");
  if (!DATASETS[def.dataset]) return [...out.slice(0, 0), "Unknown dataset"];
  if (!(def.columns || []).length && !def.groupBy) out.push("Choose at least one column, or a group-by field");
  return out;
}
