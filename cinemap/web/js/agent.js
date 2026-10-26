// Assistant frame: hosts the editor in #ws and the chat panel. A request goes to /api/agent,
// which answers with a short plan; each step is handed to the editor over postMessage and the
// feed shows it settle. The conversation is kept with the project.
import { T, lang, mountLanguage } from './i18n.js';
mountLanguage();
const q = new URLSearchParams(location.search);
const projectId = q.get('project') || '';
const $ = (s, r = document) => r.querySelector(s);
const ws = $('#ws');
ws.src = `/editor.html?${q}`;
const body = document.body;
const feed = $('.ag-feed'), box = $('.ag-box'), textarea = $('.ag-box textarea'), go = $('[data-a=go]'), stop = $('[data-a=stop]'), thumbs = $('.ag-thumbs'), fileInput = $('.ag-compose input[type=file]');
let mode = 'agent';
body.dataset.mode = mode;
const opts = { auto: true, model: 'strong', effort: 'medium', fast: false, ptc: false, withView: false };
let running = false, conversation = [], lastSteps = null, cost = 0, attachments = [];

const post = (msg) => ws.contentWindow?.postMessage({ ...msg }, location.origin);
const up = (msg) => parent !== window && parent.postMessage(msg, location.origin);
const setOpen = (on) => {
  body.classList.toggle('ag-collapsed', !on);
  if (on) textarea.focus();
};
$('[data-a=collapse]').onclick = () => {
  setOpen(false);
  post({ type: 'cm:agent-state', open: false });
};
$('#agOpen').onclick = () => setOpen(true);
for (const b of document.querySelectorAll('.ag-seg[data-k=mode] button'))
  b.onclick = () => {
    mode = b.dataset.v;
    body.dataset.mode = mode;
    for (const x of b.parentElement.children) x.classList.toggle('on', x === b);
  };
