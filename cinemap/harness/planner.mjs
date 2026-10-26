// Planners turn a sentence into Action steps. Two of them, same output shape:
//   rules — built in, never fails, understands counts / kinds / places / time / weather
//   llm   — an OpenAI-compatible chat API (same gateway family Director uses), streaming the
//           model's reasoning and the steps it is writing, negotiating vendor parameter quirks
// The model only proposes; every step still goes through dispatch (validation, state machine,
// event log, undo) exactly like a human click.
export const PLANNABLE = /^(world\.|context\.|project\.(undo|redo|undo-to)$|asset\.place$)/;
const ROLE_OF = (a) => ({ world: 'scene-builder', context: 'director-planner', project: 'director-planner', asset: 'scene-builder' })[a.split('.')[0]] || 'director-planner';
const KIND_WORDS = [
  [/灯塔|lighthouse/i, 'lighthouse'],
  [/房子|房屋|小屋|民居|house|cabin|home/i, 'house'],
  [/仓房|仓库|棚|shed|warehouse|barn/i, 'shed'],
  [/松树|松|pine/i, 'pine'],
  [/树|tree/i, 'tree'],
  [/灌木|bush|shrub/i, 'bush'],
  [/船|boat|ship/i, 'boat'],
  [/(?<!灯)塔(?!楼?灯)|(?<!light)tower/i, 'tower'],
  [/人|居民|person|people|character|villager/i, 'person'],
  [/路灯|lamp/i, 'lamp'],
  [/长椅|椅|bench/i, 'bench'],
  [/车|car|vehicle/i, 'car'],
  [/石头|岩石|rock|stone/i, 'rock'],
];
const NUM = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 几: 3, 一些: 4, 很多: 8 };
const KIND_ZH = { lighthouse: '灯塔', house: '房子', shed: '仓房', pine: '松树', tree: '树', bush: '灌木', boat: '船', tower: '塔', person: '人', lamp: '路灯', bench: '长椅', car: '车', rock: '石头' };
const hhmm = (h) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

