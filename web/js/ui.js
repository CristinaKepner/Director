// UI binding layer — minimal by default, progressive by use.
// Renders from the store; every mutation goes through dispatch() (client.js routes it to the backend or the local replica).
// What is on screen at rest: the picture, the shot strip, one Agent input, four stage controls. Everything else opens on demand.
import { store, persistable, historyInfo } from "../../core/store.js";
import { timecode, getHooks } from "../../core/actions.js";
import { DEMOS } from "../../core/demo.js";
import { STATE_MACHINE, ASPECTS, POSES, JOINT_NAMES, JOINT_LIMITS, MOTION_TYPES, MOTION_TYPE_LIST, SHOT_SIZES, COVERAGE_ANGLES, LIGHT_PRESETS, LIGHT_TYPES, CAMERA_RIGS, PROVIDERS, GEN_MODES, SEMANTIC_PROXY, MODEL_LIBRARY, ROOM_PATTERNS } from "../../core/schema.js";
import { dispatch, client, isOnline } from "./client.js";
import { focusSelected, resetView } from "./viewport.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const fmt = (v, n = 2) => (typeof v === "number" ? v.toFixed(n) : v);
const promptTab = { mode: "video", lang: "en" };
let saveTimer = null;
let lastFullRender = 0;
let lastSelected = null;
const lastJobStatus = new Map();
const STORAGE_KEY = "director-console:project:v4";
const UI_KEY = "director-console:ui:v5";
const GUIDE_KEY = "director-console:guide:v5";

// local UI state (what is open) — persisted per browser, never part of the project
const ui = Object.assign({ left: null, drawer: false, tab: "shots", settings: false, moreTabs: false }, load(UI_KEY));
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
  $("drawerBtn").textContent = ui.drawer ? "▾" : "▴";
  $("agentSettings").hidden = !ui.settings;
  saveUi();
}
function openLeft(which) {
  ui.left = ui.left === which ? null : which;
  applyUi();
  render(store.get());
}
export function openDrawer(tab) {
  if (tab) ui.tab = tab;
  ui.drawer = tab ? true : !ui.drawer;
  applyUi();
  render(store.get());
}

export function bindUI() {
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
  $("importBtn").onclick = () => $("importFile").click();
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
  document.querySelectorAll("[data-bottom]").forEach((btn) => (btn.onclick = () => openDrawer(btn.dataset.bottom)));
  $("drawerBtn").onclick = () => openDrawer();
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
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable()));
      dispatch("project.mark-saved", {}, { silent: true });
      $("saveHint").textContent = `本地保存 · ${new Date().toLocaleTimeString()}`;
    } catch (err) {
      $("saveHint").textContent = "保存失败";
    }
  }, 600);
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
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// "/media/x.mp4" from the backend → absolute URL next to the API root (survives path-prefix proxies)
function mediaHref(u) {
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
  $("hudTc").textContent = timecode(d.project.playhead, d.project.fps);
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
  $("playBtn").textContent = d.project.playing ? "❚❚" : "▶";
  $("viewFree").classList.toggle("on", d.project.viewMode === "free");
  $("viewProgram").classList.toggle("on", d.project.viewMode !== "free");
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
  if (document.activeElement !== $("projectName")) $("projectName").value = d.project.name;
  $("fidelity").value = d.project.fidelity;
  $("shading").value = d.project.shading || "shaded";
  $("aspect").value = d.project.aspect;
  $("buildMode").querySelectorAll("[data-build]").forEach((b) => b.classList.toggle("on", (d.project.buildMode || "set") === b.dataset.build));
  const st = $("statePill");
  st.value = d.project.currentState;
  st.className = `state ${["ARMED", "RECORDING"].includes(d.project.currentState) ? "hot" : d.project.currentState === "GENERATING" ? "gen" : "edit"}`;
  $("recordBtn").textContent = d.project.recording ? "■ 停止" : "● 录制";
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
  renderTabs(d);
  if (ui.left === "scene") renderOutliner(d);
  if (ui.left === "props") renderInspector(d);
  renderThread(d);
  renderChips(d);
  if (ui.drawer) renderBottom(d);
  watchJobs(d);
}

