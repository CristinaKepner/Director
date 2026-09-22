// UI binding layer — minimal by default, progressive by use.
// Renders from the store; every mutation goes through dispatch() (client.js routes it to the backend or the local replica).
// What is on screen at rest: the picture, the shot strip, one Agent input, four stage controls. Everything else opens on demand.
import { store, persistable, historyInfo } from "../../core/store.js";
import { timecode, getHooks, referencesForShot, padOf, shotPad, padSummary } from "../../core/actions.js";
import { DEMOS } from "../../core/demo.js";
import { REPLICATE_MODES } from "../../core/reference-plan.js";
import { threadItems } from "./thread.js";
import { physicalInfo, fmt as pf } from "./phys.js";
import { STATE_MACHINE, ASPECTS, POSES, JOINT_NAMES, JOINT_LIMITS, MOTION_TYPES, MOTION_TYPE_LIST, SHOT_SIZES, COVERAGE_ANGLES, LIGHT_PRESETS, LIGHT_TYPES, CAMERA_RIGS, PROVIDERS, GEN_MODES, SEMANTIC_PROXY, MODEL_LIBRARY, ROOM_PATTERNS } from "../../core/schema.js";
import { dispatch, client, isOnline } from "./client.js";
import { focusSelected, resetView, focusPad } from "./viewport.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const fmt = (v, n = 2) => (typeof v === "number" ? v.toFixed(n) : v);
const promptTab = { mode: "video", lang: "en" };
let saveTimer = null;
// 顺播全部时播放头是整条的帧，单镜时是这一镜自己的帧。界面上所有「这一镜走到哪」都要先换算。
function localPlayhead(d, shot) {
  if (!shot) return d.project.playhead;
  if (!d.project.playSequence) return Math.max(shot.range.inFrame, Math.min(shot.range.outFrame, d.project.playhead));
  let start = 0;
  for (const s of d.shots) { if (s.id === shot.id) break; start += s.range.outFrame - s.range.inFrame; }
  return Math.max(shot.range.inFrame, Math.min(shot.range.outFrame, d.project.playhead - start + shot.range.inFrame));
}
// 正在被拖的那一样东西：定妆照 / Take / 关键帧 / 镜头段。dataTransfer 只有 drop 时才读得到，
// Electron 里有时还读不到，所以自己也记一份。
let dragItem = null;
const dragAttr = (item) => `draggable="true" data-drag="${esc(JSON.stringify(item))}"`;
let lastFullRender = 0;
let lastSelected = null;
const lastJobStatus = new Map();
const STORAGE_KEY = "director-console:project:v4";
const UI_KEY = "director-console:ui:v5";
const GUIDE_KEY = "director-console:guide:v5";

// local UI state (what is open) — persisted per browser, never part of the project
const ui = Object.assign({ left: null, drawer: false, tab: "shots", settings: false, moreTabs: false, leftW: 300, rightW: 340, drawerH: 250, phys: true }, load(UI_KEY));
// 面板尺寸的上下限。上限不写死像素：屏幕小的时候 560 的右栏会把舞台挤没
const RZ = {
  left: { key: "leftW", css: "--left-w", def: 300, min: 220, max: () => Math.min(520, window.innerWidth * 0.34), axis: "x", sign: 1 },
  right: { key: "rightW", css: "--right-w", def: 340, min: 280, max: () => Math.min(620, window.innerWidth * 0.42), axis: "x", sign: -1 },
  drawer: { key: "drawerH", css: "--drawer-h", def: 250, min: 140, max: () => window.innerHeight * 0.68, axis: "y", sign: -1 },
};
const clampRz = (k, v) => Math.round(Math.max(RZ[k].min, Math.min(RZ[k].max(), v)));
function load(k) {
  try {
    return JSON.parse(localStorage.getItem(k) || "{}");
  } catch {
    return {};
  }
}
function saveUi() {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(ui));
  } catch {}
}
function applyUi() {
  const app = $("app");
  app.classList.toggle("left-closed", !ui.left);
  app.classList.toggle("drawer-closed", !ui.drawer);
  document.querySelectorAll("[data-left]").forEach((b) => b.classList.toggle("on", b.dataset.left === ui.left));
  $("leftScene").classList.toggle("on", ui.left === "scene");
  $("leftProps").classList.toggle("on", ui.left === "props");
  $("leftLibrary").classList.toggle("on", ui.left === "library");
  for (const k of Object.keys(RZ)) app.style.setProperty(RZ[k].css, `${clampRz(k, ui[RZ[k].key] || RZ[k].def)}px`);
  $("drawerBtn").textContent = ui.drawer ? "▾" : "▴";
  $("agentSettings").hidden = !ui.settings;
  saveUi();
}
// 面板可拖。三处：左面板宽、右面板宽、底部抽屉高。双击恢复默认。
// 舞台那块 canvas 自己带 ResizeObserver，所以这里只管改变量，不用通知它。
function bindResize() {
  document.querySelectorAll("[data-rz]").forEach((h) => {
    const k = h.dataset.rz, R = RZ[k];
    h.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      h.setPointerCapture(ev.pointerId);
      const start = R.axis === "x" ? ev.clientX : ev.clientY;
      const from = clampRz(k, ui[R.key] || R.def);
      h.classList.add("drag");
      document.body.classList.add("resizing");
      const move = (e) => {
        const now = R.axis === "x" ? e.clientX : e.clientY;
        ui[R.key] = clampRz(k, from + (now - start) * R.sign);
        $("app").style.setProperty(R.css, `${ui[R.key]}px`);
      };
      const up = () => {
        h.classList.remove("drag");
        document.body.classList.remove("resizing");
        h.removeEventListener("pointermove", move);
        saveUi();
      };
      h.addEventListener("pointermove", move);
      h.addEventListener("pointerup", up, { once: true });
      h.addEventListener("pointercancel", up, { once: true });
    });
    h.addEventListener("dblclick", () => { ui[R.key] = R.def; applyUi(); });
  });
  // 窗口缩小之后，之前拖出来的尺寸可能已经超限了
  window.addEventListener("resize", () => applyUi());
}

function openLeft(which) {
  ui.left = ui.left === which ? null : which;
  applyUi();
  render(store.get());
}
// 气泡：界面上不写句子，说明停上去才出现。做成一个全局元素 + 事件委托，
// 而不是每个控件裹一层 —— 动态渲染出来的镜头条、流水线一样能用，
// 也不会被祖先的 overflow:hidden 裁掉（画板稿里正是栽在这上面）。
let tipEl = null, tipFor = null;
function showTip(target) {
  if (!tipEl) tipEl = $("tip");
  if (!tipEl || !target?.dataset.tip) return;
  tipFor = target;
  tipEl.innerHTML = `<b>${esc(target.dataset.tip)}</b>${target.dataset.tipSub ? `<span>${esc(target.dataset.tipSub)}</span>` : ""}`;
  tipEl.hidden = false;
  const r = target.getBoundingClientRect();
  const t = tipEl.getBoundingClientRect();
  const pad = 8;
  let left = r.left + r.width / 2 - t.width / 2;
  left = Math.max(pad, Math.min(left, window.innerWidth - t.width - pad));
  // 上方放不下就翻到下方
  const above = r.top - t.height - 9;
  tipEl.style.left = `${Math.round(left)}px`;
  tipEl.style.top = `${Math.round(above > pad ? above : r.bottom + 9)}px`;
  tipEl.classList.add("on");
}
function hideTip(target) {
  if (target && target !== tipFor) return;
  tipFor = null;
  if (tipEl) { tipEl.classList.remove("on"); tipEl.hidden = true; }
}
function bindTips() {
  const pick = (ev) => ev.target.closest?.("[data-tip]");
  document.addEventListener("mouseover", (ev) => { const t = pick(ev); if (t) showTip(t); });
  document.addEventListener("mouseout", (ev) => { const t = pick(ev); if (t) hideTip(t); });
  document.addEventListener("focusin", (ev) => { const t = pick(ev); if (t) showTip(t); });
  document.addEventListener("focusout", () => hideTip());
  document.addEventListener("click", () => hideTip());
  window.addEventListener("scroll", () => hideTip(), true);
}

export function openDrawer(tab) {
  if (tab) ui.tab = tab;
  ui.drawer = tab ? true : !ui.drawer;
  applyUi();
  render(store.get());
}

export function bindUI() {
  // 任何带 data-drag 的东西都能拖：定妆照、Take、关键帧、镜头段。落点在时间线里
  document.addEventListener("dragstart", (ev) => {
    const n = ev.target.closest?.("[data-drag]");
    if (!n) return;
    try { dragItem = JSON.parse(n.dataset.drag); } catch { dragItem = null; }
    if (!dragItem) return;
    ev.dataTransfer.effectAllowed = "copyMove";
    try { ev.dataTransfer.setData("application/x-director", JSON.stringify(dragItem)); ev.dataTransfer.setData("text/plain", dragItem.url || dragItem.id || ""); } catch {}
    n.classList.add("dragging");
  });
  document.addEventListener("dragend", (ev) => { ev.target.closest?.("[data-drag]")?.classList.remove("dragging"); dragItem = null; });
  // top
  $("projectName").onchange = (e) => dispatch("project.rename", { name: e.target.value.trim() || "Untitled" });
  $("statePill").innerHTML = STATE_MACHINE.map((s) => `<option>${s}</option>`).join("");
  $("statePill").onchange = async (e) => {
    const r = await dispatch("project.set-state", { state: e.target.value });
    if (!r.ok) toast(r.error, true);
  };
  $("undoBtn").onclick = () => report(dispatch("project.undo"));
  $("redoBtn").onclick = () => report(dispatch("project.redo"));
  $("guideBtn").onclick = () => showGuide(0);
  $("menuBtn").onclick = (e) => {
    e.stopPropagation();
    $("menu").hidden = !$("menu").hidden;
  };
  document.addEventListener("click", (e) => {
    if (!$("menu").hidden && !e.target.closest("#menu")) $("menu").hidden = true;
  });
  $("fidelity").onchange = (e) => dispatch("project.set-fidelity", { fidelity: e.target.value });
  $("shading").onchange = (e) => dispatch("project.set-shading", { mode: e.target.value });
  $("aspect").innerHTML = Object.keys(ASPECTS).map((a) => `<option value="${a}">${a}</option>`).join("");
  $("aspect").onchange = (e) => dispatch("project.set-aspect", { aspect: e.target.value });
  $("buildMode").querySelectorAll("[data-build]").forEach((b) => (b.onclick = () => dispatch("project.set-build-mode", { mode: b.dataset.build })));
  $("exportBtn").onclick = () => download(`${store.get().project.name.replace(/\s+/g, "_")}.director.json`, JSON.stringify(persistable(), null, 2));
  $("importBtn").onclick = async () => {
    if (!window.director?.openProject) return $("importFile").click(); // browser: hidden file input
    const r = await window.director.openProject(); // mac client: native open panel
    if (r?.ok) report(dispatch("project.load", { data: r.data }));
    else if (r && !r.canceled) toast(r.error || "导入失败", true);
  };
  $("importFile").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      report(dispatch("project.load", { data: JSON.parse(await f.text()) }));
    } catch (err) {
      toast(`导入失败：${err.message}`, true);
    }
    e.target.value = "";
  };
  $("demoSelect").innerHTML += Object.entries(DEMOS).map(([k, v]) => `<option value="${k}">${v.zh}</option>`).join("");
  $("demoSelect").onchange = (e) => {
    if (!e.target.value) return;
    if (confirm(`载入示例「${DEMOS[e.target.value].zh}」会替换当前工程，继续？`)) report(dispatch("scene.demo", { name: e.target.value }, { source: "human" }));
    e.target.value = "";
    $("menu").hidden = true;
  };
  // left
  document.querySelectorAll("[data-left]").forEach((b) => (b.onclick = () => openLeft(b.dataset.left)));
  $("addEntity").onclick = () => {
    const type = prompt(`语义类型（${Object.keys(SEMANTIC_PROXY).join(" / ")}）`, "character");
    if (!type) return;
    report(dispatch("entity.create", { type, displayName: prompt("显示名", SEMANTIC_PROXY[type]?.label?.split(" ")[0] || type) || undefined, position: [rand(-3, 3), 0, rand(-2, 2)] }));
  };
  $("addCamera").onclick = () => report(dispatch("camera.create", { name: `机位 ${store.get().cameras.length + 1}`, focalLength: 35, position: [rand(-4, 4), 1.5, 6], target: store.get().project.selectedKind === "entity" ? store.get().project.selectedId : store.get().entities.find((e) => e.semanticType === "character")?.id }));
  $("addLight").onclick = () => report(dispatch("light.create", { name: `灯 ${store.get().lights.length + 1}`, type: "spot", color: "#ffd9a8", intensity: 8, position: [rand(-3, 3), 4, rand(1, 3)], group: "practical", castShadow: true }));
  $("deleteSel").onclick = deleteSelected;
  // stage
  $("viewFree").onclick = () => dispatch("project.set-view", { mode: "free" });
  $("viewProgram").onclick = () => dispatch("project.set-view", { mode: "program" });
  $("viewCompare").onclick = () => dispatch("project.set-view", { mode: store.get().project.viewMode === "compare" ? "program" : "compare" });
  $("gizmoSeg").querySelectorAll("[data-gizmo]").forEach((b) => (b.onclick = () => dispatch("project.set-gizmo", { mode: b.dataset.gizmo })));
  $("playBtn").onclick = togglePlay;
  $("recordBtn").onclick = recordCurrent;
  $("newShotBtn").onclick = () => {
    const d = store.get();
    const title = prompt("镜头标题", `镜头 ${d.shots.length + 1}`);
    if (title === null) return;
    report(dispatch("shot.create", { title: title || undefined, cameraId: d.project.programCameraId, duration: 4, motion: "static" }));
  };
  // agent
  $("agentSettingsBtn").onclick = () => {
    ui.settings = !ui.settings;
    applyUi();
  };
  $("agentMode").onchange = (e) => dispatch("agent.set-mode", { mode: e.target.value });
  $("agentBackend").onchange = (e) => dispatch("agent.set-backend", { backend: e.target.value });
  $("agentSend").onclick = sendAgent;
  $("agentInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendAgent();
    }
  });
  // bottom
  document.querySelectorAll("[data-bottom]").forEach((btn) => (btn.onclick = () => { $("moreTabs").hidden = true; openDrawer(btn.dataset.bottom); }));
  $("drawerBtn").onclick = () => openDrawer();
  bindTips();
  bindResize();
  // 「更多」：主路径之外的七个面板收在这里，一个都没少
  $("moreBtn").onclick = (e) => {
    e.stopPropagation();
    $("moreTabs").hidden = !$("moreTabs").hidden;
  };
  document.addEventListener("click", (e) => {
    if (!$("moreTabs").hidden && !e.target.closest("#moreTabs") && !e.target.closest("#moreBtn")) $("moreTabs").hidden = true;
  });
  document.addEventListener("keydown", onKey);

  store.subscribe((d, info) => {
    if (info?.light) renderLight(d);
    else {
      render(d);
      if (isOnline()) $("saveHint").textContent = `已同步 · v${d.project.version}`;
      else scheduleSave();
    }
  });
  applyUi();
  render(store.get());
}

// first run: a short guide, then out of the way
export function maybeShowGuide() {
  try {
    if (localStorage.getItem(GUIDE_KEY)) return;
  } catch {}
  showGuide(0);
}

// ---------- persistence (standalone mode only) ----------
export function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data?.project) return false;
    dispatch("project.load", { data }, { source: "system", silent: true });
    return true;
  } catch (err) {
    console.warn("load saved project failed", err);
    return false;
  }
}
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 600);
}
// 立刻保存。连着后端时每一步改动本来就落在后端的工程文件里，这里只是把「已保存」的时间点打上；
// 单机模式写 localStorage。时间线上的「保存」按钮走的就是这个。
function saveNow() {
  clearTimeout(saveTimer);
  try {
    if (!isOnline()) localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable()));
    dispatch("project.mark-saved", {}, { silent: true });
    $("saveHint").textContent = `${isOnline() ? "已保存" : "本地保存"} · ${new Date().toLocaleTimeString()}`;
    return true;
  } catch (err) {
    $("saveHint").textContent = "保存失败";
    return false;
  }
}

// ---------- helpers ----------
function report(r) {
  if (!r) return r;
  if (typeof r.then === "function") return r.then(report);
  if (!r.ok) toast(`${r.error}${r.hint ? " · " + r.hint : ""}${r.issues ? " · " + r.issues.join("；") : ""}${r.missing ? " · 缺少 " + r.missing.join(",") : ""}`, true);
  return r;
}
let toastTimer;
export function toast(msg, err = false) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.toggle("err", !!err);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2600);
}
function download(name, content, type = "application/json") {
  if (window.director?.saveFile) return saveNative(name, content); // mac client: native save panel
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function saveNative(name, content) {
  const ext = name.includes(".") ? name.split(".").pop() : "json";
  const r = await window.director.saveFile(name, content, [{ name: ext.toUpperCase(), extensions: [ext] }, { name: "所有文件", extensions: ["*"] }]);
  if (r?.ok) toast(`已保存到 ${r.path}`);
  else if (r && !r.canceled) toast(r.error || "保存失败", true);
}
// "/media/x.mp4" from the backend → absolute URL next to the API root (survives path-prefix proxies)
export function mediaHref(u) {
  if (!u || /^(https?:|data:|blob:)/.test(u)) return u;
  return isOnline() && client.base ? new URL(u.replace(/^\//, ""), new URL("../", client.base)).toString() : u;
}
function rand(a, b) {
  return +(a + Math.random() * (b - a)).toFixed(2);
}
function sendAgent() {
  const input = $("agentInput");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  report(dispatch("agent.run", { text }, { source: "human", actorId: "console" }));
}
function togglePlay() {
  const d = store.get();
  if (d.project.playing) dispatch("timeline.pause");
  else if (d.project.currentShotId) dispatch("shot.preview", { id: d.project.currentShotId, loop: d.project.loop });
  else toast("先选一个镜头", true);
}
async function recordCurrent() {
  const d = store.get();
  if (d.project.recording) return report(dispatch("take.stop"));
  if (!d.project.currentShotId) return toast("先选一个镜头", true);
  const arm = await dispatch("take.arm", { shotId: d.project.currentShotId });
  if (!arm.ok) return report(arm);
  await new Promise((r) => setTimeout(r, 350));
  report(dispatch("take.record", { shotId: d.project.currentShotId }));
}
function deleteSelected() {
  const d = store.get();
  const { selectedKind: k, selectedId: id } = d.project;
  if (!id) return;
  const action = { entity: "entity.delete", camera: "camera.delete", light: "light.delete", shot: "shot.delete" }[k];
  if (action && confirm(`删除 ${id}？可撤销。`)) report(dispatch(action, { id }));
}
function onKey(e) {
  const tag = document.activeElement?.tagName;
  const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    report(dispatch(e.shiftKey ? "project.redo" : "project.undo"));
    return;
  }
  if (typing) return;
  if (e.key === "Escape") {
    closePreview();
    $("menu").hidden = true;
    return;
  }
  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
  } else if (e.key === "w") dispatch("project.set-gizmo", { mode: "translate" });
  else if (e.key === "e") dispatch("project.set-gizmo", { mode: "rotate" });
  else if (e.key === "r") dispatch("project.set-gizmo", { mode: "scale" });
  else if (e.key === "f") focusSelected();
  else if (e.key === "Home") resetView();
  else if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
  else if (e.key === "p") dispatch("project.set-view", { mode: store.get().project.viewMode === "free" ? "program" : "free" });
  else if (e.key === "k") report(dispatch("motion.keyframe", {}));
  else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    const d = store.get();
    dispatch("timeline.seek", { frame: Math.max(0, d.project.playhead + (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 12 : 1)) });
  }
}

// ---------- render ----------
function renderLight(d) {
  $("hudTc").textContent = timecode(localPlayhead(d, d.shots.find((s) => s.id === d.project.currentShotId)), d.project.fps);
  renderPhys(d);
  const head = document.querySelector(".tl-ruler .head");
  const shot = d.shots.find((s) => s.id === d.project.currentShotId);
  if (head && shot) head.style.left = `${((d.project.playhead - shot.range.inFrame) / Math.max(1, shot.range.outFrame - shot.range.inFrame)) * 100}%`;
  const scrub = document.querySelector(".tl-scrub");
  if (scrub && document.activeElement !== scrub) scrub.value = d.project.playhead;
  const tcs = document.querySelector(".tl-side .tcs");
  if (tcs && shot) tcs.textContent = `${timecode(d.project.playhead, d.project.fps)} / ${timecode(shot.range.outFrame, d.project.fps)}`;
  if (ui.drawer && ui.tab === "health" && performance.now() - lastFullRender > 800) {
    lastFullRender = performance.now();
    renderBottom(d);
  }
  $("playBtn").querySelector("use").setAttribute("href", d.project.playing ? "#i-pause" : "#i-play");
  $("playBtn").dataset.tip = d.project.playing ? "暂停" : "播放";
  // 三档一起刷。只刷两档的话，对照那一档的高亮只能等一次全量渲染，
  // 中间这段时间三个按钮会同时是灭的 —— 看上去像这一组失效了。
  $("viewFree").classList.toggle("on", d.project.viewMode === "free");
  $("viewProgram").classList.toggle("on", d.project.viewMode === "program");
  $("viewCompare").classList.toggle("on", d.project.viewMode === "compare");
  $("gizmoSeg").hidden = !d.project.selectedId || d.project.selectedKind === "shot";
  $("gizmoSeg").querySelectorAll("[data-gizmo]").forEach((b) => b.classList.toggle("on", (d.project.gizmoMode || "translate") === b.dataset.gizmo));
  // selection changed → show its properties (once), never steal the panel afterwards
  const sel = d.project.selectedId ? `${d.project.selectedKind}:${d.project.selectedId}` : null;
  if (sel && sel !== lastSelected && ui.left !== "props") {
    ui.left = "props";
    applyUi();
    renderInspector(d);
  }
  lastSelected = sel;
  renderOutlinerSel(d);
}

