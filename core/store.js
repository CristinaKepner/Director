// Director Runtime store: engine-agnostic Source of Truth + history (undo/redo) + persistence.
import { STATE_MACHINE, STATE_RULES, uid } from "./schema.js";

export { STATE_MACHINE };

const listeners = new Set();
const HISTORY_LIMIT = 80;
const EMPTY = Object.freeze([]); // 深拷贝时给 events 占位，绝不写入
let history = []; // [{ snapshot, eventId, label }]
let future = [];

export function createEmptyProject() {
  return {
    project: {
      id: "proj_" + Math.random().toString(36).slice(2, 8),
      name: "Untitled Stage",
      fps: 24,
      resolution: { width: 1920, height: 1080 },
      aspect: "16:9",
      unit: "meter",
      version: 1,
      currentState: "EDIT",
      fidelity: "blockout",
      workspace: "director",
      bottomTab: "timeline",
      viewMode: "free",
      pip: true,
      safeFrame: true,
      showHelpers: true,
      gizmoMode: "translate",
      selectedId: null,
      selectedKind: null,
      programCameraId: null,
      previewCameraId: null,
      currentShotId: null,
      activePadId: null, // 台面分了块时，当前在看/在改的那块；null = 整台
      playhead: 0,
      playing: false,
      loop: false,
      playSequence: false,
      recording: null,
      savedAt: null,
    },
    scene: {
      id: "scene_empty",
      name: "Empty Stage",
      environment: { preset: "night-neon", bg: "#07080d", fog: 0.02, ambient: 0.15, sky: "#26304a", ground: "#150c0c", exposure: 1.25, wet: true },
    },
    entities: [],
    cameras: [],
    lights: [],
    shots: [],
    takes: [],
    storyboard: [],
    jobs: [],
    annotations: [],
    assets: [], // reference / generated assets bound to entities → consistency across generations
    events: [],
    agent: {
      mode: "collaborative",
      backend: "rules",
      busy: false,
      pendingPlan: null,
      suggest: [], // 下一步建议：由 planner 根据当前工程给出，前端兜底用内置规则
      messages: [
        {
          role: "agent",
          text: "说一句你要的镜头、机位、动作或光。每一步都可撤销。",
        },
      ],
    },
    health: { fps: 0, drawCalls: 0, triangles: 0, lastCommandMs: 0, recorder: "idle", bridge: "offline", llm: "rules" },
  };
}

export const store = {
  data: createEmptyProject(),
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  get() {
    return this.data;
  },
  notify(info = {}) {
    listeners.forEach((fn) => {
      try {
        fn(this.data, info);
      } catch (err) {
        console.warn("listener", err);
      }
    });
  },
  // Full replacement (clone based). Bumps project version.
  set(next, event, info = {}) {
    this.data = next;
    if (event) this.data.events = [event, ...this.data.events].slice(0, 400);
    this.data.project.version += 1;
    this.notify(info);
  },
  patch(mutator, event, info = {}) {
    // 事件日志只追加，没有任何 handler 会去动它 —— 可它是状态的一部分，于是每个 Action
    // 的深拷贝都要把它整份复制一遍。一条 10 分钟的片子里事件日志能占到状态的一大半
    // （before/after 里带着 base64 缩略图），结果点一下镜头要等将近一秒。
    // 拷贝时把它摘出去、拷完原样接回来：省下的正是这一半。
    const events = this.data.events;
    this.data.events = EMPTY;
    let clone;
    try {
      clone = structuredClone(this.data);
    } finally {
      this.data.events = events;
    }
    clone.events = events;
    mutator(clone);
    this.set(clone, event, info);
  },
  // In-place mutation for high-frequency UI/transport state (playhead, health). Not versioned, not undoable.
  light(mutator) {
    mutator(this.data);
    this.notify({ light: true });
  },
};

// ---- history ----
export function pushHistory(label, eventId) {
  history.push({ snapshot: persistable(store.data, { events: 0 }), label, eventId });
  if (history.length > HISTORY_LIMIT) history.shift();
  future = [];
}

export function popHistory() {
  history.pop();
}

export function clearHistory() {
  history = [];
  future = [];
}

export function undo() {
  const entry = history.pop();
  if (!entry) return { ok: false, error: "NOTHING_TO_UNDO" };
  future.push({ snapshot: persistable(store.data, { events: 0 }), label: entry.label, eventId: entry.eventId });
  restoreSnapshot(entry.snapshot);
  return { ok: true, label: entry.label, eventId: entry.eventId };
}

