import { NODE_TYPES } from "../../core/workflow.js";
export function workflowOrder(graph) {
  validateGraph(graph);
  const pending = [...graph.nodes],
    ordered = [];
  while (pending.length) takeReady(pending, ordered, graph.edges);
  return ordered;
}
function validateGraph(graph) {
  const ids = new Set(graph.nodes.map((n) => n.id));
  if (!ids.size || ids.size !== graph.nodes.length)
    throw new Error("节点为空或 ID 重复");
  if (graph.nodes.some((n) => !NODE_TYPES[n.type]))
    throw new Error("未知节点类型");
  for (const e of graph.edges) validateEdge(e, graph, ids);
}
function validateEdge(e, graph, ids) {
  if (!ids.has(e.from) || !ids.has(e.to)) throw new Error("连线节点不存在");
  const control = ["if", "loop"].includes(
    graph.nodes.find((n) => n.id === e.from).type,
  );
  if (control && !["true", "false"].includes(e.branch))
    throw new Error("条件节点必须使用 true / false 连线");
  if (!control && e.branch && e.branch !== "next")
    throw new Error("普通节点只支持 next 连线");
}
function takeReady(pending, ordered, edges) {
  const index = pending.findIndex((n) =>
    edges
      .filter((e) => e.to === n.id)
      .every((e) => ordered.some((p) => p.id === e.from)),
  );
  if (index < 0) throw new Error("图中存在循环");
  ordered.push(pending.splice(index, 1)[0]);
}
export function workflowInputs(graph, node, records) {
  const incoming = graph.edges.filter((e) => e.to === node.id);
  const active = incoming.filter((e) => edgeActive(e, records));
  const parents = active.map((e) => records.find((r) => r.id === e.from));
  const trace = parents.flatMap((r) => r.trace || []);
  const blockedBy = blockedConditions(incoming, active, records, trace);
  if (blockedBy.length) return { blockedBy };
  const outputs = parents.map((r) => r.output);
  return { ...mergeOutputs(outputs), trace };
}
function edgeActive(edge, records) {
  const record = records.find((r) => r.id === edge.from);
  return (
    record?.status === "done" &&
    (!record.branch || record.branch === edge.branch)
  );
}
function uniqueMedia(media) {
  return [...new Map(media.map((m) => [m.url, m])).values()];
}

function mergeOutputs(outputs) {
  return {
    text: [...new Set(outputs.flatMap((o) => o.text))],
    media: uniqueMedia(outputs.flatMap((o) => o.media)),
  };
}

function blockedConditions(incoming, active, records, trace) {
  const inactive = incoming.filter((e) => !active.includes(e));
  const blockers = inactive.flatMap((e) => edgeBlockers(e, records));
  return [...new Set(blockers.filter((id) => !trace.includes(id)))];
}
function edgeBlockers(edge, records) {
  const record = records.find((r) => r.id === edge.from);
  return record?.blockedBy || [edge.from];
}
