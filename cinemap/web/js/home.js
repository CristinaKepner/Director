// Home page controller: session, catalog, the horizon hero, the composer, overlays and menus.
import { T, lang, onLang, mountLanguage, setLang } from './i18n.js';
import { drawValley, mountTurntable, mountTrack } from './horizon.js';

const $ = (id) => document.getElementById(id);
mountLanguage();
const zh = () => lang() === 'zh';
const nameOf = (t) => (zh() ? t.name_zh : t.names?.[lang()] ?? t.name);
const descOf = (t) => (zh() ? t.desc_zh : t.descs?.[lang()] ?? t.desc);

const api = async (url, init) => {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (r.status === 401) {
    location.replace('/login');
    throw new Error('signed out');
  }
  return r.json();
};
let toastTimer;
const toast = (msg) => {
  $('toast').textContent = msg;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('toast').hidden = true), 5000);
};

const [me, templates, projectsRes, wallet, betaPref] = await Promise.all([
  api('/api/session'),
  api('/api/templates'),
  api('/api/projects'),
  api('/api/tapnow/generation/wallet').catch(() => ({ data: { available: '0' } })),
  api('/api/prefs?key=home.beta.dismissed').catch(() => ({ value: null })),
]);
let projects = projectsRes.projects;

// ---- header / account
for (const img of document.querySelectorAll('.avatar img')) {
  if (me.picture) img.src = me.picture;
  else img.remove();
}
for (const el of document.querySelectorAll('.avatar:not(.small)')) if (!me.picture) el.textContent = (me.name || '?').slice(0, 1).toUpperCase();
$('menuAvatar').textContent = me.picture ? '' : (me.name || '?').slice(0, 1).toUpperCase();
$('accountName').textContent = me.name;
$('accountEmail').textContent = me.email;
$('menuCreditsValue').textContent = wallet.data?.available ?? '0';
const menu = $('accountMenu');
const avatarBtn = document.querySelector('[data-account]');
const toggleMenu = (on) => {
  menu.hidden = !on;
  avatarBtn.setAttribute('aria-expanded', String(on));
};
avatarBtn.onclick = (e) => {
  e.stopPropagation();
  toggleMenu(menu.hidden);
};
document.addEventListener('click', (e) => !menu.contains(e.target) && toggleMenu(false));
document.addEventListener('keydown', (e) => e.key === 'Escape' && toggleMenu(false));
for (const b of menu.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang()));
onLang(() => {
  for (const b of menu.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang()));
  track.relabel();
  renderAll();
});
menu.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-menu]');
  if (!b) return;
  toggleMenu(false);
  switch (b.dataset.menu) {
    case 'projects': return openAll('projects');
    case 'new': return startCreate('blank', '');
    case 'templates': return openAll('templates');
    case 'assets': return openAll('assets');
    case 'feedback': return $('feedbackDialog').showModal();
    case 'switch':
    case 'logout': {
      await api('/api/logout', { method: 'POST' });
      location.assign(b.dataset.menu === 'switch' ? '/login?auth_notice=TAPNOW_ACCOUNT_SWITCHED' : '/login');
    }
  }
});
$('feedbackCancel').onclick = () => $('feedbackDialog').close();
$('feedbackForm').onsubmit = (e) => {
  e.preventDefault();
  $('feedbackDialog').close();
  $('feedbackText').value = '';
  toast(T('Thanks — your feedback was sent.', '收到了，谢谢你的反馈。'));
};
$('tutorialLink').onclick = (e) => {
  e.preventDefault();
  startCreate('tutorial', '');
};
$('assetsLink').onclick = (e) => {
  e.preventDefault();
  openAll('assets');
};

// ---- beta card
if (!betaPref.value) $('betaCard').hidden = false;
$('betaStart').onclick = () => {
  $('betaCard').hidden = true;
  api('/api/prefs', { method: 'POST', body: JSON.stringify({ key: 'home.beta.dismissed', value: Date.now() }) }).catch(() => {});
  $('worldPrompt').focus();
};

