import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../scripts/ava-ui.js", import.meta.url), "utf8");
function fn(name, stubs) {
  const code = source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}\\n`))?.[0];
  assert.ok(code, `${name} must exist`);
  return new Function(...Object.keys(stubs), `${code}; return ${name};`)(...Object.values(stubs));
}
const p = { id: "P1", code: "PRJ-2026-014", psrs: [] };
const period = { y: 2026, m: 11 };
const report = { id: "R1", period, status: "Draft" };
function eligibility(overrides = {}) {
  return fn("avaReadinessAllowed", { canEdit: () => true, curTier: () => "advanced", myProjects: () => [p], curPeriod: () => period, ...overrides });
}
test("readiness is limited to PM-owned current editable reports and preparation", () => {
  const allowed = eligibility();
  assert.equal(allowed(p), true);
  assert.equal(allowed(p, report), true);
  for (const status of ["Submitted", "For PS Approval", "Approved"]) assert.equal(allowed(p, { ...report, status }), false);
  assert.equal(allowed(p, { ...report, period: { y: 2026, m: 10 } }), false);
  assert.equal(allowed({ ...p, psrs: [{ ...report, status: "Submitted" }] }), false);
  assert.equal(eligibility({ canEdit: () => false })(p, report), false);
  assert.equal(eligibility({ curTier: () => "basic" })(p, report), false);
  assert.equal(eligibility({ myProjects: () => [] })(p, report), false);
});
test("readiness result expires after data, access scope, date or period changes", () => {
  const state = { fingerprint: "data", scope: "scope", period, today: "2026-11-23", projectId: p.id };
  const fresh = overrides => fn("avaReadinessFresh", { avaFingerprint: () => "data", avaScopeStamp: () => "scope", curPeriod: () => period, TODAY: "2026-11-23", ...overrides });
  assert.equal(fresh()(p, state), true);
  assert.equal(fresh({ avaFingerprint: () => "changed" })(p, state), false);
  assert.equal(fresh({ avaScopeStamp: () => "different" })(p, state), false);
  assert.equal(fresh({ curPeriod: () => ({ y: 2026, m: 12 }) })(p, state), false);
  assert.equal(fresh({ TODAY: "2026-11-24" })(p, state), false);
  assert.equal(fresh()({ ...p, id: "P2" }, state), false);
});
test("readiness action rechecks access and refuses duplicate or unknown-outcome runs", async () => {
  const calls = [];
  const state = { busy: false, unknownOutcome: false };
  let permitted = true;
  const run = fn("avaStartReadiness", { myProjects: () => [p], avaReadinessAllowed: () => permitted, T: state, askTala: async (...args) => calls.push(args), toast: () => {} });
  await run(p.id, "");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].inline, true);
  assert.match(calls[0][0], /PRJ-2026-014/);
  state.busy = true; await run(p.id, "");
  state.busy = false; state.unknownOutcome = true; await run(p.id, "");
  state.unknownOutcome = false; permitted = false; await run(p.id, "");
  assert.equal(calls.length, 1);
});

function runner(run) {
  const state = { msgs: [], turns: [], open: true, busy: false };
  let proposals = 0;
  let refreshes = 0;
  const ask = fn("askTala", { T: state, ui: { me: "U1" }, avaProject: () => p, curTier: () => "advanced", avaFingerprint: () => "data", curPeriod: () => period, avaScopeStamp: () => "scope", TODAY: "2026-11-23", AbortController,
    addMsg: m => state.msgs.push(m), renderTala: () => {}, avaRefreshReadiness: () => refreshes++, avaDraftPeriodMatches: () => true,
    window: { __ITPH_AGENTS: { ari: { getId: () => "AgTest", run } } }, avaContext: () => ({ project: p }),
    avaUseResult: (bot, result) => { bot.text = result.items[0].answer; if (bot.avaCanDraft && result.items[0].propose_psr) proposals++; }, toast: () => {} });
  return { ask, state, proposals: () => proposals, refreshes: () => refreshes };
}
test("inline review calls the agent once, stays on the page and cannot propose a PSR", async () => {
  let calls = 0;
  const before = JSON.stringify(p);
  const harness = runner(async () => { calls++; return { items: [{ answer: "Review evidence", propose_psr: true }] }; });
  await harness.ask("Review project PRJ-2026-014 for reporting readiness", { inline: true });
  assert.equal(calls, 1);
  assert.equal(harness.state.open, false);
  assert.equal(harness.state.busy, false);
  assert.equal(harness.state.psrReadiness.bot.text, "Review evidence");
  assert.equal(harness.state.psrReadiness.bot.thinking, false);
  assert.equal(harness.proposals(), 0);
  assert.ok(harness.refreshes() >= 2);
  assert.equal(JSON.stringify(p), before);
});
test("inline execution failures retain the execution ID without retrying", async () => {
  let calls = 0;
  const harness = runner(async () => { calls++; throw Object.assign(new Error("Observation stopped"), { executionId: "Ex1" }); });
  await harness.ask("Review project PRJ-2026-014", { inline: true });
  const bot = harness.state.psrReadiness.bot;
  assert.equal(calls, 1);
  assert.equal(bot.failed, true);
  assert.equal(bot.checkable, true);
  assert.equal(bot.executionId, "Ex1");
  assert.equal(bot.text, "Observation stopped");
  assert.equal(harness.state.busy, false);
});
test("inline review never retries an unknown execution outcome", async () => {
  let calls = 0;
  const harness = runner(async () => { calls++; throw Object.assign(new Error("Unknown outcome"), { code: "AGENT_EXECUTE_OUTCOME_UNKNOWN" }); });
  await harness.ask("Review project PRJ-2026-014", { inline: true });
  await harness.ask("Review project PRJ-2026-014", { inline: true });
  assert.equal(calls, 1);
  assert.equal(harness.state.unknownOutcome, true);
});
test("source cards include every finding when requested and escape record text", () => {
  const esc = s => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
  const render = fn("avaSourceCard", { myProjects: () => [p], esc });
  const findings = Array.from({ length: 12 }, (_, i) => ({ label: `A${i}: <script>`, severity: "warning", reason: "Missing owner", action: "Assign owner", tab: "schedule" }));
  const html = render({ projectId: p.id, projectCode: p.code, projectName: "Project", asOf: "2026-11-23", findings, unverifiedUpdates: 2 }, findings.length);
  assert.equal((html.match(/data-ava-source/g) || []).length, 12);
  assert.match(html, /data-p="P1" data-tab="schedule"/);
  assert.match(html, /A11: &lt;script>/);
  assert.ok(!html.includes("<script>"));
});

test("clearing the conversation also clears and refreshes an inline review", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const marker = "document.addEventListener('click', e => {\n  const el = e.target.closest('[data-t]');";
  const start = html.indexOf(marker);
  assert.ok(start >= 0);
  const code = html.slice(start, html.indexOf("}, true);", start) + 9);
  const state = { msgs: [{}], turns: [], pending: {}, busy: true, ctl: { abort() {} }, psrReadiness: { bot: { thinking: true } } };
  let listener, refreshes = 0;
  new Function("document", "T", "renderTala", "avaRefreshReadiness", code)({ addEventListener: (_, fn) => { listener = fn; } }, state, () => {}, () => refreshes++);
  const el = { dataset: { t: "clear" }, closest: () => true };
  listener({ target: { closest: () => el }, stopPropagation() {} });
  assert.equal(state.psrReadiness, null);
  assert.equal(state.busy, false);
  assert.equal(refreshes, 1);
});

function generatedFn(name, stubs) {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const code = html.match(new RegExp(`function ${name}\\([^]*?\\n\\}\\n`))?.[0];
  assert.ok(code);
  return new Function(...Object.keys(stubs), `${code}; return ${name};`)(...Object.values(stubs));
}
test("report detail embeds readiness while portfolio reports render independently", () => {
  const empty = () => "";
  const stubs = Object.fromEntries(["theoCard", "psrSteps", "periodLabel", "pill", "req", "pct", "peso", "pesoFull", "fd", "fds", "psrWbsTables", "statusPill", "aiAv", "uname"].map(k => [k, empty]));
  Object.assign(stubs, { role: () => "PM", ui: { me: "U1" }, esc: x => String(x || ""), MONF: Array(12).fill("November"), TALA_IC: "", avaReadinessCard: () => "READINESS_MARKER", needsPS: () => false });
  const render = generatedFn("psrDetail", stubs);
  const project = { ...p, pm: "U1" };
  const r = { ...report, narrative: {}, attachments: [], history: [], snap: { master: {}, health: { reasons: [] }, sched: {}, fin: {}, milestones: [], behind: [], ahead: [], next: [], issues: [], risks: [], actions: [] } };
  assert.match(render(project, r), /READINESS_MARKER/);
  assert.ok(!render(project, r, { step: "DH" }).includes("READINESS_MARKER"));
  const portfolio = generatedFn("ppsrView", { ...stubs, curPeriod: () => period, me: () => ({ name: "PM" }), TODAY: "2026-11-23" });
  assert.doesNotThrow(() => portfolio([]));
});