function render(d) {
  lastFullRender = performance.now();
  renderModels(d);
  renderLibrary(d);
  if (document.activeElement !== $("projectName")) $("projectName").value = d.project.name;
  $("fidelity").value = d.project.fidelity;
  $("shading").value = d.project.shading || "shaded";
  $("aspect").value = d.project.aspect;
  $("buildMode").querySelectorAll("[data-build]").forEach((b) => b.classList.toggle("on", (d.project.buildMode || "set") === b.dataset.build));
  const st = $("statePill");
  st.value = d.project.currentState;
  st.className = `state ${["ARMED", "RECORDING"].includes(d.project.currentState) ? "hot" : d.project.currentState === "GENERATING" ? "gen" : "edit"}`;
  const recOn = !!d.project.recording;
  $("recordBtn").querySelector("use").setAttribute("href", recOn ? "#i-stop" : "#i-rec");
  $("recordBtn").querySelector("b").textContent = recOn ? "停" : "录";
  $("recordBtn").dataset.tip = recOn ? "停止录制" : "录草片";
  $("recordBtn").dataset.tipSub = recOn ? "录到这儿为止，这条就存下来了" : "把这一镜在 3D 里录成一段视频。不花钱，录多少次都行";
  $("recordBtn").classList.toggle("live", !!d.project.recording);
  const h = isOnline() ? d.history || { undo: 0, redo: 0, labels: [] } : historyInfo();
  $("undoBtn").disabled = !h.undo;
  $("redoBtn").disabled = !h.redo;
  $("undoBtn").title = h.labels?.[0] ? `撤销：${h.labels[0]}` : "撤销";
  // connection: a dot in the Agent head, details in the menu
  const mode = d.health.bridge || "offline";
  const dot = $("agentStatus");
  dot.className = `dot ${mode === "online" ? "ok" : mode === "standalone" ? "warn" : ""}`;
  dot.title = mode === "online" ? `已连接后端 ${client.service || ""}` : mode === "standalone" ? "单机模式：后端不可达，生成只是模拟" : mode;
  const bp = $("bridgePill");
  bp.textContent = `backend · ${mode}`;
  bp.className = `pill ${mode === "online" ? "ok" : ""}`;
  let banner = document.querySelector(".topbar .banner");
  if (mode === "standalone" || mode === "reconnecting") {
    if (!banner) {
      banner = document.createElement("span");
      banner.className = "banner";
      $("menuBtn").before(banner);
    }
    banner.textContent = mode === "standalone" ? "单机模式 · 未连接后端" : "重连后端中…";
  } else banner?.remove();
  // agent settings
  $("agentMode").value = d.agent.mode;
  const be = $("agentBackend");
  const models = ["rules", ...(client.llm?.models || [])];
  if (be.options.length !== models.length) be.innerHTML = models.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join("");
  be.value = models.includes(d.agent.backend) ? d.agent.backend : "rules";
  // stage
  renderLight(d);
  renderShotStrip(d);
  renderPads(d);
  renderTabs(d);
  renderCompare(d);
  if (ui.left === "scene") renderOutliner(d);
  if (ui.left === "props") renderInspector(d);
  renderThread(d);
  renderChips(d);
  if (ui.drawer) renderBottom(d);
  watchJobs(d);
}

// ---------- 场次条：台面分了几块，就有几个可以切的场 ----------
// 每个场景单独渲染：点哪一场，舞台只画那一块，自检和 Agent 也只看那一块。
// 一格里写的是导演最先要核对的：这一场有谁、几个人、定妆了几个、几镜多长。
let padsSig = "";
function renderPads(d) {
  const el = $("pads");
  if (!el) return;
  const pads = d.scene.pads || [];
  el.hidden = !pads.length || d.project.viewMode === "compare";
  if (!pads.length) { el.innerHTML = ""; padsSig = ""; return; }
  const active = d.project.activePadId;
  const list = pads.map((p) => padSummary(d, p.id)).filter(Boolean);
  const sig = JSON.stringify([active, list]);
  if (sig === padsSig) return;
  padsSig = sig;
  el.innerHTML = `<button class="pad-all${active ? "" : " on"}" data-pad="" data-tip="整台" data-tip-sub="所有场景一起看：${pads.length} 块台">全部</button>` + list.map((p) => `
    <button class="pad${p.id === active ? " on" : ""}" data-pad="${esc(p.id)}" data-tip="${esc(p.index + " " + p.name)}" data-tip-sub="${esc(`${p.characterCount} 人${p.characters.length ? "：" + p.characters.slice(0, 6).join("、") + (p.characters.length > 6 ? "…" : "") : ""} · ${p.propCount} 件道具 · ${p.shotCount} 镜 ${p.seconds}s · 定妆 ${p.assetsApproved}/${p.characterCount}${p.from != null ? ` · 原片 ${p.from}–${p.to}s` : ""}。点一下只看这一场`)}">
      <b>${p.index}</b><span class="nm">${esc(p.name)}</span>
      <span class="meta"><i>${p.characterCount} 人</i><i>${p.propCount} 物</i><i>${p.shotCount} 镜 · ${p.seconds}s</i><i class="${p.assetsApproved >= p.characterCount && p.characterCount ? "ok" : ""}">定妆 ${p.assetsApproved}/${p.characterCount}</i></span>
      <span class="who">${esc(p.characters.slice(0, 4).join("、"))}${p.characters.length > 4 ? ` +${p.characters.length - 4}` : ""}</span>
    </button>`).join("");
  el.querySelectorAll("[data-pad]").forEach((b) => (b.onclick = async () => {
    const id = b.dataset.pad || null;
    await dispatch("scene.pad-select", { id });
    focusPad(id ? store.get().scene.pads.find((p) => p.id === id) : null);
  }));
}

// ---------- shot strip + tabs ----------
function renderShotStrip(d) {
  const el = $("shotStrip");
  // 一格一镜，画的是这一镜真长什么样：优先故事版关键帧，其次 Take 缩略图，都没有就画个空框。
  // 标题、时长和状态退到气泡里 —— 扫一眼靠图，看细节才停上去。
  const badShots = new Set((checkData?.findings || []).filter((f) => f.level === "error" && f.shotId).map((f) => f.shotId));
  el.innerHTML = d.shots.map((s) => {
    const card = d.storyboard.find((c) => c.shotId === s.id);
    const take = d.takes.find((t) => t.id === s.selectedTake) || d.takes.filter((t) => t.shotId === s.id).at(-1);
    const thumb = card?.keyframes?.[0] || take?.thumbnail || null;
    const secs = ((s.range.outFrame - s.range.inFrame) / d.project.fps).toFixed(1);
    const bad = badShots.has(s.id);
    const state = take?.videoUrl ? "草片录好了" : "草片还没录";
    const tip = `${secs} 秒 · ${Math.round(s.lens.focalLength)}mm · ${MOTION_TYPES[s.motion.type]?.zh || s.motion.type} · ${state}${bad ? " · 检查没过" : ""}`;
    return `<button data-shot="${s.id}" class="${s.id === d.project.currentShotId ? "on" : ""}" data-tip="${esc(s.index + " " + s.title)}" data-tip-sub="${esc(tip)}">${
      thumb ? `<img src="${esc(mediaHref(thumb))}" alt="" />` : `<span class="ph"></span>`
    }<span class="idx">${esc(s.index)}</span>${bad ? `<span class="warn"><svg class="gi"><use href="#i-alert"/></svg></span>` : ""}</button>`;
  }).join("");
  el.querySelectorAll("[data-shot]").forEach((b) => {
    b.onclick = () => dispatch("shot.select", { id: b.dataset.shot });
    b.ondblclick = () => openDrawer("timeline");
  });
}
// 四段流水线代替十一个平铺 tab。功能一个没少：主路径四段留在外面，
// 其余七个收进「更多」—— 排的是发现路径，不是砍能力。
const PIPE_TIP = {
  timeline: ["时间线", "剪辑：镜头顺序、每镜时长、切开、把素材拖上去。原片的切镜也在这里对着看"],
  check: ["检查", "录之前先算一遍：这一镜的画面里到底有没有东西。有问题的会拦住，不让你白录"],
  takes: ["草片", "在 3D 里把每一镜录成视频。不花钱——机位、走位改到满意了再往下走"],
  gen: ["生成", "交给模型出真画面。构图跟着草片走，人物靠参考图锁住。这一步计费"],
  film: ["成片", "把所有镜头拼成一条。还没生成的用草片顶上，先看整体节奏"],
};

function renderTabs(d) {
  const films = filmJobs(d);
  const busy = d.jobs.filter((j) => ["queued", "running"].includes(j.status));
  const recorded = d.shots.filter((s) => d.takes.some((t) => t.shotId === s.id && t.videoUrl)).length;
  const generated = d.shots.filter((s) => d.jobs.some((j) => j.shotId === s.id && j.status === "done" && j.result?.url)).length;
  const errors = checkData?.errors || 0;

  const totalFrames = d.shots.reduce((n, s) => n + (s.range.outFrame - s.range.inFrame), 0);
  const num = { timeline: d.shots.length ? `${d.shots.length} 镜 · ${timecode(totalFrames, d.project.fps).slice(3, 8)}` : "—", check: !d.shots.length ? "—" : !checkData ? "还没查" : errors ? `${errors} 处要看` : "都过了", takes: d.shots.length ? `${recorded}/${d.shots.length}` : "—", gen: d.shots.length ? `${generated}/${d.shots.length}` : "—", film: films.at(-1)?.result?.seconds ? timecode(Math.round(films.at(-1).result.seconds * d.project.fps), d.project.fps).slice(3, 8) : "—" };
  const badge = { timeline: 0, check: errors || 0, takes: 0, gen: busy.filter((j) => j.kind !== "replicate").length, film: films.filter((j) => ["queued", "running"].includes(j.status)).length };
  const kind = { timeline: "ok", check: "bad", takes: "ok", gen: "busy", film: "busy" };

  for (const b of $("pipe").querySelectorAll("[data-bottom]")) {
    const k = b.dataset.bottom;
    const on = ui.drawer && ui.tab === k;
    b.classList.toggle("on", on);
    b.querySelector("i").textContent = num[k];
    b.classList.toggle("has-badge", badge[k] > 0);
    b.classList.remove("bad", "busy", "ok");
    if (badge[k] > 0) b.classList.add(kind[k]);
    b.querySelector("em").textContent = badge[k] > 99 ? "99+" : String(badge[k] || "");
    b.dataset.tip = `${PIPE_TIP[k][0]} · ${num[k]}`;
    b.dataset.tipSub = PIPE_TIP[k][1];
  }

  // 「更多」里的七个：没内容的就不摆出来
  const has = { shots: d.shots.length > 0, board: d.storyboard.length > 0, ref: true, assets: (d.assets || []).length > 0, log: true, health: true };
  const label = { shots: "镜头清单", board: "故事版", ref: "参照", assets: "资产", log: "事件", health: "状态" };
  const extra = { board: d.storyboard.length, ref: d.jobs.filter((j) => ["replicate", "reference-fetch", "reference-read"].includes(j.kind) && ["queued", "running"].includes(j.status)).length, assets: (d.assets || []).filter((a) => !a.approved).length };
  for (const b of $("moreTabs").querySelectorAll("[data-bottom]")) {
    const k = b.dataset.bottom;
    b.hidden = !has[k];
    b.classList.toggle("on", ui.drawer && ui.tab === k);
    b.textContent = label[k] + (extra[k] ? ` ${extra[k]}` : "");
  }
  $("moreBtn").classList.toggle("on", ui.drawer && !PIPE_TIP[ui.tab]);
  if (ui.drawer && !has[ui.tab] && !PIPE_TIP[ui.tab]) ui.tab = "check";
}

// ---------- outliner ----------
function renderOutliner(d) {
  const el = $("outliner");
  const sel = d.project.selectedId;
  const row = (kind, id, name, extra, dot = "") => `<div class="tree-item ${sel === id ? "sel" : ""}" data-kind="${kind}" data-id="${id}"><span class="dot ${dot}"></span><span class="name">${esc(name)}</span><span class="kind">${esc(extra)}</span></div>`;
  const group = (title, rows, count) => `<div class="group-label"><span>${title}</span><span>${count}</span></div>${rows.join("")}`;
  // 切到某一块台就只列这一块的（没分到台的全局布景照列）
  const active = d.project.activePadId && d.scene.pads?.some((p) => p.id === d.project.activePadId) ? d.project.activePadId : null;
  const onPad = (x) => !active || !padOf(d, x) || padOf(d, x) === active;
  const ents = d.entities.filter(onPad), cams = d.cameras.filter(onPad), lights = d.lights.filter(onPad);
  const chars = ents.filter((e) => ["character", "vehicle", "weapon", "prop", "smoke", "flower"].includes(e.semanticType));
  const set = ents.filter((e) => !chars.includes(e));
  const padName = active ? d.scene.pads.find((p) => p.id === active) : null;
  el.innerHTML = [
    padName ? `<div class="pad-scope">只看 台 ${padName.index} · ${esc(padName.name)}<button data-allpads>整台</button></div>` : "",
    group("机位", cams.map((c) => row("camera", c.id, c.name, `${c.lens.focalLength}mm`, c.id === d.project.programCameraId ? "program" : "")), cams.length),
    group("角色 · 道具", chars.map((e) => row("entity", e.id, e.displayName, `${e.semanticType}${e.pose ? " · " + e.pose : ""}`)), chars.length),
    group("布景", set.map((e) => row("entity", e.id, e.displayName, e.semanticType)), set.length),
    group("灯光", lights.map((l) => row("light", l.id, l.name, `${l.group}${l.enabled === false ? " · off" : ""}`)), lights.length),
  ].join("");
  el.querySelector("[data-allpads]")?.addEventListener("click", async () => { await dispatch("scene.pad-select", { id: null }); focusPad(null); });
  el.querySelectorAll(".tree-item[data-id]").forEach((node) => {
    node.onclick = () => dispatch("project.select", { kind: node.dataset.kind, id: node.dataset.id });
    node.ondblclick = () => (node.dataset.kind === "camera" ? dispatch("camera.pilot", { id: node.dataset.id }) : focusSelected());
  });
}
function renderOutlinerSel(d) {
  if (ui.left !== "scene") return;
  document.querySelectorAll("#outliner .tree-item[data-id]").forEach((n) => n.classList.toggle("sel", n.dataset.id === d.project.selectedId));
}

// ---------- inspector ----------
function renderInspector(d) {
  const el = $("inspector");
  const { selectedKind: kind, selectedId: id } = d.project;
  $("deleteSel").hidden = !id || kind === "shot";
  if (kind === "entity") {
    const e = d.entities.find((x) => x.id === id);
    if (e) return inspectEntity(el, e, d);
  } else if (kind === "camera") {
    const c = d.cameras.find((x) => x.id === id);
    if (c) return inspectCamera(el, c, d);
  } else if (kind === "light") {
    const l = d.lights.find((x) => x.id === id);
    if (l) return inspectLight(el, l, d);
  } else if (kind === "shot") {
    const s = d.shots.find((x) => x.id === id);
    if (s) return inspectShot(el, s, d);
  }
  inspectScene(el, d);
}
function field(label, inner) {
  return `<div class="field"><span>${label}</span>${inner}</div>`;
}
function xyz(key, arr) {
  return `<div class="xyz">${[0, 1, 2].map((i) => `<input data-xyz="${key}" data-i="${i}" type="number" step="0.1" value="${fmt(arr[i])}" />`).join("")}</div>`;
}
function bindXyz(el, key, fn) {
  el.querySelectorAll(`[data-xyz="${key}"]`).forEach((inp) => (inp.onchange = () => fn([...el.querySelectorAll(`[data-xyz="${key}"]`)].sort((a, b) => a.dataset.i - b.dataset.i).map((n) => Number(n.value)))));
}
function slider(key, val, min, max, step = 0.01) {
  return `<div class="slider-row"><input type="range" data-slider="${key}" min="${min}" max="${max}" step="${step}" value="${val}" /><output>${fmt(val)}</output></div>`;
}
function options(list, cur, labels = {}) {
  return list.map((v) => `<option value="${v}" ${v === cur ? "selected" : ""}>${esc(labels[v] || v)}</option>`).join("");
}
const more = (title, inner, open = false) => `<details ${open ? "open" : ""}><summary>${title}</summary>${inner}</details>`;