// ---- horizon
const hz = $('horizon');
drawValley(hz.querySelector('.hz-valley'));
addEventListener('resize', () => drawValley(hz.querySelector('.hz-valley')));
const turntable = mountTurntable(hz.querySelector('.hz-tt'), { getCover: (id) => (id === 'blank' ? null : templates.find((t) => t.id === id)?.cover) });
const featured = templates.filter((t) => !['blank', 'tutorial'].includes(t.id)).slice(0, 6);
const cells = [{ id: 'blank' }, { id: 'tutorial' }, ...featured.map((t) => ({ id: t.id }))];
let starter = 'blank';
const track = mountTrack({
  track: hz.querySelector('.hz-track'),
  tips: hz.querySelector('.hz-tips'),
  dot: hz.querySelector('.hz-dot'),
  cells,
  selected: starter,
  labelOf: (id) => (id === 'blank' ? T('Blank', '空白') : id === 'tutorial' ? T('Tutorial', '新手教程') : nameOf(templates.find((t) => t.id === id))),
  onSelect: (id) => {
    starter = id;
    turntable.show(id);
    $('selectedStarterName').textContent = track.current === 'blank' ? T('Blank', '空白') : nameOf(templates.find((t) => t.id === id));
    $('selectedStarterName').dataset.tpl = id;
  },
  onEnter: (id) => startCreate(id, $('worldPrompt').value.trim()),
});
const allProjectsBtn = hz.querySelector('.hz-label.l'), allTemplatesBtn = hz.querySelector('.hz-label.r');
const placeLabels = () => {
  const y = hz.clientHeight * 0.5 + 118;
  allProjectsBtn.style.top = allTemplatesBtn.style.top = `${y}px`;
};
placeLabels();
addEventListener('resize', placeLabels);
allProjectsBtn.querySelector('.n').textContent = projects.length;
allTemplatesBtn.querySelector('.n').textContent = templates.length;
allProjectsBtn.hidden = projects.length === 0;
allProjectsBtn.onclick = () => openAll('projects');
allTemplatesBtn.onclick = () => openAll('templates');
$('selectedStarter').onclick = () => openAll('templates');

// ---- composer
const prompt = $('worldPrompt');
const line = prompt.closest('.hz-line');
const mirror = line.querySelector('.hz-mirror');
const grow = () => {
  prompt.style.height = 'auto';
  prompt.style.height = `${prompt.scrollHeight}px`;
  line.classList.toggle('typing', prompt.value.length > 0);
};
prompt.addEventListener('input', grow);
onLang(() => (mirror.textContent = T('Describe a world you’d like to build…', '说说你想搭什么样的世界')));
mirror.textContent = T('Describe a world you’d like to build…', '说说你想搭什么样的世界');
grow();
prompt.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    $('createForm').requestSubmit();
  }
});
$('attachReference').onclick = () => $('referenceInput').click();
$('referenceInput').onchange = () => {
  const box = $('referenceImages');
  box.hidden = false;
  for (const f of $('referenceInput').files) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(f);
    box.append(img);
  }
};
const mic = hz.querySelector('.hz-mic');
let micTimer = 0;
mic.onclick = () => {
  const rec = mic.classList.toggle('rec');
  clearInterval(micTimer);
  if (!rec) return;
  const bars = mic.querySelectorAll('.hz-wave i');
  micTimer = setInterval(() => bars.forEach((b) => (b.style.transform = `scaleY(${(0.17 + Math.random() * 0.8).toFixed(2)})`)), 90);
  toast(T('Voice capture is not wired in this replica; type instead.', '复刻版没有接语音识别，先用打字。'));
  setTimeout(() => {
    mic.classList.remove('rec');
    clearInterval(micTimer);
  }, 3000);
};
$('createForm').onsubmit = (e) => {
  e.preventDefault();
  startCreate(starter, prompt.value.trim());
};

