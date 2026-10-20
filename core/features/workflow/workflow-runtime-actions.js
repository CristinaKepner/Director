export function registerWorkflowRuntime({ register, store, hooks }) {
  registerExecution(register, hooks);
  registerStatus(register, store);
  register("workflow.cancel", cancelDefinition(hooks));
}
function registerExecution(register, hooks) {
  register("workflow.execute", {
    doc: "执行当前节点图，会调用模型计费；必须由用户确认次数上限。不会自动采用候选。",
    params: { confirm: "boolean", maxGenerations: "integer 1..20" },
    undoable: false,
    handler: (p) =>
      hooks.workflow?.start(p) || { ok: false, error: "NO_WORKFLOW_RUNTIME" },
  });
}
function registerStatus(register, store) {
  register("workflow.status", {
    doc: "读取当前节点执行记录与候选结果",
    undoable: false,
    handler: () => ({
      ok: true,
      run: structuredClone(store.get().project.workflowRun || null),
    }),
  });
}

function cancelDefinition(hooks) {
  return {
    doc: "停止后续节点，已提交的远端任务可能继续计费",
    undoable: false,
    handler: () =>
      hooks.workflow?.cancel() || { ok: false, error: "NO_WORKFLOW_RUNTIME" },
  };
}
