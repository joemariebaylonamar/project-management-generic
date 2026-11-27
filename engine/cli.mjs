#!/usr/bin/env node
// kf-author engine CLI. Dependency-free.
//   node cli.mjs validate <ir.json>          — validate the App-Spec IR (shape + cross-refs)
//   node cli.mjs verify   <ir.json>          — IR validation + coherence checks
//   node cli.mjs build    <ir.json> [--out d]— compile IR → metadata blobs (DRY-RUN: writes to d/)
//   node cli.mjs check    <appExportDir>     — run validators over a real export folder
//   node cli.mjs import   <appExportDir>     — load an export → (partial) IR-ish summary

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { validateIR, checkCoherenceIR, checkGateIR, checkAppFloor, validationGate } from "./ir.mjs";
import { ensureExperience } from "./experience.mjs";
import { buildApp, normalizeIR } from "./builders.mjs";
import { stamp as tlStamp } from "./timeline.mjs";
import { dirname as tlDirname } from "node:path";
// auto-timing: every verify/build/apply stamps the run's timeline.jsonl (actor = $KF_ACTOR or "engine");
// failures are silent — instrumentation never breaks the pipeline.
const tl = (irPath, step, ev) => { try { tlStamp(tlDirname(irPath), process.env.KF_ACTOR || "engine", step, ev); } catch { /* never fatal */ } };
import { loadApp, allBlobs } from "./loader.mjs";
import { validateBlob, errors, warnings } from "./validators.mjs";

// Minimal, zero-dep .env loader — the engine reads process.env but nothing populates it.
// Loads (cwd) .env then inventory/.env; already-set real env vars always win.
for (const f of [".env", "inventory/.env"]) {
  try {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || line.trimStart().startsWith("#")) continue;
      const k = m[1]; let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (process.env[k] === undefined) process.env[k] = v;
    }
  } catch { /* no such file — fine */ }
}

// `arg` is each command's OPTIONAL leading positional (an ir.json path, a zip path…). Commands whose
// positional is genuinely optional (deploy-ui's URL mode: `deploy-ui --app X --url Y`, no zip path)
// would otherwise have their FIRST FLAG swallowed into `arg` — then `flag("--app")` can't find "--app"
// in the remainder (it's gone) and misreports as missing (found live, 2026-07-31: deploy-ui's own
// documented URL-mode usage example fails this way). Only bind `arg` when the token isn't a flag.
const [cmd, ...cmdArgs] = process.argv.slice(2);
const arg = cmdArgs[0] && !cmdArgs[0].startsWith("--") ? cmdArgs[0] : undefined;
const rest = arg !== undefined ? cmdArgs.slice(1) : cmdArgs;
const flag = (n, d) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : d; };
const hasFlag = (n) => rest.includes(n);
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
// Every command that takes an IR reads it through here. normalizeIR was added to validate/verify, gate
// and build one at a time, which left `apply` and `validation-gate` reading the file raw — so a
// design-shape spec passed every gate AND the whole dry-run build, then failed at the one command that
// mutates Kissflow (apply saw forms/roles/permissions undefined and exited on 23 validation errors),
// while validation-gate diffed a lowered live IR against a raw desired one and read it as "every flow
// deleted, nothing created". One loader, so no shape can be understood by some commands only.
const readIR = (p) => normalizeIR(readJson(p));
const report = (issues) => {
  for (const i of issues) console.log(`  ${i.level === "error" ? "✗" : "•"} [${i.code}] ${i.msg}${i.where ? "  (" + i.where + ")" : ""}`);
  console.log(`\n  ${errors(issues).length} errors, ${warnings(issues).length} warnings`);
};

if (!cmd || cmd === "help") {
  console.log("kf-author engine — validate | verify | gate | validation-gate <live> <desired> [--scope] | build [--no-pages] | check | import | resolve-experience | deploy-ui");
  process.exit(0);
}

