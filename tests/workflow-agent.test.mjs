import test from "node:test";
import assert from "node:assert/strict";
import { store, createEmptyProject, loadProjectData } from "../core/store.js";
import { dispatch } from "../core/actions.js";
import { createLlmPlanner } from "../server/src/features/agent/llm.mjs";
const graph = {
  nodes: [
    { id: "brief", type: "text", params: { text: "角色广告" } },
    { id: "gen", type: "image-generate" },
  ],
  edges: [{ from: "brief", to: "gen" }],
};
test("Agent can atomically compose nodes using plan-local IDs", () => {
  loadProjectData(createEmptyProject());
  const out = dispatch("workflow.compose", graph);
  assert.equal(out.ok, true, JSON.stringify(out));
  const saved = store.get().project.workflow;
  assert.equal(saved.nodes.length, 2);
  assert.equal(saved.edges[0].from, saved.nodes[0].id);
  assert.notEqual(saved.nodes[0].id, "brief");
});
test("invalid graph plan leaves the existing graph untouched", () => {
  const before = structuredClone(store.get().project.workflow);
  const out = dispatch("workflow.compose", {
    ...graph,
    edges: [{ from: "brief", to: "missing" }],
  });
  assert.equal(out.ok, false);
  assert.deepEqual(store.get().project.workflow, before);
});
const ctx = {
  capabilities: [
    { name: "workflow.compose", params: { nodes: "array", edges: "array" } },
  ],
  summary: {},
  history: [],
};
const response = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          steps: [{ action: "workflow.compose", payload: graph }],
        }),
      },
    },
  ],
};
test("LLM retains workflow operations and receives node semantics", async (t) => {
  const request = stubPlanner(t);
  const p = await createLlmPlanner({ apiKey: "test" }).plan("编排节点", ctx);
  assert.equal(p.steps[0]?.action, "workflow.compose");
  assert.match(request.system, /Semantic If/);
});
function stubPlanner(t) {
  const request = { system: "" };
  t.mock.method(globalThis, "fetch", async (_, o) => {
    request.system = JSON.parse(o.body).messages[0].content;
    return Response.json(response);
  });
  return request;
}
import { graphSnapshot } from "../web/js/features/workflow/creation-bridge.js";
test("Agent cursor points at the created node using event target IDs", () => {
  loadProjectData(createEmptyProject());
  const out = dispatch("workflow.compose", graph, { source: "agent" });
  assert.equal(graphSnapshot().agentFocus, out.id);
});
