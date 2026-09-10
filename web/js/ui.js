// UI binding layer. Renders from the store; every mutation goes through dispatch() (same registry as CLI/Agent).
// dispatch() comes from client.js: it routes state-changing Actions to the backend and view-only Actions to the local replica.
import { store, persistable, historyInfo } from "../../core/store.js";
import { timecode, getHooks } from "../../core/actions.js";
import { DEMOS } from "../../core/demo.js";
import { STATE_MACHINE, ASPECTS, POSES, JOINT_NAMES, JOINT_LIMITS, MOTION_TYPES, MOTION_TYPE_LIST, SHOT_SIZES, COVERAGE_ANGLES, LIGHT_PRESETS, LIGHT_TYPES, CAMERA_RIGS, PROVIDERS, GEN_MODES, SEMANTIC_PROXY, FIDELITY } from "../../core/schema.js";
import { dispatch, client, isOnline } from "./client.js";
import { focusSelected, resetView } from "./viewport.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const fmt = (v, n = 2) => (typeof v === "number" ? v.toFixed(n) : v);
const promptTab = { mode: "video", lang: "en" };
let saveTimer = null;
let lastFullRender = 0;
const STORAGE_KEY = "director-console:project:v4";

export function bindUI() {
  // top bar
  $("projectName").onchange = (e) => dispatch("project.rename", { name: e.target.value.trim() || "Untitled" });
  $("fidelity").onchange = (e) => dispatch("project.set-fidelity", { fidelity: e.target.value });
  $("shading").onchange = (e) => dispatch("project.set-shading", { mode: e.target.value });
  $("aspect").innerHTML = Object.keys(ASPECTS).map((a) => `<option value="${a}">${a}</option>`).join("");
  $("aspect").onchange = (e) => dispatch("project.set-aspect", { aspect: e.target.value });
  $("buildMode").querySelectorAll("[data-build]").forEach((b) => (b.onclick = () => dispatch("project.set-build-mode", { mode: b.dataset.build })));
  $("statePill").innerHTML = STATE_MACHINE.map((s) => `<option>${s}</option>`).join("");
  $("statePill").onchange = async (e) => {
    const r = await dispatch("project.set-state", { state: e.target.value });
    if (!r.ok) toast(r.error, true);
  };
  $("undoBtn").onclick = () => report(dispatch("project.undo"));
  $("redoBtn").onclick = () => report(dispatch("project.redo"));
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
  };
  // outliner
  $("addEntity").onclick = () => {
    const type = prompt(`语义类型（${Object.keys(SEMANTIC_PROXY).join("/")}）`, "character");
    if (!type) return;
    report(dispatch("entity.create", { type, displayName: prompt("显示名", SEMANTIC_PROXY[type]?.label?.split(" ")[0] || type) || undefined, position: [rand(-3, 3), 0, rand(-2, 2)] }));
  };
  $("addCamera").onclick = () => report(dispatch("camera.create", { name: `机位 ${store.get().cameras.length + 1}`, focalLength: 35, position: [rand(-4, 4), 1.5, 6], target: store.get().project.selectedKind === "entity" ? store.get().project.selectedId : store.get().entities.find((e) => e.semanticType === "character")?.id }));
  $("addLight").onclick = () => report(dispatch("light.create", { name: `灯 ${store.get().lights.length + 1}`, type: "spot", color: "#ffd9a8", intensity: 8, position: [rand(-3, 3), 4, rand(1, 3)], group: "practical", castShadow: true }));
  $("deleteSel").onclick = deleteSelected;
  // HUD
  $("viewFree").onclick = () => dispatch("project.set-view", { mode: "free" });
  $("viewProgram").onclick = () => dispatch("project.set-view", { mode: "program" });
  $("gizmoSeg").querySelectorAll("[data-gizmo]").forEach((b) => (b.onclick = () => dispatch("project.set-gizmo", { mode: b.dataset.gizmo })));
  $("playBtn").onclick = togglePlay;
  $("loopBtn").onclick = () => store.patch((d) => (d.project.loop = !d.project.loop));
  $("recordBtn").onclick = recordCurrent;
  $("newShotBtn").onclick = () => {
    const d = store.get();
    const title = prompt("镜头标题", `镜头 ${d.shots.length + 1}`);
    if (title === null) return;
    report(dispatch("shot.create", { title: title || undefined, cameraId: d.project.programCameraId, duration: 4, motion: "static" }));
    store.patch((x) => (x.project.bottomTab = "shots"));
  };
  // agent
  $("agentMode").onchange = (e) => dispatch("agent.set-mode", { mode: e.target.value });
  $("agentBackend").onchange = (e) => dispatch("agent.set-backend", { backend: e.target.value });
  $("agentSend").onclick = sendAgent;
  $("agentInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendAgent();
    }
  });
  const chips = ["把 Program 机位降到 0.4m 并 look-at 主角", "03 镜改成环绕 120 度", "让对手举枪", "换成日落逆光", "切到形态可读", "录制 shot_01", "给 02 镜生成提示词", "提交 shot_03 视频生视频 seedance", "搭建速度与激情追车片", "查看当前 context"];
  $("chips").innerHTML = chips.map((c) => `<button data-chip="${esc(c)}">${esc(c)}</button>`).join("");
  $("chips").querySelectorAll("[data-chip]").forEach((b) => (b.onclick = () => {
    $("agentInput").value = b.dataset.chip;
    sendAgent();
  }));
  // bottom tabs
  document.querySelectorAll("[data-bottom]").forEach((btn) => (btn.onclick = () => store.patch((d) => (d.project.bottomTab = btn.dataset.bottom))));
  document.addEventListener("keydown", onKey);

  store.subscribe((d, info) => {
    if (info?.light) renderLight(d);
    else {
      render(d);
      if (isOnline()) $("saveHint").textContent = `已同步 · 后端 v${d.project.version}${d.project.savedAt ? " · 保存于 " + new Date(d.project.savedAt).toLocaleTimeString() : ""}`;
      else scheduleSave();
    }
  });
  render(store.get());
}

// ---------- persistence ----------
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
      $("saveHint").textContent = `本地自动保存 · ${new Date().toLocaleTimeString()}`;
    } catch (err) {
      $("saveHint").textContent = "自动保存失败";
      console.warn(err);
    }
  }, 600);
}

