// Assistant frame: hosts the editor in #ws and renders the agent conversation that lives in
// the server's world runtime. The feed is a projection of snapshot.agent.messages — user
// lines, the model's thinking (live while it streams, folded afterwards), plans with per-step
// approval, tool cards with before/after diffs and "undo to here", questions with options,
// and the planner's suggestions for what to do next.
import { T, lang, mountLanguage } from './i18n.js';
mountLanguage();
const q = new URLSearchParams(location.search);
const projectId = q.get('project') || '';
const $ = (s, r = document) => r.querySelector(s);
const ws = $('#ws');
ws.src = `/editor.html?${q}`;
const body = document.body;
const feed = $('.ag-feed'), box = $('.ag-box'), textarea = $('.ag-box textarea'), go = $('[data-a=go]'), stop = $('[data-a=stop]'), thumbs = $('.ag-thumbs'), fileInput = $('.ag-compose input[type=file]');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const post = (msg) => ws.contentWindow?.postMessage({ ...msg }, location.origin);
const up = (msg) => parent !== window && parent.postMessage(msg, location.origin);
const api = (url, bodyObj) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyObj) }).then((r) => r.json());
const invoke = (action, payload = {}) => api(`/api/projects/${projectId}/actions`, { action, payload });

let snap = null, thinking = null, attachments = [], running = false, cost = 0, lastRendered = '';
const skipped = new Set(); // "<msgId>:<index>" of steps the person unticked in a pending plan
const openThinking = new Set();
const openCards = new Set();

// ---- options: mode (lead / collaborative / manual) and planning backend
const modeSeg = $('.ag-seg[data-k=mode]');
modeSeg.innerHTML = `<button data-v="lead">${T('Just do it', '直接做')}</button><button data-v="collaborative">${T('Ask first', '先确认')}</button><button data-v="manual">${T('Step by step', '逐条')}</button>`;
modeSeg.onclick = (e) => {
  const b = e.target.closest('[data-v]');
  if (b) invoke('agent.set-mode', { mode: b.dataset.v });
};
const modelSel = $('select[data-k=model]');
const effortSel = $('select[data-k=effort]');
effortSel.hidden = true;
fetch('/api/health').then((r) => r.json()).then((h) => {
  const models = h.llm?.models?.length ? h.llm.models : [];
  modelSel.replaceChildren(...[['rules', T('Rules (local)', '内置规则')], ...models.map((m) => [m, m])].map(([v, l]) => Object.assign(document.createElement('option'), { value: v, textContent: l })));
  modelSel.value = snap?.agent?.backend || 'rules';
}).catch(() => {});
modelSel.onchange = () => invoke('agent.set-backend', { backend: modelSel.value });
for (const el of document.querySelectorAll('.ag-opts label input')) el.closest('label').hidden = true;
$('.ag-auto').hidden = false;
$('.ag-auto').innerHTML = `<input type="checkbox" data-k="force"> ${T('Skip confirmations', '不再确认')}`;

const setOpen = (on) => {
  body.classList.toggle('ag-collapsed', !on);
  if (on) textarea.focus();
};
$('[data-a=collapse]').onclick = () => setOpen(false);
$('#agOpen').onclick = () => setOpen(true);

