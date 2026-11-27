// Public Kissflow Custom Agent SDK only: https://developers.kissflow.com/app/agent/
const INPUTS = { request: "text", context: "text" };
const OUTPUTS = { answer: "string", accomplishments: "string", next_period: "string", issues: "string", propose_psr: "boolean" };
function failure(e, executionId) {
  const err = new Error(e?.error || e?.message || (typeof e === "string" ? e : "AVA request failed."));
  err.code = e?.errorCode || e?.code || "AVA_FAILED";
  err.executionId = executionId || e?.executionId;
  return err;
}
export function executionResult(execution) {
  if (execution?.Status === "Failed") throw failure(execution.Error, execution.ExecutionId);
  if (execution?.Status !== "Completed") return null;
  const items = execution.Output?.items;
  if (!Array.isArray(items) || items.length !== 1 || typeof items[0]?.answer !== "string" || !items[0].answer.trim()) throw failure({ error: "AVA returned no valid answer.", code: "AVA_INVALID_OUTPUT" }, execution.ExecutionId);
  const item = items[0];
  if (item.propose_psr !== undefined && typeof item.propose_psr !== "boolean") throw failure({ error: "AVA returned an invalid PSR proposal flag.", code: "AVA_INVALID_OUTPUT" }, execution.ExecutionId);
  for (const key of ["accomplishments", "next_period", "issues"]) if (item[key] !== undefined && typeof item[key] !== "string") throw failure({ error: `AVA returned invalid ${key}.`, code: "AVA_INVALID_OUTPUT" }, execution.ExecutionId);
  const safeItem = Object.fromEntries(Object.keys(OUTPUTS).filter(key => item[key] !== undefined).map(key => [key, item[key]]));
  return { executionId: execution.ExecutionId, items: [safeItem] };
}
export function createAvaAgent(kf, agentId) {
  let agent;
  function instance() {
    if (!agentId) throw failure({ error: "AVA is not connected. Configure its published Kissflow Agent ID.", code: "AVA_NOT_CONFIGURED" });
    if (typeof kf?.app?.getAgent !== "function") throw failure({ error: "Kissflow Custom Agent is unavailable in this view. Open the app inside Kissflow with a supported SDK.", code: "AGENT_HOST_UNSUPPORTED" });
    return agent || (agent = kf.app.getAgent(agentId));
  }
  async function connect() {
    try {
      const contract = await instance().getContract();
      if (contract?.Readiness?.Ready !== true) throw failure({ error: "AVA's published agent is not ready. Check its definition in Kissflow.", code: "AVA_NOT_READY" });
      const def = contract.Definition;
      const matches = (list, keys) => Object.entries(keys).every(([key, type]) => list?.some(x => x.Key === key && String(x.DataType).toLowerCase() === type));
      if (!matches(def?.Inputs, INPUTS) || !matches(def?.Outputs, OUTPUTS) || def.Inputs.some(x => x.Required && !(x.Key in INPUTS))) throw failure({ error: "AVA's published input/output contract does not match the app. See docs/AVA-CUSTOM-AGENT.md.", code: "AVA_CONTRACT_MISMATCH" });
      return contract;
    } catch (e) { throw failure(e); }
  }
  async function read(id) {
    try { return await instance().getExecution(id); } catch (e) { throw failure(e, id); }
  }
  async function observe(id, signal) {
    if (signal?.aborted) throw failure({ error: "Stopped waiting. The Kissflow run may still finish.", code: "AVA_STOPPED" }, id);
    const current = await read(id);
    const result = executionResult(current); if (result) return result;
    return new Promise((resolve, reject) => {
      let stop, settled = false;
      const clean = () => { signal?.removeEventListener("abort", abort); if (typeof stop === "function") { stop(); stop = null; } };
      const finish = (err, value) => { if (settled) return; settled = true; clean(); err ? reject(failure(err, id)) : resolve(value); };
      const abort = () => finish({ error: "Stopped waiting. The Kissflow run may still finish.", code: "AVA_STOPPED" });
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) { abort(); return; }
      try {
        stop = instance().onExecutionComplete(id, execution => {
          try { const value = executionResult(execution); if (value) finish(null, value); }
          catch (e) { finish(e); }
        }, e => finish(e));
        if (settled) clean();
      } catch (e) { finish(e); }
    });
  }
  async function run(inputData, { signal, onAccepted } = {}) {
    await connect();
    if (signal?.aborted) throw failure({ error: "Stopped before starting.", code: "AVA_STOPPED" });
    let id;
    try {
      // Never retry execute: an unknown outcome may already have started a run.
      const accepted = await instance().execute({ inputData });
      id = accepted?.ExecutionId;
      if (!id) throw failure({ error: "Kissflow did not return an execution ID. The request may still have started.", code: "AGENT_EXECUTE_OUTCOME_UNKNOWN" });
      onAccepted?.(id);
      return await observe(id, signal);
    } catch (e) { throw failure(e, id); }
  }
  return { connect, run, read, observe };
}