function inspectScene(el, d) {
  $("inspectorTitle").textContent = "场景";
  const env = d.scene.environment;
  el.innerHTML = `
    ${field("名称", `<input data-k="sceneName" value="${esc(d.scene.name)}" />`)}
    ${field("光", `<select data-k="preset">${options(Object.keys(LIGHT_PRESETS), env.preset, Object.fromEntries(Object.entries(LIGHT_PRESETS).map(([k, v]) => [k, v.zh])))}</select>`)}
    ${field("风格", `<input data-k="style" value="${esc(d.project.style || "")}" placeholder="photoreal cinematic…" />`)}
    ${more("房间 · 影棚", `
      ${field("房间", `<select data-room="on"><option value="">无（无限地面）</option><option value="1" ${env.room ? "selected" : ""}>摄影棚房间</option></select>`)}
      ${env.room ? `${field("尺寸", xyz("room", [env.room.width, env.room.depth, env.room.height]))}
      ${field("地面", `<select data-room="pattern">${options(ROOM_PATTERNS, env.room.pattern, { standard: "棋盘格", plain: "纯色", calibration: "校准图案" })}</select>`)}
      ${field("格距", slider("room:spacing", env.room.spacing ?? 1, 0.25, 3, 0.25))}
      ${field("墙 · 回幕", `<span><input type="checkbox" data-room="walls" ${env.room.walls !== false ? "checked" : ""} /> 墙 <input type="checkbox" data-room="cyc" ${env.room.cyc !== false ? "checked" : ""} /> 圆角回幕</span>`)}
      ${field("颜色", `<input type="color" data-room="color" value="${env.room.color || "#e9e9ec"}" />`)}` : ""}`, !!env.room)}
    ${more("环境", `
      ${field("背景", `<input type="color" data-env="bg" value="${env.bg || "#07080d"}" />`)}
      ${field("雾", slider("env:fog", env.fog ?? 0.02, 0, 0.08, 0.001))}
      ${field("环境光", slider("env:ambient", env.ambient ?? 0.2, 0, 1.2, 0.01))}
      ${field("曝光", slider("env:exposure", env.exposure ?? 1.2, 0.3, 2.5, 0.01))}
      ${field("湿地面", `<input type="checkbox" data-env="wet" ${env.wet ? "checked" : ""} />`)}
      ${field("风格(中)", `<input data-k="styleZh" value="${esc(d.project.styleZh || "")}" />`)}`)}`;
  el.querySelector('[data-k="sceneName"]').onchange = (ev) => dispatch("scene.create", { id: d.scene.id, name: ev.target.value });
  el.querySelector('[data-k="preset"]').onchange = (ev) => report(dispatch("scene.preset", { preset: ev.target.value }));
  el.querySelector('[data-env="bg"]').oninput = (ev) => dispatch("scene.environment", { bg: ev.target.value }, { silent: true });
  el.querySelector('[data-env="wet"]').onchange = (ev) => dispatch("scene.environment", { wet: ev.target.checked });
  el.querySelectorAll("[data-slider]").forEach((inp) => {
    inp.oninput = () => {
      inp.nextElementSibling.textContent = fmt(Number(inp.value));
      dispatch("scene.environment", { [inp.dataset.slider.split(":")[1]]: Number(inp.value) }, { silent: true });
    };
  });
  el.querySelector('[data-k="style"]').onchange = (ev) => dispatch("project.set-style", { style: ev.target.value });
  el.querySelector('[data-k="styleZh"]').onchange = (ev) => dispatch("project.set-style", { styleZh: ev.target.value });
  el.querySelector('[data-room="on"]').onchange = (ev) => dispatch("scene.room", ev.target.value ? {} : { clear: true });
  bindXyz(el, "room", (v) => dispatch("scene.room", { width: v[0], depth: v[1], height: v[2] }));
  el.querySelector('[data-room="pattern"]')?.addEventListener("change", (ev) => dispatch("scene.room", { pattern: ev.target.value }));
  el.querySelector('[data-room="walls"]')?.addEventListener("change", (ev) => dispatch("scene.room", { walls: ev.target.checked }));
  el.querySelector('[data-room="cyc"]')?.addEventListener("change", (ev) => dispatch("scene.room", { cyc: ev.target.checked }));
  el.querySelector('[data-room="color"]')?.addEventListener("change", (ev) => dispatch("scene.room", { color: ev.target.value }));
  el.querySelector('[data-slider="room:spacing"]')?.addEventListener("change", (ev) => dispatch("scene.room", { spacing: Number(ev.target.value) }));
}

function inspectEntity(el, e, d) {
  $("inspectorTitle").textContent = e.displayName;
  const isChar = e.semanticType === "character";
  el.innerHTML = `
    ${field("名称", `<input data-k="displayName" value="${esc(e.displayName)}" />`)}
    ${field("位置", xyz("pos", e.transform.position))}
    ${field("朝向", slider("yaw", e.transform.rotation[1], -3.1416, 3.1416, 0.01))}
    ${isChar ? field("姿势", `<select data-k="pose">${options([...Object.keys(POSES), "custom"], e.pose)}</select>`) : ""}
    ${field("外观", `<input data-cont="look" value="${esc(e.continuity?.look || "")}" placeholder="long dark coat…" />`)}
    ${field("模型", `<select data-k="model"><option value="">草片代理</option>${Object.entries(MODEL_LIBRARY).map(([k, m]) => `<option value="${k}" ${e.assetRef === m.url ? "selected" : ""}>${esc(m.zh)}</option>`).join("")}${e.assetRef && !Object.values(MODEL_LIBRARY).some((m) => m.url === e.assetRef) ? `<option value="__custom" selected>${esc(e.assetRef)}</option>` : ""}</select>`)}
    <div class="btn-row"><button data-act="lookat">Program 看向它</button><button data-act="focus">聚焦</button><button data-act="dup">复制</button></div>
    ${["character", "vehicle", "weapon", "prop"].includes(e.semanticType) ? `<div class="btn-row"><button data-act="ref" class="primary">生成参考图</button>${(d.assets || []).filter((a) => a.entityId === e.id && a.approved).map((a) => `<img class="thumb clickable" style="width:48px" data-preview="${esc(a.url)}" data-kind="image" src="${esc(mediaHref(a.url))}" title="${esc(a.label)}" />`).join("")}${(d.assets || []).some((a) => a.entityId === e.id && !a.approved) ? `<button data-act="assets">待批准</button>` : ""}</div>` : ""}
    ${more("形体", `
      ${field("类型", `<input value="${e.semanticType} · ${e.proxy.geometry}" disabled />`)}
      ${field("角色", `<input data-k="role" value="${esc(e.role || "")}" placeholder="hero / partner / antagonist" />`)}
      ${field("尺寸", xyz("dim", e.proxy.dimensions || [1, 1, 1]))}
      ${field("颜色", `<input type="color" data-k="color" value="${e.proxy.color || "#888888"}" />`)}
      ${field("色彩", `<input data-cont="color" value="${esc(e.continuity?.color || "")}" />`)}`)}
    ${isChar ? more("关节", `<div class="joints">${JOINT_NAMES.map((j) => `<div class="field"><span>${j}</span>${slider(`joint:${j}`, e.joints?.[j] ?? 0, JOINT_LIMITS[j][0], JOINT_LIMITS[j][1], 0.01)}</div>`).join("")}</div>`) : ""}
    ${more("走位 · 动线 · 备注", `
      ${field("路点", `<textarea data-k="waypoints" rows="3" placeholder="每行一个点 x,z（或 x,y,z）；重复上一点 = 原地停留">${esc((e.walk?.waypoints || []).map((p) => p.map((v) => +v.toFixed(2)).join(",")).join("\n"))}</textarea>`)}
      ${field("每段秒", `<input data-k="durations" value="${esc((e.walk?.durations || []).join(","))}" placeholder="3,3,5,3（留空按 1.3 m/s）" />`)}
      <div class="btn-row"><button data-act="walk" class="primary">生成走位</button><button data-act="pathKey">在播放头加动线点</button><button data-act="pathClear">清除动线</button></div>
      ${(e.agentMemory || []).length ? `<p class="prompt">${esc(e.agentMemory.join("\n"))}</p>` : ""}
      ${field("备注", `<input data-k="remember" placeholder="回车追加" />`)}`)}`;
  el.querySelector('[data-k="displayName"]').onchange = (ev) => dispatch("entity.update", { id: e.id, displayName: ev.target.value });
  el.querySelector('[data-k="role"]').onchange = (ev) => dispatch("entity.update", { id: e.id, role: ev.target.value });
  el.querySelector('[data-k="color"]').oninput = (ev) => dispatch("entity.update", { id: e.id, color: ev.target.value }, { silent: true });
  bindXyz(el, "pos", (v) => dispatch("entity.transform", { id: e.id, position: v }));
  bindXyz(el, "dim", (v) => dispatch("entity.update", { id: e.id, dimensions: v }));
  el.querySelectorAll("[data-slider]").forEach((inp) => {
    inp.oninput = () => {
      inp.nextElementSibling.textContent = fmt(Number(inp.value));
      const k = inp.dataset.slider;
      if (k === "yaw") dispatch("entity.transform", { id: e.id, yaw: Number(inp.value) }, { silent: true });
      else if (k.startsWith("joint:")) dispatch("entity.pose", { id: e.id, joints: { [k.slice(6)]: Number(inp.value) } }, { silent: true });
    };
  });
  el.querySelector('[data-k="pose"]')?.addEventListener("change", (ev) => ev.target.value !== "custom" && dispatch("entity.pose", { id: e.id, pose: ev.target.value }));
  el.querySelectorAll("[data-cont]").forEach((inp) => (inp.onchange = () => dispatch("entity.update", { id: e.id, continuity: { [inp.dataset.cont]: inp.value } })));
  el.querySelector('[data-k="remember"]').onchange = (ev) => ev.target.value && dispatch("entity.update", { id: e.id, remember: ev.target.value });
  el.querySelector('[data-act="ref"]')?.addEventListener("click", async () => {
    const r = await report(dispatch("generation.reference", { entityId: e.id, view: e.semanticType === "character" ? "front" : "three-quarter" }));
    if (r?.ok) toast("参考图生成中 → 「资产」里批准");
  });
  el.querySelector('[data-act="assets"]')?.addEventListener("click", () => { if (ui.left !== "library") openLeft("library"); });
  el.querySelectorAll("[data-preview]").forEach((n) => (n.onclick = () => showPreview(n.dataset.preview, n.dataset.kind, e.displayName)));
  el.querySelector('[data-k="model"]').onchange = (ev) => (ev.target.value === "__custom" ? null : report(dispatch("entity.replace-proxy", ev.target.value ? { id: e.id, model: ev.target.value } : { id: e.id, asset: null })));
  el.querySelector('[data-act="walk"]').onclick = () => {
    const waypoints = el.querySelector('[data-k="waypoints"]').value.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l) => l.split(/[,\s]+/).map(Number));
    const durations = el.querySelector('[data-k="durations"]').value.split(/[,\s]+/).filter(Boolean).map(Number);
    if (!waypoints.length) return toast("先填路点", true);
    report(dispatch("entity.walk", { id: e.id, waypoints, durations }));
  };
  el.querySelector('[data-act="pathKey"]').onclick = () => dispatch("entity.path", { id: e.id, append: { frame: d.project.playhead, position: [...e.transform.position], yaw: e.transform.rotation[1] } });
  el.querySelector('[data-act="pathClear"]').onclick = () => dispatch("entity.walk", { id: e.id, clear: true });
  el.querySelector('[data-act="dup"]').onclick = () => dispatch("entity.duplicate", { id: e.id });
  el.querySelector('[data-act="focus"]').onclick = focusSelected;
  el.querySelector('[data-act="lookat"]').onclick = () => d.project.programCameraId && report(dispatch("camera.look-at", { id: d.project.programCameraId, target: e.id }));
}

function inspectCamera(el, c, d) {
  $("inspectorTitle").textContent = c.name;
  const ents = d.entities.filter((e) => !["environment"].includes(e.semanticType));
  // 「按景别放机位」没有主体就算不出机位，后端会回 TARGET_NOT_FOUND。
  // 以前这个按钮永远亮着，点了只弹一句报错 —— 违反「能力按状态暴露，不按存在暴露」。
  // 机位自己没写「看向」时，先拿这一镜点名要拍的主体兜底；真的一个都没有才灰掉。
  const shotAim = (d.shots.find((x) => x.id === d.project.currentShotId)?.targetIds || []).find((id) => ents.some((e) => e.id === id)) || "";
  const aim = c.target || shotAim;
  const aimName = ents.find((e) => e.id === aim)?.displayName || "";
  el.innerHTML = `
    ${field("名称", `<input data-k="name" value="${esc(c.name)}" />`)}
    ${field("焦距", slider("focal", c.lens.focalLength, 12, 200, 1))}
    ${field("高度", slider("height", c.pose.position[1], 0.1, 12, 0.05))}
    ${field("看向", `<select data-k="target"><option value="">（无）</option>${options(ents.map((e) => e.id), c.target || "", Object.fromEntries(ents.map((e) => [e.id, e.displayName])))}</select>`)}
    ${field("景别", `<div class="xyz" style="grid-template-columns:1fr 1fr"><select data-k="size">${options(Object.keys(SHOT_SIZES), c.preset || "MS", Object.fromEntries(Object.entries(SHOT_SIZES).map(([k, v]) => [k, `${v.zh} ${k}`])))}</select><select data-k="angle">${options(Object.keys(COVERAGE_ANGLES), "front_left", Object.fromEntries(Object.entries(COVERAGE_ANGLES).map(([k, v]) => [k, v.zh])))}</select></div>`)}
    <div class="btn-row"><button data-act="frame" class="primary"${aim ? "" : " disabled"} title="${aim ? `按景别把机位摆到${esc(aimName)}前面${c.target ? "" : "（这一镜点名要拍它）"}` : "先在「看向」里选一个主体，或给这一镜指定拍谁 —— 不知道拍谁就算不出机位"}>按景别放机位</button><button data-act="pilot">设为 Program</button><button data-act="key">加关键帧</button></div>
    ${more("镜头", `
      ${field("光圈", `<select data-k="aperture">${options([1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11], c.lens.aperture, Object.fromEntries([1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11].map((a) => [a, `f/${a}`])))}</select>`)}
      ${field("位置", xyz("cpos", c.pose.position))}
      ${field("Rig", `<select data-k="rig">${options(CAMERA_RIGS, c.rig)}</select>`)}`)}`;
  el.querySelector('[data-k="name"]').onchange = (ev) => dispatch("camera.update", { id: c.id, name: ev.target.value });
  el.querySelector('[data-k="aperture"]').onchange = (ev) => dispatch("camera.lens", { id: c.id, aperture: Number(ev.target.value) });
  el.querySelector('[data-k="target"]').onchange = (ev) => report(dispatch("camera.look-at", { id: c.id, target: ev.target.value || null }));
  el.querySelector('[data-k="rig"]').onchange = (ev) => dispatch("camera.rig", { id: c.id, rig: ev.target.value });
  bindXyz(el, "cpos", (v) => dispatch("camera.transform", { id: c.id, position: v }));
  el.querySelectorAll("[data-slider]").forEach((inp) => {
    inp.oninput = () => {
      inp.nextElementSibling.textContent = fmt(Number(inp.value), inp.dataset.slider === "focal" ? 0 : 2);
      if (inp.dataset.slider === "focal") dispatch("camera.lens", { id: c.id, focalLength: Number(inp.value) }, { silent: true });
      else dispatch("camera.transform", { id: c.id, height: Number(inp.value) }, { silent: true });
    };
  });
  el.querySelector('[data-act="frame"]').onclick = () => report(dispatch("camera.frame", { id: c.id, target: el.querySelector('[data-k="target"]').value || aim, size: el.querySelector('[data-k="size"]').value, angle: el.querySelector('[data-k="angle"]').value }));
  el.querySelector('[data-act="pilot"]').onclick = () => dispatch("camera.pilot", { id: c.id });
  el.querySelector('[data-act="key"]').onclick = () => report(dispatch("motion.keyframe", {}));
}

function inspectLight(el, l, d) {
  $("inspectorTitle").textContent = l.name;
  el.innerHTML = `
    ${field("名称", `<input data-k="name" value="${esc(l.name)}" />`)}
    ${field("颜色", `<input type="color" data-k="color" value="${l.color}" />`)}
    ${field("强度", slider("intensity", l.intensity, 0, 40, 0.1))}
    ${field("开关", `<input type="checkbox" data-k="enabled" ${l.enabled !== false ? "checked" : ""} />`)}
    ${more("更多", `
      ${field("类型", `<select data-k="type">${options(LIGHT_TYPES, l.type)}</select>`)}
      ${field("组", `<select data-k="group">${options(["key", "fill", "rim", "neon", "practical", "kicker", "top"], l.group)}</select>`)}
      ${field("阴影", `<input type="checkbox" data-k="castShadow" ${l.castShadow ? "checked" : ""} />`)}
      ${field("位置", xyz("lpos", l.transform.position))}
      ${l.type === "spot" || l.type === "directional" || l.type === "area" ? field("目标", xyz("ltgt", Array.isArray(l.target) ? l.target : [0, 0.8, 0])) : ""}
      ${l.type === "spot" ? field("锥角", slider("angle", l.angle ?? 0.55, 0.05, 1.5, 0.01)) : ""}
      ${l.type === "area" ? field("宽×高", xyz("lwh", [l.width ?? 2, l.height ?? 1, 0])) : ""}
      ${field("跟随", `<select data-k="attachTo"><option value="">（不跟随）</option>${options(d.entities.map((e) => e.id), l.attachTo || "", Object.fromEntries(d.entities.map((e) => [e.id, e.displayName])))}</select>`)}
      <div class="btn-row"><button data-act="kf">在播放头加强度关键帧</button><button data-act="kfc">清除</button></div>`)}`;
  el.querySelector('[data-k="name"]').onchange = (ev) => dispatch("light.update", { id: l.id, name: ev.target.value });
  el.querySelector('[data-k="type"]').onchange = (ev) => dispatch("light.update", { id: l.id, type: ev.target.value });
  el.querySelector('[data-k="group"]').onchange = (ev) => dispatch("light.update", { id: l.id, group: ev.target.value });
  el.querySelector('[data-k="color"]').oninput = (ev) => dispatch("light.update", { id: l.id, color: ev.target.value }, { silent: true });
  el.querySelector('[data-k="enabled"]').onchange = (ev) => dispatch("light.toggle", { id: l.id, enabled: ev.target.checked });
  el.querySelector('[data-k="castShadow"]').onchange = (ev) => dispatch("light.update", { id: l.id, castShadow: ev.target.checked });
  el.querySelector('[data-k="attachTo"]').onchange = (ev) => dispatch("light.update", { id: l.id, attachTo: ev.target.value || null, offset: ev.target.value ? [0, 1.2, 0] : null });
  bindXyz(el, "lpos", (v) => dispatch("light.update", { id: l.id, position: v }));
  bindXyz(el, "ltgt", (v) => dispatch("light.update", { id: l.id, target: v }));
  bindXyz(el, "lwh", (v) => dispatch("light.update", { id: l.id, width: v[0], height: v[1] }));
  el.querySelectorAll("[data-slider]").forEach((inp) => {
    inp.oninput = () => {
      inp.nextElementSibling.textContent = fmt(Number(inp.value));
      dispatch("light.update", { id: l.id, [inp.dataset.slider]: Number(inp.value) }, { silent: true });
    };
  });
  el.querySelector('[data-act="kf"]').onclick = () => dispatch("light.keyframe", { id: l.id, frame: d.project.playhead, intensity: l.intensity });
  el.querySelector('[data-act="kfc"]').onclick = () => dispatch("light.keyframe", { id: l.id, clear: true });
}

function inspectShot(el, s, d) {
  $("inspectorTitle").textContent = `${s.index} ${s.title}`;
  const seconds = (s.range.outFrame - s.range.inFrame) / d.project.fps;
  el.innerHTML = `
    ${field("标题", `<input data-k="title" value="${esc(s.title)}" />`)}
    ${field("机位", `<select data-k="cameraId">${options(d.cameras.map((c) => c.id), s.cameraId, Object.fromEntries(d.cameras.map((c) => [c.id, c.name])))}</select>`)}
    ${field("时长", slider("duration", seconds, 1, 20, 0.5))}
    ${field("运镜", `<select data-k="motion">${options(MOTION_TYPE_LIST, s.motion.type, Object.fromEntries(Object.entries(MOTION_TYPES).map(([k, v]) => [k, `${v.zh} · ${k}`])))}</select>`)}
    ${s.motion.type === "orbit" || s.motion.type === "pan" ? field("角度°", slider("degrees", s.motion.params?.degrees ?? 120, 10, 360, 5)) : ""}
    ${["dolly-in", "dolly-out", "push-in", "dolly-zoom"].includes(s.motion.type) ? field("幅度", slider("amount", s.motion.params?.amount ?? 0.5, 0.05, 0.95, 0.05)) : ""}
    <textarea data-k="description" rows="3" placeholder="这个镜头里发生什么">${esc(s.description)}</textarea>
    <div class="btn-row"><button data-act="preview">预演</button><button data-act="record">录制 Take</button><button data-act="prompt">提示词</button><button data-act="board">进故事版</button></div>
    ${more("更多", `
      ${field("对白", `<input data-k="dialogue" value="${esc(s.dialogue || "")}" />`)}
      ${field("目标", `<input data-k="targets" value="${esc((s.targetIds || []).join(","))}" placeholder="hero,gun" />`)}
      ${field("状态", `<select data-k="status">${options(["draft", "blocking", "rehearsal", "recorded", "review", "approved"], s.status)}</select>`)}
      <div class="btn-row"><button data-act="dup">复制镜头</button><button data-act="del" class="danger">删除镜头</button></div>`)}`;
  el.querySelector('[data-k="title"]').onchange = (ev) => dispatch("shot.update", { id: s.id, title: ev.target.value });
  el.querySelector('[data-k="cameraId"]').onchange = (ev) => dispatch("shot.update", { id: s.id, cameraId: ev.target.value });
  el.querySelector('[data-k="motion"]').onchange = (ev) => report(dispatch("motion.set", { shotId: s.id, type: ev.target.value }));
  el.querySelector('[data-k="status"]').onchange = (ev) => dispatch("shot.update", { id: s.id, status: ev.target.value });
  el.querySelector('[data-k="targets"]').onchange = (ev) => dispatch("shot.update", { id: s.id, targetIds: ev.target.value.split(/[,\s]+/).filter(Boolean) });
  el.querySelector('[data-k="description"]').onchange = (ev) => dispatch("shot.update", { id: s.id, description: ev.target.value });
  el.querySelector('[data-k="dialogue"]').onchange = (ev) => dispatch("shot.update", { id: s.id, dialogue: ev.target.value });
  el.querySelectorAll("[data-slider]").forEach((inp) => {
    inp.onchange = () => {
      const k = inp.dataset.slider;
      if (k === "duration") dispatch("shot.update", { id: s.id, duration: Number(inp.value) });
      else dispatch("motion.set", { shotId: s.id, params: { [k]: Number(inp.value) } });
    };
    inp.oninput = () => (inp.nextElementSibling.textContent = fmt(Number(inp.value), 1));
  });
  el.querySelector('[data-act="preview"]').onclick = () => dispatch("shot.preview", { id: s.id });
  el.querySelector('[data-act="record"]').onclick = async () => {
    await dispatch("shot.select", { id: s.id });
    recordCurrent();
  };
  el.querySelector('[data-act="prompt"]').onclick = async () => {
    await report(dispatch("generation.prompt", { shotId: s.id }));
    openDrawer("gen");
  };
  el.querySelector('[data-act="board"]').onclick = () => addToBoard(s.id);
  el.querySelector('[data-act="dup"]').onclick = () => dispatch("shot.duplicate", { id: s.id });
  el.querySelector('[data-act="del"]').onclick = () => confirm(`删除镜头 ${s.index}？`) && dispatch("shot.delete", { id: s.id });
}

async function addToBoard(shotId) {
  const cap = getHooks().capture;
  let keyframes;
  if (cap) {
    const d = store.get();
    const wasShot = d.project.currentShotId;
    if (wasShot !== shotId) await dispatch("shot.select", { id: shotId }, { silent: true });
    await new Promise((r) => setTimeout(r, 60));
    keyframes = [await cap()];
    if (wasShot && wasShot !== shotId) await dispatch("shot.select", { id: wasShot }, { silent: true });
  }
  await report(dispatch("storyboard.add", { shotId, keyframes }));
  openDrawer("board");
}

// ---------- 工具卡片：改了什么 / 这是哪一镜 ----------
// 事件日志里本来就存了受影响对象的 before / after 快照，所以「改了什么」不用猜，
// 直接对出来就是。原来卡片展开只有一坨 JSON，读起来等于没读。
const FIELD_ZH = {
  height: "机位高度", position: "位置", rotation: "旋转", scale: "缩放", yaw: "朝向",
  focalLength: "焦段", aperture: "光圈", sensorWidth: "感光尺寸", target: "看向", rig: "Rig", preset: "景别",
  intensity: "强度", color: "颜色", enabled: "开关", type: "类型",
  pose: "位姿", joints: "关节", displayName: "名称", name: "名称", title: "标题", description: "描述",
  duration: "时长", motion: "运镜", status: "状态", selectedTake: "圈选 Take", targetIds: "目标",
  continuity: "连续性", proxy: "代理体", dimensions: "尺寸", fidelity: "保真度", aspect: "画幅", state: "状态",
};
const UNIT = { height: "m", focalLength: "mm", duration: "s" };

function fmtVal(v, key) {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.every((n) => typeof n === "number") ? `[${v.map((n) => Math.round(n * 100) / 100).join(", ")}]` : `${v.length} 项`;
  if (v && typeof v === "object" && Object.keys(v).length <= 3) return Object.entries(v).map(([k2, v2]) => `${FIELD_ZH[k2] || k2} ${fmtVal(v2, k2)}`).join(" ");
  if (typeof v === "object") return JSON.stringify(v).slice(0, 60);
  if (typeof v === "number") return `${Math.round(v * 1000) / 1000}${UNIT[key] || ""}`;
  if (typeof v === "boolean") return v ? "开" : "关";
  return String(v).slice(0, 60);
}

const SKIP_KEYS = new Set(["version", "updatedAt", "createdAt", "usedByShots", "prompts", "promptVersions", "keyframes", "snapshot", "log", "events", "id"]);

// 机位的位置藏在 pose.position、焦段藏在 lens.focalLength —— 只比一层就只能吐出整个对象的 JSON，
// 等于没比。所以往下钻两层，拿叶子字段说话：「位置 [-1.86, 1.49, 3.01] → [-1.86, 2.4, 3.01]」。
function walk(before, after, prefix, depth, out) {
  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])].filter((k) => !SKIP_KEYS.has(k));
  for (const k of keys) {
    if (out.length >= 8) return;
    const a = before?.[k], b = after?.[k];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    const plain = (v) => v && typeof v === "object" && !Array.isArray(v);
    if (depth > 0 && (plain(a) || plain(b))) {
      walk(a || {}, b || {}, [...prefix, k], depth - 1, out);
      continue;
    }
    out.push({ key: k, label: FIELD_ZH[k] || [...prefix, k].map((x) => FIELD_ZH[x] || x).join("·"), from: fmtVal(a, k), to: fmtVal(b, k) });
  }
}

function diffOf(before, after) {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];
  const out = [];
  walk(before, after, [], 2, out);
  return out;
}

// 动作打到哪一镜上：优先看 payload，再看 targetIds
function shotOf(d, m) {
  const id = m.payload?.shotId || [m.payload?.id, ...(m.targetIds || [])].find((x) => typeof x === "string" && x.startsWith("shot_"));
  return id ? d.shots.find((s) => s.id === id) : null;
}

function shotCard(sh, d) {
  const secs = ((sh.range.outFrame - sh.range.inFrame) / d.project.fps).toFixed(1);
  const cam = d.cameras.find((c) => c.id === sh.cameraId);
  return `<div class="shotcard"><div class="hd"><b>${esc(String(sh.index).padStart(2, "0"))} ${esc(sh.title)}</b><span>${secs}s</span></div>
    <div class="meta">${esc(cam?.name || sh.cameraId)} · ${Math.round(sh.lens.focalLength)}mm · ${esc(sh.motion.type)}${sh.status ? ` · ${esc(sh.status)}` : ""}</div>
    <div class="actions"><button data-goshot="${esc(sh.id)}">跳到该镜</button></div></div>`;
}