// ---- rendering
function diffOf(before, after) {
  if (!before && !after) return [];
  const flat = (o, prefix = '', out = {}) => {
    if (o && typeof o === 'object' && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) flat(v, prefix ? `${prefix}.${k}` : k, out);
    else out[prefix] = Array.isArray(o) ? JSON.stringify(o) : o;
    return out;
  };
  const a = flat(Array.isArray(before) ? { items: before.length } : before || {}), b = flat(Array.isArray(after) ? { items: after.length } : after || {});
  const rows = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (['id', 'base', 'edited'].includes(k)) continue;
    const va = a[k], vb = b[k];
    if (JSON.stringify(va) === JSON.stringify(vb)) continue;
    const fmt = (v) => (typeof v === 'number' ? +v.toFixed(2) : v === undefined ? '—' : v);
    rows.push([k, fmt(va), fmt(vb)]);
  }
  return rows;
}
function render() {
  if (!snap) return;
  const msgs = snap.agent.messages || [];
  const key = JSON.stringify([msgs.map((m) => m.id + (m.pending ? 'p' : '') + (m.confirmed ? 'c' : '') + (m.cancelled ? 'x' : '')), thinking, [...skipped], [...openThinking], [...openCards], snap.agent.suggest, (snap.jobs || []).map((j) => j.id + j.status + Math.round(j.progress || 0))]);
  if (key === lastRendered) return;
  lastRendered = key;
  const html = [];
  if (!msgs.length && !thinking) html.push(`<div class="ag-empty"><b>${T('Just do it', '直接做')}</b>: ${T('one sentence, it places things at once.', '一句话，马上摆。')}<br><b>${T('Ask first', '先确认')}</b>: ${T('it shows the plan with checkboxes; tick what to run.', '先出方案，勾选要执行的步骤。')}<br><b>${T('Step by step', '逐条')}</b>: ${T('run each step yourself.', '每一步你来点。')}<br>${T('Every step is an Action in the event log and can be undone.', '每一步都进事件日志，可以撤销。')}</div>`);
  for (const m of msgs) {
    if (m.role === 'user') html.push(`<div class="ag-user">${esc(m.text)}</div>`);
    else if (m.role === 'agent') html.push(`<div class="ag-say final">${esc(m.text)}${m.notes?.length ? `<div class="ag-notes">${m.notes.map(esc).join('<br>')}</div>` : ''}</div>`);
    else if (m.role === 'thinking') {
      const th = m.thinking || {};
      const open = openThinking.has(m.id);
      html.push(`<div class="ag-think chip" data-think="${m.id}"><div class="line"><span class="k">✦</span><b>${T('Thought for', '想了')} ${th.ms ? `${(th.ms / 1000).toFixed(1)}s` : T('a moment', '一会儿')}</b><span class="ms">${esc(th.model || '')}${th.usage?.total ? ` · ${th.usage.total} tok` : ''}</span><span class="chev">${open ? '▾' : '▸'}</span></div>${open ? `<div class="body">${esc(m.text || T('(no reasoning text; the model only wrote the plan)', '（模型没有给出推理文本，只写了计划）'))}${th.steps?.length ? `<ol>${th.steps.map((s) => `<li>${esc(s.label)} <code>${esc(s.action)}</code></li>`).join('')}</ol>` : ''}${th.notes?.length ? `<div class="ag-notes">${th.notes.map(esc).join('<br>')}</div>` : ''}</div>` : ''}</div>`);
    } else if (m.role === 'plan') {
      const steps = m.plan?.steps || [];
      const n = steps.length - [...skipped].filter((k) => k.startsWith(`${m.id}:`)).length;
      html.push(`<div class="ag-plan${m.pending ? ' pending' : ''}${m.cancelled ? ' cancelled' : ''}">${m.text ? `<div class="reply">${esc(m.text)}</div>` : ''}<div class="steps">${steps.map((s, i) => `<label class="step${m.pending && skipped.has(`${m.id}:${i}`) ? ' off' : ''}" title="${esc(s.action)}">${m.pending ? `<input type="checkbox" data-skip="${m.id}:${i}"${skipped.has(`${m.id}:${i}`) ? '' : ' checked'}>` : '<span class="k">›</span>'}<span>${esc(s.label)}</span>${m.manual && !m.cancelled ? `<button class="ag-link" data-run-step="${m.id}:${i}">${T('Run', '执行')}</button>` : ''}</label>`).join('')}</div>${m.plan?.notes?.length ? `<div class="ag-notes">${m.plan.notes.map(esc).join('<br>')}</div>` : ''}${m.pending ? `<div class="actions"><button class="ag-btn go" data-confirm="${m.id}">${n < steps.length ? T(`Run the ${n} ticked`, `做选中的 ${n} 步`) : T('Do it', '就这么做')}</button><button class="ag-link" data-cancel="1">${T('Never mind', '算了')}</button></div>` : m.cancelled ? `<div class="ag-notes">${T('Cancelled, nothing changed.', '已取消，没有改动。')}</div>` : ''}</div>`);
    } else if (m.role === 'tool') {
      const tl = m.tool || {};
      const rows = diffOf(tl.before, tl.after);
      const open = openCards.has(m.id);
      const summary = rows.length ? `${esc(rows[0][0])} ${esc(rows[0][1])} → ${esc(rows[0][2])}${rows.length > 1 ? ` · +${rows.length - 1}` : ''}` : tl.ids?.length ? `${tl.ids.length} ${T('placed', '个已放置')}` : '';
      html.push(`<div class="ag-tool ${tl.ok ? 'ok' : 'err'}" data-card="${m.id}"><div class="line"><span class="k">${tl.ok ? '✓' : '!'}</span><span class="t">${esc(m.text)}</span><code>${esc(tl.action)}</code><span class="ms">${tl.ms ?? ''}${tl.ms != null ? ' ms' : ''}</span></div>${tl.ok ? `<div class="sub">${summary}${tl.eventId ? `<button class="ag-link" data-undo-to="${tl.eventId}">${T('Undo to here', '撤到这里')}</button>` : ''}<span class="chev">${open ? '▾' : '▸'}</span></div>` : `<div class="sub err">${esc(tl.error)}${tl.hint ? ` · ${esc(tl.hint)}` : ''}</div>`}${open ? `<table class="diff">${rows.map(([k, a, b]) => `<tr><td>${esc(k)}</td><td>${esc(a)}</td><td>→</td><td>${esc(b)}</td></tr>`).join('') || `<tr><td colspan="4">${T('No field changed', '没有字段变化')}</td></tr>`}</table><details><summary>${T('Raw payload', '原始参数')}</summary><pre>${esc(JSON.stringify(tl.payload, null, 1))}</pre></details>` : ''}</div>`);
    } else if (m.role === 'tool' && false) {
    } else if (m.role === 'ask') {
      html.push(`<div class="ag-say final ask">${esc(m.text)}${(m.ask || []).map((a) => `<div class="q"><b>${esc(a.question)}</b>${a.why ? `<div class="why">${esc(a.why)}</div>` : ''}<div class="opts">${a.options.map((o) => `<button class="ag-link opt${o.recommended ? ' rec' : ''}" data-opt="${esc(o.label)}" title="${esc(o.detail)}">${esc(o.label)}</button>`).join('')}</div></div>`).join('')}</div>`);
    }
  }
  if (thinking && thinking.phase !== 'done') {
    const steps = (thinking.steps || []).slice(-6);
    html.push(`<div class="ag-think live"><div class="line"><span class="k spin">◠</span><b>${esc(thinking.model)} ${thinking.phase === 'executing' ? T('is executing', '在执行') : thinking.phase === 'failed' ? T('failed', '失败了') : T('is planning', '正在规划')}</b>${thinking.chars ? `<span class="ms">${thinking.chars} ${T('chars', '字')}</span>` : ''}</div>${thinking.reasoning ? `<div class="body">${esc(thinking.reasoning.slice(-900))}</div>` : ''}${steps.length ? `<ol>${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}${thinking.error ? `<div class="ag-notes">${esc(thinking.error)}</div>` : ''}</div>`);
  }
  const running = (snap.jobs || []).filter((j) => ['queued', 'running'].includes(j.status));
  for (const j of running) html.push(`<div class="ag-think live"><div class="line"><span class="k spin">◠</span><b>${esc(j.provider)} ${T('generating', '生成中')}</b><span class="ms">${Math.round(j.progress || 0)}%</span></div></div>`);
  for (const j of (snap.jobs || []).filter((x) => x.status === 'done' && x.result?.url).slice(-2)) html.push(`<div class="ag-media">${j.result.kind === 'video' ? `<video src="${esc(j.result.url)}" controls muted playsinline></video>` : `<img src="${esc(j.result.url)}" alt="">`}<small>${esc(j.provider)} · ${esc(j.mode)}</small></div>`);
  const sug = snap.agent.suggest || [];
  if (sug.length && !snap.agent.pendingPlan) html.push(`<div class="ag-suggest">${sug.map((s) => `<button class="ag-link" data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}</div>`);
  feed.innerHTML = html.join('');
  feed.scrollTop = feed.scrollHeight;
  for (const b of modeSeg.children) b.classList.toggle('on', b.dataset.v === snap.agent.mode);
  if (modelSel.value !== snap.agent.backend && [...modelSel.options].some((o) => o.value === snap.agent.backend)) modelSel.value = snap.agent.backend;
  body.classList.toggle('ag-running', !!snap.agent.busy);
  go.disabled = !textarea.value.trim() || !!snap.agent.busy;
}
feed.addEventListener('click', async (e) => {
  const el = e.target;
  const skip = el.closest('[data-skip]');
  if (skip) {
    const k = skip.dataset.skip;
    skip.checked ? skipped.delete(k) : skipped.add(k);
    lastRendered = '';
    render();
    return;
  }
  const confirm = el.closest('[data-confirm]');
  if (confirm) {
    const mid = confirm.dataset.confirm;
    const skipIdx = [...skipped].filter((k) => k.startsWith(`${mid}:`)).map((k) => Number(k.split(':')[1]));
    for (const i of skipIdx) skipped.delete(`${mid}:${i}`);
    await invoke('agent.confirm', skipIdx.length ? { skip: skipIdx } : {});
    return;
  }
  if (el.closest('[data-cancel]')) return void invoke('agent.cancel');
  const step = el.closest('[data-run-step]');
  if (step) {
    const [messageId, index] = step.dataset.runStep.split(':');
    await invoke('agent.run-step', { messageId, index: Number(index) });
    return;
  }
  const undoTo = el.closest('[data-undo-to]');
  if (undoTo) return void invoke('project.undo-to', { eventId: undoTo.dataset.undoTo });
  const opt = el.closest('[data-opt]');
  if (opt) return void run(opt.dataset.opt);
  const sug = el.closest('[data-suggest]');
  if (sug) return void run(sug.dataset.suggest);
  const think = el.closest('[data-think]');
  if (think) {
    const id = think.dataset.think;
    openThinking.has(id) ? openThinking.delete(id) : openThinking.add(id);
    lastRendered = '';
    render();
    return;
  }
  const card = el.closest('[data-card]');
  if (card && !el.closest('button')) {
    const id = card.dataset.card;
    openCards.has(id) ? openCards.delete(id) : openCards.add(id);
    lastRendered = '';
    render();
  }
});

// ---- snapshot stream
const es = new EventSource(`/api/projects/${projectId}/events`);
es.onmessage = (e) => {
  const frame = JSON.parse(e.data);
  if (frame.snapshot) {
    snap = frame.snapshot;
    if (snap.agent.busy === false && thinking?.phase === 'done') thinking = null;
    render();
  }
  if (frame.thinking) {
    thinking = frame.thinking;
    if (thinking.phase === 'done') setTimeout(() => ((thinking = null), render()), 300);
    render();
  }
};

// ---- compose
textarea.oninput = () => {
  go.disabled = !textarea.value.trim() || !!snap?.agent?.busy;
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(160, textarea.scrollHeight)}px`;
};
textarea.onkeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    if (!go.disabled) run(textarea.value.trim());
  }
};
go.onclick = () => run(textarea.value.trim());
stop.onclick = () => invoke('agent.cancel');
$('[data-a=new]').onclick = () => {
  feed.replaceChildren();
  lastRendered = '';
  fetch(`/api/projects/${projectId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation: [] }) }).then(() => location.reload());
};
$('[data-a=undo]').textContent = T('Undo', '撤销');
$('[data-a=undo]').disabled = false;
$('[data-a=undo]').onclick = () => invoke('project.undo');
$('[data-a=attach]').onclick = () => fileInput.click();
fileInput.onchange = () => addFiles(fileInput.files);
box.addEventListener('dragover', (e) => (e.preventDefault(), box.classList.add('drop')));
box.addEventListener('dragleave', () => box.classList.remove('drop'));
box.addEventListener('drop', (e) => (e.preventDefault(), box.classList.remove('drop'), addFiles(e.dataTransfer.files)));
function addFiles(files) {
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(f);
    attachments.push({ name: f.name, url });
    const t = document.createElement('span');
    t.className = 'ag-thumb';
    t.innerHTML = `<img alt=""><button type="button" aria-label="Remove">×</button>`;
    t.querySelector('img').src = url;
    t.querySelector('button').onclick = () => ((attachments = attachments.filter((a) => a.url !== url)), t.remove());
    thumbs.append(t);
  }
}
async function run(text, frame = null) {
  if (!text || running) return;
  running = true;
  textarea.value = '';
  textarea.style.height = '';
  go.disabled = true;
  attachments = [];
  thumbs.replaceChildren();
  try {
    const out = await api(`/api/projects/${projectId}/agent`, { text, lang: lang(), force: $('[data-k=force]')?.checked || false, frame });
    if (out.usage?.total_tokens) {
      cost += out.usage.total_tokens;
      $('.ag-cost').textContent = `${T('This session', '本次会话')} ${cost} tok`;
    }
    if (!out.ok) up({ type: 'cm:toast', text: out.hint || out.error });
    else up({ type: 'cm:activity', text: `${T('Agent', '助手')}: ${text} → ${out.reply || ''}` });
  } catch (err) {
    up({ type: 'cm:toast', text: err.message });
  } finally {
    running = false;
    go.disabled = !textarea.value.trim();
  }
}
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data) return;
  const d = e.data;
  if (d.type === 'cm:agent-open') {
    setOpen(true);
    if (d.text) run(d.text);
  } else if (d.type === 'cm:voice') run(d.text, d.frame || null);
  else if (['cm:ready', 'cm:save', 'cm:toast', 'cm:activity'].includes(d.type)) up(d);
});
