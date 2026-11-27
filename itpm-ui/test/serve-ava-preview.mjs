import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve, extname } from "node:path";
const root = resolve(import.meta.dirname, "..");
const html = readFileSync(resolve(root, "index.html"), "utf8")
  .replace('<script type="module" src="/src/bridge.js"></script>', `<script type="module">import * as rules from '/src/ava.js'; import * as wbs from '/src/wbs.js'; import * as bpi from '/src/bpi.js'; import * as dash from '/src/dash.js'; import * as binder from '/src/binder.js'; import * as wsr from '/src/wsr.js'; import * as tpl from '/src/tpl.js'; import * as report from '/src/report.js'; window.__ITPH_WBS = wbs; window.__ITPH_BPI = bpi; window.__ITPH_DASH = dash; window.__ITPH_BINDER = binder; window.__ITPH_WSR = wsr; window.__ITPH_TPL = tpl; window.__ITPH_REPORT = report; import { createAvaAgent, executionResult } from '/src/ava-agent.js'; window.__ITPH_AVA_RULES = { ...rules, executionResult };
  if (location.pathname === '/connected') {
    const contract = { Readiness: { Ready: true }, Definition: { Inputs: ['request', 'context'].map(Key => ({ Key, DataType: 'Text' })), Outputs: ['answer', 'accomplishments', 'next_period', 'issues'].map(Key => ({ Key, DataType: 'string' })).concat({ Key: 'propose_psr', DataType: 'boolean' }) } };
    const executions = new Map(); let seq = 0;
    const sdk = { app: { getAgent: () => ({ getContract: async () => contract, execute: async ({ inputData }) => { const id = 'ExFixture' + ++seq; const c = JSON.parse(inputData.context); executions.set(id, { ExecutionId: id, Status: 'Completed', Output: { items: [{ answer: 'AVA fixture reviewed ' + (c.project?.name || 'the visible portfolio') + '. Confirm overdue work and missing mitigation plans using the source records.', accomplishments: 'Fixture draft: verify completed activities against the reporting period.', next_period: 'Fixture draft: confirm next period activities and owners.', issues: 'Fixture draft: review unresolved blockers.', propose_psr: c.may_propose_psr }] } }); return { ExecutionId: id }; }, getExecution: async id => executions.get(id), onExecutionComplete: () => () => {} }) } };
    const ava = createAvaAgent(sdk, 'AgFixture'); window.__ITPH_AVA = { ...ava, getId: () => 'AgFixture' };
  }
  window.__ITPH_RESOLVE();</script>`)
  .replace(/function load\(\) \{ S = window\.__ITPH_STATE;[^\n]+/, 'function load() { S = seed(); postSeed(); }')
  .replace(/function save\(\) \{[^\n]+/, 'function save() {}');
const types = { '.js': 'text/javascript', '.webp': 'image/webp', '.css': 'text/css', '.png': 'image/png' };
createServer((req, res) => {
  if (req.url === '/' || req.url === '/connected') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); return; }
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const base = pathname.startsWith('/src/') ? root : resolve(root, 'public');
  const file = resolve(base, '.' + pathname);
  if (!file.startsWith(base + '/')) { res.writeHead(403); res.end(); return; }
  try { res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
}).listen(4179, '127.0.0.1', () => console.log('AVA fixture: http://127.0.0.1:4179 (built-in), /connected (simulated published agent)'));