for (const el of document.querySelectorAll('.ag-opts [data-k]:not(.ag-seg)'))
  el.onchange = () => (opts[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value);

const row = (cls, text, ms) => {
  const r = document.createElement('div');
  r.className = `ag-row ${cls}`;
  r.innerHTML = `<span class="k">${cls.includes('tool') ? '›' : cls.includes('ok') ? '✓' : cls.includes('err') ? '!' : ''}</span><span class="t"></span>${ms != null ? `<span class="ms">${ms} ms</span>` : ''}`;
  r.querySelector('.t').textContent = text;
  feed.append(r);
  feed.scrollTop = feed.scrollHeight;
  return r;
};
const bubble = (cls, text) => {
  const b = document.createElement('div');
  b.className = cls;
  b.textContent = text;
  feed.append(b);
  feed.scrollTop = feed.scrollHeight;
  return b;
};
const clearEmpty = () => feed.querySelector('.ag-empty')?.remove();
textarea.oninput = () => {
  go.disabled = !textarea.value.trim() || running;
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
stop.onclick = () => {
  running = false;
  body.classList.remove('ag-running');
  row('err', T('Stopped.', '已停止。'));
};
$('[data-a=new]').onclick = () => {
  conversation = [];
  feed.replaceChildren();
  save();
};
$('[data-a=undo]').onclick = () => {
  if (!lastSteps) return;
  post({ type: 'cm:undo', steps: lastSteps });
  row('ok', T('Undid the last run.', '撤销了上一次。'));
  lastSteps = null;
  $('[data-a=undo]').disabled = true;
};
$('[data-a=attach]').onclick = () => fileInput.click();
fileInput.onchange = () => addFiles(fileInput.files);
box.addEventListener('dragover', (e) => {
  e.preventDefault();
  box.classList.add('drop');
});
box.addEventListener('dragleave', () => box.classList.remove('drop'));
box.addEventListener('drop', (e) => {
  e.preventDefault();
  box.classList.remove('drop');
  addFiles(e.dataTransfer.files);
});
textarea.addEventListener('paste', (e) => addFiles([...e.clipboardData.files]));
function addFiles(files) {
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(f);
    attachments.push({ name: f.name, url });
    const t = document.createElement('span');
    t.className = 'ag-thumb';
    t.innerHTML = `<img alt=""><button type="button" aria-label="Remove">×</button>`;
    t.querySelector('img').src = url;
    t.querySelector('button').onclick = () => {
      attachments = attachments.filter((a) => a.url !== url);
      t.remove();
    };
    thumbs.append(t);
  }
}

async function run(text) {
  if (!text || running) return;
  clearEmpty();
  running = true;
  body.classList.add('ag-running');
  go.disabled = true;
  textarea.value = '';
  textarea.style.height = '';
  const userBubble = bubble('ag-user', text);
  if (attachments.length) {
    const imgs = document.createElement('div');
    imgs.className = 'imgs';
    for (const a of attachments) {
      const img = document.createElement('img');
      img.src = a.url;
      imgs.append(img);
    }
    userBubble.append(imgs);
    attachments = [];
    thumbs.replaceChildren();
  }
  conversation.push({ role: 'user', text, at: Date.now() });
  const thinking = row('pending think', mode === 'ask' ? T('Reading the scene…', '在看场景…') : T('Planning…', '在想怎么摆…'));
  const t0 = performance.now();
  try {
    const r = await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: text, lang: lang(), mode, ...opts }) });
    const plan = await r.json();
    thinking.remove();
    if (!running) return;
    if (mode === 'ask') {
      const say = await askEditor(text);
      bubble('ag-say final', say);
      conversation.push({ role: 'assistant', text: say, at: Date.now() });
    } else {
      const done = [];
      for (const step of plan.steps) {
        if (!running) break;
        const label = describe(step);
        const r = row('pending tool', label);
        const res = await stepEditor(step);
        r.classList.remove('pending');
        r.classList.add(res?.ok ? 'ok' : 'err');
        r.querySelector('.k').textContent = res?.ok ? '✓' : '!';
        if (res?.ok) done.push({ ...step, ids: res.ids });
        if (res?.text) r.querySelector('.t').textContent = `${label} · ${res.text}`;
      }
      lastSteps = done.length ? done : null;
      $('[data-a=undo]').disabled = !lastSteps;
      bubble('ag-say final', plan.say);
      conversation.push({ role: 'assistant', text: plan.say, steps: plan.steps, at: Date.now() });
      up({ type: 'cm:activity', text: `${T('Agent', '助手')}: ${text} → ${plan.say}` });
    }
    const stats = document.createElement('div');
    stats.className = 'ag-stats';
    stats.textContent = `${Math.round(performance.now() - t0)} ms · $${(plan.cost || 0).toFixed(2)}`;
    feed.append(stats);
    cost += plan.cost || 0;
    $('.ag-cost').textContent = `${T('This session', '本次会话')} $${cost.toFixed(2)}`;
  } catch (err) {
    thinking.remove();
    row('err', err.message);
  } finally {
    running = false;
    body.classList.remove('ag-running');
    go.disabled = !textarea.value.trim();
    save();
  }
}
const describe = (s) => {
  const kinds = { lighthouse: ['lighthouse', '灯塔'], house: ['house', '房子'], tree: ['tree', '树'], boat: ['boat', '船'], tower: ['tower', '塔'], person: ['person', '人'], lamp: ['lamp', '路灯'], rock: ['rock', '石头'] };
  const k = (kind) => (lang() === 'zh' ? kinds[kind]?.[1] : kinds[kind]?.[0]) ?? kind;
  if (s.op === 'place') return lang() === 'zh' ? `放 ${s.count} ${k(s.kind)}` : `place ${s.count} ${k(s.kind)}`;
  if (s.op === 'clear') return lang() === 'zh' ? `清掉 ${s.kind === 'all' ? '所有东西' : k(s.kind)}` : `clear ${s.kind}`;
  if (s.op === 'time') return `${lang() === 'zh' ? '时间' : 'time'} → ${Math.floor(s.hour)}:${String(Math.round((s.hour % 1) * 60)).padStart(2, '0')}`;
  if (s.op === 'weather') return lang() === 'zh' ? `天气 → ${s.value}` : `weather → ${s.value}`;
  return s.op;
};
let seq = 0;
const pending = new Map();
const stepEditor = (step) =>
  new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    post({ type: 'cm:step', id, step });
    setTimeout(() => pending.has(id) && (pending.delete(id), resolve({ ok: false, text: 'timeout' })), 8000);
  });
const askEditor = (text) =>
  new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, (r) => resolve(r.text));
    post({ type: 'cm:ask', id, text });
    setTimeout(() => pending.has(id) && (pending.delete(id), resolve(T('The editor did not answer.', '编辑器没有回答。'))), 8000);
  });
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data) return;
  const d = e.data;
  if (d.type === 'cm:result' && pending.has(d.id)) {
    pending.get(d.id)(d);
    pending.delete(d.id);
  } else if (d.type === 'cm:agent-open') {
    setOpen(true);
    if (d.text) {
      textarea.value = d.text;
      textarea.oninput();
      run(d.text);
    }
  } else if (d.type === 'cm:voice') {
    clearEmpty();
    run(d.text);
  } else if (['cm:ready', 'cm:save', 'cm:toast', 'cm:activity'].includes(d.type)) up(d);
  else if (d.type === 'cm:conversation') {
    conversation = d.conversation || [];
    if (conversation.length) clearEmpty();
    for (const m of conversation) (m.role === 'user' ? bubble('ag-user', m.text) : bubble('ag-say final', m.text));
  }
});
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fetch(`/api/projects/${projectId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation }) }).catch(() => {}), 400);
}
