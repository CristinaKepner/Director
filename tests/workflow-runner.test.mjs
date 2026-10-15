import test from "node:test";
import assert from "node:assert/strict";
import { executeWorkflow } from "../server/src/workflow-runner.mjs";
const node = (id, type, params = {}) => ({ id, type, params });
const edge = (from, to, branch = "next") => ({ from, to, branch });
const graph = {
  nodes: [
    node("input", "image", { url: "/media/face.png" }),
    node("check", "if", { condition: "有瑕疵", threshold: 0.7 }),
    node("fix", "image-edit", { prompt: "修复" }),
    node("video", "video-generate", { prompt: "短片" }),
  ],
  edges: [
    edge("input", "check"),
    edge("check", "fix", "true"),
    edge("check", "video", "false"),
    edge("fix", "video"),
  ],
};
function services(conditionSatisfied) {
  const judge = async () => ({
    conditionSatisfied,
    confidence: 0.95,
    reason: "可见证据",
  });
  return { maxGenerations: 3, judge, generate: fakeGenerate };
}
async function fakeGenerate(n, input) {
  return {
    kind: n.type === "video-generate" ? "video" : "image",
    url: "/media/" + n.id + ".png",
    input,
  };
}
const uncertain = { conditionSatisfied: true, confidence: 0.3, reason: "遮挡" };
const loopGraph = {
  nodes: [
    node("input", "image", { url: "/media/face.png" }),
    node("loop", "loop", {
      condition: "仍需修复",
      threshold: 0.7,
      maxIterations: 2,
      prompt: "修复",
    }),
  ],
  edges: [edge("input", "loop")],
};
test("false branch bypasses repair and still reaches merge", async () => {
  const r = await executeWorkflow(graph, services(false));
  assert.equal(r.status, "completed");
  assert.equal(r.records.find((n) => n.id === "fix").status, "skipped");
  assert.equal(
    r.records.find((n) => n.id === "video").output.media[0].input.media[0].url,
    "/media/face.png",
  );
});
test("true branch supplies repaired output to video, not original input", async () => {
  const r = await executeWorkflow(graph, services(true));
  assert.equal(r.status, "completed");
  assert.equal(
    r.records.find((n) => n.id === "video").output.media[0].input.media[0].url,
    "/media/fix.png",
  );
});
test("uncertain semantic verdict stops downstream generation", async () => {
  const s = services(true);
  s.judge = async () => uncertain;
  const r = await executeWorkflow(graph, s);
  assert.equal(r.status, "needs-review");
  assert.equal(r.used, 0);
});
test("generation budget cannot be exceeded", async () => {
  const r = await executeWorkflow(graph, {
    ...services(true),
    maxGenerations: 1,
  });
  assert.equal(r.status, "needs-review");
  assert.equal(r.used, 1);
});
test("loops recheck the latest candidate and stop at iteration limit", async () => {
  const r = await executeWorkflow(loopGraph, services(true));
  assert.equal(r.status, "needs-review");
  assert.equal(r.used, 2);
  assert.match(r.reason, /上限/);
});
test("invalid graph is rejected before external effects", async () => {
  let calls = 0;
  const s = services(true);
  s.generate = async () => calls++;
  const invalid = { ...graph, edges: [...graph.edges, edge("video", "input")] };
  const r = await executeWorkflow(invalid, s);
  assert.equal(r.status, "failed");
  assert.equal(calls, 0);
});
test("unrelated camera input cannot reactivate a skipped conditional branch", async () => {
  const g = structuredClone(graph);
  g.nodes.push(node("camera", "camera", { prompt: "推进" }));
  g.edges = g.edges.filter((e) => !(e.from === "check" && e.to === "video"));
  g.edges.push(edge("camera", "video"));
  const r = await executeWorkflow(g, services(false));
  assert.equal(r.records.find((n) => n.id === "video").status, "skipped");
  assert.equal(r.used, 0);
});