// ---------- 成片 ----------
// 拼好的片子原来在面板里没有入口：film.export 建的任务 shotId 是 null，
// 而生成抽屉只列当前镜头的任务，所以它谁也看不见。这里把整条片子当一等公民摆出来：
// 整片（film）和长镜头分段续拍（chain）都是"一条能播的成片"，放在一起。
function filmJobs(d) {
  return [...(d.jobs || [])].reverse().filter((j) => j.kind === "film" || j.kind === "chain");
}

let filmPick = null;
let showRefCol = null; // null = 自动：没生成时默认把原片摆出来
let showPrevGen = false; // 对照默认两栏；上一版是可选的第三栏

function renderFilm(el, d) {
  const jobs = filmJobs(d);
  if (!jobs.length) return void (el.innerHTML = emptyState("还没有成片。镜头有素材后，「成片 → 导出成片」拼一条。"));
  const cur = jobs.find((j) => j.id === filmPick) || jobs.find((j) => j.result?.url) || jobs[0];
  const src = cur.result?.url;
  const shotOf = (j) => (j.shotId ? d.shots.find((s) => s.id === j.shotId) : null);
  const kindZh = (j) => (j.kind === "chain" ? `长镜头续拍 · ${(j.parts || []).length} 段` : { auto: "有生成用生成，缺的用草片", blockout: "全部草片", generated: "全部生成" }[j.filmSource] || "成片");

  // 对照：同一镜的白模与生成并排，同步播放。
  // 这是整个产品最该被看见的一屏 —— 小白 get 不到 3D 的意义，是因为他从没见过
  // "同一个构图、同一个运动、换一次生成人还是同一个人"。说一百遍不如并排播一次。
  const pairs = comparePairs(d);

  el.innerHTML = `<div class="film-layout">
    <div class="film-main">
      ${src
        ? `<video class="film-player" src="${esc(mediaHref(src))}" controls playsinline preload="metadata"></video>`
        : `<div class="film-empty">${["queued", "running"].includes(cur.status) ? `拼接中 ${cur.progress || 0}%${cur.note ? ` · ${esc(cur.note)}` : ""}` : esc(cur.message || cur.error || "这一条没有产出")}</div>`}
      <div class="film-meta">
        <b>${esc(cur.prompt || cur.id)}</b>
        <span>${kindZh(cur)}${shotOf(cur) ? ` · ${esc(shotOf(cur).index)} ${esc(shotOf(cur).title)}` : ""}</span>
        <span>${cur.result ? `${Math.round(cur.result.seconds)}s · ${(cur.result.bytes / 1e6).toFixed(1)} MB${cur.result.clips ? ` · ${cur.result.clips} 段` : ""}` : badge(cur.status)}</span>
      </div>
      <div class="actions">
        ${src ? `<button data-preview="${esc(src)}" data-kind="video" class="primary">全屏播放</button>` : ""}
        ${src ? `<button data-save-film="${esc(src)}">${window.director?.saveFile ? "另存为…" : "下载"}</button>` : ""}
        ${src && window.director?.revealMedia ? `<button data-reveal-film="${esc(src)}">在访达中显示</button>` : ""}
        ${cur.kind === "chain" ? `<button data-chain="${cur.id}">查看生成过程</button>` : ""}
        ${cur.kind === "chain" && cur.resumable ? `<button data-resume="${cur.shotId}">接着跑</button>` : ""}
        ${pairs.length ? `<button data-film-mode="compare">在主画面对照</button>` : ""}
        <button data-refilm="auto">重新拼一条</button>
      </div>
      ${cur.kind === "chain" && openChain.has(cur.id) ? chainView(cur) : ""}
    </div>
    <div class="film-list">
      ${jobs.map((j) => `<div class="film-item ${j.id === cur.id ? "on" : ""}" data-film="${j.id}">
        <div class="fi-top"><b>${esc(kindZh(j))}</b>${["queued", "running"].includes(j.status) ? `<span class="mono">${j.progress || 0}%</span>` : j.result ? `<span class="mono">${Math.round(j.result.seconds)}s</span>` : badge(j.status)}</div>
        <div class="fi-sub mono">${esc(new Date(j.createdAt).toLocaleTimeString())} · ${esc(j.id)}</div>
      </div>`).join("")}
    </div></div>`;

  el.querySelectorAll("[data-film-mode]").forEach((b) => (b.onclick = () => dispatch("project.set-view", { mode: "compare" })));
  el.querySelectorAll("[data-film]").forEach((n) => (n.onclick = () => { filmPick = n.dataset.film; renderFilm(el, store.get()); }));
  el.querySelectorAll("[data-save-film]").forEach((b) => (b.onclick = async () => {
    const ref = b.dataset.saveFilm;
    // 桌面端让主进程直接拷贝后端那份文件：几十 MB 的视频不该经过渲染进程的内存，
    // 而且 saveFile 是按字符串写的，二进制会被写坏。
    if (window.director?.saveMedia) {
      const r = await window.director.saveMedia(ref);
      if (r?.ok) toast(`已保存到 ${r.path}`);
      else if (r && !r.canceled) toast(r.error || "保存失败", true);
      return;
    }
    const a = document.createElement("a");
    a.href = mediaHref(ref);
    a.download = ref.split("/").pop();
    a.click();
  }));
  el.querySelectorAll("[data-reveal-film]").forEach((b) => (b.onclick = () => window.director?.revealMedia?.(b.dataset.revealFilm)));
  el.querySelectorAll("[data-refilm]").forEach((b) => (b.onclick = () => report(dispatch("film.export", { source: b.dataset.refilm }))));
  el.querySelectorAll("[data-chain]").forEach((b) => (b.onclick = () => {
    openChain.has(b.dataset.chain) ? openChain.delete(b.dataset.chain) : openChain.add(b.dataset.chain);
    renderFilm(el, store.get());
  }));
  el.querySelectorAll("[data-resume]").forEach((b) => (b.onclick = () => report(dispatch("shot.chain", { shotId: b.dataset.resume, resume: true }))));
  el.querySelectorAll("[data-preview]").forEach((n) => (n.onclick = () => showPreview(n.dataset.preview, n.dataset.kind, "成片")));
}

// 每一镜的「白模 ↔ 生成」配对：有这两样才谈得上对照
function comparePairs(d) {
  return d.shots.map((s) => {
    const take = d.takes.find((t) => t.id === s.selectedTake && t.videoUrl) || d.takes.filter((t) => t.shotId === s.id && t.videoUrl).at(-1);
    const gens = d.jobs.filter((j) => j.shotId === s.id && j.status === "done" && j.result?.url && /\.(mp4|webm|mov)$/i.test(j.result.url));
    const gen = gens.at(-1), prev = gens.length > 1 ? gens.at(-2) : null;
    const prevTake = take ? d.takes.filter((t) => t.shotId === s.id && t.videoUrl && t.id !== take.id).at(-1) : null;
    return { shot: s, blockout: take?.videoUrl || null, blockoutPrev: prevTake?.videoUrl || null, generated: gen?.result?.url || null, previous: prev?.result?.url || null, mode: gen?.mode, refs: (gen?.inputs?.references || []).length, verdict: s.lastVerdict || null };
  }).filter((p) => p.blockout && p.generated);
}

// 验收结论：这才是"人没变"的证据，不是一句承诺
function verdictLine(v) {
  if (!v) return "";
  const drift = (v.drift || []).filter((x) => x.changed);
  const major = drift.filter((x) => x.severity === "major");
  const applied = v.applied === true ? "改动生效" : v.applied === false ? "改动没生效" : "改动是否生效看不准";
  if (major.length) return `<span class="warn">${esc(applied)}，但 ${major.map((x) => esc(x.aspect)).join("/")} 漂了</span>`;
  return `<span class="ok">${esc(applied)}；锁住的没漂${drift.length ? `（${drift.length} 处轻微差异）` : ""}</span>`;
}

function bindSync(el) {
  el.querySelectorAll("[data-regen]").forEach((b) => (b.onclick = async () => {
    const box = el.querySelector("[data-run]");
    el.querySelectorAll("[data-regen]").forEach((x) => (x.disabled = true));
    if (box) { box.hidden = false; box.className = "sc-run"; box.textContent = "准备…"; }
    const { regenerateShot } = await import("./film.js");
    const r = await regenerateShot({ shotId: b.dataset.regen, onProgress: (p) => box && (box.textContent = p.label || p.phase) });
    el.querySelectorAll("[data-regen]").forEach((x) => (x.disabled = false));
    if (box) {
      box.className = `sc-run ${r.ok ? "ok" : "fail"}`;
      box.textContent = r.ok
        ? (r.verdict ? `完成 · ${r.verdict.summary || ""}` : "完成")
        : `${{ blockout: "重录草片", submit: "提交", generate: "生成" }[r.stage] || ""}失败：${r.hint || r.message || r.error}`;
    }
    if (!r.ok) return;
    el.dataset.key = ""; // 强制重画：这一版变「新版」，上一版挪到中间那格
    setTimeout(() => renderCompare(store.get()), 1200);
  }));

  // 一起播 / 一起停，拖任意一个另一个跟上 —— 对照的意义在于同一时刻的同一构图。
  // 暂停就是停在当下这一帧：以前暂停顺手把 currentTime 归零，草片第 0 帧是录制器起手的黑场，
  // 于是「一按暂停全黑」。回到开头是另一个按钮。按钮的字永远跟着真实状态走（播完、拖动、外部暂停都算）。
  const vs = () => [...el.querySelectorAll("video[data-sync]")];
  const playBtn = el.querySelector("[data-play]");
  const scrub = el.querySelector("[data-scrub]");
  const timeEl = el.querySelector("[data-time]");
  const longest = () => Math.max(0.1, ...vs().map((v) => (Number.isFinite(v.duration) ? v.duration : 0)));
  const syncUi = () => {
    const playing = vs().some((v) => !v.paused && !v.ended);
    if (playBtn) playBtn.textContent = playing ? "❚❚ 暂停" : vs().some((v) => v.currentTime > 0.05) ? "▶ 继续" : "▶ 一起播";
    const lead = vs().find((v) => !v.paused) || vs()[0];
    if (scrub && lead && !scrub.matches(":active")) scrub.value = String(Math.round((lead.currentTime / longest()) * 1000));
    if (timeEl && lead) timeEl.textContent = `${lead.currentTime.toFixed(1)}s / ${longest().toFixed(1)}s`;
  };
  vs().forEach((v) => {
    v.loop = false; // 播完就停在末帧并把按钮换回来，循环会让「暂停」永远追不上状态
    v.preload = "auto";
    v.onplay = v.onpause = v.onended = v.ontimeupdate = v.onloadedmetadata = syncUi;
    v.onseeking = () => vs().forEach((o) => { if (o !== v && Math.abs(o.currentTime - v.currentTime) > 0.15) o.currentTime = v.currentTime; });
  });
  playBtn?.addEventListener("click", () => {
    const playing = vs().some((v) => !v.paused && !v.ended);
    if (playing) vs().forEach((v) => v.pause());
    else {
      // 都播到头了就从头来；否则从各自现在的位置接着播（时间对齐到最靠前的那个）
      const done = vs().every((v) => v.ended || (v.duration && v.currentTime >= v.duration - 0.05));
      const t = done ? 0 : Math.min(...vs().map((v) => v.currentTime));
      vs().forEach((v) => { v.currentTime = t; v.play().catch(() => {}); });
    }
    syncUi();
  });
  el.querySelector("[data-restart]")?.addEventListener("click", () => { vs().forEach((v) => { v.pause(); v.currentTime = 0; }); syncUi(); });
  scrub?.addEventListener("input", () => { const t = (Number(scrub.value) / 1000) * longest(); vs().forEach((v) => { v.currentTime = Math.min(t, v.duration || t); }); syncUi(); });
  syncUi();
}

// 舞台对照：占满主画面的左右分屏。
// 放在底部抽屉里是错的 —— 那是整个界面最挤的地方，两个视频会被压成两条缝。
// 对照是这个产品的论证本身，它该占最大的那块地方。
export function renderCompare(d) {
  const el = $("compare");
  if (!el) return;
  const on = d.project.viewMode === "compare";
  el.hidden = !on;
  $("viewCompare")?.classList.toggle("on", on);
  if (!on) {
    // dataset.key 是「内容没变就别重绘」的缓存键。退出对照时清了 innerHTML 却留着 key，
    // 于是再进来时 key 命中、直接 return —— 对照那一屏永远是一片黑，再也回不来。
    el.innerHTML = "";
    delete el.dataset.key;
    return;
  }

  const shot = d.shots.find((s) => s.id === d.project.currentShotId) || d.shots[0];
  if (!shot) { el.innerHTML = `<div class="sc-empty">还没有镜头。</div>`; return; }
  const p = comparePairs(d).find((x) => x.shot.id === shot.id) || pairFor(d, shot);
  const three = showPrevGen && !!p.previous;
  // 原片：复刻流程里最该被并排看的东西，默认就摆出来。
  // 改完重录之后要看的是「改前 / 改后 / 生成」三样并排，所以草片给两栏：上一版和改完后这版；
  // 生成那栏一直在，还没生成就写「还没有」—— 空着的一栏也在说事：下一步就是它。
  const origin = d.project.reference?.ref || null;
  const withRef = origin && (showRefCol === null ? true : showRefCol);
  const key = `${shot.id}|${p.blockout}|${p.blockoutPrev}|${p.generated}|${three ? p.previous : ""}|${withRef ? origin : ""}|${JSON.stringify(p.verdict || null)}`;
  if (el.dataset.key === key) return; // 别在播放时被每帧重绘打断
  el.dataset.key = key;

  const cell = (tag, url, cls = "") => `<div class="sc-cell ${cls}"><div class="sc-tag">${tag}</div><div class="sc-frame">${
    url ? `<video class="sc-v" data-sync src="${esc(mediaHref(url))}" muted loop playsinline preload="metadata"></video>` : `<div class="sc-none">还没有</div>`
  }</div></div>`;

  const cells = [
    withRef ? cell("原片 · 你要复刻的那条", origin, "origin") : "",
    p.blockoutPrev ? cell("草片 · 改之前", p.blockoutPrev, "prev") : "",
    cell(p.blockoutPrev ? "草片 · 改完后 · 免费" : "草片 · 免费 · 你改的是这边", p.blockout),
    three ? cell("生成 · 上一版", p.previous) : "",
    cell(`生成 · ${esc(p.mode || "")}${three ? " · 新版" : ""} · 计费`, p.generated, "gen"),
  ].filter(Boolean);
  el.innerHTML = `
    <div class="sc-grid n${cells.length}">${cells.join("")}</div>
    <div class="sc-scrub"><input type="range" min="0" max="1000" value="0" data-scrub /><span class="sc-time" data-time>0.0s</span></div>
    <div class="sc-bar">
      <b>${esc(shot.index)} ${esc(shot.title)}</b>
      <span>${Math.round(shot.lens.focalLength)}mm · ${esc(shot.motion.type)} · ${((shot.range.outFrame - shot.range.inFrame) / d.project.fps).toFixed(1)}s</span>
      ${p.refs ? `<span class="ok">带了 ${p.refs} 张参考图，人物跨镜是同一个</span>` : `<span class="warn">这一镜没带参考图，身份可能会漂</span>`}
      ${verdictLine(p.verdict)}
      <span class="sc-run" data-run hidden></span>
      <div class="sc-btns">
        ${origin ? `<button data-origin class="${withRef ? "on" : ""}">${withRef ? "收起原片" : "对上原片"}</button>` : ""}
        ${p.previous ? `<button data-prev class="${three ? "on" : ""}">${three ? "只看两栏" : "加上一版"}</button>` : ""}
        <button data-play class="primary">▶ 一起播</button><button data-restart data-tip="回到开头" data-tip-sub="所有栏一起回到第 0 秒，停着">⇤</button>
        ${withRef ? `<button data-origin-gen="${esc(shot.id)}">直接照原片生成</button>` : ""}
        <button class="primary" data-regen="${esc(shot.id)}">改完重生成这一镜</button>
        <button data-close>退出对照</button>
      </div>
    </div>
    <div class="sc-why">${withRef && !p.generated
      ? `<b>对着原片调草片</b>：机位高度、焦段、运动轨迹、主体在画面里的位置 —— 这些对上了，生成出来才像。草片改多少次都不花钱，对齐了再花钱生成。`
      : `<b>左边随便改，不花钱</b>：机位、走位、光、焦段。改完点「改完重生成这一镜」——<b>只重做这一镜</b>，构图跟着草片走，人物靠已批准的参考图锁住。`}</div>`;
  bindSync(el);
  el.querySelector("[data-close]").onclick = () => dispatch("project.set-view", { mode: "program" });
  el.querySelector("[data-prev]")?.addEventListener("click", () => { showPrevGen = !showPrevGen; el.dataset.key = ""; renderCompare(store.get()); });
  el.querySelector("[data-origin]")?.addEventListener("click", () => { showRefCol = !withRef; el.dataset.key = ""; renderCompare(store.get()); });
  el.querySelector("[data-origin-gen]")?.addEventListener("click", (ev) => report(dispatch("generation.submit", { shotId: ev.currentTarget.dataset.originGen, mode: "v2v", provider: "seedance-2.5", reference: "origin" })));
}

function pairFor(d, s) {
  const take = d.takes.find((t) => t.id === s.selectedTake && t.videoUrl) || d.takes.filter((t) => t.shotId === s.id && t.videoUrl).at(-1);
  const gens = d.jobs.filter((j) => j.shotId === s.id && j.status === "done" && j.result?.url && /\.(mp4|webm|mov)$/i.test(j.result.url));
  const prevTake = take ? d.takes.filter((t) => t.shotId === s.id && t.videoUrl && t.id !== take.id).at(-1) : null;
  return { shot: s, blockout: take?.videoUrl || null, blockoutPrev: prevTake?.videoUrl || null, generated: gens.at(-1)?.result?.url || null, previous: gens.length > 1 ? gens.at(-2).result.url : null, mode: [String(gens.at(-1)?.model || "").replace(/\s*\(.*\)$/, ""), gens.at(-1)?.mode].filter(Boolean).join(" · "), refs: (gens.at(-1)?.inputs?.references || []).length, verdict: s.lastVerdict || null };
}

// ---------- agent thread ----------
const expanded = new Set();
const raw = new Set();      // 展开后还想看原始参数的卡片
const skipped = new Set();  // 待确认方案里被取消勾选的步骤 "<msgId>:<index>"
const skipCount = (mid) => [...skipped].filter((k) => k.startsWith(`${mid}:`)).length;

// 后端能力变了（典型的是隧道建好了、v2v 从灰的变成能点了），由 SSE 的 health 帧喂进来。
// 不是工程状态的变化，所以不走 dispatch：重画一次界面就够了。
export function refreshCapabilities() {
  render(store.get());
}

// 规划中的实时思考：由后端 SSE 的 thinking 帧喂进来（见 client.js）。不进工程状态，纯展示。
let live = null;
export function setThinking(t) {
  if (!t || t.phase === "done" || t.phase === "failed") live = t?.phase === "failed" ? { ...t } : null;
  else live = t;
  renderThread(store.get());
}

// ---- Agent 线程：一轮对话 = 一张卡 ----
//
// 以前这里每执行一步就占一行：一个 30 步的计划 = 30 行 ✓，外加一条思考、一条计划、一条回复。
// 反问卡片摆着五段文字（问题、为什么问、选项、推荐项的说明、备注），规划时还滚一整屏思考流。
// 信息一条没少，但人要找的只有三样：做完了没有、改了什么、要不要我拿主意。
//
// 所以和 0.6.0 的界面是同一套做法 —— 信息不删，只是不一次全摆出来：
//   · 连着执行的步骤收成一张卡，标题是「改了 N 处」+ 最要紧的两条变化；点开才是逐步清单
//   · 失败的那一步永远露在外面，不跟着折叠（折叠不能把坏消息藏起来）
//   · 反问只剩问题和选项；为什么问、每个选项意味着什么，停上去才出现
//   · 思考是一个小标签；规划中是一行，不再滚一屏
//   · 连着出片的消息收成一排缩略图
const ICO = (id, cls = "") => `<svg class="gi ${cls}"><use href="#${id}"/></svg>`;
const changesOf = (d, m) => { const evt = m.eventId ? d.events.find((e) => e.id === m.eventId) : null; return evt ? diffOf(evt.before, evt.after) : []; };

function toolStepHtml(m, d) {
  const open = expanded.has(m.id);
  const [head, ...rest] = m.text.split("\n");
  const changes = changesOf(d, m);
  const sh = shotOf(d, m);
  const hint = !open && changes.length ? `<em>${esc(changes.slice(0, 1).map((c) => `${c.from}→${c.to}`).join(""))}</em>` : "";
  const body = open
    ? `${changes.length ? `<table class="diff">${changes.map((c) => `<tr><td>${esc(c.label)}</td><td class="from">${esc(c.from)}</td><td class="to">${esc(c.to)}</td></tr>`).join("")}</table>` : `<pre>${esc(rest.join("\n"))}</pre>`}
       ${sh ? shotCard(sh, d) : ""}
       <div class="actions">${m.targetIds?.length ? m.targetIds.slice(0, 2).map((t) => `<button data-locate="${esc(t)}">定位</button>`).join("") : ""}${m.eventId && m.ok !== false ? `<button data-undo-to="${m.eventId}">撤销到这之前</button>` : ""}${changes.length ? `<button data-raw="${m.id}">原始参数</button>` : ""}</div>
       ${raw.has(m.id) ? `<pre>${esc(rest.join("\n"))}</pre>` : ""}`
    : "";
  return `<div class="tstep ${m.ok === false ? "fail" : ""}" data-mid="${m.id}" data-toggle="1" data-tip="${esc(m.action || "")}" data-tip-sub="点开看改了什么"><div class="line">${ICO(m.ok === false ? "i-alert" : "i-check")}<b>${esc(head)}</b>${hint}</div>${body}</div>`;
}

