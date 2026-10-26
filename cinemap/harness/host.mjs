// The host: one world runtime per open project, the agent loop around the planners, full
// snapshot broadcasting over SSE, and persistence back to the project store. HTTP lives in
// server.mjs; nothing here knows about requests.
import { createWorldRuntime } from './world.mjs';
import { rulesPlan } from './planner.mjs';

export function createHost({ store, planner = null, generation = null, mediaDir = null, assets = () => [], log = () => {} }) {
  const runtimes = new Map(); // projectId -> { rt, subs:Set<fn>, seq, saveTimer }
  const CONFIRM_MODES = { lead: 'lead', collaborative: 'collaborative', manual: 'manual' };

  function open(projectId) {
    if (runtimes.has(projectId)) return runtimes.get(projectId);
    const project = store.get(projectId);
    if (!project) return null;
    const rt = createWorldRuntime({ project, assets, generation, mediaDir });
    const entry = { rt, subs: new Set(), seq: 0, saveTimer: null, projectId };
    rt.store.subscribe((d, info) => {
      broadcast(entry, { snapshot: rt.snapshot() });
      if (!info?.event || info.event.ok) schedule(entry);
    });
    runtimes.set(projectId, entry);
    return entry;
  }
  const broadcast = (entry, frame) => {
    const msg = { seq: ++entry.seq, ...frame };
    for (const fn of entry.subs) {
      try {
        fn(msg);
      } catch {
        /* dead subscriber */
      }
    }
  };
  const schedule = (entry) => {
    clearTimeout(entry.saveTimer);
    entry.saveTimer = setTimeout(() => save(entry), 600);
  };
  const save = (entry) => {
    const d = entry.rt.store.get();
    store.update(entry.projectId, { world: entry.rt.persistable(), conversation: d.agent.messages.slice(-120), agent: { mode: d.agent.mode, backend: d.agent.backend }, jobs: d.jobs.filter((j) => j.status !== 'queued' && j.status !== 'running').slice(-40) });
  };
  const emitThinking = (entry, thinking) => broadcast(entry, { thinking });

  // ---- running a plan: lead executes, collaborative waits for agent.confirm, manual lists
  function executePlan(entry, p, meta) {
    const { rt } = entry;
    const results = [];
    rt.R.batch(p.label || p.text || 'agent plan', (m) => {
      for (const step of p.steps) {
        const payload = step.action === 'generation.submit' && entry.frame && !step.payload.frame ? { ...step.payload, frame: entry.frame } : step.payload;
        const r = rt.dispatch(step.action, payload, { ...m, source: 'agent', actorId: step.role });
        results.push({ step, result: r });
        toolCard(entry, step, r);
      }
      return { count: results.length };
    }, { ...meta, source: 'agent' });
    const okCount = results.filter((r) => r.result.ok).length;
    return { results, okCount, failed: results.length - okCount };
  }
  function toolCard(entry, step, r) {
    const evt = entry.rt.store.get().events.find((e) => e.id === r.eventId);
    entry.rt.say('tool', step.label, { tool: { action: step.action, payload: step.payload, role: step.role, ok: !!r.ok, error: r.error, hint: r.hint, eventId: r.eventId, ids: r.ids || r.targetIds, before: evt?.before ?? null, after: evt?.after ?? null, ms: r.ms } });
  }
  function runPlan(entry, p, { mode, force }) {
    const { rt } = entry;
    const summary = (out, skipped = 0) => {
      const bits = [`完成 ${out.okCount}/${out.results.length} 步${out.failed ? `（${out.failed} 步失败，见工具卡片）` : ''}${skipped ? `（跳过 ${skipped} 步）` : ''}。`];
      if (p.notes?.length) bits.push(`未处理：${p.notes.join('；')}`);
      return bits.join('\n');
    };
    if (!p.steps.length) {
      rt.say('agent', p.reply || '没有可以执行的步骤。', { notes: p.notes, suggest: p.suggest });
      return { results: [], okCount: 0, failed: 0, pending: false };
    }
    const wantConfirm = mode === 'manual' || (mode === 'collaborative' && !force) || (p.needsConfirm && !force);
    if (wantConfirm) {
      rt.store.patch((s) => (s.agent.pendingPlan = { ...p, mode }));
      rt.say('plan', p.reply || '', { plan: { steps: p.steps, notes: p.notes, needsConfirm: p.needsConfirm, model: p.model }, pending: mode !== 'manual', manual: mode === 'manual', suggest: p.suggest });
      return { results: [], okCount: 0, failed: 0, pending: true };
    }
    rt.say('plan', p.reply || '', { plan: { steps: p.steps, notes: p.notes, model: p.model }, confirmed: true });
    const out = executePlan(entry, p, {});
    rt.say('agent', summary(out), { suggest: p.suggest });
    return { ...out, pending: false };
  }

  async function runAgent(projectId, { text, mode, backend, force = false, lang = 'zh', frame = null }) {
    const entry = open(projectId);
    if (!entry) return { ok: false, error: 'PROJECT_NOT_FOUND' };
    if (frame) entry.frame = frame; // the editor's current view, used when a plan submits generation
    const { rt } = entry;
    text = String(text || '').trim();
    if (!text) return { ok: false, error: 'MISSING_PARAM', missing: ['text'] };
    const d = rt.store.get();
    if (d.agent.busy) return { ok: false, error: 'AGENT_BUSY', hint: '上一条还在规划；再发一句会排队' };
    mode = CONFIRM_MODES[mode] || d.agent.mode;
    const model = backend || d.agent.backend;
    const history = d.agent.messages.filter((m) => m.role === 'user' || m.role === 'agent').slice(-8).map((m) => ({ role: m.role, text: m.text }));
    rt.say('user', text);
    rt.store.patch((s) => {
      s.agent.busy = true;
      s.state = 'PLANNING';
    });
    const t0 = Date.now();
    let p;
    const useLlm = planner && model !== 'rules';
    try {
      if (useLlm) {
        emitThinking(entry, { model, phase: 'planning', reasoning: '', steps: [], chars: 0 });
        p = await planner.plan(text, {
          capabilities: rt.capabilities(),
          summary: { ...rt.summarize(), items: rt.dispatch('context.items', { limit: 40 }, { silent: true }).items },
          history,
          model,
          onDelta: (x) => emitThinking(entry, { model, phase: 'planning', reasoning: x.reasoning ? x.reasoning.slice(-4000) : '', steps: x.steps || [], chars: (x.content || '').length }),
        });
      } else p = rulesPlan(text, { lang, assets: assets(), generation: generation ? Object.keys(generation.models) : [] });
    } catch (err) {
      log(`llm failed (${err.code || ''} ${err.message}); falling back to rules`);
      emitThinking(entry, { model, phase: 'failed', error: String(err.message).slice(0, 200) });
      rt.say('agent', `模型（${model}）调用失败：${String(err.message).slice(0, 160)}。改用内置规则规划器。`);
      p = { ...rulesPlan(text, { lang, assets: assets(), generation: generation ? Object.keys(generation.models) : [] }), fallback: true, error_llm: err.message };
    }
    rt.store.patch((s) => {
      s.agent.busy = false;
      s.state = 'EDIT';
      s.agent.suggest = p.suggest || [];
    });
    if (useLlm && (p.reasoning || p.steps.length))
      rt.say('thinking', p.reasoning || '', { thinking: { model: p.model, ms: p.ms, steps: p.steps.map((s) => ({ action: s.action, label: s.label, role: s.role })), notes: p.notes || [], usage: p.usage ? { total: p.usage.total_tokens, reasoning: p.usage.completion_tokens_details?.reasoning_tokens || 0 } : null } });
    if (p.ask?.length && !p.steps.length) {
      rt.say('ask', p.reply || '', { ask: p.ask, notes: p.notes });
      emitThinking(entry, { model, phase: 'done' });
      return { ok: true, backend: p.model, ms: Date.now() - t0, reply: p.reply, ask: p.ask, pending: true };
    }
    // read-only plans (context.*) answer in place: run them and fold the result into the reply
    if (p.steps.length && p.steps.every((s) => s.action.startsWith('context.'))) {
      const reads = p.steps.map((s) => rt.dispatch(s.action, s.payload, { source: 'agent', actorId: s.role, silent: true }));
      const answer = useLlm && planner ? await describeReads(planner, text, reads, model, rt).catch(() => null) : null;
      rt.say('agent', answer || p.reply || describeSummary(rt.summarize(), lang), { reads, suggest: p.suggest });
      emitThinking(entry, { model, phase: 'done' });
      return { ok: true, backend: p.model, ms: Date.now() - t0, reads, pending: false };
    }
    if (useLlm) emitThinking(entry, { model, phase: 'executing', steps: p.steps.map((s) => s.label), chars: 0 });
    const out = runPlan(entry, { ...p, text }, { mode, force });
    emitThinking(entry, { model, phase: 'done' });
    return { ok: true, backend: p.model, fallback: !!p.fallback, ms: Date.now() - t0, usage: p.usage, reply: p.reply, plan: p.steps, notes: p.notes, suggest: p.suggest, results: out.results.map((r) => ({ action: r.step.action, ok: r.result.ok, ids: r.result.ids, error: r.result.error })), pending: out.pending };
  }
  async function describeReads(planner, text, reads, model, rt) {
    const p = await planner.plan(`根据这些读取结果用一两句话回答用户的问题「${text}」，steps 留空，答案写在 reply：${JSON.stringify(reads).slice(0, 6000)}`, { capabilities: rt.capabilities(), summary: rt.summarize(), history: [], model });
    return p.reply || null;
  }
  const describeSummary = (s, lang) => {
    const parts = Object.entries(s.counts).map(([k, n]) => `${n} ${k}`);
    return lang === 'zh' ? `地台 ${s.size} m，${s.water}，${s.roads} 条路，${s.hill}。构件：${parts.join('、') || '无'}。时间 ${s.settings.hour}:00，天气 ${s.settings.weather}。` : `${s.size} m plate, ${s.water}, ${s.roads} roads, ${s.hill}. Items: ${parts.join(', ') || 'none'}. Time ${s.settings.hour}:00, weather ${s.settings.weather}.`;
  };

  function confirm(projectId, { skip = [] } = {}) {
    const entry = open(projectId);
    const rt = entry?.rt;
    const pending = rt?.store.get().agent.pendingPlan;
    if (!pending) return { ok: false, error: 'NO_PENDING_PLAN' };
    const drop = new Set((skip || []).map(Number).filter(Number.isInteger));
    const p = drop.size ? { ...pending, steps: pending.steps.filter((_, i) => !drop.has(i)) } : pending;
    rt.store.patch((s) => {
      s.agent.pendingPlan = null;
      s.agent.messages = s.agent.messages.map((m) => (m.pending ? { ...m, pending: false, confirmed: true } : m));
    });
    if (!p.steps.length) {
      rt.say('agent', '这些步骤都被跳过了，没有改动。');
      return { ok: true, results: [], skipped: drop.size };
    }
    const out = executePlan(entry, p, {});
    rt.say('agent', `完成 ${out.okCount}/${out.results.length} 步${out.failed ? `（${out.failed} 步失败）` : ''}${drop.size ? `（跳过 ${drop.size} 步）` : ''}。`, { suggest: p.suggest });
    return { ok: true, okCount: out.okCount, failed: out.failed, skipped: drop.size, results: out.results.map((r) => ({ action: r.step.action, ok: r.result.ok, error: r.result.error })) };
  }
  function cancel(projectId) {
    const rt = open(projectId)?.rt;
    if (!rt?.store.get().agent.pendingPlan) return { ok: false, error: 'NO_PENDING_PLAN' };
    rt.store.patch((s) => {
      s.agent.pendingPlan = null;
      s.agent.messages = s.agent.messages.map((m) => (m.pending ? { ...m, pending: false, cancelled: true } : m));
    });
    rt.say('agent', '已取消，没有改动。');
    return { ok: true };
  }
  function runStep(projectId, { step, messageId, index }) {
    const entry = open(projectId);
    const rt = entry?.rt;
    if (!rt) return { ok: false, error: 'PROJECT_NOT_FOUND' };
    let st = step;
    if (!st && messageId !== undefined) st = rt.store.get().agent.messages.find((m) => m.id === messageId)?.plan?.steps?.[Number(index)];
    if (!st?.action) return { ok: false, error: 'NO_STEP' };
    const r = rt.dispatch(st.action, st.payload, { source: 'agent', actorId: st.role || 'manual' });
    toolCard(entry, st, r);
    return { ok: !!r.ok, result: r };
  }
  function invoke(projectId, action, payload = {}, meta = {}) {
    const entry = open(projectId);
    if (!entry) return { ok: false, error: 'PROJECT_NOT_FOUND' };
    if (action === 'agent.confirm') return confirm(projectId, payload);
    if (action === 'agent.cancel') return cancel(projectId);
    if (action === 'agent.run-step') return runStep(projectId, payload);
    if (action === 'agent.plan') return { ok: true, ...rulesPlan(payload.text, { assets: assets(), generation: generation ? Object.keys(generation.models) : [] }) };
    return entry.rt.dispatch(action, payload, meta);
  }
  const AGENT_CAPS = [
    { name: 'agent.run', doc: '把一句自然语言交给助手规划并执行（mode: lead 直接执行 / collaborative 需确认 / manual 只出方案）', params: { text: 'string', mode: 'lead|collaborative|manual', backend: 'rules|<model>', force: 'boolean' }, required: ['text'], undoable: false, allowedIn: ['EDIT'], group: 'agent' },
    { name: 'agent.confirm', doc: '确认并执行待确认的方案；skip 可以只跳过其中几步', params: { skip: 'number[]' }, required: [], undoable: false, allowedIn: ['EDIT'], group: 'agent' },
    { name: 'agent.cancel', doc: '取消待确认的方案（不做任何改动）', params: {}, required: [], undoable: false, allowedIn: ['EDIT'], group: 'agent' },
    { name: 'agent.run-step', doc: '执行方案中的单独一步（manual 模式逐条执行）', params: { step: 'object', messageId: 'string', index: 'number' }, required: [], undoable: false, allowedIn: ['EDIT'], group: 'agent' },
    { name: 'agent.plan', doc: '只规划不执行（规则规划器）', params: { text: 'string' }, required: ['text'], undoable: false, allowedIn: ['EDIT'], group: 'agent' },
  ];
  function capabilities(projectId) {
    const rt = projectId ? open(projectId)?.rt : createWorldRuntime({ project: { starter: 'blank', seed: 1 }, assets, generation, mediaDir });
    return [...(rt?.capabilities() || []), ...AGENT_CAPS];
  }
  function subscribe(projectId, fn) {
    const entry = open(projectId);
    if (!entry) return null;
    entry.subs.add(fn);
    fn({ seq: entry.seq, snapshot: entry.rt.snapshot() });
    return () => entry.subs.delete(fn);
  }
  function context(projectId) {
    const entry = open(projectId);
    return entry ? entry.rt.snapshot() : null;
  }
  function flush(projectId) {
    const entry = runtimes.get(projectId);
    if (!entry) return;
    clearTimeout(entry.saveTimer);
    save(entry);
  }
  function close(projectId) {
    const entry = runtimes.get(projectId);
    if (!entry) return;
    clearTimeout(entry.saveTimer);
    save(entry);
    runtimes.delete(projectId);
  }
  return {
    open: (id) => !!open(id),
    invoke,
    runAgent,
    capabilities,
    subscribe,
    context,
    close,
    flush,
    health: () => ({ projects: runtimes.size, llm: planner ? { name: planner.name, baseUrl: planner.baseUrl, model: planner.model, models: planner.models } : { name: 'rules', models: [], model: 'rules' }, generation: generation ? { name: generation.name, providers: Object.keys(generation.models) } : null, assets: assets().length }),
  };
}
