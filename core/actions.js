// Action Registry — the single command surface shared by the Web UI, the CLI, the Agent and the HTTP bridge.
// Nothing here touches the DOM or Three.js. Every mutation of the Source of Truth goes through dispatch().
import {
  store,
  emitEvent,
  canRun,
  pushHistory,
  popHistory,
  clearHistory,
  undo,
  redo,
  undoToEvent,
  historyInfo,
  persistable,
  loadProjectData,
  createEmptyProject,
  resetAgent,
} from "./store.js";
import {
  uid,
  transform,
  focalToFov,
  clamp,
  SEMANTIC_PROXY,
  SEMANTIC_TYPES,
  POSES,
  JOINT_NAMES,
  JOINT_LIMITS,
  LIGHT_PRESETS,
  LIGHT_TYPES,
  MOTION_TYPES,
  MOTION_TYPE_LIST,
  SHOT_SIZES,
  COVERAGE_ANGLES,
  CAMERA_RIGS,
  STATE_MACHINE,
  STATE_RULES,
  PROVIDERS,
  GEN_MODES,
  ASPECTS,
  FIDELITY,
  LOCK_ASPECTS,
  ASSET_ROLES,} from "./schema.js";
import { attachPrompts, compileShot } from "./prompts.js";
import { MODEL_LIBRARY, ROOM_PATTERNS } from "./schema.js";
import { cameraStateAt, entityStateAt, sequenceLayout } from "./motion.js";

export const RUNTIME_VERSION = "director-runtime/0.4";
export const SHOT_STATUSES = ["draft", "blocking", "rehearsal", "recorded", "review", "approved"];
export const CARD_STATUSES = ["empty", "blocked", "prompted", "generated", "approved"];

const registry = new Map();
const idempotency = new Map();
let batchDepth = 0;
const hooks = { recorder: null, generation: null, capture: null, film: null, judge: null, clock: () => (typeof performance !== "undefined" ? performance.now() : Date.now()) };

// Host integrations (browser recorder, generation adapters). Absent in the CLI: actions degrade gracefully.
export function setHooks(h) {
  Object.assign(hooks, h);
}
export function getHooks() {
  return hooks;
}

export function register(name, def) {
  if (typeof def === "function") def = { handler: def };
  registry.set(name, { undoable: true, doc: "", params: {}, ...def });
}

export function listActions() {
  return [...registry.keys()].sort();
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

function domainKind(name) {
  const dom = name.split(".")[0];
  return { entity: "entities", camera: "cameras", light: "lights", shot: "shots", take: "takes", storyboard: "storyboard", generation: "jobs" }[dom] || null;
}

function snapshotFor(name, id, d) {
  const coll = domainKind(name);
  if (coll && id) {
    const obj = (d[coll] || []).find((x) => x.id === id);
    return obj ? structuredClone(obj) : null;
  }
  if (name.startsWith("scene.")) return structuredClone(d.scene);
  if (name.startsWith("project.")) return { state: d.project.currentState, fidelity: d.project.fidelity, name: d.project.name, aspect: d.project.aspect };
  return null;
}

// 已锁的镜头 = 导演说过「这一块我满意了」。任何会动到它的 Action 在这里被拦下来，
// 不管来自界面、CLI 还是 Agent —— 拦在 dispatch 而不是每个 handler 里，才不会有漏网的入口。
// 想改就先解锁，或者显式带 force（force 会记进事件日志，事后查得到是谁越过的）。
function lockedBy(name, payload, d) {
  const hits = [];
  const id = payload.id ?? payload.shotId ?? payload.entityId ?? null;
  for (const shot of d.shots) {
    for (const aspect of shot.locks?.aspects || []) {
      const def = LOCK_ASPECTS[aspect];
      if (!def || !def.guards.includes(name)) continue;
      // 这个 Action 有没有动到这一镜，按 aspect 的性质判断：
      //   scene      灯光 / 色彩 / 背景是全场的，任何一次改动都落在每个镜头上
      //   subject    只有动到这一镜的被摄主体才算
      //   camera     只有动到这一镜的机位（或点名这一镜）才算
      //   any-entity 前景遮挡可能是任何物体，动到场里的实体就算
      const scoped =
        def.scope === "scene" ? true
        : def.scope === "camera" ? payload.shotId === shot.id || id === shot.cameraId || id === shot.id
        : def.scope === "subject" ? !!id && shot.targetIds.includes(id)
        : /* any-entity */ !!id && d.entities.some((e) => e.id === id);
      if (scoped) hits.push({ shotId: shot.id, title: shot.title, aspect, zh: def.zh });
    }
  }
  return hits;
}

export function dispatch(name, payload = {}, meta = {}) {
  const t0 = hooks.clock();
  const source = meta.source || "human";
  const def = registry.get(name);
  const fail = (error, extra = {}) => {
    const res = { ok: false, error, action: name, ...extra };
    if (!meta.silent) logEvent({ action: name, source, actorId: meta.actorId, payload, after: res, undoable: false, ok: false, ms: hooks.clock() - t0 });
    return res;
  };
  if (!def) return { ok: false, error: "UNKNOWN_ACTION", action: name, hint: `try one of: ${listActions().slice(0, 12).join(", ")} …` };
  if (!canRun(name)) return fail("STATE_FORBIDDEN", { state: store.get().project.currentState, hint: `allowed in ${STATE_MACHINE.filter((s) => canRun(name, s)).join("/")}` });
  if (!meta.force) {
    const locks = lockedBy(name, payload, store.get());
    if (locks.length)
      return fail("LOCKED", {
        locks,
        hint: `${locks.map((l) => `${l.shotId}「${l.title}」锁了${l.zh}`).join("；")}。要改就先 shot.unlock，或带 force 越过（会记进事件日志）。`,
      });
  }
  if (meta.idempotencyKey && idempotency.has(meta.idempotencyKey)) return { ...idempotency.get(meta.idempotencyKey), replay: true };
  const missing = (def.required || []).filter((k) => payload[k] === undefined || payload[k] === null || payload[k] === "");
  if (missing.length) return fail("MISSING_PARAM", { missing, params: def.params });
  if (def.validate) {
    const v = def.validate(payload, store.get());
    if (v) return fail(v.error || "INVALID", v);
  }
  if (meta.dryRun) {
    return { ok: true, dryRun: true, action: name, payload, doc: def.doc, undoable: def.undoable, wouldAffect: def.targets ? def.targets(payload, store.get()) : [payload.id].filter(Boolean) };
  }
  const eventId = uid("evt");
  const before = snapshotFor(name, payload.id, store.get());
  const pushed = def.undoable && batchDepth === 0;
  if (pushed) pushHistory(name, eventId);
  let result;
  try {
    result = def.handler(payload, meta) || { ok: true };
  } catch (err) {
    result = { ok: false, error: "HANDLER_ERROR", message: String(err?.message || err) };
  }
  if (result.ok === undefined) result.ok = true;
  if (!result.ok && pushed) popHistory();
  const targetIds = result.targetIds || [result.id || payload.id].filter(Boolean);
  const after = result.ok ? snapshotFor(name, result.id || payload.id, store.get()) : result;
  const ms = Math.round((hooks.clock() - t0) * 10) / 10;
  if (!meta.silent) logEvent({ id: eventId, action: name, source, actorId: meta.actorId, payload, targetIds, before, after, forced: meta.force ? lockedBy(name, payload, store.get()).map((l) => `${l.shotId}:${l.aspect}`) : undefined, undoable: !!(def.undoable && result.ok && batchDepth === 0), ok: result.ok, ms, batch: batchDepth > 0 ? meta.batchLabel : undefined });
  store.light((d) => {
    d.health.lastCommandMs = ms;
    d.health.commands = (d.health.commands || 0) + 1;
  });
  const out = { ...result, action: name, eventId, ms };
  if (meta.idempotencyKey) idempotency.set(meta.idempotencyKey, out);
  return out;
}

function logEvent(partial) {
  store.patch(() => {}, emitEvent(partial));
}

// Group many actions into one undo step + one summary event. Used by demos, presets and agent plans.
export function batch(label, fn, meta = {}) {
  const eventId = uid("evt");
  if (batchDepth === 0) pushHistory(label, eventId);
  batchDepth += 1;
  const t0 = hooks.clock();
  let out;
  try {
    out = fn({ ...meta, batchLabel: label });
  } finally {
    batchDepth -= 1;
  }
  if (batchDepth === 0) logEvent({ id: eventId, action: "batch", source: meta.source || "human", actorId: meta.actorId, payload: { label, actions: out?.count ?? undefined }, undoable: true, ok: true, ms: Math.round(hooks.clock() - t0) });
  return out;
}

export function inBatch() {
  return batchDepth > 0;
}

// -------- helpers --------
const D = () => store.get();
const fps = () => D().project.fps;

function select(kind, id) {
  store.patch((d) => {
    d.project.selectedKind = kind;
    d.project.selectedId = id;
  });
}

function poseJoints(pose = "idle", extra = {}) {
  const base = { ...POSES.idle, ...(POSES[pose] || {}) };
  const out = {};
  for (const j of JOINT_NAMES) {
    const v = extra[j] ?? base[j] ?? 0;
    const [lo, hi] = JOINT_LIMITS[j];
    out[j] = clamp(Number(v) || 0, lo, hi);
  }
  return out;
}

function subjectSize(ent) {
  const d = ent?.proxy?.dimensions || [1, 1, 1];
  return { h: d[1] || 1, max: Math.max(...d) };
}

// Keep a camera's live pose in the shots that are still editable (current shot + drafts).
function syncShotsForCamera(d, camId) {
  const cam = d.cameras.find((c) => c.id === camId);
  if (!cam) return;
  for (const s of d.shots) {
    if (s.cameraId !== camId) continue;
    if (s.id !== d.project.currentShotId && !["draft", "blocking", "rehearsal"].includes(s.status)) continue;
    s.cameraPose = structuredClone(cam.pose);
    s.lens = structuredClone(cam.lens);
    if (cam.target) {
      const rest = (s.targetIds || []).filter((t) => t !== cam.target);
      s.targetIds = [cam.target, ...rest];
    }
  }
}

function refreshUsedBy(d) {
  const map = new Map();
  for (const s of d.shots) for (const t of s.targetIds || []) map.set(t, [...(map.get(t) || []), s.id]);
  for (const e of d.entities) e.usedByShots = map.get(e.id) || [];
}

function cardStatus(card, shot, d) {
  if (card.status === "approved") return "approved";
  if ((card.generatedAssetIds || []).length) return "generated";
  if (shot?.videoPrompt || shot?.imagePrompt) return "prompted";
  if (card.selectedTake || (card.keyframes || []).length) return "blocked";
  return "empty";
}

function nextIndex(d) {
  const nums = d.shots.map((s) => parseInt(s.index, 10)).filter((n) => !isNaN(n));
  return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, "0");
}

function parseVec(v, fallback) {
  if (Array.isArray(v)) return v.map(Number);
  if (typeof v === "string") return v.split(/[,\s]+/).filter(Boolean).map(Number);
  return fallback;
}

