import {
  prepareCreation,
  creationNodes,
  creationContext,
  validMedia,
} from "./creation.js";
import { createNode } from "../workflow/workflow.js";
function startCreation(store, uid, payload) {
  const input = prepareCreation(payload);
  const nodes = creationNodes({ ...input, mediaKind: payload.mediaKind }, uid);
  store.patch((d) => applyStart(d, input, nodes, uid));
  return { ok: true, id: nodes[0].id };
}
function applyStart(d, input, nodes, uid) {
  d.project.creation = input;
  d.project.workflow ||= { version: 1, nodes: [], edges: [] };
  if (nodes[1]) attachReference(d, nodes[1], uid);
  d.project.workflow.nodes.push(...nodes);
}
function attachReference(d, node, uid) {
  let asset = d.assets.find((a) => a.url === node.params.url);
  if (!asset) {
    asset = assetRecord(uid("asset"), node);
    d.assets.push(asset);
  }
  node.params.assetId = asset.id;
}
function assetRecord(id, node) {
  return {
    id,
    url: node.params.url,
    mediaKind: node.type,
    label: node.label,
    kind: "upload",
    approved: false,
  };
}
function mediaNode(store, uid, payload) {
  const asset = store.get().assets.find((a) => a.id === payload.assetId);
  const url = asset?.url || payload.url,
    type = asset?.mediaKind || payload.mediaKind;
  validateMedia(url, type);
  const index = store.get().project.workflow?.nodes.length || 0;
  const node = importedNode(type, url, index, asset, payload, uid);
  return { node, asset: asset || assetRecord(node.params.assetId, node) };
}
function importedNode(type, url, index, asset, payload, uid) {
  const node = createNode(type, uid("node"), index);
  const label = asset?.label || payload.label || "导入素材";
  node.label = String(label).slice(0, 100);
  node.params = { url, assetId: asset?.id || uid("asset") };
  return node;
}
function validateMedia(url, type) {
  if (!validMedia(url) || !["image", "video", "audio"].includes(type))
    throw new Error("媒体类型或地址无效");
}
function addMedia(store, uid, payload) {
  const { node, asset } = mediaNode(store, uid, payload);
  store.patch((d) => {
    d.project.workflow ||= { version: 1, nodes: [], edges: [] };
    d.project.workflow.nodes.push(node);
    if (!d.assets.some((a) => a.id === asset.id)) d.assets.push(asset);
  });
  return { ok: true, id: node.id, targetIds: [node.id] };
}
export function registerCreationActions({ register, store, uid }) {
  register("creation.start", {
    doc: "记录起步方式与创作目标",
    handler: (p) => startCreation(store, uid, p),
  });
  registerMedia(register, store, uid);
  registerContext(register, store);
}
function registerMedia(register, store, uid) {
  register("creation.media", {
    doc: "把工程素材加入节点",
    handler: (p) => addMedia(store, uid, p),
  });
}
function registerContext(register, store) {
  register("creation.context", {
    doc: "读取当前创作内容，不包含历史对话",
    undoable: false,
    handler: () => ({ ok: true, data: creationContext(store.get()) }),
  });
}
