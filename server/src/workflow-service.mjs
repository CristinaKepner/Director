import crypto from "node:crypto";
import { executeWorkflow } from "./workflow-runner.mjs";
import { workflowOrder } from "./workflow-routing.mjs";
import { workflowJob, submitWorkflowJob } from "./workflow-generation.mjs";
export function createWorkflowService(options) {
  recoverInterrupted(options.store);
  const state = { active: null, closed: false };
  const unsubscribe = options.store.subscribe(() =>
    invalidate(state, options.store),
  );
  return serviceAPI(state, options, unsubscribe);
}
function serviceAPI(state, options, unsubscribe) {
  const close = () => {
    state.closed = true;
    cancelRun(state);
    unsubscribe();
  };
  const start = (p) => startRun(p, state, options);
  return { start, cancel: () => cancelRun(state), close };
}
function cancelRun(state) {
  state.active?.controller.abort();
  return { ok: true };
}
function invalidate(state, store) {
  const active = state.active,
    project = store.get().project;
  if (!active) return;
  if (
    project.id !== active.projectId ||
    JSON.stringify(project.workflow) !== active.signature
  )
    active.controller.abort();
}
function startRun(payload, state, options) {
  try {
    validateStart(payload, state, options.store.get().project);
  } catch (e) {
    return { ok: false, error: "WORKFLOW_NOT_READY", hint: e.message };
  }
  const active = beginRun(options.store.get().project, payload, state, options);
  queueMicrotask(() => work(active, state, options));
  return { ok: true, id: active.id };
}
function validateStart(payload, state, project) {
  if (state.closed || state.active)
    throw new Error("已有运行，请等待完成或停止");
  validateBudget(payload);
  workflowOrder(project.workflow || { nodes: [], edges: [] });
}
function beginRun(project, payload, state, options) {
  const active = runIdentity(project, payload.maxGenerations);
  state.active = active;
  saveRun(active, { status: "running", records: [], used: 0 }, options);
  return active;
}
function runIdentity(project, maxGenerations) {
  return {
    id: crypto.randomUUID(),
    controller: new AbortController(),
    projectId: project.id,
    signature: JSON.stringify(project.workflow),
    project: structuredClone(project),
    maxGenerations,
  };
}
function saveRun(active, run, options) {
  if (options.store.get().project.id !== active.projectId) return;
  const record = runRecord(active, run);
  options.store.patch((d) => {
    d.project.workflowRun = record;
  });
  options.checkpoint();
}
async function work(active, state, options) {
  const pending = invokeRunner(active, options);
  try {
    saveRun(active, await pending, options);
  } catch (e) {
    saveRun(active, { status: "failed", reason: e.message }, options);
  } finally {
    if (state.active === active) state.active = null;
  }
}
function services(active, options) {
  const generate = (node, input, signal) =>
    generateNode(node, input, signal, active, options);
  return {
    ...serviceContext(active, options),
    generate,
    onChange: (run) => saveRun(active, run, options),
  };
}
function generateNode(node, input, signal, active, options) {
  const job = workflowJob(node, input, active.project, active.id);
  return submitWorkflowJob(job, { ...options, signal });
}

function validateBudget(payload) {
  const count = payload.maxGenerations;
  if (
    payload.confirm !== true ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 20
  )
    throw new Error("请确认调用模型及 1–20 次生成上限");
}
function runRecord(active, run) {
  return {
    ...run,
    id: active.id,
    signature: active.signature,
    maxGenerations: active.maxGenerations,
  };
}
function invokeRunner(active, options) {
  return executeWorkflow(active.project.workflow, services(active, options));
}
function serviceContext(active, options) {
  return {
    maxGenerations: active.maxGenerations,
    signal: active.controller.signal,
    assets: structuredClone(options.store.get().assets),
    judge: options.judge,
  };
}

function recoverInterrupted(store) {
  if (store.get().project.workflowRun?.status !== "running") return;
  store.patch((d) => {
    d.project.workflowRun.status = "needs-review";
    d.project.workflowRun.reason =
      "上次执行中断，请核对已提交任务；不会自动重提生成";
  });
}
