// pipeline.mjs — make "did every stage actually run?" a machine question, not a memory test.
//
//   node pipeline.mjs status  <runDir> [--mode comprehensive|quick]
//   node pipeline.mjs require <runDir> --before apply|deploy|seed [--mode …]
//
// WHY: the pipeline lived only as prose in CONDUCTOR.md, so completeness depended on the conductor
// remembering. On the personal-banking run the conductor skipped the `kf-verifier` gate entirely and
// only discovered it when the user asked "are you running the verification gates?" — the verifier
// then returned BLOCK with seven blockers, two of which would have created an unusable app in the
// customer's Kissflow account. A stage that is easy to skip and expensive to skip will be skipped.
//
// The enforcement point is deliberately NOT "warn the conductor". It is the three irreversible
// actions — apply, deploy-ui, seed-live. Those refuse to run unless the chain behind them is
// complete, because a published Kissflow process cannot be deleted: an unapproved build leaves
// debris in a customer account that outlives the conversation.

import { readFileSync, existsSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * A stage is done when its ARTIFACT exists on disk. That is the honest signal — not a log line, not
 * a checkbox someone ticked. `gate` stages additionally require a recorded pass in pipeline-state.
 *
 * `min: { n, count }` adds a CONTENT floor on top of existence. Existence alone is satisfiable by an
 * empty shell — `{"automations": []}` is a file, and a decisions log with no decisions in it is a
 * file. Both are exactly what a conductor in a hurry produces, and both read as "✓ done" to anything
 * that only calls existsSync. `count(text)` returns how many real entries the artifact holds.
 */
const countJsonArray = (key) => (text) => { try { const j = JSON.parse(text); return (Array.isArray(j) ? j : j?.[key] || []).length; } catch { return 0; } };
// A decision is a "## D<n> · …" heading. Numbered on purpose: they get cited by id from the review
// page and from later amendments (D1 → D1a), so an unnumbered paragraph is a note, not a decision.
const countDecisions = (text) => (text.match(/^#{2,3}\s*D\d+[a-z]?\s*[·:.\-–]/gim) || []).length;
export const STAGES = {
  comprehensive: [
    { id: "domain", label: "Domain (kf-ba)", artifact: "domain.json" },
    { id: "architecture", label: "Architecture (kf-architect)", artifact: "architecture.json" },
    { id: "data-model", label: "Data model (kf-data-architect)", artifact: "data-model.json" },
    { id: "workflow", label: "Workflow (kf-workflow-designer)", artifact: "workflow.json" },
    { id: "security", label: "Security (kf-security-designer)", artifact: "security.json" },
    { id: "automations", label: "Automations (kf-integration-analyst) — ≥2", artifact: "automations.json",
      min: { n: 2, count: countJsonArray("automations") },
      note: "an app where nothing fires automatically is one where every handoff waits for a human to notice — skipped silently on the first comprehensive run because nothing checked for it" },
    { id: "decisions", label: "Decisions recorded — ≥2", artifact: "decisions.md",
      min: { n: 2, count: countDecisions },
      note: "every gap this pipeline closes without asking is a decision taken on the customer's behalf; unrecorded, it is indistinguishable from an oversight at sign-off" },
    { id: "spec", label: "Merged App-Spec", artifact: "app-spec.json" },
    { id: "gate", label: "Deterministic gate", gate: true },
    { id: "verify", label: "Engine verify", gate: true },
    { id: "verifier", label: "Adversarial verifier (kf-verifier)", gate: true,
      note: "the stage most often skipped and most expensive to skip — it BLOCKS on semantics a clean gate cannot see" },
    { id: "experience", label: "Experience design (kf-experience-designer)", artifact: "prototype/experience-spec.json" },
    { id: "blueprint", label: "Blueprint rendered", artifact: "review.html", freshAgainst: "app-spec.json" },
    { id: "seed-data", label: "Seed authored", artifact: "seed.json" },
    { id: "prototype", label: "Prototype built + reviewable", gate: true, freshAgainst: "app-spec.json" },
    { id: "signoff", label: "Customer sign-off", gate: true,
      note: "a human gate — nothing may be created in the account before it" },
  ],
  // QUICK is a shorter pipeline, not a lesser app. Speed comes from fewer agent hops — never from
  // shipping an app where nothing fires on its own and nobody wrote down what was assumed. Express
  // decides instead of asking (CONDUCTOR "Turn 1 — EXPRESS by default"), which makes the decision log
  // the only record that a gap was closed deliberately rather than missed.
  quick: [
    { id: "spec", label: "App-Spec", artifact: "app-spec.json" },
    { id: "gate", label: "Deterministic gate", gate: true },
    { id: "automations", label: "Automations — ≥2", artifact: "automations.json",
      min: { n: 2, count: countJsonArray("automations") },
      note: "at least two, and a notification counts: the deadline nobody is watching and the handoff nobody is told about are the two an express app always has" },
    { id: "decisions", label: "Decisions recorded — ≥2", artifact: "decisions.md",
      min: { n: 2, count: countDecisions },
      note: "express answers its own questions — those answers ARE the decisions, and they have to be readable by the customer who never got asked" },
    { id: "seed-data", label: "Seed authored", artifact: "seed.json" },
    { id: "prototype", label: "Prototype built + reviewable", gate: true },
  ],
};

/** Which stages must be complete before each irreversible action. */
export const GUARDS = {
  apply:  { comprehensive: ["spec", "gate", "verify", "verifier", "automations", "decisions", "prototype", "signoff"],
            quick: ["spec", "gate", "automations", "decisions"] },
  deploy: { comprehensive: ["spec", "gate", "verify", "verifier", "prototype", "signoff"], quick: ["spec", "gate", "prototype"] },
  seed:   { comprehensive: ["spec", "gate", "verifier", "signoff"], quick: ["spec", "gate"] },
};

const statePath = (runDir) => join(runDir, "pipeline-state.json");

export function readState(runDir) {
  try { return JSON.parse(readFileSync(statePath(runDir), "utf8")); } catch { return { passed: {} }; }
}

/**
 * Record a gate's VERDICT. Stages write this; nothing infers it.
 *
 * Verdict, not a tick. The first cut recorded only "this stage ran", which meant a BLOCK verdict and
 * a PASS were indistinguishable to the guard — you could satisfy the chain with a gate that had just
 * told you not to proceed. A gate whose failure can be recorded as completion is not a gate.
 */
export function recordVerdict(runDir, stageId, verdict = "PASS", detail = "") {
  const v = String(verdict).toUpperCase();
  if (!["PASS", "BLOCK"].includes(v)) throw new Error(`verdict must be PASS or BLOCK, got '${verdict}'`);
  const s = readState(runDir);
  s.passed = s.passed || {};
  s.passed[stageId] = { verdict: v, at: new Date().toISOString(), detail };
  writeFileSync(statePath(runDir), JSON.stringify(s, null, 2) + "\n");
  return s;
}
export const recordPass = (runDir, stageId, detail = "") => recordVerdict(runDir, stageId, "PASS", detail);

/** A gate counts as satisfied only on an explicit PASS. Absent = not run; BLOCK = ran and said no. */
const verdictOf = (state, id) => {
  const e = state.passed?.[id];
  if (!e) return null;
  return e.verdict || "PASS"; // entries written before verdicts existed were only ever recorded on pass
};

export function status(runDir, mode = "comprehensive") {
  const state = readState(runDir);
  return (STAGES[mode] || STAGES.comprehensive).map((st) => {
    const verdict = st.gate ? verdictOf(state, st.id) : null;
    let done = st.gate ? verdict === "PASS" : existsSync(join(runDir, st.artifact));
    // CONTENT FLOOR. An artifact that exists but is empty is the failure mode this whole module was
    // written against, one level down: not "the stage was skipped" but "the stage was satisfied with
    // a placeholder". `{"automations": []}` passes existsSync and ships an app where every handoff
    // waits for a human to notice.
    let have = null;
    if (done && st.min) {
      try { have = st.min.count(readFileSync(join(runDir, st.artifact), "utf8")); } catch { have = 0; }
      if (have < st.min.n) done = false;
    }
    // FRESHNESS. Existing is not enough: an artifact OLDER than the spec it describes is stale, and a
    // stale sign-off artifact is worse than a missing one — a customer reads a data model that no
    // longer exists and approves it. The banking blueprint sat an hour behind app-spec.json and
    // nothing would have said so; it was only caught because a human asked (2026-08-02).
    let stale = false;
    if (done && st.freshAgainst) {
      const src = join(runDir, st.freshAgainst);
      const mine = st.gate ? Date.parse(state.passed?.[st.id]?.at || 0) : (existsSync(join(runDir, st.artifact)) ? statSync(join(runDir, st.artifact)).mtimeMs : 0);
      if (existsSync(src) && statSync(src).mtimeMs > mine) { stale = true; done = false; }
    }
    const short = st.min && have != null && have < st.min.n ? { have, need: st.min.n } : null;
    return { ...st, done, stale, short, verdict, at: state.passed?.[st.id]?.at || null };
  });
}

/** What is missing before `action` may run. Empty array = clear to proceed. */
export function missingFor(runDir, action, mode = "comprehensive") {
  const need = GUARDS[action]?.[mode] || [];
  const byId = new Map(status(runDir, mode).map((s) => [s.id, s]));
  return need.filter((id) => !byId.get(id)?.done).map((id) => byId.get(id) || { id, label: id });
}

/** Gates that ran and returned BLOCK — distinct from "not yet run", and never satisfiable by waiting. */
export function blockedIn(runDir, mode = "comprehensive") {
  return status(runDir, mode).filter((s) => s.verdict === "BLOCK");
}

if (process.argv[1] && process.argv[1].endsWith("pipeline.mjs")) {
  const [cmd, runDir] = process.argv.slice(2);
  const args = process.argv.slice(2);
  const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  const mode = flag("--mode") || "comprehensive";
  if (!cmd || !runDir) {
    console.error("usage: pipeline.mjs status <runDir> [--mode quick|comprehensive]");
    console.error("       pipeline.mjs require <runDir> --before apply|deploy|seed [--mode …]");
    console.error("       pipeline.mjs pass <runDir> --stage <id> [--detail \"…\"]");
    process.exit(2);
  }

  if (cmd === "pass") {
    const stage = flag("--stage");
    if (!stage) { console.error("pass: --stage <id> is required"); process.exit(2); }
    const verdict = (flag("--verdict") || "PASS").toUpperCase();
    recordVerdict(runDir, stage, verdict, flag("--detail") || "");
    console.log(`${verdict === "BLOCK" ? "✗" : "✓"} recorded ${stage} = ${verdict}`);
    process.exit(0);
  }

  if (cmd === "status") {
    const rows = status(runDir, mode);
    console.log(`\nPIPELINE · ${mode} · ${runDir}\n`);
    for (const r of rows) {
      const mark = r.done ? "✓" : r.stale ? "⟳" : r.short ? "◐" : r.verdict === "BLOCK" ? "✗" : "·";
      const state = r.stale ? "  STALE" : r.short ? `  ${r.short.have}/${r.short.need}` : r.verdict === "BLOCK" ? "  BLOCKED" : r.done && r.at ? `  (${r.at.slice(0, 16).replace("T", " ")})` : "";
      console.log(`  ${mark} ${r.label}${state}`);
      if (r.stale) console.log(`      older than ${r.freshAgainst} — it describes a spec that has since changed; regenerate it`);
      else if (r.short) console.log(`      ${r.artifact} exists but holds ${r.short.have} — the floor is ${r.short.need}. ${r.note || ""}`);
      else if (r.verdict === "BLOCK") console.log(`      this gate RAN and said no — its findings must be fixed and the gate re-run`);
      else if (!r.done && r.note) console.log(`      ${r.note}`);
    }
    const left = rows.filter((r) => !r.done);
    console.log(`\n${left.length ? `${left.length} stage(s) outstanding: ${left.map((r) => r.id).join(", ")}` : "all stages complete"}\n`);
    process.exit(0);
  }

  if (cmd === "require") {
    const action = flag("--before");
    if (!action || !GUARDS[action]) { console.error(`require: --before must be one of ${Object.keys(GUARDS).join("|")}`); process.exit(2); }
    const missing = missingFor(runDir, action, mode);
    if (!missing.length) { console.log(`✓ clear to ${action} — every required stage is complete`); process.exit(0); }
    console.error(`\n✗ REFUSING to ${action}: ${missing.length} required stage(s) not complete\n`);
    for (const m of missing) {
      console.error(`  ${m.verdict === "BLOCK" ? "✗" : m.short ? "◐" : "·"} ${m.label}${m.verdict === "BLOCK" ? "  — RAN AND BLOCKED" : m.short ? `  — only ${m.short.have} of ${m.short.need}` : ""}`);
      if (m.verdict === "BLOCK") console.error(`      fix its findings and re-run the gate; waiting will not clear this`);
      else if (m.short) console.error(`      ${m.artifact} exists but holds ${m.short.have}. ${m.note || ""}`);
      else if (m.note) console.error(`      ${m.note}`);
    }
    console.error(`\n${action === "apply" || action === "seed"
      ? "This creates records in a real Kissflow account, and a published process cannot be deleted."
      : "This publishes a bundle to a real Kissflow account."} Complete the stages above, or pass --force if you own the consequences.\n`);
    process.exit(1);
  }

  console.error(`unknown command '${cmd}'`);
  process.exit(2);
}