function toolGroupHtml(g, d) {
  const items = g.items;
  const failed = items.filter((m) => m.ok === false);
  // 只有一步：不值得再套一层
  if (items.length === 1) return `<div class="msg tool ${failed.length ? "fail" : ""}">${toolStepHtml(items[0], d)}</div>`;
  const open = expanded.has(g.id);
  const tops = items.flatMap((m) => changesOf(d, m).slice(0, 1).map((c) => `${c.label} ${c.from}→${c.to}`)).slice(0, 2);
  const title = failed.length ? `${items.length} 步里 ${failed.length} 步没成` : `改了 ${items.length} 处`;
  return `<div class="msg tool group ${failed.length ? "fail" : ""}">
    <div class="line" data-mid="${g.id}" data-toggle="1">${ICO(failed.length ? "i-alert" : "i-check")}<b>${esc(title)}</b>${tops.length && !open ? `<em>${esc(tops.join(" · "))}</em>` : ""}${ICO(open ? "i-chev-d" : "i-chev-r", "chev")}</div>
    ${open ? items.map((m) => toolStepHtml(m, d)).join("") : failed.map((m) => toolStepHtml(m, d)).join("")}
  </div>`;
}

function mediaGroupHtml(g) {
  const cell = (m) => {
    const parts = String(m.text || "").split(" · ");
    const label = parts[0].replace(/生成完成.*$/, "").trim();
    const by = [parts[1], (parts[2] || "").replace(/\s*生成完成.*$/, "")].filter(Boolean).join(" · ");
    const node = m.media.kind === "image"
      ? `<img data-preview="${esc(m.media.url)}" data-kind="image" src="${esc(mediaHref(m.media.url))}" />`
      : `<video data-preview="${esc(m.media.url)}" data-kind="video" src="${esc(mediaHref(m.media.url))}" muted loop playsinline onmouseenter="this.play()" onmouseleave="this.pause()"></video>`;
    return `<div class="mcell" data-tip="${esc(label || "出来了")}" data-tip-sub="${esc(by ? by + "。" : "")}点开看大图；看完直接说要改什么">${node}${m.shotId ? `<button class="mgo" data-goshot="${esc(m.shotId)}">${ICO("i-crosshair")}</button>` : ""}</div>`;
  };
  return `<div class="msg agent media-strip"><div class="line">${ICO("i-sparkles")}<b>${g.items.length === 1 ? "出来了" : `${g.items.length} 镜出来了`}</b></div><div class="mgrid">${g.items.map(cell).join("")}</div></div>`;
}

function liveThinking(d) {
  if (live?.phase === "failed") return `<div class="msg agent fail">没规划成：${esc(live.error || "")}</div>`;
  if (!d.agent.busy) { live = null; return ""; } // 换工程/取消时不留下悬空的"正在规划"
  const t = live || {};
  const open = expanded.has("__live");
  const head = t.phase === "executing" ? "在做…" : "在想…";
  const tail = open && t.reasoning ? `<pre>${esc(t.reasoning).slice(-1200)}</pre>` : "";
  const steps = open ? (t.steps || []).slice(-6).map((x) => `<div>· ${esc(x)}</div>`).join("") : "";
  return `<div class="msg thinking live" data-mid="__live" data-toggle="1" data-tip="${esc(t.model || "模型")}${t.phase === "executing" ? " 在执行计划" : " 正在规划"}" data-tip-sub="点开看它在想什么"><div class="line"><span class="spin">◠</span><b>${head}</b>${t.chars ? `<code>${t.chars} 字</code>` : ""}</div>${tail}${steps ? `<div class="notes">${steps}</div>` : ""}</div>`;
}

const PLAN_FOLD = 5; // 计划超过这么多步就先折起来：一屏三十行的计划没人会逐行读

function renderThread(d) {
  const el = $("agentThread");
  const stick = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  el.innerHTML =
    threadItems(d.agent.messages)
      .map((it) => {
        if (it.kind === "tools") return toolGroupHtml(it, d);
        if (it.kind === "media") return mediaGroupHtml(it);
        const m = it.m;
        if (m.role === "thinking") {
          const t = m.thinking || {};
          const open = expanded.has(m.id);
          const secs = t.ms ? `${(t.ms / 1000).toFixed(0)}s` : "";
          const tip = [t.model, t.steps?.length ? `${t.steps.length} 步` : "", t.usage?.reasoning ? `${t.usage.reasoning} 思考 token` : ""].filter(Boolean).join(" · ");
          const body = t.reasoning ? `<pre>${esc(t.reasoning)}</pre>` : `<div class="hint">这个模型不外传思考文本，下面是它写出来的计划顺序。</div>`;
          const steps = (t.steps || []).map((x) => `<div class="step"><div>${esc(x.label || x.action)}</div></div>`).join("");
          const notes = (t.notes || []).length ? `<div class="notes">${t.notes.map((n) => `<div>· ${esc(n)}</div>`).join("")}</div>` : "";
          return `<div class="msg thinking chip" data-mid="${m.id}" data-toggle="1" data-tip="想了 ${esc(secs || "一会儿")}" data-tip-sub="${esc(tip || "点开看思考过程")}"><div class="line">${ICO("i-sparkles")}<b>想了 ${esc(secs || "一会儿")}</b>${ICO(open ? "i-chev-d" : "i-chev-r", "chev")}</div>${open ? body + steps + notes : ""}</div>`;
        }
        if (m.role === "ask") {
          const asked = m.answered || {};
          const notes = (m.notes || []).join("　");
          return `<div class="msg ask" data-mid="${m.id}">${m.text ? `<div class="at">${esc(m.text)}</div>` : ""}
            ${(m.ask || []).map((a, qi) => `<div class="q"><div class="qt"${a.why ? ` data-tip="为什么问这个" data-tip-sub="${esc(a.why)}"` : ""}>${esc(a.question)}${a.why ? ICO("i-help", "qi") : ""}</div>
              <div class="opts">${a.options.map((o) => `<button class="${asked[qi] === o.label ? "on" : ""}${o.recommended ? " rec" : ""}" data-answer="${m.id}:${qi}:${esc(o.label)}" data-tip="${esc(o.label)}${o.recommended ? " · 多半是这个" : ""}" data-tip-sub="${esc(o.detail || "")}">${esc(o.label)}</button>`).join("")}</div></div>`).join("")}
            ${notes ? `<div class="anote" data-tip="顺带一提" data-tip-sub="${esc(notes)}">${ICO("i-help", "qi")}</div>` : ""}</div>`;
        }
        if (m.role === "plan") {
          // quiet 步骤不显示，但 agent.confirm 的 skip 下标是对着未过滤的 plan.steps 的 ——
          // 所以复选框必须带真实下标，否则会跳掉另一步。
          const steps = (m.plan?.steps || []).map((s, i) => ({ s, i })).filter((x) => !x.s.quiet);
          const open = expanded.has(m.id) || steps.length <= PLAN_FOLD;
          const shown = open ? steps : steps.slice(0, PLAN_FOLD - 1);
          return `<div class="msg plan" data-mid="${m.id}"><div class="pt">${esc(m.text)}</div>
          ${shown.map(({ s, i }, vi) => `<div class="step${m.pending && skipped.has(`${m.id}:${i}`) ? " off" : ""}" data-tip="${esc(s.action)}" data-tip-sub="${esc(s.why || "")}">${m.pending ? `<input type="checkbox" data-skip="${m.id}:${i}"${skipped.has(`${m.id}:${i}`) ? "" : " checked"}>` : ""}<div>${esc(s.label)}</div>${m.manual ? `<button data-run-step="${m.id}:${vi}">执行</button>` : ""}</div>`).join("")}
          ${!open ? `<button class="pmore" data-mid="${m.id}" data-toggle="1">还有 ${steps.length - shown.length} 步</button>` : ""}
          ${m.pending ? `<div class="actions"><button class="primary" data-confirm="${m.id}">${skipCount(m.id) ? `做选中的 ${steps.length - skipCount(m.id)} 步` : "就这么做"}</button><button data-cancel="1">算了</button></div>` : ""}</div>`;
        }
        const media = m.media?.url ? (m.media.kind === "image" ? `<img class="media" data-preview="${esc(m.media.url)}" data-kind="image" src="${esc(mediaHref(m.media.url))}" />` : `<video class="media" data-preview="${esc(m.media.url)}" data-kind="video" src="${esc(mediaHref(m.media.url))}" muted loop playsinline onmouseenter="this.play()" onmouseleave="this.pause()"></video>`) : "";
        const dl = m.download ? `<div class="actions"><button data-dl="${m.id}">下载 ${esc(m.download.name)}</button></div>` : "";
        // Agent 的长回复先收三行。用户自己说的话不收 —— 那是他刚打的，得看得全
        const long = m.role === "agent" && String(m.text || "").length > 56;
        const open = expanded.has(m.id);
        return `<div class="msg ${m.role}${long && !open ? " clamp" : ""}" data-mid="${m.id}"${long ? ` data-toggle="1" data-tip="${open ? "收起" : "展开全文"}"` : ""}>${esc(m.text)}${media}${dl}</div>`;
      })
      .join("") + liveThinking(d);
  el.querySelectorAll("[data-toggle]").forEach((n) => (n.onclick = (ev) => {
    // 卡片里的按钮、复选框、可预览的媒体各有各的事，不该顺带把卡片折起来；
    // 但「还有 N 步」本身就是个带 data-toggle 的按钮，它得放行
    if (ev.target.closest("button:not([data-toggle]), input, a, [data-preview]")) return;
    ev.stopPropagation();
    expanded.has(n.dataset.mid) ? expanded.delete(n.dataset.mid) : expanded.add(n.dataset.mid);
    renderThread(store.get());
  }));
  el.querySelectorAll("[data-locate]").forEach((b) => (b.onclick = () => locate(b.dataset.locate)));
  el.querySelectorAll("[data-undo-to]").forEach((b) => (b.onclick = () => report(dispatch("project.undo-to", { eventId: b.dataset.undoTo }))));
  el.querySelectorAll("[data-raw]").forEach((b) => (b.onclick = (ev) => { ev.stopPropagation(); raw.has(b.dataset.raw) ? raw.delete(b.dataset.raw) : raw.add(b.dataset.raw); renderThread(store.get()); }));
  el.querySelectorAll("[data-skip]").forEach((c) => (c.onclick = (ev) => {
    ev.stopPropagation();
    const k = c.dataset.skip;
    c.checked ? skipped.delete(k) : skipped.add(k);
    renderThread(store.get());
  }));
  el.querySelectorAll("[data-answer]").forEach((b) => (b.onclick = () => {
    const [mid, qi, ...rest] = b.dataset.answer.split(":");
    const label = rest.join(":");
    const m = store.get().agent.messages.find((x) => x.id === mid);
    if (!m) return;
    const answered = { ...(m.answered || {}), [qi]: label };
    // 本地先标上选中，避免等一个来回
    store.light((d) => { const mm = d.agent.messages.find((x) => x.id === mid); if (mm) mm.answered = answered; });
    renderThread(store.get());
    const all = (m.ask || []).map((a, i) => (answered[i] ? `${a.question} → ${answered[i]}` : null)).filter(Boolean);
    if (all.length !== (m.ask || []).length) return;
    // 选项自带下一步就直接执行。提问的那一方本来就知道每个答案对应什么动作，
    // 再绕一圈让规划器从一句「运镜照搬」里重新推一遍，推丢了用户就只收到一句空承诺。
    const nexts = (m.ask || []).map((a, i) => a.options.find((o) => o.label === answered[i])?.next).filter(Boolean);
    if (nexts.length === (m.ask || []).length) {
      const extra = $("agentInput").value.trim();
      if (extra) $("agentInput").value = "";
      nexts.forEach((n) => report(dispatch(n.action, extra ? { ...n.payload, hint: [n.payload?.hint, extra].filter(Boolean).join("；") } : n.payload)));
      return;
    }
    $("agentInput").value = all.join("；");
    sendAgent();
  }));
  el.querySelectorAll("[data-goshot]").forEach((b) => (b.onclick = (ev) => { ev.stopPropagation(); report(dispatch("shot.select", { id: b.dataset.goshot })); }));
  el.querySelectorAll("[data-confirm]").forEach((b) => (b.onclick = () => {
    const mid = b.dataset.confirm;
    const skip = [...skipped].filter((k) => k.startsWith(`${mid}:`)).map((k) => Number(k.split(":")[1]));
    skip.forEach((i) => skipped.delete(`${mid}:${i}`));
    report(dispatch("agent.confirm", skip.length ? { skip } : {}));
  }));
  el.querySelectorAll("[data-cancel]").forEach((b) => (b.onclick = () => report(dispatch("agent.cancel"))));
  el.querySelectorAll("[data-run-step]").forEach((b) => (b.onclick = () => {
    const [mid, i] = b.dataset.runStep.split(":");
    const m = store.get().agent.messages.find((x) => x.id === mid);
    const step = m?.plan?.steps.filter((s) => !s.quiet)[Number(i)];
    if (step) report(dispatch("agent.run-step", { step }));
  }));
  el.querySelectorAll("[data-dl]").forEach((b) => (b.onclick = () => {
    const m = store.get().agent.messages.find((x) => x.id === b.dataset.dl);
    if (m?.download) download(m.download.name, m.download.content, "text/plain");
  }));
  el.querySelectorAll("[data-preview]").forEach((n) => (n.onclick = () => showPreview(n.dataset.preview, n.dataset.kind)));
  if (stick) el.scrollTop = el.scrollHeight;
}

// suggestions follow what the project needs next — three at most
function renderChips(d) {
  // 按钮上写的和发给 Agent 的不是同一句话。发过去的得是规划器听得懂的整句
  // （带镜头 id、带供应商名）；按钮上只要四五个字，整句退到气泡里 ——
  // 「录制 shot_01」「提交 shot_01 视频生视频 seedance-2.5」这种东西不该出现在新手眼前。
  const chip = (label, say, tip) => ({ label, say, tip: tip || say });
  let list = [];
  // planner 给的下一步建议优先：它看得到刚做完什么、工程现在缺什么。
  // 没有（规则规划器、离线、或者模型没给）才回落到内置的进度推断。
  const fromPlanner = (d.agent?.suggest || []).filter((x) => typeof x === "string" && x.trim());
  const cur = d.project.currentShotId || d.shots[0]?.id;
  if (fromPlanner.length) list = fromPlanner.map((c) => chip(c.length > 9 ? `${c.slice(0, 8)}…` : c, c));
  else if (!d.shots.length) list = [chip("看个示例", "载入示例「城市边缘」", "载一个现成的场景进来，先看看它长什么样"), chip("加一镜", "新建镜头「对峙」6秒 手持")];
  else if (d.entities.some((e) => e.semanticType === "character") && !(d.assets || []).some((a) => a.approved)) list = [chip("给主角定妆", "给主角和产品各生成一张参考图", "出一张定妆照。批准一次，之后每一镜自动带上，人不会变样"), chip("录这一镜", `录制 ${cur}`, "把当前这一镜录成草片，不花钱"), chip("日落逆光", "换成日落逆光")];
  else if (!d.takes.length) list = [chip("录这一镜", `录制 ${cur}`, "把当前这一镜录成草片，不花钱"), chip("机位放低", "把 Program 机位降到 0.4m 并 look-at 主角"), chip("日落逆光", "换成日落逆光")];
  else if (!d.storyboard.length) list = [chip("进故事版", "全部进故事版"), chip("让对手举枪", "让对手举枪"), chip("03 镜环绕", "03 镜改成环绕 120 度")];
  else if (!d.jobs.length) list = [chip("出这一镜", `提交 ${cur} 视频生视频 seedance-2.5`, "交给模型出真画面，构图跟着草片走。这一步计费"), chip("看提示词", `给 ${cur} 生成提示词`)];
  else list = [chip("换件红外套", "主角外套换成红色再生成一次"), chip("两人拉开点", "把两个人拉开 1.5m 重新生成"), chip("日落逆光", "换成日落逆光")];
  $("chips").innerHTML = list.slice(0, 3).map((c) => `<button data-chip="${esc(c.say)}" data-tip="${esc(c.label)}" data-tip-sub="${esc(c.tip)}">${esc(c.label)}</button>`).join("");
  $("chips").querySelectorAll("[data-chip]").forEach((b) => (b.onclick = () => {
    $("agentInput").value = b.dataset.chip;
    sendAgent();
  }));
}

function locate(id) {
  const d = store.get();
  const kind = d.entities.some((e) => e.id === id) ? "entity" : d.cameras.some((c) => c.id === id) ? "camera" : d.lights.some((l) => l.id === id) ? "light" : d.shots.some((s) => s.id === id) ? "shot" : null;
  if (!kind) return toast(`找不到 ${id}`, true);
  if (kind === "shot") return dispatch("shot.select", { id });
  dispatch("project.select", { kind, id });
  if (d.project.viewMode === "free") setTimeout(focusSelected, 30);
}

// generation results: a toast when they land (the backend also posts them into the thread)
function watchJobs(d) {
  for (const j of d.jobs) {
    const prev = lastJobStatus.get(j.id);
    if (prev && prev !== j.status && (j.status === "done" || j.status === "failed")) {
      if (j.status === "done" && j.result?.url) toast(`${j.model} 生成完成`);
      else if (j.status === "done") toast(`${j.model}：模拟队列结束，没有输出`);
      else toast(`${j.model} 生成失败：${String(j.error || "").slice(0, 60)}`, true);
    }
    lastJobStatus.set(j.id, j.status);
  }
}

// ---------- preview overlay on the stage ----------
export function showPreview(url, kind = "video", title = "") {
  closePreview();
  const box = document.createElement("div");
  box.className = "preview";
  box.innerHTML = `<div class="box">${kind === "image" ? `<img src="${esc(mediaHref(url))}" />` : `<video src="${esc(mediaHref(url))}" controls autoplay loop playsinline></video>`}<div class="bar"><b>${esc(title || "预览")}</b><span class="spacer"></span><a href="${esc(mediaHref(url))}" target="_blank" rel="noopener"><button>新窗口打开</button></a><button data-close="1">关闭</button></div></div>`;
  box.onclick = (e) => {
    if (e.target === box || e.target.closest("[data-close]")) closePreview();
  };
  document.querySelector(".stage").appendChild(box);
}
function closePreview() {
  document.querySelector(".preview")?.remove();
}

// ---------- guide ----------
const GUIDE = [
  { h: "这是导演台", p: ["中间是画面。点物体、机位或灯就能选中，拖 Gizmo 移动；<kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> 切换移动 / 旋转 / 缩放，<kbd>P</kbd> 切到拍摄机视角。", "左侧栏默认收起：选中东西时自动打开属性，点「场景」看全部对象。"] },
  { h: "用一句话指挥", p: ["右边的输入框就是导演的话筒：「把 Program 机位降到 0.4m 并 look-at 主角」「03 镜改成环绕 120 度」「让对手举枪」。", "每一步都是一个 Action，可撤销；⚙ 里可以切换 GPT / DeepSeek，或改成先出方案再确认。"] },
  { h: "镜头与 Take", p: ["底部是镜头条。点镜头选中，<kbd>Space</kbd> 预演，「● 录制」录下草片代理视频作为 Take。", "有了 Take，「Take」「故事版」标签才会出现——需要时才补上。"] },
  { h: "生成与迭代", p: ["在「生成」里编译提示词、提交 Seedance / Seedream，结果会回到对话、生成表和故事版里，点开就能看。", "看完不满意，直接在对话框里说：「主角外套换成红色再生成一次」。"] },
];
function showGuide(i) {
  const g = $("guide");
  const step = GUIDE[i];
  g.hidden = false;
  g.innerHTML = `<div class="card"><div class="steps">${GUIDE.map((_, k) => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</div><h3>${step.h}</h3>${step.p.map((p) => `<p>${p}</p>`).join("")}<div class="actions"><button class="ghost" data-skip="1">${i < GUIDE.length - 1 ? "跳过" : ""}</button><span class="spacer"></span>${i > 0 ? `<button data-prev="1">上一步</button>` : ""}<button class="primary" data-next="1">${i < GUIDE.length - 1 ? "下一步" : "开始"}</button></div></div>`;
  g.querySelector("[data-next]").onclick = () => (i < GUIDE.length - 1 ? showGuide(i + 1) : hideGuide());
  g.querySelector("[data-prev]")?.addEventListener("click", () => showGuide(i - 1));
  g.querySelector("[data-skip]").onclick = hideGuide;
}
function hideGuide() {
  $("guide").hidden = true;
  try {
    localStorage.setItem(GUIDE_KEY, "1");
  } catch {}
}

// ---------- bottom drawer ----------
// 参照：随时能复刻一条。
//
// 放在剪辑区而不是只放在首屏，是因为复刻不是一次性的开场动作 —— 片子做到一半想换个运镜、
// 想照着另一条的打光重来一遍，都该是随手一贴。这里和首屏调的是同一个 Action，
// Agent 说"复刻这条链接"走的也是它，所以三个入口不会各自长歪。
// 上次选的复刻模式。不进工程状态：这是「这台机器上的这个人这次想干什么」，不是作品的一部分。
let refMode = "motion";

