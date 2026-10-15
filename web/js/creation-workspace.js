import { renderExecution } from "./creation-execution.js";
import { renderOverview } from "./creation-overview.js";
import { bindStartDialog, syncStartDialog } from "./creation-dialog.js";
import { store } from "../../core/store.js";
import { creationIsEmpty } from "../../core/creation.js";
import { dispatch } from "./client.js";
import { creationShell } from "./creation-markup.js";
import { creationBridge } from "./creation-bridge.js";
import { bindCreation, selectNode } from "./creation-commands.js";
import { chooseRoute } from "./creation-start.js";
import { mountCreationGraph } from "../vendor/creation/index.js";
export function initCreationWorkspace(options) {
  const state = createWorkspace(options);
  bindCreation(state);
  bindStartDialog(state);
  store.subscribe(() => renderCreation(state));
  renderCreation(state);
}
function createWorkspace(options) {
  const root = createRoot();
  const state = { root, options, ...initialState };
  bindWorkspaceActions(state);
  installStageReturn(state);
  return state;
}
function createRoot() {
  const root = document.createElement("section");
  root.id = "creationWorkspace";
  root.className = "creation-workspace";
  root.innerHTML = creationShell;
  document.querySelector(".stage").append(root);
  return root;
}
function bindWorkspaceActions(state) {
  state.status = (text) => showStatus(state.root, text);
  state.run = async (action, payload) =>
    reportResult(state, await dispatch(action, actionPayload(action, payload)));
  state.select = (id) => selectNode(state, id);
  state.showStage = (value) => showStage(state.root, value);
  state.view = (view) => switchView(state, view);
}
function actionPayload(action, payload) {
  return action === "agent.run"
    ? { ...payload, contextMode: "canvas" }
    : payload;
}
function reportResult(state, result) {
  state.status(
    result.ok
      ? ""
      : result.hint || result.message || result.error || "操作未完成",
  );
  return result;
}
function installStageReturn(state) {
  const button = document.createElement("button");
  button.textContent = "← 返回创作";
  button.id = "creationReturn";
  button.onclick = () => state.showStage(false);
  document.getElementById("stageTools").prepend(button);
}
function showStage(root, value) {
  root.hidden = value;
  document.getElementById("app").classList.toggle("creation-mode", !value);
}
function resetCreation(state, id) {
  state.unmount?.();
  state.unmount = null;
  state.project = id;
  resetView(state);
  state.root.querySelector("[data-start-form]").reset();
  chooseRoute(state, "idea");
  state.showStage(false);
  selectNode(state, null);
}
function renderCreation(state) {
  const d = store.get(),
    empty = creationIsEmpty(d);
  if (state.project !== d.project.id) resetCreation(state, d.project.id);
  syncStartDialog(state, empty);
  renderOverview(state, d);
  renderSummary(state, d);
  renderExecution(state, d);
  syncGraph(state, empty);
}
function renderSummary(state, d) {
  if (
    state.selected &&
    !d.project.workflow?.nodes.some((n) => n.id === state.selected)
  )
    selectNode(state, null);
}

function syncGraph(state, empty) {
  if (state.tab !== "nodes" || state.unmount) return;
  state.unmount = mountCreationGraph(
    state.root.querySelector(".creation-graph"),
    creationBridge(state),
  );
}

const initialState = {
  selected: null,
  project: null,
  mode: "idea",
  busy: false,
  unmount: null,
};

function resetView(state) {
  state.dismissed = false;
  state.status("");
  state.root.querySelector("dialog").close();
  switchView(state, "overview");
}
function switchView(state, tab) {
  state.tab = tab;
  state.root.querySelector(".creation-overview").hidden = tab !== "overview";
  state.root.querySelector(".creation-work").hidden = tab !== "nodes";
  state.root
    .querySelectorAll(".creation-tabs [data-create]")
    .forEach((el) => el.classList.toggle("active", el.dataset.create === tab));
  syncGraph(state);
}

function showStatus(root, text) {
  root
    .querySelectorAll(".creation-status, .creation-modal-status")
    .forEach((el) => {
      el.textContent = text;
    });
}
