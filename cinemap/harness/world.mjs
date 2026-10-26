// The authoritative world for one project and the actions that may change it. The editor,
// the CLI and the agent all go through `dispatch`; the store broadcasts full snapshots.
import fs from 'node:fs';
import path from 'node:path';
import { createRegistry, createStore } from './registry.mjs';
import { generate, groundY } from '../shared/worldgen.js';
import { spotsFor } from '../shared/spots.js';

export const KINDS = ['house', 'tower', 'lighthouse', 'shed', 'lamp', 'bench', 'tree', 'pine', 'rock', 'bush', 'boat', 'person', 'car'];
const WATER_KINDS = new Set(['boat']);
const WEATHERS = ['clear', 'cloudy', 'overcast', 'rain', 'storm', 'snow', 'fog'];
const BACKDROPS = ['auto', 'grass', 'forest', 'sand', 'clay', 'snow', 'water', 'city', 'warm', 'white', 'grey'];
const uid = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const PROVIDERS = {
  'seedream-5': { name: 'Seedream 5.0 (Ark)', kind: 'image', modes: ['t2i', 'i2i'] },
  'seedance-2.5': { name: 'Seedance 2.5 (Ark)', kind: 'video', modes: ['t2v', 'i2v'], min: 4, max: 30 },
  'seedance-2': { name: 'Seedance 2.0 (Ark)', kind: 'video', modes: ['t2v', 'i2v'], min: 4, max: 12 },
  'mosshub-seedream-pro': { name: 'Seedream 5.0 Pro (MossHub)', kind: 'image', modes: ['t2i', 'i2i'] },
  'mosshub-gemini-image': { name: 'Gemini 3 Pro Image (MossHub)', kind: 'image', modes: ['t2i', 'i2i'] },
  'minimax-h3': { name: 'MiniMax H3 (MossHub)', kind: 'video', modes: ['t2v', 'i2v'], min: 4, max: 15 },
  'minimax-h3-max': { name: 'MiniMax H3 Max (MossHub)', kind: 'video', modes: ['t2v', 'i2v'], min: 5, max: 15 },
};

