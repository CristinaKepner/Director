// Workspace entry for /p/<id>. The signed-in surface is rebuilt in a later step; this shell
// resolves the project and shows where it will mount.
import { T, mountLanguage } from './i18n.js';
mountLanguage();
const id = location.pathname.split('/')[2];
const root = document.getElementById('workspace');
fetch(`/api/projects/${id}`)
  .then(async (r) => {
    if (r.status === 401) return location.replace(`/login?next=${encodeURIComponent(location.pathname)}`);
    if (!r.ok) throw new Error('PROJECT_NOT_FOUND');
    const { project } = await r.json();
    root.innerHTML = `<div><h1></h1><p>${T('Preparing your 3D canvas…', '正在准备 3D 画布…')}</p><a href="/">${T('Back to projects', '返回项目')}</a></div>`;
    root.querySelector('h1').textContent = project.name;
    document.title = `${project.name} — Cinemap`;
  })
  .catch(() => {
    root.innerHTML = `<div><h1>${T('This project does not exist or was removed.', '项目不存在或已删除。')}</h1><a href="/">${T('Back to projects', '返回项目')}</a></div>`;
  });
