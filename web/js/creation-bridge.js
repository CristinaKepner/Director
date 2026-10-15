import { store } from "../../core/store.js";
export function graphSnapshot() {
  const d = store.get();
  const graph = d.project.workflow || { nodes: [], edges: [] };
  return {
    projectId: d.project.id,
    nodes: graph.nodes,
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
  return;
  event?.after?.id || event?.payload?.id || event?.payload?.to || null;
}
