// Director Runtime store: engine-agnostic Source of Truth + history (undo/redo) + persistence.
import { STATE_MACHINE, STATE_RULES, uid } from "./schema.js";

export { STATE_MACHINE };

const listeners = new Set();
const HISTORY_LIMIT = 80;
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
    const clone = structuredClone(this.data);
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
  history.push({ snapshot: persistable(store.data), label, eventId });
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
  future.push({ snapshot: persistable(store.data), label: entry.label, eventId: entry.eventId });
  restoreSnapshot(entry.snapshot);
  return { ok: true, label: entry.label, eventId: entry.eventId };
}

export function redo() {
  const entry = future.pop();
  if (!entry) return { ok: false, error: "NOTHING_TO_REDO" };
  history.push({ snapshot: persistable(store.data), label: entry.label, eventId: entry.eventId });
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
export function persistable(d = store.data) {
  const { agent, health, ...rest } = d;
  const copy = structuredClone(rest);
  copy.events = copy.events.slice(0, 200);
  copy.project.playing = false;
  copy.project.recording = null;
  copy.takes = copy.takes.map((t) => ({ ...t, videoUrl: t.videoUrl && t.videoUrl.startsWith("blob:") ? null : t.videoUrl }));
  return copy;
}

export function loadProjectData(json) {
  const base = createEmptyProject();
  const next = { ...base, ...json, agent: store.data.agent, health: store.data.health };
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