export function rulesPlan(text, ctx = {}) {
  const t = String(text || '').slice(0, 2000);
  const zh = (ctx.lang || 'zh') === 'zh';
  const steps = [];
  const notes = [];
  const step = (action, payload, label) => steps.push({ action, payload, label, role: ROLE_OF(action) });
  const near = /湖|水|岸|海|lake|shore|sea|water|river|河/i.test(t) ? 'water' : /路|街|road|street/i.test(t) ? 'road' : /山|坡|hill|mountain/i.test(t) ? 'hill' : 'open';
  const clearing = /删|去掉|清空|清掉|remove|clear|delete/i.test(t);
  // assets by name: "放一个 bin_waste_a01" / "放一台 3D 打印机"
  for (const a of ctx.assets || []) {
    const names = [a.id, a.name, ...(a.aliases || [])].filter(Boolean);
    if (names.some((n) => n && t.toLowerCase().includes(String(n).toLowerCase()))) {
      step('world.place', { kind: `asset:${a.id}`, count: 1, near }, zh ? `放 1 个 ${a.name}` : `place ${a.name}`);
    }
  }
  // kinds in the order they appear in the sentence, so "two lamps and a tree" plans lamps first
  const seen = new Set();
  const found = [];
  for (const [re, kind] of KIND_WORDS) {
    const m = re.exec(t);
    if (!m || seen.has(kind)) continue;
    if (kind === 'tree' && seen.has('pine') && !/(?<!松)树/.test(t)) continue;
    seen.add(kind);
    found.push({ kind, index: m.index });
  }
  found.sort((a, b) => a.index - b.index);
  for (const { kind, index } of found) {
    if (clearing) {
      step('world.clear', { kind }, zh ? `清掉所有${KIND_ZH[kind]}` : `clear ${kind}`);
      continue;
    }
    const before = t.slice(Math.max(0, index - 8), index);
    const n = /(\d+|[一两二三四五六七八九十几]|一些|很多)\s*(?:棵|座|栋|个|艘|盏|块|名|位|台|辆|把)?\s*[^\s，,。；;]{0,3}$/.exec(before);
    const count = Math.min(20, n ? Number(n[1]) || NUM[n[1]] || 1 : 1);
    step('world.place', { kind, count, near }, zh ? `放 ${count} ${KIND_ZH[kind]}${near !== 'open' ? `（${{ water: '靠水边', road: '沿路', hill: '在坡上' }[near]}）` : ''}` : `place ${count} ${kind}${near !== 'open' ? ` near ${near}` : ''}`);
  }
  if (clearing && !seen.size && /全部|所有|everything|all/i.test(t)) step('world.clear', { kind: 'all' }, zh ? '清掉所有放置的构件' : 'clear everything placed');
  const hourWords = [[/(早上|清晨|morning|dawn)/i, 7], [/(中午|正午|noon)/i, 12], [/(下午|午后|afternoon)/i, 15.5], [/(黄昏|傍晚|日落|sunset|dusk)/i, 18.5], [/(晚上|夜|night)/i, 22]];
  for (const [re, hour] of hourWords) if (re.test(t)) step('world.time', { hour }, zh ? `时间拨到 ${hhmm(hour)}` : `time → ${hhmm(hour)}`);
  const hm = /(\d{1,2})[:：点](\d{2})?/.exec(t);
  if (hm && +hm[1] >= 5 && +hm[1] <= 23) step('world.time', { hour: +hm[1] + (+hm[2] || 0) / 60 }, `${zh ? '时间拨到' : 'time →'} ${hm[1]}:${hm[2] || '00'}`);
  const weatherWords = [[/(雷雨|暴雨|storm)/i, 'storm'], [/(雨|rain)/i, 'rain'], [/(雪|snow)/i, 'snow'], [/(雾|fog|mist)/i, 'fog'], [/(多云|cloudy)/i, 'cloudy'], [/(阴|overcast)/i, 'overcast'], [/(晴|sunny|clear)/i, 'clear']];
  for (const [re, w] of weatherWords) if (re.test(t)) {
    step('world.weather', { weather: w }, zh ? `天气换成 ${w}` : `weather → ${w}`);
    break;
  }
  if (/撤销|undo/i.test(t)) step('project.undo', {}, zh ? '撤销上一步' : 'undo');
  const asking = !steps.length && /[?？]|什么|多少|哪里|how many|what|where/i.test(t);
  if (asking) step('context.world', {}, zh ? '读取当前世界' : 'read the world');
  const needsConfirm = steps.some((s) => s.action === 'world.clear' && s.payload.kind === 'all') || steps.reduce((n, s) => n + (s.payload?.count || 0), 0) > 12;
  const reply = steps.length ? (zh ? '好，按这个做：' : 'On it:') + steps.map((s) => s.label).join(zh ? '；' : '; ') : zh ? '我没听出要摆什么。试试「在湖边放三棵树和一栋小房子」。' : 'I could not tell what to place. Try "three trees and a cabin by the lake".';
  if (!steps.length) notes.push(zh ? '规则规划器只认构件 / 数量 / 位置 / 时间 / 天气' : 'rules planner only knows kinds, counts, places, time and weather');
  const suggest = zh ? ['在路边放两盏路灯', '把时间拨到黄昏', '清掉所有树'] : ['two lamps along the road', 'set time to dusk', 'clear the trees'];
  return { steps, notes, reply, needsConfirm, ask: [], suggest, model: 'rules' };
}

export const LLM_DEFAULTS = { baseUrl: 'https://aigw.sotatts.online/v1', model: 'gpt-5.6-sol', models: ['gpt-5.6-sol', 'gpt-5.6-luna', 'gpt-5.5', 'gpt-6-astra', 'claude-opus-5', 'claude-sonnet-4-6', 'deepseek-v4-flash', 'deepseek-v4-chat'], timeoutMs: 120000, maxTokens: 6000, temperature: 0.2 };