export function createWorldRuntime({ project, assets = () => [], generation = null, mediaDir = null }) {
  const saved = project.world || {};
  const size = saved.size || 512;
  const base = generate(project.starter, project.seed || 1, size);
  const removed = new Set(saved.removed || []);
  const edits = new Map((saved.edited || []).map((e) => [e.id, e]));
  const items = [];
  for (const it of base.items) {
    if (removed.has(it.id)) continue;
    const e = edits.get(it.id);
    items.push(e ? { ...it, ...e, edited: true } : it);
  }
  for (const it of saved.placed || []) items.push(it);
  const store = createStore({
    state: 'EDIT',
    size,
    env: base.env,
    settings: { hour: 12, weather: 'clear', backdrop: 'auto', ...(saved.settings || {}) },
    items,
    removed: [...removed],
    agent: { mode: project.agent?.mode || 'lead', backend: project.agent?.backend || 'rules', messages: project.conversation || [], pendingPlan: null, suggest: [], busy: false },
    jobs: project.jobs || [],
    events: [],
  });
  const R = createRegistry({ store });
  const { register, dispatch } = R;
  const D = () => store.get();
  const find = (id) => D().items.find((it) => it.id === id);
  const itemSnap = ({ id, ids }, d) => {
    const list = ids || [id];
    const found = list.map((x) => d.items.find((it) => it.id === x)).filter(Boolean);
    return found.length === 1 ? { ...found[0] } : found.map((f) => ({ ...f }));
  };
  const kindOk = (kind) => KINDS.includes(kind) || (kind?.startsWith('asset:') && assets().some((a) => a.id === kind.slice(6)));
  const touch = (it) => {
    if (it.base) it.edited = true;
  };

  register('world.place', {
    doc: '放一个或多个构件。给了 x/z 就放在那里；没给就按 near（water / road / hill / open）自动找空位',
    params: { kind: `string (${KINDS.join('|')} | asset:<id>)`, x: 'number (m)', z: 'number (m)', rot: 'number (rad)', scale: 'number', count: 'number (1-20)', near: 'water|road|hill|open' },
    required: ['kind'],
    undoable: true,
    label: (p) => `放 ${p.count || 1} 个 ${p.kind}`,
    validate: ({ kind, count, scale }) => (!kindOk(kind) ? { error: 'UNKNOWN_KIND', hint: `kinds: ${KINDS.join(', ')} or asset:<id> from context.assets` } : count && (count < 1 || count > 20) ? { error: 'BAD_COUNT' } : scale && (scale < 0.1 || scale > 10) ? { error: 'BAD_SCALE' } : null),
    snapshot: itemSnap,
    handler({ kind, x, z, rot, scale = 1, count = 1, near = 'open' }) {
      const d = D();
      const spots = x != null && z != null ? [{ x: +x, z: +z }] : spotsFor(d.env, near, count, d.items, { water: WATER_KINDS.has(kind) });
      if (!spots.length) return { ok: false, error: 'NO_ROOM', hint: '没有找到空位' };
      const ids = [];
      store.patch((s) => {
        for (const sp of spots) {
          const it = { id: uid('p'), kind, x: sp.x, z: sp.z, rot: rot ?? Math.random() * Math.PI * 2, scale };
          s.items.push(it);
          ids.push(it.id);
        }
      });
      return { ok: true, ids, id: ids[0], targetIds: ids, placed: ids.length, short: spots.length < count ? count - spots.length : 0 };
    },
  });
  register('world.remove', {
    doc: '删除一个构件',
    params: { id: 'string' },
    required: ['id'],
    undoable: true,
    label: (p) => `删除 ${p.id}`,
    validate: ({ id }) => (find(id) ? null : { error: 'NOT_FOUND' }),
    snapshot: itemSnap,
    handler({ id }) {
      store.patch((s) => {
        const it = s.items.find((x) => x.id === id);
        if (it?.base) s.removed.push(id);
        s.items = s.items.filter((x) => x.id !== id);
      });
      return { ok: true, id };
    },
  });
  register('world.move', {
    doc: '把构件移到新的 x/z',
    params: { id: 'string', x: 'number', z: 'number' },
    required: ['id', 'x', 'z'],
    undoable: true,
    label: (p) => `移动 ${p.id}`,
    validate: ({ id }) => (find(id) ? null : { error: 'NOT_FOUND' }),
    snapshot: itemSnap,
    handler({ id, x, z }) {
      store.patch((s) => {
        const it = s.items.find((o) => o.id === id);
        it.x = +x;
        it.z = +z;
        touch(it);
      });
      return { ok: true, id };
    },
  });
  register('world.rotate', {
    doc: '设置构件朝向（弧度）',
    params: { id: 'string', rot: 'number (rad)' },
    required: ['id', 'rot'],
    undoable: true,
    label: (p) => `旋转 ${p.id}`,
    validate: ({ id }) => (find(id) ? null : { error: 'NOT_FOUND' }),
    snapshot: itemSnap,
    handler({ id, rot }) {
      store.patch((s) => {
        const it = s.items.find((o) => o.id === id);
        it.rot = +rot;
        touch(it);
      });
      return { ok: true, id };
    },
  });
  register('world.scale', {
    doc: '设置构件缩放（0.1–10）',
    params: { id: 'string', scale: 'number' },
    required: ['id', 'scale'],
    undoable: true,
    label: (p) => `缩放 ${p.id}`,
    validate: ({ id, scale }) => (!find(id) ? { error: 'NOT_FOUND' } : scale < 0.1 || scale > 10 ? { error: 'BAD_SCALE' } : null),
    snapshot: itemSnap,
    handler({ id, scale }) {
      store.patch((s) => {
        const it = s.items.find((o) => o.id === id);
        it.scale = +scale;
        touch(it);
      });
      return { ok: true, id };
    },
  });
  register('world.clear', {
    doc: '清掉某一类构件；kind=all 清掉所有放置的（模板自带的保留）。批量删除，需要确认',
    params: { kind: 'string|all' },
    required: ['kind'],
    undoable: true,
    label: (p) => `清掉 ${p.kind}`,
    targets: ({ kind }, d) => d.items.filter((it) => (kind === 'all' ? !it.base : it.kind === kind)).map((it) => it.id),
    snapshot: ({ kind }, d) => d.items.filter((it) => (kind === 'all' ? !it.base : it.kind === kind)).map((it) => ({ ...it })),
    handler({ kind }) {
      const victims = D().items.filter((it) => (kind === 'all' ? !it.base : it.kind === kind));
      store.patch((s) => {
        for (const v of victims) if (v.base) s.removed.push(v.id);
        s.items = s.items.filter((it) => !victims.includes(it));
      });
      return { ok: true, targetIds: victims.map((v) => v.id), count: victims.length };
    },
  });
  const settingAction = (name, key, doc, params, validate, norm = (v) => v) =>
    register(name, {
      doc,
      params,
      required: [key],
      undoable: true,
      label: (p) => `${doc.split('（')[0]} → ${p[key]}`,
      validate,
      snapshot: (_, d) => ({ ...d.settings }),
      handler(p) {
        store.patch((s) => (s.settings[key] = norm(p[key])));
        return { ok: true, [key]: norm(p[key]) };
      },
    });
  settingAction('world.time', 'hour', '把世界的时间拨到某个小时（5–23，可带小数）', { hour: 'number' }, ({ hour }) => (hour >= 5 && hour <= 23 ? null : { error: 'BAD_HOUR', hint: '5–23' }), Number);
  settingAction('world.weather', 'weather', '设置天气（clear/cloudy/overcast/rain/storm/snow/fog）', { weather: WEATHERS.join('|') }, ({ weather }) => (WEATHERS.includes(weather) ? null : { error: 'BAD_WEATHER', hint: WEATHERS.join('/') }));
  settingAction('world.backdrop', 'backdrop', '设置远景色板（auto/grass/forest/sand/clay/snow/water/city/warm/white/grey）', { backdrop: BACKDROPS.join('|') }, ({ backdrop }) => (BACKDROPS.includes(backdrop) ? null : { error: 'BAD_BACKDROP' }));
  register('world.size', {
    doc: '设置地台边长（512 / 1024 / 2048 m）',
    params: { size: '512|1024|2048' },
    required: ['size'],
    undoable: true,
    label: (p) => `地台 → ${p.size} m`,
    validate: ({ size }) => ([512, 1024, 2048].includes(+size) ? null : { error: 'BAD_SIZE' }),
    handler({ size }) {
      store.patch((s) => {
        s.size = +size;
        s.env.size = +size;
      });
      return { ok: true, size: +size };
    },
  });
  register('project.undo', { doc: '撤销上一步', undoable: false, handler: () => R.undo() });
  register('project.redo', { doc: '重做', undoable: false, handler: () => R.redo() });
  register('project.undo-to', {
    doc: '撤销到某条事件之前（把助手刚才那一串全撤了）',
    params: { eventId: 'string' },
    required: ['eventId'],
    undoable: false,
    handler: ({ eventId }) => R.undoTo(eventId),
  });
  register('context.world', {
    doc: '读取当前世界的摘要：地台、水体、道路、每类构件的数量、时间与天气',
    undoable: false,
    handler: () => ({ ok: true, ...summarize() }),
  });
  register('context.items', {
    doc: '列出构件（可按 kind 过滤），带 id 和位置，供移动 / 删除时引用',
    params: { kind: 'string', limit: 'number' },
    undoable: false,
    handler: ({ kind, limit = 60 }) => ({ ok: true, items: D().items.filter((it) => !kind || it.kind === kind).slice(0, limit).map(({ id, kind: k, x, z, rot, scale, base }) => ({ id, kind: k, x: +x.toFixed(1), z: +z.toFixed(1), rot: +(rot || 0).toFixed(2), scale, base: !!base })) }),
  });
  register('context.events', {
    doc: '最近的事件日志（谁改了什么）',
    params: { limit: 'number' },
    undoable: false,
    handler: ({ limit = 30 }) => ({ ok: true, events: D().events.slice(-limit) }),
  });
  register('context.assets', {
    doc: '已导入的素材（SimReady 等），可用 kind=asset:<id> 放置',
    undoable: false,
    handler: () => ({ ok: true, assets: assets().map((a) => ({ id: a.id, name: a.name, kind: `asset:${a.id}`, size: a.meta?.bbox ? [+(a.meta.bbox.max[0] - a.meta.bbox.min[0]).toFixed(2), +(a.meta.bbox.max[1] - a.meta.bbox.min[1]).toFixed(2), +(a.meta.bbox.max[2] - a.meta.bbox.min[2]).toFixed(2)] : null })) }),
  });
  // ---- generation: slow, paid, async. submit returns a job id at once; the adapter pushes
  // progress into the job record; every change broadcasts a snapshot. The frame comes from the
  // editor as a data URL and is kept on disk so the record stays small.
  const providerOf = (p) => PROVIDERS[p];
  const ready = (p) => !!generation?.supports?.(p);
  register('generation.submit', {
    doc: '出片：把当前画面（或纯文字）交给生成模型。provider 见 context.generation；image 出一张静帧，video 出一条 4–30 s 短片。付费操作，需要确认',
    params: { provider: `string (${Object.keys(PROVIDERS).join('|')})`, prompt: 'string', mode: 't2i|i2i|t2v|i2v（默认按 provider 的种类，带画面就是 i2*）', seconds: 'number (video, 4–30)', aspect: '16:9|9:16|1:1', frame: 'string (data:image/png;base64 — 编辑器当前画面，可选)' },
    required: ['provider', 'prompt'],
    undoable: false,
    allowedIn: ['EDIT'],
    label: (p) => `出片 ${p.provider}`,
    validate: ({ provider, mode, seconds }) => (!providerOf(provider) ? { error: 'UNKNOWN_PROVIDER', hint: Object.keys(PROVIDERS).join(', ') } : !ready(provider) ? { error: 'PROVIDER_NOT_CONFIGURED', hint: `${PROVIDERS[provider].name} 没有配置密钥（--ark-key-file / --mosshub-key-file）` } : mode && !providerOf(provider).modes.includes(mode) ? { error: 'BAD_MODE', hint: providerOf(provider).modes.join('/') } : seconds && providerOf(provider).kind === 'video' && (seconds < providerOf(provider).min || seconds > providerOf(provider).max) ? { error: 'BAD_SECONDS', hint: `${providerOf(provider).min}–${providerOf(provider).max}` } : null),
    handler({ provider, prompt, mode, seconds, aspect = '16:9', frame }, meta) {
      const P = providerOf(provider);
      const id = uid('job');
      let image = null;
      if (frame && /^data:image\/(png|jpeg|webp);base64,/.test(frame)) {
        if (mediaDir) {
          const ext = /png/.test(frame.slice(0, 20)) ? 'png' : 'jpg';
          fsWrite(`${id}-frame.${ext}`, Buffer.from(frame.split(',')[1], 'base64'));
          image = frame; // adapters take the data URL; the file is for the record
        } else image = frame;
      }
      const finalMode = mode || (P.kind === 'image' ? (image ? 'i2i' : 't2i') : image ? 'i2v' : 't2v');
      const job = { id, provider, model: P.name, kind: P.kind, mode: finalMode, prompt: String(prompt).slice(0, 2000), seconds: P.kind === 'video' ? Math.max(P.min, Math.min(P.max, Number(seconds) || 5)) : 0, aspect, status: 'queued', progress: 0, result: null, error: null, source: meta.source, actorId: meta.actorId, createdAt: Date.now(), frame: image ? `/media/${id}-frame.${/png/.test(image.slice(0, 20)) ? 'png' : 'jpg'}` : null };
      store.patch((s) => {
        s.jobs.push(job);
        s.jobs = s.jobs.slice(-40);
      });
      const update = (jobId, patch) => store.patch((s) => {
        const j = s.jobs.find((x) => x.id === jobId);
        if (j && j.status !== 'cancelled') Object.assign(j, patch, { updatedAt: Date.now() });
      });
      generation.submit({ ...job, inputs: image ? { image } : {} }, update);
      return { ok: true, id, job: { id, provider, mode: finalMode, seconds: job.seconds } };
    },
  });
  register('generation.cancel', {
    doc: '取消一个还没完成的生成任务',
    params: { id: 'string' },
    required: ['id'],
    undoable: false,
    handler({ id }) {
      const j = D().jobs.find((x) => x.id === id);
      if (!j) return { ok: false, error: 'NOT_FOUND' };
      if (!['queued', 'running'].includes(j.status)) return { ok: false, error: 'NOT_RUNNING' };
      store.patch((s) => Object.assign(s.jobs.find((x) => x.id === id), { status: 'cancelled' }));
      return { ok: true, id };
    },
  });
  register('context.generation', {
    doc: '可用的生成模型（出图 / 出片）和最近的任务',
    undoable: false,
    handler: () => ({ ok: true, providers: Object.entries(PROVIDERS).map(([id, p]) => ({ id, ...p, ready: ready(id) })), jobs: D().jobs.slice(-10).map(({ id, provider, mode, status, progress, error, result, prompt }) => ({ id, provider, mode, status, progress, error, result: result ? { kind: result.kind, url: result.url } : null, prompt: prompt.slice(0, 80) })) }),
  });
  const fsWrite = (name, buf) => {
    try {
      fs.mkdirSync(mediaDir, { recursive: true });
      fs.writeFileSync(path.join(mediaDir, name), buf);
    } catch {
      /* media dir unavailable */
    }
  };
  register('agent.set-mode', {
    doc: '设置助手工作模式：lead 直接执行 / collaborative 出方案再确认 / manual 只出方案逐条执行',
    params: { mode: 'lead|collaborative|manual' },
    required: ['mode'],
    undoable: false,
    validate: ({ mode }) => (['lead', 'collaborative', 'manual'].includes(mode) ? null : { error: 'BAD_MODE' }),
    handler: ({ mode }) => {
      store.patch((s) => (s.agent.mode = mode));
      return { ok: true, mode };
    },
  });
  register('agent.set-backend', {
    doc: '选择规划后端：rules（内置规则）或后端配置的模型名（见 /api/health 的 llm.models）',
    params: { backend: 'rules | <model id>' },
    required: ['backend'],
    undoable: false,
    handler: ({ backend }) => {
      store.patch((s) => (s.agent.backend = String(backend)));
      return { ok: true, backend };
    },
  });
  register('agent.say', {
    doc: '向助手会话追加一条消息',
    params: { role: 'agent|user|thinking|plan|ask', text: 'string' },
    required: ['role'],
    undoable: false,
    handler: ({ role, text, ...extra }) => {
      say(role, text, extra);
      return { ok: true };
    },
  });
  function say(role, text, extra = {}) {
    const m = { id: uid('m'), role, text: String(text || ''), at: Date.now(), ...extra };
    store.patch((s) => {
      s.agent.messages.push(m);
      s.agent.messages = s.agent.messages.slice(-120);
    });
    return m;
  }
  function summarize() {
    const d = D();
    const counts = {};
    for (const it of d.items) counts[it.kind] = (counts[it.kind] || 0) + 1;
    const w = d.env.water;
    return {
      size: d.size,
      water: !w ? 'none' : w.kind === 'sea' ? `sea on the west (x < ${w.at})` : w.kind === 'river' ? 'a river running north–south' : w.kind === 'lake' ? `a lake at (${w.x}, ${w.z}) r=${w.r}` : 'open sea around an island',
      roads: d.env.roads.length,
      hill: d.env.hill ? `hill at (${d.env.hill.x}, ${d.env.hill.z})` : 'flat',
      counts,
      settings: d.settings,
      state: d.state,
      undo: R.historyInfo(),
      assets: assets().map((a) => `asset:${a.id} (${a.name})`),
      generation: Object.keys(PROVIDERS).filter(ready),
      jobs: D().jobs.filter((j) => ['queued', 'running'].includes(j.status)).length,
    };
  }
  const persistable = () => {
    const d = D();
    return { size: d.size, settings: d.settings, removed: d.removed, placed: d.items.filter((it) => !it.base), edited: d.items.filter((it) => it.base && it.edited).map(({ id, x, z, rot, scale }) => ({ id, x, z, rot, scale })) };
  };
  const snapshot = () => {
    const d = D();
    return { version: store.version, state: d.state, size: d.size, env: d.env, settings: d.settings, items: d.items, agent: d.agent, jobs: d.jobs.slice(-40), events: d.events.slice(-120), history: R.historyInfo(), generation: Object.entries(PROVIDERS).map(([id, p]) => ({ id, ...p, ready: ready(id) })) };
  };
  return { store, R, dispatch, capabilities: R.capabilities, say, summarize, persistable, snapshot, groundY: (x, z) => groundY(x, z, D().env) };
}
