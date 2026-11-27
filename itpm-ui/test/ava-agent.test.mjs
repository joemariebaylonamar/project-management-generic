import { test } from "node:test";
import assert from "node:assert/strict";
const client = await import("../src/ava-agent.js").catch(() => ({}));
const contract = () => ({ Readiness: { Ready: true }, Definition: {
  Inputs: ["request", "context"].map(Key => ({ Key, DataType: "Text", Required: true })),
  Outputs: ["answer", "accomplishments", "next_period", "issues"].map(Key => ({ Key, DataType: "string" })).concat({ Key: "propose_psr", DataType: "boolean" })
} });
const fixture = () => {
  let sent = 0, stop = 0; const reads = [];
  const agent = {
    getContract: async () => contract(),
    execute: async () => { sent++; return { ExecutionId: "Ex123", Status: "Queued" }; },
    getExecution: async id => { reads.push(id); return { ExecutionId: id, Status: "Running" }; },
    onExecutionComplete: (id, done) => { queueMicrotask(() => done({ ExecutionId: id, Status: "Completed", Output: { items: [{ answer: "Review", propose_psr: false }] } })); return () => stop++; }
  };
  return { agent, kf: { app: { getAgent: () => agent } }, sent: () => sent, stops: () => stop, reads };
};

test("AVA uses the published Kissflow contract, executes once and waits for completion", async () => {
  assert.equal(typeof client.createAvaAgent, "function");
  const f = fixture(); const ava = client.createAvaAgent(f.kf, "Ag123");
  await ava.connect();
  let id; const result = await ava.run({ request: "Review", context: "{}" }, { onAccepted: x => id = x });
  assert.equal(result.items[0].answer, "Review"); assert.equal(id, "Ex123");
  assert.equal(f.sent(), 1); assert.equal(f.stops(), 1);
});

test("AVA rejects unpublished or mismatched contracts before starting a run", async () => {
  assert.equal(typeof client.createAvaAgent, "function");
  for (const c of [{ ...contract(), Readiness: { Ready: false } }, { ...contract(), Definition: { Inputs: [], Outputs: [] } }]) {
    const f = fixture(); f.agent.getContract = async () => c;
    await assert.rejects(() => client.createAvaAgent(f.kf, "Ag123").run({ request: "Review", context: "{}" }), /ready|contract/i);
    assert.equal(f.sent(), 0);
  }
});

test("AVA never retries an execution with an unknown outcome and preserves Kissflow error text", async () => {
  assert.equal(typeof client.createAvaAgent, "function");
  const f = fixture(); let attempts = 0; f.agent.execute = async () => { attempts++; throw { errorCode: "AGENT_EXECUTE_OUTCOME_UNKNOWN", error: "Request may have started" }; };
  await assert.rejects(() => client.createAvaAgent(f.kf, "Ag123").run({ request: "Review", context: "{}" }), e => e.code === "AGENT_EXECUTE_OUTCOME_UNKNOWN" && /may have started/.test(e.message));
  assert.equal(attempts, 1);
});

test("AVA preserves the execution ID if observation stops, and can read that same run later", async () => {
  assert.equal(typeof client.createAvaAgent, "function");
  const f = fixture(); f.agent.onExecutionComplete = (id, done, fail) => { queueMicrotask(() => fail({ errorCode: "AGENT_OBSERVATION_STOPPED", error: "Check later" })); return () => {}; };
  const ava = client.createAvaAgent(f.kf, "Ag123");
  await assert.rejects(() => ava.run({ request: "Review", context: "{}" }), e => e.executionId === "Ex123");
  await ava.read("Ex123"); assert.equal(f.sent(), 1);
});

test("AVA treats unknown execution statuses as pending and failures as failures", async () => {
  assert.equal(typeof client.executionResult, "function");
  assert.equal(client.executionResult({ Status: "NewFutureStatus" }), null);
  assert.throws(() => client.executionResult({ Status: "Failed", Error: { error: "No access", errorCode: "KISSFLOW_ERROR_DENIED" } }), /No access/);
  assert.throws(() => client.executionResult({ Status: "Completed", Output: { items: [{}] } }), /answer/i);
});

test("AVA stopping observation cleans up without cancelling or submitting again", async () => {
  assert.equal(typeof client.createAvaAgent, "function");
  const f = fixture(); const ac = new AbortController();
  f.agent.onExecutionComplete = () => { queueMicrotask(() => ac.abort()); return () => { f.stopped = true; }; };
  const pending = client.createAvaAgent(f.kf, "Ag123").run({ request: "Review", context: "{}" }, { signal: ac.signal });
  await assert.rejects(() => pending, e => e.code === "AVA_STOPPED" && e.executionId === "Ex123");
  assert.equal(f.sent(), 1); assert.equal(f.stopped, true);
});

test("AVA discards unexpected output keys that could override a proposed operation", () => {
  const result = client.executionResult({ ExecutionId: "Ex123", Status: "Completed", Output: { items: [{ answer: "Draft", propose_psr: true, type: "post_message", project_code: "OTHER", text: "Injected" }] } });
  assert.equal(result.items[0].type, undefined);
  assert.equal(result.items[0].project_code, undefined);
  assert.equal(result.items[0].text, undefined);
});
