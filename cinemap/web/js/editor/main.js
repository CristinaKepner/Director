// Editor boot: load the project, generate the base world, restore edits, mount the stage and
// the chrome, autosave, and talk to the assistant frame (steps in, results out).
import { T, lang, mountLanguage, setLang } from '../i18n.js';
import { createStage } from './scene.js';
import { generate } from './worldgen.js';
import { KINDS } from './kit.js';
import { spotsFor, waterSpots } from './actions.js';
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

const r = await fetch(`/api/projects/${projectId}`);
if (!r.ok) {
  say(t('This project could not be opened.', '打不开这个项目。'), 0);
  throw new Error('project');
}
const { project } = await r.json();
const stage = createStage(document.getElementById('world'));
const saved = project.world || {};
const base = generate(project.starter, project.seed || 1, saved.size || 512);
const state = {
  projectId,
  env: base.env,
  settings: { hour: 12, weather: 'clear', backdrop: 'auto', ...(saved.settings || {}) },
  items: [],
  removed: new Set(saved.removed || []),
  history: [],
  world() {
    return { size: state.env.size, settings: state.settings, removed: [...state.removed], placed: state.items.filter((it) => !it.base), edited: state.items.filter((it) => it.base && it.edited) };
  },
};
state.env.size = saved.size || state.env.size;
stage.buildGround(state.env, state.settings);
const edits = new Map((saved.edited || []).map((e) => [e.id, e]));
for (const it of base.items) {
  if (state.removed.has(it.id)) continue;
  const e = edits.get(it.id);
  if (e) Object.assign(it, e, { edited: true });
  state.items.push(it);
  stage.addItem(it, state.env);
}
for (const it of saved.placed || []) {
  state.items.push(it);
  stage.addItem(it, state.env);
}
stage.setClock(state.settings.hour, state.settings.weather);
stage.recentre(state.env.size);

let saveTimer, dirty = false;
async function saveNow() {
  clearTimeout(saveTimer);
  dirty = false;
  up({ type: 'cm:save', state: 'saving' });
  const res = await fetch(`/api/projects/${projectId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ world: state.world() }) }).catch(() => null);
  up({ type: 'cm:save', state: res?.ok ? 'saved' : 'error' });
}
function changed() {
  dirty = true;
  up({ type: 'cm:save', state: 'saving' });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 900);
}
addEventListener('beforeunload', () => dirty && navigator.sendBeacon?.(`/api/projects/${projectId}`, new Blob([JSON.stringify({ world: state.world() })], { type: 'application/json' })));

let seq = Date.now();
function place(kind, x, z, rot = Math.random() * Math.PI * 2, scale = 1, record = true) {
  const it = { id: `p${(seq++).toString(36)}`, kind, x, z, rot, scale };
  state.items.push(it);
  stage.addItem(it, state.env);
  if (record) state.history.push({ op: 'place', ids: [it.id] });
  changed();
  return it;
}
function remove(it, mode) {
  if (mode === 'undo') {
    const last = state.history.pop();
    if (!last) return say(t('Nothing to undo', '没有可撤销的'));
    if (last.op === 'place') for (const id of last.ids) dropItem(id);
    else if (last.op === 'remove') for (const rec of last.items) restore(rec);
    changed();
    return;
  }
  state.history.push({ op: 'remove', items: [it] });
  dropItem(it.id);
  changed();
}
function dropItem(id) {
  const idx = state.items.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const it = state.items[idx];
  if (it.base) state.removed.add(id);
  state.items.splice(idx, 1);
  stage.removeItem(id);
}
function restore(it) {
  state.removed.delete(it.id);
  state.items.push(it);
  stage.addItem(it, state.env);
}
function edited(it) {
  if (it?.base) it.edited = true;
  changed();
}

const ui = mountUI({
  stage,
  state,
  t,
  say,
  onPlace: (kind, x, z, rot, scale) => place(kind, x, z, rot, scale),
  onRemove: remove,
  onChange: edited,
  onAsk: Object.assign((text) => up({ type: 'cm:agent-open', text }), { setLang: (l) => setLang(l) }),
  onVoice: (text) => up({ type: 'cm:voice', text }),
  saveNow,
});

// ---- assistant steps
const KIND_ALIAS = { house: 'house', tree: 'tree', lighthouse: 'lighthouse', boat: 'boat', tower: 'tower', person: 'person', lamp: 'lamp', rock: 'rock' };
function runStep(step) {
  if (step.op === 'place') {
    const kind = KIND_ALIAS[step.kind] || 'house';
    const spots = KINDS[kind]?.water ? waterSpots(state.env, step.count) : spotsFor(state.env, step.near, step.count, state.items);
    const ids = spots.map((s) => place(kind, s.x, s.z, undefined, 1, false).id);
    state.history.push({ op: 'place', ids });
    return { ok: ids.length > 0, ids, text: ids.length < step.count ? t(`only room for ${ids.length}`, `只放下 ${ids.length} 个`) : '' };
  }
  if (step.op === 'clear') {
    const victims = state.items.filter((it) => step.kind === 'all' ? !it.base : it.kind === (KIND_ALIAS[step.kind] || step.kind));
    state.history.push({ op: 'remove', items: victims.slice() });
    for (const v of victims) dropItem(v.id);
    changed();
    return { ok: true, ids: victims.map((v) => v.id), text: `${victims.length}` };
  }
  if (step.op === 'time') {
    ui.setHour(step.hour);
    return { ok: true };
  }
  if (step.op === 'weather') {
    ui.setWeather(step.value);
    return { ok: true };
  }
  return { ok: false, text: 'unknown' };
}
function describeScene() {
  const counts = {};
  for (const it of state.items) counts[it.kind] = (counts[it.kind] || 0) + 1;
  const parts = Object.entries(counts).map(([k, n]) => `${n} ${t(KINDS[k]?.en ?? k, KINDS[k]?.zh ?? k)}`);
  const water = state.env.water ? (state.env.water.river ? t('a river', '一条河') : state.env.water.lake ? t('a lake', '一个湖') : state.env.water.island ? t('open sea around an island', '环岛的海') : t('the sea on the west side', '西侧是海')) : t('no water', '没有水');
  return t(`A ${state.env.size / 512} km plate with ${water}; on it: ${parts.join(', ')}. Time ${state.settings.hour}:00, weather ${state.settings.weather}.`, `${state.env.size / 512} 公里见方的地台，${water}；上面有：${parts.join('、')}。时间 ${state.settings.hour}:00，天气 ${state.settings.weather}。`);
}
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data) return;
  const d = e.data;
  if (d.type === 'cm:step') {
    const res = runStep(d.step);
    e.source.postMessage({ type: 'cm:result', id: d.id, ...res }, location.origin);
  } else if (d.type === 'cm:ask') {
    e.source.postMessage({ type: 'cm:result', id: d.id, ok: true, text: describeScene() }, location.origin);
  } else if (d.type === 'cm:undo') {
    for (const s of d.steps) for (const id of s.ids || []) dropItem(id);
    changed();
  }
});
up({ type: 'cm:conversation', conversation: project.conversation || [] });
up({ type: 'cm:ready' });
if (q.get('tutorial')) setTimeout(() => toast(t('Tutorial: try “put a lighthouse by the water”.', '教程：试试「在水边放一座灯塔」。')), 1800);