// ---------- shot strip + tabs ----------
function renderShotStrip(d) {
  const el = $("shotStrip");
  el.innerHTML = d.shots.map((s) => `<button data-shot="${s.id}" class="${s.id === d.project.currentShotId ? "on" : ""}" title="${esc(MOTION_TYPES[s.motion.type]?.zh || s.motion.type)} · ${((s.range.outFrame - s.range.inFrame) / d.project.fps).toFixed(1)} s · ${Math.round(s.lens.focalLength)} mm"><span class="idx">${esc(s.index)}</span>${esc(s.title)}${s.takes.length ? `<span class="n">T${s.takes.length}</span>` : ""}</button>`).join("");
  el.querySelectorAll("[data-shot]").forEach((b) => {
    b.onclick = () => dispatch("shot.select", { id: b.dataset.shot });
    b.ondblclick = () => openDrawer("timeline");
  });
}
function renderTabs(d) {
  const has = { shots: true, timeline: !!d.project.currentShotId, takes: d.takes.length > 0, board: d.storyboard.length > 0, gen: !!d.project.currentShotId, assets: (d.assets || []).length > 0, log: ui.moreTabs || d.events.length > 40, health: ui.moreTabs || d.events.length > 40 };
  document.querySelectorAll("[data-bottom]").forEach((b) => {
    const k = b.dataset.bottom;
    b.hidden = !has[k];
    b.classList.toggle("on", ui.drawer && ui.tab === k);
    const n = { takes: d.takes.length, board: d.storyboard.length, gen: d.jobs.filter((j) => ["queued", "running"].includes(j.status)).length, assets: (d.assets || []).filter((a) => !a.approved).length }[k];
    b.textContent = { shots: "镜头", timeline: "时间线", takes: "Take", board: "故事版", gen: "生成", assets: "资产", log: "事件", health: "状态" }[k] + (n ? ` ${n}` : "");
  });
  if (ui.drawer && !has[ui.tab]) ui.tab = "shots";
}

