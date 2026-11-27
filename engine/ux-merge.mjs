// ux-merge.mjs — deterministic merge for PARALLEL kf-ux-architect.
//
// The monolithic ux-architect designs 11 roles serially (~1h). Parallel version: a BRIEF agent sets
// the app-wide theme/meta + assigns each role a distinct comparable product + focus (so parallel role
// agents diverge by construction, preserving per-role diversity); then one agent per role designs its
// nav + pages CONCURRENTLY into fragments/role-<slug>.json; this merges them into the single
// experience-spec.json that kf-prototype-builder / parallel-prototype consume unchanged.
//
// Usage:  node ux-merge.mjs <brief.json> <fragmentsDir> <out.json>
//   brief.json     = { app, theme, meta, roles:[{role, slug, ...}] }   (from the brief agent)
//   fragmentsDir   = dir of role-<slug>.json = { role, landing, nav:[{page,label,icon}], pages:[…] }
// Output: { app, theme, meta, roles:[{role,landing,nav}], pages:[…] } + a stderr differentiation report.
// Exit 0 always (differentiation issues are warnings, surfaced for the caller to act on).

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// multiset of widget types on a role's LANDING page — the fingerprint we compare for "template" dashboards
function landingFingerprint(frag) {
  const home = (frag.pages || []).find((p) => p.id === frag.landing) || (frag.pages || [])[0];
  const types = ((home && home.widgets) || []).map((w) => w.type).filter(Boolean).sort();
  return types.join(",");
}

export function merge(brief, fragments) {
  const roles = [], pages = [], fps = {};
  for (const frag of fragments) {
    if (!frag || !frag.role) continue;
    roles.push({ role: frag.role, landing: frag.landing, nav: frag.nav || [] });
    for (const p of frag.pages || []) pages.push({ role: frag.role, ...p });
    fps[frag.role] = landingFingerprint(frag);
  }
  // differentiation check: any two roles whose landing dashboards use the IDENTICAL widget-type set
  const dupes = [];
  const roleNames = Object.keys(fps);
  for (let i = 0; i < roleNames.length; i++)
    for (let j = i + 1; j < roleNames.length; j++)
      if (fps[roleNames[i]] && fps[roleNames[i]] === fps[roleNames[j]])
        dupes.push([roleNames[i], roleNames[j]]);
  const spec = { app: brief.app, theme: brief.theme, meta: brief.meta, roles, pages };
  return { spec, dupes, roleCount: roles.length, pageCount: pages.length };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (isMain) {
  const [briefPath, fragDir, outPath] = process.argv.slice(2);
  if (!briefPath || !fragDir || !outPath) { console.error("usage: ux-merge.mjs <brief.json> <fragmentsDir> <out.json>"); process.exit(2); }
  const brief = JSON.parse(readFileSync(briefPath, "utf8"));
  const fragments = readdirSync(fragDir).filter((f) => /^role-.*\.json$/.test(f)).map((f) => JSON.parse(readFileSync(join(fragDir, f), "utf8")));
  const { spec, dupes, roleCount, pageCount } = merge(brief, fragments);
  writeFileSync(outPath, JSON.stringify(spec, null, 1));
  console.error(`merged ${outPath} — ${roleCount} roles · ${pageCount} pages`);
  if (dupes.length) { console.error(`⚠ DIFFERENTIATION: ${dupes.length} role pair(s) share an identical landing widget-set (redesign one of each):`); for (const [a, b] of dupes) console.error(`   ${a} ≈ ${b}`); }
  else console.error("✅ differentiation OK — every role's landing dashboard has a distinct widget mix");
}