// ---------- helpers ----------
// dispatch() may resolve asynchronously (backend round-trip); report() surfaces failures either way.
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
  else toast("先创建或选择一个镜头", true);
}
async function recordCurrent() {
  const d = store.get();
  if (d.project.recording) return report(dispatch("take.stop"));
  if (!d.project.currentShotId) return toast("先选择镜头", true);
  const arm = await dispatch("take.arm", { shotId: d.project.currentShotId });
  if (!arm.ok) return report(arm);
  await new Promise((r) => setTimeout(r, 350)); // let the program view settle before rolling
  report(dispatch("take.record", { shotId: d.project.currentShotId }));
}
function deleteSelected() {
  const d = store.get();
  const { selectedKind: k, selectedId: id } = d.project;
  if (!id) return;
  const action = { entity: "entity.delete", camera: "camera.delete", light: "light.delete", shot: "shot.delete" }[k];
  if (action && confirm(`删除 ${k} ${id}？可撤销。`)) report(dispatch(action, { id }));
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
  if (d.project.bottomTab === "health" && performance.now() - lastFullRender > 800) {
    lastFullRender = performance.now();
    renderBottom(d);
  }
  $("playBtn").textContent = d.project.playing ? "❚❚ 暂停" : "▶ 播放";
}

function render(d) {
  lastFullRender = performance.now();
  if (document.activeElement !== $("projectName")) $("projectName").value = d.project.name;
  $("sceneName").textContent = `${d.scene.name}`;
  $("fidelity").value = d.project.fidelity;
  $("shading").value = d.project.shading || "shaded";
  $("aspect").value = d.project.aspect;
  $("buildMode").querySelectorAll("[data-build]").forEach((b) => b.classList.toggle("on", (d.project.buildMode || "set") === b.dataset.build));
  const st = $("statePill");
  st.value = d.project.currentState;
  st.className = `state ${["ARMED", "RECORDING"].includes(d.project.currentState) ? "hot" : d.project.currentState === "GENERATING" ? "gen" : "edit"}`;
  const cam = d.cameras.find((c) => c.id === d.project.programCameraId);
  $("camPill").textContent = cam ? `PROGRAM · ${cam.name}` : "PROGRAM · —";
  const rec = $("recPill");
  rec.textContent = d.project.recording ? "● REC" : d.project.currentState === "ARMED" ? "ARMED" : "IDLE";
  rec.className = `pill ${d.project.recording ? "rec" : ""}`;
  $("recordBtn").textContent = d.project.recording ? "■ 停止录制" : "● 录制 Take";
  $("recordBtn").classList.toggle("live", !!d.project.recording);
  const h = isOnline() ? d.history || { undo: 0, redo: 0, labels: [] } : historyInfo();
  $("undoBtn").disabled = !h.undo;
  $("redoBtn").disabled = !h.redo;
  $("undoBtn").title = h.labels[0] ? `撤销：${h.labels[0]}` : "撤销";
  // HUD
  const shot = d.shots.find((s) => s.id === d.project.currentShotId);
  $("hudView").textContent = d.project.viewMode === "free" ? "自由观察" : `摄影机 ${cam?.name || ""}`;
  $("hudMeta").textContent = `${(d.project.shading || "shaded").toUpperCase()} · ${d.project.aspect} 安全画幅 · ${FIDELITY[d.project.fidelity]?.label || ""}`;
  $("hudFocal").textContent = cam ? `${Math.round(shot && shot.cameraId === cam.id ? shot.lens.focalLength : cam.lens.focalLength)} mm` : "—";
  $("hudCam").textContent = cam ? `${cam.preset || "—"} · f/${cam.lens.aperture} · ${cam.rig} · look-at ${cam.target || "—"}${shot ? ` · ${shot.index} ${shot.title} · ${MOTION_TYPES[shot.motion.type]?.zh || shot.motion.type}` : ""}` : "没有机位";
  $("hudScene").textContent = `SCENE ${(d.scene.id || "01").replace(/\D/g, "").slice(-2).padStart(2, "0") || "01"} · ${d.scene.name} · ${LIGHT_PRESETS[d.scene.environment.preset]?.zh || "自定义光"} · ${d.entities.filter((e) => e.semanticType === "character").length} 人 · ${d.project.buildMode === "blocking" ? "调度" : "布景"}`;
  $("viewFree").classList.toggle("on", d.project.viewMode === "free");
  $("viewProgram").classList.toggle("on", d.project.viewMode !== "free");
  $("gizmoSeg").querySelectorAll("[data-gizmo]").forEach((b) => b.classList.toggle("on", (d.project.gizmoMode || "translate") === b.dataset.gizmo));
  $("loopBtn").classList.toggle("on", !!d.project.loop);
  $("playBtn").textContent = d.project.playing ? "❚❚ 暂停" : "▶ 播放";
  $("hudTc").textContent = timecode(d.project.playhead, d.project.fps);
  $("agentMode").value = d.agent.mode;
  const be = $("agentBackend");
  const models = ["rules", ...(client.llm?.models || [])];
  if (be.options.length !== models.length) be.innerHTML = models.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join("");
  be.value = models.includes(d.agent.backend) ? d.agent.backend : "rules";
  be.title = client.llm?.name === "llm" ? `LLM 网关 ${client.llm.baseUrl}` : "后端未配置 LLM，只有内置规则规划器";
  const bp = $("bridgePill");
  bp.textContent = `backend · ${d.health.bridge || "offline"}`;
  bp.className = `pill ${d.health.bridge === "online" ? "ok" : ""}`;
  bp.title = d.health.bridge === "online" ? `${client.service || ""} @ ${client.base}` : d.health.bridge === "standalone" ? `后端不可达（${client.base}），页面在单机模式运行，工程保存在 localStorage` : "";
  document.querySelectorAll("[data-bottom]").forEach((b) => b.classList.toggle("on", b.dataset.bottom === d.project.bottomTab));

  renderOutliner(d);
  renderInspector(d);
  renderThread(d);
  renderBottom(d);
}