function tc(frame, f = fps()) {
  const total = Math.max(0, Math.floor(frame));
  const ff = total % f;
  const s = Math.floor(total / f);
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}:${String(ff).padStart(2, "0")}`;
}
export { tc as timecode };

// ============ project.* ============
register("project.new", {
  doc: "新建空工程（清空场景、镜头、Take、故事版）",
  params: { name: "string", fps: "24|25|30|50|60", aspect: "16:9|2.39:1|1.85:1|4:3|9:16|1:1" },
  handler({ name, fps: f, aspect }) {
    const base = createEmptyProject();
    base.project.name = name || "Untitled Stage";
    if (f) base.project.fps = Number(f);
    if (aspect && ASPECTS[aspect]) base.project.aspect = aspect;
    base.agent = resetAgent(D().agent); // 新工程给一条干净的对话，只留下模式与规划后端
    base.health = D().health;
    clearHistory();
    store.set(base, null, { loaded: true });
    return { ok: true, id: base.project.id };
  },
});

register("project.rename", { doc: "重命名工程", params: { name: "string" }, required: ["name"], handler: ({ name }) => store.patch((d) => (d.project.name = name)) });

register("project.set-state", {
  doc: "切换导演状态机 EDIT/BLOCKING/REHEARSAL/ARMED/RECORDING/REVIEW/GENERATING/APPROVED",
  params: { state: STATE_MACHINE.join("|") },
  required: ["state"],
  validate: ({ state }) => (STATE_MACHINE.includes(state) ? null : { error: "BAD_STATE", allowed: STATE_MACHINE }),
  handler: ({ state }) => store.patch((d) => (d.project.currentState = state)),
});

register("project.set-fidelity", {
  doc: "切换保真度：blockout 白模语义 / stylized 形态可读。只改投影，不改语义数据",
  params: { fidelity: "blockout|stylized" },
  required: ["fidelity"],
  validate: ({ fidelity }) => (FIDELITY[fidelity] ? null : { error: "BAD_FIDELITY", allowed: Object.keys(FIDELITY) }),
  handler: ({ fidelity }) => store.patch((d) => (d.project.fidelity = fidelity)),
});

register("project.set-fps", { doc: "设置帧率", params: { fps: "number" }, required: ["fps"], handler: ({ fps: f }) => store.patch((d) => (d.project.fps = Number(f))) });
register("project.set-aspect", {
  doc: "设置画幅",
  params: { aspect: Object.keys(ASPECTS).join("|") },
  required: ["aspect"],
  validate: ({ aspect }) => (ASPECTS[aspect] ? null : { error: "BAD_ASPECT", allowed: Object.keys(ASPECTS) }),
  handler: ({ aspect }) => store.patch((d) => (d.project.aspect = aspect)),
});
register("project.set-style", { doc: "设置生成风格描述（进入提示词）", params: { style: "string (en)", styleZh: "string (zh)" }, handler: ({ style, styleZh }) => store.patch((d) => { if (style !== undefined) d.project.style = style; if (styleZh !== undefined) d.project.styleZh = styleZh; }) });
register("project.set-shading", { doc: "视口着色 shaded/clay/wire", params: { mode: "shaded|clay|wire" }, required: ["mode"], undoable: false, handler: ({ mode }) => store.patch((d) => (d.project.shading = mode)) });
register("project.set-build-mode", { doc: "构建模式：set 布景 / blocking 调度", params: { mode: "set|blocking" }, required: ["mode"], undoable: false, handler: ({ mode }) => store.patch((d) => (d.project.buildMode = mode)) });
register("project.set-view", { doc: "视口：free 自由观察 / program 拍摄机", params: { mode: "free|program" }, required: ["mode"], undoable: false, handler: ({ mode }) => store.patch((d) => (d.project.viewMode = mode)) });
register("project.set-gizmo", { doc: "Gizmo 模式", params: { mode: "translate|rotate|scale" }, required: ["mode"], undoable: false, handler: ({ mode }) => store.patch((d) => (d.project.gizmoMode = mode)) });
register("project.select", {
  doc: "在导演台中选中/定位对象",
  params: { kind: "entity|camera|light|shot", id: "string" },
  undoable: false,
  handler({ kind, id }) {
    store.patch((d) => {
      d.project.selectedKind = id ? kind : null;
      d.project.selectedId = id || null;
    });
  },
});

register("project.undo", { doc: "撤销上一步", undoable: false, handler: () => undo() });
register("project.redo", { doc: "重做", undoable: false, handler: () => redo() });
register("project.undo-to", { doc: "撤销到某个事件之前", params: { eventId: "string" }, required: ["eventId"], undoable: false, handler: ({ eventId }) => undoToEvent(eventId) });
register("project.export", { doc: "导出工程 JSON（Source of Truth）", undoable: false, handler: () => ({ ok: true, data: persistable() }) });
register("project.load", {
  doc: "载入工程 JSON",
  params: { data: "object" },
  required: ["data"],
  undoable: false,
  handler({ data }) {
    loadProjectData(typeof data === "string" ? JSON.parse(data) : data);
    return { ok: true, id: D().project.id };
  },
});
register("project.mark-saved", { doc: "标记已自动保存", undoable: false, handler: () => store.light((d) => (d.project.savedAt = new Date().toISOString())) });

// ============ scene.* ============
register("scene.create", {
  doc: "设定场次（名称、环境）。clear=true 时清空现有物体/机位/灯光/镜头",
  params: { id: "string", name: "string", environment: "object", clear: "boolean" },
  handler({ id, name, environment, clear }) {
    const sceneId = id || uid("scene");
    store.patch((d) => {
      d.scene = { id: sceneId, name: name || d.scene.name || "Scene", environment: { ...d.scene.environment, ...(environment || {}) } };
      if (clear) {
        d.entities = [];
        d.cameras = [];
        d.lights = [];
        d.shots = [];
        d.takes = [];
        d.storyboard = [];
        d.jobs = [];
        d.project.programCameraId = null;
        d.project.currentShotId = null;
      }
    });
    return { ok: true, id: sceneId };
  },
});

register("scene.environment", {
  doc: "修改环境：bg 背景色, fog 雾密度, ambient 环境光, sky/ground 半球色, exposure 曝光, wet 湿地面",
  params: { bg: "#hex", fog: "number", ambient: "number", sky: "#hex", ground: "#hex", exposure: "number", wet: "boolean" },
  handler(p) {
    store.patch((d) => {
      for (const k of ["bg", "fog", "ambient", "sky", "ground", "exposure", "wet", "preset"]) if (p[k] !== undefined) d.scene.environment[k] = p[k];
    });
  },
});

register("scene.preset", {
  doc: `套用灯光预设：${Object.keys(LIGHT_PRESETS).join("/")}。替换预设灯，保留 practical 灯`,
  params: { preset: Object.keys(LIGHT_PRESETS).join("|"), keepPractical: "boolean (default true)" },
  required: ["preset"],
  validate: ({ preset }) => (LIGHT_PRESETS[preset] ? null : { error: "BAD_PRESET", allowed: Object.keys(LIGHT_PRESETS) }),
  handler({ preset, keepPractical = true }) {
    const P = LIGHT_PRESETS[preset];
    store.patch((d) => {
      d.lights = d.lights.filter((l) => keepPractical && !l.fromPreset && l.group === "practical");
      d.scene.environment = { ...d.scene.environment, ...P.env, preset };
      for (const l of P.lights) d.lights.push(makeLight({ ...l, fromPreset: true }));
    });
    return { ok: true, id: preset, targetIds: P.lights.map((l) => l.id) };
  },
});

register("scene.room", {
  doc: `摄影棚房间：width/depth/height 米，pattern ${ROOM_PATTERNS.join("/")}（棋盘 / 纯白 / 校准图案），spacing 格距，walls 后墙+侧墙，cyc 圆角回幕；clear=true 拆掉`,
  params: { width: "number", depth: "number", height: "number", pattern: ROOM_PATTERNS.join("|"), spacing: "number", walls: "boolean", cyc: "boolean", color: "#hex", clear: "boolean" },
  handler({ width, depth, height, pattern, spacing, walls, cyc, color, clear }) {
    store.patch((d) => {
      if (clear) {
        delete d.scene.environment.room;
        return;
      }
      const cur = d.scene.environment.room || { width: 8, depth: 12, height: 4, pattern: "standard", spacing: 1, walls: true, cyc: true, color: "#e9e9ec" };
      d.scene.environment.room = { ...cur, ...(width !== undefined && { width: Number(width) }), ...(depth !== undefined && { depth: Number(depth) }), ...(height !== undefined && { height: Number(height) }), ...(pattern && ROOM_PATTERNS.includes(pattern) && { pattern }), ...(spacing !== undefined && { spacing: Number(spacing) }), ...(walls !== undefined && { walls: !!walls }), ...(cyc !== undefined && { cyc: !!cyc }), ...(color && { color }) };
    });
    return { ok: true, room: D().scene.environment.room || null };
  },
});

// ============ entity.* ============
register("entity.create", {
  doc: `创建语义物体。type: ${SEMANTIC_TYPES.join("/")}；proxy 几何 box/sphere/cylinder/capsule/cone/plane；position=接地点`,
  params: { id: "string", type: "semanticType", displayName: "string", proxy: "geometry", color: "#hex", dimensions: "[w,h,d]", position: "[x,y,z]", yaw: "radians", role: "string", aliases: "string[]", continuity: "object", agentMemory: "string[]", pose: Object.keys(POSES).join("|"), assetRef: "string" },
  validate: (p, d) => (p.id && d.entities.some((e) => e.id === p.id) ? { error: "DUPLICATE_ID" } : null),
  handler(p) {
    // glTF model from the library: sets semantic type, default dimensions and assetRef
    const lib = p.model && MODEL_LIBRARY[p.model];
    if (lib) p = { ...p, type: p.type || p.semanticType || lib.type, dimensions: p.dimensions || lib.dims, assetRef: lib.url, displayName: p.displayName || lib.zh };
    const type = SEMANTIC_PROXY[p.type || p.semanticType] ? p.type || p.semanticType : "prop";
    const def = SEMANTIC_PROXY[type];
    const id = p.id || uid(type.slice(0, 3));
    const geometry = p.proxy || p.geometry || def.geometry;
    const ent = {
      id,
      semanticType: type,
      displayName: p.displayName || p.name || id,
      aliases: p.aliases || [],
      role: p.role || "",
      proxy: { geometry, color: p.color || def.color, dimensions: parseVec(p.dimensions, [...def.dimensions]) },
      assetRef: p.assetRef || null,
      transform: transform(parseVec(p.position, [0, 0, 0]), p.rotation ? parseVec(p.rotation) : [0, Number(p.yaw) || 0, 0], p.scale ? parseVec(p.scale) : [1, 1, 1]),
      pose: type === "character" ? p.pose || "idle" : null,
      joints: type === "character" ? poseJoints(p.pose || "idle", p.joints || {}) : null,
      path: p.path || null,
      continuity: p.continuity || {},
      agentMemory: p.agentMemory || [],
      usedByShots: [],
      version: 1,
    };
    store.patch((d) => d.entities.push(ent));
    if (!inBatch()) select("entity", id);
    return { ok: true, id };
  },
});

register("entity.update", {
  doc: "更新语义字段：displayName/role/aliases/continuity(合并)/remember(追加备注)/color/dimensions/assetRef",
  params: { id: "string", displayName: "string", role: "string", aliases: "string[]", continuity: "object", remember: "string", color: "#hex", dimensions: "[w,h,d]", assetRef: "string", geometry: "geometry" },
  required: ["id"],
  validate: ({ id }, d) => (d.entities.some((e) => e.id === id) ? null : { error: "NOT_FOUND" }),
  handler(p) {
    store.patch((d) => {
      const e = d.entities.find((x) => x.id === p.id);
      for (const k of ["displayName", "role", "aliases", "assetRef"]) if (p[k] !== undefined) e[k] = p[k];
      if (p.continuity) e.continuity = { ...e.continuity, ...p.continuity };
      if (p.remember) e.agentMemory = [...e.agentMemory, p.remember].slice(-12);
      if (p.agentMemory) e.agentMemory = p.agentMemory;
      if (p.color) e.proxy.color = p.color;
      if (p.dimensions) e.proxy.dimensions = parseVec(p.dimensions);
      if (p.geometry) e.proxy.geometry = p.geometry;
      e.version += 1;
    });
  },
});

register("entity.transform", {
  doc: "移动/旋转/缩放。position 绝对，delta 相对，yaw 弧度（物体正面朝 +Z）",
  params: { id: "string", position: "[x,y,z]", delta: "[dx,dy,dz]", rotation: "[rx,ry,rz]", yaw: "radians", scale: "[sx,sy,sz]" },
  required: ["id"],
  validate: ({ id }, d) => (d.entities.some((e) => e.id === id) ? null : { error: "NOT_FOUND" }),
  handler({ id, position, delta, rotation, yaw, scale }) {
    store.patch((d) => {
      const e = d.entities.find((x) => x.id === id);
      if (position) e.transform.position = parseVec(position);
      if (delta) {
        const v = parseVec(delta);
        e.transform.position = e.transform.position.map((a, i) => a + (v[i] || 0));
      }
      if (rotation) e.transform.rotation = parseVec(rotation);
      if (yaw !== undefined) e.transform.rotation[1] = Number(yaw);
      if (scale) e.transform.scale = parseVec(scale);
      e.version += 1;
    });
  },
});

register("entity.pose", {
  doc: `设置人物姿态。pose: ${Object.keys(POSES).join("/")}；joints 覆盖单个关节（弧度）：${JOINT_NAMES.join(",")}`,
  params: { id: "string", pose: "poseName", joints: "object" },
  required: ["id"],
  validate: ({ id, pose }, d) => {
    const e = d.entities.find((x) => x.id === id);
    if (!e) return { error: "NOT_FOUND" };
    if (e.semanticType !== "character") return { error: "NOT_A_CHARACTER" };
    if (pose && !POSES[pose]) return { error: "BAD_POSE", allowed: Object.keys(POSES) };
    return null;
  },
  handler({ id, pose, joints }) {
    store.patch((d) => {
      const e = d.entities.find((x) => x.id === id);
      if (pose) {
        e.pose = pose;
        e.joints = poseJoints(pose, joints || {});
      } else if (joints) {
        e.joints = poseJoints("idle", { ...e.joints, ...joints });
        e.pose = "custom";
      }
      e.version += 1;
    });
  },
});

register("entity.path", {
  doc: "设置物体动线关键帧 [{frame, position, yaw}]；clear=true 清除",
  params: { id: "string", keyframes: "[{frame,position,yaw}]", clear: "boolean" },
  required: ["id"],
  validate: ({ id }, d) => (d.entities.some((e) => e.id === id) ? null : { error: "NOT_FOUND" }),
  handler({ id, keyframes, clear, append }) {
    store.patch((d) => {
      const e = d.entities.find((x) => x.id === id);
      if (clear) e.path = null;
      else if (append) e.path = [...(e.path || []), append].sort((a, b) => a.frame - b.frame);
      else if (keyframes) e.path = keyframes.map((k) => ({ frame: Number(k.frame), position: parseVec(k.position), yaw: k.yaw !== undefined ? Number(k.yaw) : undefined }));
      e.version += 1;
    });
  },
});

// Walk path: waypoints + per-segment seconds, a zero-length segment is a dwell.
// Compiles into entity.path keyframes (frame, position, yaw) so playback / prompts / takes need nothing new.
register("entity.walk", {
  doc: "走位：waypoints [[x,z]|[x,y,z]…] + durations [每段秒数]（同一点重复 = 原地停留）；自动朝向行进方向。startFrame 默认镜头入点或 0；clear=true 清除",
  params: { id: "string", waypoints: "[[x,z]|[x,y,z]]", durations: "[seconds per segment]", startFrame: "number", faceDirection: "boolean (default true)", clear: "boolean" },
  required: ["id"],
  validate: ({ id, waypoints, clear }, d) => (!d.entities.some((e) => e.id === id) ? { error: "NOT_FOUND" } : !clear && (!Array.isArray(waypoints) || waypoints.length < 1) ? { error: "NEED_WAYPOINTS" } : null),
  handler({ id, waypoints, durations = [], startFrame, faceDirection = true, clear }) {
    const d0 = D();
    const fps = d0.project.fps || 24;
    const e0 = d0.entities.find((x) => x.id === id);
    if (clear) {
      store.patch((d) => {
        const e = d.entities.find((x) => x.id === id);
        e.path = null;
        e.walk = null;
        e.version += 1;
      });
      return { ok: true, id, cleared: true };
    }
    const pts = waypoints.map((w) => {
      const v = parseVec(w);
      return v.length === 2 ? [v[0], e0.transform.position[1] || 0, v[1]] : [v[0], v[1] ?? 0, v[2] ?? 0];
    });
    const shot = d0.shots.find((s) => s.id === d0.project.currentShotId);
    let frame = startFrame !== undefined ? Number(startFrame) : shot ? shot.range.inFrame : 0;
    let yaw = e0.transform.rotation[1];
    const path = [{ frame, position: pts[0], yaw }];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const dx = b[0] - a[0], dz = b[2] - a[2];
      const dist = Math.hypot(dx, dz);
      const secs = durations[i - 1] !== undefined ? Number(durations[i - 1]) : dist / 1.3; // default walking speed 1.3 m/s
      if (faceDirection && dist > 1e-4) yaw = Math.atan2(dx, dz);
      if (dist > 1e-4) path[path.length - 1].yaw = yaw; // turn toward the next point before moving
      path[path.length - 1].ease = "linear"; // constant walking speed between waypoints
      frame += Math.max(1, Math.round(secs * fps));
      path.push({ frame, position: b, yaw });
    }
    store.patch((d) => {
      const e = d.entities.find((x) => x.id === id);
      e.path = path;
      e.walk = { waypoints: pts, durations: durations.map(Number), startFrame: path[0].frame };
      e.transform.position = [...pts[0]];
      e.version += 1;
    });
    const total = (path[path.length - 1].frame - path[0].frame) / fps;
    return { ok: true, id, keyframes: path.length, seconds: +total.toFixed(2), endFrame: path[path.length - 1].frame };
  },
});

register("entity.duplicate", {
  doc: "复制物体",
  params: { id: "string", newId: "string" },
  required: ["id"],
  handler({ id, newId }) {
    const src = D().entities.find((e) => e.id === id);
    if (!src) return { ok: false, error: "NOT_FOUND" };
    const nid = newId || `${id}_copy`;
    const copy = structuredClone(src);
    copy.id = nid;
    copy.displayName = `${src.displayName} 副本`;
    copy.transform.position[0] += (src.proxy.dimensions?.[0] || 1) + 0.5;
    copy.usedByShots = [];
    store.patch((d) => d.entities.push(copy));
    select("entity", nid);
    return { ok: true, id: nid };
  },
});

register("entity.replace-proxy", {
  doc: `用资产替换代理体（保留语义 ID、变换、镜头引用）。model: 模型库 ${Object.keys(MODEL_LIBRARY).join("/")}；asset: 任意 glb URL；asset=null 回到白模`,
  params: { id: "string", model: Object.keys(MODEL_LIBRARY).join("|"), asset: "string (glb url) | null", geometry: "geometry" },
  required: ["id"],
  validate: ({ model }) => (model && !MODEL_LIBRARY[model] ? { error: "UNKNOWN_MODEL", allowed: Object.keys(MODEL_LIBRARY) } : null),
  handler({ id, model, asset, geometry }) {
    store.patch((d) => {
      const e = d.entities.find((x) => x.id === id);
      if (!e) return;
      if (model) {
        e.assetRef = MODEL_LIBRARY[model].url;
        if (!e.proxy.dimensions) e.proxy.dimensions = MODEL_LIBRARY[model].dims;
      } else if (asset !== undefined) e.assetRef = asset || null;
      if (geometry) e.proxy.geometry = geometry;
      e.version += 1;
    });
  },
});

register("entity.delete", {
  doc: "删除物体（并清理机位目标、镜头引用）",
  params: { id: "string" },
  required: ["id"],
  handler({ id }) {
    store.patch((d) => {
      d.entities = d.entities.filter((x) => x.id !== id);
      d.cameras.forEach((c) => c.target === id && (c.target = null));
      d.lights.forEach((l) => l.attachTo === id && (l.attachTo = null));
      d.shots.forEach((s) => (s.targetIds = (s.targetIds || []).filter((t) => t !== id)));
      if (d.project.selectedId === id) d.project.selectedId = null;
    });
  },
});

// ============ camera.* ============
function makeCamera(p) {
  const focal = Number(p.focalLength) || 35;
  const sensor = Number(p.sensorWidth) || 36;
  return {
    id: p.id,
    name: p.name || p.id,
    type: p.type || "cine",
    pose: transform(parseVec(p.position, [4, 1.6, 6]), p.rotation ? parseVec(p.rotation) : [0, Number(p.yaw) || 0, 0]),
    lens: { focalLength: focal, fov: focalToFov(focal, sensor), sensorWidth: sensor, aperture: Number(p.aperture) || 2.8, focusDistance: Number(p.focusDistance) || 4 },
    target: p.target || null,
    rig: CAMERA_RIGS.includes(p.rig) ? p.rig : "free",
    preset: p.preset || null,
    tracks: [],
    version: 1,
  };
}

register("camera.create", {
  doc: "创建摄影机。focalLength 焦距 mm、position、target 实体 ID、rig、preset 景别",
  params: { id: "string", name: "string", type: "perspective|cine|orthographic", focalLength: "mm", aperture: "f", sensorWidth: "mm", position: "[x,y,z]", target: "entityId", rig: CAMERA_RIGS.join("|"), preset: Object.keys(SHOT_SIZES).join("|") },
  validate: (p, d) => (p.id && d.cameras.some((c) => c.id === p.id) ? { error: "DUPLICATE_ID" } : null),
  handler(p) {
    const id = p.id || uid("cam");
    const cam = makeCamera({ ...p, id });
    store.patch((d) => {
      d.cameras.push(cam);
      if (!d.project.programCameraId) d.project.programCameraId = id;
    });
    if (!inBatch()) select("camera", id);
    return { ok: true, id };
  },
});

const camExists = ({ id }, d) => (d.cameras.some((c) => c.id === id) ? null : { error: "NOT_FOUND" });

register("camera.update", { doc: "更新机位名称/类型/景别", params: { id: "string", name: "string", type: "string", preset: "shotSize" }, required: ["id"], validate: camExists, handler: (p) => store.patch((d) => { const c = d.cameras.find((x) => x.id === p.id); for (const k of ["name", "type", "preset"]) if (p[k] !== undefined) c[k] = p[k]; c.version += 1; }) });

register("camera.lens", {
  doc: "设置镜头：focalLength 焦距、aperture 光圈、focusDistance 对焦距离、sensorWidth",
  params: { id: "string", focalLength: "mm", aperture: "f", focusDistance: "m", sensorWidth: "mm" },
  required: ["id"],
  validate: camExists,
  handler(p) {
    store.patch((d) => {
      const c = d.cameras.find((x) => x.id === p.id);
      if (p.sensorWidth) c.lens.sensorWidth = Number(p.sensorWidth);
      if (p.focalLength) {
        c.lens.focalLength = clamp(Number(p.focalLength), 8, 400);
        c.lens.fov = focalToFov(c.lens.focalLength, c.lens.sensorWidth);
      }
      if (p.aperture) c.lens.aperture = Number(p.aperture);
      if (p.focusDistance) c.lens.focusDistance = Number(p.focusDistance);
      c.version += 1;
      syncShotsForCamera(d, p.id);
    });
  },
});

register("camera.transform", {
  doc: "移动机位。position 绝对 / delta 相对 / height 只改高度",
  params: { id: "string", position: "[x,y,z]", delta: "[dx,dy,dz]", height: "m", rotation: "[rx,ry,rz]" },
  required: ["id"],
  validate: camExists,
  handler({ id, position, delta, height, rotation }) {
    store.patch((d) => {
      const c = d.cameras.find((x) => x.id === id);
      if (position) c.pose.position = parseVec(position);
      if (delta) {
        const v = parseVec(delta);
        c.pose.position = c.pose.position.map((a, i) => a + (v[i] || 0));
      }
      if (height !== undefined) c.pose.position[1] = Number(height);
      if (rotation) c.pose.rotation = parseVec(rotation);
      c.version += 1;
      syncShotsForCamera(d, id);
    });
  },
});

// 「再向右移动一点」—— 这句话要能落成一个确定的数。
// 坐标系：机位自身。right 是画面右方、up 是画面上方、forward 是朝向被摄体的方向，单位米。
// 关键在于它是 truck（平移），不是 pan（摇）：look-at 目标保持不动，所以机位平移后仍看着原来的点，
// 焦段一个字不改。这正是视频模型最容易搞混的一组——提示词里也会因此写死 no pan / no zoom。
const NUDGE_AMOUNT = { 一点点: 0.08, 一点: 0.15, 一些: 0.4, 明显: 1.0, 大幅: 2.0 };
export const NUDGE_STEPS = NUDGE_AMOUNT;

register("camera.nudge", {
  doc: `相对微调机位（机位自身坐标系，米）：right 画面右 / up 画面上 / forward 推近。保持 look-at 与焦段不变 —— 是平移不是摇镜。amount 词表：${Object.keys(NUDGE_AMOUNT).join("/")}`,
  params: { id: "string", right: "number (m)", up: "number (m)", forward: "number (m)", amount: "一点点|一点|一些|明显|大幅", direction: "right|left|up|down|forward|back" },
  validate: camExists,
  handler({ id, right, up, forward, amount, direction }) {
    const d0 = D();
    const cam = d0.cameras.find((c) => c.id === (id || d0.project.programCameraId));
    if (!cam) return { ok: false, error: "NO_CAMERA" };
    // 说了方向词就把词换成米；没说数量默认「一点」
    let dr = Number(right) || 0, du = Number(up) || 0, df = Number(forward) || 0;
    if (direction) {
      const m = NUDGE_AMOUNT[amount] ?? NUDGE_AMOUNT["一点"];
      if (direction === "right") dr += m;
      else if (direction === "left") dr -= m;
      else if (direction === "up") du += m;
      else if (direction === "down") du -= m;
      else if (direction === "forward") df += m;
      else if (direction === "back") df -= m;
    }
    if (!dr && !du && !df) return { ok: false, error: "NO_DELTA", hint: "给 right/up/forward 的米数，或者 direction + amount" };

    const pos = cam.pose.position;
    const target = cam.pose.lookAt || cam.target || [0, 1, 0];
    const tgt = Array.isArray(target) ? target : (d0.entities.find((e) => e.id === target)?.transform?.position || [0, 1, 0]);
    // 机位自身的右/上/前，由 位置→目标 这条视线推出来（世界 up = +Y）
    const fwd = norm(sub(tgt, pos));
    const rightV = norm(cross(fwd, [0, 1, 0]));
    const upV = cross(rightV, fwd);
    const delta = [
      rightV[0] * dr + upV[0] * du + fwd[0] * df,
      rightV[1] * dr + upV[1] * du + fwd[1] * df,
      rightV[2] * dr + upV[2] * du + fwd[2] * df,
    ];
    const next = [pos[0] + delta[0], pos[1] + delta[1], pos[2] + delta[2]];

    store.patch((d) => {
      const c = d.cameras.find((x) => x.id === cam.id);
      c.pose.position = next;
      c.pose.lookAt = tgt;        // 平移后仍看着原来那个点：不是摇镜
      c.version = (c.version || 0) + 1;
      // 让提示词编译器知道这一步是横移多少米，好把 no pan / no zoom 写死
      for (const sh of d.shots.filter((x) => x.cameraId === cam.id)) {
        sh.cameraPose = structuredClone(c.pose);
        sh.lastMove = { right: dr, up: du, forward: df, meters: Math.hypot(dr, du, df), at: new Date().toISOString() };
      }
    });
    const say = [dr && `${dr > 0 ? "右" : "左"}移 ${Math.abs(dr).toFixed(2)} m`, du && `${du > 0 ? "升" : "降"} ${Math.abs(du).toFixed(2)} m`, df && `${df > 0 ? "推近" : "拉远"} ${Math.abs(df).toFixed(2)} m`].filter(Boolean).join("，");
    return { ok: true, id: cam.id, moved: { right: dr, up: du, forward: df }, from: pos, to: next, lookAt: tgt, focalLength: cam.lens.focalLength, describe: `${say}（机位坐标系，焦段与视线目标不变）` };
  },
});

register("camera.look-at", {
  doc: "机位看向某个实体（null 取消）",
  params: { id: "string", target: "entityId|null" },
  required: ["id"],
  validate: ({ id, target }, d) => camExists({ id }, d) || (target && !d.entities.some((e) => e.id === target) ? { error: "TARGET_NOT_FOUND", target } : null),
  handler({ id, target }) {
    store.patch((d) => {
      const c = d.cameras.find((x) => x.id === id);
      c.target = target || null;
      c.version += 1;
      syncShotsForCamera(d, id);
      refreshUsedBy(d);
    });
  },
});

register("camera.rig", { doc: `设置 Rig：${CAMERA_RIGS.join("/")}`, params: { id: "string", rig: "rig" }, required: ["id", "rig"], validate: ({ id, rig }, d) => camExists({ id }, d) || (CAMERA_RIGS.includes(rig) ? null : { error: "BAD_RIG", allowed: CAMERA_RIGS }), handler: ({ id, rig }) => store.patch((d) => (d.cameras.find((x) => x.id === id).rig = rig)) });

register("camera.pilot", {
  doc: "把该机位设为 Program（拍摄机）并切到 Program 视图",
  params: { id: "string" },
  required: ["id"],
  undoable: false,
  validate: camExists,
  handler({ id, view = true }) {
    store.patch((d) => {
      d.project.programCameraId = id;
      if (view) d.project.viewMode = "program";
      d.project.selectedKind = "camera";
      d.project.selectedId = id;
    });
  },
});

register("camera.frame", {
  doc: `按景别与覆盖角自动放置机位。size: ${Object.keys(SHOT_SIZES).join("/")}；angle: ${Object.keys(COVERAGE_ANGLES).join("/")}`,
  params: { id: "string", target: "entityId", size: "shotSize", angle: "coverage", height: "m (optional override)", focalLength: "mm (optional override)" },
  required: ["id"],
  validate: ({ id }, d) => camExists({ id }, d),
  handler({ id, target, size = "MS", angle = "front_left", height, focalLength }) {
    const d0 = D();
    const cam = d0.cameras.find((c) => c.id === id);
    const tid = target || cam.target;
    const ent = d0.entities.find((e) => e.id === tid);
    if (!ent) return { ok: false, error: "TARGET_NOT_FOUND", target: tid };
    const S = SHOT_SIZES[size] || SHOT_SIZES.MS;
    const A = COVERAGE_ANGLES[angle] || COVERAGE_ANGLES.front_left;
    const st = entityStateAt(ent, d0.project.playhead);
    const { h, max } = subjectSize(ent);
    const dist = Math.max(0.6, S.distance * Math.max(h, max * 0.6));
    const yaw = (st.yaw || 0) + (A.yaw * Math.PI) / 180;
    const y = height !== undefined ? Number(height) : Math.max(0.15, h * (A.height ?? S.height));
    const pos = [st.position[0] + Math.sin(yaw) * dist, y, st.position[2] + Math.cos(yaw) * dist];
    const focal = focalLength || S.focal;
    store.patch((d) => {
      const c = d.cameras.find((x) => x.id === id);
      c.pose.position = pos;
      c.target = tid;
      c.preset = size;
      c.lens.focalLength = focal;
      c.lens.fov = focalToFov(focal, c.lens.sensorWidth);
      c.version += 1;
      syncShotsForCamera(d, id);
      refreshUsedBy(d);
    });
    return { ok: true, id, position: pos, focalLength: focal, size, angle };
  },
});

register("camera.delete", {
  doc: "删除机位",
  params: { id: "string" },
  required: ["id"],
  validate: camExists,
  handler({ id }) {
    store.patch((d) => {
      d.cameras = d.cameras.filter((c) => c.id !== id);
      if (d.project.programCameraId === id) d.project.programCameraId = d.cameras[0]?.id || null;
      if (d.project.selectedId === id) d.project.selectedId = null;
    });
  },
});

// ============ light.* ============
function makeLight(p) {
  const id = p.id || uid("lgt");
  return {
    id,
    name: p.name || id,
    type: LIGHT_TYPES.includes(p.type) ? p.type : "spot",
    color: p.color || "#ffe6c8",
    intensity: p.intensity ?? 2,
    temperature: p.temperature || null,
    transform: transform(parseVec(p.position, [2, 4, 2])),
    target: Array.isArray(p.target) ? p.target : typeof p.target === "string" ? p.target : [0, 0.8, 0],
    angle: p.angle ?? 0.55,
    penumbra: p.penumbra ?? 0.4,
    width: p.width ?? 2,
    height: p.height ?? 1,
    group: p.group || "key",
    castShadow: !!p.castShadow,
    enabled: p.enabled !== false,
    attachTo: p.attachTo || null,
    offset: p.offset ? parseVec(p.offset) : null,
    keyframes: p.keyframes || null,
    fromPreset: !!p.fromPreset,
    version: 1,
  };
}

register("light.create", {
  doc: `创建灯光。type: ${LIGHT_TYPES.join("/")}；group: key/fill/rim/neon/practical；attachTo 跟随实体；target 可为坐标或实体 ID`,
  params: { id: "string", name: "string", type: "lightType", color: "#hex", intensity: "number", position: "[x,y,z]", target: "[x,y,z]|entityId", angle: "rad", width: "m", height: "m", group: "string", castShadow: "boolean", attachTo: "entityId", offset: "[x,y,z]" },
  validate: (p, d) => (p.id && d.lights.some((l) => l.id === p.id) ? { error: "DUPLICATE_ID" } : null),
  handler(p) {
    const l = makeLight(p);
    store.patch((d) => d.lights.push(l));
    if (!inBatch()) select("light", l.id);
    return { ok: true, id: l.id };
  },
});

register("light.update", {
  doc: "更新灯光字段（color/intensity/position/target/angle/group/enabled/attachTo/castShadow/width/height/name）",
  params: { id: "string", "...": "fields" },
  required: ["id"],
  validate: ({ id }, d) => (d.lights.some((l) => l.id === id) ? null : { error: "NOT_FOUND" }),
  handler({ id, ...rest }) {
    store.patch((d) => {
      const l = d.lights.find((x) => x.id === id);
      if (rest.position) {
        l.transform.position = parseVec(rest.position);
        delete rest.position;
      }
      if (rest.delta) {
        const v = parseVec(rest.delta);
        l.transform.position = l.transform.position.map((a, i) => a + (v[i] || 0));
        delete rest.delta;
      }
      for (const [k, v] of Object.entries(rest)) if (v !== undefined && k !== "transform") l[k] = k === "intensity" ? Number(v) : v;
      l.version += 1;
    });
  },
});

register("light.toggle", { doc: "开关灯", params: { id: "string", enabled: "boolean" }, required: ["id"], handler: ({ id, enabled }) => store.patch((d) => { const l = d.lights.find((x) => x.id === id); if (l) l.enabled = enabled === undefined ? !l.enabled : !!enabled; }) });
register("light.keyframe", { doc: "灯光强度关键帧 {frame,intensity}；clear 清除", params: { id: "string", frame: "number", intensity: "number", clear: "boolean" }, required: ["id"], handler: ({ id, frame, intensity, clear }) => store.patch((d) => { const l = d.lights.find((x) => x.id === id); if (!l) return; if (clear) l.keyframes = null; else l.keyframes = [...(l.keyframes || []).filter((k) => k.frame !== Number(frame)), { frame: Number(frame), intensity: Number(intensity) }].sort((a, b) => a.frame - b.frame); }) });
register("light.delete", { doc: "删除灯光", params: { id: "string" }, required: ["id"], handler: ({ id }) => store.patch((d) => { d.lights = d.lights.filter((l) => l.id !== id); if (d.project.selectedId === id) d.project.selectedId = null; }) });

// ============ shot.* ============
const shotExists = ({ id }, d) => (d.shots.some((s) => s.id === id) ? null : { error: "NOT_FOUND" });

register("shot.create", {
  doc: `创建镜头：绑定 cameraId（默认 Program）、duration 秒、motion 运镜（${MOTION_TYPE_LIST.join("/")}）、targetIds`,
  params: { id: "string", title: "string", description: "string", cameraId: "string", duration: "seconds", motion: "motionType|{type,params}", targetIds: "string[]", index: "string", dialogue: "string" },
  handler(p) {
    const d0 = D();
    const camId = p.cameraId || d0.project.programCameraId || d0.cameras[0]?.id;
    const cam = d0.cameras.find((c) => c.id === camId);
    if (!cam) return { ok: false, error: "NO_CAMERA", hint: "先 camera.create" };
    const id = p.id || uid("shot");
    if (d0.shots.some((s) => s.id === id)) return { ok: false, error: "DUPLICATE_ID" };
    const seconds = Number(p.duration) || 4;
    const motion = typeof p.motion === "string" ? { type: p.motion } : p.motion || { type: "static" };
    if (!MOTION_TYPES[motion.type]) motion.type = "static";
    const targetIds = p.targetIds || (p.target ? [p.target] : cam.target ? [cam.target] : []);
    const shot = {
      id,
      sceneId: d0.scene.id,
      sequenceId: "main",
      index: p.index || nextIndex(d0),
      title: p.title || "未命名镜头",
      description: p.description || "",
      dialogue: p.dialogue || "",
      cameraId: camId,
      cameraPose: structuredClone(cam.pose),
      lens: structuredClone(cam.lens),
      targetIds,
      range: { inFrame: 0, outFrame: Math.round(seconds * d0.project.fps) },
      motion: { type: motion.type, params: motion.params || {} },
      keyframes: [],
      sceneVersion: d0.project.version,
      lightingState: d0.scene.environment.preset || "custom",
      takes: [],
      annotations: [],
      generationJobs: [],
      status: "draft",
      imagePrompt: "",
      videoPrompt: "",
      prompts: null,
      promptVersions: [],
      version: 1,
    };
    store.patch((d) => {
      d.shots.push(shot);
      d.project.currentShotId = id;
      d.project.programCameraId = camId;
      d.project.playhead = 0;
      const c = d.cameras.find((x) => x.id === camId);
      if (c) c.rig = MOTION_TYPES[motion.type].rig || c.rig;
      refreshUsedBy(d);
    });
    return { ok: true, id, index: shot.index };
  },
});

register("shot.update", {
  doc: "更新镜头：title/description/dialogue/duration/cameraId/targetIds/status/lightingState",
  params: { id: "string", title: "string", description: "string", dialogue: "string", duration: "seconds", cameraId: "string", targetIds: "string[]", status: SHOT_STATUSES.join("|") },
  required: ["id"],
  validate: (p, d) => shotExists(p, d) || (p.status && !SHOT_STATUSES.includes(p.status) ? { error: "BAD_STATUS", allowed: SHOT_STATUSES } : null),
  handler(p) {
    store.patch((d) => {
      const s = d.shots.find((x) => x.id === p.id);
      for (const k of ["title", "description", "dialogue", "status", "lightingState", "index"]) if (p[k] !== undefined) s[k] = p[k];
      if (p.duration) s.range.outFrame = s.range.inFrame + Math.round(Number(p.duration) * d.project.fps);
      if (p.targetIds) s.targetIds = p.targetIds;
      if (p.cameraId && d.cameras.some((c) => c.id === p.cameraId)) {
        s.cameraId = p.cameraId;
        const c = d.cameras.find((x) => x.id === p.cameraId);
        s.cameraPose = structuredClone(c.pose);
        s.lens = structuredClone(c.lens);
      }
      s.version += 1;
      refreshUsedBy(d);
    });
  },
});

register("shot.select", {
  doc: "打开镜头：设为当前镜头，Program 切到它的机位，播放头回到入点",
  params: { id: "string" },
  required: ["id"],
  undoable: false,
  validate: shotExists,
  handler({ id }) {
    store.patch((d) => {
      const s = d.shots.find((x) => x.id === id);
      d.project.currentShotId = id;
      d.project.programCameraId = s.cameraId;
      d.project.playhead = s.range.inFrame;
      d.project.playing = false;
      d.project.selectedKind = "shot";
      d.project.selectedId = id;
    });
  },
});

// 长镜头不是"同一句话演五分钟"。一条 90 秒的镜头里有三段不同的事情发生，
// 每段该有自己的内容描述 —— 否则每一段拿到的都是同一条提示词，模型只会各演各的。
// 拆解是语言活，由 planner（或导演自己）做完写进来；运行时只负责按拍执行。
register("shot.beats", {
  doc: "把一个长镜头拆成若干拍，每拍一句话说清这段发生什么。shot.chain 会按拍分段，每段用自己的描述去生成",
  params: { shotId: "string", beats: "[{seconds, text}]（seconds 省略则均分剩余时长）；给了 beats 就是整体替换", clear: "boolean（只在不给 beats 时有效：清空所有拍）" },
  handler({ shotId, beats, clear }) {
    const d0 = D();
    const s = d0.shots.find((x) => x.id === (shotId || d0.project.currentShotId));
    if (!s) return { ok: false, error: "NO_SHOT" };
    // clear 只在没给 beats 时才是"清空"。给了 beats 还带 clear，意思是"换成这些"——
    // 调用方（尤其是模型）很自然会这么写。破坏性开关绝不能悄悄盖过内容，否则就是
    // 返回 ok:true 的静默丢数据。
    const list0 = Array.isArray(beats) ? beats : [];
    if (clear && !list0.length) {
      store.patch((d) => (d.shots.find((x) => x.id === s.id).beats = null));
      return { ok: true, id: s.id, beats: null, cleared: true };
    }
    const list = list0.map((b) => ({ text: String(b?.text ?? b ?? "").trim(), seconds: Number(b?.seconds) || 0 })).filter((b) => b.text);
    if (!list.length) return { ok: false, error: "NO_BEATS", hint: "beats 要是 [{seconds, text}]，text 说清这一拍发生什么" };
    const total = (s.range.outFrame - s.range.inFrame) / d0.project.fps;
    const fixed = list.reduce((n, b) => n + b.seconds, 0);
    const free = list.filter((b) => !b.seconds).length;
    // 没写时长的拍平分剩下的时间；都写了就按写的比例缩放到镜头总时长
    const each = free ? Math.max(0, total - fixed) / free : 0;
    let out = list.map((b) => ({ text: b.text, seconds: b.seconds || each }));
    const sum = out.reduce((n, b) => n + b.seconds, 0) || 1;
    out = out.map((b) => ({ ...b, seconds: Math.round((b.seconds / sum) * total * 100) / 100 }));
    store.patch((d) => (d.shots.find((x) => x.id === s.id).beats = out));
    return { ok: true, id: s.id, total: Math.round(total * 10) / 10, beats: out };
  },
});

register("shot.lock", {
  doc: `锁定这一镜已经满意的部分，重新生成时必须保持不变。aspects: ${Object.keys(LOCK_ASPECTS).join("/")}`,
  params: { shotId: "string", aspects: "string[]", note: "string", referenceFrame: "dataURL (以哪一帧为准)" },
  required: ["aspects"],
  validate: ({ aspects }) => {
    const bad = (Array.isArray(aspects) ? aspects : [aspects]).filter((a) => !LOCK_ASPECTS[a]);
    return bad.length ? { error: "BAD_ASPECT", bad, allowed: Object.keys(LOCK_ASPECTS) } : null;
  },
  handler({ shotId, aspects, note, referenceFrame }) {
    const d0 = D();
    const s = d0.shots.find((x) => x.id === (shotId || d0.project.currentShotId));
    if (!s) return { ok: false, error: "NO_SHOT" };
    const list = [...new Set([...(s.locks?.aspects || []), ...(Array.isArray(aspects) ? aspects : [aspects])])];
    // 以哪一帧为准：优先调用方给的，其次这一镜最后一条成功生成的结果，再次圈选 Take 的缩略图
    const lastGen = d0.jobs.filter((j) => j.shotId === s.id && j.status === "done" && j.result?.url).at(-1);
    const take = d0.takes.find((t) => t.id === s.selectedTake);
    store.patch((d) => {
      const sh = d.shots.find((x) => x.id === s.id);
      sh.locks = {
        aspects: list,
        note: note || sh.locks?.note || "",
        lockedAt: new Date().toISOString(),
        // 基准：锁的是「这个样子」，所以要记住当时是哪一版
        reference: referenceFrame || sh.locks?.reference || lastGen?.result?.url || take?.thumbnail || null,
        jobId: lastGen?.id || sh.locks?.jobId || null,
        promptVersion: sh.promptVersions?.at(-1)?.version || 1,
      };
      sh.version += 1;
    });
    return { ok: true, id: s.id, aspects: list, zh: list.map((a) => LOCK_ASPECTS[a].zh), reference: D().shots.find((x) => x.id === s.id).locks.reference };
  },
});

register("shot.unlock", {
  doc: "解锁：不传 aspects 就全解",
  params: { shotId: "string", aspects: "string[]" },
  handler({ shotId, aspects }) {
    const d0 = D();
    const s = d0.shots.find((x) => x.id === (shotId || d0.project.currentShotId));
    if (!s) return { ok: false, error: "NO_SHOT" };
    const drop = new Set(aspects ? (Array.isArray(aspects) ? aspects : [aspects]) : Object.keys(LOCK_ASPECTS));
    store.patch((d) => {
      const sh = d.shots.find((x) => x.id === s.id);
      const left = (sh.locks?.aspects || []).filter((a) => !drop.has(a));
      sh.locks = left.length ? { ...sh.locks, aspects: left } : null;
    });
    return { ok: true, id: s.id, aspects: D().shots.find((x) => x.id === s.id).locks?.aspects || [] };
  },
});

register("shot.duplicate", {
  doc: "复制镜头",
  params: { id: "string" },
  required: ["id"],
  validate: shotExists,
  handler({ id }) {
    const src = D().shots.find((s) => s.id === id);
    const nid = uid("shot");
    const copy = structuredClone(src);
    Object.assign(copy, { id: nid, index: nextIndex(D()), title: `${src.title} B`, takes: [], generationJobs: [], status: "draft", version: 1 });
    store.patch((d) => {
      d.shots.push(copy);
      d.project.currentShotId = nid;
    });
    return { ok: true, id: nid };
  },
});

register("shot.reorder", {
  doc: "调整镜头顺序并重新编号",
  params: { id: "string", position: "number (0-based)" },
  required: ["id", "position"],
  validate: shotExists,
  handler({ id, position }) {
    store.patch((d) => {
      const i = d.shots.findIndex((s) => s.id === id);
      const [s] = d.shots.splice(i, 1);
      d.shots.splice(clamp(Number(position), 0, d.shots.length), 0, s);
      d.shots.forEach((x, k) => (x.index = String(k + 1).padStart(2, "0")));
    });
  },
});

register("shot.delete", {
  doc: "删除镜头及其 Take / 故事版卡 / 生成任务",
  params: { id: "string" },
  required: ["id"],
  validate: shotExists,
  handler({ id }) {
    store.patch((d) => {
      d.shots = d.shots.filter((s) => s.id !== id);
      d.takes = d.takes.filter((t) => t.shotId !== id);
      d.storyboard = d.storyboard.filter((c) => c.shotId !== id);
      d.jobs = d.jobs.filter((j) => j.shotId !== id);
      if (d.project.currentShotId === id) d.project.currentShotId = d.shots[0]?.id || null;
      refreshUsedBy(d);
    });
  },
});

register("shot.preview", {
  doc: "预演：播放当前/指定镜头（loop 可循环）",
  params: { id: "string", loop: "boolean" },
  undoable: false,
  handler({ id, loop }) {
    store.patch((d) => {
      const s = d.shots.find((x) => x.id === (id || d.project.currentShotId));
      if (!s) return;
      d.project.currentShotId = s.id;
      d.project.programCameraId = s.cameraId;
      d.project.viewMode = "program";
      d.project.playhead = s.range.inFrame;
      d.project.playing = true;
      d.project.playSequence = false;
      if (loop !== undefined) d.project.loop = !!loop;
      if (s.status === "draft") s.status = "blocking";
      if (["EDIT", "BLOCKING"].includes(d.project.currentState)) d.project.currentState = "REHEARSAL";
    });
    return { ok: true, id: id || D().project.currentShotId };
  },
});

// ============ motion.* / timeline.* ============
register("motion.set", {
  doc: `设置镜头运镜类型与参数：${MOTION_TYPE_LIST.join("/")}`,
  params: { shotId: "string (default current)", type: "motionType", params: "object", duration: "seconds" },
  validate: ({ type }) => (type && !MOTION_TYPES[type] ? { error: "BAD_MOTION", allowed: MOTION_TYPE_LIST } : null),
  handler({ shotId, type, params, duration }) {
    const sid = shotId || D().project.currentShotId;
    if (!D().shots.some((s) => s.id === sid)) return { ok: false, error: "NO_SHOT" };
    store.patch((d) => {
      const s = d.shots.find((x) => x.id === sid);
      if (type) s.motion = { type, params: { ...(MOTION_TYPES[type].params || {}), ...(params || {}) } };
      else if (params) s.motion.params = { ...s.motion.params, ...params };
      if (duration) s.range.outFrame = s.range.inFrame + Math.round(Number(duration) * d.project.fps);
      const c = d.cameras.find((x) => x.id === s.cameraId);
      if (c && type) c.rig = MOTION_TYPES[type].rig || c.rig;
      s.version += 1;
    });
    return { ok: true, id: sid };
  },
});

register("motion.keyframe", {
  doc: "在镜头上加机位关键帧。缺省 position/lookAt/focalLength 时取当前机位状态",
  params: { shotId: "string", frame: "number (default playhead)", position: "[x,y,z]", lookAt: "[x,y,z]", focalLength: "mm", roll: "rad", ease: "linear|inout" },
  handler({ shotId, frame, position, lookAt, focalLength, roll, ease }) {
    const d0 = D();
    const s = d0.shots.find((x) => x.id === (shotId || d0.project.currentShotId));
    if (!s) return { ok: false, error: "NO_SHOT" };
    const f = frame !== undefined ? Number(frame) : d0.project.playhead;
    const cam = d0.cameras.find((c) => c.id === s.cameraId);
    const live = cameraStateAt(d0, { ...s, keyframes: [] }, f);
    const key = {
      frame: f,
      position: position ? parseVec(position) : [...cam.pose.position],
      lookAt: lookAt ? parseVec(lookAt) : live?.lookAt || [0, 1, 0],
      focalLength: focalLength ? Number(focalLength) : cam.lens.focalLength,
      roll: roll ? Number(roll) : 0,
      ease: ease || "inout",
    };
    store.patch((d) => {
      const sh = d.shots.find((x) => x.id === s.id);
      sh.keyframes = [...(sh.keyframes || []).filter((k) => k.frame !== f), key].sort((a, b) => a.frame - b.frame);
      sh.version += 1;
    });
    return { ok: true, id: s.id, frame: f, keyframes: s.keyframes.length + 1 };
  },
});

register("motion.clear-keyframes", { doc: "清除镜头关键帧", params: { shotId: "string" }, handler: ({ shotId }) => store.patch((d) => { const s = d.shots.find((x) => x.id === (shotId || d.project.currentShotId)); if (s) s.keyframes = []; }) });
register("motion.delete-keyframe", { doc: "删除某帧关键帧", params: { shotId: "string", frame: "number" }, required: ["frame"], handler: ({ shotId, frame }) => store.patch((d) => { const s = d.shots.find((x) => x.id === (shotId || d.project.currentShotId)); if (s) s.keyframes = (s.keyframes || []).filter((k) => k.frame !== Number(frame)); }) });

register("timeline.seek", { doc: "移动播放头（帧）", params: { frame: "number" }, required: ["frame"], undoable: false, handler: ({ frame }) => store.patch((d) => { d.project.playhead = Math.max(0, Number(frame)); d.project.playing = false; }) });
register("timeline.play", { doc: "播放。sequence=true 顺播全部镜头", params: { loop: "boolean", sequence: "boolean" }, undoable: false, handler: ({ loop, sequence }) => store.patch((d) => { d.project.playing = true; if (loop !== undefined) d.project.loop = !!loop; d.project.playSequence = !!sequence; if (sequence) { const first = d.shots[0]; if (first) { d.project.currentShotId = first.id; d.project.programCameraId = first.cameraId; d.project.playhead = 0; } } }) });
register("timeline.pause", { doc: "暂停", undoable: false, handler: () => store.patch((d) => (d.project.playing = false)) });
register("timeline.stop", { doc: "停止并回到入点", undoable: false, handler: () => store.patch((d) => { d.project.playing = false; const s = d.shots.find((x) => x.id === d.project.currentShotId); d.project.playhead = s ? s.range.inFrame : 0; }) });
register("timeline.set-range", { doc: "设置镜头入出点（帧）", params: { shotId: "string", inFrame: "number", outFrame: "number" }, handler: ({ shotId, inFrame, outFrame }) => store.patch((d) => { const s = d.shots.find((x) => x.id === (shotId || d.project.currentShotId)); if (!s) return; if (inFrame !== undefined) s.range.inFrame = Number(inFrame); if (outFrame !== undefined) s.range.outFrame = Math.max(s.range.inFrame + 1, Number(outFrame)); }) });

// ============ take.* ============
function snapshotScene(d) {
  return {
    cameraId: d.project.programCameraId,
    cameras: d.cameras.map((c) => ({ id: c.id, pose: structuredClone(c.pose), lens: structuredClone(c.lens), target: c.target, rig: c.rig })),
    entities: d.entities.map((e) => ({ id: e.id, semanticType: e.semanticType, transform: structuredClone(e.transform), pose: e.pose, joints: e.joints ? { ...e.joints } : null, path: e.path ? structuredClone(e.path) : null })),
    lights: d.lights.map((l) => ({ id: l.id, type: l.type, color: l.color, intensity: l.intensity, enabled: l.enabled, position: [...l.transform.position], group: l.group })),
    environment: structuredClone(d.scene.environment),
    fidelity: d.project.fidelity,
    aspect: d.project.aspect,
    fps: d.project.fps,
    sceneVersion: d.project.version,
  };
}

function finishTakeInternal(d, id, extra = {}) {
  const t = d.takes.find((x) => x.id === id);
  if (!t) return;
  Object.assign(t, extra, { status: "review", finishedAt: new Date().toISOString() });
  const s = d.shots.find((x) => x.id === t.shotId);
  if (s) {
    if (!s.takes.includes(id)) s.takes.push(id);
    s.status = "recorded";
  }
  if (d.project.recording && d.project.recording.takeId !== id) return;
  d.project.recording = null;
  d.project.playing = false;
  if (["RECORDING", "ARMED"].includes(d.project.currentState) || d.project.currentState === "REVIEW") d.project.currentState = "REVIEW";
}

register("take.arm", {
  doc: "Preflight → ARMED：检查镜头/机位/目标，进入待录状态",
  params: { shotId: "string" },
  undoable: false,
  handler({ shotId }) {
    const d0 = D();
    const s = d0.shots.find((x) => x.id === (shotId || d0.project.currentShotId));
    if (!s) return { ok: false, error: "NO_SHOT" };
    const cam = d0.cameras.find((c) => c.id === s.cameraId);
    const issues = [];
    if (!cam) issues.push("镜头没有机位");
    if (!s.targetIds.length && !cam?.target) issues.push("没有 look-at 目标");
    if (s.range.outFrame - s.range.inFrame < 2) issues.push("时长过短");
    for (const t of s.targetIds) if (!d0.entities.some((e) => e.id === t)) issues.push(`目标 ${t} 不存在`);
    if (issues.length) return { ok: false, error: "PREFLIGHT_FAILED", issues };
    store.patch((d) => {
      d.project.currentShotId = s.id;
      d.project.programCameraId = s.cameraId;
      d.project.viewMode = "program";
      d.project.playhead = s.range.inFrame;
      d.project.currentState = "ARMED";
    });
    return { ok: true, id: s.id, preflight: "ok" };
  },
});

register("take.record", {
  doc: "Roll：录制当前/指定镜头的 Take（快照相机/镜头/灯光/物体；浏览器内还会录代理视频）",
  params: { shotId: "string", name: "string" },
  handler({ shotId, name }, meta) {
    const d0 = D();
    const s = d0.shots.find((x) => x.id === (shotId || d0.project.currentShotId));
    if (!s) return { ok: false, error: "NO_SHOT" };
    const id = uid("take");
    const n = d0.takes.filter((t) => t.shotId === s.id).length + 1;
    const take = {
      id,
      shotId: s.id,
      name: name || `${s.title} T${n}`,
      number: n,
      status: "recording",
      frames: s.range.outFrame - s.range.inFrame,
      range: { ...s.range },
      fps: d0.project.fps,
      motion: structuredClone(s.motion),
      keyframes: structuredClone(s.keyframes || []),
      snapshot: snapshotScene(d0),
      videoUrl: null,
      thumbnail: null,
      log: [{ t: 0, msg: "roll" }],
      source: meta.source || "human",
      createdAt: new Date().toISOString(),
    };
    store.patch((d) => {
      d.takes.push(take);
      d.project.currentShotId = s.id;
      d.project.programCameraId = s.cameraId;
      d.project.viewMode = "program";
      d.project.playhead = s.range.inFrame;
      d.project.recording = { takeId: id, shotId: s.id, startedAt: Date.now() };
      d.project.currentState = "RECORDING";
      d.project.playing = true;
      d.project.playSequence = false;
      d.project.loop = false;
    });
    if (hooks.recorder) {
      hooks.recorder.start(take, s);
      return { ok: true, id, recording: true, hint: "录制中，结束后自动 take.finish" };
    }
    // meta.capture: the caller (a browser client of the API server) records the proxy video itself and will
    // upload it, then dispatch take.finish. The runtime stays in RECORDING until then (the host applies a watchdog).
    if (meta.capture) return { ok: true, id, recording: true, awaiting: "client", frames: take.frames, fps: take.fps, hint: "client records; call take.finish when done" };
    store.patch((d) => finishTakeInternal(d, id, { log: [...take.log, { t: take.frames, msg: "headless finish" }] }));
    return { ok: true, id, recording: false };
  },
});

register("take.finish", {
  doc: "结束录制并写入代理视频/缩略图（由录像器调用）",
  params: { id: "string", videoUrl: "string", thumbnail: "dataURL", frames: "number", droppedFrames: "number" },
  required: ["id"],
  undoable: false,
  handler({ id, videoUrl, thumbnail, frames, droppedFrames, log }) {
    if (!D().takes.some((t) => t.id === id)) return { ok: false, error: "TAKE_NOT_FOUND" };
    store.patch((d) => finishTakeInternal(d, id, { videoUrl: videoUrl || null, thumbnail: thumbnail || null, capturedFrames: frames, droppedFrames: droppedFrames || 0, log: log || undefined }));
    return { ok: true, id };
  },
});

register("take.stop", {
  doc: "停止录制",
  params: { id: "string" },
  undoable: false,
  handler({ id }, meta = {}) {
    const rec = D().project.recording;
    const tid = id || rec?.takeId;
    if (!tid) return { ok: false, error: "NOT_RECORDING" };
    if (hooks.recorder) hooks.recorder.stop(tid);
    else if (meta.capture) return { ok: true, id: tid, awaiting: "client", hint: "client stops its recorder and calls take.finish" };
    else store.patch((d) => finishTakeInternal(d, tid));
    return { ok: true, id: tid };
  },
});

register("take.review", {
  doc: "评审 Take：circle 圈选 / reject 弃用",
  params: { id: "string", status: "circle|reject", note: "string" },
  required: ["id", "status"],
  validate: ({ id, status }, d) => (!d.takes.some((t) => t.id === id) ? { error: "NOT_FOUND" } : ["circle", "reject", "review"].includes(status) ? null : { error: "BAD_STATUS" }),
  handler({ id, status, note }) {
    store.patch((d) => {
      const t = d.takes.find((x) => x.id === id);
      t.status = status;
      if (note) t.note = note;
      const s = d.shots.find((x) => x.id === t.shotId);
      if (s && status === "circle") {
        s.status = "review";
        s.selectedTake = id;
        const card = d.storyboard.find((c) => c.shotId === s.id);
        if (card) {
          card.selectedTake = id;
          card.blockoutVideo = t.videoUrl;
          card.status = cardStatus(card, s, d);
        }
      }
    });
  },
});

register("take.delete", { doc: "删除 Take", params: { id: "string" }, required: ["id"], handler: ({ id }) => store.patch((d) => { d.takes = d.takes.filter((t) => t.id !== id); d.shots.forEach((s) => (s.takes = s.takes.filter((t) => t !== id))); }) });

// ============ storyboard.* / annotation.* ============
register("storyboard.add", {
  doc: "把镜头（及选中的 Take、关键帧图）加入故事版；已存在则更新",
  params: { shotId: "string", takeId: "string", keyframes: "dataURL[]", actionDescription: "string", dialogue: "string" },
  required: ["shotId"],
  validate: ({ shotId }, d) => (d.shots.some((s) => s.id === shotId) ? null : { error: "NOT_FOUND" }),
  handler({ shotId, takeId, keyframes, actionDescription, dialogue }) {
    let id;
    store.patch((d) => {
      const s = d.shots.find((x) => x.id === shotId);
      let card = d.storyboard.find((c) => c.shotId === shotId);
      if (!card) {
        card = { id: uid("card"), shotId, keyframes: [], blockoutVideo: null, selectedTake: null, actionDescription: "", dialogue: "", imagePrompt: "", videoPrompt: "", generatedAssetIds: [], notes: [], status: "empty" };
        d.storyboard.push(card);
      }
      id = card.id;
      const take = d.takes.find((t) => t.id === (takeId || s.selectedTake || s.takes.at(-1)));
      if (take) {
        card.selectedTake = take.id;
        card.blockoutVideo = take.videoUrl;
        if (!keyframes && take.thumbnail) card.keyframes = [take.thumbnail];
      }
      if (keyframes) card.keyframes = keyframes;
      card.actionDescription = actionDescription ?? card.actionDescription ?? s.description;
      if (!card.actionDescription) card.actionDescription = s.description;
      if (dialogue !== undefined) card.dialogue = dialogue;
      card.imagePrompt = s.imagePrompt;
      card.videoPrompt = s.videoPrompt;
      card.status = cardStatus(card, s, d);
    });
    return { ok: true, id };
  },
});

register("storyboard.update", {
  doc: "更新故事版卡：actionDescription/dialogue/note(追加)/status",
  params: { id: "string (card or shot id)", actionDescription: "string", dialogue: "string", note: "string", status: CARD_STATUSES.join("|") },
  required: ["id"],
  handler(p) {
    store.patch((d) => {
      const card = d.storyboard.find((c) => c.id === p.id || c.shotId === p.id);
      if (!card) return;
      if (p.actionDescription !== undefined) card.actionDescription = p.actionDescription;
      if (p.dialogue !== undefined) card.dialogue = p.dialogue;
      if (p.note) card.notes.push({ text: p.note, at: new Date().toISOString() });
      if (p.status && CARD_STATUSES.includes(p.status)) card.status = p.status;
      if (p.status === "approved") {
        const s = d.shots.find((x) => x.id === card.shotId);
        if (s) s.status = "approved";
      }
    });
  },
});

register("storyboard.export", {
  doc: "导出故事版 json/html/md",
  params: { format: "json|html|md" },
  undoable: false,
  handler({ format = "json" }) {
    const d = D();
    const cards = d.shots.map((s) => {
      const card = d.storyboard.find((c) => c.shotId === s.id);
      const take = d.takes.find((t) => t.id === (card?.selectedTake || s.selectedTake));
      return { index: s.index, title: s.title, seconds: (s.range.outFrame - s.range.inFrame) / d.project.fps, focal: s.lens.focalLength, motion: s.motion.type, camera: s.cameraId, targets: s.targetIds, status: s.status, action: card?.actionDescription || s.description, dialogue: card?.dialogue || s.dialogue, imagePrompt: s.imagePrompt, videoPrompt: s.videoPrompt, v2vPrompt: s.prompts?.v2v?.en || "", take: take ? { id: take.id, name: take.name, status: take.status } : null, thumbnail: card?.keyframes?.[0] || take?.thumbnail || null, cardStatus: card?.status || "empty" };
    });
    if (format === "json") return { ok: true, format, content: JSON.stringify({ project: d.project.name, scene: d.scene.name, fps: d.project.fps, aspect: d.project.aspect, exportedAt: new Date().toISOString(), cards }, null, 2) };
    if (format === "md") return { ok: true, format, content: [`# ${d.project.name} · ${d.scene.name}`, "", "| 镜号 | 标题 | 镜头 | 运动 | 时长 | 状态 |", "|---|---|---|---|---|---|", ...cards.map((c) => `| ${c.index} | ${c.title} | ${c.focal} mm | ${MOTION_TYPES[c.motion]?.zh || c.motion} | ${c.seconds.toFixed(1)} s | ${c.status} |`), "", ...cards.flatMap((c) => [`## ${c.index} ${c.title}`, "", c.action, "", c.dialogue ? `> ${c.dialogue}` : "", "", "**Image prompt**", "", c.imagePrompt, "", "**Video prompt**", "", c.videoPrompt, ""])].join("\n") };
    const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const html = `<!doctype html><meta charset="utf-8"><title>${esc(d.project.name)} storyboard</title><style>body{font-family:system-ui;background:#111;color:#eee;padding:24px}article{border:1px solid #333;border-radius:8px;padding:12px;margin:0 0 12px;display:grid;grid-template-columns:240px 1fr;gap:12px}img{width:100%;border-radius:4px;background:#000;aspect-ratio:16/9;object-fit:cover}pre{white-space:pre-wrap;color:#aaa;font-size:12px}h2{margin:0 0 6px;font-size:15px}</style><h1>${esc(d.project.name)} · ${esc(d.scene.name)}</h1>${cards.map((c) => `<article>${c.thumbnail ? `<img src="${c.thumbnail}">` : "<div></div>"}<div><h2>${c.index} ${esc(c.title)} · ${c.focal}mm · ${esc(MOTION_TYPES[c.motion]?.zh || c.motion)} · ${c.seconds.toFixed(1)}s · ${c.status}</h2><p>${esc(c.action)}</p>${c.dialogue ? `<p><em>${esc(c.dialogue)}</em></p>` : ""}<pre>${esc(c.videoPrompt)}</pre></div></article>`).join("")}`;
    return { ok: true, format: "html", content: html };
  },
});

