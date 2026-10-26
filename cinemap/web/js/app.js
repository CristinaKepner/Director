// Workspace shell for /p/<id>: resolves the project, mounts the studio frame (assistant panel +
// editor) and keeps the project pill (title, save state) and the account menu in sync.
import { T, lang, mountLanguage } from './i18n.js';
mountLanguage();
const $ = (id) => document.getElementById(id);
const id = location.pathname.split('/')[2];
const api = async (url, init) => {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (r.status === 401) {
    location.replace(`/login?next=${encodeURIComponent(location.pathname)}`);
    throw new Error('signed out');
  }
  if (!r.ok) throw Object.assign(new Error((await r.json().catch(() => ({}))).error || r.statusText), { status: r.status });
  return r.json();
};
let toastTimer;
const toast = (msg) => {
  $('toast').textContent = msg;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('toast').hidden = true), 5000);
};
$('cancelLoad').onclick = () => location.assign('/');
$('projectHome').onclick = () => location.assign('/#projects');

let project;
try {
  [{ project }] = await Promise.all([api(`/api/projects/${id}`), (async () => {
    const me = await api('/api/session');
    for (const img of document.querySelectorAll('.avatar img')) (me.picture ? (img.src = me.picture) : img.remove());
    for (const el of document.querySelectorAll('.avatar')) if (!me.picture) el.prepend((me.name || '?').slice(0, 1).toUpperCase());
    $('accountName').textContent = me.name;
    $('accountEmail').textContent = me.email;
  })()]);
} catch (err) {
  $('loadingTitle').textContent = T('This project does not exist or was removed.', '项目不存在或已删除。');
  $('loadingDetail').textContent = '';
  throw err;
}
document.title = `${project.name} — Cinemap`;
$('projectTitle').textContent = project.name;
$('saveStatus').textContent = T('All changes saved', '已全部保存');

const studio = $('studio');
studio.src = `/agent.html?project=${encodeURIComponent(id)}&lang=${lang()}${project.starter === 'tutorial' ? '&tutorial=1' : ''}`;
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data || typeof e.data.type !== 'string') return;
  const d = e.data;
  if (d.type === 'cm:ready') $('loading').hidden = true;
  else if (d.type === 'cm:save') {
    $('saveStatus').textContent = d.state === 'saving' ? T('Saving…', '正在保存…') : d.state === 'error' ? T('Not saved', '未保存') : T('All changes saved', '已全部保存');
  } else if (d.type === 'cm:toast') toast(d.text);
  else if (d.type === 'cm:activity') {
    project.activity = [...(project.activity || []), { at: Date.now(), text: d.text }].slice(-500);
    api(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ activity: project.activity }) }).catch(() => {});
  }
});
setTimeout(() => {
  if (!$('loading').hidden) $('loadingDetail').textContent = T('Still preparing — the first open compiles the world.', '还在准备，第一次打开要先生成世界。');
}, 6000);

async function rename() {
  const name = window.prompt(T('Rename project', '重命名项目'), project.name);
  if (name == null || !name.trim()) return;
  ({ project } = await api(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ name: name.trim() }) }));
  $('projectTitle').textContent = project.name;
  document.title = `${project.name} — Cinemap`;
}
$('projectTitle').onclick = rename;

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
menu.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-menu]');
  if (!b) return;
  toggleMenu(false);
  switch (b.dataset.menu) {
    case 'projects': return location.assign('/#projects');
    case 'new': return location.assign('/');
    case 'rename': return rename();
    case 'copy': {
      const { project: copy } = await api('/api/projects', { method: 'POST', body: JSON.stringify({ name: `${project.name} ${T('copy', '副本')}`, starter: project.starter, prompt: project.prompt }) });
      await api(`/api/projects/${copy.id}`, { method: 'PATCH', body: JSON.stringify({ world: project.world, conversation: project.conversation }) });
      return location.assign(`/p/${copy.id}`);
    }
    case 'activity': {
      const list = $('activityList');
      list.replaceChildren(...(project.activity || []).slice(-50).reverse().map((a) => {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = '<time></time><span></span>';
        row.querySelector('time').textContent = new Date(a.at).toLocaleTimeString();
        row.querySelector('span').textContent = a.text;
        return row;
      }));
      if (!list.children.length) list.textContent = T('Nothing yet.', '还没有记录。');
      return $('activityDialog').showModal();
    }
    case 'logout': {
      await api('/api/logout', { method: 'POST' });
      return location.assign('/login');
    }
  }
});
$('activityClose').onclick = () => $('activityDialog').close();