function renderRef(el, d) {
  const jobs = (d.jobs || []).filter((j) => ["replicate", "reference-fetch", "reference-read"].includes(j.kind)).slice().reverse();
  // 编译出来的计划是一份能读的中间产物：这一场到底是怎么建出来的，每一步为什么。
  // 以前这里是一段发给模型的散文，看不见也对不上；现在摆出来，翻错了一眼就能指出来。
  const plan = jobs.find((j) => j.kind === "replicate" && j.result?.steps?.length)?.result;
  const cur = d.project.reference;
  const a = cur?.analysis;
  const running = jobs.find((j) => ["queued", "running"].includes(j.status));

  el.innerHTML = `<div class="ref-pane">
    <div class="ref-in">
      <div class="ref-row">
        <input id="refUrl" type="url" placeholder="贴一条视频链接：抖音 / B站 / YouTube…" spellcheck="false" ${running ? "disabled" : ""}>
        <select id="refMode" title="复刻它的哪一部分" ${running ? "disabled" : ""}>${Object.entries(REPLICATE_MODES).map(([k, v]) => `<option value="${k}"${k === refMode ? " selected" : ""}>${esc(v.zh)}</option>`).join("")}<option value=""${refMode ? "" : " selected"}>先问我</option></select>
        <input id="refHint" type="text" placeholder="另外补充（可留空，例：主体换成一罐冷萃咖啡）" spellcheck="false" ${running ? "disabled" : ""}>
        <button id="refGo" class="primary" ${running ? "disabled" : ""}>复刻</button>
      </div>
      <div class="ref-drop" id="refDrop"><input type="file" id="refFile" accept="image/*,video/*" hidden><span>或把本地图片 / 视频拖到这里</span></div>
      ${running ? `<div class="ref-live">${(running.phases || []).map((ph) => `<div class="fr-step ${ph.state === "run" ? "run" : ph.state}"><span>${ph.state === "done" ? "✓" : ph.state === "run" ? "◠" : ph.state === "fail" ? "✗" : "·"}</span><b>${esc(ph.label)}</b><i>${esc(ph.note || (ph.state === "run" ? (running.progress || 0) + "%" : ""))}</i></div>`).join("") || `<div class="fr-step run"><span>◠</span><b>${esc(running.note || "处理中")}</b><i>${running.progress || 0}%</i></div>`}</div>` : ""}
    </div>

    ${a ? `<div class="ref-read">
      <div class="ref-head"><b>最近读到的参照</b><span>${esc(cur.model || "")} · ${cur.frames || 1} 帧${cur.from != null ? ` · ${cur.from}s–${cur.to ?? "末"}s` : ""}</span></div>
      <p class="ref-brief">${esc(a.brief || a.summary || "")}</p>
      <table class="grid ref-grid"><tbody>
        ${[["景别 / 视角", `${a.camera?.shotSize || "—"} · ${a.camera?.angle || "—"}`],
           ["机位高度 / 焦段", `${a.camera?.heightMeters ?? "—"} m · ${a.camera?.focalMm ?? "—"} mm · f/${a.camera?.aperture ?? "—"}`],
           ["构图", a.camera?.framing || "—"],
           ["光", `${a.lighting?.keyDirection || "—"} · ${a.lighting?.ratio || "—"} · ${a.lighting?.colorTemp || "—"}`],
           ["运镜", `${a.motion?.type || "—"}${a.motion?.description ? " · " + a.motion.description : ""}`],
           ["主体", (a.subjects || []).map((x) => x.displayName).join("、") || "—"],
           ["拍", (a.beats || []).map((b, i) => `${i + 1}) ${b.seconds}s ${b.text}`).join("　") || "—"]]
          .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}
      </tbody></table>
      <div class="ref-two">
        <div class="ref-path">
          <b>先走草片</b><span>在 3D 里把机位走位搭出来，和原片并排对齐，改到满意再花钱生成。慢一点，但运镜是你的，改哪一镜都只重做那一镜。</span>
          <div class="actions"><button id="refRebuild" class="primary">按这份参数建场</button>${d.shots.length ? `<button id="refCompare">和原片并排看</button>` : ""}</div>
        </div>
        <div class="ref-path">
          <b>直接照着原片生成</b><span>把原片整条当参考视频交给 Seedance，运动和构图跟它走，主体换成你已批准的参考图。快，也计费；运镜是原片的，想改就得回到草片那条路。</span>
          <div class="actions"><button id="refDirect" ${d.shots.length ? "" : "disabled title='先建场，才有镜头可生成'"}>用原片直接生成这一镜</button>${cur.ref ? `<button data-preview="${esc(cur.ref)}" data-kind="video">看原片</button>` : ""}</div>
        </div>
      </div>
    </div>` : `<div class="ref-empty">还没读过参照。贴一条链接，或者拖一个本地文件进来。</div>`}

    ${plan ? `<details class="ref-plan"><summary>这一场是怎么建出来的 · ${esc(plan.summary || "")}</summary>
      <ol>${plan.steps.map((st) => `<li><code>${esc(st.action)}</code><span>${esc(st.why || "")}</span></li>`).join("")}</ol>
      ${(plan.warnings || []).length ? `<div class="ref-warn">${plan.warnings.map((w) => `<div>⚠ ${esc(w)}</div>`).join("")}</div>` : ""}
      ${plan.refined ? `<div class="ref-warn"><div>${plan.refined.ok ? `按你的补充又调了 ${plan.refined.steps} 步` : `补充那句没调动：${esc(plan.refined.reply || "")}`}</div></div>` : ""}
    </details>` : ""}

    ${jobs.length ? `<table class="grid"><thead><tr><th>来源</th><th>阶段</th><th>结果</th><th></th></tr></thead><tbody>
      ${jobs.slice(0, 8).map((j) => `<tr class="row"><td title="${esc(j.prompt || "")}">${esc((j.inputs?.title || j.prompt || j.id).slice(0, 60))}</td><td>${badge(j.status)}${j.status === "running" ? ` ${j.progress || 0}%` : ""}</td><td>${esc(j.result?.shots ? j.result.shots + " 个镜头" : j.result?.url ? "素材已就位" : j.hint || j.error || j.note || "")}</td><td>${j.result?.ref || j.result?.url ? `<button data-preview="${esc(j.result.ref || j.result.url)}" data-kind="video">看</button>` : ""}</td></tr>`).join("")}
    </tbody></table>` : ""}
  </div>`;

  const urlIn = $("refUrl"), hintIn = $("refHint");
  $("refMode").onchange = (ev) => { refMode = ev.target.value; };
  const go = () => {
    const u = urlIn.value.trim();
    if (!u) return toast("先贴一条链接", true);
    report(dispatch("reference.replicate", { url: u, mode: refMode || undefined, hint: hintIn.value.trim() || undefined }));
  };
  $("refGo").onclick = go;
  urlIn.onkeydown = (ev) => { if (ev.key === "Enter") { ev.preventDefault(); go(); } };

  const drop = $("refDrop"), file = $("refFile");
  drop.onclick = () => file.click();
  file.onchange = () => file.files[0] && uploadRef(file.files[0], hintIn.value.trim(), refMode);
  drop.ondragover = (ev) => { ev.preventDefault(); drop.classList.add("over"); };
  drop.ondragleave = () => drop.classList.remove("over");
  drop.ondrop = (ev) => {
    ev.preventDefault();
    drop.classList.remove("over");
    const t = ev.dataTransfer?.getData("text/uri-list") || ev.dataTransfer?.getData("text/plain");
    const f = ev.dataTransfer?.files?.[0];
    if (f) return uploadRef(f, hintIn.value.trim(), refMode);
    if (t && /^https?:\/\//i.test(t.trim())) { urlIn.value = t.trim(); go(); }
  };

  const rb = $("refRebuild");
  if (rb) rb.onclick = () => report(dispatch("reference.replicate", { ref: cur.ref, from: cur.from ?? undefined, to: cur.to ?? undefined, mode: refMode || undefined, hint: hintIn.value.trim() || undefined }));
  const rc = $("refCompare");
  if (rc) rc.onclick = () => dispatch("project.set-view", { mode: "compare" });
  const rd = $("refDirect");
  if (rd) rd.onclick = () => report(dispatch("generation.submit", { mode: "v2v", provider: "seedance-2.5", reference: "origin" }));
}

async function uploadRef(f, hint, mode) {
  const kind = f.type.startsWith("video") ? "video" : f.type.startsWith("image") ? "image" : null;
  if (!kind) return toast("只认图片和视频", true);
  if (!client.base) return toast("要连上后端才能读参照", true);
  toast(`上传 ${f.name}…`);
  try {
    const r = await fetch(new URL(`upload?label=${kind}`, client.base), { method: "POST", headers: { "content-type": f.type }, body: f });
    const out = await r.json();
    if (!out.ok) throw new Error(out.error || "上传失败");
    report(dispatch("reference.replicate", { ref: out.url, mode: mode || undefined, hint: hint || undefined }));
  } catch (err) {
    toast(String(err.message || err), true);
  }
}


// 建场自检面板：录之前把「这一镜画面里有没有东西」摆在导演面前，并且每条都能当场改。
//
// 这一屏存在的理由很具体：实测 astra 规划的一条 10 分钟片子，66 镜全部录完、报 ok、
// 拼成 9.8 分钟，画面里大部分是墙 —— 因为一半机位没对准任何东西。白模「不花钱」，
// 所以没人会盯着看，空画面就这么一路绿灯走到生成端。
//
// 每条问题自带一个能直接执行的修法（跟反问选项自带 next 是同一套做法）：
// 提出问题的那一方本来就知道怎么修，不该让人再去菜单里找对应的 Action。
// 但要人拿主意的（这一镜到底拍谁、长镜头怎么拆拍）不自动执行 —— 那是导演的活。
let checkData = null;

export async function runCheck(opts = {}) {
  const r = await dispatch("film.check", { provider: opts.provider || "seedance-2.5" });
  checkData = r?.ok ? r : null;
  if (r?.ok) { ui.tab = "check"; ui.drawer = true; render(store.get()); }
  return r;
}

function renderCheck(el, d) {
  const c = checkData;
  if (!c) {
    el.innerHTML = emptyState("还没跑过检查。录草片之前会自动跑一次，也可以现在手动跑。", "现在检查");
    el.querySelector("[data-empty]").onclick = () => runCheck();
    return;
  }
  const byShot = {};
  for (const f of c.findings) (byShot[f.shotId || "__film"] ||= []).push(f);
  const icon = { error: "✗", warn: "!", info: "·" };
  const auto = c.findings.filter((f) => f.fix?.action && !f.fix.needsInput).length;

  el.innerHTML = `<div class="chk">
    <div class="chk-head">
      <b class="${c.errors ? "bad" : c.warnings ? "warn" : "ok"}">${esc(c.summary)}</b>
      <span>${c.shots} 镜 · ${c.errors} 个会拍空 · ${c.warnings} 处可疑 · ${c.infos} 条提示</span>
      <div class="actions">
        ${auto ? `<button id="chkAll" class="primary">一键修 ${auto} 条</button>` : ""}
        <button id="chkRe">重新检查</button>
        ${c.blocking ? `<button id="chkSkip" class="danger">不管，直接录</button>` : ""}
      </div>
    </div>
    <div class="chk-run" id="chkRun" hidden></div>
    ${Object.entries(byShot).map(([sid, list]) => {
      const sh = d.shots.find((x) => x.id === sid);
      return `<div class="chk-group">
        <div class="chk-shot">${sh ? `<b>${esc(sh.index)} ${esc(sh.title)}</b><span>${((sh.range.outFrame - sh.range.inFrame) / d.project.fps).toFixed(1)}s · ${esc(sh.motion?.type || "static")} · ${Math.round(sh.lens?.focalLength || 0)}mm</span>` : "<b>全片</b>"}${sh ? `<button data-goshot="${esc(sid)}">去这一镜</button>` : ""}</div>
        ${list.map((f, i) => `<div class="chk-item ${esc(f.level)}">
          <span class="chk-i">${icon[f.level]}</span>
          <div class="chk-body">
            <b>${esc(f.title)}</b>
            <i>${esc(f.why)}</i>
            ${f.fix ? `<div class="chk-fix">${f.fix.needsInput
              ? `<em>要你拿主意：${esc(f.fix.label || "")}</em>${sh ? `<button data-goshot="${esc(sid)}">去改</button>` : ""}`
              : `<button data-fix="${esc(sid)}:${i}">${esc(f.fix.label || "修")}</button><code>${esc(f.fix.action)}</code>`}</div>` : ""}
          </div>
        </div>`).join("")}
      </div>`;
    }).join("")}
  </div>`;

  const box = $("chkRun");
  const say = (t, cls = "") => { if (box) { box.hidden = false; box.className = `chk-run ${cls}`; box.textContent = t; } };

  el.querySelectorAll("[data-fix]").forEach((b) => (b.onclick = async () => {
    const [sid, i] = b.dataset.fix.split(":");
    const f = byShot[sid][Number(i)];
    b.disabled = true;
    const r = await dispatch(f.fix.action, f.fix.payload || {});
    if (r?.ok) { say(`改好了：${f.fix.label || f.fix.action}`, "ok"); await runCheck(); }
    else { b.disabled = false; say(`没改成：${r?.hint || r?.error || "?"}`, "fail"); }
  }));

  const all = $("chkAll");
  if (all) all.onclick = async () => {
    all.disabled = true;
    const { applyFixes } = await import("./film.js");
    const r = await applyFixes({ findings: c.findings, onProgress: (p) => say(`${p.index}/${p.total} ${p.label}`) });
    say(`修了 ${r.applied}/${r.of} 条${r.manual.length ? `；还有 ${r.manual.length} 条要你自己拿主意` : ""}`, r.applied ? "ok" : "fail");
    await runCheck();
  };
  const re = $("chkRe");
  if (re) re.onclick = () => runCheck();
  const skip = $("chkSkip");
  if (skip) skip.onclick = async () => {
    if (!confirm(`${c.errors} 个镜头会拍出空画面或拍错主体。确定直接录？`)) return;
    const { runBlockout } = await import("./film.js");
    say("开始录草片（跳过检查）…");
    const r = await runBlockout({ check: false, onProgress: (p) => p.phase === "record" && say(`录草片 ${p.index}/${p.total} · ${p.title}`) });
    say(r.ok ? `录完 ${r.recorded}/${r.of} 镜` : `录制失败：${r.hint || r.error}`, r.ok ? "ok" : "fail");
  };
}

function renderBottom(d) {
  const el = $("bottomBody");
  const tab = ui.tab || "shots";
  if (tab === "shots") return renderShots(el, d);
  if (tab === "timeline") return renderTimeline(el, d);
  if (tab === "takes") return renderTakes(el, d);
  if (tab === "board") return renderBoard(el, d);
  if (tab === "ref") return renderRef(el, d);
  if (tab === "check") return renderCheck(el, d);
  if (tab === "gen") return renderGen(el, d);
  if (tab === "film") return renderFilm(el, d);
  if (tab === "log") return renderEvents(el, d);
  return renderHealth(el, d);
}
const badge = (s) => `<span class="badge ${esc(s)}">${esc(s)}</span>`;
const emptyState = (text, btn) => `<div class="empty">${esc(text)}${btn ? `<button data-empty="1">${esc(btn)}</button>` : ""}</div>`;

function renderShots(el, d) {
  if (!d.shots.length) {
    el.innerHTML = emptyState("还没有镜头。", "+ 新建镜头");
    el.querySelector("[data-empty]").onclick = () => $("newShotBtn").click();
    return;
  }
  el.innerHTML = `<table class="grid"><thead><tr><th>镜号</th><th>标题</th><th>镜头</th><th>运动</th><th>时长</th><th>机位</th><th>Take</th><th>状态</th><th></th></tr></thead><tbody>
    ${d.shots.map((s) => `<tr class="row ${s.id === d.project.currentShotId ? "sel" : ""}" data-shot="${s.id}">
      <td><span class="idx">${esc(s.index)}</span></td><td>${esc(s.title)}</td>
      <td class="mono">${Math.round(s.lens.focalLength)} mm</td><td>${esc(MOTION_TYPES[s.motion.type]?.zh || s.motion.type)}</td>
      <td class="mono">${((s.range.outFrame - s.range.inFrame) / d.project.fps).toFixed(1)} s</td>
      <td class="mono">${esc(d.cameras.find((c) => c.id === s.cameraId)?.name || s.cameraId)}</td>
      <td class="mono">${s.takes.length}</td><td>${badge(s.status)}</td>
      <td><div class="actions"><button data-prev="${s.id}">预演</button><button data-rec="${s.id}">录制</button><button data-up="${s.id}">↑</button><button data-down="${s.id}">↓</button></div></td></tr>`).join("")}
    </tbody></table>
    <div class="tl-buttons" style="margin-top:10px"><button id="playSeq">▶ 顺播全部</button><button id="boardAll">全部进故事版</button><button id="promptAll">全部编译提示词</button><button id="exportBoard">导出故事版 HTML</button><button id="exportBoardMd">导出 Markdown</button></div>`;
  el.querySelectorAll("tr[data-shot]").forEach((tr) => (tr.onclick = (ev) => {
    if (ev.target.closest("button")) return;
    dispatch("shot.select", { id: tr.dataset.shot });
  }));
  el.querySelectorAll("[data-prev]").forEach((b) => (b.onclick = () => dispatch("shot.preview", { id: b.dataset.prev })));
  el.querySelectorAll("[data-rec]").forEach((b) => (b.onclick = async () => {
    await dispatch("shot.select", { id: b.dataset.rec });
    recordCurrent();
  }));
  el.querySelectorAll("[data-up]").forEach((b) => (b.onclick = () => dispatch("shot.reorder", { id: b.dataset.up, position: Math.max(0, d.shots.findIndex((s) => s.id === b.dataset.up) - 1) })));
  el.querySelectorAll("[data-down]").forEach((b) => (b.onclick = () => dispatch("shot.reorder", { id: b.dataset.down, position: d.shots.findIndex((s) => s.id === b.dataset.down) + 1 })));
  $("playSeq").onclick = () => dispatch("timeline.play", { sequence: true });
  $("boardAll").onclick = async () => {
    for (const s of d.shots) await addToBoard(s.id);
  };
  $("promptAll").onclick = () => d.shots.forEach((s) => dispatch("generation.prompt", { shotId: s.id }));
  $("exportBoard").onclick = async () => {
    const r = await dispatch("storyboard.export", { format: "html" });
    if (r.ok) download("storyboard.html", r.content, "text/html");
  };
  $("exportBoardMd").onclick = async () => {
    const r = await dispatch("storyboard.export", { format: "md" });
    if (r.ok) download("storyboard.md", r.content, "text/markdown");
  };
}

function renderTimeline(el, d) {
  const shot = d.shots.find((s) => s.id === d.project.currentShotId);
  if (!shot) {
    el.innerHTML = emptyState("选一个镜头。");
    return;
  }
  const fps = d.project.fps;
  const len = Math.max(1, shot.range.outFrame - shot.range.inFrame);
  const pct = (f) => `${((f - shot.range.inFrame) / len) * 100}%`;
  const head = localPlayhead(d, shot);
  // 刻度按时长自适应：90 秒的镜头画 90 条秒线只会糊成一片。目标是最多十来个标签。
  const secs = len / fps;
  const step = [1, 2, 5, 10, 15, 30, 60].find((x) => secs / x <= 12) || 120;
  const ticks = [];
  for (let t = 0; t <= secs + 1e-6; t += step) {
    const f = shot.range.inFrame + t * fps;
    if (f > shot.range.outFrame + 1e-6) break;
    ticks.push(`<div class="tick" style="left:${pct(f)}">${t >= 60 ? `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")}` : `${Math.round(t)}s`}</div>`);
  }
  const keys = (shot.keyframes || []).map((k) => `<div class="key" style="left:${pct(k.frame)}" title="f${k.frame} · ${k.focalLength}mm" data-kf="${k.frame}"></div>`).join("");
  const at = (f) => `left:calc(var(--tl-lbl) + (100% - var(--tl-lbl) - 16px) * ${(f - shot.range.inFrame) / len})`;
  const sub = (name, id, marks) => `<div class="tl-track sub"><span class="lbl" title="${esc(name)}">${esc(name)}</span>${marks.map((m) => `<div class="key" style="${at(m.frame)}" title="${esc(id)} f${m.frame}${m.extra || ""}"></div>`).join("")}</div>`;
  const entKeys = d.entities.filter((e) => e.path?.length).map((e) => sub(e.displayName || e.id, e.id, e.path)).join("");
  const lightKeys = d.lights.filter((l) => l.keyframes?.length).map((l) => sub(l.name || l.id, l.id, l.keyframes.map((k) => ({ frame: k.frame, extra: ` ${k.intensity}` })))).join("");
  const subCount = d.entities.filter((e) => e.path?.length).length + d.lights.filter((l) => l.keyframes?.length).length;
  const layout = d.shots.map((s, i, arr) => ({ s, start: arr.slice(0, i).reduce((a, x) => a + x.range.outFrame - x.range.inFrame, 0), len: s.range.outFrame - s.range.inFrame }));
  const total = layout.reduce((a, x) => a + x.len, 0) || 1;
  const pad = d.scene.pads?.find((p) => p.id === shotPad(d, shot));

  // 整条的标尺：Sequence 轨和原片轨都按整条时长排，标尺上有整条播放头
  const totalSecs = total / fps;
  const seqStep = [1, 2, 5, 10, 15, 30, 60].find((x) => totalSecs / x <= 14) || 120;
  const seqTicks = [];
  for (let t = 0; t <= totalSecs + 1e-6; t += seqStep) seqTicks.push(`<div class="tick" style="left:calc(var(--tl-lbl) + (100% - var(--tl-lbl) - 16px) * ${(t * fps) / total})">${t >= 60 ? `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")}` : `${Math.round(t)}s`}</div>`);
  const globalHead = d.project.playSequence ? d.project.playhead : (layout.find((x) => x.s.id === shot.id)?.start || 0) + (head - shot.range.inFrame);
  const seqRuler = `<div class="tl-ruler seq"><span class="lbl">整条</span>${seqTicks.join("")}<div class="head" style="left:calc(var(--tl-lbl) + (100% - var(--tl-lbl) - 16px) * ${Math.min(1, globalHead / total)})"></div></div>`;
  // 原片切镜：读取器切出来的场景段，按原片时间摆到同一条标尺上。点一段跳到对应的镜头。
  const refScenes = (d.project.reference?.analysis?.scenes || []).filter((sg) => Number.isFinite(Number(sg.from)) && Number.isFinite(Number(sg.to)) && sg.to > sg.from);
  const refEnd = refScenes.length ? Math.max(...refScenes.map((sg) => Number(sg.to))) : 0;
  const refTrack = refScenes.length ? `<div class="tl-track tl-ref"><span class="lbl" data-tip="原片切镜" data-tip-sub="读参照时切出来的 ${refScenes.length} 段，按原片时间摆。点一段跳到对应的镜头">原片</span>${refScenes.map((sg, i) => {
    const padHit = d.scene.pads?.find((p) => p.from === Number(sg.from)) || d.scene.pads?.[i];
    const target = padHit ? d.shots.find((x) => shotPad(d, x) === padHit.id) : d.shots[i];
    return `<div class="seg-ref${target?.id === shot.id ? " cur" : ""}" data-refseg="${esc(target?.id || "")}" style="left:calc(var(--tl-lbl) + (100% - var(--tl-lbl) - 16px) * ${Number(sg.from) / refEnd});width:calc((100% - var(--tl-lbl) - 16px) * ${(Number(sg.to) - Number(sg.from)) / refEnd})" data-tip="${esc(`${i + 1} ${sg.name || ""}`)}" data-tip-sub="${esc(`原片 ${sg.from}s–${sg.to}s · ${(sg.camera?.shotSize || "")} ${sg.camera?.focalMm ? sg.camera.focalMm + "mm" : ""} ${sg.motion?.type || ""}${target ? ` → 镜头 ${target.index}` : ""}`)}">${i + 1} ${esc(sg.name || "")}</div>`;
  }).join("")}</div>` : "";

  // 这一镜手里的素材：故事版关键帧、选中的 Take、主体的定妆照。每一样都能拖到别的镜头段上。
  const card = d.storyboard.find((c) => c.shotId === shot.id);
  const takes = d.takes.filter((t) => t.shotId === shot.id && t.videoUrl);
  const refs = referencesForShot(d, shot, 6);
  const chips = [
    ...(card?.keyframes || []).slice(0, 2).map((u) => `<span class="tl-chip" ${dragAttr({ kind: "keyframe", url: u })} data-tip="关键帧" data-tip-sub="拖到别的镜头段上，当那一镜的首帧"><img src="${esc(u)}" alt="" /><i>首帧</i></span>`),
    ...takes.slice(-2).map((t) => `<span class="tl-chip" ${dragAttr({ kind: "take", id: t.id, shotId: shot.id })} data-tip="${esc(t.name)}" data-tip-sub="草片 Take。拖到别的镜头段上，当那一镜的草片"><video src="${esc(mediaHref(t.videoUrl))}" muted playsinline poster="${t.thumbnail || ""}"></video><i>${esc(t.name)}</i></span>`),
    ...refs.map((r) => `<span class="tl-chip ok" ${dragAttr({ kind: "asset", id: r.assetId, entityId: r.entityId, url: r.url })} data-tip="${esc(r.name)} 的定妆照" data-tip-sub="拖到别的镜头段上，那一镜生成时也带上它"><img src="${esc(mediaHref(r.url))}" alt="" /><i>${esc(r.name)}</i></span>`),
  ];

  el.innerHTML = `<div class="timeline">
    <div class="tl-side">
      <div><b>${esc(shot.index)} ${esc(shot.title)}</b>${pad ? `<div class="tl-pad">台 ${pad.index} · ${esc(pad.name)}</div>` : ""}</div>
      <div class="tcs">${timecode(head, fps)} / ${timecode(shot.range.outFrame, fps)}${d.project.playSequence ? `<span class="seqtc"> · 整条 ${timecode(d.project.playhead, fps)}</span>` : ""}</div>
      <div class="tl-buttons"><button data-tl="in">⇤</button><button data-tl="prev">◀</button><button data-tl="play">${d.project.playing ? "❚❚" : "▶"}</button><button data-tl="next">▶|</button><button data-tl="out">⇥</button><button data-tl="loop" class="${d.project.loop ? "on" : ""}">⟳</button></div>
      <div class="tl-buttons"><button data-tl="key">+ 机位关键帧</button><button data-tl="clear">清除关键帧</button></div>
      <div class="tl-buttons"><button data-tl="split" data-tip="在播放头切开" data-tip-sub="前半段还是这一镜，后半段成一个新镜头，机位和运镜照旧">✂ 切开</button><button data-tl="del" data-tip="删这一镜" data-tip-sub="连同它的 Take 和故事版卡">删除</button><button data-tl="save" data-tip="保存工程" data-tip-sub="${isOnline() ? "连着后端时每一步都已经落盘，这里再打一次时间点" : "单机模式：写进这台浏览器"}">保存</button></div>
      <div class="tl-buttons"><button data-tl="seq">顺播全部</button><button data-tl="rec">● 录制 Take</button></div>
    </div>
    <div class="tl-main">
      <div class="tl-ruler">${ticks.join("")}<div class="head" style="left:${pct(head)}"></div></div>
      <input class="tl-scrub" type="range" min="${shot.range.inFrame}" max="${shot.range.outFrame}" step="1" value="${head}" />
      <div class="tl-track"><span class="lbl">Camera</span><span>${esc(d.cameras.find((c) => c.id === shot.cameraId)?.name || "")} · ${(shot.keyframes || []).length ? `${shot.keyframes.length} 关键帧` : esc(MOTION_TYPES[shot.motion.type]?.zh || "")}</span>${keys}</div>
      <div class="tl-track"><span class="lbl">Lens</span><span>${Math.round(shot.lens.focalLength)} mm · f/${shot.lens.aperture}</span></div>
      ${subCount ? `<div class="tl-subs" style="--n:${Math.min(subCount, 4)}">${entKeys}${lightKeys}</div>` : ""}
      <div class="tl-track tl-assets"><span class="lbl">素材</span>${chips.length ? chips.join("") : `<span class="dim">还没有素材：录一条 Take、或在角色库给主体定妆，就会出现在这里，能拖到任何一段上</span>`}</div>
      ${seqRuler}${refTrack}
      <div class="tl-track tl-seq" data-seqtrack="1"><span class="lbl">Sequence</span>${layout.map((x) => `<div class="seg-shot ${x.s.id === shot.id ? "cur" : ""}" data-seg="${x.s.id}" ${dragAttr({ kind: "shot", id: x.s.id })} style="left:calc(var(--tl-lbl) + (100% - var(--tl-lbl) - 16px) * ${x.start / total});width:calc((100% - var(--tl-lbl) - 16px) * ${x.len / total})" data-tip="${esc(x.s.index + " " + x.s.title)}" data-tip-sub="${(x.len / fps).toFixed(1)}s · 拖动换顺序 · 拖右边缘改时长 · 把素材拖上来"><span class="seg-txt">${esc(x.s.index)} ${esc(x.s.title)}</span><i class="trim" data-trim="${x.s.id}"></i></div>`).join("")}</div>
    </div></div>`;
  const scrub = el.querySelector(".tl-scrub");
  scrub.oninput = () => dispatch("timeline.seek", { frame: Number(scrub.value) }, { silent: true });
  el.querySelectorAll("[data-kf]").forEach((k) => (k.onclick = (ev) => (ev.shiftKey ? dispatch("motion.delete-keyframe", { shotId: shot.id, frame: Number(k.dataset.kf) }) : dispatch("timeline.seek", { frame: Number(k.dataset.kf) }))));
  el.querySelectorAll("[data-seg]").forEach((s) => (s.onclick = (ev) => { if (!ev.target.closest(".trim")) dispatch("shot.select", { id: s.dataset.seg }); }));
  el.querySelectorAll("[data-refseg]").forEach((s) => (s.onclick = () => s.dataset.refseg && dispatch("shot.select", { id: s.dataset.refseg })));
  const act = {
    in: () => dispatch("timeline.seek", { frame: shot.range.inFrame }),
    out: () => dispatch("timeline.seek", { frame: shot.range.outFrame }),
    prev: () => dispatch("timeline.seek", { frame: Math.max(shot.range.inFrame, head - 1) }),
    next: () => dispatch("timeline.seek", { frame: Math.min(shot.range.outFrame, head + 1) }),
    play: togglePlay,
    loop: () => store.patch((x) => (x.project.loop = !x.project.loop)),
    key: () => report(dispatch("motion.keyframe", { shotId: shot.id })),
    clear: () => dispatch("motion.clear-keyframes", { shotId: shot.id }),
    split: async () => { const r = await report(dispatch("shot.split", { id: shot.id })); if (r?.ok) toast(`在 ${r.atSeconds}s 切开了，后半段是新的一镜`); },
    del: () => { if (confirm(`删掉 ${shot.index} ${shot.title}？连同它的 Take 和故事版卡。`)) report(dispatch("shot.delete", { id: shot.id })); },
    save: () => toast(saveNow() ? (isOnline() ? "已保存（后端工程文件）" : "已保存到本机") : "保存失败", false),
    seq: () => dispatch("timeline.play", { sequence: true }),
    rec: recordCurrent,
  };
  el.querySelectorAll("[data-tl]").forEach((b) => (b.onclick = act[b.dataset.tl]));
  bindSequenceEditing(el, d, layout, total);
}

// 时间线里的剪辑：镜头段拖着换顺序、拖右边缘改时长、把素材拖到段上。
// 每一下都是一个 Action（shot.reorder / shot.update / storyboard.add / asset.approve），
// 所以能撤销、进事件日志，Agent 也能做同样的事。
function bindSequenceEditing(el, d, layout, total) {
  const track = el.querySelector("[data-seqtrack]");
  if (!track) return;
  const fps = d.project.fps;
  const segs = [...track.querySelectorAll("[data-seg]")];

  // 落点：镜头段
  for (const seg of segs) {
    seg.addEventListener("dragover", (ev) => { if (!dragItem) return; ev.preventDefault(); ev.dataTransfer.dropEffect = dragItem.kind === "shot" ? "move" : "copy"; seg.classList.add("over"); });
    seg.addEventListener("dragleave", () => seg.classList.remove("over"));
    seg.addEventListener("drop", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      seg.classList.remove("over");
      let item = dragItem;
      if (!item) { try { item = JSON.parse(ev.dataTransfer.getData("application/x-director") || "null"); } catch {} }
      if (!item) return;
      const targetId = seg.dataset.seg;
      const target = store.get().shots.find((s) => s.id === targetId);
      if (!target) return;
      if (item.kind === "shot") {
        if (item.id === targetId) return;
        const rect = seg.getBoundingClientRect();
        const after = ev.clientX > rect.left + rect.width / 2;
        const list = store.get().shots;
        const from = list.findIndex((s) => s.id === item.id);
        let pos = list.findIndex((s) => s.id === targetId) + (after ? 1 : 0);
        if (from < pos) pos -= 1;
        return report(dispatch("shot.reorder", { id: item.id, position: pos }));
      }
      if (item.kind === "asset") {
        const a = (store.get().assets || []).find((x) => x.id === item.id);
        if (!a) return;
        if (!a.approved) await report(dispatch("asset.approve", { id: a.id, approved: true }));
        const ids = [...new Set([...(target.targetIds || []), a.entityId].filter(Boolean))];
        await report(dispatch("shot.update", { id: targetId, targetIds: ids }));
        return toast(`${target.index} 生成时会带上这张定妆照`);
      }
      if (item.kind === "take") {
        const r = await report(dispatch("storyboard.add", { shotId: targetId, takeId: item.id }));
        if (r?.ok) toast(`这条 Take 现在是 ${target.index} 的草片`);
        return;
      }
      if (item.kind === "keyframe" && item.url) {
        const r = await report(dispatch("storyboard.add", { shotId: targetId, keyframes: [item.url] }));
        if (r?.ok) toast(`${target.index} 的首帧换成了这张`);
      }
    });
  }
  // 拖到轨道空白处 = 挪到最后
  track.addEventListener("dragover", (ev) => { if (dragItem?.kind === "shot") { ev.preventDefault(); ev.dataTransfer.dropEffect = "move"; } });
  track.addEventListener("drop", (ev) => {
    if (dragItem?.kind !== "shot" || ev.target.closest("[data-seg]")) return;
    ev.preventDefault();
    report(dispatch("shot.reorder", { id: dragItem.id, position: store.get().shots.length }));
  });

  // 右边缘：拖着改时长。总长度随之变，所以按拖动开始时的「每像素多少秒」算。
  for (const h of track.querySelectorAll("[data-trim]")) {
    h.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const id = h.dataset.trim;
      const seg = h.parentElement;
      const lbl = seg.querySelector(".seg-txt");
      const shot = store.get().shots.find((s) => s.id === id);
      if (!shot) return;
      const lblW = parseFloat(getComputedStyle(track).getPropertyValue("--tl-lbl")) || 104;
      const trackPx = Math.max(1, track.clientWidth - lblW - 16);
      const spp = total / fps / trackPx; // 秒 / 像素
      const startSecs = (shot.range.outFrame - shot.range.inFrame) / fps;
      const x0 = ev.clientX;
      let secs = startSecs;
      const w0 = seg.getBoundingClientRect().width;
      seg.classList.add("trimming");
      seg.draggable = false;
      const move = (e) => {
        secs = Math.max(0.5, Math.round((startSecs + (e.clientX - x0) * spp) * 10) / 10);
        seg.style.width = `${Math.max(24, w0 + (e.clientX - x0))}px`;
        lbl.textContent = `${shot.index} ${shot.title} · ${secs.toFixed(1)}s`;
      };
      const up = async () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        seg.classList.remove("trimming");
        if (Math.abs(secs - startSecs) >= 0.05) await report(dispatch("shot.update", { id, duration: secs }));
        else renderBottom(store.get());
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });
  }
}

