// Frontend ↔ backend client. The page keeps a local replica of the Director Runtime (same core modules) for
// rendering; every state-changing Action is sent to the backend (Source of Truth) and the returned / streamed
// snapshot is applied back. Pure view actions run locally. Without a reachable backend the page runs standalone.
import { store, persistable } from "../../core/store.js";
import { dispatch as localDispatch, getHooks } from "../../core/actions.js";

export const client = { mode: "connecting", base: null, version: 0, seq: 0, lastError: null, listeners: new Set() };

// project fields owned by this browser (never overwritten by a remote snapshot)
const UI_FIELDS = ["selectedId", "selectedKind", "bottomTab", "viewMode", "pip", "safeFrame", "showHelpers", "gizmoMode", "playhead", "playing", "loop", "playSequence", "previewCameraId", "workspace"];
// actions that only touch UI fields → executed on the local replica only
const LOCAL_ACTIONS = new Set(["project.set-view", "project.set-gizmo", "project.select", "timeline.seek", "timeline.play", "timeline.pause", "timeline.stop", "health.report", "context.scene", "context.project", "context.shot", "context.entity", "context.events", "context.sequence", "context.schema", "context.capabilities"]);

// ---------- API base ----------
export function resolveApiBase() {
  const q = new URLSearchParams(location.search).get("api");
  const meta = document.querySelector('meta[name="director-api"]')?.content;
  const raw = window.DIRECTOR_API || q || meta || "../api/";
  const u = new URL(raw.replace(/\/?$/, "/"), document.baseURI);
  return u.toString();
}