// ---------- outliner ----------
function renderOutliner(d) {
  const el = $("outliner");
  const sel = d.project.selectedId;
  const row = (kind, id, name, extra, dot = "") => `<div class="tree-item ${sel === id ? "sel" : ""}" data-kind="${kind}" data-id="${id}"><span class="dot ${dot}"></span><span class="name">${esc(name)}</span><span class="kind">${esc(extra)}</span></div>`;
  const group = (title, rows, count) => `<div class="group-label"><span>${title}</span><span>${count}</span></div>${rows.join("")}`;
  const chars = d.entities.filter((e) => ["character", "vehicle", "weapon", "prop", "smoke", "flower"].includes(e.semanticType));
  const set = d.entities.filter((e) => !chars.includes(e));
  el.innerHTML = [
    group("机位", d.cameras.map((c) => row("camera", c.id, c.name, `${c.lens.focalLength}mm`, c.id === d.project.programCameraId ? "program" : "")), d.cameras.length),
    group("角色 · 道具", chars.map((e) => row("entity", e.id, e.displayName, `${e.semanticType}${e.pose ? " · " + e.pose : ""}`)), chars.length),
    group("布景", set.map((e) => row("entity", e.id, e.displayName, e.semanticType)), set.length),
    group("灯光", d.lights.map((l) => row("light", l.id, l.name, `${l.group}${l.enabled === false ? " · off" : ""}`)), d.lights.length),
  ].join("");
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
    ${field("模型", `<select data-k="model"><option value="">白模代理</option>${Object.entries(MODEL_LIBRARY).map(([k, m]) => `<option value="${k}" ${e.assetRef === m.url ? "selected" : ""}>${esc(m.zh)}</option>`).join("")}${e.assetRef && !Object.values(MODEL_LIBRARY).some((m) => m.url === e.assetRef) ? `<option value="__custom" selected>${esc(e.assetRef)}</option>` : ""}</select>`)}
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
  el.querySelector('[data-act="assets"]')?.addEventListener("click", () => openDrawer("assets"));
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
  el.innerHTML = `
    ${field("名称", `<input data-k="name" value="${esc(c.name)}" />`)}
    ${field("焦距", slider("focal", c.lens.focalLength, 12, 200, 1))}
    ${field("高度", slider("height", c.pose.position[1], 0.1, 12, 0.05))}
    ${field("看向", `<select data-k="target"><option value="">（无）</option>${options(ents.map((e) => e.id), c.target || "", Object.fromEntries(ents.map((e) => [e.id, e.displayName])))}</select>`)}
    ${field("景别", `<div class="xyz" style="grid-template-columns:1fr 1fr"><select data-k="size">${options(Object.keys(SHOT_SIZES), c.preset || "MS", Object.fromEntries(Object.entries(SHOT_SIZES).map(([k, v]) => [k, `${v.zh} ${k}`])))}</select><select data-k="angle">${options(Object.keys(COVERAGE_ANGLES), "front_left", Object.fromEntries(Object.entries(COVERAGE_ANGLES).map(([k, v]) => [k, v.zh])))}</select></div>`)}
    <div class="btn-row"><button data-act="frame" class="primary">按景别放机位</button><button data-act="pilot">设为 Program</button><button data-act="key">加关键帧</button></div>
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
  el.querySelector('[data-act="frame"]').onclick = () => report(dispatch("camera.frame", { id: c.id, target: el.querySelector('[data-k="target"]').value || c.target, size: el.querySelector('[data-k="size"]').value, angle: el.querySelector('[data-k="angle"]').value }));
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

// ---------- agent thread ----------
const expanded = new Set();
function renderThread(d) {
  const el = $("agentThread");
  const stick = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  el.innerHTML =
    d.agent.messages
      .map((m) => {
        if (m.role === "tool") {
          const open = expanded.has(m.id);
          const [head, ...rest] = m.text.split("\n");
          return `<div class="msg tool ${m.ok === false ? "fail" : ""}" data-mid="${m.id}" data-toggle="1"><div class="line"><span>${m.ok === false ? "✗" : "✓"}</span><b>${esc(head)}</b><code>${esc(m.action)}</code></div>${open ? `<pre>${esc(rest.join("\n"))}</pre><div class="actions">${m.targetIds?.length ? m.targetIds.slice(0, 3).map((t) => `<button data-locate="${esc(t)}">定位 ${esc(t)}</button>`).join("") : ""}${m.eventId && m.ok !== false ? `<button data-undo-to="${m.eventId}">撤销到此前</button>` : ""}</div>` : ""}</div>`;
        }
        if (m.role === "plan") {
          const steps = (m.plan?.steps || []).filter((s) => !s.quiet);
          return `<div class="msg plan" data-mid="${m.id}">${esc(m.text)}
          ${steps.map((s, i) => `<div class="step"><div>${esc(s.label)}<small>${esc(s.action)}</small></div>${m.manual ? `<button data-run-step="${m.id}:${i}">执行</button>` : ""}</div>`).join("")}
          ${m.pending ? `<div class="actions"><button class="primary" data-confirm="1">确认执行</button><button data-cancel="1">取消</button></div>` : ""}</div>`;
        }
        const media = m.media?.url ? (m.media.kind === "image" ? `<img class="media" data-preview="${esc(m.media.url)}" data-kind="image" src="${esc(mediaHref(m.media.url))}" />` : `<video class="media" data-preview="${esc(m.media.url)}" data-kind="video" src="${esc(mediaHref(m.media.url))}" muted loop playsinline onmouseenter="this.play()" onmouseleave="this.pause()"></video>`) : "";
        const dl = m.download ? `<div class="actions"><button data-dl="${m.id}">下载 ${esc(m.download.name)}</button></div>` : "";
        return `<div class="msg ${m.role}" data-mid="${m.id}">${esc(m.text)}${media}${dl}</div>`;
      })
      .join("") + (d.agent.busy ? `<div class="msg agent">…</div>` : "");
  el.querySelectorAll("[data-toggle]").forEach((n) => (n.onclick = (ev) => {
    if (ev.target.closest("button")) return;
    expanded.has(n.dataset.mid) ? expanded.delete(n.dataset.mid) : expanded.add(n.dataset.mid);
    renderThread(store.get());
  }));
  el.querySelectorAll("[data-locate]").forEach((b) => (b.onclick = () => locate(b.dataset.locate)));
  el.querySelectorAll("[data-undo-to]").forEach((b) => (b.onclick = () => report(dispatch("project.undo-to", { eventId: b.dataset.undoTo }))));
  el.querySelectorAll("[data-confirm]").forEach((b) => (b.onclick = () => report(dispatch("agent.confirm"))));
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
  const list = [];
  const cur = d.project.currentShotId || d.shots[0]?.id;
  if (!d.shots.length) list.push("载入示例「城市边缘」", "新建镜头「对峙」6秒 手持");
  else if (d.entities.some((e) => e.semanticType === "character") && !(d.assets || []).some((a) => a.approved)) list.push("给主角和产品各生成一张参考图", `录制 ${cur}`, "换成日落逆光");
  else if (!d.takes.length) list.push(`录制 ${cur}`, "把 Program 机位降到 0.4m 并 look-at 主角", "换成日落逆光");
  else if (!d.storyboard.length) list.push("全部进故事版", "让对手举枪", "03 镜改成环绕 120 度");
  else if (!d.jobs.length) list.push(`提交 ${cur} 视频生视频 seedance-2.5`, `给 ${cur} 生成提示词`);
  else list.push("主角外套换成红色再生成一次", "把两个人拉开 1.5m 重新生成", "换成日落逆光");
  $("chips").innerHTML = list.slice(0, 3).map((c) => `<button data-chip="${esc(c)}">${esc(c)}</button>`).join("");
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
  { h: "镜头与 Take", p: ["底部是镜头条。点镜头选中，<kbd>Space</kbd> 预演，「● 录制」录下白模代理视频作为 Take。", "有了 Take，「Take」「故事版」标签才会出现——需要时才补上。"] },
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
function renderBottom(d) {
  const el = $("bottomBody");
  const tab = ui.tab || "shots";
  if (tab === "shots") return renderShots(el, d);
  if (tab === "timeline") return renderTimeline(el, d);
  if (tab === "takes") return renderTakes(el, d);
  if (tab === "board") return renderBoard(el, d);
  if (tab === "gen") return renderGen(el, d);
  if (tab === "assets") return renderAssets(el, d);
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
  const len = Math.max(1, shot.range.outFrame - shot.range.inFrame);
  const pct = (f) => `${((f - shot.range.inFrame) / len) * 100}%`;
  const ticks = [];
  for (let f = shot.range.inFrame; f <= shot.range.outFrame; f += d.project.fps) ticks.push(`<div class="tick" style="left:${pct(f)}">${((f - shot.range.inFrame) / d.project.fps).toFixed(0)}s</div>`);
  const keys = (shot.keyframes || []).map((k) => `<div class="key" style="left:${pct(k.frame)}" title="f${k.frame} · ${k.focalLength}mm" data-kf="${k.frame}"></div>`).join("");
  const entKeys = d.entities.filter((e) => e.path?.length).map((e) => `<div class="tl-track"><span class="lbl">${esc(e.displayName).slice(0, 10)}</span>${e.path.map((k) => `<div class="key" style="left:calc(98px + (100% - 106px) * ${(k.frame - shot.range.inFrame) / len})" title="${esc(e.id)} f${k.frame}"></div>`).join("")}</div>`).join("");
  const lightKeys = d.lights.filter((l) => l.keyframes?.length).map((l) => `<div class="tl-track"><span class="lbl">${esc(l.name).slice(0, 10)}</span>${l.keyframes.map((k) => `<div class="key" style="left:calc(98px + (100% - 106px) * ${(k.frame - shot.range.inFrame) / len})" title="${esc(l.id)} f${k.frame} ${k.intensity}"></div>`).join("")}</div>`).join("");
  const layout = d.shots.map((s, i, arr) => ({ s, start: arr.slice(0, i).reduce((a, x) => a + x.range.outFrame - x.range.inFrame, 0), len: s.range.outFrame - s.range.inFrame }));
  const total = layout.reduce((a, x) => a + x.len, 0) || 1;
  el.innerHTML = `<div class="timeline">
    <div class="tl-side">
      <div><b>${esc(shot.index)} ${esc(shot.title)}</b></div>
      <div class="tcs">${timecode(d.project.playhead, d.project.fps)} / ${timecode(shot.range.outFrame, d.project.fps)}</div>
      <div class="tl-buttons"><button data-tl="in">⇤</button><button data-tl="prev">◀</button><button data-tl="play">${d.project.playing ? "❚❚" : "▶"}</button><button data-tl="next">▶|</button><button data-tl="out">⇥</button><button data-tl="loop" class="${d.project.loop ? "on" : ""}">⟳</button></div>
      <div class="tl-buttons"><button data-tl="key">+ 机位关键帧</button><button data-tl="clear">清除关键帧</button></div>
      <div class="tl-buttons"><button data-tl="seq">顺播全部</button><button data-tl="rec">● 录制 Take</button></div>
    </div>
    <div class="tl-main">
      <div class="tl-ruler">${ticks.join("")}<div class="head" style="left:${pct(d.project.playhead)}"></div></div>
      <input class="tl-scrub" type="range" min="${shot.range.inFrame}" max="${shot.range.outFrame}" step="1" value="${d.project.playhead}" />
      <div class="tl-track"><span class="lbl">Camera</span><span>${esc(d.cameras.find((c) => c.id === shot.cameraId)?.name || "")} · ${(shot.keyframes || []).length ? `${shot.keyframes.length} 关键帧` : esc(MOTION_TYPES[shot.motion.type]?.zh || "")}</span>${keys}</div>
      <div class="tl-track"><span class="lbl">Lens</span><span>${Math.round(shot.lens.focalLength)} mm · f/${shot.lens.aperture}</span></div>
      ${entKeys}${lightKeys}
      <div class="tl-track"><span class="lbl">Sequence</span>${layout.map((x) => `<div class="seg-shot ${x.s.id === shot.id ? "cur" : ""}" data-seg="${x.s.id}" style="left:calc(98px + (100% - 106px) * ${x.start / total});width:calc((100% - 106px) * ${x.len / total})">${esc(x.s.index)} ${esc(x.s.title)}</div>`).join("")}</div>
    </div></div>`;
  const scrub = el.querySelector(".tl-scrub");
  scrub.oninput = () => dispatch("timeline.seek", { frame: Number(scrub.value) }, { silent: true });
  el.querySelectorAll("[data-kf]").forEach((k) => (k.onclick = (ev) => (ev.shiftKey ? dispatch("motion.delete-keyframe", { shotId: shot.id, frame: Number(k.dataset.kf) }) : dispatch("timeline.seek", { frame: Number(k.dataset.kf) }))));
  el.querySelectorAll("[data-seg]").forEach((s) => (s.onclick = () => dispatch("shot.select", { id: s.dataset.seg })));
  const act = {
    in: () => dispatch("timeline.seek", { frame: shot.range.inFrame }),
    out: () => dispatch("timeline.seek", { frame: shot.range.outFrame }),
    prev: () => dispatch("timeline.seek", { frame: Math.max(shot.range.inFrame, d.project.playhead - 1) }),
    next: () => dispatch("timeline.seek", { frame: Math.min(shot.range.outFrame, d.project.playhead + 1) }),
    play: togglePlay,
    loop: () => store.patch((x) => (x.project.loop = !x.project.loop)),
    key: () => report(dispatch("motion.keyframe", { shotId: shot.id })),
    clear: () => dispatch("motion.clear-keyframes", { shotId: shot.id }),
    seq: () => dispatch("timeline.play", { sequence: true }),
    rec: recordCurrent,
  };
  el.querySelectorAll("[data-tl]").forEach((b) => (b.onclick = act[b.dataset.tl]));
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
      return `<tr class="row ${s?.id === d.project.currentShotId ? "sel" : ""}" data-take="${t.id}">
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
    const hero = gen ? (gen.result.kind === "image" ? `<img class="kf" data-preview="${esc(gen.result.url)}" data-kind="image" src="${esc(mediaHref(gen.result.url))}" title="生成结果 · ${esc(gen.model)}" />` : `<video class="kf" data-preview="${esc(gen.result.url)}" data-kind="video" src="${esc(mediaHref(gen.result.url))}" muted loop playsinline onmouseenter="this.play()" onmouseleave="this.pause()" title="生成结果 · ${esc(gen.model)}"></video>`) : take?.videoUrl ? `<video class="kf" data-preview="${esc(take.videoUrl)}" data-kind="video" src="${esc(mediaHref(take.videoUrl))}" muted loop playsinline poster="${c.keyframes?.[0] || ""}" onmouseenter="this.play()" onmouseleave="this.pause()" title="白模 Take"></video>` : c.keyframes?.[0] ? `<img class="kf" src="${c.keyframes[0]}" />` : `<div class="kf"></div>`;
    return `<article class="card ${s?.id === d.project.currentShotId ? "sel" : ""}" data-card="${c.id}">
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

function renderGen(el, d) {
  const shot = d.shots.find((s) => s.id === d.project.currentShotId);
  if (!shot) {
    el.innerHTML = emptyState("选一个镜头。");
    return;
  }
  const P = shot.prompts;
  const text = P ? (promptTab.mode === "image" ? P.image[promptTab.lang] : promptTab.mode === "v2v" ? P.v2v[promptTab.lang] : promptTab.mode === "negative" ? P.negative[promptTab.lang] : P.video[promptTab.lang]) : "";
  const real = isOnline() && client.generation?.name && client.generation.name !== "simulated" ? Object.keys(client.generation.models || {}) : [];
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
        <select data-k="mode">${Object.entries(GEN_MODES).map(([k, v]) => `<option value="${k}" ${k === "v2v" ? "selected" : ""}>${v}</option>`).join("")}</select>
        <button data-act="submit" class="primary">提交</button>
      </div>
      ${!real.length ? `<div class="empty" style="padding:8px 0;justify-content:flex-start">${isOnline() ? "后端未配置生成密钥：任务只是模拟。" : "单机模式：任务只是模拟，不会真的生成。"}</div>` : ""}
      ${jobs.length ? `<table class="grid"><thead><tr><th>结果</th><th>供应商</th><th>模式</th><th>进度</th><th></th></tr></thead><tbody>${jobs.map((j) => `<tr><td>${j.result?.url ? (j.result.kind === "image" ? `<img class="thumb clickable" data-preview="${esc(j.result.url)}" data-kind="image" src="${esc(mediaHref(j.result.url))}" />` : `<video class="thumb clickable" data-preview="${esc(j.result.url)}" data-kind="video" src="${esc(mediaHref(j.result.url))}" muted loop playsinline onmouseenter="this.play()" onmouseleave="this.pause()"></video>`) : `<div class="thumb"></div>`}</td><td>${esc(j.model)}<div class="mono" style="color:var(--dim)">${esc(j.id)}</div></td><td class="mono">${j.mode}${(j.inputs?.references || []).length ? `<div class="prompt">参考 ${j.inputs.references.length}</div>` : ""}</td><td style="min-width:120px">${["queued", "running"].includes(j.status) ? `<div class="progress"><span style="width:${j.progress}%"></span></div>` : badge(j.status)}${j.error ? `<div class="prompt" title="${esc(j.error)}">${esc(String(j.error).slice(0, 70))}</div>` : ""}${j.status === "done" && !j.result?.url ? `<div class="prompt">模拟队列，无输出</div>` : ""}</td><td><div class="actions">${["queued", "running"].includes(j.status) ? `<button data-cancel="${j.id}">取消</button>` : `<button data-retry="${j.id}">重试</button>`}</div></td></tr>`).join("")}</tbody></table>` : ""}
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
  el.querySelectorAll("[data-preview]").forEach((n) => (n.onclick = () => showPreview(n.dataset.preview, n.dataset.kind, `${shot.index} ${shot.title}`)));
}

// assets: one approved reference per entity is what keeps faces / products the same across generations
function renderAssets(el, d) {
  const assets = d.assets || [];
  if (!assets.length) {
    el.innerHTML = emptyState("还没有参考资产。在角色 / 产品的属性里点「生成参考图」，批准后它出现的每个镜头都会带上。");
    return;
  }
  const byEnt = new Map();
  for (const a of assets) byEnt.set(a.entityId, [...(byEnt.get(a.entityId) || []), a]);
  el.innerHTML = `<div class="cards">${[...byEnt.entries()].map(([eid, list]) => {
    const e = d.entities.find((x) => x.id === eid);
    return `<article class="card"><h3><span>${esc(e?.displayName || eid || "未绑定")}</span>${list.some((a) => a.approved) ? badge("approved") : badge("draft")}</h3>
      ${list.map((a) => `<div class="row" style="align-items:flex-start">${a.mediaKind === "video" ? `<video class="thumb clickable" data-preview="${esc(a.url)}" data-kind="video" src="${esc(mediaHref(a.url))}" muted loop playsinline></video>` : `<img class="thumb clickable" data-preview="${esc(a.url)}" data-kind="image" src="${esc(mediaHref(a.url))}" />`}<div style="flex:1;min-width:0"><div>${esc(a.label)}</div><div class="prompt">${esc(a.model || a.kind)}</div><div class="row" style="margin-top:4px"><button data-approve="${a.id}" class="${a.approved ? "on" : ""}">${a.approved ? "已批准" : "批准"}</button><button data-del="${a.id}">删除</button></div></div></div>`).join("")}
      <div class="row"><button data-more="${eid}">再生成一张</button></div></article>`;
  }).join("")}</div>`;
  el.querySelectorAll("[data-approve]").forEach((b) => (b.onclick = () => report(dispatch("asset.approve", { id: b.dataset.approve, approved: !b.classList.contains("on") }))));
  el.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => confirm("删除这张参考？") && dispatch("asset.delete", { id: b.dataset.del })));
  el.querySelectorAll("[data-more]").forEach((b) => (b.onclick = () => report(dispatch("generation.reference", { entityId: b.dataset.more, view: "three-quarter" }))));
  el.querySelectorAll("[data-preview]").forEach((n) => (n.onclick = () => showPreview(n.dataset.preview, n.dataset.kind, "参考")));
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