function renderTakes(el, d) {
  if (!d.takes.length) {
    el.innerHTML = emptyState("还没有 Take。", "● 录制当前镜头");
    el.querySelector("[data-empty]").onclick = recordCurrent;
    return;
  }
  el.innerHTML = `<table class="grid"><thead><tr><th></th><th>Take</th><th>镜头</th><th>帧</th><th>状态</th><th></th></tr></thead><tbody>
    ${[...d.takes].reverse().map((t) => {
      const s = d.shots.find((x) => x.id === t.shotId);
      return `<tr class="row ${s?.id === d.project.currentShotId ? "sel" : ""}" data-take="${t.id}" ${t.videoUrl ? dragAttr({ kind: "take", id: t.id, shotId: t.shotId }) : ""}>
        <td>${t.videoUrl ? `<video class="thumb clickable" data-preview="${esc(t.videoUrl)}" data-kind="video" src="${esc(mediaHref(t.videoUrl))}" muted loop playsinline poster="${t.thumbnail || ""}" onmouseenter="this.play()" onmouseleave="this.pause()"></video>` : t.thumbnail ? `<img class="thumb" src="${t.thumbnail}" />` : `<div class="thumb"></div>`}</td>
        <td><b>${esc(t.name)}</b></td>
        <td class="mono">${esc(s ? `${s.index} ${s.title}` : t.shotId)}</td>
        <td class="mono">${t.capturedFrames ?? t.frames}${t.status === "recording" ? " · 录制中" : ""}</td>
        <td>${badge(t.status)}</td>
        <td><div class="actions"><button data-circle="${t.id}">Circle</button><button data-reject="${t.id}">Reject</button><button data-board="${t.shotId}">进故事版</button><button data-restore="${t.id}" title="把机位 / 物体 / 灯光恢复到这个 Take">恢复快照</button></div></td></tr>`;
    }).join("")}</tbody></table>`;
  el.querySelectorAll("[data-circle]").forEach((b) => (b.onclick = () => dispatch("take.review", { id: b.dataset.circle, status: "circle" })));
  el.querySelectorAll("[data-reject]").forEach((b) => (b.onclick = () => dispatch("take.review", { id: b.dataset.reject, status: "reject" })));
  el.querySelectorAll("[data-board]").forEach((b) => (b.onclick = () => addToBoard(b.dataset.board)));
  el.querySelectorAll("[data-restore]").forEach((b) => (b.onclick = () => restoreTake(b.dataset.restore)));
  el.querySelectorAll("[data-preview]").forEach((n) => (n.onclick = () => showPreview(n.dataset.preview, n.dataset.kind, "Take")));
  el.querySelectorAll("tr[data-take]").forEach((tr) => (tr.onclick = (ev) => {
    if (ev.target.closest("button,a,video")) return;
    const t = d.takes.find((x) => x.id === tr.dataset.take);
    if (t) dispatch("shot.select", { id: t.shotId });
  }));
}

async function restoreTake(id) {
  const t = store.get().takes.find((x) => x.id === id);
  if (!t || !confirm(`恢复到「${t.name}」的快照？（可撤销）`)) return;
  const snap = t.snapshot;
  const meta = { source: "human", actorId: "review" };
  for (const c of snap.cameras) {
    await dispatch("camera.transform", { id: c.id, position: c.pose.position, rotation: c.pose.rotation }, meta);
    await dispatch("camera.lens", { id: c.id, focalLength: c.lens.focalLength, aperture: c.lens.aperture }, meta);
    if (c.target) await dispatch("camera.look-at", { id: c.id, target: c.target }, meta);
  }
  for (const e of snap.entities) {
    await dispatch("entity.transform", { id: e.id, position: e.transform.position, rotation: e.transform.rotation, scale: e.transform.scale }, meta);
    if (e.joints) await dispatch("entity.pose", { id: e.id, joints: e.joints }, meta);
  }
  for (const l of snap.lights) await dispatch("light.update", { id: l.id, color: l.color, intensity: l.intensity, enabled: l.enabled, position: l.position }, meta);
  toast(`已恢复到 ${t.name}`);
}

function renderBoard(el, d) {
  if (!d.storyboard.length) {
    el.innerHTML = emptyState("故事版是空的。", "全部镜头进故事版");
    el.querySelector("[data-empty]").onclick = async () => {
      for (const s of d.shots) await addToBoard(s.id);
    };
    return;
  }
  const cards = d.shots.map((s) => d.storyboard.find((c) => c.shotId === s.id)).filter(Boolean);
  el.innerHTML = `<div class="cards">${cards.map((c) => {
    const s = d.shots.find((x) => x.id === c.shotId);
    const take = d.takes.find((t) => t.id === c.selectedTake);
    const gen = [...d.jobs].reverse().find((j) => j.shotId === c.shotId && j.status === "done" && j.result?.url);
    const running = d.jobs.filter((j) => j.shotId === c.shotId && ["queued", "running"].includes(j.status));
    const hero = gen ? (gen.result.kind === "image" ? `<img class="kf" data-preview="${esc(gen.result.url)}" data-kind="image" src="${esc(mediaHref(gen.result.url))}" title="生成结果 · ${esc(gen.model)}" />` : `<video class="kf" data-preview="${esc(gen.result.url)}" data-kind="video" src="${esc(mediaHref(gen.result.url))}" muted loop playsinline onmouseenter="this.play()" onmouseleave="this.pause()" title="生成结果 · ${esc(gen.model)}"></video>`) : take?.videoUrl ? `<video class="kf" data-preview="${esc(take.videoUrl)}" data-kind="video" src="${esc(mediaHref(take.videoUrl))}" muted loop playsinline poster="${c.keyframes?.[0] || ""}" onmouseenter="this.play()" onmouseleave="this.pause()" title="草片 Take"></video>` : c.keyframes?.[0] ? `<img class="kf" src="${c.keyframes[0]}" />` : `<div class="kf"></div>`;
    const drag = take?.videoUrl ? dragAttr({ kind: "take", id: take.id, shotId: c.shotId }) : c.keyframes?.[0] ? dragAttr({ kind: "keyframe", url: c.keyframes[0] }) : "";
    return `<article class="card ${s?.id === d.project.currentShotId ? "sel" : ""}" data-card="${c.id}" ${drag}>
      <h3><span><span class="idx mono" style="color:var(--accent)">${esc(s?.index)}</span> ${esc(s?.title)}</span>${gen ? badge("generated") : badge(c.status)}</h3>
      ${hero}
      ${running.length ? `<div class="progress"><span style="width:${running[0].progress}%"></span></div>` : ""}
      <textarea data-desc="${c.id}" placeholder="动作说明">${esc(c.actionDescription || "")}</textarea>
      <div class="row"><button data-open="${c.shotId}">镜头</button><button data-gen="${c.shotId}">生成</button><button data-kf="${c.shotId}">重拍关键帧</button><button data-approve="${c.id}" class="${c.status === "approved" ? "on" : ""}">Approve</button></div>
    </article>`;
  }).join("")}</div>`;
  el.querySelectorAll("[data-desc]").forEach((t) => (t.onchange = () => dispatch("storyboard.update", { id: t.dataset.desc, actionDescription: t.value })));
  el.querySelectorAll("[data-kf]").forEach((b) => (b.onclick = () => addToBoard(b.dataset.kf)));
  el.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => dispatch("shot.select", { id: b.dataset.open })));
  el.querySelectorAll("[data-gen]").forEach((b) => (b.onclick = async () => {
    await dispatch("shot.select", { id: b.dataset.gen });
    openDrawer("gen");
  }));
  el.querySelectorAll("[data-approve]").forEach((b) => (b.onclick = () => dispatch("storyboard.update", { id: b.dataset.approve, status: "approved" })));
  el.querySelectorAll("[data-preview]").forEach((n) => (n.onclick = () => showPreview(n.dataset.preview, n.dataset.kind, n.title)));
}

const openChain = new Set();

// 「查看生成过程」：长镜头是被拆开跑的，拆成几段、每段演什么、哪一段失败了、
// 尾帧是怎么交接的 —— 这些不摊开，用户只会看到一条黑箱进度条。
function chainView(j) {
  const parts = j.parts || [];
  const rows = parts.map((p) => {
    const state = p.status === "done" ? "done" : p.status === "failed" ? "fail" : p.status === "running" ? "run" : "wait";
    const mark = { done: "✓", fail: "✗", run: "◠", wait: "·" }[state];
    return `<div class="cv-seg ${state}">
      <span class="cv-mark">${mark}</span>
      <span class="cv-t">${p.from != null ? `${p.from}–${p.to}s` : `${(p.seconds || 0).toFixed(1)}s`}</span>
      <span class="cv-beat">${esc(p.beat || "（沿用整镜描述）")}</span>
      <span class="cv-meta">${p.attempt > 1 ? `第 ${p.attempt} 次 · ` : ""}${p.seamSoft ? "首帧被拦→文生 · " : ""}${p.failure && p.status === "failed" ? `${p.failure} · ` : ""}${p.url ? "已出" : p.status === "failed" ? esc(String(p.error || "").slice(0, 40)) : ""}</span>
    </div>`;
  }).join("");
  const soft = parts.filter((p) => p.seamSoft).length;
  const links = parts.length > 1 ? `<div class="cv-note">段与段之间用上一段的尾帧当下一段的首帧接上（${parts.length - 1} 次交接）。${soft ? `其中 ${soft} 处首帧被内容策略拦下，改成不带首帧生成——这几处接缝不锚定，会有轻微跳变。` : ""}</div>` : "";
  return `<div class="chainview">
    <div class="cv-head"><b>拆成 ${parts.length} 段</b><span>${j.model} · 单条上限决定段长 · 串行执行</span></div>
    ${rows}${links}
    ${j.status === "failed" ? `<div class="cv-fail">${esc(j.message || j.error || "")}${j.hint ? `<br>${esc(j.hint)}` : ""}</div>` : ""}
    ${j.result?.url ? `<div class="cv-note">缝合完成：${Math.round(j.result.seconds)}s · ${(j.result.bytes / 1e6).toFixed(1)} MB</div>` : ""}
  </div>`;
}

