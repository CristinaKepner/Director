// The harness contract for Cinemap, mirroring Director's: one entry point for humans, the
// CLI and the agent. Every call is validated against a declared contract, logged as an event
// (who / which role / before / after / ms), snapshot-undoable, dry-runnable and gated by a
// small state machine. Nothing else is allowed to mutate the world.
export const STATES = ['EDIT', 'PLANNING', 'CONFIRMING', 'RUNNING'];
const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function createRegistry({ store, clock = () => performance.now(), historyLimit = 80, eventLimit = 400 }) {
  const registry = new Map();
  const idempotency = new Map();
  let batchDepth = 0;
  const history = { past: [], future: [] };

  const register = (name, def) => {
    if (!def?.handler) throw new Error(`action ${name} needs a handler`);
    registry.set(name, { allowedIn: STATES, undoable: false, params: {}, required: [], ...def });
  };
  const listActions = () => [...registry.keys()];
  const capabilities = () => [...registry.entries()].map(([name, d]) => ({ name, doc: d.doc, params: d.params, required: d.required, undoable: !!d.undoable, allowedIn: d.allowedIn, group: name.split('.')[0] }));
  const canRun = (name, state = store.get().state) => (registry.get(name)?.allowedIn || STATES).includes(state);

  const lean = (v) => {
    if (typeof v === 'string') return v.length > 512 ? `${v.slice(0, 256)}…(${v.length})` : v;
    if (Array.isArray(v)) return v.map(lean);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, lean(x)]));
    return v;
  };
  const logEvent = (partial) => {
    const evt = { id: partial.id || uid('evt'), at: new Date().toISOString(), ...partial };
    for (const k of ['before', 'after', 'payload']) if (evt[k] && typeof evt[k] === 'object') evt[k] = lean(evt[k]);
    store.patch((d) => {
      d.events.push(evt);
      if (d.events.length > eventLimit) d.events.splice(0, d.events.length - eventLimit);
    }, { event: evt });
    return evt;
  };

  // snapshot-style undo: any handler is undoable without writing an inverse
  const pushHistory = (label, eventId) => {
    history.past.push({ label, eventId, snap: structuredClone(store.persistable()) });
    if (history.past.length > historyLimit) history.past.shift();
    history.future.length = 0;
  };
  const popHistory = () => history.past.pop();
  const undo = () => {
    const h = history.past.pop();
    if (!h) return { ok: false, error: 'NOTHING_TO_UNDO' };
    history.future.push({ label: h.label, eventId: h.eventId, snap: structuredClone(store.persistable()) });
    store.restore(h.snap);
    return { ok: true, label: h.label, eventId: h.eventId };
  };
  const redo = () => {
    const h = history.future.pop();
    if (!h) return { ok: false, error: 'NOTHING_TO_REDO' };
    history.past.push({ label: h.label, eventId: h.eventId, snap: structuredClone(store.persistable()) });
    store.restore(h.snap);
    return { ok: true, label: h.label };
  };
  const undoTo = (eventId) => {
    const idx = history.past.findIndex((h) => h.eventId === eventId);
    if (idx < 0) return { ok: false, error: 'EVENT_NOT_IN_HISTORY' };
    let n = 0;
    while (history.past.length > idx) {
      undo();
      n++;
    }
    return { ok: true, steps: n };
  };
  const historyInfo = () => ({ undo: history.past.length, redo: history.future.length, labels: history.past.slice(-10).map((h) => ({ label: h.label, eventId: h.eventId })) });

  function dispatch(name, payload = {}, meta = {}) {
    const t0 = clock();
    const source = meta.source || 'human';
    const def = registry.get(name);
    const fail = (error, extra = {}) => {
      const res = { ok: false, error, action: name, ...extra };
      if (!meta.silent) logEvent({ action: name, source, actorId: meta.actorId, payload, after: res, undoable: false, ok: false, ms: Math.round((clock() - t0) * 10) / 10 });
      return res;
    };
    if (!def) return { ok: false, error: 'UNKNOWN_ACTION', action: name, hint: `try one of: ${listActions().slice(0, 12).join(', ')} …` };
    if (!canRun(name)) return fail('STATE_FORBIDDEN', { state: store.get().state, hint: `allowed in ${def.allowedIn.join('/')}` });
    if (meta.idempotencyKey && idempotency.has(meta.idempotencyKey)) return { ...idempotency.get(meta.idempotencyKey), replay: true };
    const missing = def.required.filter((k) => payload[k] === undefined || payload[k] === null || payload[k] === '');
    if (missing.length) return fail('MISSING_PARAM', { missing, params: def.params });
    if (def.validate) {
      const v = def.validate(payload, store.get());
      if (v) return fail(v.error || 'INVALID', v);
    }
    if (meta.dryRun) return { ok: true, dryRun: true, action: name, payload, doc: def.doc, undoable: !!def.undoable, wouldAffect: def.targets ? def.targets(payload, store.get()) : [payload.id].filter(Boolean) };
    const eventId = uid('evt');
    const before = def.snapshot ? def.snapshot(payload, store.get()) : null;
    const pushed = def.undoable && batchDepth === 0;
    if (pushed) pushHistory(def.label?.(payload) || name, eventId);
    let result;
    try {
      result = def.handler(payload, { ...meta, source }) || { ok: true };
    } catch (err) {
      result = { ok: false, error: 'HANDLER_ERROR', message: String(err?.message || err) };
    }
    if (result.ok === undefined) result.ok = true;
    if (!result.ok && pushed) popHistory();
    const targetIds = result.targetIds || [result.id || payload.id].filter(Boolean);
    const after = result.ok ? (def.snapshot ? def.snapshot({ ...payload, id: result.id || payload.id, ids: result.ids }, store.get()) : null) : result;
    const ms = Math.round((clock() - t0) * 10) / 10;
    if (!meta.silent) logEvent({ id: eventId, action: name, source, actorId: meta.actorId, label: def.label?.(payload) || def.doc, payload, targetIds, before, after, undoable: !!(def.undoable && result.ok && batchDepth === 0), ok: result.ok, ms, batch: batchDepth > 0 ? meta.batchLabel : undefined });
    const out = { ...result, action: name, eventId, ms };
    if (meta.idempotencyKey) idempotency.set(meta.idempotencyKey, out);
    return out;
  }

  // many actions → one undo step + one summary event (agent plans, presets)
  function batch(label, fn, meta = {}) {
    const eventId = uid('evt');
    if (batchDepth === 0) pushHistory(label, eventId);
    batchDepth += 1;
    const t0 = clock();
    let out;
    try {
      out = fn({ ...meta, batchLabel: label });
    } finally {
      batchDepth -= 1;
    }
    if (batchDepth === 0) logEvent({ id: eventId, action: 'batch', source: meta.source || 'human', actorId: meta.actorId, label, payload: { label, actions: out?.count }, undoable: true, ok: true, ms: Math.round(clock() - t0) });
    return out;
  }

  return { register, dispatch, batch, capabilities, listActions, canRun, undo, redo, undoTo, historyInfo, logEvent, registry };
}

// Minimal store: the authoritative world for one project. `persistable()` is what gets saved
// and undone; `restore()` swaps it back; subscribers get full snapshots (never diffs).
export function createStore(initial) {
  let d = initial;
  let version = 0;
  const subs = new Set();
  const notify = (info) => {
    for (const fn of subs) {
      try {
        fn(d, { version, ...info });
      } catch {
        /* subscriber error */
      }
    }
  };
  return {
    get: () => d,
    patch(fn, info = {}) {
      fn(d);
      version++;
      notify(info);
    },
    persistable: () => ({ size: d.size, env: d.env, settings: d.settings, items: d.items, removed: d.removed, state: d.state }),
    restore(snap) {
      Object.assign(d, structuredClone(snap));
      version++;
      notify({ restored: true });
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    get version() {
      return version;
    },
  };
}