async function http(path, opts = {}) {
  const url = new URL(path.replace(/^\//, ""), client.base);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), opts.timeout || 20000);
  try {
    const res = await fetch(url, { ...opts, signal: ctl.signal, headers: { ...(opts.body && !(opts.body instanceof Blob) ? { "content-type": "application/json" } : {}), ...(opts.headers || {}) } });
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}
export const api = {
  get: (p, o) => http(p, o),
  post: (p, body, o = {}) => http(p, { method: "POST", body: body instanceof Blob ? body : JSON.stringify(body), ...o }),
};

// ---------- connection ----------
export async function connect() {
  client.base = resolveApiBase();
  setMode("connecting");
  try {
    const h = await api.get("health", { timeout: 3000 });
    if (!h?.ok) throw new Error("bad health");
    client.service = h.service;
    client.generation = h.generation || null;
  } catch (err) {
    client.lastError = String(err?.message || err);
    setMode("standalone");
    return false;
  }
  await openStream();
  return client.mode === "online";
}

let es = null, retry = 1000;
function openStream() {
  return new Promise((resolve) => {
    let settled = false;
    try {
      es = new EventSource(new URL("events", client.base));
    } catch {
      setMode("standalone");
      return resolve();
    }
    es.addEventListener("hello", (ev) => {
      const msg = JSON.parse(ev.data);
      retry = 1000;
      applyRemote(msg.snapshot, msg.version, { full: true });
      setMode("online");
      if (!settled) {
        settled = true;
        resolve();
      }
    });
    es.addEventListener("state", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.seq && msg.seq <= client.seq) return;
      client.seq = msg.seq || client.seq;
      applyRemote(msg.snapshot, msg.version, { event: msg.event });
    });
    es.onerror = () => {
      es.close();
      if (client.mode === "online") setMode("reconnecting");
      else if (!settled) {
        settled = true;
        setMode("standalone");
        resolve();
        return;
      }
      setTimeout(openStream, Math.min((retry *= 1.6), 15000));
    };
  });
}

function setMode(m) {
  client.mode = m;
  store.light((d) => (d.health.bridge = m));
  for (const fn of client.listeners) fn(m);
}
export function onMode(fn) {
  client.listeners.add(fn);
  return () => client.listeners.delete(fn);
}
export const isOnline = () => client.mode === "online";

// ---------- apply a backend snapshot to the local replica ----------
export function applyRemote(snapshot, version, opts = {}) {
  if (!snapshot || !snapshot.project) return;
  const cur = store.get();
  const next = { ...cur, ...structuredClone(snapshot), health: cur.health };
  next.project = { ...next.project };
  for (const k of UI_FIELDS) next.project[k] = cur.project[k];
  if (cur.project.playing && cur.project.playSequence) {
    next.project.currentShotId = cur.project.currentShotId;
    next.project.programCameraId = cur.project.programCameraId;
  }
  if (!next.agent) next.agent = cur.agent;
  next.project.version = (version ?? next.project.version) - 1; // store.set bumps it back to the backend version
  client.version = version ?? next.project.version + 1;
  store.set(next, null, { remote: true, ...opts });
}

// ---------- dispatch router ----------
export async function dispatch(name, payload = {}, meta = {}) {
  if (!isOnline() || LOCAL_ACTIONS.has(name)) return localDispatch(name, payload, meta);
  if (name === "take.finish" && payload.videoUrl && payload.videoUrl.startsWith("blob:")) payload = { ...payload, videoUrl: await uploadBlob(payload.id, payload.videoUrl) };
  const body = { action: name, payload, meta: { source: meta.source || "human", actorId: meta.actorId || "console", dryRun: !!meta.dryRun, idempotencyKey: meta.idempotencyKey, silent: !!meta.silent, capture: name === "take.record" || name === "take.stop" }, withState: true };
  let r;
  try {
    r = await api.post("actions", body);
  } catch (err) {
    return { ok: false, error: "BACKEND_UNREACHABLE", action: name, message: String(err?.message || err) };
  }
  if (r.snapshot) {
    applyRemote(r.snapshot, r.version, { own: name });
    delete r.snapshot;
  }
  localEffects(name, payload, r);
  return r;
}

// view-side effects the backend cannot do for us (its copies of these fields are ignored, see UI_FIELDS)
function localEffects(name, payload, r) {
  if (!r?.ok) return;
  const d = store.get();
  const shotOf = (id) => d.shots.find((s) => s.id === (id || d.project.currentShotId));
  if (name === "take.arm") {
    const s = shotOf(payload.shotId);
    store.light((x) => Object.assign(x.project, { viewMode: "program", playhead: s ? s.range.inFrame : 0, playing: false }));
  } else if (name === "take.record") {
    const take = d.takes.find((t) => t.id === r.id);
    const s = take && d.shots.find((x) => x.id === take.shotId);
    store.light((x) => Object.assign(x.project, { viewMode: "program", playhead: s ? s.range.inFrame : 0, playing: true, playSequence: false, loop: false }));
    const rec = getHooks().recorder;
    if (r.awaiting === "client" && rec && take && s) rec.start(take, s);
  } else if (name === "take.stop") {
    const rec = getHooks().recorder;
    if (rec) rec.stop(r.id);
    store.light((x) => (x.project.playing = false));
  } else if (name === "take.finish") {
    store.light((x) => (x.project.playing = false));
  } else if (name === "shot.select" || name === "shot.preview") {
    const s = shotOf(payload.id);
    store.light((x) => Object.assign(x.project, { playhead: s ? s.range.inFrame : 0, playing: name === "shot.preview", loop: name === "shot.preview" ? !!payload.loop : x.project.loop, playSequence: false, ...(name === "shot.preview" ? { viewMode: "program" } : {}) }));
  } else if (name === "camera.pilot") {
    store.light((x) => Object.assign(x.project, { viewMode: payload.view === false ? x.project.viewMode : "program", selectedKind: "camera", selectedId: payload.id }));
  } else if (name === "entity.create" || name === "camera.create" || name === "light.create") {
    const kind = name.split(".")[0];
    if (r.id) store.light((x) => Object.assign(x.project, { selectedKind: kind, selectedId: r.id }));
  } else if (name === "scene.demo" || name === "project.load" || name === "project.new") {
    store.light((x) => Object.assign(x.project, { selectedId: null, selectedKind: null, playing: false, playhead: 0 }));
  }
  store.notify({ light: true });
}

async function uploadBlob(takeId, blobUrl) {
  try {
    const blob = await (await fetch(blobUrl)).blob();
    const r = await api.post(`takes/${takeId}/media`, blob, { headers: { "content-type": blob.type || "video/webm" }, timeout: 120000 });
    if (r.ok && r.url) return r.url; // relative "/media/<file>" — resolved against the API root when rendered
  } catch (err) {
    console.warn("media upload failed", err);
  }
  return null;
}

export function exportLocal() {
  return persistable(store.get());
}