register("annotation.add", {
  doc: "在镜头/Take/物体上加时间码批注",
  params: { targetId: "string", targetKind: "shot|take|entity", frame: "number", text: "string" },
  required: ["targetId", "text"],
  handler({ targetId, targetKind = "shot", frame, text }, meta) {
    const a = { id: uid("note"), targetId, targetKind, frame: frame ?? D().project.playhead, text, by: meta.source || "human", at: new Date().toISOString() };
    store.patch((d) => {
      d.annotations.push(a);
      const s = d.shots.find((x) => x.id === targetId);
      if (s) s.annotations.push(a.id);
    });
    return { ok: true, id: a.id };
  },
});

// ============ generation.* ============
const simulatedAdapter = {
  name: "simulated",
  submit(job, update) {
    let p = 0;
    const step = () => {
      const cur = D().jobs.find((j) => j.id === job.id);
      if (!cur || cur.status === "cancelled") return;
      p = Math.min(100, p + 12 + Math.random() * 18);
      if (p >= 100) update(job.id, { status: "done", progress: 100, result: { assetId: `asset_${job.id}`, url: null, note: "simulated adapter — plug a real provider via setHooks({generation})" } });
      else {
        update(job.id, { status: "running", progress: Math.round(p) });
        setTimeout(step, 220 + Math.random() * 280);
      }
    };
    setTimeout(step, 200);
  },
};