try {
  if (cmd === "validate" || cmd === "verify") {
    tl(arg, cmd, "start");
    const ir = readIR(arg);
    const res = validateIR(ir);
    const issues = cmd === "verify" ? [...res.issues, ...checkCoherenceIR(ir)] : res.issues;
    console.log(`\nIR: ${ir.app?.name || "(unnamed)"}`);
    report(issues);
    tl(arg, cmd, "end");
    process.exit(errors(issues).length ? 1 : 0);
  }

  // `validation-gate` — the VALIDATION ENGINE GATE (EDIT PATH ONLY). Diffs the DESIRED IR against the
  // LIVE (imported) IR and BLOCKS any change outside the intended scope — so an edit can never silently
  // rewrite unrelated items. Requires a live baseline; a fresh CREATE has none, so it is NOT run there.
  //   node cli.mjs validation-gate <liveIR.json> <desiredIR.json> [--scope id1,id2,…]
  if (cmd === "validation-gate") {
    const desiredArg = rest[0]; // argv[4] — argv[3] is `arg` (the live IR)
    if (!arg || !desiredArg) { console.error("usage: validation-gate <liveIR.json> <desiredIR.json> [--scope id1,id2]"); process.exit(2); }
    const si = process.argv.indexOf("--scope");
    const scope = si >= 0 && process.argv[si + 1] ? process.argv[si + 1].split(",").map((s) => s.trim()).filter(Boolean) : null;
    const r = validationGate(readIR(arg), readIR(desiredArg), { scope });
    console.log(`\nVALIDATION ENGINE GATE (edit scope) · ${r.changes.length} change(s)${r.scoped ? ` · scope: ${scope.join(", ")}` : " · (no scope declared — full changeset shown)"}`);
    for (const c of r.changes) console.log(`  ${r.scoped && r.outOfScope.includes(c) ? "✗ OUT-OF-SCOPE" : "•"} ${c.change} ${c.kind} '${c.id}'`);
    if (r.scoped && !r.pass) {
      console.log(`\n❌ BLOCKED — ${r.outOfScope.length} change(s) outside the intended scope. An edit must touch ONLY what was asked; import the live app and patch the delta rather than re-creating the IR.`);
      process.exit(1);
    }
    console.log(`\n${r.scoped ? "✅ IN SCOPE — every change is within the intended edit." : "ℹ️  review the changeset above; pass --scope to enforce."}`);
    process.exit(0);
  }

  // `gate` — the HYBRID's DETERMINISTIC structural pass: validate + coherence + checkGateIR, run every
  // step at ~ms with NO model. Blockers (errors) must be fixed before advancing; risks (warns) are
  // surfaced for waiver. The AI verifier/coherence-critic run this FIRST, then reason only about the
  // SEMANTIC layer (relevance/meaningfulness/novelty) that code cannot judge.
  if (cmd === "gate") {
    tl(arg, "gate", "start");
    const ir = readIR(arg);
    const issues = [...validateIR(ir).issues, ...checkCoherenceIR(ir), ...checkGateIR(ir), ...checkAppFloor(ir)];
    const blockers = errors(issues), risks = warnings(issues);
    console.log(`\nGATE (deterministic) · ${ir.app?.name || "(unnamed)"}`);
    report(issues);
    console.log(`\n${blockers.length ? "❌ BLOCKED" : "✅ STRUCTURE OK"} — ${blockers.length} blocker(s), ${risks.length} risk(s)` +
      (blockers.length ? "" : "\n   next: AI gate reasons ONLY about semantics (relevant dashboards? meaningful landings? novel breaks?)"));
    tl(arg, "gate", "end");
    process.exit(blockers.length ? 1 : 0);
  }

  if (cmd === "build") {
    tl(arg, "build", "start");
    const ir = readIR(arg);
    // --no-pages: CUSTOM-UI mode — build app + models + roles + workflows WITHOUT native pages/nav.
    if (hasFlag("--no-pages")) { ir.pages = []; console.log("no-pages: skipping experience layer — no native pages/nav will be built"); }
    else {
      const exp = ensureExperience(ir); // GUARANTEE: every build has pages + nav + role landings
      if (exp.added.length) console.log(`experience: auto-added baseline (${exp.added.length}) — ${exp.added.join(", ")}\n(design richer pages via kf-experience-designer to override)`);
    }
    const v = validateIR(ir);
    if (!v.ok) { console.log("IR invalid — fix before building:"); report(v.issues); tl(arg, "build", "end"), process.exit(1); }
    const { appId, artifacts } = buildApp(ir);
    const out = flag("--out", join(process.cwd(), "kf-build-out"));
    mkdirSync(out, { recursive: true });
    console.log(`\nPLAN — app ${appId}: ${artifacts.length} artifacts (DRY-RUN → ${out})`);
    let issues = [];
    for (const a of artifacts) {
      const dir = join(out, a.type); mkdirSync(dir, { recursive: true });
      if (a.doc) writeFileSync(join(dir, `${a.id}.doc.json`), JSON.stringify(a.doc, null, 2));
      if (a.shell) writeFileSync(join(dir, `${a.id}.shell.json`), JSON.stringify(a.shell, null, 2));
      if (a.blob) {
        writeFileSync(join(dir, `${a.id}.blob.json`), JSON.stringify(a.blob, null, 2));
        issues = issues.concat(validateBlob({ label: a.id, blob: a.blob }));
      }
      console.log(`  + ${a.type.padEnd(6)} ${a.id}`);
    }
    console.log("\nvalidation of generated metadata:");
    report(issues);
    console.log("\n(use --apply --target <env> to publish — gated; not implemented in dry-run build)");
    tl(arg, "build", "end"), process.exit(errors(issues).length ? 1 : 0);
  }

  if (cmd === "apply") {
    // PIPELINE GUARD — apply creates records in a real Kissflow account and a published process
    // cannot be deleted, so the chain behind it must be complete. This is enforcement, not advice:
    // the personal-banking run reached apply-readiness with the adversarial verifier never run, and
    // that verifier went on to return BLOCK with two defects that would have produced an unusable
    // app in the customer's account. `--force` remains for when you own the consequences.
    if (!cmdArgs.includes("--force")) {
      const runDir = dirname(resolve(arg));
      const mode = cmdArgs.includes("--quick") ? "quick" : "comprehensive";
      const { missingFor } = await import("./pipeline.mjs");
      const missing = missingFor(runDir, "apply", mode);
      if (missing.length) {
        console.error(`\n✗ REFUSING to apply — ${missing.length} required stage(s) incomplete in ${runDir}:`);
        for (const m of missing) console.error(`  ${m.short ? "◐" : "·"} ${m.label}${m.short ? ` — ${m.artifact} holds only ${m.short.have} of ${m.short.need}` : ""}${m.note ? `\n      ${m.note}` : ""}`);
        console.error(`\nRun \`node plugins/app-agents/engine/pipeline.mjs status ${runDir}\` for the full chain.`);
        console.error("Record a gate with `pipeline.mjs pass <runDir> --stage <id>`, or re-run with --force.\n");
        process.exit(1);
      }
    }
    tl(arg, "apply", "start");
    const ir = readIR(arg);
    // --no-pages: CUSTOM-UI mode — apply app + models + roles + workflows only. Skip the experience layer
    // ENTIRELY, including the AI page generator: a custom-UI app never shows native dashboards, and the
    // generator's async create→preview→generate→publish loop was the single biggest cost inside apply
    // (~90s for 3 dashboards nobody sees — measured customer-accounts 2026-07-31).
    if (hasFlag("--no-pages")) { ir.pages = []; process.env.KF_AI_PAGES = "0"; console.log("no-pages: skipping experience layer — no native pages/nav, no AI dashboards"); }
    else {
      const exp = ensureExperience(ir); // GUARANTEE: every applied app has pages + nav + role landings
      if (exp.added.length) console.log(`experience: auto-added baseline (${exp.added.length}) — ${exp.added.join(", ")}`);
    }
    // validity AND the app floor. Apply is the last gate before records exist in a real account, and
    // a structurally perfect app with no workflow, no computed anything and nothing that fires is not
    // one worth creating there.
    const v = validateIR(ir);
    const floor = checkAppFloor(ir);
    if (!v.ok || floor.length) { console.log("IR not ready to apply:"); report([...v.issues, ...floor]); tl(arg, "apply", "end"), process.exit(1); }
    const { applyIR } = await import("./client.mjs");
    // RESUMABLE: checkpoint next to the IR so a re-run (e.g. after a bash-timeout kill in Cowork)
    // continues instead of re-publishing. Delete apply-state.json to force a clean re-apply.
    const stateFile = join(dirname(arg), "apply-state.json");
    if (existsSync(stateFile)) console.log(`resuming from checkpoint ${stateFile} (delete it to start clean)`);
    // REUSE THE EXISTING APP on a resumed apply. applyIR supports `opts.reuse = {appId, genToServer}`
    // (skips app-create + re-fetches flows that already exist) — but until now nothing here ever
    // passed it, so a second `apply` on a run that already created its app unconditionally called
    // createApp again and 400'd (found live, 2026-07-31: Tiffin's re-apply after an IR fix tried to
    // recreate an app that already existed). id-map.json is applyIR's OWN output (`{app, genToServer}`,
    // written at the end of a run) — read it back if present.
    const idMapFile = join(dirname(arg), "id-map.json");
    let reuse;
    if (existsSync(idMapFile)) {
      try {
        const m = readJson(idMapFile);
        if (m.app) { reuse = { appId: m.app, genToServer: m.genToServer || {} }; console.log(`reuse: found existing app ${m.app} in id-map.json (${Object.keys(reuse.genToServer).length} flow ids)`); }
      } catch { console.log(`id-map.json unreadable — will create a new app (delete it if that's wrong)`); }
    }
    const devHost = (process.env.KISSFLOW_DOMAIN || process.env.KF_DOMAIN) || `${process.env.KISSFLOW_SUBDOMAIN || process.env.KF_SUBDOMAIN}.kissflow.com`;
    const prodHost = (process.env.KISSFLOW_PROD_DOMAIN || process.env.KF_PROD_DOMAIN) || (process.env.KISSFLOW_PROD_SUBDOMAIN || process.env.KF_PROD_SUBDOMAIN ? `${process.env.KISSFLOW_PROD_SUBDOMAIN || process.env.KF_PROD_SUBDOMAIN}.kissflow.com` : "");
    console.log(`\nAPPLY (LIVE) — ${ir.app?.name} → ${devHost}`);
    // App creation is triggered in PROD (Kissflow replicates it to dev); everything else is built in dev.
    if (prodHost) console.log(`  app shell will be created in prod (${prodHost}) → awaited in dev (${devHost})`);
    else console.log(`  (no PROD creds set — app will be created directly in ${devHost})`);
    // AI PAGES are the DEFAULT: generate role dashboards via Kissflow's AI page generator (richer,
    // natively-correct pages bound to real flows). Opt out with --no-ai-pages or KF_AI_PAGES=0 to use
    // the template page path instead.
    const aiPages = !hasFlag("--no-ai-pages") && process.env.KF_AI_PAGES !== "0";
    console.log(aiPages
      ? "ai-pages (default): generating role dashboards via the AI page generator (async create→preview→generate→publish)"
      : "ai-pages disabled — using the template page path");
    const rep = await applyIR(ir, { stateFile, aiPages, reuse });
    console.log("\n=== REPORT ===");
    console.log(`app: ${rep.app}`);
    console.log(`roles: ${rep.roles.map((r) => r.name + "(" + r.status + ")").join(", ")}`);
    console.log(`created shells: ${rep.created.length}  published: ${rep.published.length}${rep.skipped?.length ? ` (${rep.skipped.length} unchanged, skipped — incremental)` : ""}`);
    if (rep.aiPages) console.log(`ai-pages: ${rep.aiPages.length} role dashboards generated (${rep.aiPages.map((p) => p.role + "→" + p.page).join(", ")})`);
    console.log(`verified nested in app: ${rep.verified.nestedInApp}`);
    if (rep.verified.flows) console.log(`  ${rep.verified.flows.join(", ")}`);
    if (rep.errors.length) { console.log("errors:"); rep.errors.forEach((e) => console.log("  ✗ " + e)); }
    tl(arg, "apply", "end"), process.exit(rep.errors.length ? 1 : 0);
  }

  // LIVE import: `import --live <runDir> [--out live.ir.json]` (also accepts --target for doc parity) —
  // reconstruct the ENGINE IR from the app's LIVE metadata via the run's id-map. This is the reconciler's
  // real baseline + kf-comprehension's static model. Without a flag, `import` keeps its local-dir behavior.
  if (cmd === "import" && (process.argv.includes("--live") || process.argv.includes("--target"))) {
    // runDir = the first non-flag arg that exists (robust to `import --live <runDir>` OR `import <runDir> --live`)
    const runDir = [arg, ...rest].find((a) => a && !a.startsWith("--") && existsSync(a)) || "runs/current";
    const oi = process.argv.indexOf("--out"); const out = oi >= 0 ? process.argv[oi + 1] : null;
    const { importLiveIR } = await import("./import-live.mjs");
    const live = await importLiveIR({ runDir });
    if (out) { writeFileSync(out, JSON.stringify(live, null, 1)); console.log(`import (live) → ${out} · ${live.forms.length} forms reconstructed from live`); }
    else process.stdout.write(JSON.stringify(live, null, 1));
    process.exit(0);
  }

  if (cmd === "check" || cmd === "import") {
    if (!existsSync(arg)) { console.log(`no such folder: ${arg}`); process.exit(1); }
    const app = loadApp(arg);
    const blobs = allBlobs(app);
    console.log(`\n${arg}: ${app.forms.length} forms, ${app.cases.length} cases, ${app.processes.length} processes, ${app.pages.length} pages, ${app.lists.length} lists, ${blobs.length} blobs`);
    if (cmd === "check") {
      let issues = [];
      for (const b of blobs) issues = issues.concat(validateBlob(b));
      report(issues);
      process.exit(errors(issues).length ? 1 : 0);
    }
    process.exit(0);
  }

  if (cmd === "resolve-experience") {
    const [expPath, schemaPath] = [arg, rest[0]];
    if (!expPath || !schemaPath || schemaPath.startsWith("--")) {
      console.error("usage: node cli.mjs resolve-experience <experience-spec.json> <kf-schema.json> [--out lib/ui-spec.json]");
      process.exit(1);
    }
    const { resolveExperience } = await import("./resolve.mjs");
    const experienceSpec = readJson(expPath);
    const kfSchema = readJson(schemaPath);
    const { uiSpec, warnings: warns } = resolveExperience(experienceSpec, kfSchema);
    const out = flag("--out", join(process.cwd(), "lib/ui-spec.json"));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(uiSpec, null, 2));
    const widgetCount = uiSpec.pages.reduce((n, p) => n + p.widgets.length, 0);
    const droppedWidgets = warns.filter((w) => w.widget).length;
    const droppedPages = warns.filter((w) => w.page && !w.widget).length;
    console.log(`\nresolve-experience → ${out}`);
    console.log(`  app:     ${uiSpec.app.name} (theme: ${uiSpec.app.theme})`);
    console.log(`  roles:   ${uiSpec.roles.length}`);
    console.log(`  pages:   ${uiSpec.pages.length} resolved${droppedPages ? `, ${droppedPages} dropped` : ""}`);
    console.log(`  widgets: ${widgetCount} resolved${droppedWidgets ? `, ${droppedWidgets} dropped` : ""}`);
    if (warns.length) {
      console.error(`\n${warns.length} warning(s):`);
      for (const w of warns) console.error(`  • ${w.page ? `[${w.page}] ` : ""}${w.widget ? `"${w.widget}": ` : ""}${w.reason}`);
    } else {
      console.error("\nno warnings — every bind resolved to a real id.");
    }
    process.exit(0);
  }

  if (cmd === "deploy-ui") {
    // node cli.mjs deploy-ui <zipPath> --app <appId> [--name "App UI"] [--url <devUrl>] [--open]
    // Deploys the built React zip (or a dev URL) as the app's Application custom component + enables Custom UI.
    const appId = flag("--app");
    const url = flag("--url");
    const name = flag("--name");
    const zipPath = arg && !arg.startsWith("--") ? arg : undefined;
    if (!appId || (!zipPath && !url)) {
      console.error("usage: node cli.mjs deploy-ui <zipPath> --app <appId> [--name \"App UI\"] [--url <devUrl>] [--open]");
      console.error("  ZIP mode : node cli.mjs deploy-ui dist/app-ui.zip --app APP123   (upload+trigger+poll — blob upload is TODO(live-verify))");
      console.error("  URL mode : node cli.mjs deploy-ui --app APP123 --url https://localhost:3000 --open   (simple, reliable — no blob upload; --open launches the app)");
      console.error("  requires env: KISSFLOW_ACCOUNT_ID/API_KEY/API_SECRET (or KF_*) + KISSFLOW_DOMAIN/KF_DOMAIN");
      process.exit(1);
    }
    const { deployUI } = await import("./deploy-ui.mjs");
    console.log(`\nDEPLOY-UI (LIVE) — app ${appId} → ${(process.env.KISSFLOW_DOMAIN || process.env.KF_DOMAIN) || `${process.env.KISSFLOW_SUBDOMAIN}.kissflow.com`}  [mode: ${url ? "url" : "zip"}]`);
    const rep = await deployUI({ appId, zipPath, url, name });
    console.log("\n=== DEPLOY-UI REPORT ===");
    console.log(`component id: ${rep.componentId}`);
    console.log(`mode: ${rep.mode}`);
    console.log(`app url: ${rep.appUrl}`);
    if (rep.warnings.length) { console.log("warnings:"); rep.warnings.forEach((w) => console.log("  • " + w)); }
    // --open: launch the app in the default browser (platform-aware). Best-effort — never fatal.
    if (hasFlag("--open") && rep.appUrl) {
      const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
      const oArgs = process.platform === "win32" ? ["/c", "start", "", rep.appUrl] : [rep.appUrl];
      try {
        const { spawn } = await import("node:child_process");
        spawn(opener, oArgs, { stdio: "ignore", detached: true }).unref();
        console.log(`opened ${rep.appUrl} in your default browser`);
      } catch (e) { console.log(`could not open the browser (${e.message}) — visit ${rep.appUrl}`); }
    }
    process.exit(0);
  }

  console.log(`unknown command: ${cmd}`);
  process.exit(1);
} catch (e) {
  console.error(`error: ${e.message}`);
  process.exit(1);
}
