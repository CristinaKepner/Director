import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyProject, store, loadProjectData } from "../core/store.js";
import {
  creationIsEmpty,
  prepareCreation,
  creationContext,
} from "../core/features/creation/creation.js";
import { dispatch } from "../core/actions.js";
test("every new empty project needs the start guide", () => {
  loadProjectData(createEmptyProject());
  assert.equal(creationIsEmpty(store.get()), true);
  dispatch("project.new", { name: "Next" });
  assert.equal(creationIsEmpty(store.get()), true);
});
test("existing assets or shots bypass the empty guide", () => {
  const data = createEmptyProject();
  data.assets.push({ id: "asset", url: "/media/a.png" });
  assert.equal(creationIsEmpty(data), false);
});
test("reference route requires actual input and idea requires a brief", () => {
  assert.throws(
    () => prepareCreation({ mode: "reference", brief: "参考" }),
    /参照/,
  );
  assert.throws(() => prepareCreation({ mode: "idea", brief: " " }), /一句话/);
});
test("canvas context includes current contents but no chat history", () => {
  const data = createEmptyProject();
  data.project.workflow = contextGraph;
  data.agent.messages = [{ role: "user", text: "不应发送的旧对话" }];
  const text = JSON.stringify(creationContext(data));
  assert.ok(text.includes("新方向"));
  assert.ok(!text.includes("不应发送的旧对话"));
});

const contextGraph = {
  nodes: [{ id: "note", params: { text: "新方向" } }],
  edges: [],
};
test("starting from a reference registers one shared asset", () => {
  dispatch("project.new", { name: "Reference" });
  const result = dispatch("creation.start", referenceInput);
  assert.equal(result.ok, true);
  const d = store.get(),
    ref = d.project.workflow.nodes[1];
  assert.equal(ref.type, "image");
  assert.equal(ref.params.assetId, d.assets[0].id);
  assert.equal(d.assets.length, 1);
});
test("placing the same asset twice reuses it and undo removes only the node", () => {
  const assetId = store.get().assets[0].id;
  assert.equal(dispatch("creation.media", { assetId }).ok, true);
  assert.equal(store.get().assets.length, 1);
  assert.equal(store.get().project.workflow.nodes.length, 3);
  dispatch("project.undo");
  assert.equal(store.get().project.workflow.nodes.length, 2);
  assert.equal(store.get().assets.length, 1);
});
test("invalid reference never partially mutates the project", () => {
  const before = JSON.stringify(creationContext(store.get()));
  assert.equal(dispatch("creation.start", invalidReference).ok, false);
  assert.equal(JSON.stringify(creationContext(store.get())), before);
});

const referenceInput = {
  mode: "reference",
  reference: "https://example.com/ref.png",
};

const invalidReference = {
  mode: "reference",
  reference: "file:///private/example.png",
};