function renderGen(el, d) {
  const shot = d.shots.find((s) => s.id === d.project.currentShotId);
  if (!shot) {
    el.innerHTML = emptyState("选一个镜头。");
    return;
  }
  const P = shot.prompts;
  const text = P ? (promptTab.mode === "image" ? P.image[promptTab.lang] : promptTab.mode === "v2v" ? P.v2v[promptTab.lang] : promptTab.mode === "negative" ? P.negative[promptTab.lang] : P.video[promptTab.lang]) : "";
  const real = isOnline() && client.generation?.name && client.generation.name !== "simulated" ? Object.keys(client.generation.models || {}) : [];
  // v2v 要把白模视频交给供应商抓取，没有公网地址就必然失败 —— 别把它摆成默认项等人踩
  const v2vReady = !!(client.generation?.publicUrl || (client.generation?.publisher && client.generation.publisher !== "none"));
  // 但「还没建好」和「这台机器做不了」是两回事。隧道实测要一两分钟、常要换两三条，
  // 这段时间里一句「需要公网地址」会让人以为没救了 —— 其实再等四十秒就好。
  const tun = String(client.generation?.tunnel || "off");
  const v2vPending = !v2vReady && tun.startsWith("starting");
  const v2vNote = v2vPending ? `（正在建公网隧道${/:(\d+)/.test(tun) ? ` · 第 ${tun.split(":")[1]} 条` : ""}…）` : "（需要公网地址）";
  const defaultMode = v2vReady ? "v2v" : "i2v";
  const providers = Object.entries(PROVIDERS).sort(([a], [b]) => (real.includes(b) ? 1 : 0) - (real.includes(a) ? 1 : 0));
  const jobs = [...d.jobs].reverse().filter((j) => j.shotId === shot.id).slice(0, 8);
  el.innerHTML = `<div class="gen-layout">
    <div>
      <div class="gen-row"><b>${esc(shot.index)} ${esc(shot.title)}</b>
        <div class="prompt-tabs">${["image", "video", "v2v", "negative"].map((m) => `<button data-pm="${m}" class="${promptTab.mode === m ? "on" : ""}">${{ image: "图", video: "视频", v2v: "V2V", negative: "负面" }[m]}</button>`).join("")}</div>
        <div class="prompt-tabs">${["en", "zh"].map((l) => `<button data-pl="${l}" class="${promptTab.lang === l ? "on" : ""}">${l.toUpperCase()}</button>`).join("")}</div>
        <button data-act="compile">${P ? "重新编译" : "编译提示词"}</button><button data-act="copy" ${P ? "" : "disabled"}>复制</button></div>
      <div class="prompt-box">${P ? esc(text) : "还没有提示词。点「编译提示词」由镜头生成。"}</div>
    </div>
    <div>
      <div class="gen-row">
        <select data-k="provider">${providers.map(([k, v]) => `<option value="${k}">${esc(v.name)}${real.includes(k) ? "" : " · 模拟"}</option>`).join("")}</select>
        <select data-k="mode">${Object.entries(GEN_MODES).map(([k, v]) => `<option value="${k}"${k === defaultMode ? " selected" : ""}${k === "v2v" && !v2vReady ? " disabled" : ""}>${v}${k === "v2v" && !v2vReady ? v2vNote : ""}</option>`).join("")}</select>
        <button data-act="submit" class="primary">提交</button>
      </div>
      ${!real.length ? `<div class="empty" style="padding:8px 0;justify-content:flex-start">${isOnline() ? "后端未配置生成密钥：任务只是模拟。" : "单机模式：任务只是模拟，不会真的生成。"}</div>` : ""}
      ${real.length && v2vPending ? `<div class="prompt" style="padding:4px 0">正在建公网隧道，建好了这一项会自己亮起来（实测一到两分钟，常要换两三条）。等不及就先用 i2v —— 它同样跟着草片的构图走。</div>` : ""}
      ${real.length && !v2vReady && !v2vPending ? `<div class="prompt" style="padding:4px 0">v2v 用不了：供应商要从公网抓取草片视频。启动带 <code>--tunnel cloudflared</code> 或 <code>--public-url</code>，或在偏好设置里打开 v2v 公网开关。i2v 同样跟着草片的构图走。</div>` : ""}
      ${jobs.length ? `<table class="grid"><thead><tr><th>结果</th><th>供应商</th><th>模式</th><th>进度</th><th></th></tr></thead><tbody>${jobs.map((j) => `<tr><td>${j.result?.url ? (j.result.kind === "image" ? `<img class="thumb clickable" data-preview="${esc(j.result.url)}" data-kind="image" src="${esc(mediaHref(j.result.url))}" />` : `<video class="thumb clickable" data-preview="${esc(j.result.url)}" data-kind="video" src="${esc(mediaHref(j.result.url))}" muted loop playsinline onmouseenter="this.play()" onmouseleave="this.pause()"></video>`) : `<div class="thumb"></div>`}</td><td>${esc(j.model)}<div class="mono" style="color:var(--dim)">${esc(j.id)}</div></td><td class="mono">${j.mode}${(j.inputs?.references || []).length ? `<div class="prompt">参考 ${j.inputs.references.length}</div>` : ""}</td><td style="min-width:120px">${["queued", "running"].includes(j.status) ? `<div class="progress"><span style="width:${j.progress}%"></span></div>` : badge(j.status)}${j.error ? `<div class="prompt" title="${esc(j.error)}">${esc(String(j.error).slice(0, 70))}</div>` : ""}${j.status === "done" && !j.result?.url ? `<div class="prompt">模拟队列，无输出</div>` : ""}</td><td><div class="actions">${["queued", "running"].includes(j.status) ? `<button data-cancel="${j.id}">取消</button>` : `<button data-retry="${j.id}">重试</button>`}${j.kind === "chain" ? `<button data-chain="${j.id}">查看生成过程</button>` : ""}${j.kind === "chain" && j.resumable ? `<button data-resume="${j.shotId}">接着跑</button>` : ""}</div></td></tr>${j.kind === "chain" && openChain.has(j.id) ? `<tr><td colspan="5">${chainView(j)}</td></tr>` : ""}`).join("")}</tbody></table>` : ""}
    </div></div>`;
  el.querySelectorAll("[data-pm]").forEach((b) => (b.onclick = () => {
    promptTab.mode = b.dataset.pm;
    renderGen(el, store.get());
  }));
  el.querySelectorAll("[data-pl]").forEach((b) => (b.onclick = () => {
    promptTab.lang = b.dataset.pl;
    renderGen(el, store.get());
  }));
  el.querySelector('[data-act="compile"]').onclick = () => report(dispatch("generation.prompt", { shotId: shot.id }));
  el.querySelector('[data-act="copy"]').onclick = () => navigator.clipboard?.writeText(text).then(() => toast("已复制"));
  el.querySelector('[data-act="submit"]').onclick = async () => {
    const r = await dispatch("generation.submit", { shotId: shot.id, mode: el.querySelector('[data-k="mode"]').value, provider: el.querySelector('[data-k="provider"]').value, lang: promptTab.lang });
    report(r);
    if (r.ok) toast(`已提交 → ${r.provider} ${r.mode}${r.adapter === "simulated" ? "（模拟）" : ""}`);
  };
  el.querySelectorAll("[data-cancel]").forEach((b) => (b.onclick = () => dispatch("generation.cancel", { id: b.dataset.cancel })));
  el.querySelectorAll("[data-retry]").forEach((b) => (b.onclick = () => dispatch("generation.retry", { id: b.dataset.retry })));
  el.querySelectorAll("[data-chain]").forEach((b) => (b.onclick = () => {
    openChain.has(b.dataset.chain) ? openChain.delete(b.dataset.chain) : openChain.add(b.dataset.chain);
    renderGen(el, store.get());
  }));
  el.querySelectorAll("[data-resume]").forEach((b) => (b.onclick = () => report(dispatch("shot.chain", { shotId: b.dataset.resume, resume: true }))));
  el.querySelectorAll("[data-preview]").forEach((n) => (n.onclick = () => showPreview(n.dataset.preview, n.dataset.kind, `${shot.index} ${shot.title}`)));
}

// assets: one approved reference per entity is what keeps faces / products the same across generations
// ---- 顶栏：谁在规划、谁在出片 ----
// 这两件事决定了结果长什么样，以前一个藏在状态点的气泡里、一个藏在生成面板的下拉里。
// 尤其是「没配密钥、只是模拟」这一条：以前是面板里一行小灰字，人提交了半天才发现没真出片。
function renderModels(d) {
  const el = $("models");
  if (!el) return;
  const planner = d.agent?.backend && d.agent.backend !== "rules" ? d.agent.backend : null;
  const real = isOnline() && client.generation?.name && client.generation.name !== "simulated";
  const genModels = real ? Object.keys(client.generation.models || {}) : [];
  const video = genModels.find((k) => PROVIDERS[k]?.modes?.some((m) => m.endsWith("2v"))) || null;
  const busy = !!d.agent?.busy;
  const running = d.jobs.filter((j) => ["queued", "running"].includes(j.status) && j.kind !== "replicate").length;
  el.innerHTML = `
    <button class="model-pill${planner ? "" : " off"}${busy ? " busy" : ""}" id="plannerPill" data-tip="${planner ? "谁在规划" : "没接大模型"}" data-tip-sub="${planner ? `你说的话由 ${esc(planner)} 翻成一步步操作。点一下换模型` : "现在是内置规则在听，只认固定句式（「03 镜改成环绕」这种）。点一下去接一个"}">
      <svg class="gi"><use href="#i-sparkles"/></svg><b>${esc(planner || "规则")}</b>
    </button>
    <span class="model-pill gen${video ? "" : " off"}${running ? " busy" : ""}" data-tip="${video ? "谁在出片" : "只是模拟，不会真出片"}" data-tip-sub="${video ? `真画面由 ${esc(PROVIDERS[video].name)} 生成${running ? `，现在有 ${running} 个任务在跑` : ""}。单条 ${PROVIDERS[video].minSeconds || 1}–${PROVIDERS[video].maxSeconds} 秒` : "没配生成密钥：提交的任务只走一遍流程，不出画面。去偏好设置里填火山引擎 Ark 的密钥"}">
      <svg class="gi"><use href="#i-clapper"/></svg><b>${esc(video ? PROVIDERS[video].name.replace(/\s*\(.*\)$/, "") : "模拟")}</b>
    </span>`;
  $("plannerPill").onclick = () => { ui.settings = true; applyUi(); $("agentBackend")?.focus(); };
}

// ---- 左抽屉：角色库 ----
// 以前「资产」是底部第九个 tab，而且只列已经生成过的图 —— 想给谁定妆得先去属性面板里找按钮。
// 定妆是「人物跨镜不变样」的前提，不该是个要翻三层才找得到的功能。
// 搬到左边和场景并排：场景回答「场里有什么」，角色库回答「它们长什么样」。
const LIB_GROUPS = [["角色", ["character"]], ["物品", ["prop", "vehicle", "weapon"]]];

function renderLibrary(d) {
  const el = $("library");
  const assets = d.assets || [];
  const pending = assets.filter((a) => !a.approved).length;
  const badge = $("libBadge");
  if (badge) { badge.textContent = pending || ""; badge.classList.toggle("on", pending > 0); }
  if (!el || ui.left !== "library") return;

  const activePad = d.project.activePadId && d.scene.pads?.some((p) => p.id === d.project.activePadId) ? d.project.activePadId : null;
  const inScope = (e) => !activePad || !padOf(d, e) || padOf(d, e) === activePad;
  const padTag = (e) => { const q = padOf(d, e); const p = q && d.scene.pads.find((x) => x.id === q); return p && !activePad ? `<span class="pad-tag" data-tip="${esc(p.index + " " + p.name)}" data-tip-sub="在这块台上">${p.index}</span>` : ""; };
  const groups = LIB_GROUPS.map(([name, types]) => [name, d.entities.filter((e) => types.includes(e.semanticType) && inScope(e))]).filter(([, list]) => list.length);
  const done = d.entities.filter((e) => assets.some((a) => a.entityId === e.id && a.approved)).length;
  const total = groups.reduce((n, [, list]) => n + list.length, 0);
  $("libCount").textContent = total ? `${done}/${total}` : "";
  if (!total) { el.innerHTML = emptyState("场里还没有人物或物品。"); return; }

  el.innerHTML = groups.map(([name, list]) => `<div class="lib-group"><h3><span>${name}</span><span>${list.length}</span></h3>${list.map((e) => {
    const mine = assets.filter((a) => a.entityId === e.id);
    const ok = mine.some((a) => a.approved);
    const job = d.jobs.find((j) => j.kind === "reference" && j.entityId === e.id && ["queued", "running"].includes(j.status));
    const shots = d.shots.filter((sh) => (sh.targetIds || []).includes(e.id));
    return `<div class="lib-card${d.project.selectedId === e.id ? " sel" : ""}">
      <div class="lib-head" data-locate="${esc(e.id)}" data-tip="${esc(e.displayName)}" data-tip-sub="点一下在场里找到它">
        <span class="sw" style="background:${esc(e.proxy?.color || "#8a7a5a")}"></span><b>${esc(e.displayName)}</b>${padTag(e)}
        <span class="st${ok ? " ok" : ""}">${ok ? `<svg class="gi"><use href="#i-check"/></svg>定了` : mine.length ? "待批" : "没定妆"}</span>
      </div>
      <div class="lib-thumbs">
        ${mine.map((a) => `<div class="lib-thumb${a.approved ? " ok" : ""}" ${dragAttr({ kind: "asset", id: a.id, entityId: e.id, url: a.url })} data-tip="拖到时间线的镜头段上" data-tip-sub="那一镜生成时就会带上这张">${a.mediaKind === "video" ? `<video data-preview="${esc(a.url)}" data-kind="video" src="${esc(mediaHref(a.url))}" muted loop playsinline></video>` : `<img data-preview="${esc(a.url)}" data-kind="image" src="${esc(mediaHref(a.url))}" alt="" />`}
          <button class="tk" data-approve="${a.id}" data-on="${a.approved ? 1 : 0}" data-tip="${a.approved ? "已批准" : "批准这张"}" data-tip-sub="${a.approved ? "它出现的每一镜都会自动带上这张。再点一下取消" : `批准后，${esc(e.displayName)}出现的每一镜生成时都会带上它 · ${esc(a.model || a.kind || "")}`}"><svg class="gi"><use href="#i-check"/></svg></button>
          <button class="rm" data-del="${a.id}" data-tip="删掉这张">×</button></div>`).join("")}
        <button class="lib-add${job ? " busy" : ""}" data-more="${esc(e.id)}" ${job ? "disabled" : ""} data-tip="${job ? "正在出" : mine.length ? "再来一张" : "定妆"}" data-tip-sub="${job ? "定妆照生成中" : "出一张定妆照。这一步计费"}">${job ? `${job.progress || 0}%` : `<svg class="gi"><use href="#i-plus"/></svg>`}</button>
      </div>
      ${shots.length ? `<div class="lib-shots">${shots.slice(0, 12).map((sh) => `<button data-goshot="${esc(sh.id)}" data-tip="${esc(sh.index + " " + sh.title)}" data-tip-sub="这一镜拍到了${esc(e.displayName)}">${esc(sh.index)}</button>`).join("")}${shots.length > 12 ? `<button disabled>+${shots.length - 12}</button>` : ""}</div>` : ""}
    </div>`;
  }).join("")}</div>`).join("");

  el.querySelectorAll("[data-approve]").forEach((b) => (b.onclick = (ev) => { ev.stopPropagation(); report(dispatch("asset.approve", { id: b.dataset.approve, approved: b.dataset.on !== "1" })); }));
  el.querySelectorAll("[data-del]").forEach((b) => (b.onclick = (ev) => { ev.stopPropagation(); confirm("删掉这张定妆照？") && dispatch("asset.delete", { id: b.dataset.del }); }));
  el.querySelectorAll("[data-more]").forEach((b) => (b.onclick = () => { const e = store.get().entities.find((x) => x.id === b.dataset.more); report(dispatch("generation.reference", { entityId: b.dataset.more, view: e?.semanticType === "character" ? "front" : "three-quarter" })); }));
  el.querySelectorAll("[data-locate]").forEach((n) => (n.onclick = () => locate(n.dataset.locate)));
  el.querySelectorAll("[data-goshot]").forEach((b) => (b.onclick = () => report(dispatch("shot.select", { id: b.dataset.goshot }))));
  el.querySelectorAll("[data-preview]").forEach((n) => (n.onclick = () => showPreview(n.dataset.preview, n.dataset.kind, "定妆照")));
}

// ---- 舞台右上角：这一镜此刻的物理参数 ----
// 骨架只搭一次，之后每帧只改数字。整块重画的话，鼠标停在上面时气泡会跟着闪。
const PHYS_ROWS = [
  ["focal", "i-focus", "焦段 · 视角", "镜头多长，能装下多宽。视角由焦段和片门宽度算出来"],
  ["height", "i-updown", "机位离地", "摄影机离地面多高。1.6 米上下是站着平视，低于 1 米就是仰拍的感觉"],
  ["distance", "i-ruler", "距主体", "机位到它盯着的那个点有多远。推、拉、跟，变的就是这个数"],
  ["pitch", "i-angle", "俯仰", "正是仰拍，负是俯拍，0 是平视"],
  ["aperture", "i-aperture", "光圈 · 景深", "对焦点前后有多厚一段是清楚的。按薄透镜公式算，和真镜头一个道理"],
  ["speed", "i-gauge", "机位速度", "机位此刻每秒走多远（按四分之一秒的净位移算，抖动不算数）"],
  ["time", "i-timer", "时长 · 帧率", "这一镜多长、每秒多少帧"],
];
let physBuilt = false;
function renderPhys(d) {
  const el = $("phys");
  if (!el) return;
  const p = d.project.viewMode === "compare" ? null : physicalInfo(d);
  el.hidden = !p;
  if (!p) return;
  if (!physBuilt) {
    el.innerHTML = `<div class="ph"><svg class="gi"><use href="#i-ruler"/></svg><b data-k="title"></b><button id="physToggle" data-tip="收起 / 展开" data-tip-sub="这一镜此刻的真实参数：确定的、可测量的"><svg class="gi"><use href="#i-chev-d"/></svg></button></div>` +
      PHYS_ROWS.map(([k, icon, tip, sub]) => `<div class="pv" data-row="${k}" data-tip="${tip}" data-tip-sub="${sub}"><svg class="gi"><use href="#${icon}"/></svg><b data-k="${k}"></b></div>`).join("");
    $("physToggle").onclick = () => { ui.phys = !ui.phys; saveUi(); renderPhys(store.get()); };
    physBuilt = true;
  }
  // 舞台被抽屉挤矮了就自己收起来：一块读数面板不该盖掉半个画面
  const open = ui.phys && (el.parentElement?.clientHeight || 999) >= 340;
  el.classList.toggle("mini", !open);
  $("physToggle").querySelector("use").setAttribute("href", open ? "#i-chev-d" : "#i-ruler");
  if (!open) return;
  const set = (k, html) => { const n = el.querySelector(`[data-k="${k}"]`); if (n && n.innerHTML !== html) n.innerHTML = html; };
  set("title", esc(p.title));
  set("focal", `${Math.round(p.focal)}<i>mm</i> · ${p.fov.toFixed(0)}<i>°</i>`);
  set("height", `${pf.m(p.height)}<i>${pf.mUnit(p.height)}</i>`);
  set("distance", `${pf.m(p.distance)}<i>${pf.mUnit(p.distance)}</i>`);
  set("pitch", `${pf.deg(p.pitch)}<i>°</i>`);
  set("aperture", `f/${p.aperture}${p.dof ? ` · ${pf.m(p.dof.total)}<i>${Number.isFinite(p.dof.total) ? pf.mUnit(p.dof.total) : ""}</i>` : ""}`);
  set("speed", p.moving ? `${p.speed.toFixed(2)}<i>m/s</i>` : `0<i>m/s</i>`);
  set("time", p.seconds ? `${p.seconds.toFixed(1)}<i>s</i> · ${p.fps}<i>fps</i>` : `${p.fps}<i>fps</i>`);
  // 在动的那几项亮一下：一眼看出这一镜哪些数是随时间变的
  for (const k of ["distance", "speed", "height"]) el.querySelector(`[data-row="${k}"]`)?.classList.toggle("live", p.moving);
  // 机位贴地、或者景深薄到对不上焦，标红 —— 这两样是白模里最常见的「看着怪」的原因
  el.querySelector('[data-row="height"]')?.classList.toggle("warn", p.height < 0.25);
}

function renderEvents(el, d) {
  el.innerHTML = `<div class="events">${d.events.slice(0, 80).map((e) => `<div class="ev ${e.ok === false ? "fail" : ""}"><span class="src ${esc(e.source)}">${esc(e.source)}</span><span>${esc(e.action)}</span><span class="pl" title="${esc(JSON.stringify(e.payload))}">${esc(JSON.stringify(e.payload || {}))}${e.ok === false ? ` ✗ ${esc(e.after?.error || "")}` : ""}</span><span class="mono" style="color:var(--dim)">${e.ms != null ? e.ms + " ms" : ""}</span><span>${e.undoable ? `<button data-undo-to="${e.id}">撤销到此前</button>` : ""}${e.targetIds?.[0] ? `<button data-locate="${esc(e.targetIds[0])}">定位</button>` : ""}</span></div>`).join("") || emptyState("还没有事件。")}</div>`;
  el.querySelectorAll("[data-undo-to]").forEach((b) => (b.onclick = () => report(dispatch("project.undo-to", { eventId: b.dataset.undoTo }))));
  el.querySelectorAll("[data-locate]").forEach((b) => (b.onclick = () => locate(b.dataset.locate)));
}

function renderHealth(el, d) {
  const h = d.health, hi = isOnline() ? d.history || { undo: 0, redo: 0 } : historyInfo();
  const kv = [["FPS", h.fps], ["Draw calls", h.drawCalls], ["Triangles", h.triangles], ["Last command", `${h.lastCommandMs ?? 0} ms`], ["Backend", `${h.bridge}${isOnline() ? " · " + client.base : ""}`], ["Agent", d.agent.backend], ["Generation", client.generation?.name || "simulated"], ["Recorder", h.recorder], ["Undo / Redo", `${hi.undo} / ${hi.redo}`], ["State", d.project.currentState], ["Version", d.project.version], ["Objects", `${d.entities.length} · ${d.cameras.length} cam · ${d.lights.length} light`], ["Shots / Takes / Jobs", `${d.shots.length} / ${d.takes.length} / ${d.jobs.length}`], ["Events", d.events.length]];
  el.innerHTML = `<div class="kv">${kv.map(([k, v]) => `<div><b>${k}</b><span>${esc(v ?? "—")}</span></div>`).join("")}</div>`;
}
