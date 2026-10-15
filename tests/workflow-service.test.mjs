import test from "node:test";
import assert from "node:assert/strict";
import {
  store,
  createEmptyProject,
  loadProjectData,
  persistable,
} from "../core/store.js";
import { createWorkflowService } from "../server/src/workflow-service.mjs";
import { workflowJob } from "../server/src/workflow-generation.mjs";
const node = {
  id: "generate",
  type: "video-generate",
  params: { prompt: "慢慢推进", seconds: 5 },
};
const input = {
  text: ["保持角色身份"],
  media: [{ kind: "video", url: "/media/reference.mp4" }],
};
const graph = {
  nodes: [{ id: "image", type: "image-generate", params: { prompt: "角色" } }],
  edges: [],
};
const adapter = {
  supports: () => true,
  submit: (job, update) =>
    update(job.id, { status: "done", result: { url: "/media/result.png" } }),
};
const ready = () => ({ confirm: true, maxGenerations: 2 });
function fixture(t, custom = adapter) {
  resetGraph();
  const s = createWorkflowService({
    store,
    adapter: custom,
    checkpoint: () => {},
  });
  t.after(() => s.close());
  return s;
}
async function settle() {
  for (let i = 0; i < 10; i++)
    await new Promise((resolve) => setImmediate(resolve));
}
test("video inputs use v2v rather than a single extracted frame", () => {
  const job = workflowJob(node, input, { videoProvider: "seedance-2" }, "run");
  assert.equal(job.mode, "v2v");
  assert.equal(job.inputs.video, "/media/reference.mp4");
});
test("image generation uses the first upstream reference", () => {
  const job = workflowJob(
    graph.nodes[0],
    { text: [], media: [{ kind: "image", url: "/media/a.png" }] },
    {},
    "run",
  );
  assert.equal(job.mode, "i2i");
  assert.equal(job.inputs.image, "/media/a.png");
});
const imageInputs = {
  text: [],
  media: ["a", "b"].map((n) => ({ kind: "image", url: `/media/${n}.png` })),
};
test("multi-image video preserves every image as a reference", () => {
  const job = videoJob(imageInputs);
  assert.deepEqual(
    job.inputs.references.map((r) => r.url),
    imageInputs.media.map((m) => m.url),
  );
});
test("runtime requires explicit budget and rejects concurrent starts", async (t) => {
  const s = fixture(t);
  assert.equal(s.start({}).ok, false);
  assert.equal(s.start(ready()).ok, true);
  assert.equal(s.start(ready()).ok, false);
  await settle();
});
test("runtime stores actual adapter output and survives save/load", async (t) => {
  const s = fixture(t);
  s.start(ready());
  await settle();
  loadProjectData(persistable());
  assert.equal(store.get().project.workflowRun.status, "completed");
  assert.equal(store.get().jobs[0].result.url, "/media/result.png");
});
test("cancellation stops later nodes and marks pending job cancelled", async (t) => {
  const s = fixture(t, { supports: () => true, submit: () => {} });
  s.start(ready());
  await settle();
  s.cancel();
  await settle();
  assert.equal(store.get().project.workflowRun.status, "cancelled");
  assert.equal(store.get().jobs[0].status, "cancelled");
});
function deferredAdapter() {
  const deferred = { finish: null };
  deferred.adapter = {
    ...adapter,
    submit: (job, update) => {
      deferred.finish = () => adapter.submit(job, update);
    },
  };
  return deferred;
}
async function switchDuringGeneration(s, deferred) {
  s.start(ready());
  await settle();
  loadProjectData(createEmptyProject());
  deferred.finish();
  await settle();
}
test("late adapter completion cannot write into a new project", async (t) => {
  const deferred = deferredAdapter();
  const s = fixture(t, deferred.adapter);
  await switchDuringGeneration(s, deferred);
  assert.equal(store.get().jobs.length, 0);
  assert.equal(store.get().project.workflowRun, undefined);
});

function resetGraph() {
  loadProjectData(createEmptyProject());
  store.patch((d) => {
    d.project.workflow = structuredClone(graph);
  });
}
function videoJob(input) {
  return workflowJob(node, input, { videoProvider: "seedance-2" }, "run");
}
import { createJudge } from "../server/src/adapters/judge.mjs";
const verdict = {
  conditionSatisfied: false,
  confidence: 0.93,
  reason: "皮肤纹理完整",
};
function judgeFixture() {
  const capture = { body: null };
  const fetchImpl = async (_, o) => {
    capture.body = JSON.parse(o.body);
    return Response.json({
      choices: [{ message: { content: JSON.stringify(verdict) } }],
    });
  };
  return { capture, judge: createJudge({ ...judgeOptions, fetchImpl }) };
}
test("semantic judge uses current image and scoped constraints without history", async () => {
  const { capture, judge } = judgeFixture();
  const out = await judge.condition(judgeTask);
  assert.equal(out.conditionSatisfied, false);
  assert.equal(out.judgeVersion, "fixture-vision");
  assert.ok(JSON.stringify(capture.body).includes("保留身份"));
  assert.ok(!JSON.stringify(capture.body).includes("SECRET_OLD_CHAT"));
});

const judgeOptions = { apiKey: "fixture", model: "fixture-vision" };
const judgeTask = {
  condition: "明显瑕疵",
  goal: "角色短片",
  context: ["保留身份"],
  images: ["data:image/png;base64,AA=="],
  history: ["SECRET_OLD_CHAT"],
};
