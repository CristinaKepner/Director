// Editor boot. The editor is a shell: the server's world runtime is the source of truth. We
// read a snapshot, subscribe to the project's SSE stream, and every change we make is an
// Action sent to /api/projects/<id>/actions — the same entry the assistant and the CLI use.
import { T, lang, mountLanguage, setLang } from '../i18n.js';
import { createStage } from './scene.js';
import { KINDS } from './kit.js';
import { mountUI } from './ui.js';
mountLanguage();
const q = new URLSearchParams(location.search);
const projectId = q.get('project');
const up = (msg) => parent !== window && parent.postMessage(msg, location.origin);
const t = (en, zh) => T(en, zh);
const toasts = document.getElementById('toasts');
const status = document.getElementById('status');
let statusTimer;
function say(text, ms = 2600) {
  if (!text) {
    status.hidden = true;
    return;
  }
  status.textContent = text;
  status.hidden = false;
  clearTimeout(statusTimer);
  if (ms) statusTimer = setTimeout(() => (status.hidden = true), ms);
}
function toast(text) {
  const el = document.createElement('div');
  el.className = 'cm-toast';
  el.textContent = text;
  toasts.append(el);
  setTimeout(() => el.remove(), 3200);
}
async function invoke(action, payload = {}, meta = {}) {
  const r = await fetch(`/api/projects/${projectId}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cinemap-lang': lang() }, body: JSON.stringify({ action, payload, meta }) });
  const out = await r.json().catch(() => ({ ok: false, error: 'BAD_RESPONSE' }));
  if (!out.ok && !meta.quiet) say(`${action}: ${out.hint || out.error || 'failed'}`);
  return out;
}

const ctxRes = await fetch(`/api/projects/${projectId}/context`);
if (!ctxRes.ok) {
  say(t('This project could not be opened.', '打不开这个项目。'), 0);
  throw new Error('project');
}
let snap = await ctxRes.json();
const [assets] = await Promise.all([fetch('/api/assets').then((r) => r.json()).then((j) => j.assets).catch(() => [])]);
const stage = createStage(document.getElementById('world'));
const state = {
  projectId,
  env: snap.env,
  settings: snap.settings,
  items: snap.items,
  assets,
  invoke,
  world: () => ({ size: snap.size, settings: snap.settings, items: snap.items }),
};
stage.buildGround(state.env, state.settings);
stage.applyItems(snap.items, state.env);
stage.setClock(state.settings.hour, state.settings.weather);
stage.recentre(state.env.size);

let ui;
let lastSettings = JSON.stringify(snap.settings);
function apply(next) {
  snap = next;
  const groundChanged = next.size !== state.env.size || next.settings.backdrop !== state.settings.backdrop || next.settings.weather !== state.settings.weather && (next.settings.weather === 'snow' || state.settings.weather === 'snow');
  state.env = next.env;
  state.settings = next.settings;
  state.items = next.items;
  if (groundChanged) stage.buildGround(state.env, state.settings);
  stage.applyItems(next.items, state.env);
  if (JSON.stringify(next.settings) !== lastSettings) {
    lastSettings = JSON.stringify(next.settings);
    stage.setClock(next.settings.hour, next.settings.weather);
  }
  ui?.paintClock();
  ui?.refreshSelection();
}
const es = new EventSource(`/api/projects/${projectId}/events`);
es.onmessage = (e) => {
  const frame = JSON.parse(e.data);
  if (frame.snapshot) apply(frame.snapshot);
};
es.onerror = () => up({ type: 'cm:save', state: 'error' });
// save state for the shell: the server persists on every successful action
let saveTimer;
const touched = () => {
  up({ type: 'cm:save', state: 'saving' });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => up({ type: 'cm:save', state: 'saved' }), 900);
};

ui = mountUI({
  stage,
  state,
  t,
  say,
  onPlace: async (kind, x, z, rot, scale) => {
    touched();
    return invoke('world.place', { kind, x, z, rot, scale });
  },
  onRemove: async (it, mode) => {
    touched();
    if (mode === 'undo') return invoke('project.undo');
    return invoke('world.remove', { id: it.id });
  },
  onChange: async (it, patch) => {
    touched();
    if (patch?.rot !== undefined) return invoke('world.rotate', { id: it.id, rot: patch.rot });
    if (patch?.scale !== undefined) return invoke('world.scale', { id: it.id, scale: patch.scale });
  },
  onSetting: async (key, value) => {
    touched();
    const action = { hour: 'world.time', weather: 'world.weather', backdrop: 'world.backdrop', size: 'world.size' }[key];
    return invoke(action, { [key]: value });
  },
  onAsk: Object.assign((text) => up({ type: 'cm:agent-open', text }), { setLang: (l) => setLang(l) }),
  onVoice: (text) => up({ type: 'cm:voice', text }),
  saveNow: async () => up({ type: 'cm:save', state: 'saved' }),
});
window.__cm = { stage, state, invoke, snap: () => snap };
up({ type: 'cm:ready' });
if (q.get('tutorial')) setTimeout(() => toast(t('Tutorial: try “put a lighthouse by the water”.', '教程：试试「在水边放一座灯塔」。')), 1800);
