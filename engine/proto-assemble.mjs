#!/usr/bin/env node
// proto-assemble.mjs — deterministic assembler for PARALLEL prototype generation.
//
// The clickable prototype used to be one agent writing ~100KB serially (26+ min, stall-prone).
// New protocol: a SHELL part (full document: CSS system, Inter, seed dataset, role switcher, and
// one `<!-- @PART:role-<slug> -->` marker per role) is generated first; then N role-dashboard
// parts are generated CONCURRENTLY (one agent each, fast emission tier); this assembler splices
// them into the final single-file prototype. Nothing is templated — every part is generated fresh
// per app — the assembler is a build step, not a design.
//
//   node engine/proto-assemble.mjs <partsDir> [--out index.html]
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

// matches BOTH marker forms: <!-- @PART:x --> (HTML) and /* @PART:x */ (CSS — the theme marker
// lives inside a <style> block where an HTML comment would be invalid)
export const MARKER_RE = /<!--\s*@PART:([a-z0-9_-]+)\s*-->|\/\*\s*@PART:([a-z0-9_-]+)\s*\*\//gi;

// pure: splice parts into the shell; report what happened (testable).
// Part <script> blocks are EXTRACTED and re-appended before </body> — parts land above the shell's
// bottom script (which defines SEED + helpers), so leaving their scripts in place makes them run
// before their dependencies exist. Deferred re-append guarantees ordering for every part, guarded
// or not (Finance rendered empty in the first assembled run for exactly this reason).
const SCRIPT_RE = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
export function assemble(shell, parts) {
  const used = [], missing = [], deferred = [];
  const out0 = shell.replace(MARKER_RE, (m, n1, n2) => { const name = n1 || n2;
    const key = name.toLowerCase();
    if (parts[key] === undefined) { missing.push(key); return `<!-- missing part: ${key} -->`; }
    used.push(key);
    return parts[key].replace(SCRIPT_RE, (sc) => { deferred.push(`<!-- part:${key} script (deferred by assembler) -->\n${sc}`); return `<!-- script deferred: ${key} -->`; });
  });
  const inject = deferred.length ? deferred.join("\n") + "\n" : "";
  // NB: function replacer (not a string) — a string replacement interprets `$'`/`$&`/`$\``/`$$`
  // special patterns, which corrupts any part whose JS contains them (e.g. `">$'+x`). Insert verbatim.
  const out = /<\/body>/i.test(out0) ? out0.replace(/<\/body>/i, () => inject + "</body>") : out0 + inject;
  const unused = Object.keys(parts).filter((k) => !used.includes(k));
  return { out, used, missing, unused, deferredScripts: deferred.length };
}

// The placeholder a not-yet-written role gets. `kf-pending` is not decoration: it is how a later
// assemble counts what is still outstanding, which is what stops a partial re-splice from
// overwriting a finished page. Anchor on the class NAME — the class sits in a list, so a pattern
// like /class="kf-pending"/ matches nothing and the guard silently never fires (it did).
export const PENDING_RE = /\bkf-pending\b/g;
const pendingHtml = (k) =>
  `<div class="kf-pending p-10 text-center text-muted-foreground text-sm">Generating ${String(k).replace(/^role-/, "")}…</div>`;

/**
 * Splice whatever parts exist in <runDir>/prototype/parts into <runDir>/prototype/index.html.
 * Returns true when the file changed. Never throws.
 *
 * This is the STREAMING path, and it lives here rather than in either host because both need it and
 * they are built differently: v1 watches local disk from the web process, v2 runs the build in a
 * worker and serves panes from GCS. Duplicating it would mean fixing every bug in it twice — which
 * is precisely how v2 came to be missing this behaviour in the first place.
 */