// ---------- outliner ----------
function renderOutliner(d) {
  const el = $("outliner");
  const sel = d.project.selectedId;
  const row = (kind, id, name, extra, dot = "") => `<div class="tree-item ${sel === id ? "sel" : ""}" data-kind="${kind}" data-id="${id}"><span class="dot ${dot}"></span><span class="name">${esc(name)}</span><span class="kind">${esc(extra)}</span></div>`;
  const group = (title, rows, count) => `<div class="group-label"><span>${title}</span><span>${count}</span></div>${rows.join("") || `<div class="tree-item"><span class="kind">空</span></div>`}`;
  const chars = d.entities.filter((e) => ["character", "vehicle", "weapon", "prop", "smoke", "flower"].includes(e.semanticType));
  const set = d.entities.filter((e) => !chars.includes(e));
  el.innerHTML = [
    group("Cameras", d.cameras.map((c) => row("camera", c.id, c.name, `${c.lens.focalLength}mm · ${c.rig}`, c.id === d.project.programCameraId ? "program" : "")), d.cameras.length),
    group("Cast & Props", chars.map((e) => row("entity", e.id, e.displayName, `${e.semanticType}${e.pose ? " · " + e.pose : ""}`)), chars.length),
    group("Set", set.map((e) => row("entity", e.id, e.displayName, e.semanticType)), set.length),
    group("Lights", d.lights.map((l) => row("light", l.id, l.name, `${l.type} · ${l.group}${l.enabled === false ? " · off" : ""}`)), d.lights.length),
  ].join("");
  el.querySelectorAll(".tree-item[data-id]").forEach((node) => {
    node.onclick = () => dispatch("project.select", { kind: node.dataset.kind, id: node.dataset.id });
    node.ondblclick = () => {
      if (node.dataset.kind === "camera") dispatch("camera.pilot", { id: node.dataset.id });
      else focusSelected();
    };
  });
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

function inspectScene(el, d) {
  $("inspectorTitle").textContent = "Scene · 环境与灯光";
  const env = d.scene.environment;
  el.innerHTML = `
    ${field("场景名", `<input data-k="sceneName" value="${esc(d.scene.name)}" />`)}
    ${field("灯光预设", `<select data-k="preset">${options(Object.keys(LIGHT_PRESETS), env.preset, Object.fromEntries(Object.entries(LIGHT_PRESETS).map(([k, v]) => [k, v.zh])))}</select>`)}
    ${field("背景", `<input type="color" data-env="bg" value="${env.bg || "#07080d"}" />`)}
    ${field("雾", slider("env:fog", env.fog ?? 0.02, 0, 0.08, 0.001))}
    ${field("环境光", slider("env:ambient", env.ambient ?? 0.2, 0, 1.2, 0.01))}
    ${field("曝光", slider("env:exposure", env.exposure ?? 1.2, 0.3, 2.5, 0.01))}
    ${field("湿地面", `<input type="checkbox" data-env="wet" ${env.wet ? "checked" : ""} />`)}
    <div class="sub-head">生成风格</div>
    ${field("Style", `<input data-k="style" value="${esc(d.project.style || "")}" placeholder="photoreal cinematic…" />`)}
    ${field("风格(中)", `<input data-k="styleZh" value="${esc(d.project.styleZh || "")}" placeholder="写实电影质感…" />`)}
    <div class="sub-head">保真度</div>
    <div class="memo">${esc(FIDELITY[d.project.fidelity].note)}</div>
    <div class="memo">点击视口中的物体 / 机位 / 灯光进行编辑。W/E/R 切换 Gizmo，F 聚焦，P 切 Program，Space 播放，K 加机位关键帧，Del 删除。</div>`;
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
}

function inspectEntity(el, e, d) {
  $("inspectorTitle").textContent = `Entity · ${e.id}`;
  const isChar = e.semanticType === "character";
  el.innerHTML = `
    ${field("名称", `<input data-k="displayName" value="${esc(e.displayName)}" />`)}
    ${field("语义", `<input value="${e.semanticType} · ${e.proxy.geometry}" disabled />`)}
    ${field("角色", `<input data-k="role" value="${esc(e.role || "")}" placeholder="hero / partner / antagonist" />`)}
    ${field("位置", xyz("pos", e.transform.position))}
    ${field("朝向", slider("yaw", e.transform.rotation[1], -3.1416, 3.1416, 0.01))}
    ${field("尺寸", xyz("dim", e.proxy.dimensions || [1, 1, 1]))}
    ${field("颜色", `<input type="color" data-k="color" value="${e.proxy.color || "#888888"}" />`)}
    ${isChar ? `<div class="sub-head">姿态 · 关节</div>
      ${field("姿势", `<select data-k="pose">${options([...Object.keys(POSES), "custom"], e.pose)}</select>`)}
      <div class="joints">${JOINT_NAMES.map((j) => `<div class="field"><span>${j}</span>${slider(`joint:${j}`, e.joints?.[j] ?? 0, JOINT_LIMITS[j][0], JOINT_LIMITS[j][1], 0.01)}</div>`).join("")}</div>` : ""}
    <div class="sub-head">动线</div>
    <div class="btn-row"><button data-act="pathKey">在播放头加动线关键帧</button><button data-act="pathClear">清除动线</button><span class="muted">${(e.path || []).length} 帧</span></div>
    <div class="sub-head">连续性 · Agent 记忆</div>
    ${field("外观", `<input data-cont="look" value="${esc(e.continuity?.look || "")}" placeholder="long dark coat…" />`)}
    ${field("色彩", `<input data-cont="color" value="${esc(e.continuity?.color || "")}" />`)}
    <div class="memo">${esc((e.agentMemory || []).join("\n") || "（无备注）")}</div>
    ${field("新备注", `<input data-k="remember" placeholder="回车追加" />`)}
    <div class="memo">用于镜头：${e.usedByShots?.join(", ") || "—"}</div>
    <div class="btn-row"><button data-act="dup">复制</button><button data-act="focus">聚焦 (F)</button><button data-act="lookat">Program look-at 它</button></div>`;
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
    inp.onchange = () => dispatch("context.scene", {}, { silent: true }); // no-op; final value already applied
  });
  el.querySelector('[data-k="pose"]')?.addEventListener("change", (ev) => ev.target.value !== "custom" && dispatch("entity.pose", { id: e.id, pose: ev.target.value }));
  el.querySelectorAll("[data-cont]").forEach((inp) => (inp.onchange = () => dispatch("entity.update", { id: e.id, continuity: { [inp.dataset.cont]: inp.value } })));
  el.querySelector('[data-k="remember"]').onchange = (ev) => ev.target.value && dispatch("entity.update", { id: e.id, remember: ev.target.value });
  el.querySelector('[data-act="pathKey"]').onclick = () => dispatch("entity.path", { id: e.id, append: { frame: d.project.playhead, position: [...e.transform.position], yaw: e.transform.rotation[1] } });
  el.querySelector('[data-act="pathClear"]').onclick = () => dispatch("entity.path", { id: e.id, clear: true });
  el.querySelector('[data-act="dup"]').onclick = () => dispatch("entity.duplicate", { id: e.id });
  el.querySelector('[data-act="focus"]').onclick = focusSelected;
  el.querySelector('[data-act="lookat"]').onclick = () => d.project.programCameraId && report(dispatch("camera.look-at", { id: d.project.programCameraId, target: e.id }));
}

function inspectCamera(el, c, d) {
  $("inspectorTitle").textContent = `Camera · ${c.id}`;
  const ents = d.entities.filter((e) => !["environment"].includes(e.semanticType));
  el.innerHTML = `
    ${field("名称", `<input data-k="name" value="${esc(c.name)}" />`)}
    ${field("焦距", slider("focal", c.lens.focalLength, 12, 200, 1))}
    ${field("光圈", `<select data-k="aperture">${options([1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11], c.lens.aperture, Object.fromEntries([1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11].map((a) => [a, `f/${a}`])))}</select>`)}
    ${field("位置", xyz("cpos", c.pose.position))}
    ${field("高度", slider("height", c.pose.position[1], 0.1, 12, 0.05))}
    ${field("Look-at", `<select data-k="target"><option value="">（无）</option>${options(ents.map((e) => e.id), c.target || "", Object.fromEntries(ents.map((e) => [e.id, e.displayName])))}</select>`)}
    ${field("Rig", `<select data-k="rig">${options(CAMERA_RIGS, c.rig)}</select>`)}
    <div class="sub-head">自动构图（景别 × 覆盖角）</div>
    ${field("景别", `<select data-k="size">${options(Object.keys(SHOT_SIZES), c.preset || "MS", Object.fromEntries(Object.entries(SHOT_SIZES).map(([k, v]) => [k, `${v.zh} ${k}`])))}</select>`)}
    ${field("覆盖角", `<select data-k="angle">${options(Object.keys(COVERAGE_ANGLES), "front_left", Object.fromEntries(Object.entries(COVERAGE_ANGLES).map(([k, v]) => [k, v.zh])))}</select>`)}
    <div class="btn-row"><button data-act="frame" class="primary">按景别放置机位</button><button data-act="pilot">设为 Program</button><button data-act="key">加关键帧 (K)</button></div>
    <div class="memo">机位在 Program 视图中所见即所得；关键帧优先于运镜预设。</div>`;
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
  $("inspectorTitle").textContent = `Light · ${l.id}`;
  el.innerHTML = `
    ${field("名称", `<input data-k="name" value="${esc(l.name)}" />`)}
    ${field("类型", `<select data-k="type">${options(LIGHT_TYPES, l.type)}</select>`)}
    ${field("组", `<select data-k="group">${options(["key", "fill", "rim", "neon", "practical", "kicker", "top"], l.group)}</select>`)}
    ${field("颜色", `<input type="color" data-k="color" value="${l.color}" />`)}
    ${field("强度", slider("intensity", l.intensity, 0, 40, 0.1))}
    ${field("开关", `<input type="checkbox" data-k="enabled" ${l.enabled !== false ? "checked" : ""} />`)}
    ${field("阴影", `<input type="checkbox" data-k="castShadow" ${l.castShadow ? "checked" : ""} />`)}
    ${field("位置", xyz("lpos", l.transform.position))}
    ${l.type === "spot" || l.type === "directional" || l.type === "area" ? field("目标", xyz("ltgt", Array.isArray(l.target) ? l.target : [0, 0.8, 0])) : ""}
    ${l.type === "spot" ? field("锥角", slider("angle", l.angle ?? 0.55, 0.05, 1.5, 0.01)) : ""}
    ${l.type === "area" ? field("宽×高", xyz("lwh", [l.width ?? 2, l.height ?? 1, 0])) : ""}
    ${field("跟随", `<select data-k="attachTo"><option value="">（不跟随）</option>${options(d.entities.map((e) => e.id), l.attachTo || "", Object.fromEntries(d.entities.map((e) => [e.id, e.displayName])))}</select>`)}
    <div class="btn-row"><button data-act="kf">在播放头加强度关键帧</button><button data-act="kfc">清除</button><span class="muted">${(l.keyframes || []).length} 帧</span></div>`;
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
  $("inspectorTitle").textContent = `Shot · ${s.index} ${s.title}`;
  const seconds = (s.range.outFrame - s.range.inFrame) / d.project.fps;
  el.innerHTML = `
    ${field("标题", `<input data-k="title" value="${esc(s.title)}" />`)}
    ${field("机位", `<select data-k="cameraId">${options(d.cameras.map((c) => c.id), s.cameraId, Object.fromEntries(d.cameras.map((c) => [c.id, c.name])))}</select>`)}
    ${field("时长", slider("duration", seconds, 1, 20, 0.5))}
    ${field("运镜", `<select data-k="motion">${options(MOTION_TYPE_LIST, s.motion.type, Object.fromEntries(Object.entries(MOTION_TYPES).map(([k, v]) => [k, `${v.zh} · ${k}`])))}</select>`)}
    ${s.motion.type === "orbit" || s.motion.type === "pan" ? field("角度°", slider("degrees", s.motion.params?.degrees ?? 120, 10, 360, 5)) : ""}
    ${["dolly-in", "dolly-out", "push-in", "dolly-zoom"].includes(s.motion.type) ? field("幅度", slider("amount", s.motion.params?.amount ?? 0.5, 0.05, 0.95, 0.05)) : ""}
    ${field("状态", `<select data-k="status">${options(["draft", "blocking", "rehearsal", "recorded", "review", "approved"], s.status)}</select>`)}
    ${field("目标", `<input data-k="targets" value="${esc((s.targetIds || []).join(","))}" placeholder="hero,gun" />`)}
    <div class="sub-head">动作 · 对白</div>
    <textarea data-k="description" style="width:100%;height:56px">${esc(s.description)}</textarea>
    ${field("对白", `<input data-k="dialogue" value="${esc(s.dialogue || "")}" />`)}
    <div class="btn-row"><button data-act="preview">预演</button><button data-act="record">录制 Take</button><button data-act="prompt">编译提示词</button><button data-act="board">进故事版</button><button data-act="dup">复制</button><button data-act="del" class="danger">删除</button></div>
    <div class="memo">关键帧 ${s.keyframes?.length || 0} · Take ${s.takes.length} · 提示词 v${s.promptVersions?.length || 0} · 任务 ${s.generationJobs.length}</div>`;
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
  el.querySelector('[data-act="record"]').onclick = () => {
    dispatch("shot.select", { id: s.id });
    recordCurrent();
  };
  el.querySelector('[data-act="prompt"]').onclick = () => {
    report(dispatch("generation.prompt", { shotId: s.id }));
    store.patch((x) => (x.project.bottomTab = "gen"));
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
  report(dispatch("storyboard.add", { shotId, keyframes }));
  store.patch((x) => (x.project.bottomTab = "board"));
}

// ---------- agent thread ----------
function renderThread(d) {
  const el = $("agentThread");
  const stick = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  el.innerHTML = d.agent.messages
    .map((m) => {
      if (m.role === "tool") {
        return `<div class="msg tool ${m.ok === false ? "fail" : ""}" data-mid="${m.id}"><div class="who"><span>tool · ${esc(m.action)}</span><span class="actor">${esc(m.actor || "")}</span></div>${esc(m.text.split("\n").slice(0, 1).join(""))}<pre>${esc(m.text.split("\n").slice(1).join("\n"))}</pre><div class="tool-actions">${m.targetIds?.length ? m.targetIds.slice(0, 3).map((t) => `<button data-locate="${esc(t)}">定位 ${esc(t)}</button>`).join("") : ""}${m.eventId && m.ok !== false ? `<button data-undo-to="${m.eventId}">撤销到此前</button>` : ""}</div></div>`;
      }
      if (m.role === "plan") {
        const steps = (m.plan?.steps || []).filter((s) => !s.quiet);
        return `<div class="msg plan" data-mid="${m.id}"><div class="who"><span>plan · ${m.pending ? "待确认" : m.cancelled ? "已取消" : m.confirmed ? "已执行" : m.manual ? "Manual" : ""}</span><span class="actor">director-planner</span></div>${esc(m.text)}
          ${steps.map((s, i) => `<div class="step"><div>${esc(s.label)}<small>${esc(s.action)} ${esc(JSON.stringify(s.payload)).slice(0, 90)}</small></div>${m.manual ? `<button data-run-step="${m.id}:${i}">执行</button>` : `<span class="actor">${esc(s.role)}</span>`}</div>`).join("")}
          ${m.pending ? `<div class="plan-actions"><button class="primary" data-confirm="1">确认执行</button><button data-cancel="1">取消</button></div>` : ""}</div>`;
      }
      const dl = m.download ? `<div class="tool-actions"><button data-dl="${m.id}">下载 ${esc(m.download.name)}</button></div>` : "";
      return `<div class="msg ${m.role}" data-mid="${m.id}"><div class="who"><span>${m.role === "user" ? "you" : "agent"}</span></div>${esc(m.text)}${dl}</div>`;
    })
    .join("") + (d.agent.busy ? `<div class="msg agent"><div class="who"><span>agent · ${esc(d.agent.backend || "")}</span></div>思考中…</div>` : "");
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
  if (stick) el.scrollTop = el.scrollHeight;
}

function locate(id) {
  const d = store.get();
  const kind = d.entities.some((e) => e.id === id) ? "entity" : d.cameras.some((c) => c.id === id) ? "camera" : d.lights.some((l) => l.id === id) ? "light" : d.shots.some((s) => s.id === id) ? "shot" : null;
  if (!kind) return toast(`找不到 ${id}`, true);
  if (kind === "shot") return dispatch("shot.select", { id });
  dispatch("project.select", { kind, id });
  if (d.project.viewMode === "free") setTimeout(focusSelected, 30);
}

// ---------- bottom ----------
function renderBottom(d) {
  const el = $("bottomBody");
  const tab = d.project.bottomTab || "shots";
  if (tab === "shots") return renderShots(el, d);
  if (tab === "timeline") return renderTimeline(el, d);
  if (tab === "takes") return renderTakes(el, d);
  if (tab === "board") return renderBoard(el, d);
  if (tab === "gen") return renderGen(el, d);
  if (tab === "log") return renderEvents(el, d);
  return renderHealth(el, d);
}

const badge = (s) => `<span class="badge ${esc(s)}">${esc(s)}</span>`;

function renderShots(el, d) {
  if (!d.shots.length) {
    el.innerHTML = `<div class="empty">还没有镜头。点「+ 新建镜头」或让 Agent「新建镜头「对峙」6秒 手持」。</div>`;
    return;
  }
  el.innerHTML = `<table class="grid"><thead><tr><th>镜号</th><th>标题</th><th>镜头</th><th>运动</th><th>时长</th><th>时间码</th><th>机位</th><th>目标</th><th>Take</th><th>状态</th><th></th></tr></thead><tbody>
    ${d.shots.map((s) => `<tr class="row ${s.id === d.project.currentShotId ? "sel" : ""}" data-shot="${s.id}">
      <td><span class="idx">${esc(s.index)}</span></td><td>${esc(s.title)}${s.keyframes?.length ? ` <span class="badge">${s.keyframes.length} keys</span>` : ""}</td>
      <td class="mono">${Math.round(s.lens.focalLength)} mm</td><td>${esc(MOTION_TYPES[s.motion.type]?.zh || s.motion.type)}</td>
      <td class="mono">${((s.range.outFrame - s.range.inFrame) / d.project.fps).toFixed(1)} s</td>
      <td class="mono">${timecode(s.range.inFrame, d.project.fps)} / ${timecode(s.range.outFrame, d.project.fps)}</td>
      <td class="mono">${esc(d.cameras.find((c) => c.id === s.cameraId)?.name || s.cameraId)}</td>
      <td class="mono">${esc((s.targetIds || []).join(", ") || "—")}</td><td class="mono">${s.takes.length}</td><td>${badge(s.status)}</td>
      <td><div class="actions"><button data-prev="${s.id}">预演</button><button data-rec="${s.id}">录制</button><button data-up="${s.id}">↑</button><button data-down="${s.id}">↓</button></div></td></tr>`).join("")}
    </tbody></table>
    <div class="tl-buttons" style="margin-top:8px"><button id="playSeq">▶ 顺播全部镜头</button><button id="boardAll">全部进故事版</button><button id="promptAll">全部编译提示词</button><button id="exportBoard">导出故事版 HTML</button><button id="exportBoardMd">导出 Markdown</button></div>`;
  el.querySelectorAll("tr[data-shot]").forEach((tr) => {
    tr.onclick = (ev) => {
      if (ev.target.closest("button")) return;
      dispatch("shot.select", { id: tr.dataset.shot });
    };
  });
  el.querySelectorAll("[data-prev]").forEach((b) => (b.onclick = () => dispatch("shot.preview", { id: b.dataset.prev })));
  el.querySelectorAll("[data-rec]").forEach((b) => (b.onclick = () => {
    dispatch("shot.select", { id: b.dataset.rec });
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
    el.innerHTML = `<div class="empty">选择一个镜头后显示时间线。</div>`;
    return;
  }
  const len = Math.max(1, shot.range.outFrame - shot.range.inFrame);
  const pct = (f) => `${((f - shot.range.inFrame) / len) * 100}%`;
  const ticks = [];
  const step = d.project.fps;
  for (let f = shot.range.inFrame; f <= shot.range.outFrame; f += step) ticks.push(`<div class="tick" style="left:${pct(f)}">${((f - shot.range.inFrame) / d.project.fps).toFixed(0)}s</div>`);
  const keys = (shot.keyframes || []).map((k) => `<div class="key" style="left:${pct(k.frame)}" title="f${k.frame} · ${k.focalLength}mm" data-kf="${k.frame}"></div>`).join("");
  const entKeys = d.entities.filter((e) => e.path?.length).map((e) => `<div class="tl-track"><span class="lbl">${esc(e.displayName).slice(0, 10)}</span>${e.path.map((k) => `<div class="key" style="left:calc(98px + (100% - 106px) * ${(k.frame - shot.range.inFrame) / len})" title="${esc(e.id)} f${k.frame}"></div>`).join("")}</div>`).join("");
  const lightKeys = d.lights.filter((l) => l.keyframes?.length).map((l) => `<div class="tl-track"><span class="lbl">${esc(l.name).slice(0, 10)}</span>${l.keyframes.map((k) => `<div class="key" style="left:calc(98px + (100% - 106px) * ${(k.frame - shot.range.inFrame) / len})" title="${esc(l.id)} f${k.frame} ${k.intensity}"></div>`).join("")}</div>`).join("");
  const layout = d.shots.map((s, i, arr) => ({ s, start: arr.slice(0, i).reduce((a, x) => a + x.range.outFrame - x.range.inFrame, 0), len: s.range.outFrame - s.range.inFrame }));
  const total = layout.reduce((a, x) => a + x.len, 0) || 1;
  el.innerHTML = `<div class="timeline">
    <div class="tl-side">
      <div><b>${esc(shot.index)} ${esc(shot.title)}</b></div>
      <div class="tcs">${timecode(d.project.playhead, d.project.fps)} / ${timecode(shot.range.outFrame, d.project.fps)}</div>
      <div class="muted">${d.project.fps} fps · ${len} 帧 · ${esc(MOTION_TYPES[shot.motion.type]?.zh || shot.motion.type)} · ${Math.round(shot.lens.focalLength)} mm</div>
      <div class="tl-buttons"><button data-tl="in">⇤</button><button data-tl="prev">◀</button><button data-tl="play">${d.project.playing ? "❚❚" : "▶"}</button><button data-tl="next">▶|</button><button data-tl="out">⇥</button><button data-tl="loop" class="${d.project.loop ? "on" : ""}">⟳</button></div>
      <div class="tl-buttons"><button data-tl="key">+ 机位关键帧 (K)</button><button data-tl="clear">清除关键帧</button></div>
      <div class="tl-buttons"><button data-tl="seq">顺播全部</button><button data-tl="rec">● 录制 Take</button></div>
    </div>
    <div class="tl-main">
      <div class="tl-ruler">${ticks.join("")}<div class="head" style="left:${pct(d.project.playhead)}"></div></div>
      <input class="tl-scrub" type="range" min="${shot.range.inFrame}" max="${shot.range.outFrame}" step="1" value="${d.project.playhead}" />
      <div class="tl-track"><span class="lbl">Camera</span><span class="muted">${esc(d.cameras.find((c) => c.id === shot.cameraId)?.name || "")} · ${(shot.keyframes || []).length ? `${shot.keyframes.length} 关键帧` : `预设运镜 ${esc(MOTION_TYPES[shot.motion.type]?.zh || "")}`}</span>${keys}</div>
      <div class="tl-track"><span class="lbl">Lens</span><span class="muted">${Math.round(shot.lens.focalLength)} mm · f/${shot.lens.aperture}${["push-in", "dolly-zoom"].includes(shot.motion.type) ? " · 焦距随运镜变化" : ""}</span></div>
      ${entKeys}${lightKeys}
      <div class="tl-track"><span class="lbl">Sequence</span>${layout.map((x) => `<div class="seg-shot ${x.s.id === shot.id ? "cur" : ""}" data-seg="${x.s.id}" style="left:calc(98px + (100% - 106px) * ${x.start / total});width:calc((100% - 106px) * ${x.len / total})">${esc(x.s.index)} ${esc(x.s.title)}</div>`).join("")}</div>
    </div></div>`;
  const scrub = el.querySelector(".tl-scrub");
  scrub.oninput = () => dispatch("timeline.seek", { frame: Number(scrub.value) }, { silent: true });
  el.querySelectorAll("[data-kf]").forEach((k) => (k.onclick = (ev) => {
    if (ev.shiftKey) dispatch("motion.delete-keyframe", { shotId: shot.id, frame: Number(k.dataset.kf) });
    else dispatch("timeline.seek", { frame: Number(k.dataset.kf) });
  }));
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
    el.innerHTML = `<div class="empty">尚无 Take。选择镜头后点「● 录制 Take」，浏览器会用 MediaRecorder 录下 Program 画面作为白模代理视频，并快照相机 / 镜头 / 灯光 / 物体。</div>`;
    return;
  }
  el.innerHTML = `<table class="grid"><thead><tr><th>缩略</th><th>Take</th><th>镜头</th><th>帧</th><th>快照</th><th>代理视频</th><th>时间</th><th>状态</th><th></th></tr></thead><tbody>
    ${[...d.takes].reverse().map((t) => {
      const s = d.shots.find((x) => x.id === t.shotId);
      return `<tr class="row ${s?.id === d.project.currentShotId ? "sel" : ""}" data-take="${t.id}">
        <td>${t.videoUrl ? `<video class="thumb" src="${esc(mediaHref(t.videoUrl))}" muted loop playsinline poster="${t.thumbnail || ""}" onmouseenter="this.play()" onmouseleave="this.pause()"></video>` : t.thumbnail ? `<img class="thumb" src="${t.thumbnail}" />` : `<div class="thumb"></div>`}</td>
        <td><b>${esc(t.name)}</b><div class="muted mono">${t.id}</div></td>
        <td class="mono">${esc(s ? `${s.index} ${s.title}` : t.shotId)}</td>
        <td class="mono">${t.frames}${t.capturedFrames != null ? ` / 实录 ${t.capturedFrames}${t.droppedFrames ? ` (掉 ${t.droppedFrames})` : ""}` : ""}</td>
        <td class="mono">机位 ${t.snapshot.cameras.length} · 物体 ${t.snapshot.entities.length} · 灯 ${t.snapshot.lights.length} · ${esc(t.snapshot.fidelity)}</td>
        <td class="mono">${t.videoUrl ? "webm ✓" : t.status === "recording" ? "录制中…" : "无（无头 / 刷新后失效）"}</td>
        <td class="mono">${new Date(t.createdAt).toLocaleTimeString()}</td><td>${badge(t.status)}</td>
        <td><div class="actions"><button data-circle="${t.id}">Circle</button><button data-reject="${t.id}">Reject</button><button data-board="${t.shotId}">进故事版</button><button data-restore="${t.id}" title="把场景恢复到这个 Take 的快照">恢复快照</button>${t.videoUrl ? `<a href="${esc(mediaHref(t.videoUrl))}" download="${esc(t.name)}.webm"><button>下载</button></a>` : ""}</div></td></tr>`;
    }).join("")}</tbody></table>`;
  el.querySelectorAll("[data-circle]").forEach((b) => (b.onclick = () => dispatch("take.review", { id: b.dataset.circle, status: "circle" })));
  el.querySelectorAll("[data-reject]").forEach((b) => (b.onclick = () => dispatch("take.review", { id: b.dataset.reject, status: "reject" })));
  el.querySelectorAll("[data-board]").forEach((b) => (b.onclick = () => addToBoard(b.dataset.board)));
  el.querySelectorAll("[data-restore]").forEach((b) => (b.onclick = () => restoreTake(b.dataset.restore)));
  el.querySelectorAll("tr[data-take]").forEach((tr) => (tr.onclick = (ev) => {
    if (ev.target.closest("button,a,video")) return;
    const t = d.takes.find((x) => x.id === tr.dataset.take);
    if (t) dispatch("shot.select", { id: t.shotId });
  }));
}

async function restoreTake(id) {
  const t = store.get().takes.find((x) => x.id === id);
  if (!t || !confirm(`把机位 / 物体 / 灯光恢复到「${t.name}」的快照？（可撤销）`)) return;
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
    el.innerHTML = `<div class="empty">故事版为空。在镜头条点「全部进故事版」，或对 Agent 说「全部进故事版」。卡片保存关键帧、白模视频、动作说明、对白、图像 / 视频提示词和生成结果。</div>`;
    return;
  }
  const cards = d.shots.map((s) => d.storyboard.find((c) => c.shotId === s.id)).filter(Boolean);
  el.innerHTML = `<div class="cards">${cards.map((c) => {
    const s = d.shots.find((x) => x.id === c.shotId);
    const take = d.takes.find((t) => t.id === c.selectedTake);
    const jobs = d.jobs.filter((j) => j.shotId === c.shotId);
    return `<article class="card ${s?.id === d.project.currentShotId ? "sel" : ""}" data-card="${c.id}">
      <h3><span><span class="idx mono" style="color:var(--accent)">${esc(s?.index)}</span> ${esc(s?.title)}</span>${badge(c.status)}</h3>
      ${take?.videoUrl ? `<video class="kf" src="${esc(mediaHref(take.videoUrl))}" muted loop playsinline poster="${c.keyframes?.[0] || ""}" onmouseenter="this.play()" onmouseleave="this.pause()"></video>` : c.keyframes?.[0] ? `<img class="kf" src="${c.keyframes[0]}" />` : `<div class="kf"></div>`}
      <div class="muted mono" style="font-size:11px">${Math.round(s.lens.focalLength)} mm · ${esc(MOTION_TYPES[s.motion.type]?.zh || "")} · ${((s.range.outFrame - s.range.inFrame) / d.project.fps).toFixed(1)} s · ${take ? esc(take.name) + " " + take.status : "无 Take"}</div>
      <textarea data-desc="${c.id}" placeholder="动作说明">${esc(c.actionDescription || "")}</textarea>
      <input data-dlg="${c.id}" placeholder="对白" value="${esc(c.dialogue || "")}" />
      <p><b>Image</b> ${esc((c.imagePrompt || s.imagePrompt || "未编译").slice(0, 160))}…</p>
      <p><b>Video</b> ${esc((c.videoPrompt || s.videoPrompt || "未编译").slice(0, 160))}…</p>
      ${jobs.length ? `<p><b>生成</b> ${jobs.map((j) => `${j.provider} ${j.mode} ${j.status} ${j.progress}%`).join(" · ")}</p>` : ""}
      ${c.notes?.length ? `<p class="muted">备注：${c.notes.map((n) => esc(n.text)).join("；")}</p>` : ""}
      <div class="row"><button data-kf="${c.shotId}">重拍关键帧</button><button data-open="${c.shotId}">打开镜头</button><button data-gen="${c.shotId}">去生成</button><button data-note="${c.id}">加备注</button><button data-approve="${c.id}" class="${c.status === "approved" ? "on" : ""}">Approve</button></div>
    </article>`;
  }).join("")}</div>`;
  el.querySelectorAll("[data-desc]").forEach((t) => (t.onchange = () => dispatch("storyboard.update", { id: t.dataset.desc, actionDescription: t.value })));
  el.querySelectorAll("[data-dlg]").forEach((t) => (t.onchange = () => dispatch("storyboard.update", { id: t.dataset.dlg, dialogue: t.value })));
  el.querySelectorAll("[data-kf]").forEach((b) => (b.onclick = () => addToBoard(b.dataset.kf)));
  el.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => dispatch("shot.select", { id: b.dataset.open })));
  el.querySelectorAll("[data-gen]").forEach((b) => (b.onclick = () => {
    dispatch("shot.select", { id: b.dataset.gen });
    store.patch((x) => (x.project.bottomTab = "gen"));
  }));
  el.querySelectorAll("[data-note]").forEach((b) => (b.onclick = () => {
    const n = prompt("导演备注");
    if (n) dispatch("storyboard.update", { id: b.dataset.note, note: n });
  }));
  el.querySelectorAll("[data-approve]").forEach((b) => (b.onclick = () => dispatch("storyboard.update", { id: b.dataset.approve, status: "approved" })));
}

function renderGen(el, d) {
  const shot = d.shots.find((s) => s.id === d.project.currentShotId);
  if (!shot) {
    el.innerHTML = `<div class="empty">选择镜头后编译提示词并提交生成任务。</div>`;
    return;
  }
  const P = shot.prompts;
  const text = P ? (promptTab.mode === "image" ? P.image[promptTab.lang] : promptTab.mode === "v2v" ? P.v2v[promptTab.lang] : promptTab.mode === "negative" ? P.negative[promptTab.lang] : P.video[promptTab.lang]) : "";
  const providers = Object.entries(PROVIDERS);
  el.innerHTML = `<div class="gen-layout">
    <div>
      <div class="row" style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
        <b>${esc(shot.index)} ${esc(shot.title)}</b>
        <div class="prompt-tabs">${["image", "video", "v2v", "negative"].map((m) => `<button data-pm="${m}" class="${promptTab.mode === m ? "on" : ""}">${{ image: "Image", video: "Video · T2V/I2V", v2v: "V2V（白模参考）", negative: "Negative" }[m]}</button>`).join("")}</div>
        <div class="prompt-tabs">${["en", "zh"].map((l) => `<button data-pl="${l}" class="${promptTab.lang === l ? "on" : ""}">${l.toUpperCase()}</button>`).join("")}</div>
        <button data-act="compile">${P ? `重新编译 (v${shot.promptVersions?.length || 1})` : "编译提示词"}</button>
        <button data-act="copy" ${P ? "" : "disabled"}>复制</button>
      </div>
      <div class="prompt-box">${P ? esc(text) : "尚未编译。提示词由镜头编译：场景、主体语义与连续性、景别、焦距、机位高度与角度、运镜、灯光组、时长、帧率、保真度说明。"}</div>
      ${P ? `<div class="muted mono" style="font-size:11px;margin-top:6px">${esc(P.compiler)} · ${esc(P.meta.shotSize)} · ${esc(P.meta.angle)} · ${esc(P.meta.height)} · ${P.meta.focal}mm · ${P.meta.seconds}s · ${esc(P.meta.motion)} · ${esc(P.meta.lightingPreset || "custom")} · ${esc(P.meta.fidelity)}</div>` : ""}
    </div>
    <div>
      <div class="row" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
        <select data-k="provider">${providers.map(([k, v]) => `<option value="${k}">${esc(v.name)} · ${v.modes.join("/")}</option>`).join("")}</select>
        <select data-k="mode">${Object.entries(GEN_MODES).map(([k, v]) => `<option value="${k}" ${k === "v2v" ? "selected" : ""}>${v} ${k}</option>`).join("")}</select>
        <button data-act="submit" class="primary">提交任务</button>
      </div>
      <div class="muted" style="font-size:11px;margin-bottom:8px">V2V 使用圈选 Take 的白模视频作为运动参考；I2V 使用故事版关键帧。${isOnline() && client.generation?.name && client.generation.name !== "simulated" ? `后端 Generation Adapter：<b>${esc(client.generation.name)}</b>（${esc(Object.keys(client.generation.models || {}).join(" / "))}），其余供应商走模拟队列。` : "当前为可观察的模拟队列，真实供应商在后端作为 Generation Adapter 接入（如 --ark-key-file）。"}</div>
      ${d.jobs.length ? `<table class="grid"><thead><tr><th>任务</th><th>镜头</th><th>模式</th><th>供应商</th><th>进度</th><th>状态</th><th></th></tr></thead><tbody>${[...d.jobs].reverse().slice(0, 12).map((j) => `<tr><td class="mono">${j.id}<div class="muted">prompt v${j.promptVersion}</div></td><td class="mono">${esc(d.shots.find((s) => s.id === j.shotId)?.index || j.shotId)}</td><td class="mono">${j.mode}${j.takeId ? " · take" : ""}</td><td>${esc(j.model)}</td><td style="min-width:90px"><div class="progress"><span style="width:${j.progress}%"></span></div></td><td>${badge(j.status)}${j.error ? `<div class="muted" style="font-size:10px;max-width:220px" title="${esc(j.error)}">${esc(String(j.error).slice(0, 80))}</div>` : ""}</td><td><div class="actions">${["queued", "running"].includes(j.status) ? `<button data-cancel="${j.id}">取消</button>` : `<button data-retry="${j.id}">重试</button>`}${j.result?.url ? `<a href="${esc(mediaHref(j.result.url))}" target="_blank" rel="noopener"><button>查看</button></a>` : ""}</div>${j.result?.url ? (j.result.kind === "image" ? `<img class="thumb" src="${esc(mediaHref(j.result.url))}" style="margin-top:4px" />` : `<video class="thumb" src="${esc(mediaHref(j.result.url))}" muted loop playsinline style="margin-top:4px" onmouseenter="this.play()" onmouseleave="this.pause()"></video>`) : ""}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">尚无生成任务。</div>`}
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
    if (r.ok) toast(`已提交 ${r.id} → ${r.provider} ${r.mode}`);
  };
  el.querySelectorAll("[data-cancel]").forEach((b) => (b.onclick = () => dispatch("generation.cancel", { id: b.dataset.cancel })));
  el.querySelectorAll("[data-retry]").forEach((b) => (b.onclick = () => dispatch("generation.retry", { id: b.dataset.retry })));
}

function renderEvents(el, d) {
  el.innerHTML = `<div class="events">${d.events.slice(0, 80).map((e) => `<div class="ev ${e.ok === false ? "fail" : ""}"><span class="src ${esc(e.source)}">${esc(e.source)}</span><span class="muted">${esc(e.actorId || "")}</span><span>${esc(e.action)}</span><span class="muted" title="${esc(JSON.stringify(e.payload))}">${esc(JSON.stringify(e.payload || {})).slice(0, 110)}${e.ok === false ? ` ✗ ${esc(e.after?.error || "")}` : ""}</span><span class="muted">${e.ms != null ? e.ms + " ms" : ""}</span><span>${e.undoable ? `<button data-undo-to="${e.id}">撤销到此前</button>` : ""}${e.targetIds?.[0] ? `<button data-locate="${esc(e.targetIds[0])}">定位</button>` : ""}</span></div>`).join("") || `<div class="empty">暂无事件。</div>`}</div>`;
  el.querySelectorAll("[data-undo-to]").forEach((b) => (b.onclick = () => report(dispatch("project.undo-to", { eventId: b.dataset.undoTo }))));
  el.querySelectorAll("[data-locate]").forEach((b) => (b.onclick = () => locate(b.dataset.locate)));
}

function renderHealth(el, d) {
  const h = d.health, hi = isOnline() ? d.history || { undo: 0, redo: 0 } : historyInfo();
  const kv = [["FPS", h.fps], ["Draw calls", h.drawCalls], ["Triangles", h.triangles], ["Last command", `${h.lastCommandMs ?? 0} ms`], ["Commands", h.commands || 0], ["Recorder", h.recorder], ["Backend", `${h.bridge}${isOnline() ? " · " + client.base : ""}`], ["Undo / Redo", `${hi.undo} / ${hi.redo}`], ["State", d.project.currentState], ["Version", d.project.version], ["Entities", d.entities.length], ["Cameras", d.cameras.length], ["Lights", d.lights.length], ["Shots", d.shots.length], ["Takes", d.takes.length], ["Jobs", d.jobs.length], ["Events", d.events.length], ["Saved", d.project.savedAt ? new Date(d.project.savedAt).toLocaleTimeString() : "—"]];
  el.innerHTML = `<div class="kv">${kv.map(([k, v]) => `<div><b>${k}</b><span>${esc(v ?? "—")}</span></div>`).join("")}</div>
    <div class="muted" style="margin-top:10px;font-size:12px">后端是 Source of Truth：<code>POST /api/actions {action, payload}</code> 或 <code>node server/bin/director.mjs --remote &lt;url&gt; camera.look-at --id cam_program --target hero</code> 改的是同一份工程，这个页面通过 <code>/api/events</code>（SSE）实时同步。单机模式下（后端不可达）所有 Action 在本页执行并存到 localStorage。</div>`;
}
