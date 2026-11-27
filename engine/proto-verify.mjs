// proto-verify.mjs — deterministic, dependency-free verification of an assembled prototype.
//
// Catches the failure classes that silently blank a role in a PARALLEL build, WITHOUT a browser:
//   1. SYNTAX  — every <script> in the assembled file must parse. A part corrupted at splice time
//                (e.g. the `$'` string-replacement bug) yields invalid JS; the browser then runs
//                NONE of that <script>, blanking the role. `vm.compileFunction` throws on such parts.
//   2. MARKERS — no leftover `<!-- @PART:role-… -->` (a missing/unspliced part) and one rv-<slug>
//                roleview section per role.
//   3. EMPTY   — static heuristic: a container declared with id="…" inside a role's data-page markup
//                that its own script never targets (getElementById('…')) will render empty.
//   4. LEAK    — `${…}` left in the MARKUP. The page parses, the scripts compile, the containers
//                fill — and the user reads `${fmtMoney(8850)}` on the stat card. Correct-looking
//                code, visibly wrong output: the one class a syntax check cannot see.
//   5. HANDLER  — an inline on*="…" handler that builds markup, cut in half by the first quote
//                inside that markup, so the rest of the source prints on the page. Same shape as 4:
//                everything compiles, and the screen is wrong.
//
// Scripts are attributed to a role via the assembler's "<!-- part:<key> script (deferred…) -->"
// breadcrumb, so a syntax error is reported against the offending role, not just "somewhere".
//
// Usage:  node proto-verify.mjs <assembled-index.html>
// Exit 0 = PASS, 1 = FAIL. Programmatic: import { verify } and pass the html string.

import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const SCRIPT_RE = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
const PART_SCRIPT_RE = /<!--\s*part:role-([a-z0-9_-]+) script \(deferred by assembler\)\s*-->\s*<script\b[^>]*>([\s\S]*?)<\/script>/gi;
const ROLE_MARKER_RE = /<!--\s*@PART:role-([a-z0-9_-]+)\s*-->/gi;
const ROLEVIEW_RE = /id="rv-([a-z0-9_-]+)"/gi;

// compile (not run) a script body; return an error string on SyntaxError, else null.
function syntaxError(code) {
  try { vm.compileFunction(code, [], { filename: "part.js" }); return null; }
  catch (e) { return `${e.name}: ${e.message.split("\n")[0]}`; }
}

