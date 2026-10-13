import { createCuePlayback } from './audio-cues.js';
import { store } from "../../core/store.js";
import { sceneForShot } from "../../core/actions.js";
import { topDownMap, mapToSvg } from "../../core/spatial.js";
import { MOTION_TYPES } from "../../core/schema.js";
import { dispatch } from "./client.js";
import { stageResult, stageMapFrame } from "./stage-result.js";
import { chosenVideo, videoVersions, cutTimeline, cutMedia, cutCaption } from "../../core/cut.js";

const $ = (id) => document.getElementById(id);
const KEY = "director-console:stage-workspace:v1";
// One monitor for rehearsal and editable generated clips. Previewing never adopts a candidate.
export const stagePlayback = {};

export function initStageWorkspace({ openDrawer, openLeft, mediaHref, showPreview, toast }) {
  let prefs = { map: true, result: true, scope: "shot" };
  try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch {}
  if (!["shot", "film"].includes(prefs.scope)) prefs.scope = "shot";
  let source = "", currentOutput = null, mapKey = "", lastMapAt = 0;
  const video = $("stageResultVideo");
  const before = $("stageResultBeforeVideo"), music = $("stageMusicAudio");
  const cuePlayback = createCuePlayback(mediaHref,toast);
  let candidateId = null, candidateShot = null, comparing = false, sequence = false, advancing = false, resume = false, pendingSeek = null, holdTimer = null;
  let captionOverride = null;
  let editKey = '', holdStarted = 0, holdFrom = 0, heldTime = null;
  let expanded = false;
  function expand(value) {
    expanded = value; $("stageDocks").classList.toggle("monitor-expanded", value);
    $("stageResultExpand").textContent = value ? "还原" : "放大";
  }
  document.addEventListener("keydown", e => {
    if (expanded && e.key === "Escape") { expand(false); e.stopPropagation(); }
  }, true);
  const currentRow = () => cutTimeline(store.get()).find(r => r.shot.id === store.get().project.currentShotId);
  const media = () => currentRow() ? cutMedia(store.get(), currentRow().shot) : {start:0,end:Infinity,speed:1,seconds:0};
  const localTime = () => pendingSeek ?? (holdTimer ? Math.min(media().seconds,holdFrom+(performance.now()-holdStarted)/1000) : heldTime ?? Math.max(0,Math.min(media().seconds,(video.currentTime-media().start)/media().speed)));
  function applySeek() {
    if (pendingSeek === null || video.readyState < 1) return;
    const at = prefs.scope === 'shot' ? media().start + pendingSeek*media().speed : pendingSeek;
    heldTime = at > video.duration ? pendingSeek : null;
    video.currentTime = Math.min(at, Math.max(0,video.duration - .001)); pendingSeek = null;
  }
  function renderCaption() {
    const s = currentRow()?.shot;
    if (!s) { $('stageResultCaption').textContent=''; $('stageBeforeCaption').textContent=''; return; }
    const c = {...cutCaption(store.get(),s), ...(captionOverride?.shotId === s.id ? captionOverride.settings : {})};
    const text = captionOverride?.shotId === s.id ? captionOverride.text : c.text;
    for (const [el, player] of [[$('stageResultCaption'),video],[$('stageBeforeCaption'),before]]) {
      const box = player.parentElement.getBoundingClientRect(), aspect = (player.videoWidth || store.get().project.resolution?.width || 1080)/(player.videoHeight || store.get().project.resolution?.height || 1920);
      const w = Math.min(box.width,box.height*aspect), h = w/aspect;
      el.textContent = prefs.scope === 'shot' && localTime() >= c.start && localTime() < c.end ? text : '';
      Object.assign(el.style,{color:c.color,fontSize:`${h*c.size/100}px`,left:`${(box.width-w)/2+w*.06}px`,right:`${(box.width-w)/2+w*.06}px`,bottom:c.position==='bottom'?`${(box.height-h)/2+h*.07}px`:'auto',top:c.position==='top'?`${(box.height-h)/2+h*.07}px`:c.position==='center'?'50%':'auto',transform:c.position==='center'?'translateY(-50%)':'none'});
    }
  }
  new ResizeObserver(renderCaption).observe(video.parentElement);
  const notifyTime = () => document.dispatchEvent(new CustomEvent("stage-preview-time"));
  function stopSequence() { if (holdTimer) heldTime=localTime(); sequence = false; resume = false; clearTimeout(holdTimer); holdTimer = null; music.pause(); cuePlayback.pause(); }
  function syncMusic() {
    cuePlayback.sync(prefs.scope === "shot" ? store.get().project.audioClips || [] : [],(currentRow()?.start || 0)+localTime(),!video.paused || !!holdTimer);
    if (prefs.scope !== "shot" || !music.getAttribute("src") || !Number.isFinite(music.duration) || music.duration <= 0) return;
    const at = ((currentRow()?.start || 0) + localTime()) % music.duration;
    if (Math.abs(music.currentTime - at) > .4) music.currentTime = at;
    if ((!video.paused || holdTimer) && music.paused) music.play().catch(() => {});
  }
  function setSource(el, url) {
    const next = url ? mediaHref(url) : "";
    if (el.dataset.source === next) return;
    el.pause(); el.dataset.source = next;
    if (next) el.src = next; else el.removeAttribute("src");
    el.load();
  }
  async function advance() {
    if (advancing || !sequence) return;
    const rows = cutTimeline(store.get()), index = rows.findIndex(r => r.shot.id === store.get().project.currentShotId), next = rows[index + 1];
    if (!next || !chosenVideo(store.get(), next.shot)) { stopSequence(); video.pause(); music.pause(); cuePlayback.pause(); notifyTime(); return; }
    advancing = true; resume = true;
    try { await dispatch("shot.select", { id: next.shot.id }); }
    finally { advancing = false; }
  }
  Object.assign(stagePlayback, {
    preview({ jobId = null, compare = false, time = null } = {}) {
      stopSequence(); video.pause(); prefs.scope = "shot"; prefs.result = true;
      candidateShot = store.get().project.currentShotId; candidateId = jobId; comparing = compare;
      $("stageResultScope").value = prefs.scope;
      visibility(); render(store.get());
      if(Number.isFinite(time)){pendingSeek=Math.max(0,Math.min(media().seconds,time-(currentRow()?.start||0)));applySeek();}
      notifyTime();
    },
    caption(text, settings = {}) {
      if (prefs.scope !== "shot") return;
      const shot = currentRow()?.shot;
      captionOverride = { shotId: shot?.id, base: JSON.stringify([shot?.cut?.caption,shot?.cut?.captionRange,shot?.cut?.captionStyle]), text, settings };
      renderCaption();
    },
    state() { return { time: prefs.scope === "shot" ? (currentRow()?.start || 0) + localTime() : video.currentTime || 0, playing: !video.paused || !!holdTimer }; },
    toggle() {
      if (!video.paused || holdTimer) { stopSequence(); video.pause(); music.pause(); cuePlayback.pause(); notifyTime(); return; }
      candidateId = null; comparing = false; prefs.scope = "shot"; prefs.result = true; $("stageResultScope").value = "shot";
      visibility(); render(store.get());
      if (!source) { toast("这一镜还没有可播放的采用版", true); return; }
      if (video.ended || localTime() >= media().seconds - .01) { pendingSeek=0; applySeek(); }
      sequence = true; video.play().catch(e => toast(`暂时无法播放：${e.message}`, true));
    },
    async seek(seconds) {
      const rows = cutTimeline(store.get()), row = rows.find(r => seconds >= r.start && seconds < r.end) || rows.at(-1);
      if (!row) return;
      stopSequence(); video.pause(); candidateId = null; comparing = false; prefs.scope = "shot"; prefs.result = true;
      $("stageResultScope").value = "shot"; visibility();
      if (row.shot.id !== store.get().project.currentShotId) await dispatch("shot.select", { id: row.shot.id });
      render(store.get()); pendingSeek = Math.max(0, Math.min(row.seconds, seconds - row.start));
      applySeek(); renderCaption(); notifyTime();
    },
  });
  before.addEventListener("keydown", e => e.stopPropagation());
  before.addEventListener('loadedmetadata',()=>{ before.currentTime=Math.min(video.currentTime,Math.max(0,before.duration-.001));before.playbackRate=video.playbackRate; });
  video.addEventListener("loadedmetadata", () => {
    applySeek(); renderCaption();
    if (resume && sequence) { resume = false; video.play().catch(() => stopSequence()); }
  });
  video.addEventListener("play", () => {
    if (prefs.scope === 'shot' && (video.currentTime < media().start || localTime() >= media().seconds-.01)) { pendingSeek=0; applySeek(); }
    dispatch("timeline.pause"); syncMusic(); notifyTime();
    if (!$("stageResultBefore").hidden) { before.currentTime = Math.min(video.currentTime, before.duration || 0); before.play().catch(() => {}); }
  });
  video.addEventListener("pause", () => { before.pause(); music.pause(); cuePlayback.pause(); notifyTime(); });
  video.addEventListener("seeked", () => {
    if (prefs.scope === 'shot' && video.currentTime < Math.min(media().start,Math.max(0,video.duration-.001))-.01) { pendingSeek=0;applySeek(); }
    if (prefs.scope === 'shot' && video.currentTime > media().end + .01) { pendingSeek=media().seconds;applySeek(); }
    if (!$("stageResultBefore").hidden && before.readyState >= 1) before.currentTime = Math.min(video.currentTime, before.duration || 0);
    syncMusic(); renderCaption(); notifyTime();
  });
  video.addEventListener("timeupdate", () => {
    syncMusic(); renderCaption(); notifyTime();
    if (prefs.scope === "shot" && !video.paused && localTime() >= media().seconds - .01) {
      video.pause(); if (sequence) advance();
    }
  });
  video.addEventListener("ended", () => {
    if (!sequence) return;
    const rest = media().seconds - localTime();
    if (rest > .05) {
      holdFrom=localTime();holdStarted=performance.now();
      holdTimer = setTimeout(() => { holdTimer = null; heldTime=media().seconds; advance(); }, rest * 1000);
      const tick = () => { if(!holdTimer)return; syncMusic();renderCaption();notifyTime();requestAnimationFrame(tick); }; tick();
    }
    else advance();
  });
  // Native video shortcuts must not also drive the 3D timeline's global hotkeys.
  video.addEventListener("keydown", (e) => e.stopPropagation());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {} };
  const visibility = () => {
    for (const [key, panel, reopen] of [["map", "mapDockPanel", "mapReopen"], ["result", "resultDockPanel", "resultReopen"]]) {
      $(panel).hidden = !prefs[key]; $(reopen).hidden = !!prefs[key];
      $(reopen).setAttribute("aria-expanded", String(!!prefs[key]));
    }
    if (!prefs.result) { expand(false); stopSequence(); video.pause(); }
    save();
  };
  for (const [id, key, value] of [["mapClose", "map", false], ["mapReopen", "map", true], ["resultClose", "result", false], ["resultReopen", "result", true]]) {
    $(id).onclick = () => { prefs[key] = value; visibility(); render(store.get()); $(value ? (key === "map" ? "mapClose" : "resultClose") : (key === "map" ? "mapReopen" : "resultReopen")).focus(); };
  }
  $("mapDetails").onclick = () => openDrawer("map");
  $("stageResultScope").value = prefs.scope;
  $("stageResultScope").onchange = (e) => { stopSequence(); candidateId = null; comparing = false; prefs.scope = e.target.value; save(); render(store.get()); };
  $("stageResultGenerate").onclick = () => openDrawer(prefs.scope === "film" ? "film" : currentOutput ? "timeline" : "gen");
  $("stageResultCompare").onclick = () => dispatch("project.set-view", { mode: "compare" });
  $("stageResultExpand").onclick = () => {
    if (!currentOutput) return;
    expand(!expanded);
  };
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
    if (compare) { stopSequence(); video.pause(); }
    renderMap(d, true);
    const shot = d.shots.find((s) => s.id === d.project.currentShotId) || d.shots[0];
    motion.disabled = !shot || !!d.project.recording || shot.keyframes?.length >= 2;
    motion.title = shot?.keyframes?.length >= 2 ? "当前镜头使用自定义关键帧，请在时间线编辑运镜" : "应用运镜预设";
    motion.value = shot?.keyframes?.length >= 2 ? "keyframed" : shot?.motion?.type || "static";
    if (candidateShot !== shot?.id) {
      if (!advancing) { stopSequence(); video.pause(); }
      candidateId = null; comparing = false; candidateShot = shot?.id; pendingSeek = null;
    }
    const result = stageResult(d, prefs.scope), latest = result.latest;
    const candidate = prefs.scope === "shot" && videoVersions(d, shot?.id).find(j => j.id === candidateId);
    const output = candidate || result.output;
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
    const nextEdit = JSON.stringify([prefs.scope,shot?.id,source,prefs.scope==='shot'?media():null]);
    if (nextEdit !== editKey) {
      if(editKey && !advancing){stopSequence();video.pause();}
      editKey=nextEdit; heldTime=null; pendingSeek=0;
      video.playbackRate = prefs.scope==='shot' ? media().speed : 1;
      before.playbackRate = video.playbackRate; applySeek();
      if (resume && sequence && video.readyState >= 1) {resume=false;video.play().catch(()=>stopSequence());}
    }
    const isCandidate = candidate && candidate.id !== result.output?.id;
    $("stageResultBefore").hidden = !(comparing && isCandidate && result.output);
    $("stageResultBefore").parentElement.classList.toggle("comparing", !$("stageResultBefore").hidden);
    setSource(before, !$("stageResultBefore").hidden ? result.output.result.url : null);
    video.muted = prefs.scope === "shot" && !!shot?.cut?.muted;
    video.volume = prefs.scope === 'shot' ? shot?.cut?.volume ?? 1 : 1;
    $("stageResultLabel").textContent = source ? prefs.scope === "film" ? "导出的成片" : isCandidate ? "候选预览 · 尚未采用" : "当前采用版" : "";
    if (captionOverride && (captionOverride.shotId !== shot?.id || captionOverride.base !== JSON.stringify([shot?.cut?.caption,shot?.cut?.captionRange,shot?.cut?.captionStyle]))) captionOverride = null;
    renderCaption();
    setSource(music, prefs.scope === "shot" ? d.project.cutMusic?.url : null);
    music.volume = d.project.cutMusic?.volume ?? .12;
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
    $("stageResultGenerate").textContent = prefs.scope === "film" ? "成片面板" : busy ? "查看进度" : source ? "编辑这一镜" : "生成这一镜";
    notifyTime();
  }
  visibility();
  store.subscribe((d, info) => info?.light ? renderMap(d) : render(d));
  render(store.get());
}
