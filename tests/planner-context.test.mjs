import test from "node:test";
import assert from "node:assert/strict";
import { createLlmPlanner } from "../server/src/adapters/llm.mjs";
import { planWithReads } from "../server/src/planner-reads.mjs";
const done = {
  steps: [
    {
      action: "workflow.compose",
      payload: { nodes: [{ id: "new", type: "text" }], edges: [] },
    },
  ],
  notes: [],
};
const readPlan = {
  steps: [{ action: "workflow.read", payload: {} }],
  notes: [],
};
const fullGraph = {
  nodes: [
    { id: "existing-node", type: "image", params: { url: "/media/ref.png" } },
  ],
  edges: [],
};
const caps = [{ name: "workflow.compose", params: {} }];
function captureGateway(t) {
  const request = { body: null };
  t.mock.method(globalThis, "fetch", async (_, o) => {
    request.body = JSON.parse(o.body);
    return Response.json({
      choices: [{ message: { content: JSON.stringify(done) } }],
    });
  });
  return request;
}
const largeSummary = {
  scene: { description: "x".repeat(7000) },
  creation: fullGraph,
  assets: [{ id: "last-approved-asset", approved: true }],
};
const access = {
  read: () => ({ ok: true, graph: fullGraph }),
  isCurrent: () => true,
};
function planWith(planner, permission = access) {
  return planWithReads(planner, "编排", { summary: {} }, permission);
}
function sequencePlanner(repeat = false) {
  const contexts = [];
  const plan = async (_, ctx) => {
    contexts.push(ctx);
    return repeat || contexts.length === 1 ? readPlan : done;
  };
  return { plan, contexts };
}
test("complete canvas and final asset survive large scene summaries", async (t) => {
  const request = captureGateway(t);
  const context = { capabilities: caps, summary: largeSummary, history: [] };
  await createLlmPlanner({ apiKey: "fixture" }).plan("编排", context);
  assert.match(request.body.messages[0].content, /existing-node/);
  assert.match(request.body.messages[0].content, /last-approved-asset/);
});
test("read-only plan feeds actual tool output back and continues planning", async () => {
  const planner = sequencePlanner();
  const result = await planWith(planner);
  assert.equal(result.steps[0].action, "workflow.compose");
  const output = planner.contexts[1].summary.toolResults[0].result;
  assert.equal(output.graph.nodes[0].id, "existing-node");
});
test("project switch stops read continuation", async () => {
  await assert.rejects(
    planWith(sequencePlanner(), { ...access, isCurrent: () => false }),
    /PROJECT_CHANGED/,
  );
});
test("repeated reads stop after three plans without claiming graph changes", async () => {
  const planner = sequencePlanner(true);
  const result = await planWith(planner);
  assert.equal(planner.contexts.length, 3);
  assert.deepEqual(result.steps, []);
  assert.match(result.reply, /未修改工程/);
});
test("write plans are returned for normal confirmation, never executed as reads", async () => {
  let calls = 0;
  const permission = { ...access, read: () => calls++ };
  const result = await planWith({ plan: async () => done }, permission);
  assert.equal(calls, 0);
  assert.equal(result, done);
});
import { createHost } from "../server/src/host.mjs";
function planningHost(t) {
  const planner = { ...sequencePlanner(), ...plannerIdentity };
  const host = createHost({ ...hostOptions, llm: () => planner });
  host.run("project.new", { name: "read continuation" });
  t.after(() => host.close());
  return host;
}
test("host continues a read plan and applies the subsequent graph through actions", async (t) => {
  const host = planningHost(t);
  const result = await host.invokeAsync({
    action: "agent.run",
    payload: { text: "编排节点", contextMode: "canvas" },
  });
  assert.equal(result.ok, true);
  assert.equal(result.plan[0].action, "workflow.compose");
  assert.equal(host.run("workflow.read").graph.nodes[0].type, "text");
});

const plannerIdentity = {
  name: "fixture",
  model: "fixture",
  models: ["fixture"],
};
const hostOptions = {
  demo: "none",
  mediaDir: "/tmp/director-planner-read-test",
};
