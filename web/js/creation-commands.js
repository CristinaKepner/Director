import { store } from "../../core/store.js";
import { creationIsEmpty } from "../../core/creation.js";
import { assetMarkup, detailsMarkup } from "./creation-markup.js";
import { planningPrompt, chooseRoute, submitStart } from "./creation-start.js";
import { uploadCreationMedia } from "./creation-upload.js";
export function bindCreation(state) {
  state.root.addEventListener("click", (event) => clickCreation(state, event));
  state.root.addEventListener("submit", (event) =>
    submitCreation(state, event),
  );
  state.root.querySelector("[data-media-file]").onchange = (event) =>
    importMedia(state, event);
  state.root.querySelector("[data-reference-file]").onchange = () =>
    state.status("参照已选择，将在开始规划时上传。");
}
function clickCreation(state, event) {
  const route = event.target.closest("[data-route]"),
    button = event.target.closest("[data-create]");
  if (route) chooseRoute(state, route.dataset.route);
  if (button) void command(state, button.dataset.create);
  clickProjectItem(state, event);
}
function clickProjectItem(state, event) {
  const shot = event.target.closest("[data-shot]");
  if (shot) void openShot(state, shot.dataset.shot);
  const asset = event.target.closest("[data-attach]");
  if (asset) void attachAsset(state, asset.dataset.attach);
}
const commands = {
  new: newProject,
  overview: (s) => s.view("overview"),
  nodes: (s) => s.view("nodes"),
  guide: (s) => s.openGuide(),
  dismiss: (s) => s.closeGuide(),
  library: (s) => s.options.openLeft("library"),
  import: (s) => s.root.querySelector("[data-media-file]").click(),
  shot: addShot,
  stage: (s) => s.showStage(true),
  assets: showAssets,
  generate: (s) => s.options.openDrawer("gen"),
  plan: (s) =>
    s.run("agent.run", { text: planningPrompt(), mode: "collaborative" }),
  add: (s) =>
    s.run("workflow.add", {
      type: s.root.querySelector("[data-node-type]").value,
    }),
  remove: (s) => s.run("workflow.remove", { id: s.selected }),
};
function command(state, name) {
  return commands[name]?.(state);
}
function newProject(state) {
  if (
    !creationIsEmpty(store.get()) &&
    !confirm("新建空工程？当前工程会被替换，请先保存。")
  )
    return;
  return state.run("project.new", { name: "Untitled" });
}
function showAssets(state) {
  const shelf = state.root.querySelector(".creation-assets");
  shelf.hidden = !shelf.hidden;
  shelf.innerHTML =
    store.get().assets.map(assetMarkup).join("") ||
    "<span>工程里还没有素材。先导入图片、音频或视频。</span>";
}
function submitCreation(state, event) {
  event.preventDefault();
  if (event.target.matches("[data-start-form]"))
    void submitStart(state, event.target);
  if (event.target.matches("[data-node-form]"))
    void saveNode(state, event.target);
}
async function saveNode(state, form) {
  const node = findNode(form.dataset.id);
  if (!node) return;
  const data = new FormData(form);
  const patch = {
    label: data.get("label"),
    params: editedParams(node.params, data),
  };
  await state.run("workflow.update", { id: node.id, patch });
}
function editedParams(original, data) {
  const params = { ...original };
  for (const key of Object.keys(params)) {
    if (!data.has(key)) continue;
    params[key] =
      typeof params[key] === "number" ? Number(data.get(key)) : data.get(key);
  }
  return params;
}
async function importMedia(state, event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    await state.run("creation.media", await uploadCreationMedia(file));
  } catch (error) {
    state.status(error.message);
  }
  event.target.value = "";
}
export function selectNode(state, id) {
  state.selected = id;
  const node = store.get().project.workflow?.nodes.find((n) => n.id === id);
  state.root.querySelector(".creation-details").innerHTML = detailsMarkup(node);
}

function findNode(id) {
  return store.get().project.workflow?.nodes.find((n) => n.id === id);
}

async function openShot(state, id) {
  const result = await state.run("shot.select", { id });
  if (result.ok) state.showStage(true);
}
async function attachAsset(state, assetId) {
  const result = await state.run("creation.media", { assetId });
  if (result.ok) state.view("nodes");
}

async function addShot(state) {
  if (!store.get().cameras.length) {
    const camera = await state.run("camera.create", {});
    if (!camera.ok) return;
  }
  await state.run("shot.create", { title: "新镜头", duration: 5 });
}
