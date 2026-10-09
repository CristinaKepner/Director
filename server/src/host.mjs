// RuntimeHost — the backend's authoritative Director Runtime.
// Owns one core runtime instance (Source of Truth), persists it to a project file, stores take media,
// and broadcasts every state change to subscribers (SSE clients). No HTTP here: see api.mjs.
import fs from "node:fs";
import path from "node:path";
import * as R from "../../core/index.js";
import { createFilmAssembler } from "./film.mjs";
import { createJudge } from "./adapters/judge.mjs";
import { createReferenceReader } from "./adapters/reference.mjs";
import { createFetcher } from "./fetch.mjs";

const { store, dispatch, persistable, loadProjectData, capabilities, historyInfo, RUNTIME_VERSION } = R;

export const SERVER_VERSION = "director-server/0.5";

// 网关回的 401 / 402 / 429 body 形如 {"error":{"code":"OUT_OF_TOKENS","message":"…"}}；
// llm 适配器把整段 body 当成 Error.message 抛上来，这里把里面那句人话取出来。
function trialReason(err) {
  if (!/^HTTP_(401|402|429)$/.test(String(err?.code || ""))) return null;
  try {
    const j = JSON.parse(String(err.message));
    return j?.error?.message || null;
  } catch {
    return null;
  }
}

