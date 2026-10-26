// Project overview: list the signed-in user's worlds, create a new one, open or sign out.
import { T, mountLanguage } from './i18n.js';
mountLanguage();
const root = document.getElementById('home');
const api = async (url, init) => {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (r.status === 401) {
    location.replace('/login');
    throw new Error('signed out');
  }
  return r.json();
};
async function render() {
  const [{ projects }, me] = await Promise.all([api('/api/projects'), api('/api/session')]);
  root.replaceChildren();
  const head = document.createElement('div');
  head.className = 'home-head';
  head.innerHTML = `<span class="brand">cinemap</span><span><span class="muted">${me.name}</span> <button class="pill" id="signOut">${T('Sign out', '退出登录')}</button></span>`;
  const grid = document.createElement('div');
  grid.className = 'home-grid';
  const add = document.createElement('button');
  add.className = 'new';
  add.textContent = T('New project', '新建项目');
  add.onclick = async () => {
    const name = prompt(T('Name your world', '给世界起个名字'), T('Untitled world', '未命名世界'));
    if (name === null) return;
    const { project } = await api('/api/projects', { method: 'POST', body: JSON.stringify({ name }) });
    location.assign(`/p/${project.id}`);
  };
  grid.append(add);
  for (const p of projects) {
    const a = document.createElement('a');
    a.className = 'card';
    a.href = `/p/${p.id}`;
    a.innerHTML = `<strong></strong><small></small>`;
    a.querySelector('strong').textContent = p.name;
    a.querySelector('small').textContent = new Date(p.updatedAt).toLocaleString();
    grid.append(a);
  }
  root.append(head, grid);
  document.getElementById('signOut').onclick = async () => {
    await api('/api/logout', { method: 'POST' });
    location.assign('/login');
  };
}
render().catch(console.error);
