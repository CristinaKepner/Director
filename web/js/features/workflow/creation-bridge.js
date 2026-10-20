import { store } from "../../../../core/store.js";
export function graphSnapshot() {
  const d = store.get();
  const graph = d.project.workflow || { nodes: [], edges: [] };
  return {
    projectId: d.project.id,
    nodes: graph.nodes.map((n) => nodeResult(n, d.project.workflowRun, graph)),
    edges: graph.edges,
    agentFocus: latestAgentFocus(d.events),
  };
}
export function subscribeGraph(listener) {
  let previous = JSON.stringify(graphSnapshot());
  return store.subscribe(() => {
    const key = JSON.stringify(graphSnapshot());
    if (key !== previous) {
      previous = key;
      listener();
    }
  });
}
export function creationBridge(state) {
  return {
    read: graphSnapshot,
    subscribe: subscribeGraph,
    run: state.run,
    mediaHref: state.options.mediaHref,
    select: (id) => state.select(id),
  };
}

function latestAgentFocus(events) {
  const event = events.find(
    (e) =>
      e.source === "agent" &&
      e.ok !== false &&
      e.action?.startsWith("workflow."),
  );
  return focusTarget(event);
}

function nodeResult(node, run, graph) {
  if (run?.signature !== JSON.stringify(graph)) return node;
  const record = run.records?.find((r) => r.id === node.id);
  const media = record?.output?.media?.[0];
  return {
    ...node,
    params: { ...node.params, ...resultParams(record, media) },
  };
}
function resultParams(record, media) {
  return {
    runStatus: record?.status || "",
    resultUrl: media?.url || "",
    resultKind: media?.kind || "",
  };
}

function focusTarget(event) {
  return (
    event?.targetIds?.[0] || event?.payload?.id || event?.payload?.to || null
  );
}
