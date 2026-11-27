// proto-schema.mjs — deterministic extraction of the prototype's shared form schema from app-spec.
//
// The parallel prototype's shell needs window.ENTITY_FIELDS = the COMPLETE per-entity field list so
// openRecordDetail (all fields) and openEntityForm (full create-form) are consistent across roles.
// Deriving that from 100 app-spec `forms` is a pure function — do it here (ms, deterministic) instead
// of spending shell-agent turns reasoning over the whole spec. The shell just embeds this JSON.
//
// Supports TWO app-spec shapes (both seen in the wild across runs/):
//   (a) legacy: top-level `forms` — array or {id: form} map of
//       { id, name, flowType, fields:[{id?,name,type,required,ref,referredList,lookup:[{name}]}], child_tables }
//   (b) current: `data_model.flows` — map of flowId -> { fields, references, child_tables, computed, views }
//       where each field is {id,name,type,required,options_from} and Reference targets/lookups live in the
//       sibling `references` array ({field_id, target_flow, lookup_fields:[names]}), and the human label for
//       the flow is derived from its Default View name ("Vessel — Default View" -> "Vessel").
//
// Usage:  node proto-schema.mjs <app-spec.json> [out.json]   (prints to stdout if no out path)
// Output: { "<entityId>": { label, fields:[{label,type,required,ref,list,lookup,child}], children:[…] },
//           "<entity name lowercased>": <same obj> }   (aliased by id AND name for easy lookup)

import { readFileSync, writeFileSync } from "node:fs";

const TYPE_MAP = { Text: "text", Textarea: "textarea", Number: "number", Currency: "number", Date: "date",
  Datetime: "datetime", Select: "select", Reference: "reference", User: "user", Attachment: "file",
  Boolean: "checkbox", Yesno: "checkbox", Email: "text", Phone: "text" };

function field(f) {
  const o = { label: f.name, type: TYPE_MAP[f.type] || (f.type ? f.type.toLowerCase() : "text"), required: !!f.required };
  if (f.ref) o.ref = f.ref;                                   // Reference target entity
  if (f.referredList) o.list = f.referredList;                // Select → reference list
  if (Array.isArray(f.lookup) && f.lookup.length) o.lookup = f.lookup.map((l) => (typeof l === "string" ? l : l.name)); // auto-fills…
  return o;
}

function labelFromFlowId(id, flow) {
  const views = Array.isArray(flow.views) ? flow.views : [];
  const vname = views[0] && views[0].name;
  if (vname && vname.includes("—")) return vname.split("—")[0].trim();
  if (vname) return vname.trim();
  return String(id).replace(/^fr-\d+-/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractFromFlows(flows) {
  const out = {};
  for (const [id, flow] of Object.entries(flows || {})) {
    if (!flow) continue;
    const label = labelFromFlowId(id, flow);
    const refByFieldId = {};
    (flow.references || []).forEach((r) => { if (r && r.field_id) refByFieldId[r.field_id] = r; });
    const mapField = (f) => {
      const o = { label: f.name, type: TYPE_MAP[f.type] || (f.type ? f.type.toLowerCase() : "text"), required: !!f.required };
      if (f.type === "Reference") {
        const r = refByFieldId[f.id];
        if (r) {
          if (r.target_flow) o.ref = r.target_flow;
          if (Array.isArray(r.lookup_fields) && r.lookup_fields.length) o.lookup = r.lookup_fields;
        }
      }
      if (f.type === "Select" && f.options_from) o.list = f.options_from;
      return o;
    };
    const rec = {
      label,
      flowType: "Form",
      fields: (flow.fields || []).map(mapField),
      children: (flow.child_tables || []).map((c) => ({
        label: c.name || "Line items",
        fields: (c.fields || []).map(mapField),
      })),
    };
    out[id] = rec;
    out[label.toLowerCase()] = rec;
  }
  return out;
}

export function extractEntityFields(appSpec) {
  if (appSpec && appSpec.data_model && appSpec.data_model.flows) {
    return extractFromFlows(appSpec.data_model.flows);
  }
  const forms = Array.isArray(appSpec.forms) ? appSpec.forms : Object.values(appSpec.forms || {});
  const out = {};
  for (const e of forms) {
    if (!e || !e.id) continue;
    const rec = {
      label: e.name || e.id,
      flowType: e.flowType || "Form",
      fields: (e.fields || []).map(field),
      children: (e.child_tables || e.childTables || []).map((c) => ({
        label: c.name || c.id || "Line items",
        fields: (c.fields || []).map(field),
      })),
    };
    out[e.id] = rec;
    if (e.name) out[String(e.name).toLowerCase()] = rec; // alias by human name
  }
  return out;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (isMain) {
  const src = process.argv[2];
  if (!src) { console.error("usage: proto-schema.mjs <app-spec.json> [out.json]"); process.exit(2); }
  const ef = extractEntityFields(JSON.parse(readFileSync(src, "utf8")));
  const json = JSON.stringify(ef, null, 0);
  const ids = Object.keys(ef).filter((k) => /^fr-/.test(k) || /^flow|_A\d+$/.test(k)).length;
  if (process.argv[3]) { writeFileSync(process.argv[3], json); console.error(`wrote ${process.argv[3]} — ${ids} entities`); }
  else process.stdout.write(json);
}
