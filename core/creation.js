import { createNode } from "./workflow.js";
export function creationIsEmpty(data) {
  const items = [
    data.entities,
    data.shots,
    data.assets,
    data.project.workflow?.nodes,
  ];
  return !items.some((list) => list?.length) && !hasCreationGoal(data.project);
}
export function prepareCreation(input) {
  const mode = input.mode;
  const brief = normalizeBrief(input.brief);
  const reference =
    mode === "reference" ? String(input.reference || "").trim() : "";
  validateStart(mode, brief, reference);
  const skill = creationSkills.includes(input.skill) ? input.skill : "explore";
  return { mode, brief, reference, skill };
}
function validateStart(mode, brief, reference) {
  if (!["idea", "reference"].includes(mode)) throw new Error("请选择起步方式");
  if (mode === "idea" && !brief) throw new Error("请先用一句话描述想做的内容");
  if (mode === "reference" && !reference)
    throw new Error("请先添加参照图片、视频或链接");
  if (reference && !validMedia(reference))
    throw new Error("参照地址须为 HTTP(S) 或已上传的媒体");
}
export function validMedia(url) {
  return (
    typeof url === "string" &&
    /^(https?:\/\/|\/media\/)/.test(url) &&
    url.length < 10000
  );
}
export function creationContext(data) {
  const graph = data.project.workflow || { nodes: [], edges: [] };
  const media = (data.assets || []).map(mediaSummary);
  return {
    goal: data.project.creation || null,
    nodes: graph.nodes,
    edges: graph.edges,
    media,
  };
}
export function creationNodes(input, uid) {
  const note = {
    ...createNode("text", uid("node")),
    label: "创作目标",
    params: { text: input.brief || "按照参照探索新版本" },
  };
  if (input.mode === "idea") return [note];
  return [note, referenceNode(input, uid)];
}
function referenceNode(input, uid) {
  const type =
    input.mediaKind ||
    (/\.(png|jpg|jpeg|webp|gif)(?:[?#]|$)/i.test(input.reference)
      ? "image"
      : "video");
  const node = createNode(type, uid("node"), 1);
  return { ...node, label: "创作参照", params: { url: input.reference } };
}

function hasCreationGoal(project) {
  return Boolean(project.reference || project.creation);
}

function mediaSummary({ id, label, mediaKind, url }) {
  return { id, label, mediaKind, url };
}

const creationSkills = ["explore", "remix", "test"];
function normalizeBrief(value) {
  return String(value || "")
    .trim()
    .slice(0, 5000);
}