export function assembleRun(runDir) {
  const pdir = join(runDir, "prototype", "parts");
  const shellFile = join(pdir, "shell.html");
  if (!existsSync(shellFile)) return false;      // nothing to show yet — the shell IS the floor
  let body;
  try {
    const parts = {};
    for (const f of readdirSync(pdir)) {
      if (f === "shell.html" || !f.endsWith(".html")) continue;
      parts[f.replace(/\.html$/, "").toLowerCase()] = readFileSync(join(pdir, f), "utf8");
    }
    const { out } = assemble(readFileSync(shellFile, "utf8"), parts);
    body = out.replace(/<!-- missing part: ([a-z0-9_-]+) -->/g, (_m, k) => pendingHtml(k));
  } catch { return false; }
  const idx = indexOf(runDir);
  if (existsSync(idx)) {
    let cur = "";
    try { cur = readFileSync(idx, "utf8"); } catch { /* unreadable — replace it */ }
    if (cur === body) return false;                                  // nothing moved
    // NEVER DOWNGRADE. The conductor's final assemble drops --partial and produces the complete
    // page; a later partial write must not put "Generating …" back into a finished prototype.
    if ((body.match(PENDING_RE) || []).length > (cur.match(PENDING_RE) || []).length) return false;
  }
  try {
    mkdirSync(dirname(idx), { recursive: true });
    writeFileSync(idx, body);
    return true;
  } catch { return false; }
}

/** Where assembleRun writes. Callers publish this file rather than rebuilding the path. */
export const indexOf = (runDir) => join(runDir, "prototype", "index.html");

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (isMain) {
  const dir = process.argv[2];
  const oi = process.argv.indexOf("--out");
  const outFile = oi >= 0 ? process.argv[oi + 1] : join(dir, "..", "index.html");
  if (!dir || !existsSync(join(dir, "shell.html"))) {
    console.error("usage: proto-assemble.mjs <partsDir>  (needs shell.html + role-*.html parts)");
    process.exit(1);
  }
  const shell = readFileSync(join(dir, "shell.html"), "utf8");
  const parts = {};
  for (const f of readdirSync(dir)) {
    if (f === "shell.html" || !f.endsWith(".html")) continue;
    parts[f.replace(/\.html$/, "").toLowerCase()] = readFileSync(join(dir, f), "utf8");
  }
  const { out, used, missing, unused } = assemble(shell, parts);
  // --partial: assemble what exists instead of failing on absent role parts. The chat builder uses this
  // to put a WORKING preview on screen as soon as the first role lands, then re-assembles as the rest
  // arrive — a demo shouldn't stare at an empty pane until the slowest agent finishes. Roles whose part
  // is still being written render as a "generating…" placeholder rather than breaking the document.
  const partial = process.argv.includes("--partial");
  if (missing.length && !partial) { console.error(`FAIL: shell wants parts not present: ${missing.join(", ")}`); process.exit(1); }
  // The placeholder is USER-FACING — it renders inside the live preview pane while a role's pages are
  // still being written. "Generating em…" (the internal role slug) read as a glitch to the person
  // watching; the role's real name from the experience spec reads as progress. Best-effort lookup,
  // slug fallback stays if the spec is absent or the slug doesn't match.
  // Still carries `kf-pending` (upstream's own PENDING_RE anchors on it) even though the text differs
  // from pendingHtml()'s — this placeholder and assembleRun's are the SAME placeholder for counting
  // purposes, not for wording. Dropping the class here would leave the never-downgrade guard blind to
  // this path's output: it would count zero pending items on a page that still has some, and let a
  // later partial overwrite genuinely-in-progress content because it looked already complete.
  const roleName = (slug) => {
    try {
      const spec = JSON.parse(readFileSync(join(dir, "..", "experience-spec.json"), "utf8"));
      for (const r of spec.roles || []) {
        const s = (r.slug || String(r.landing || r.role || "").split("-")[0]).toLowerCase();
        if (s === slug) return r.role || r.name || slug.toUpperCase();
      }
    } catch { /* no spec next to the parts dir — slug fallback below */ }
    return slug.toUpperCase();
  };
  const body = missing.length
    ? out.replace(/<!-- missing part: ([a-z0-9_-]+) -->/g, (_m, k) =>
        `<div class="kf-pending p-10 text-center text-muted-foreground text-sm">Building the ${roleName(String(k).replace(/^role-/, ""))} pages…</div>`)
    : out;
  writeFileSync(outFile, body);
  console.log(`assembled ${outFile} (${Math.round(body.length / 1024)}KB) from shell + ${used.length} parts${missing.length ? ` · PENDING: ${missing.join(", ")}` : ""}${unused.length ? ` · UNUSED parts: ${unused.join(", ")}` : ""}`);
}