export function createLlmPlanner(opts = {}) {
  if (!opts.apiKey) throw new Error('llm planner needs apiKey');
  const base = (opts.baseUrl || LLM_DEFAULTS.baseUrl).replace(/\/$/, '');
  const models = opts.models || LLM_DEFAULTS.models;
  const defaultModel = opts.model && models.includes(opts.model) ? opts.model : opts.model || LLM_DEFAULTS.model;
  if (!models.includes(defaultModel)) models.unshift(defaultModel);
  const log = opts.log || (() => {});
  const quirks = new Map();
  const quirkOf = (m) => quirks.get(m) || { jsonMode: true, maxTokensKey: 'max_tokens', fixedTemperature: false, noStream: false };
  const body = (model, messages, stream) => {
    const q = quirkOf(model);
    const b = { model, messages };
    if (stream && !q.noStream) b.stream = true;
    b[q.maxTokensKey] = opts.maxTokens || LLM_DEFAULTS.maxTokens;
    if (!q.fixedTemperature) b.temperature = opts.temperature ?? LLM_DEFAULTS.temperature;
    if (q.jsonMode) b.response_format = { type: 'json_object' };
    return b;
  };
  // negotiate parameter spellings once per model on the first 400, remember the answer
  const adapt = (model, txt) => {
    const q = { ...quirkOf(model) };
    let changed = false;
    if (/max_completion_tokens/.test(txt) && q.maxTokensKey !== 'max_completion_tokens') (q.maxTokensKey = 'max_completion_tokens'), (changed = true);
    if (/temperature[^\n]*(not support|unsupported)/i.test(txt) && !q.fixedTemperature) (q.fixedTemperature = true), (changed = true);
    if (/response_format|json_object/i.test(txt) && q.jsonMode) (q.jsonMode = false), (changed = true);
    if (/\bstream\b[^\n]*(not support|unsupported)/i.test(txt) && !q.noStream) (q.noStream = true), (changed = true);
    if (changed) {
      quirks.set(model, q);
      log(`llm ${model}: adapted → ${q.maxTokensKey}${q.fixedTemperature ? ' · default temperature' : ''}${q.jsonMode ? '' : ' · no json_object'}`);
    }
    return changed;
  };
  const LABEL_RE = /"label"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  const labelsIn = (s) => [...s.matchAll(LABEL_RE)].map((m) => {
    try {
      return JSON.parse(`"${m[1]}"`);
    } catch {
      return m[1];
    }
  });
  async function chat(model, messages, onDelta) {
    const timeoutMs = opts.timeoutMs || LLM_DEFAULTS.timeoutMs;
    for (let attempt = 0; ; attempt++) {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), timeoutMs);
      try {
        const wantStream = !!onDelta && !quirkOf(model).noStream;
        const res = await fetch(`${base}/chat/completions`, { method: 'POST', headers: { authorization: `Bearer ${opts.apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify(body(model, messages, wantStream)), signal: ctl.signal });
        if (res.ok) return wantStream && /event-stream/i.test(res.headers.get('content-type') || '') ? readStream(res, onDelta) : readWhole(res);
        const txt = await res.text();
        if (res.status === 400 && attempt < 4 && adapt(model, txt)) continue;
        throw Object.assign(new Error(txt.slice(0, 300)), { code: `HTTP_${res.status}` });
      } catch (err) {
        if (err?.name === 'AbortError') throw Object.assign(new Error(`规划超时（${Math.round(timeoutMs / 1000)}s）`), { code: 'LLM_TIMEOUT' });
        throw err;
      } finally {
        clearTimeout(t);
      }
    }
  }
  async function readWhole(res) {
    const d = await res.json();
    const m = d.choices?.[0]?.message || {};
    return { text: m.content || '', reasoning: m.reasoning_content || m.reasoning || '', usage: d.usage };
  }
  async function readStream(res, onDelta) {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '', text = '', reasoning = '', usage = null, seen = 0, last = 0;
    const push = (force) => {
      const now = Date.now();
      if (!force && now - last < 350) return;
      last = now;
      const labels = labelsIn(text);
      onDelta({ reasoning, content: text, steps: labels, newSteps: labels.length - seen });
      seen = labels.length;
    };
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const b = line.slice(5).trim();
        if (!b || b === '[DONE]') continue;
        let j;
        try {
          j = JSON.parse(b);
        } catch {
          continue;
        }
        const delta = j.choices?.[0]?.delta || {};
        if (delta.reasoning_content) reasoning += delta.reasoning_content;
        else if (delta.reasoning) reasoning += delta.reasoning;
        if (delta.content) text += delta.content;
        if (j.usage) usage = j.usage;
        push(false);
      }
    }
    push(true);
    return { text, reasoning, usage };
  }
  const systemPrompt = (caps, summary) => `你是 Cinemap（用文字搭 3D 白模世界）的助手。用户用自然语言下指令，你把它翻译成 Action 计划。
只输出一个 JSON 对象：
{"steps":[{"action":"<name>","payload":{...},"label":"<给人看的一句话>"}],"notes":["<做不了的部分或你的假设>"],"reply":"<给用户的一句话>","needsConfirm":<bool>,"ask":[{"question":"<只在必须问时>","why":"<不问会怎样>","options":[{"label":"<选项>","detail":"<后果>","recommended":<bool>}]}],"suggest":["<接下来最可能的 2-3 条可执行指令>"]}
规则：
- 只能用下面列出的 Action 和参数；构件 id 用 context 里的真实 id，不要编造。
- 单位：米、弧度、小时。地台中心是 (0,0)，x 向东，z 向南。放东西不知道精确位置就不要给 x/z，用 near（water/road/hill/open）让系统找空位。
- 纯提问（"场景里有什么"）用 context.world / context.items 读，再在 reply 里回答。
- 批量删除（world.clear kind=all）或一次放超过 12 个东西时 needsConfirm=true。
- 只在不同选择会导出明显不同结果、且无法从上下文判断时才 ask；能合理默认的直接做，把假设写进 notes。
- suggest 永远给 2-3 条；label 用用户的语言。
可用 Action：
${caps.filter((c) => PLANNABLE.test(c.name)).map((c) => `${c.name} ${JSON.stringify(c.params || {})}${c.required?.length ? ` required=${c.required.join(',')}` : ''} — ${c.doc}`).join('\n')}
当前世界 context：
${JSON.stringify(summary)}`;
  function closeJson(raw) {
    for (let end = raw.length; end > 40; end = raw.lastIndexOf(',', end - 1)) {
      const head = raw.slice(0, end);
      const stack = [];
      let inStr = false, esc = false;
      for (const ch of head) {
        if (esc) {
          esc = false;
          continue;
        }
        if (ch === '\\') {
          esc = true;
          continue;
        }
        if (ch === '"') {
          inStr = !inStr;
          continue;
        }
        if (inStr) continue;
        if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']');
        else if (ch === '}' || ch === ']') stack.pop();
      }
      if (inStr) continue;
      try {
        return JSON.parse(head + stack.reverse().join(''));
      } catch {
        /* keep trimming */
      }
    }
    return null;
  }
  function parsePlan(text) {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw Object.assign(new Error('no JSON in model reply'), { code: 'BAD_PLAN' });
    let j, truncated = false;
    try {
      j = JSON.parse(m[0]);
    } catch (err) {
      j = closeJson(m[0]);
      if (!j) throw Object.assign(new Error(`计划解析失败：${err.message}`), { code: 'BAD_PLAN' });
      truncated = true;
    }
    const steps = (Array.isArray(j.steps) ? j.steps : []).filter((s) => s && typeof s.action === 'string').map((s) => ({ action: s.action.trim(), payload: s.payload && typeof s.payload === 'object' ? s.payload : {}, label: String(s.label || s.action), role: ROLE_OF(s.action) }));
    const ask = (Array.isArray(j.ask) ? j.ask : []).filter((a) => a && typeof a.question === 'string').slice(0, 3).map((a) => ({ question: String(a.question), why: typeof a.why === 'string' ? a.why : '', options: (Array.isArray(a.options) ? a.options : []).slice(0, 4).map((o) => ({ label: String(o?.label ?? o), detail: String(o?.detail || ''), recommended: !!o?.recommended })) })).filter((a) => a.options.length >= 2);
    return { steps, notes: [...(Array.isArray(j.notes) ? j.notes.map(String) : []), ...(truncated ? ['模型输出被截断，只保留了能完整读出的步骤'] : [])], reply: typeof j.reply === 'string' ? j.reply : '', needsConfirm: !!j.needsConfirm, ask, suggest: (Array.isArray(j.suggest) ? j.suggest : []).map(String).filter((x) => x.trim()).slice(0, 3), truncated };
  }
  return {
    name: 'llm',
    baseUrl: base,
    model: defaultModel,
    models,
    async plan(text, ctx) {
      const model = ctx.model && ctx.model !== 'rules' && models.includes(ctx.model) ? ctx.model : defaultModel;
      const known = new Set(ctx.capabilities.map((c) => c.name));
      const messages = [{ role: 'system', content: systemPrompt(ctx.capabilities, ctx.summary) }];
      for (const h of (ctx.history || []).slice(-8)) messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: String(h.text).slice(0, 1200) });
      messages.push({ role: 'user', content: text });
      const t0 = Date.now();
      const { text: out, reasoning, usage } = await chat(model, messages, ctx.onDelta);
      const p = parsePlan(out);
      const unknown = p.steps.filter((s) => !known.has(s.action) || !PLANNABLE.test(s.action));
      if (unknown.length) p.notes.push(`模型提出了不可用的 Action：${unknown.map((s) => s.action).join(', ')}`);
      p.steps = p.steps.filter((s) => known.has(s.action) && PLANNABLE.test(s.action));
      const ms = Date.now() - t0;
      log(`llm ${model}: ${p.steps.length} steps in ${ms} ms (${usage?.total_tokens ?? '?'} tokens)`);
      return { ...p, reasoning: reasoning || '', model, usage, ms };
    },
  };
}