function updateJob(id, patch) {
  store.patch((d) => {
    const j = d.jobs.find((x) => x.id === id);
    if (!j) return;
    Object.assign(j, patch, { updatedAt: new Date().toISOString() });
    // a finished reference job becomes an asset of its entity (unapproved until the director says so)
    if (patch.status === "done" && j.kind === "reference" && j.result?.url && !d.assets.some((a) => a.jobId === j.id)) {
      d.assets = d.assets || [];
      d.assets.push({ id: uid("asset"), kind: "reference", entityId: j.entityId, label: j.label || `${j.entityId} 参考图`, url: j.result.url, mediaKind: j.result.kind || "image", approved: false, jobId: j.id, model: j.model, prompt: j.prompt, createdAt: new Date().toISOString() });
    }
    if (patch.status === "done") {
      const s = d.shots.find((x) => x.id === j.shotId);
      const card = d.storyboard.find((c) => c.shotId === j.shotId);
      if (card) {
        card.generatedAssetIds.push(j.result?.assetId || j.id);
        card.status = cardStatus(card, s, d);
      }
    }
    if (!d.jobs.some((x) => ["queued", "running"].includes(x.status)) && d.project.currentState === "GENERATING") d.project.currentState = "REVIEW";
  });
}

// ============ asset.* — reference assets keep characters / products consistent across generations ============
register("asset.add", {
  doc: "登记一个资产（参考图 / 生成结果 / 上传）并绑定到实体：entityId + url；approved=true 后参与该实体出现的所有生成",
  params: { entityId: "string", url: "string", label: "string", kind: "reference|generated|upload", role: `${Object.keys(ASSET_ROLES).join("|")}（这张图管的是角色的哪一面）`, mediaKind: "image|video|audio", approved: "boolean", fromJob: "jobId (copy url/model/prompt from a finished job)" },
  validate: ({ entityId, url, fromJob }, d) => (entityId && !d.entities.some((e) => e.id === entityId) ? { error: "ENTITY_NOT_FOUND" } : !url && !fromJob ? { error: "MISSING_PARAM", missing: ["url"] } : null),
  handler({ entityId, url, label, kind = "reference", role, mediaKind = "image", approved = false, fromJob }) {
    const job = fromJob ? D().jobs.find((j) => j.id === fromJob) : null;
    if (fromJob && !job?.result?.url) return { ok: false, error: "JOB_HAS_NO_RESULT" };
    const a = { id: uid("asset"), kind, role: ASSET_ROLES[role] ? role : null, entityId: entityId || job?.entityId || null, label: label || (job ? `${job.shotId || job.entityId} · ${job.model}` : url), url: url || job.result.url, mediaKind: job ? job.result.kind || mediaKind : mediaKind, approved: !!approved, jobId: job?.id || null, model: job?.model || null, prompt: job?.prompt || null, createdAt: new Date().toISOString() };
    store.patch((d) => (d.assets = [...(d.assets || []), a]));
    return { ok: true, id: a.id, entityId: a.entityId, targetIds: [a.id, a.entityId].filter(Boolean) };
  },
});