export function createHost(opts = {}) {
  const projectFile = opts.projectFile ? path.resolve(opts.projectFile) : null;
  const mediaDir = path.resolve(opts.mediaDir || (projectFile ? path.join(path.dirname(projectFile), "media") : "data/media"));
  const autosaveMs = opts.autosaveMs ?? 500;
  const log = opts.log || (() => {});
  const subscribers = new Set();
  const recordingWatch = new Map(); // takeId → timer
  let saveTimer = null;
  let dirty = false;
  let lastSavedAt = null;
  let broadcastSeq = 0;
  let lastEventId = null;

  // ---- generation adapter (real provider) ----
  let generation = null;
  if (typeof opts.generation === "function") {
    generation = opts.generation({
      mediaDir,
      mediaUrl: (name) => `/media/${name}`,
      resolveLocal: (ref) => {
        const m = String(ref || "").match(/\/media\/([^/?#]+)/);
        return m ? path.join(mediaDir, path.basename(m[1])) : null;
      },
      getJob: (id) => store.get().jobs.find((j) => j.id === id) || null,
      publicUrl: opts.publicUrl || null,
      toMp4: (ref, span) => film.toMp4(ref, span), // v2v 参考视频必须是 mp4；span 给了就只切这一镜那一段
      publisher: opts.publisher || null,
      fallback: R.simulatedAdapter,
      log,
    });
    if (generation) {
      R.setHooks({ generation });
      log(`generation adapter: ${generation.name}${generation.models ? " (" + Object.entries(generation.models).map(([k, v]) => `${k}→${v}`).join(", ") + ")" : ""}`);
    }
  }

  // ---- film assembler (ffmpeg): the cut, blockout or generated, into one file under mediaDir ----
  const film = createFilmAssembler({ ffmpeg: opts.ffmpeg, mediaDir, mediaUrl: (name) => `/media/${name}`, log });
  R.setHooks({ film, deferAgentCapture: true });
  log(film.ready ? `film assembler: ffmpeg (${film.bin})` : "film assembler: 没有能跑的 ffmpeg —— 桌面端随包自带一份；单独跑后端用 --ffmpeg 指定，或 brew install ffmpeg");

  // ---- 自动验收：抽帧 + 多模态模型对比新旧两版 ----
  if (opts.judgeKey) {
    const judge = createJudge({ apiKey: opts.judgeKey, baseUrl: opts.judgeBase, model: opts.judgeModel, ffmpeg: film.bin, mediaDir, log });
    R.setHooks({ judge });
    log(`verify judge: ${judge.model}${judge.ready ? "" : "（缺密钥或 ffmpeg，review.verify 会提示）"}`);
  }

  // ---- 参照读取：图 / 视频 → 拍摄参数（入口比"说一句话"低得多）----
  // 条件不满足也要把它挂上：挂着才说得出缺的是哪一样。以前缺一样就整个不挂，
  // 上层只能给一句「要网关密钥和 ffmpeg」，而缺的常常只有其中一个。
  const reference = createReferenceReader({ apiKey: opts.judgeKey || null, baseUrl: opts.judgeBase, model: opts.referenceModel || opts.judgeModel, frames: film.ready ? (ref, o) => film.frames(ref, o) : null, log });
  R.setHooks({ reference });
  log(reference.ready ? `reference reader: ${reference.model}` : `reference reader: 还不能读 —— 缺 ${reference.missing.join("、")}`);

  // ---- 进料口：链接 → 本地素材。复刻一条片子的第一步 ----
  // 下载器不在机器上也不拦着：直链走普通 HTTP，页面链接第一次用时自己取一份 yt-dlp
  // 到 toolsDir（默认在媒体目录旁边），校验和核对过再落盘。装 brew 不该是第一步。
  const toolsDir = opts.toolsDir || (mediaDir ? path.join(path.dirname(path.resolve(mediaDir)), "tools") : null);
  const fetcher = createFetcher({ ytdlp: opts.ytdlp === "none" ? null : opts.ytdlp, system: opts.ytdlp !== "none", ytdlpUrl: opts.ytdlpUrl, toolsDir, ffmpeg: film.bin, mediaDir, mediaUrl: (name) => `/media/${name}`, log });
  R.setHooks({ fetcher });
  log(fetcher.hasBin
    ? `link fetcher: yt-dlp (${fetcher.bin})${fetcher.ffmpeg ? ` + ffmpeg ${fetcher.ffmpeg}` : " · 没找到 ffmpeg，分轨的站点会退到单文件格式"}`
    : `link fetcher: 机器上没有 yt-dlp —— 直链直接下；页面链接第一次用时自动取一份到 ${toolsDir || "(无工具目录)"}`);

  // ---- LLM planner (Agent Director backend) ----
  let planner = null;
  if (typeof opts.llm === "function") {
    planner = opts.llm({ log });
    if (planner) {
      log(`llm planner: ${planner.name} @ ${planner.baseUrl} default ${planner.model} (${(planner.models || []).join(", ")})`);
      store.patch((x) => (x.agent.backend = planner.model));
      store.light((x) => (x.health.llm = planner.model));
      // 规划器也是一个可替换的能力：reference.replicate 这类要「先理解再建场」的 Action
      // 通过这个 hook 去用它，而不是让界面按顺序去点。换掉 planner，那条链照样成立。
      R.setHooks({
        planner: {
          name: planner.name,
          ready: true,
          model: planner.model,
          build: (brief, meta = {}) => runAgentLlm({ text: brief, mode: "lead", force: true }, normalizeMeta(meta, { source: "agent", actorId: "replicate" })),
        },
      });
    }
  }

  // ---- bootstrap ----
  let loaded = false;
  if (projectFile && fs.existsSync(projectFile)) {
    try {
      loadProjectData(JSON.parse(fs.readFileSync(projectFile, "utf8")));
      loaded = true;
      log(`project loaded ← ${projectFile} (${store.get().project.name}, ${store.get().shots.length} shots)`);
    } catch (err) {
      log(`project load failed (${err.message}); starting from demo`);
    }
  }
  if (!loaded) {
    const demo = opts.demo === undefined ? "city-edge" : opts.demo;
    if (demo) dispatch("scene.demo", { name: demo }, { source: "system", actorId: "scene-builder" });
  }

  // ---- snapshot / broadcast ----
  function snapshot(eventsLimit = 120) {
    // 截断交给 persistable：先拷 200 条再切掉 80 条，等于每次广播白拷一遍
    const s = persistable(store.get(), { events: eventsLimit });
    s.agent = structuredClone(store.get().agent);
    s.history = historyInfo();
    return s;
  }
  function version() {
    return store.get().project.version;
  }

  // One Action mutates the store more than once (state patch, then event log); broadcasts are coalesced per tick
  // so subscribers get a single frame per Action that already carries the event.
  let flushQueued = false;
  store.subscribe((d, info) => {
    if (info?.light) return; // transport / health only
    dirty = true;
    scheduleSave();
    if (flushQueued) return;
    flushQueued = true;
    queueMicrotask(flush);
  });
  // 「模型在想什么」：不进工程状态、不进撤销栈、不 bump version —— 只是一路推给所有页面看。
  function emitThinking(thinking) {
    const msg = { seq: ++broadcastSeq, thinking };
    for (const fn of subscribers) {
      try { fn(msg); } catch (err) { log(`subscriber error ${err.message}`); }
    }
  }

  // 能力变了也要推一帧。隧道是后端起来之后几十秒才建好的，而页面只在连上后端的那一刻
  // 问过一次 /api/health —— 不推的话，v2v 在界面上永远是灰的「需要公网地址」，
  // 而后端其实早就能做了。不进工程状态、不 bump version、不进事件日志。
  function announceHealth() {
    const msg = { seq: ++broadcastSeq, health: health() };
    for (const fn of subscribers) {
      try { fn(msg); } catch (err) { log(`subscriber error ${err.message}`); }
    }
  }

  function flush() {
    flushQueued = false;
    const d = store.get();
    const event = d.events[0] && d.events[0].id !== lastEventId ? d.events[0] : null;
    if (event) lastEventId = event.id;
    const msg = { seq: ++broadcastSeq, version: d.project.version, state: d.project.currentState, event: event && compactEvent(event), snapshot: snapshot() };
    for (const fn of subscribers) {
      try {
        fn(msg);
      } catch (err) {
        log(`subscriber error ${err.message}`);
      }
    }
  }

  // generation jobs → conversation: one message per finished job, media attached
  const announced = new Map();
  store.subscribe((d, info) => {
    if (info?.light) return;
    for (const j of d.jobs) {
      const prev = announced.get(j.id);
      if (prev === undefined) {
        announced.set(j.id, j.status);
        continue;
      }
      if (prev === j.status) continue;
      announced.set(j.id, j.status);
      if (!["done", "failed"].includes(j.status)) continue;
      const shot = d.shots.find((s) => s.id === j.shotId);
      const label = `${shot ? shot.index + " " + shot.title : j.shotId} · ${j.model} · ${j.mode}`;
      queueMicrotask(() => {
        if (j.status === "done" && j.result?.url) R.say("agent", `${label} 生成完成。看完直接说要改什么：人物外观、站位、灯光、运镜，我改好后可以再生成一次。`, { media: { url: j.result.url, kind: j.result.kind || "video" }, jobId: j.id, shotId: j.shotId });
        else if (j.status === "done") R.say("agent", `${label} 结束（模拟队列，没有输出）。`, { jobId: j.id });
        else R.say("agent", `${label} 生成失败：${String(j.error || "").slice(0, 200)}`, { jobId: j.id, shotId: j.shotId });
      });
    }
  });

  function compactEvent(e) {
    return { id: e.id, action: e.action, source: e.source, actorId: e.actorId, ok: e.ok, targetIds: e.targetIds, timestamp: e.timestamp, ms: e.ms, undoable: e.undoable };
  }

  // ---- persistence ----
  function scheduleSave() {
    if (!projectFile) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, autosaveMs);
  }
  function save() {
    if (!projectFile) return { ok: false, error: "NO_PROJECT_FILE" };
    clearTimeout(saveTimer);
    fs.mkdirSync(path.dirname(projectFile), { recursive: true });
    const tmp = `${projectFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(persistable(store.get()), null, 2));
    fs.renameSync(tmp, projectFile);
    dirty = false;
    lastSavedAt = new Date().toISOString();
    return { ok: true, file: projectFile, savedAt: lastSavedAt };
  }

  // ---- actions ----
  function normalizeMeta(meta = {}, defaults = {}) {
    const m = { ...defaults, ...meta };
    if (!m.source) m.source = "api";
    if (!m.actorId) m.actorId = m.actor || "api-client";
    delete m.actor;
    return m;
  }

  function run(action, payload = {}, meta = {}) {
    const m = normalizeMeta(meta);
    const r = dispatch(action, payload || {}, m);
    if (action === "take.record" && r.ok && r.awaiting === "client") armWatchdog(r.id, r.frames, r.fps, m);
    if ((action === "take.finish" || action === "take.stop") && r.ok) disarmWatchdog(r.id);
    return clean(r);
  }

  function invoke(msg) {
    if (Array.isArray(msg.batch)) {
      const shared = normalizeMeta(msg.meta || {});
      const results = msg.batch.map((b) => (b && b.action ? run(b.action, b.payload || {}, { ...shared, ...(b.meta || {}) }) : { ok: false, error: "MISSING_ACTION" }));
      return { ok: results.every((x) => x.ok), results, version: version() };
    }
    if (!msg.action) return { ok: false, error: "MISSING_ACTION" };
    return { ...run(msg.action, msg.payload || {}, msg.meta || {}), version: version() };
  }

  // agent.run through the LLM planner (async). Falls back to the rule planner on any failure.
  async function runAgentLlm(payload, meta) {
    const text = String(payload.text || "").trim();
    if (!text) return { ok: false, error: "MISSING_PARAM", missing: ["text"] };
    const d = store.get();
    const model = payload.backend || d.agent.backend;
    const mode = payload.mode || d.agent.mode;
    const history = d.agent.messages.filter((m) => m.role === "user" || m.role === "agent").slice(-8).map((m) => ({ role: m.role, text: m.text }));
    R.say("user", text);
    store.patch((x) => (x.agent.busy = true));
    const t0 = Date.now();
    let p;
    try {
      p = await planner.plan(text, {
        capabilities: capabilities(),
        summary: R.summarize(),
        history,
        model,
        onDelta: (d) => emitThinking({ model, phase: "planning", reasoning: d.reasoning ? d.reasoning.slice(-4000) : "", steps: d.steps || [], chars: (d.content || "").length }),
      });
    } catch (err) {
      // 体验码那一头的失败不是「模型不行」：额度用完、码被停用、码填错了。
      // 包在「LLM 调用失败」里再塞一段 JSON，人看到的就是一句读不懂的话 + 一句「没听懂」，
      // 而真正该做的事（换个码、找发码的人要额度）一个字都没说。
      const trial = trialReason(err);
      log(`llm failed (${err.code || ""} ${err.message}); falling back to rules`);
      emitThinking({ model, phase: "failed", error: String(trial || err.message).slice(0, 200) });
      store.patch((x) => (x.agent.busy = false));
      R.say("agent", trial ? `${trial}。规划先改用内置规则规划器 —— 它不花额度，但听不懂复杂的话。` : `LLM（${model}）调用失败：${String(err.message).slice(0, 160)}。改用内置规则规划器。`);
      const rp = R.plan(text, store.get());
      const out = R.runPlan({ ...rp, text }, { mode, force: payload.force === true, source: "agent" });
      return { ok: true, backend: "rules", fallback: true, error_llm: trial || err.message, trial: !!trial, plan: out?.plan?.steps, notes: out?.plan?.notes, results: out?.results?.map((r) => ({ action: r.step.action, ok: r.result.ok, id: r.result.id, error: r.result.error, captureShotId: r.result.captureShotId })), pending: !!out?.pending };
    }
    emitThinking({ model, phase: "executing", reasoning: p.reasoning ? p.reasoning.slice(-4000) : "", steps: p.steps.map((s) => s.label || s.action), chars: 0 });
    store.patch((x) => (x.agent.busy = false));
    // 思考过程作为独立一条消息（role "thinking"）插在计划前面，页面默认折叠，点开随时回看。
    // 不复用 agent 消息，否则会和 runPlan 自己说的 reply 重复。
    if (p.reasoning || p.steps.length)
      R.say("thinking", p.reasoning || "", {
        thinking: {
          model: p.model,
          ms: p.ms,
          reasoning: p.reasoning || "",
          steps: p.steps.map((x) => ({ action: x.action, label: x.label, role: x.role })),
          notes: p.notes || [],
          usage: p.usage ? { total: p.usage.total_tokens, reasoning: p.usage.completion_tokens_details?.reasoning_tokens || 0 } : null,
        },
      });
    // planner 要反问：先把问题摆出来，等导演选完再规划。不自作主张往下做。
    if (p.ask?.length && !p.steps.length) {
      store.patch((x) => (x.agent.suggest = p.suggest || []));
      R.say("ask", p.reply || "", { ask: p.ask, notes: p.notes });
      return { ok: true, backend: p.model, ms: Date.now() - t0, usage: p.usage, reply: p.reply, ask: p.ask, notes: p.notes, suggest: p.suggest, pending: true };
    }
    // 下一步建议来自 planner 对当前工程的判断，不是写死的几句
    store.patch((x) => (x.agent.suggest = p.suggest || []));
    const planObj = { text, steps: p.steps, notes: p.notes, needsConfirm: p.needsConfirm, reply: p.reply, model: p.model };
    const out = R.runPlan(planObj, { mode, force: payload.force === true, source: "agent" });
    emitThinking({ model, phase: "done" });
    return { ok: true, backend: p.model, ms: Date.now() - t0, usage: p.usage, reasoning: p.reasoning || "", suggest: p.suggest, reply: p.reply, plan: p.steps.map((s) => ({ action: s.action, payload: s.payload, label: s.label, role: s.role })), notes: p.notes, results: out?.results?.map((r) => ({ action: r.step.action, ok: r.result.ok, id: r.result.id, error: r.result.error, captureShotId: r.result.captureShotId })), pending: !!out?.pending };
  }

  async function invokeAsync(msg) {
    if (msg.action === "agent.run" && planner && (msg.payload?.backend || store.get().agent.backend) !== "rules") {
      const m = normalizeMeta(msg.meta || {}, { source: "agent" });
      const r = await runAgentLlm(msg.payload || {}, m);
      return { ...clean(r), action: "agent.run", version: version() };
    }
    return invoke(msg);
  }

  // A capturing client must finish the take within shot length + grace; otherwise the host finishes it headless.
  function armWatchdog(takeId, frames, fps, meta) {
    disarmWatchdog(takeId);
    const ms = Math.round(((frames || 96) / (fps || 24)) * 1000) + (meta.captureGraceMs || 20000);
    recordingWatch.set(
      takeId,
      setTimeout(() => {
        recordingWatch.delete(takeId);
        const t = store.get().takes.find((x) => x.id === takeId);
        if (t && t.status === "recording") {
          log(`take ${takeId}: client never finished, closing headless`);
          dispatch("take.finish", { id: takeId, log: [{ t: 0, msg: "roll" }, { t: frames || 0, msg: "watchdog: client did not finish" }] }, { source: "system", actorId: "host-watchdog" });
        }
      }, ms).unref?.() ?? undefined,
    );
  }
  function disarmWatchdog(takeId) {
    const t = recordingWatch.get(takeId);
    if (t) clearTimeout(t);
    recordingWatch.delete(takeId);
  }

  // ---- media (proxy videos / thumbnails uploaded by browser clients) ----
  const MEDIA_EXT = { "model/gltf-binary": ".glb", "video/webm": ".webm", "video/mp4": ".mp4", "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" };
  function saveMedia(takeId, buffer, mime = "video/webm") {
    const take = store.get().takes.find((t) => t.id === takeId);
    if (!take) return { ok: false, error: "TAKE_NOT_FOUND" };
    const ext = MEDIA_EXT[mime.split(";")[0].trim()] || ".bin";
    const name = `${takeId}${ext}`;
    fs.mkdirSync(mediaDir, { recursive: true });
    fs.writeFileSync(path.join(mediaDir, name), buffer);
    return { ok: true, id: takeId, url: `/media/${name}`, bytes: buffer.length, mime };
  }
  // 参照素材不属于任何 Take，所以要一条不绑 take 的上传通道。
  // 文件名由后端生成，绝不用客户端给的名字 —— 那是路径穿越最常见的入口。
  function saveUpload(buffer, mime = "application/octet-stream", label = "ref") {
    const ext = MEDIA_EXT[mime.split(";")[0].trim()] || (/^video\//.test(mime) ? ".mp4" : /^image\//.test(mime) ? ".jpg" : ".bin");
    const name = `${String(label).replace(/[^a-z0-9]/gi, "").slice(0, 12) || "ref"}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${ext}`;
    fs.mkdirSync(mediaDir, { recursive: true });
    fs.writeFileSync(path.join(mediaDir, name), buffer);
    return { ok: true, url: `/media/${name}`, bytes: buffer.length, mime };
  }

  function mediaPath(name) {
    const safe = path.basename(name);
    const abs = path.join(mediaDir, safe);
    return fs.existsSync(abs) ? abs : null;
  }

  function clean(r) {
    // keep results JSON-safe (no blobs / huge data URLs leak from the headless runtime, but be defensive)
    try {
      return JSON.parse(JSON.stringify(r, (k, v) => (typeof v === "string" && v.startsWith("data:image") && v.length > 200_000 ? "[dataURL]" : v)));
    } catch {
      return { ok: !!r?.ok, error: r?.error, note: "unserializable result" };
    }
  }

  function health(extra = {}) {
    const d = store.get();
    return {
      ok: true,
      service: SERVER_VERSION,
      runtime: RUNTIME_VERSION,
      project: { id: d.project.id, name: d.project.name, version: d.project.version, state: d.project.currentState, scene: d.scene.name, shots: d.shots.length, takes: d.takes.length, jobs: d.jobs.length },
      persistence: { file: projectFile, dirty, lastSavedAt },
      media: { dir: mediaDir },
      // 贴链接这条路能不能走：ffmpeg 有没有、下载器在哪（自己装的那一份也算），装在哪个目录
      tools: { ffmpeg: film.bin || null, ytdlp: fetcher.bin || null, ytdlpManaged: !!fetcher.bin && fetcher.bin === (toolsDir ? path.join(toolsDir, "yt-dlp") : null), toolsDir },
      reference: { ready: reference.ready, model: reference.model, missing: reference.missing },
      generation: generation ? { name: generation.name, models: generation.models || {}, fallback: "simulated", publisher: opts.publisher?.kind || "none", publicUrl: (typeof opts.publicUrl === "function" ? opts.publicUrl() : opts.publicUrl) || null, tunnelError: (typeof opts.tunnelError === "function" ? opts.tunnelError() : opts.tunnelError) || null, tunnel: (typeof opts.tunnelState === "function" ? opts.tunnelState() : opts.tunnelState) || "off" } : { name: "simulated", models: {} },
      llm: planner ? { name: planner.name, baseUrl: planner.baseUrl, model: planner.model, models: planner.models, current: d.agent.backend } : { name: "rules", models: [], current: "rules" },
      recording: d.project.recording || null,
      ...extra,
    };
  }

  return {
    R,
    store,
    run,
    invoke,
    invokeAsync,
    snapshot,
    version,
    save,
    health,
    announceHealth,
    capabilities,
    saveMedia,
    saveUpload,
    mediaPath,
    mediaDir,
    projectFile,
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    get subscribers() {
      return subscribers.size;
    },
    close() {
      for (const t of recordingWatch.values()) clearTimeout(t);
      recordingWatch.clear();
      if (dirty && projectFile) save();
    },
  };
}
