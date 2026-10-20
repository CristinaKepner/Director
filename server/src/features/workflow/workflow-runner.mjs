import { workflowOrder, workflowInputs } from "./workflow-routing.mjs";
import { performNode } from "./workflow-steps.mjs";
export async function executeWorkflow(graph, services) {
  const run = { status: "running", records: [], used: 0 };
  try {
    await visitGraph(graph, services, run);
    run.status = "completed";
  } catch (e) {
    failRun(run, e, services.signal);
  }
  return run;
}
async function visitGraph(graph, services, run) {
  const order = workflowOrder(graph);
  for (const node of order) {
    services.signal?.throwIfAborted();
    const input = workflowInputs(graph, node, run.records);
    const record = await visitNode(node, input, services, run);
    run.records.push(record);
    services.onChange?.(structuredClone(run));
  }
}
async function visitNode(node, input, services, run) {
  if (input.blockedBy) return skippedNode(node, input);
  try {
    const result = await performNode(node, input, services, run);
    return completedNode(node, input, result);
  } catch (e) {
    recordFailure(run, node, e);
    throw e;
  }
}

function failRun(run, error, signal) {
  run.status = signal?.aborted
    ? "cancelled"
    : error.review
      ? "needs-review"
      : "failed";
  run.reason = error.message;
}
function recordFailure(run, node, error) {
  run.records.push({
    id: node.id,
    label: node.label || node.type,
    status: error.review ? "needs-review" : "failed",
    reason: error.message,
  });
}

function completedNode(node, input, result) {
  return {
    id: node.id,
    label: node.label || node.type,
    status: "done",
    trace: [...input.trace, node.id],
    ...result,
  };
}

function skippedNode(node, input) {
  return { id: node.id, status: "skipped", blockedBy: input.blockedBy };
}