register("asset.approve", {
  doc: "批准 / 取消批准一个资产作为实体的参考（同一实体可有多张已批准参考，按顺序传给供应商，最多 4 张）",
  params: { id: "string", approved: "boolean (default true)" },
  required: ["id"],
  undoable: true,
  handler({ id, approved = true }) {
    const a = D().assets?.find((x) => x.id === id);
    if (!a) return { ok: false, error: "ASSET_NOT_FOUND" };
    store.patch((d) => (d.assets.find((x) => x.id === id).approved = !!approved));
    return { ok: true, id, approved: !!approved, targetIds: [id, a.entityId].filter(Boolean) };
  },
});

register("asset.delete", {
  doc: "删除资产",
  params: { id: "string" },
  required: ["id"],
  handler({ id }) {
    if (!D().assets?.some((x) => x.id === id)) return { ok: false, error: "ASSET_NOT_FOUND" };
    store.patch((d) => (d.assets = d.assets.filter((x) => x.id !== id)));
    return { ok: true, id };
  },
});

register("context.character", {
  doc: "角色卡：一个角色（或产品）的身份字段、按用途分组的参考资产、以及它出现在哪些镜头",
  params: { id: "string (entityId；不传就列出全部角色)" },
  undoable: false,
  handler({ id }) {
    const d = D();
    const build = (e) => {
      const mine = (d.assets || []).filter((a) => a.entityId === e.id);
      const byRole = {};
      for (const [r, def] of Object.entries(ASSET_ROLES)) {
        const list = mine.filter((a) => a.role === r);
        if (list.length) byRole[r] = { zh: def.zh, approved: list.filter((a) => a.approved).length, total: list.length, assets: list.map((a) => ({ id: a.id, url: a.url, approved: a.approved, label: a.label })) };
      }
      const unroled = mine.filter((a) => !a.role);
      return {
        id: e.id,
        name: e.displayName || e.id,
        semanticType: e.semanticType,
        role: e.role || null,
        continuity: e.continuity || {},
        pose: e.pose || null,
        proxy: e.proxy || null,
        assetRef: e.assetRef || null, // 换过 GLB 就在这
        roles: byRole,
        unroled: unroled.length,
        // 卡片完整度：这几面齐了，跨镜头一致性才稳
        missing: (e.semanticType === "character" ? ["face", "wardrobe", "voice"] : ["prop"]).filter((r) => !byRole[r]?.approved),
        usedByShots: d.shots.filter((s) => s.targetIds.includes(e.id)).map((s) => s.id),
      };
    };
    if (id) {
      const e = d.entities.find((x) => x.id === id);
      return e ? { ok: true, data: build(e) } : { ok: false, error: "ENTITY_NOT_FOUND" };
    }
    return { ok: true, data: d.entities.filter((e) => ["character", "vehicle", "prop", "weapon"].includes(e.semanticType)).map(build) };
  },
});

