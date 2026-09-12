// RuntimeHost — the backend's authoritative Director Runtime.
// Owns one core runtime instance (Source of Truth), persists it to a project file, stores take media,
// and broadcasts every state change to subscribers (SSE clients). No HTTP here: see api.mjs.
import fs from "node:fs";
import path from "node:path";
import * as R from "../../core/index.js";
import { createFilmAssembler } from "./film.mjs";
import { createJudge } from "./adapters/judge.mjs";

const { store, dispatch, persistable, loadProjectData, capabilities, historyInfo, RUNTIME_VERSION } = R;

export const SERVER_VERSION = "director-server/0.5";

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
  R.setHooks({ film });
  log(film.ready ? `film assembler: ffmpeg (${film.bin})` : "film assembler: ffmpeg NOT FOUND — film.export 会提示安装（brew install ffmpeg）");

  // ---- 自动验收：抽帧 + 多模态模型对比新旧两版 ----
  if (opts.judgeKey) {
    const judge = createJudge({ apiKey: opts.judgeKey, baseUrl: opts.judgeBase, model: opts.judgeModel, ffmpeg: film.bin, mediaDir, log });
    R.setHooks({ judge });
    log(`verify judge: ${judge.model}${judge.ready ? "" : "（缺密钥或 ffmpeg，review.verify 会提示）"}`);
  }

  // ---- LLM planner (Agent Director backend) ----
  let planner = null;
  if (typeof opts.llm === "function") {
    planner = opts.llm({ log });
    if (planner) {
      log(`llm planner: ${planner.name} @ ${planner.baseUrl} default ${planner.model} (${(planner.models || []).join(", ")})`);
      store.patch((x) => (x.agent.backend = planner.model));
      store.light((x) => (x.health.llm = planner.model));
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
    const s = persistable(store.get());
    s.events = s.events.slice(0, eventsLimit);
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
      log(`llm failed (${err.code || ""} ${err.message}); falling back to rules`);
      emitThinking({ model, phase: "failed", error: String(err.message).slice(0, 200) });
      store.patch((x) => (x.agent.busy = false));
      R.say("agent", `LLM（${model}）调用失败：${String(err.message).slice(0, 160)}。改用内置规则规划器。`);
      const rp = R.plan(text, store.get());
      const out = R.runPlan({ ...rp, text }, { mode, force: payload.force === true, source: "agent" });
      return { ok: true, backend: "rules", fallback: true, error_llm: err.message, plan: out?.plan?.steps, notes: out?.plan?.notes, results: out?.results?.map((r) => ({ action: r.step.action, ok: r.result.ok, id: r.result.id, error: r.result.error })), pending: !!out?.pending };
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
    return { ok: true, backend: p.model, ms: Date.now() - t0, usage: p.usage, reasoning: p.reasoning || "", suggest: p.suggest, reply: p.reply, plan: p.steps.map((s) => ({ action: s.action, payload: s.payload, label: s.label, role: s.role })), notes: p.notes, results: out?.results?.map((r) => ({ action: r.step.action, ok: r.result.ok, id: r.result.id, error: r.result.error })), pending: !!out?.pending };
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
  const MEDIA_EXT = { "video/webm": ".webm", "video/mp4": ".mp4", "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" };
  function saveMedia(takeId, buffer, mime = "video/webm") {
    const take = store.get().takes.find((t) => t.id === takeId);
    if (!take) return { ok: false, error: "TAKE_NOT_FOUND" };
    const ext = MEDIA_EXT[mime.split(";")[0].trim()] || ".bin";
    const name = `${takeId}${ext}`;
    fs.mkdirSync(mediaDir, { recursive: true });
    fs.writeFileSync(path.join(mediaDir, name), buffer);
    return { ok: true, id: takeId, url: `/media/${name}`, bytes: buffer.length, mime };
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
      generation: generation ? { name: generation.name, models: generation.models || {}, fallback: "simulated", publisher: opts.publisher?.kind || "none", publicUrl: (typeof opts.publicUrl === "function" ? opts.publicUrl() : opts.publicUrl) || null } : { name: "simulated", models: {} },
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
    capabilities,
    saveMedia,
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