// Name → create → open. The name defaults to the prompt's first clause or the starter's name.
let pendingCreate = null;
function startCreate(starterId, text) {
  const t = templates.find((x) => x.id === starterId);
  const guess = text ? text.split(/[，。,.!\n]/)[0].slice(0, 24) : starterId === 'blank' ? '' : nameOf(t);
  $('projectName').value = guess;
  $('projectName').placeholder = T('Untitled world', '未命名世界');
  $('nameError').hidden = true;
  pendingCreate = { starter: starterId, prompt: text };
  $('nameDialog').showModal();
  $('projectName').select();
}
$('nameCancel').onclick = () => $('nameDialog').close();
$('nameForm').onsubmit = async (e) => {
  e.preventDefault();
  if (!pendingCreate) return;
  $('nameSubmit').disabled = true;
  try {
    const { project } = await api('/api/projects', { method: 'POST', body: JSON.stringify({ name: $('projectName').value.trim() || T('Untitled world', '未命名世界'), ...pendingCreate }) });
    location.assign(`/p/${project.id}`);
  } catch (err) {
    $('nameError').textContent = err.message;
    $('nameError').hidden = false;
    $('nameSubmit').disabled = false;
  }
};

// ---- overlays: all templates / all projects
const all = $('allView');
let allMode = 'templates', filter = 'all', query = '', view = 'grid';
const FILTERS = [
  ['all', 'All', '全部', () => true],
  ['cities', 'Cities', '城市', (t) => t.category === 'Cities'],
  ['stories', 'Stories', '故事', (t) => t.category === 'Stories'],
  ['interiors', 'Interiors', '室内', (t) => t.category === 'Interiors'],
  ['nature', 'Nature', '自然', (t) => t.category === 'Nature' || t.category === 'Landscapes'],
  ['film', 'Film sets', '影视片场', (t) => t.category === 'Film' || t.facets?.use?.includes('film')],
  ['mine', 'Mine', '我的', () => false],
];
function openAll(mode) {
  allMode = mode;
  filter = 'all';
  query = '';
  $('allSearch').value = '';
  all.hidden = false;
  document.documentElement.classList.add('hz-all-open');
  history.replaceState(null, '', `#${mode}`);
  renderAll();
}
const closeAll = () => {
  all.hidden = true;
  document.documentElement.classList.remove('hz-all-open');
  history.replaceState(null, '', '/');
};
$('allBack').onclick = closeAll;
document.addEventListener('keydown', (e) => e.key === 'Escape' && !all.hidden && closeAll());
$('allSearch').oninput = () => {
  query = $('allSearch').value.trim().toLowerCase();
  if (allMode === 'assets') return searchCatalog(query);
  renderAll();
};
$('listView').onclick = () => setView('list');
$('gridView').onclick = () => setView('grid');
function setView(v) {
  view = v;
  $('listView').classList.toggle('active', v === 'list');
  $('gridView').classList.toggle('active', v === 'grid');
  $('listView').setAttribute('aria-pressed', String(v === 'list'));
  $('gridView').setAttribute('aria-pressed', String(v === 'grid'));
  $('allItems').className = `hz-all-items ${v}`;
}
let importedAssets = [];
let catalogHits = null;
async function renderAssets() {
  const items = $('allItems');
  $('allTitle').textContent = T('Assets', '素材');
  $('allSearch').placeholder = T('Search SimReady (e.g. bench, cart, lamp)', '搜索 SimReady（如 bench、cart、lamp）');
  $('allFilters').hidden = true;
  importedAssets = (await api('/api/assets').catch(() => ({ assets: [] }))).assets;
  $('allCount').textContent = importedAssets.length;
  items.className = 'hz-all-items grid';
  items.replaceChildren();
  $('allEmpty').hidden = true;
  const head = document.createElement('li');
  head.className = 'hz-all-sec-head';
  head.innerHTML = `<h3>${T('Imported', '已导入')}</h3><p>${T('NVIDIA SimReady assets (CC-BY-4.0), converted to white-model GLB. Geometry only; textures are not downloaded.', 'NVIDIA SimReady 资产（CC-BY-4.0），已转成白模 GLB。只取几何，不下载贴图。')}</p>`;
  items.append(head);
  for (const a of importedAssets) {
    const li = document.createElement('li');
    li.innerHTML = `<div class="hz-all-card asset"><span class="th"><img alt=""></span><span class="nm"><span></span></span><span class="ds"></span><span class="meta"></span></div>`;
    li.querySelector('img').src = a.thumb || '';
    li.querySelector('.nm span').textContent = a.name;
    li.querySelector('.ds').textContent = `${a.id} · ${a.meta?.triangles ? `${a.meta.triangles} tris` : ''}`;
    li.querySelector('.meta').textContent = a.license;
    items.append(li);
  }
  if (!importedAssets.length) {
    const li = document.createElement('li');
    li.className = 'hz-all-note';
    li.textContent = T('Nothing imported yet. Search the catalog below and import one.', '还没有导入。在下面搜索目录并导入一个。');
    items.append(li);
  }
  const cat = document.createElement('li');
  cat.className = 'hz-all-sec-head';
  cat.innerHTML = `<h3>${T('SimReady catalog', 'SimReady 目录')}</h3><p id="catalogNote">${T('Type in the search box to look up the 2,575 assets on Hugging Face.', '在搜索框里输入关键词，查找 Hugging Face 上的 2,575 个资产。')}</p>`;
  items.append(cat);
  if (catalogHits) {
    for (const id of catalogHits.ids.slice(0, 40)) {
      const li = document.createElement('li');
      const done = importedAssets.some((a) => a.id === id);
      li.innerHTML = `<div class="hz-all-card asset cat"><span class="nm"><span></span></span><span class="ds"></span><span class="acts"><button type="button" data-import="${id}">${done ? T('Imported', '已导入') : T('Import', '导入')}</button></span></div>`;
      li.querySelector('.nm span').textContent = id.replace(/_[a-z]\d{2}$/i, '').replace(/_/g, ' ');
      li.querySelector('.ds').textContent = id;
      const b = li.querySelector('button');
      b.disabled = done;
      b.onclick = () => importAsset(id, b);
      items.append(li);
    }
    $('catalogNote').textContent = `${catalogHits.ids.length} / ${catalogHits.total} · ${catalogHits.license}`;
  }
}
async function importAsset(id, btn) {
  btn.disabled = true;
  btn.textContent = T('Importing…', '导入中…');
  const r = await api('/api/assets/import', { method: 'POST', body: JSON.stringify({ id }) });
  if (!r.job) {
    btn.textContent = r.error || 'failed';
    return;
  }
  const poll = async () => {
    const { job } = await api(`/api/assets/jobs/${id}`);
    btn.textContent = job.log.at(-1) || job.status;
    if (job.status === 'running') return setTimeout(poll, 1500);
    toast(job.status === 'done' ? T(`Imported ${id} (${job.meta.triangles} triangles)`, `已导入 ${id}（${job.meta.triangles} 个三角面）`) : `${id}: ${job.error}`);
    renderAssets();
  };
  setTimeout(poll, 1200);
}
let catalogTimer;
function searchCatalog(q) {
  clearTimeout(catalogTimer);
  if (!q) {
    catalogHits = null;
    return renderAssets();
  }
  catalogTimer = setTimeout(async () => {
    catalogHits = await api(`/api/simready/catalog?q=${encodeURIComponent(q)}`).catch(() => ({ ids: [], total: 0, license: '' }));
    renderAssets();
  }, 350);
}
function renderAll() {
  if (allMode === 'assets') return renderAssets();
  const isT = allMode === 'templates';
  $('allFilters').hidden = !isT;
  $('allTitle').textContent = isT ? T('All templates', '全部模板') : T('All projects', '全部项目');
  $('allSearch').placeholder = isT ? T('Search templates', '搜索模板') : T('Search your projects', '搜索项目');
  const filters = $('allFilters');
  filters.replaceChildren(
    ...FILTERS.map(([id, en, zhName, fn]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.filter = id;
      b.setAttribute('aria-pressed', String(filter === id));
      const n = id === 'all' ? '' : (isT ? templates : []).filter(fn).length || '';
      b.innerHTML = `${T(en, zhName)}<span class="n">${n}</span>`;
      b.onclick = () => {
        filter = id;
        renderAll();
      };
      return b;
    }),
  );
  filters.hidden = !isT;
  const items = $('allItems');
  items.replaceChildren();
  const fn = FILTERS.find((f) => f[0] === filter)[3];
  const list = isT
    ? templates.filter((t) => fn(t) && (!query || [t.id, t.name, t.name_zh, t.desc, t.desc_zh].join(' ').toLowerCase().includes(query)))
    : projects.filter((p) => !query || p.name.toLowerCase().includes(query));
  $('allCount').textContent = list.length;
  $('allEmpty').hidden = list.length > 0;
  $('allEmpty').textContent = isT ? T('No templates found. Try a place or landscape.', '没找到模板，换个地名或地貌试试。') : T('No projects yet. Create one from the home page.', '还没有项目，回首页建一个。');
  for (const it of list) {
    const li = document.createElement('li');
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `hz-all-card${isT ? '' : ' project'}`;
    if (isT) {
      card.innerHTML = `<span class="th"><img alt="" loading="lazy"></span><span class="nm"><span></span></span><span class="ds"></span>`;
      card.querySelector('img').src = it.cover;
      card.querySelector('.nm span').textContent = nameOf(it);
      card.querySelector('.ds').textContent = descOf(it);
      card.onclick = () => openPreview(it);
    } else {
      card.innerHTML = `<span class="th"><img alt=""></span><span class="nm"><span></span></span><span class="meta"></span><span class="acts"><button type="button" data-act="rename"></button><button type="button" data-act="delete"></button></span>`;
      card.querySelector('img').src = templates.find((t) => t.id === it.starter)?.cover || '';
      card.querySelector('.nm span').textContent = it.name;
      card.querySelector('.meta').textContent = new Date(it.updatedAt).toLocaleString(lang() === 'zh' ? 'zh-CN' : lang());
      card.querySelector('[data-act=rename]').textContent = T('Rename', '重命名');
      card.querySelector('[data-act=delete]').textContent = T('Delete', '删除');
      card.onclick = (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'rename') return renameProject(it);
        if (act === 'delete') return deleteProject(it);
        location.assign(`/p/${it.id}`);
      };
    }
    li.append(card);
    items.append(li);
  }
}
async function renameProject(p) {
  const name = window.prompt(T('Rename project', '重命名项目'), p.name);
  if (name == null || !name.trim()) return;
  const { project } = await api(`/api/projects/${p.id}`, { method: 'PATCH', body: JSON.stringify({ name: name.trim() }) });
  Object.assign(p, project);
  renderAll();
}
async function deleteProject(p) {
  if (!confirm(T(`Delete “${p.name}”? This cannot be undone.`, `删除「${p.name}」？此操作不可撤销。`))) return;
  await api(`/api/projects/${p.id}`, { method: 'DELETE' });
  projects = projects.filter((x) => x.id !== p.id);
  allProjectsBtn.querySelector('.n').textContent = projects.length;
  allProjectsBtn.hidden = projects.length === 0;
  renderAll();
}