register("context.assets", {
  doc: "资产清单：每个实体已批准 / 待批准的参考",
  undoable: false,
  handler: () => ({ ok: true, data: (D().assets || []).map((a) => ({ id: a.id, entityId: a.entityId, label: a.label, kind: a.kind, mediaKind: a.mediaKind, approved: a.approved, url: a.url, model: a.model })) }),
});

// approved references for the entities that appear in a shot (subject first), capped for the providers
export function referencesForShot(d, shot, limit = 4) {
  const ids = [];
  const cam = d.cameras.find((c) => c.id === shot.cameraId);
  if (cam?.target) ids.push(cam.target);
  for (const t of shot.targetIds || []) ids.push(t);
  for (const e of d.entities) if (["character", "vehicle", "weapon", "prop"].includes(e.semanticType)) ids.push(e.id);
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const ent = d.entities.find((e) => e.id === id);
    if (!ent) continue;
    for (const a of (d.assets || []).filter((x) => x.entityId === id && x.approved && x.mediaKind !== "video" && x.mediaKind !== "audio")) {
      out.push({ assetId: a.id, entityId: id, name: ent.displayName, url: a.url, role: a.role || null, roleSay: a.role ? ASSET_ROLES[a.role]?.say : null, look: ent.continuity?.look || "" });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

register("generation.reference", {
  doc: "为实体生成参考图（角色定妆照 / 产品图，中性背景、正面全身或整件产品），完成后自动登记为该实体的未批准资产。provider 默认 seedream-5",
  params: { entityId: "string", provider: "providerId (t2i)", prompt: "string (override)", view: "front|three-quarter|profile|turntable", role: `${Object.keys(ASSET_ROLES).join("|")}（这一张管角色的哪一面，默认 face/prop）`, label: "string" },
  required: ["entityId"],
  undoable: false,
  validate: ({ entityId, provider = "seedream-5" }, d) => (!d.entities.some((e) => e.id === entityId) ? { error: "ENTITY_NOT_FOUND" } : !PROVIDERS[provider] ? { error: "BAD_PROVIDER", allowed: Object.keys(PROVIDERS) } : !PROVIDERS[provider].modes.includes("t2i") ? { error: "MODE_NOT_SUPPORTED", provider, supported: PROVIDERS[provider].modes } : null),
  handler({ entityId, provider = "seedream-5", prompt, view = "front", role, label }, meta) {
    const d0 = D();
    const e = d0.entities.find((x) => x.id === entityId);
    const isChar = e.semanticType === "character";
    const look = [e.continuity?.look, e.continuity?.wardrobe, e.continuity?.color].filter(Boolean).join(", ");
    const style = d0.project.style || "photoreal, cinematic, high-end commercial photography";
    const useRole = ASSET_ROLES[role] ? role : isChar ? "face" : "prop";
    // 一张图管一件事：要脸就拍头肩、要服装就拍整套 —— 混在一张里模型两头都学不准
    const roleShot = { face: "tight head-and-shoulders portrait, face fills the frame, neutral expression",
      body: "full body, arms slightly away from the torso, neutral stance",
      wardrobe: "full outfit head to toe, garment clearly readable, plain styling",
      prop: "the product alone, centered",
      style: "a mood frame that defines the overall look and grade" }[useRole] || "";
    const text = prompt || (isChar
      ? `Character ${ASSET_ROLES[useRole]?.en || "reference"} sheet of ${e.displayName}${e.role ? ` (${e.role})` : ""}: ${look || "consistent identity and wardrobe"}. ${roleShot}. ${view === "turntable" ? "Three views side by side: front, three-quarter, profile" : `${view.replace("-", " ")} view`}, neutral seamless grey studio background, soft even lighting, no props, no text. ${style}. The face, hair, wardrobe and proportions must be unambiguous so later shots can match them exactly.`
      : `Product reference photo of ${e.displayName}: ${look || "exact shape, material and color"}. ${view === "turntable" ? "Three angles side by side: front, three-quarter, top" : `${view.replace("-", " ")} view`}, centered on a neutral seamless grey background, soft studio lighting, no people, no text. ${style}. Material, hardware, proportions and color must be unambiguous so later shots can match them exactly.`);
    const job = { id: uid("job"), kind: "reference", role: useRole, entityId, shotId: null, takeId: null, mode: "t2i", provider, model: PROVIDERS[provider].name, prompt: text, negative: "text, watermark, logo, extra limbs, blurry, low quality", promptVersion: 0, compiler: "reference/1", seconds: 0, aspect: view === "turntable" ? "16:9" : isChar ? "3:4" : "1:1", inputs: { image: null, video: null, references: [] }, label: label || `${e.displayName} · ${ASSET_ROLES[useRole]?.zh || view}`, status: "queued", progress: 0, result: null, source: meta.source || "human", createdAt: new Date().toISOString() };
    store.patch((d) => {
      d.jobs.push(job);
      d.project.currentState = "GENERATING";
    });
    (hooks.generation || simulatedAdapter).submit(job, updateJob);
    return { ok: true, id: job.id, entityId, role: useRole, provider, adapter: (hooks.generation || simulatedAdapter).name, targetIds: [entityId] };
  },
});

register("generation.prompt", {
  doc: "把镜头编译成结构化 image / video(T2V,I2V) / v2v 提示词（中英）+ 负面词，存为新版本",
  params: { shotId: "string (default current)", style: "string en", styleZh: "string zh" },
  handler({ shotId, style, styleZh }) {
    const sid = shotId || D().project.currentShotId;
    const p = attachPrompts(sid, { style, styleZh });
    if (!p) return { ok: false, error: "NO_SHOT" };
    store.patch((d) => {
      const card = d.storyboard.find((c) => c.shotId === sid);
      const s = d.shots.find((x) => x.id === sid);
      if (card) {
        card.imagePrompt = s.imagePrompt;
        card.videoPrompt = s.videoPrompt;
        card.status = cardStatus(card, s, d);
      }
    });
    return { ok: true, id: sid, prompts: p };
  },
});

register("generation.submit", {
  doc: `提交生成任务。mode: ${Object.keys(GEN_MODES).join("/")}；provider: ${Object.keys(PROVIDERS).join("/")}；v2v 自动使用圈选 Take 的白模视频`,
  params: { shotId: "string", mode: "t2i|i2i|t2v|i2v|v2v", provider: "providerId", prompt: "string (override)", lang: "en|zh" },
  validate: ({ mode = "t2v", provider = "seedance-2" }) => (!PROVIDERS[provider] ? { error: "BAD_PROVIDER", allowed: Object.keys(PROVIDERS) } : !PROVIDERS[provider].modes.includes(mode) ? { error: "MODE_NOT_SUPPORTED", provider, supported: PROVIDERS[provider].modes } : null),
  handler({ shotId, mode = "t2v", provider = "seedance-2", prompt, lang = "en" }, meta) {
    const d0 = D();
    const sid = shotId || d0.project.currentShotId;
    let s = d0.shots.find((x) => x.id === sid);
    if (!s) return { ok: false, error: "NO_SHOT" };
    if (!s.prompts) {
      attachPrompts(sid);
      s = D().shots.find((x) => x.id === sid);
    }
    const P = s.prompts;
    const text = prompt || (mode === "v2v" ? P.v2v[lang] : mode.endsWith("2i") ? P.image[lang] : P.video[lang]);
    const take = d0.takes.find((t) => t.id === (s.selectedTake || s.takes.at(-1)));
    const card = d0.storyboard.find((c) => c.shotId === sid);
    const seconds = (s.range.outFrame - s.range.inFrame) / d0.project.fps;
    const job = {
      id: uid("job"),
      shotId: sid,
      takeId: mode === "v2v" || mode === "i2v" ? take?.id || null : null,
      mode,
      provider,
      model: PROVIDERS[provider].name,
      prompt: text,
      negative: P.negative[lang],
      promptVersion: s.promptVersions?.at(-1)?.version || 1,
      compiler: P.compiler,
      seconds: Math.min(seconds, PROVIDERS[provider].maxSeconds || seconds),
      aspect: d0.project.aspect,
      // reference inputs for adapters: storyboard keyframe / take thumbnail (i2v, i2i), take proxy video (v2v),
      // and the approved reference assets of the entities in this shot (identity / product consistency)
      inputs: { image: card?.keyframes?.[0] || take?.thumbnail || null, video: take?.videoUrl || null, references: referencesForShot(d0, s) },
      status: "queued",
      progress: 0,
      result: null,
      source: meta.source || "human",
      createdAt: new Date().toISOString(),
    };
    store.patch((d) => {
      d.jobs.push(job);
      d.shots.find((x) => x.id === sid).generationJobs.push(job.id);
      d.project.currentState = "GENERATING";
    });
    (hooks.generation || simulatedAdapter).submit(job, updateJob);
    return { ok: true, id: job.id, provider, mode, seconds: job.seconds, adapter: (hooks.generation || simulatedAdapter).name };
  },
});

// 长镜头：供应商单条有上限（实测 Seedance 2.5 是 30 s、2.0 是 12 s），
// 一分钟的一镜到底只能分段续拍 —— 每段用上一段的尾帧当首帧接下去，最后拼成一条。
// 这条链天然是串行的（第 N+1 段要等第 N 段出完才有首帧），换来的是接得上；
// 要快就用 renderShots 并行出多个独立镜头，两者解决的不是同一个问题。
// 生成失败分三类，处理方式完全不同 —— 一律重试只会把钱烧在必然失败的请求上。
//   transient  网络 / 超时 / 5xx / 限流：原样重试就行
//   content    内容策略拦截：同一条提示词重试多少次都会再被拦，必须换措辞，交给人或 Agent
//   fatal      参数非法、供应商不认识：重试无意义
export function classifyFailure(err) {
  const t = `${err?.code || ""} ${err?.error || ""} ${err?.message || ""}`.toLowerCase();
  if (/sensitive|policy|violation|copyright|risk|审核|违规/.test(t)) return "content";
  if (/timeout|timed out|econn|socket|network|fetch failed|rate|429|5\d\d|internal|unavailable/.test(t)) return "transient";
  if (/invalidparameter|not valid|not support|bad_|unknown|no_/.test(t)) return "fatal";
  return "transient";
}

// 长镜头：供应商单条有上限（实测 Seedance 2.5 是 30 s、2.0 是 12 s），
// 一分钟的一镜到底只能分段续拍 —— 每段用上一段的尾帧当首帧接下去，最后拼成一条。
// 这条链天然是串行的（第 N+1 段要等第 N 段出完才有首帧），换来的是接得上；
// 要快就用 renderShots 并行出多个独立镜头，两者解决的不是同一个问题。
//
// 一条链要跑十分钟以上，中途一定会遇到失败。所以：已完成的段落盘，失败的段可以单独重跑，
// resume 从第一个没完成的段接着走 —— 不是从头再来。
register("shot.chain", {
  doc: "长镜头分段续拍：切成若干段，逐段用上一段尾帧续拍，最后拼成一条。resume 从上次断掉的地方继续",
  params: { shotId: "string", provider: "providerId", segmentSeconds: "number", lang: "en|zh", resume: "boolean", retries: "number (每段瞬时故障自动重试次数，默认 2)" },
  undoable: false,
  handler({ shotId, provider = "seedance-2.5", segmentSeconds, lang = "en", resume, retries = 2 }, meta) {
    const d0 = D();
    const s = d0.shots.find((x) => x.id === (shotId || d0.project.currentShotId));
    if (!s) return { ok: false, error: "NO_SHOT" };
    if (!PROVIDERS[provider]) return { ok: false, error: "BAD_PROVIDER", allowed: Object.keys(PROVIDERS) };
    if (!hooks.film?.ready) return { ok: false, error: "FFMPEG_NOT_FOUND", hint: "续拍要靠 ffmpeg 取尾帧并拼接" };
    const adapter = hooks.generation || simulatedAdapter;

    const total = (s.range.outFrame - s.range.inFrame) / d0.project.fps;
    const cap = Math.min(Number(segmentSeconds) || PROVIDERS[provider].maxSeconds || 12, PROVIDERS[provider].maxSeconds || 12);

    // 分段方案：有拍就按拍切（超过单条上限的拍继续对半切，内容描述跟着走），
    // 没拍就均分 —— 均分只是兜底，叙事镜头应该先 shot.beats 拆一遍。
    const plan = [];
    if (s.beats?.length) {
      for (const b of s.beats) {
        const k = Math.max(1, Math.ceil(b.seconds / cap));
        for (let j = 0; j < k; j++) plan.push({ seconds: b.seconds / k, text: b.text, beat: b.text, part: k > 1 ? `${j + 1}/${k}` : null });
      }
    } else {
      const k = Math.max(1, Math.ceil(total / cap));
      for (let j = 0; j < k; j++) plan.push({ seconds: total / k, text: "", beat: null, part: null });
    }
    const n = plan.length;
    const per = total / n;
    if (n === 1) return { ok: false, error: "NO_NEED", hint: `这一镜 ${total.toFixed(1)}s，${provider} 单条放得下，直接 generation.submit 就行` };

    // 续跑：沿用上一条链已经出好的段
    const prior = resume ? d0.jobs.filter((j) => j.kind === "chain" && j.shotId === s.id).at(-1) : null;
    if (resume && !prior) return { ok: false, error: "NO_CHAIN", hint: "这一镜还没有可续跑的链" };
    if (prior && prior.status === "running") return { ok: false, error: "CHAIN_RUNNING", id: prior.id };
    const kept = prior ? (prior.parts || []).filter((p) => p.status === "done" && p.url) : [];

    if (!s.prompts) attachPrompts(s.id);
    const P = D().shots.find((x) => x.id === s.id).prompts;
    const card = d0.storyboard.find((c) => c.shotId === s.id);
    const chainId = uid("chain");
    const parent = {
      id: chainId,
      kind: "chain",
      shotId: s.id,
      mode: "chain",
      provider,
      model: PROVIDERS[provider].name,
      prompt: `${s.title} · ${total.toFixed(1)}s 分 ${n} 段续拍`,
      seconds: total,
      aspect: d0.project.aspect,
      segments: n,
      resumedFrom: prior?.id || null,
      // 每段的账本：续跑靠它，事后复盘也靠它
      // 账本里存着每段的拍内容与时间窗，「查看生成过程」就是把它显示出来
      parts: plan.map((p, i) => (kept[i] ? { ...kept[i], beat: p.text || null } : { index: i + 1, status: "queued", seconds: p.seconds, beat: p.text || null, from: Math.round(plan.slice(0, i).reduce((a, x) => a + x.seconds, 0) * 10) / 10, to: Math.round(plan.slice(0, i + 1).reduce((a, x) => a + x.seconds, 0) * 10) / 10 })),
      status: "queued",
      progress: 0,
      result: null,
      source: meta.source || "human",
      createdAt: new Date().toISOString(),
    };
    store.patch((d) => d.jobs.push(parent));

    const setPart = (i, patch) => store.patch((d) => {
      const j = d.jobs.find((x) => x.id === chainId);
      if (j) j.parts[i] = { ...j.parts[i], ...patch };
    });
    const cancelled = () => D().jobs.find((j) => j.id === chainId)?.status === "cancelled";

    (async () => {
      let firstFrame = card?.keyframes?.[0] || null;
      // 续跑时，起点是最后一个已完成段的尾帧
      if (kept.length) {
        firstFrame = await hooks.film.lastFrame(kept.at(-1).url);
        updateJob(chainId, { note: `续跑：沿用前 ${kept.length} 段` });
      }

      for (let i = 0; i < n; i++) {
        if (cancelled()) return;
        if (parent.parts[i]?.status === "done" && parent.parts[i].url) continue; // 这段上次已经出好了

        let attempt = 0;
        for (;;) {
          if (cancelled()) return;
          const mode = firstFrame ? "i2v" : "t2v";
          const segId = uid("job");
          const step = plan[i];
          const from = plan.slice(0, i).reduce((a, x) => a + x.seconds, 0);
          const beatLine = step.text ? `\nWhat happens in this segment (${from.toFixed(1)}s–${(from + step.seconds).toFixed(1)}s of the ${total.toFixed(0)}s take): ${step.text}` : "";
          const tail = `${beatLine}\nThis is segment ${i + 1} of ${n} of one continuous ${total.toFixed(0)}s take.${i ? " Continue seamlessly from the provided first frame — same subject, same lighting, same lens, no cut, no reset." : ""} The camera keeps moving in the same direction at the same speed; do not restart the move.`;
          const seg = {
            id: segId, shotId: s.id, chainId, segment: i + 1, attempt: attempt + 1, mode, provider,
            model: PROVIDERS[provider].name,
            prompt: (mode === "v2v" ? P.v2v[lang] : P.video[lang]) + tail,
            negative: P.negative[lang],
            seconds: step.seconds,
            beat: step.text || null,
            aspect: d0.project.aspect,
            inputs: { image: firstFrame, video: null, references: referencesForShot(D(), s) },
            status: "queued", progress: 0, result: null,
            source: meta.source || "human", createdAt: new Date().toISOString(),
          };
          store.patch((d) => d.jobs.push(seg));
          setPart(i, { status: "running", jobId: segId, attempt: attempt + 1 });
          updateJob(chainId, { status: "running", progress: Math.round((i / n) * 90), note: `第 ${i + 1}/${n} 段${attempt ? `（第 ${attempt + 1} 次尝试）` : ""}` });

          const done = await new Promise((resolve) => {
            adapter.submit(seg, (id, patch) => {
              updateJob(id, patch);
              if (id === segId && ["done", "failed", "cancelled"].includes(patch.status)) resolve(D().jobs.find((j) => j.id === segId));
            });
          });

          if (done?.status === "done" && done.result?.url) {
            setPart(i, { status: "done", url: done.result.url, jobId: segId, error: null });
            firstFrame = await hooks.film.lastFrame(done.result.url);
            if (!firstFrame && i < n - 1) {
              setPart(i, { status: "failed", error: "NO_TAIL_FRAME" });
              updateJob(chainId, { status: "failed", error: "NO_TAIL_FRAME", message: `第 ${i + 1} 段取不到尾帧，接不下去`, recoverable: "retry" });
              return;
            }
            break;
          }

          const kindOf = classifyFailure(done);
          setPart(i, { status: "failed", error: done?.error || "?", failure: kindOf, jobId: segId });
          if (kindOf === "transient" && attempt < retries) { attempt += 1; continue; }
          updateJob(chainId, {
            status: "failed",
            error: done?.error || "SEGMENT_FAILED",
            failure: kindOf,
            message: `第 ${i + 1}/${n} 段失败（${kindOf}）：${String(done?.error || "").slice(0, 160)}`,
            // 已经出好的段不会丢：改完提示词用 resume 接着跑
            hint: kindOf === "content"
              ? `内容策略拦截，同一条提示词重试还会被拦。改写这一镜的描述或风格后，用 shot.chain --resume 从第 ${i + 1} 段接着跑（前 ${i} 段保留）。`
              : kindOf === "fatal"
              ? `参数或供应商问题，重试没用。检查时长与模式后 shot.chain --resume。`
              : `已经自动重试 ${retries} 次仍失败。稍后 shot.chain --resume 从第 ${i + 1} 段接着跑。`,
            resumable: true,
          });
          return;
        }
      }

      if (cancelled()) return;
      updateJob(chainId, { progress: 92, note: "拼接" });
      const clips = D().jobs.find((j) => j.id === chainId).parts.map((p) => ({ shotId: s.id, index: p.index, title: `${s.title} #${p.index}`, seconds: p.seconds || per, kind: "generated", url: p.url }));
      const res = d0.project.resolution || { width: 1920, height: 1080 };
      const out = await hooks.film.assemble({ id: `${chainId}`, width: res.width, height: res.height, fps: d0.project.fps, clips }, (patch) => updateJob(chainId, { ...patch, status: patch.status === "done" ? "running" : patch.status }));
      if (!out.ok) return updateJob(chainId, { status: "failed", error: out.error, message: out.message, resumable: true });
      updateJob(chainId, { status: "done", progress: 100, note: null, result: { kind: "video", url: out.url, bytes: out.bytes, seconds: out.seconds, segments: n } });
    })().catch((err) => updateJob(chainId, { status: "failed", error: "CHAIN_FAILED", message: String(err?.message || err), resumable: true }));

    return { ok: true, id: chainId, segments: n, perSegment: Math.round(per * 10) / 10, seconds: total, provider, reused: kept.length, plan: plan.map((p, i) => ({ index: i + 1, seconds: Math.round(p.seconds * 10) / 10, beat: p.text || null })), hint: `分 ${n} 段串行续拍，每段 ${per.toFixed(1)}s${kept.length ? `（沿用 ${kept.length} 段）` : ""}` };
  },
});

register("generation.status", { doc: "查询任务", params: { id: "string" }, undoable: false, handler: ({ id }) => ({ ok: true, jobs: D().jobs.filter((j) => !id || j.id === id).map((j) => ({ id: j.id, shotId: j.shotId, mode: j.mode, provider: j.provider, status: j.status, progress: j.progress, result: j.result })) }) });
register("generation.cancel", { doc: "取消任务", params: { id: "string" }, required: ["id"], undoable: false, handler: ({ id }) => { updateJob(id, { status: "cancelled" }); return { ok: true, id }; } });
register("generation.retry", {
  doc: "重试失败/取消的任务",
  params: { id: "string" },
  required: ["id"],
  undoable: false,
  handler({ id }) {
    const j = D().jobs.find((x) => x.id === id);
    if (!j) return { ok: false, error: "NOT_FOUND" };
    updateJob(id, { status: "queued", progress: 0, result: null, retries: (j.retries || 0) + 1 });
    store.patch((d) => (d.project.currentState = "GENERATING"));
    (hooks.generation || simulatedAdapter).submit(j, updateJob);
    return { ok: true, id };
  },
});

// ============ film.* ============
// The cut: one clip per shot, in shot order, assembled into a single film. A shot's clip is either the
// blockout proxy (the Take the browser recorded) or the generated video (a done generation job) — same edit,
// two fidelities, so a half-generated film still plays end to end with blockout standing in for the rest.
function clipFor(d, shot, source) {
  const gen = d.jobs
    .filter((j) => j.shotId === shot.id && j.status === "done" && j.result?.url && (j.result.kind === "video" || /\.(mp4|webm|mov)$/i.test(j.result.url)))
    .at(-1);
  const take = d.takes.find((t) => t.id === shot.selectedTake && t.videoUrl) || d.takes.filter((t) => t.shotId === shot.id && t.videoUrl).at(-1);
  const pick =
    source === "generated" ? (gen ? { kind: "generated", url: gen.result.url, jobId: gen.id, model: gen.model, mode: gen.mode } : null)
    : source === "blockout" ? (take ? { kind: "blockout", url: take.videoUrl, takeId: take.id } : null)
    : gen ? { kind: "generated", url: gen.result.url, jobId: gen.id, model: gen.model, mode: gen.mode }
    : take ? { kind: "blockout", url: take.videoUrl, takeId: take.id }
    : null;
  return pick;
}

function editFor(d, source = "auto") {
  const fps = d.project.fps;
  return sequenceLayout(d.shots).map((seg) => {
    const shot = d.shots.find((x) => x.id === seg.shotId);
    const clip = clipFor(d, shot, source);
    return {
      shotId: shot.id,
      index: shot.index,
      title: shot.title,
      seconds: Math.round(((shot.range.outFrame - shot.range.inFrame) / fps) * 100) / 100,
      startTc: tc(seg.start),
      endTc: tc(seg.end),
      ...(clip || {}),
      kind: clip?.kind || null,
      missing: !clip,
    };
  });
}

register("film.plan", {
  doc: "成片清单：逐镜列出用哪段素材（generated 生成视频 / blockout 白模 Take）、缺哪几镜",
  params: { source: "auto|blockout|generated" },
  undoable: false,
  handler({ source = "auto" }) {
    const d = D();
    const clips = editFor(d, source);
    const ready = clips.filter((c) => !c.missing);
    return {
      ok: true,
      data: {
        source,
        shots: clips.length,
        ready: ready.length,
        missing: clips.filter((c) => c.missing).map((c) => c.shotId),
        seconds: Math.round(ready.reduce((n, c) => n + c.seconds, 0) * 100) / 100,
        fullSeconds: Math.round(clips.reduce((n, c) => n + c.seconds, 0) * 100) / 100,
        assembler: hooks.film ? { name: hooks.film.name, ready: !!hooks.film.ready } : null,
        clips,
      },
    };
  },
});

register("film.export", {
  doc: "导出成片：按镜头顺序把每镜的素材拼成一条片子（需要后端的 ffmpeg 组装器）",
  params: { source: "auto|blockout|generated", name: "string", allowPartial: "boolean (缺镜时跳过而不是报错)" },
  undoable: false,
  handler({ source = "auto", name, allowPartial = true }, meta) {
    const d = D();
    if (!hooks.film) return { ok: false, error: "NO_ASSEMBLER", hint: "成片拼接在后端完成；连上后端再试" };
    if (!hooks.film.ready) return { ok: false, error: "FFMPEG_NOT_FOUND", hint: "后端找不到 ffmpeg：brew install ffmpeg，或启动时 --ffmpeg /path/to/ffmpeg" };
    const clips = editFor(d, source);
    const usable = clips.filter((c) => !c.missing);
    if (!usable.length) return { ok: false, error: "NO_CLIPS", hint: source === "generated" ? "还没有任何生成结果" : "先录一条白模 Take" };
    if (usable.length < clips.length && !allowPartial) return { ok: false, error: "INCOMPLETE", missing: clips.filter((c) => c.missing).map((c) => c.shotId) };

    const id = uid("film");
    const res = d.project.resolution || { width: 1920, height: 1080 };
    const job = {
      id,
      kind: "film",
      shotId: null,
      mode: "assemble",
      provider: "ffmpeg",
      model: "ffmpeg",
      filmSource: source,
      prompt: `${d.project.name} · ${usable.length}/${clips.length} 镜 · ${source}`,
      seconds: Math.round(usable.reduce((n, c) => n + c.seconds, 0) * 100) / 100,
      aspect: d.project.aspect,
      status: "queued",
      progress: 0,
      result: null,
      clips: usable.map((c) => ({ shotId: c.shotId, index: c.index, title: c.title, seconds: c.seconds, kind: c.kind, url: c.url })),
      source: meta.source || "human",
      createdAt: new Date().toISOString(),
    };
    store.patch((x) => x.jobs.push(job));

    // async like generation.submit: the job carries progress, SSE pushes it, film.status reads it
    Promise.resolve()
      .then(() => hooks.film.assemble({ id: name ? String(name).replace(/\.mp4$/i, "").replace(/[^\w.-]+/g, "_") : id, width: res.width, height: res.height, fps: d.project.fps, clips: job.clips }, (patch) => updateJob(id, patch)))
      .then((out) => {
        if (!out.ok) return updateJob(id, { status: "failed", error: out.error, message: out.message, hint: out.hint, progress: 0 });
        updateJob(id, { status: "done", progress: 100, result: { kind: "video", url: out.url, bytes: out.bytes, seconds: out.seconds, clips: out.clips } });
        store.patch((x) => (x.project.filmUrl = out.url));
      })
      .catch((err) => updateJob(id, { status: "failed", error: "ASSEMBLE_FAILED", message: String(err?.message || err) }));

    return { ok: true, id, queued: true, used: usable.length, of: clips.length, source, seconds: job.seconds, hint: "拼接中；film.status 或 SSE 看进度" };
  },
});

register("film.status", {
  doc: "成片拼接任务状态",
  params: { id: "string" },
  undoable: false,
  handler: ({ id }) => ({ ok: true, jobs: D().jobs.filter((j) => j.kind === "film" && (!id || j.id === id)).map((j) => ({ id: j.id, status: j.status, progress: j.progress, note: j.note, error: j.error, result: j.result, clips: j.clips?.length, seconds: j.seconds })) }),
});

// ============ review.* ============
register("review.compare", {
  doc: "比较两个 Take 的机位/灯光/物体差异",
  params: { a: "takeId", b: "takeId" },
  required: ["a", "b"],
  undoable: false,
  handler({ a, b }) {
    const d = D();
    const A = d.takes.find((t) => t.id === a), B = d.takes.find((t) => t.id === b);
    if (!A || !B) return { ok: false, error: "NOT_FOUND" };
    const diff = [];
    const camA = A.snapshot.cameras.find((c) => c.id === A.snapshot.cameraId), camB = B.snapshot.cameras.find((c) => c.id === B.snapshot.cameraId);
    if (camA && camB) {
      if (camA.lens.focalLength !== camB.lens.focalLength) diff.push({ field: "focal", a: camA.lens.focalLength, b: camB.lens.focalLength });
      const dp = camA.pose.position.map((v, i) => Math.abs(v - camB.pose.position[i]));
      if (Math.max(...dp) > 0.01) diff.push({ field: "camera.position", a: camA.pose.position, b: camB.pose.position });
    }
    if (A.motion.type !== B.motion.type) diff.push({ field: "motion", a: A.motion.type, b: B.motion.type });
    for (const ea of A.snapshot.entities) {
      const eb = B.snapshot.entities.find((e) => e.id === ea.id);
      if (!eb) diff.push({ field: `entity.${ea.id}`, a: "present", b: "missing" });
      else if (ea.transform.position.some((v, i) => Math.abs(v - eb.transform.position[i]) > 0.01)) diff.push({ field: `entity.${ea.id}.position`, a: ea.transform.position, b: eb.transform.position });
      else if (ea.pose !== eb.pose) diff.push({ field: `entity.${ea.id}.pose`, a: ea.pose, b: eb.pose });
    }
    for (const la of A.snapshot.lights) {
      const lb = B.snapshot.lights.find((l) => l.id === la.id);
      if (lb && (la.intensity !== lb.intensity || la.color !== lb.color)) diff.push({ field: `light.${la.id}`, a: `${la.color} ${la.intensity}`, b: `${lb.color} ${lb.intensity}` });
    }
    return { ok: true, a, b, diff };
  },
});

// ============ context.* / health.* ============
export function summarize(d = D()) {
  const assets = (d.assets || []).map((a) => ({ id: a.id, entityId: a.entityId, label: a.label, approved: a.approved, kind: a.kind }));
  const shot = d.shots.find((s) => s.id === d.project.currentShotId);
  return {
    runtime: RUNTIME_VERSION,
    project: { id: d.project.id, name: d.project.name, fps: d.project.fps, aspect: d.project.aspect, version: d.project.version, state: d.project.currentState, fidelity: d.project.fidelity, buildMode: d.project.buildMode || "set", playhead: d.project.playhead, timecode: tc(d.project.playhead, d.project.fps) },
    assets,
    scene: { id: d.scene.id, name: d.scene.name, environment: d.scene.environment },
    programCamera: d.project.programCameraId,
    currentShot: shot ? { id: shot.id, index: shot.index, title: shot.title, motion: shot.motion.type, seconds: (shot.range.outFrame - shot.range.inFrame) / d.project.fps, status: shot.status } : null,
    entities: d.entities.map((e) => ({ id: e.id, type: e.semanticType, name: e.displayName, role: e.role, position: e.transform.position.map((v) => +v.toFixed(2)), yaw: +e.transform.rotation[1].toFixed(2), pose: e.pose, proxy: e.proxy.geometry, usedByShots: e.usedByShots, memory: e.agentMemory })),
    cameras: d.cameras.map((c) => ({ id: c.id, name: c.name, focal: c.lens.focalLength, aperture: c.lens.aperture, position: c.pose.position.map((v) => +v.toFixed(2)), target: c.target, rig: c.rig, preset: c.preset })),
    lights: d.lights.map((l) => ({ id: l.id, name: l.name, type: l.type, group: l.group, color: l.color, intensity: l.intensity, enabled: l.enabled, position: l.transform.position })),
    shots: d.shots.map((s) => ({ id: s.id, index: s.index, title: s.title, camera: s.cameraId, focal: s.lens.focalLength, motion: s.motion.type, seconds: (s.range.outFrame - s.range.inFrame) / d.project.fps, targets: s.targetIds, status: s.status, takes: s.takes.length, keyframes: s.keyframes?.length || 0, hasPrompts: !!s.prompts })),
    takes: d.takes.map((t) => ({ id: t.id, shotId: t.shotId, name: t.name, status: t.status, hasVideo: !!t.videoUrl })),
    storyboard: d.storyboard.map((c) => ({ id: c.id, shotId: c.shotId, status: c.status, take: c.selectedTake })),
    jobs: d.jobs.map((j) => ({ id: j.id, shotId: j.shotId, mode: j.mode, provider: j.provider, status: j.status, progress: j.progress })),
    history: historyInfo(),
  };
}

register("review.verify", {
  doc: "自动验收：把这一镜新生成的结果和已批准的那一版对比 —— 要改的改了没有，锁住的有没有漂",
  params: { shotId: "string", jobId: "string (默认最后一条成功的生成)", against: "string (基准 jobId / 媒体地址；默认锁里记的那版)", request: "string (这次要求改什么)" },
  undoable: false,
  handler({ shotId, jobId, against, request }, meta) {
    const d0 = D();
    const s = d0.shots.find((x) => x.id === (shotId || d0.project.currentShotId));
    if (!s) return { ok: false, error: "NO_SHOT" };
    if (!hooks.judge) return { ok: false, error: "NO_JUDGE", hint: "验收在后端做；连上后端再试" };
    if (!hooks.judge.ready) return { ok: false, error: "JUDGE_NOT_READY", hint: "需要网关密钥（--llm-key-file）和 ffmpeg" };

    const vids = d0.jobs.filter((j) => j.shotId === s.id && j.status === "done" && j.result?.url && /\.(mp4|webm|mov)$/i.test(j.result.url));
    const after = jobId ? vids.find((j) => j.id === jobId) : vids.at(-1);
    if (!after) return { ok: false, error: "NO_RESULT", hint: "这一镜还没有可验收的生成结果" };
    const baselineRef =
      against ? (vids.find((j) => j.id === against)?.result?.url || against)
      : s.locks?.jobId && vids.find((j) => j.id === s.locks.jobId)?.result?.url
      || s.locks?.reference
      || vids.filter((j) => j.id !== after.id).at(-1)?.result?.url
      || null;
    if (!baselineRef) return { ok: false, error: "NO_BASELINE", hint: "没有基准版本：先 shot.lock 把满意的那一版记下来" };

    const id = uid("vfy");
    const job = {
      id,
      kind: "verify",
      shotId: s.id,
      mode: "verify",
      provider: "judge",
      model: hooks.judge.model,
      prompt: request || s.lastMove ? `${request || ""}` : "",
      status: "queued",
      progress: 0,
      result: null,
      source: meta.source || "human",
      createdAt: new Date().toISOString(),
    };
    store.patch((d) => d.jobs.push(job));

    const locks = (s.locks?.aspects || []).map((a) => ({ aspect: a, ...LOCK_ASPECTS[a] }));
    const mv = s.lastMove;
    Promise.resolve()
      .then(() => {
        updateJob(id, { status: "running", progress: 20 });
        return hooks.judge.verify({
          shotId: s.id,
          shotTitle: `${s.index} ${s.title}`,
          request: request || "",
          expectedMove: mv ? `横移 ${(mv.right || 0).toFixed(2)}m / 升降 ${(mv.up || 0).toFixed(2)}m / 推拉 ${(mv.forward || 0).toFixed(2)}m，只平移不摇不变焦` : "",
          locks,
          before: baselineRef,
          after: after.result.url,
        });
      })
      .then((v) => {
        if (!v.ok) return updateJob(id, { status: "failed", error: v.error, message: v.message, hint: v.hint });
        updateJob(id, { status: "done", progress: 100, result: { kind: "verdict", ...v } });
        // 结论只进评审记录，不自动通过也不自动打回 —— 判定模型同样会错
        store.patch((d) => {
          const sh = d.shots.find((x) => x.id === s.id);
          sh.lastVerdict = { at: new Date().toISOString(), jobId: after.id, applied: v.applied, worst: v.worst, cameraMove: v.cameraMove, summary: v.summary, drift: v.drift };
        });
      })
      .catch((err) => updateJob(id, { status: "failed", error: "JUDGE_FAILED", message: String(err?.message || err) }));

    return { ok: true, id, queued: true, against: baselineRef, checking: locks.map((l) => l.zh), hint: "验收中；review.verdict 或 SSE 看结果" };
  },
});

register("review.verdict", {
  doc: "读验收结论",
  params: { shotId: "string" },
  undoable: false,
  handler: ({ shotId }) => {
    const d = D();
    const s = d.shots.find((x) => x.id === (shotId || d.project.currentShotId));
    return s ? { ok: true, data: { shotId: s.id, locks: s.locks?.aspects || [], verdict: s.lastVerdict || null } } : { ok: false, error: "NO_SHOT" };
  },
});

register("context.scene", { doc: "当前场景摘要（Agent 记忆入口）", undoable: false, handler: () => ({ ok: true, data: summarize() }) });
register("context.project", { doc: "完整工程 JSON", undoable: false, handler: () => ({ ok: true, data: persistable() }) });
register("context.shot", {
  doc: "镜头详情：参数、起止机位状态、提示词",
  params: { id: "string (default current)" },
  undoable: false,
  handler({ id }) {
    const d = D();
    const s = d.shots.find((x) => x.id === (id || d.project.currentShotId));
    if (!s) return { ok: false, error: "NO_SHOT" };
    return { ok: true, data: { ...s, start: cameraStateAt(d, s, s.range.inFrame), end: cameraStateAt(d, s, s.range.outFrame), timecode: { in: tc(s.range.inFrame), out: tc(s.range.outFrame) }, takes: d.takes.filter((t) => t.shotId === s.id).map((t) => ({ id: t.id, name: t.name, status: t.status })) } };
  },
});
register("context.entity", { doc: "实体详情", params: { id: "string" }, required: ["id"], undoable: false, handler: ({ id }) => { const e = D().entities.find((x) => x.id === id); return e ? { ok: true, data: e } : { ok: false, error: "NOT_FOUND" }; } });
register("context.events", { doc: "最近事件", params: { limit: "number" }, undoable: false, handler: ({ limit = 30 }) => ({ ok: true, data: D().events.slice(0, Number(limit)).map((e) => ({ id: e.id, action: e.action, source: e.source, actorId: e.actorId, targetIds: e.targetIds, ok: e.ok, undoable: e.undoable, ms: e.ms, at: e.timestamp })) }) });
register("context.history", { doc: "撤销栈信息", undoable: false, handler: () => ({ ok: true, data: historyInfo() }) });
register("context.capabilities", { doc: "列出全部 Action 及参数、状态机许可（Agent 工具清单）", undoable: false, handler: () => ({ ok: true, data: capabilities() }) });
register("context.sequence", { doc: "镜头序列时间布局", undoable: false, handler: () => ({ ok: true, data: sequenceLayout(D().shots).map((x) => ({ ...x, in: tc(x.start), out: tc(x.end) })) }) });
register("context.schema", { doc: "词汇表：语义类型、姿态、运镜、景别、灯光预设、供应商", undoable: false, handler: () => ({ ok: true, data: { semanticTypes: SEMANTIC_PROXY, poses: Object.keys(POSES), joints: JOINT_NAMES, motions: Object.fromEntries(Object.entries(MOTION_TYPES).map(([k, v]) => [k, { zh: v.zh, en: v.en, rig: v.rig, params: v.params }])), shotSizes: SHOT_SIZES, coverage: COVERAGE_ANGLES, lightPresets: Object.fromEntries(Object.entries(LIGHT_PRESETS).map(([k, v]) => [k, v.zh])), lightTypes: LIGHT_TYPES, rigs: CAMERA_RIGS, providers: PROVIDERS, genModes: GEN_MODES, states: STATE_MACHINE, aspects: Object.keys(ASPECTS) } }) });

register("health.report", {
  doc: "运行健康：fps、draw calls、命令延迟、录像器、桥接",
  undoable: false,
  handler() {
    const d = D();
    return { ok: true, data: { ...d.health, runtime: RUNTIME_VERSION, entities: d.entities.length, cameras: d.cameras.length, lights: d.lights.length, shots: d.shots.length, takes: d.takes.length, jobs: d.jobs.length, events: d.events.length, state: d.project.currentState, version: d.project.version, history: historyInfo() } };
  },
});

export function capabilities() {
  return [...registry.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, def]) => ({ name, doc: def.doc, params: def.params, required: def.required || [], undoable: !!def.undoable, allowedIn: STATE_MACHINE.filter((s) => canRun(name, s)) }));
}

export { registry, compileShot, snapshotScene, refreshUsedBy, simulatedAdapter };
