import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html = () => readFileSync(new URL("../index.html", import.meta.url), "utf8");
function fn(name, stubs) {
  const src = html().match(new RegExp(`\\nfunction ${name}\\([^]*?\\n\\}\\n`))?.[0];
  assert.ok(src, `${name} must be present`);
  return new Function(...Object.keys(stubs), `${src}; return ${name};`)(...Object.values(stubs));
}

test("AVA can open on an empty project without suggesting a nonexistent activity", () => {
  const src = html().match(/function suggestions\(\) \{[^]*?\n\}/)[0];
  const p = { activities: [], name: "Empty", id: "P1" };
  const stubs = { contextProject: () => p, role: () => "PM", curTier: () => "basic", T: { msgs: [] }, myProjects: () => [p] };
  const suggest = new Function(...Object.keys(stubs), `${src}; return suggestions;`)(...Object.values(stubs));
  assert.doesNotThrow(() => suggest());
  assert.ok(!suggest().some(x => /undefined/.test(x)));
});

test("AVA refuses to apply a proposal after project access is removed", () => {
  const p = { id: "P1", activities: [], psrs: [] }; const x = { status: "pending", pid: "P1", type: "psr_narrative" };
  const toasts = [];
  const apply = fn("applyProposal", { T: { pending: { x } }, proj: () => p, myProjects: () => [], toast: s => toasts.push(s), renderTala: () => {} });
  assert.doesNotThrow(() => apply("x")); assert.equal(x.status, "dismissed"); assert.match(toasts[0], /access/i);
});

test("AVA respects disabled suggestions when applying an existing proposal", () => {
  const p = { id: "P1", activities: [] }; const x = { status: "pending", pid: "P1", type: "psr_narrative" };
  const toasts = [];
  const apply = fn("applyProposal", { T: { pending: { x } }, proj: () => p, myProjects: () => [p], actionsAllowed: () => false, toast: s => toasts.push(s), renderTala: () => {} });
  assert.doesNotThrow(() => apply("x")); assert.match(toasts[0], /disabled|turned off/i);
});

test("AVA rejects an old PSR proposal after project data changed", () => {
  const p = { id: "P1", activities: [] }; const x = { status: "pending", pid: "P1", type: "psr_narrative", avaFingerprint: "old", period: { y: 2026, m: 11 } };
  const toasts = [];
  const apply = fn("applyProposal", { T: { pending: { x } }, proj: () => p, myProjects: () => [p], actionsAllowed: () => true, avaFingerprint: () => "new", curPeriod: () => ({ y: 2026, m: 11 }), toast: s => toasts.push(s), renderTala: () => {} });
  assert.doesNotThrow(() => apply("x")); assert.equal(x.status, "dismissed"); assert.match(toasts[0], /changed|review again/i);
});


test("AVA fingerprints existing PSR narratives so manual edits invalidate pending drafts", () => {
  const source = html().match(/function avaFingerprint\(p\) \{[^\n]+/)[0];
  const fingerprint = new Function(source + '; return avaFingerprint;')();
  const p = { activities: [], issues: [], risks: [], fin: {}, psrs: [{ id: 'PSR1', period: { y: 2026, m: 11 }, status: 'Draft', narrative: { acc: 'First' } }] };
  const before = fingerprint(p); p.psrs[0].narrative.acc = 'Manual correction';
  assert.notEqual(fingerprint(p), before);
});

test("AVA discards a delayed answer when project scope changed", () => {
  const bot = { avaScope: 'old', text: '' };
  const useResult = fn('avaUseResult', { avaScopeStamp: () => 'new' });
  assert.throws(() => useResult(bot, { items: [{ answer: 'Sensitive old project' }] }), /access|scope/i);
  assert.equal(bot.text, '');
});

test("AVA excludes history from an earlier access scope from the next agent request", () => {
  const context = fn('avaContext', { curTier: () => 'advanced', TODAY: '2026-11-23', curPeriod: () => ({ y: 2026, m: 11 }), ROLE_LABEL: { PM: 'PM' }, role: () => 'PM', crumbText: () => 'Portfolio', myProjects: () => [], avaScopeStamp: () => 'new', T: { turns: [{ role: 'assistant', content: 'Old restricted data', scope: 'old' }] } });
  assert.deepEqual(context('Brief me', null).conversation, []);
});


test("AVA rejects an explicitly requested historical PSR period", () => {
  const matches = fn('avaDraftPeriodMatches', { curPeriod: () => ({ y: 2026, m: 11 }), MONF: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] });
  assert.equal(matches('Draft the October 2026 PSR narrative'), false);
  assert.equal(matches('Draft the November 2025 PSR narrative'), false);
  assert.equal(matches('Draft the November 2026 PSR narrative'), true);
  assert.equal(matches('Draft this month’s PSR narrative'), true);
});
