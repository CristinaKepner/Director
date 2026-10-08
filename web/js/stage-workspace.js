import { store } from "../../core/store.js";
import { sceneForShot } from "../../core/actions.js";
import { topDownMap, mapToSvg } from "../../core/spatial.js";
import { MOTION_TYPES } from "../../core/schema.js";
import { dispatch } from "./client.js";
import { stageResult, stageMapFrame } from "./stage-result.js";

const $ = (id) => document.getElementById(id);
const KEY = "director-console:stage-workspace:v1";

export function initStageWorkspace({ openDrawer, openLeft, mediaHref, showPreview, toast }) {
  let prefs = { map: true, result: true, scope: "shot" };
  try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch {}
  if (!["shot", "film"].includes(prefs.scope)) prefs.scope = "shot";
  let source = "", currentOutput = null, mapKey = "", lastMapAt = 0;
  const video = $("stageResultVideo");
  // Native video shortcuts must not also drive the 3D timeline's global hotkeys.
  video.addEventListener("keydown", (e) => e.stopPropagation());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {} };
  const visibility = () => {
    for (const [key, panel, reopen] of [["map", "mapDockPanel", "mapReopen"], ["result", "resultDockPanel", "resultReopen"]]) {
      $(panel).hidden = !prefs[key]; $(reopen).hidden = !!prefs[key];
      $(reopen).setAttribute("aria-expanded", String(!!prefs[key]));
    }
    if (!prefs.result) video.pause();
    save();
  };
  for (const [id, key, value] of [["mapClose", "map", false], ["mapReopen", "map", true], ["resultClose", "result", false], ["resultReopen", "result", true]]) {
    $(id).onclick = () => { prefs[key] = value; visibility(); render(store.get()); $(value ? (key === "map" ? "mapClose" : "resultClose") : (key === "map" ? "mapReopen" : "resultReopen")).focus(); };
  }
  $("mapDetails").onclick = () => openDrawer("map");
  $("stageResultScope").value = prefs.scope;
  $("stageResultScope").onchange = (e) => { prefs.scope = e.target.value; save(); render(store.get()); };
  $("stageResultGenerate").onclick = () => openDrawer(prefs.scope === "film" ? "film" : "gen");
  $("stageResultCompare").onclick = () => dispatch("project.set-view", { mode: "compare" });
  $("stageResultExpand").onclick = () => { if (currentOutput) showPreview(currentOutput.result.url, "video", "R2V 成片"); };
  $("stageResultSave").onclick = async () => {
    if (!currentOutput) return;
    const ref = currentOutput.result.url;
    try {
      if (window.director?.saveMedia) {
        const r = await window.director.saveMedia(ref);
        if (r?.ok) toast(`已保存到 ${r.path}`);
        else if (r && !r.canceled) toast(r.error || "保存失败", true);
      } else {
        const a = document.createElement("a"); a.href = mediaHref(ref);
        a.download = ref.split("/").pop().split(/[?#]/)[0] || "director-film.mp4";
        a.target = "_blank"; a.rel = "noopener"; a.click();
      }
    } catch (e) { toast(`保存失败：${e.message}`, true); }
  };
  video.addEventListener("error", () => {
    if (!source) return;
    $("stageResultEmpty").hidden = false;
    $("stageResultEmpty").textContent = "视频暂时无法播放，请检查文件或网络；可在生成面板重新生成。";
  });
  video.addEventListener("loadeddata", () => { $("stageResultEmpty").hidden = true; });
  const motion = $("stageMotion");
  for (const [id, m] of Object.entries(MOTION_TYPES)) motion.add(new Option(m.zh, id));
  motion.add(new Option("自定义关键帧", "keyframed"));
  motion.querySelector('[value="keyframed"]').disabled = true;
  motion.onchange = async () => {
    const shot = store.get().shots.find((s) => s.id === store.get().project.currentShotId);
    if (!shot) return;
    const r = await dispatch("motion.set", { shotId: shot.id, type: motion.value });
    if (!r?.ok) toast(r?.hint || r?.error || "运镜未更新", true);
    render(store.get());
  };
  $("stageTools").addEventListener("click", (e) => {
    const tool = e.target.closest("[data-stage-tool]")?.dataset.stageTool;
    if (tool === "brief") { $("agentInput").placeholder = "描述场景、角色、灯光和镜头运动…"; $("agentInput").focus(); }
    if (tool === "objects") { openLeft("scene"); $("addEntity").click(); }
    if (tool === "characters") openLeft("library");
    if (tool === "camera") $("addCamera").click();
    if (tool === "light") $("addLight").click();
    if (tool === "generate") openDrawer("gen");
  });

  function renderMap(d, force = false) {
    if (!prefs.map || d.project.viewMode === "compare") return;
    const now = performance.now();
    if (!force && now - lastMapAt < 120) return;
    const shot = d.shots.find((s) => s.id === d.project.currentShotId) || d.shots[0];
    const frame = stageMapFrame(d, shot);
    const key = JSON.stringify([d.project.version, shot, Math.floor(frame / 4), d.entities, d.cameras, d.lights]);
    if (key === mapKey) return;
    mapKey = key; lastMapAt = now;
    const world = shot ? sceneForShot(d, shot) : d;
    $("stageMap").innerHTML = mapToSvg(topDownMap(world, { shotId: shot?.id, frame, samples: 24 }), { px: 260, labels: true });
    $("mapFrame").textContent = shot ? `${shot.index} · ${Math.floor(frame)}f` : "全场";
  }

  function render(d) {
    const compare = d.project.viewMode === "compare";
    $("stageDocks").hidden = compare;
    $("stageTools").hidden = compare;
    if (compare) video.pause();
    renderMap(d, true);
    const shot = d.shots.find((s) => s.id === d.project.currentShotId) || d.shots[0];
    motion.disabled = !shot || !!d.project.recording || shot.keyframes?.length >= 2;
    motion.title = shot?.keyframes?.length >= 2 ? "当前镜头使用自定义关键帧，请在时间线编辑运镜" : "应用运镜预设";
    motion.value = shot?.keyframes?.length >= 2 ? "keyframed" : shot?.motion?.type || "static";
    const { output, latest } = stageResult(d, prefs.scope);
    currentOutput = output;
    const next = output ? mediaHref(output.result.url) : "";
    // Keep the same video element/source through SSE ticks so playback never restarts.
    if (next !== source) {
      video.pause(); source = next;
      if (source) video.src = source;
      else video.removeAttribute("src");
      video.load();
      $("stageResultEmpty").hidden = !!source;
    }
    video.hidden = !source;
    $("stageResultExpand").disabled = !source;
    $("stageResultSave").disabled = !source;
    const busy = latest && ["queued", "running"].includes(latest.status);
    const failed = latest?.status === "failed";
    const context = prefs.scope === "film" ? "整条生成成片" : shot ? `${shot.index} · ${shot.title}` : "未选择镜头";
    $("stageResultStatus").textContent = `${context}${busy ? ` · 生成中 ${latest.progress || 0}%${source ? " · 显示上一版" : ""}` : failed ? ` · 生成失败${source ? " · 显示上一版" : ""}` : source ? " · 已完成" : latest?.status === "cancelled" ? " · 已取消" : ""}`;
    $("stageResultStatus").title = failed ? String(latest.hint || latest.error || "生成失败，请在生成面板重试") : context;
    if (!source) {
      $("stageResultEmpty").hidden = false;
      $("stageResultEmpty").textContent = busy ? "正在把参考与 3D 镜头转成视频…" : failed ? "生成失败，打开生成面板查看原因并重试。" : latest?.status === "done" ? "模拟任务已完成，未返回视频。配置生成服务后可输出成片。" : prefs.scope === "film" ? "逐镜生成后，在成片面板导出整条生成视频。" : "布置场景 → 录制草片 → 生成视频\n这一镜的 V 成片会显示在这里";
    }
    $("stageResultGenerate").textContent = prefs.scope === "film" ? "成片面板" : busy ? "查看进度" : "生成这一镜";
  }
  visibility();
  store.subscribe((d, info) => info?.light ? renderMap(d) : render(d));
  render(store.get());
}
