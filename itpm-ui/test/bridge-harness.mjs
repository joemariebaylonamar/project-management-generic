import { readFileSync } from "node:fs";
import vm from "node:vm";
import * as wbs from "../src/wbs.js";
import * as bpi from "../src/bpi.js";
import * as binder from "../src/binder.js";
import * as wsr from "../src/wsr.js";
import * as dash from "../src/dash.js";
import * as tpl from "../src/tpl.js";
import * as report from "../src/report.js";
import * as avaRules from "../src/ava.js";
import * as projectAgents from "../src/project-agents.js";
import { createAvaAgent, executionResult } from "../src/ava-agent.js";
import { planRows } from "../src/sync-plan.js";
import { deleteIfPresent } from "../src/kf-errors.js";

// Execute the real bridge; replace only browser facilities and the remote SDK boundary.
// Boot is omitted so tests can supply a controlled server and clock before calling load/sync.
export function bridgeHarness({ rows = {}, reports = [], failWrite = () => false, failAfterWrite = () => false } = {}) {
  const timers = new Map(), messages = [], writes = [], listeners = new Map();
  let now = 0, nextTimer = 0;
  const window = { self: {}, top: {}, addEventListener: (name, fn) => listeners.set(name, fn), __TEST_STATUSES: {
    ITPMD_Issue_A00: { Status_l3jjzr: "Open", Status_87cghd: "In Progress", Status_8fqyx7: "Escalated", Status_150cqqx: "Resolved", Status_pcyljz: "Closed" },
    ITPMD_Action_Item_A00: { Status_16bbge2: "Open", Status_16b2yr2: "Done" }
  } };
  const request = async (method, path, body) => {
    if (method !== "GET") {
      if (failWrite(method, path, body)) throw new Error("network unavailable");
      writes.push({ method, path, body: structuredClone(body) });
      const match = path.match(/\/(form|case)\/2\/A\/([^/?]+)(?:\/([^/?]+))?/);
      if (!match) throw new Error(`Unexpected write: ${method} ${path}`);
      if (!match[3]) {
        const records = rows[match[2]] || (rows[match[2]] = []);
        const record = { _id: `NEW-${records.length + 1}`, ...structuredClone(body) };
        records.push(record);
        if (failAfterWrite(method, path, body)) throw new Error("response lost after create");
        return structuredClone(record);
      }
      const record = rows[match[2]]?.find(r => r._id === match[3]);
      if (!record) throw new Error(`Missing server record: ${path}`);
      if (path.includes("/move")) {
        const target = path.split("/").at(-2);
        const name = window.__TEST_STATUSES?.[match[2]]?.[target];
        if (!name) throw new Error(`Unknown board status: ${target}`);
        record._status_id = target; record._status_name = name;
      } else Object.assign(record, structuredClone(body));
      return structuredClone(record);
    }
    if (path.startsWith("/app_role/")) return { Members: [] };
    const list = path.match(/\/(?:form|case)\/2\/A\/([^/]+)\/list/);
    if (list) return { Data: structuredClone(rows[list[1]] || []) };
    if (path.includes("/myitems")) return { Data: structuredClone(reports) };
    if (path.includes("/progress")) return { Steps: [{ Name: "Draft", _status: "InProgress", _activity_instance_id: "D1" }] };
    if (path.includes("/ITPMD_Project_Status_Report_A00/")) return structuredClone(reports.find(r => path.includes(`/${r._id}/`)) || {});
    throw new Error(`Unexpected read: ${path}`);
  };
  const sdk = { preview: true, user: { _id: "U1", Name: "Manager" }, app: {
    getDataform: model => ({ createItem: ({ data }) => request("POST", `/form/2/A/${model}`, data), updateItem: ({ itemId, data }) => request("POST", `/form/2/A/${model}/${itemId}`, data) }),
    getBoard: model => ({ createItem: ({ data }) => request("POST", `/case/2/A/${model}`, data), updateItem: ({ instanceId, data }) => request("POST", `/case/2/A/${model}/${instanceId}`, data) })
  } };
  const setTimeout = (fn, delay = 0) => { const id = ++nextTimer; timers.set(id, { fn, at: now + delay }); return id; };
  const source = readFileSync(new URL("../src/bridge.js", import.meta.url), "utf8")
    .replace(/^import .*;\n/gm, "")
    .replaceAll("import.meta.env", "({ DEV: false })")
    .split("\n(async () => {\n")[0];
  const context = vm.createContext({ window, document: {
    createElement: () => ({ style: {}, remove() {} }),
    body: { appendChild: el => messages.push(el.textContent) }, getElementById: () => null
  }, console: { error() {}, warn() {} }, setTimeout, clearTimeout: id => timers.delete(id),
  wbs, bpi, binder, wsr, dash, tpl, report, avaRules, projectAgents, createAvaAgent, executionResult, planRows, deleteIfPresent, schema: { roles: [] } });
  vm.runInContext(source + `\nkf = suppliedSdk; acc = "A"; api = suppliedRequest;
    globalThis.bridge = { load, sync, attach: () => attachPsrs(), baseline: S => window.__ITPH_BASELINE(S),
      save: S => window.__ITPH_SAVE(S), pending: () => savePending || saveRunning };`,
    Object.assign(context, { suppliedSdk: sdk, suppliedRequest: request }));
  return { ...context.bridge, window, rows, writes, messages, listeners,
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at; timers.delete(next[0]); await next[1].fn();
      }
      now = end;
    }
  };
}
export const projectRow = () => ({ _id: "P1", project_name: "Alpha", project_code: "ITP-001", project_start_date: "2026-10-01", RoERtv3vbU79: { _id: "U1", Name: "Manager" } });