// ---- preview dialog
let previewIdx = 0;
function openPreview(t) {
  previewIdx = templates.indexOf(t);
  paintPreview();
  $('previewDialog').showModal();
}
function paintPreview() {
  const t = templates[previewIdx];
  $('pvImage').src = t.cover;
  $('pvKicker').textContent = t.category;
  $('previewTitle').textContent = nameOf(t);
  $('pvDesc').textContent = descOf(t);
  $('pvFacts').textContent = t.dims ? `${t.dims[0]} × ${t.dims[1]} m` : '';
  $('pvSelect').textContent = T('Select', '选用');
  $('pvEnter').firstChild.textContent = T('Enter', '进入');
}
$('pvPrev').onclick = () => {
  previewIdx = (previewIdx + templates.length - 1) % templates.length;
  paintPreview();
};
$('pvNext').onclick = () => {
  previewIdx = (previewIdx + 1) % templates.length;
  paintPreview();
};
$('pvClose').onclick = () => $('previewDialog').close();
$('pvSelect').onclick = () => {
  const t = templates[previewIdx];
  $('previewDialog').close();
  closeAll();
  if (cells.some((c) => c.id === t.id)) track.select(t.id, true);
  else {
    starter = t.id;
    turntable.show(t.id);
    $('selectedStarterName').textContent = nameOf(t);
  }
};
$('pvEnter').onclick = () => {
  $('previewDialog').close();
  startCreate(templates[previewIdx].id, '');
};

// deep links: #templates / #projects / #tutorial
if (location.hash === '#templates') openAll('templates');
else if (location.hash === '#projects') openAll('projects');
else if (location.hash === '#assets') openAll('assets');
else if (location.hash === '#tutorial') startCreate('tutorial', '');
else if (location.hash === '#new') startCreate('blank', '');
document.documentElement.dataset.homeReady = '';