export function redo() {
  const entry = future.pop();
  if (!entry) return { ok: false, error: "NOTHING_TO_REDO" };
  history.push({ snapshot: persistable(store.data, { events: 0 }), label: entry.label, eventId: entry.eventId });
  restoreSnapshot(entry.snapshot);
  return { ok: true, label: entry.label };
}

export function undoToEvent(eventId) {
  const idx = history.findIndex((h) => h.eventId === eventId);
  if (idx < 0) return { ok: false, error: "EVENT_NOT_IN_HISTORY" };
  let n = history.length - idx;
  let last;
  while (n-- > 0) last = undo();
  return { ok: true, undone: history.length - idx, last };
}

export function historyInfo() {
  return { undo: history.length, redo: future.length, labels: history.slice(-8).map((h) => h.label).reverse() };
}

function restoreSnapshot(snap) {
  const keep = { events: store.data.events, agent: store.data.agent, health: store.data.health };
  const next = structuredClone(snap);
  next.events = keep.events;
  next.agent = keep.agent;
  next.health = keep.health;
  // transient UI flags should not come back from history
  next.project.playing = false;
  next.project.recording = null;
  next.project.selectedId = store.data.project.selectedId;
  next.project.selectedKind = store.data.project.selectedKind;
  next.project.bottomTab = store.data.project.bottomTab;
  next.project.viewMode = store.data.project.viewMode;
  store.set(next, null, { restored: true });
}

// ---- persistence ----
// 换工程 = 换话题。保留导演的偏好（协作模式、规划后端），但对话本身跟着上一个工程走：
// 里面的工具卡片指向的是已经不存在的对象，而且规划器会把最近 8 条当上下文喂给模型——
// 不清掉的话，新工程的第一条指令会带着上一个工程的实体去推理。
export function resetAgent(prev = {}) {
  const fresh = createEmptyProject().agent;
  return { ...fresh, mode: prev.mode ?? fresh.mode, backend: prev.backend ?? fresh.backend };
}

// events：要留多少条事件。先截断再深拷贝 —— 反过来会先把整份日志复制一遍再扔掉。
// 撤销栈的快照传 0：restoreSnapshot 本来就保留当前的事件日志，快照里那一份纯属白带。
export function persistable(d = store.data, { events = 200 } = {}) {
  const { agent, health, events: log, ...rest } = d;
  const copy = structuredClone(rest);
  copy.events = events ? structuredClone((log || []).slice(0, events)) : [];
  copy.project.playing = false;
  copy.project.recording = null;
  copy.takes = copy.takes.map((t) => ({ ...t, videoUrl: t.videoUrl && t.videoUrl.startsWith("blob:") ? null : t.videoUrl }));
  return copy;
}

export function loadProjectData(json) {
  const base = createEmptyProject();
  const next = { ...base, ...json, agent: resetAgent(store.data.agent), health: store.data.health };
  next.project = { ...base.project, ...json.project, playing: false, recording: null };
  next.scene = { ...base.scene, ...json.scene, environment: { ...base.scene.environment, ...(json.scene?.environment || {}) } };
  for (const k of ["entities", "cameras", "lights", "shots", "takes", "storyboard", "jobs", "annotations", "assets", "events"]) next[k] = Array.isArray(json[k]) ? json[k] : [];
  next.takes.forEach((t) => t.status === "recording" && (t.status = "aborted"));
  next.jobs.forEach((j) => ["queued", "running"].includes(j.status) && (j.status = "failed"));
  if (["RECORDING", "ARMED", "GENERATING"].includes(next.project.currentState)) next.project.currentState = "REVIEW";
  history = [];
  future = [];
  store.set(next, null, { loaded: true });
}

export function emitEvent(partial) {
  return {
    id: uid("evt"),
    timestamp: new Date().toISOString(),
    undoable: true,
    projectVersion: store.data.project.version,
    source: "human",
    targetIds: [],
    payload: {},
    ...partial,
  };
}

export function canRun(action, state = store.data.project.currentState) {
  const rule = STATE_RULES[state] || STATE_RULES.EDIT;
  const hit = (list) => (list || []).some((p) => p === "*" || action === p || action.startsWith(p));
  if (hit(rule.deny)) return false;
  return hit(rule.allow);
}

export function find(kind, id, d = store.data) {
  const coll = { entity: d.entities, camera: d.cameras, light: d.lights, shot: d.shots, take: d.takes, card: d.storyboard, job: d.jobs, asset: d.assets }[kind];
  return coll?.find((x) => x.id === id) || null;
}

export { uid };
