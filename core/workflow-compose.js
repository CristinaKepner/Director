import { createNode, validateNode, connectNodes } from "./workflow.js";
export function composeWorkflow(graph, input, uid) {
  validatePlan(input);
  const ids = new Map(input.nodes.map((n) => [n.id, uid("node")]));
  const offset = graphOffset(graph);
  graph.nodes.push(
    ...input.nodes.map((n, i) => planNode(n, ids.get(n.id), i, offset)),
  );
  for (const edge of input.edges || []) appendEdge(graph, edge, ids);
  return { ids: Object.fromEntries(ids), id: ids.values().next().value };
}
function validatePlan(input) {
  if (!validPlanSize(input.nodes))
    throw new Error("节点计划须包含 1–60 个节点");
  validateIds(input.nodes);
  if (input.edges !== undefined && !Array.isArray(input.edges))
    throw new Error("连线必须为数组");
}
function planNode(input, id, index, offset) {
  const node = createNode(input.type, id, index);
  return validateNode({
    ...node,
    label: input.label || node.label,
    x: input.x ?? node.x,
    y: (input.y ?? node.y) + offset,
    params: { ...node.params, ...input.params },
  });
}
function appendEdge(graph, edge, ids) {
  const from = ids.get(edge.from) || edge.from;
  const to = ids.get(edge.to) || edge.to;
  graph.edges.push(connectNodes(graph, from, to, edge.branch));
}

function graphOffset(graph) {
  return graph.nodes.length
    ? Math.max(...graph.nodes.map((n) => n.y)) + 240
    : 0;
}
function validateIds(nodes) {
  const ids = nodes.map((n) => n.id);
  if (
    ids.some((id) => typeof id !== "string" || !id) ||
    new Set(ids).size !== ids.length
  )
    throw new Error("计划内节点 ID 必须唯一");
}

function validPlanSize(nodes) {
  return Array.isArray(nodes) && nodes.length > 0 && nodes.length <= 60;
}