// Every assignment to the global PAGES map in one script body, classified on its own merits.
//
// The map is shared: each role's part adds its renderers to it, so the only safe write is one that
// preserves whatever is already there. Judging the file as a whole let one correct line vouch for
// every incorrect one, so each assignment is looked at where it sits, together with the guard (if
// any) immediately before it. All the spellings count — `window.PAGES`, `window["PAGES"]`,
// `globalThis.PAGES`, `self.PAGES`, and `||=` — because a part that reaches the map by another name
// wipes it just as thoroughly.
const PAGES_WRITE_RE = /(?:window|globalThis|self)\s*(?:\.\s*PAGES|\[\s*["']PAGES["']\s*\])\s*(\|\|)?=\s*([^;\n]*)/g;
export function pagesAssignments(code) {
  const out = [];
  for (const m of String(code || "").matchAll(PAGES_WRITE_RE)) {
    const logicalOr = Boolean(m[1]);            // `||=`
    const rhs = (m[2] || "").trim();
    const text = `${m[0].trim().slice(0, 70)}${m[0].length > 70 ? "…" : ""}`;
    // `PAGES = PAGES || {…}` and `PAGES ||= {…}` are the same shape: the braces are a FALLBACK, used
    // only when nothing registered first — so a map inside them is silently discarded when something
    // did. Empty braces are the correct idiom; anything else is the sneaky variant.
    const fallback = logicalOr ? rhs : (/^(?:window|globalThis|self)\s*(?:\.\s*PAGES|\[\s*["']PAGES["']\s*\])\s*\|\|\s*([\s\S]*)$/.exec(rhs) || [])[1];
    if (fallback !== undefined) {
      out.push({ kind: /^\{\s*\}$/.test(String(fallback).trim()) ? "safe" : "dropped", text });
      continue;
    }
    // A bare `= {}` is safe ONLY behind a guard — `if (!window.PAGES) window.PAGES = {};` is the
    // idiom people reach for and it preserves an existing map exactly like the `||` form.
    const before = String(code).slice(Math.max(0, m.index - 80), m.index);
    const guarded = /if\s*\(\s*!\s*(?:window|globalThis|self)\s*(?:\.\s*PAGES|\[\s*["']PAGES["']\s*\])\s*\)\s*$/.test(before)
      || /typeof\s+(?:window|globalThis|self)\s*(?:\.\s*PAGES|\[\s*["']PAGES["']\s*\])\s*===?\s*["']undefined["']\s*\)\s*$/.test(before);
    if (/^\{\s*\}$/.test(rhs)) { out.push({ kind: guarded ? "safe" : "clobber", text }); continue; }
    if (/^\{/.test(rhs)) { out.push({ kind: "clobber", text }); continue; }
    out.push({ kind: "safe", text });   // assigning something that is not an object literal (rare)
  }
  return out;
}

// which id="…" containers a chunk of markup declares (targets of a render loop)
function declaredIds(html) {
  const ids = new Set();
  for (const m of html.matchAll(/\bid="([a-zA-Z0-9_-]+)"/g)) ids.add(m[1]);
  return ids;
}

export function verify(html) {
  const roles = [...html.matchAll(ROLEVIEW_RE)].map((m) => m[1].toLowerCase());
  const findings = []; // { role, level:'error'|'warn', kind, msg }

  // 0. THE BLANK-PAGE CHECK. Every per-role check below can pass while the assembled page renders
  // nothing at all: the shell's boot reads window.ROLES in switchRole(), the role <select> and
  // boot() itself, and for months nothing ever WROTE it — three shipped prototypes were
  // chrome-only blanks with an empty role switcher and a green PASS (2026-08-02). A verifier that
  // cannot catch "the page is empty" is checking the wrong thing, so this is now the first check.
  if (/window\.ROLES\b/.test(html) && !/window\.ROLES\s*=/.test(html))
    findings.push({ role: "(shell)", level: "error", kind: "NO_ROLES_DATA",
      msg: "the shell reads window.ROLES but nothing defines it — every page stays hidden and the role switcher is empty (regenerate the shell: design-language.mjs shell <experience-spec.json>)" });
  if (roles.length && !/window\.PAGES\s*=/.test(html))
    findings.push({ role: "(shell)", level: "error", kind: "NO_PAGES_DATA",
      msg: "no window.PAGES registration anywhere — no role part registered a page renderer" });

  // 1. leftover @PART markers = a part the shell wanted was never spliced
  for (const m of html.matchAll(ROLE_MARKER_RE))
    findings.push({ role: m[1].toLowerCase(), level: "error", kind: "MISSING_PART", msg: `unspliced marker @PART:role-${m[1]} (part missing or never generated)` });

  // 2. syntax-check every <script>, attributing part scripts to their role
  const partScripts = new Map(); // role -> [code,…]
  for (const m of html.matchAll(PART_SCRIPT_RE)) {
    const role = m[1].toLowerCase();
    if (!partScripts.has(role)) partScripts.set(role, []);
    partScripts.get(role).push(m[2]);
    const err = syntaxError(m[2]);
    if (err) findings.push({ role, level: "error", kind: "SCRIPT_SYNTAX", msg: `<script> fails to parse → whole part is dead: ${err}` });
    // PAGES_CLOBBER / PAGES_DROPPED — a part that PLAIN-ASSIGNS window.PAGES wipes (or is wiped by)
    // every other role's page renderers, so whole roles render dead with NO console error (live build
    // 2026-07-25). Only additive registration is safe: window.PAGES = window.PAGES || {}; Object.assign.
    //
    // Judged PER ASSIGNMENT — see pagesAssignments(). Testing the whole part body meant one safe idiom
    // anywhere in the file exempted every real clobber elsewhere in it: a part that opened with the
    // guarded line and then reassigned `window.PAGES = {…}` further down passed clean, which is the
    // exact shipping failure this rule exists to stop.
    for (const a of pagesAssignments(m[2])) {
      if (a.kind === "clobber")
        findings.push({ role, level: "error", kind: "PAGES_CLOBBER", msg: `part assigns \`${a.text}\` — clobbers other roles' page renderers; use window.PAGES = window.PAGES || {}; Object.assign(window.PAGES, {…})` });
      else if (a.kind === "dropped")
        findings.push({ role, level: "error", kind: "PAGES_DROPPED", msg: `\`${a.text}\` — the map is DISCARDED if another part registered first; use window.PAGES = window.PAGES || {}; Object.assign(window.PAGES, {…})` });
    }
  }
  // any non-part (shell) scripts too — a broken shell script kills every role
  const partBodies = new Set([...partScripts.values()].flat());
  for (const m of html.matchAll(SCRIPT_RE)) {
    if (partBodies.has(m[1])) continue;
    const err = syntaxError(m[1]);
    if (err) findings.push({ role: "(shell)", level: "error", kind: "SCRIPT_SYNTAX", msg: `shell <script> fails to parse: ${err}` });
  }

  // 2b. `${…}` left in MARKUP. A part file is plain HTML: interpolation only works inside a JS
  // template literal, so a `${EMPTY_ICON}` in the body ships to the page as those literal characters.
  // It reads as a typo the user sees before anyone else does (live build 2026-07-30).
  const markupOnly = html.replace(SCRIPT_RE, "");
  for (const m of markupOnly.matchAll(/\$\{\s*[A-Za-z_$][\w$.]*\s*\}/g)) {
    const before = markupOnly.slice(0, m.index);
    const rv = [...before.matchAll(/id="rv-([a-z0-9_-]+)"/gi)].pop();
    findings.push({ role: rv ? rv[1].toLowerCase() : "(shell)", level: "error", kind: "LITERAL_PLACEHOLDER",
      msg: `${m[0]} sits in markup, not in a template literal — it renders as those exact characters` });
  }

  // 3. per role: roleview markup declares containers its script never fills → will render empty
  for (const role of roles) {
    const rv = html.match(new RegExp(`id="rv-${role}"[\\s\\S]*?</section>`, "i"));
    if (!rv) { findings.push({ role, level: "error", kind: "NO_ROLEVIEW", msg: `no <section id="rv-${role}">` }); continue; }
    const scripts = (partScripts.get(role) || []).join("\n");
    if (!scripts.trim()) { findings.push({ role, level: "warn", kind: "NO_SCRIPT", msg: "role has no <script> — every widget is static/empty" }); continue; }
    // ids declared in markup but never targeted by getElementById in this role's scripts
    const targeted = new Set([...scripts.matchAll(/getElementById\(\s*["'`]([a-zA-Z0-9_-]+)["'`]/g)].map((m) => m[1]));
    // only flag empty "mount point" ids: ones whose element is declared empty (no inner content follows immediately)
    const emptyMounts = [...rv[0].matchAll(/id="([a-zA-Z0-9_-]+)"\s*>\s*<\/[a-z]+>/gi)].map((m) => m[1]);
    const orphans = emptyMounts.filter((id) => id.startsWith(role + "-") && !targeted.has(id));
    if (orphans.length) findings.push({ role, level: "warn", kind: "EMPTY_CONTAINER", msg: `container(s) declared but never populated: ${orphans.join(", ")}` });
  }

  // 4. TEMPLATE_LEAK — `${…}` that reached the MARKUP. Inside a backtick template literal that is a
  //    value; in static HTML it is TEXT, so the user reads `${fmtMoney(8850)}` where the number
  //    belongs and `${ICON('chart','')}` where the icon belongs. Nothing else catches this: the page
  //    parses, every script compiles, every container is populated — it is simply WRONG on screen,
  //    which is the one failure a syntax check can never see. (Live build 2026-08-08.)
  const noScript = html.replace(SCRIPT_RE, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  const rvAt = [...noScript.matchAll(/id="rv-([a-z0-9_-]+)"/gi)].map((m) => ({ i: m.index, role: m[1].toLowerCase() }));
  const roleAt = (idx) => {
    let r = "(shell)";
    for (const s of rvAt) { if (s.i <= idx) r = s.role; else break; }
    return r;
  };
  const leaks = new Map(); // role → up to 3 samples, so the report names the widget, not just the file
  for (const m of noScript.matchAll(/\$\{[^{}]{1,120}\}/g)) {
    const role = roleAt(m.index);
    if (!leaks.has(role)) leaks.set(role, []);
    const seen = leaks.get(role);
    if (seen.length < 3) seen.push(m[0].replace(/\s+/g, " ").slice(0, 60));
  }
  for (const [role, samples] of leaks)
    findings.push({ role, level: "error", kind: "TEMPLATE_LEAK", msg: `template syntax rendered as literal TEXT: ${samples.join("  ")} — markup built with a quoted string instead of a backtick template literal (or written straight into static HTML, where \${} means nothing)` });

  // 5. HANDLER_LEAK — an inline handler that BUILDS MARKUP, cut in half by its own quoting.
  //
  //      <button onclick="const form = `<h3 class="t">New briefing</h3>`; window.openPopup(form); ">
  //
  //    Inside a double-quoted attribute the FIRST `"` ends the attribute — here the one in
  //    class="t". The browser keeps `const form = ` as the handler, then reads the remainder as
  //    markup and text, so the page shows the tail of the user's own source:
  //
  //      `; window.openPopup(form); ">
  //
  //    printed under the card, above a button that now does nothing. (Live build: BriefingHub,
  //    2026-08-09.)
  //
  //    Every other check passes: the file parses, the <script>s compile, no ${} survived, no
  //    container is empty. The break is in an ATTRIBUTE, which is not JavaScript to a syntax checker
  //    and not a container to the empty check — so it is looked for where it is visible, in the text
  //    the page renders. That also makes the check indifferent to how the quoting broke: anything
  //    that puts code on screen is caught, not just this spelling.
  //
  //    The real rule is one line, and it is enforced here because a prompt cannot enforce it: markup
  //    never goes inside an on*="" attribute. Name a function, define it in <script>, call it.
  const JS_TELLS = [
    [/window\.\w+\s*\(/, "a call to window.*() is being read as text"],
    [/document\.(?:getElementById|querySelector(?:All)?)\s*\(/, "a DOM lookup is being read as text"],
    [/\.innerHTML\s*=/, "an innerHTML assignment is being read as text"],
    [/\bclassList\.(?:add|remove|toggle)\s*\(/, "a classList call is being read as text"],
    [/`\s*;/, "the end of a template literal is being read as text"],
    [/"\s*>\s*$/, "the tail of an attribute the browser gave up on"],
  ];
  const broken = new Map();  // role → up to 3 samples
  // `>` is allowed INSIDE the run on purpose: the stray `">` the browser could not use is part of
  // what the reader is seeing, and excluding it would skip the very text this check exists for.
  for (const seg of noScript.matchAll(/>([^<]{4,400})</g)) {
    const text = seg[1].trim();
    if (!text) continue;
    const hit = JS_TELLS.find(([re]) => re.test(text));
    if (!hit) continue;
    const role = roleAt(seg.index);
    if (!broken.has(role)) broken.set(role, []);
    const seen = broken.get(role);
    if (seen.length < 3) seen.push(`${text.replace(/\s+/g, " ").slice(0, 70)}  (${hit[1]})`);
  }
  for (const [role, samples] of broken)
    findings.push({ role, level: "error", kind: "HANDLER_LEAK", msg: `source code rendered as page text: ${samples.join("  ·  ")} — an inline on*="…" handler built markup inline, and the first quote inside that markup closed the attribute. Move the markup into a named function in <script> and call it by name from the handler` });

  // 6. TABLE_ORPHAN — table rows written into something that is not a table.
  //
  //    Assigning `<tr>…</tr>` to the innerHTML of a <div> does not fail and does not warn. The parser
  //    simply DISCARDS the tr and td tags, because they are not valid there, and keeps the text
  //    inside them. What lands on screen is every cell of every row run together in one paragraph,
  //    under a header that still looks like a table because the header was written in real markup.
  //    (Live build: POF Risk & HAZID Manager, 2026-08-10 — 16 assessments as one block of prose.)
  //
  //    Nothing else sees it: the file parses, the script compiles, the container is populated, so the
  //    empty check is satisfied by the very text that proves it went wrong.
  const bodies = new Map();  // container id → tag name it was declared as
  for (const m of html.matchAll(/<(\w+)\b[^>]*\bid="([^"]+)"/g)) if (!bodies.has(m[2])) bodies.set(m[2], m[1].toLowerCase());
  const orphans = new Map();
  for (const [, body] of html.matchAll(SCRIPT_RE)) {
    // `el.innerHTML = "…<tr…"` in any of the spellings the builder uses
    for (const a of body.matchAll(/getElementById\(\s*["'`]([^"'`]+)["'`]\s*\)[^\n;]{0,80}?\.innerHTML\s*=/g)) {
      const id = a[1];
      // Scoped to THIS assignment. A wide lookahead found a <tr> belonging to a later statement and
      // blamed an icon container for it — 51 false positives on one prototype, which is how a check
      // gets switched off. Stop at the next getElementById or the end of the statement.
      const rest = body.slice(a.index + a[0].length);
      const stops = [rest.indexOf("getElementById("), rest.indexOf(";\n")].filter((i) => i >= 0);
      const tail = rest.slice(0, Math.min(400, ...(stops.length ? stops : [400])));
      if (!/<tr\b/i.test(tail)) continue;
      const tag = bodies.get(id);
      if (tag && tag !== "tbody" && tag !== "table" && tag !== "thead" && tag !== "tfoot") {
        if (!orphans.has(id)) orphans.set(id, tag);
      }
    }
  }
  for (const [id, tag] of orphans) {
    findings.push({ role: roleAt(html.indexOf(`id="${id}"`)), level: "error", kind: "TABLE_ORPHAN",
      msg: `rows are written into <${tag} id="${id}">, which is not a table — the parser drops every <tr> and <td> and leaves their text run together in one block. Put the rows in a <tbody id="${id}"> inside the <table>` });
  }

  const errorRoles = [...new Set(findings.filter((f) => f.level === "error").map((f) => f.role))];
  const warnRoles = [...new Set(findings.filter((f) => f.level === "warn").map((f) => f.role))];
  return { roles, findings, errorRoles, warnRoles, pass: errorRoles.length === 0 };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (isMain) {
  const file = process.argv[2];
  if (!file) { console.error("usage: proto-verify.mjs <assembled-index.html>"); process.exit(2); }
  if (!existsSync(file)) { console.error(`proto-verify: no such file: ${file}`); process.exit(2); }
  const r = verify(readFileSync(file, "utf8"));
  for (const f of r.findings) console.log(`  ${f.level === "error" ? "✗" : "⚠"} [${f.role}] ${f.kind}: ${f.msg}`);
  console.log(`\n${r.pass ? "✅ PASS" : "❌ FAIL"} — ${r.roles.length} roles · ${r.errorRoles.length} with errors${r.warnRoles.length ? ` · ${r.warnRoles.length} with warnings` : ""}`);
  if (!r.pass) console.log(`   broken roles: ${r.errorRoles.join(", ")}`);
  process.exit(r.pass ? 0 : 1);
}
