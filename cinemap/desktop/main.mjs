// Cinemap — macOS client. The app owns the backend: it starts cinemap/server.mjs on a free
// loopback port with Electron's own Node (ELECTRON_RUN_AS_NODE), signs the window in through a
// one-time loopback token (no TapNow in the desktop build), and keeps keys in the app's own
// support directory. The server, harness and web client are the same files the browser uses.
import { app, BrowserWindow, Menu, dialog, shell, ipcMain } from 'electron';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = app.isPackaged ? path.join(process.resourcesPath, 'app-src', 'cinemap') : path.join(here, '..');
const USER = app.getPath('userData');
const PREFS_FILE = path.join(USER, 'prefs.json');
const KEYS_DIR = path.join(USER, 'keys');
const LOG_FILE = path.join(USER, 'backend.log');
const KEY_FILES = { mosshub: path.join(KEYS_DIR, 'mosshub.key'), ark: path.join(KEYS_DIR, 'ark.key'), llm: path.join(KEYS_DIR, 'aigw.key') };
const prefs = (() => {
  try {
    return JSON.parse(fs.readFileSync(PREFS_FILE, 'utf8'));
  } catch {
    return {};
  }
})();
const savePrefs = () => {
  fs.mkdirSync(USER, { recursive: true });
  fs.writeFileSync(PREFS_FILE, JSON.stringify(prefs, null, 2));
};
const dataDir = () => prefs.dataDir || path.join(USER, 'data');
const backendLog = [];
let server = null, win = null, prefsWin = null, quitting = false;

const freePort = (preferred) =>
  new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(freePort(0)));
    s.listen(preferred || 0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
const readKey = (file) => {
  try {
    return fs.readFileSync(file, 'utf8').trim() || null;
  } catch {
    return null;
  }
};
// home-directory key files are a convenience for developers; the app's own keys dir wins
const keyFor = (name) => readKey(KEY_FILES[name]) || readKey(path.join(os.homedir(), { mosshub: '.mosshub-key', ark: '.ark-key', llm: '.aigw-key' }[name]));
const writeKey = (name, value) => {
  fs.mkdirSync(KEYS_DIR, { recursive: true, mode: 0o700 });
  if (value) fs.writeFileSync(KEY_FILES[name], String(value).trim(), { mode: 0o600 });
  else if (fs.existsSync(KEY_FILES[name])) fs.rmSync(KEY_FILES[name]);
};

function keyArgs() {
  const out = [];
  for (const name of ['mosshub', 'ark', 'llm']) {
    const file = fs.existsSync(KEY_FILES[name]) ? KEY_FILES[name] : path.join(os.homedir(), { mosshub: '.mosshub-key', ark: '.ark-key', llm: '.aigw-key' }[name]);
    if (fs.existsSync(file)) out.push({ mosshub: '--mosshub-key-file', ark: '--ark-key-file', llm: '--llm-key-file' }[name], file);
  }
  if (prefs.mosshubBase) out.push('--mosshub-base', prefs.mosshubBase);
  if (prefs.llmModel) out.push('--llm-model', prefs.llmModel);
  return out;
}
const tap = (buf) => {
  const s = buf.toString();
  backendLog.push(s);
  if (backendLog.length > 400) backendLog.shift();
  try {
    fs.appendFileSync(LOG_FILE, s);
  } catch {
    /* log dir missing */
  }
};
async function startBackend() {
  const port = await freePort(prefs.port);
  if (prefs.port !== port) {
    prefs.port = port;
    savePrefs();
  }
  const entry = path.join(ROOT, 'server.mjs');
  if (!fs.existsSync(entry)) throw new Error(`找不到后端入口：${entry}`);
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.mkdirSync(USER, { recursive: true });
  const token = crypto.randomBytes(24).toString('base64url');
  // the token travels in the environment, not argv, so it never shows in the process list
  const args = [entry, '--port', String(port), '--data', dataDir(), ...keyArgs()];
  const child = spawn(process.execPath, args, { cwd: ROOT, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_ENV: 'production', CINEMAP_DATA: dataDir(), CINEMAP_DESKTOP_TOKEN: token }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', tap);
  child.stderr.on('data', tap);
  child.on('error', (err) => tap(`backend spawn error: ${err.message}\n`));
  child.on('exit', (code, signal) => {
    if (quitting) return;
    dialog.showErrorBox('后端已退出', `Cinemap 后端进程退出（code ${code}${signal ? `, ${signal}` : ''}）。\n\n最近日志：\n${backendLog.slice(-12).join('')}\n\n完整日志：${LOG_FILE}`);
    app.quit();
  });
  const url = `http://127.0.0.1:${port}`;
  await waitForHealth(`${url}/api/health`, 20000);
  server = { child, port, url, token };
  return server;
}
async function waitForHealth(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(1200) });
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) throw new Error(`后端在 ${timeoutMs / 1000}s 内没有就绪：${url}\n${backendLog.slice(-8).join('')}`);
    await new Promise((r) => setTimeout(r, 150));
  }
}
async function stopBackend() {
  if (!server?.child || server.child.killed) return;
  const child = server.child;
  const dead = new Promise((r) => child.once('exit', r));
  quitting = true;
  child.kill('SIGTERM');
  await Promise.race([dead, new Promise((r) => setTimeout(r, 3000))]);
  quitting = false;
  server = null;
}
async function restartBackend() {
  await stopBackend();
  await startBackend();
  if (win && !win.isDestroyed()) await win.loadURL(entryUrl('/'));
  buildMenu();
}
const entryUrl = (next) => `${server.url}/desktop/session?token=${server.token}&next=${encodeURIComponent(next)}`;
const go = (next) => win && !win.isDestroyed() && win.loadURL(entryUrl(next));

function createWindow() {
  const b = prefs.bounds || {};
  win = new BrowserWindow({
    width: b.width || 1440,
    height: b.height || 900,
    x: b.x,
    y: b.y,
    minWidth: 960,
    minHeight: 640,
    title: 'Cinemap',
    backgroundColor: '#f7f8f6',
    webPreferences: { preload: path.join(here, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.loadURL(entryUrl('/'));
  // anything off the local server opens in the user's browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(server.url)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });
  const remember = () => {
    if (win && !win.isDestroyed() && !win.isMinimized()) {
      prefs.bounds = win.getBounds();
      savePrefs();
    }
  };
  win.on('resize', remember);
  win.on('move', remember);
  win.on('closed', () => (win = null));
}

function openPrefs() {
  if (prefsWin && !prefsWin.isDestroyed()) return prefsWin.focus();
  prefsWin = new BrowserWindow({ width: 560, height: 720, resizable: false, minimizable: false, title: '偏好设置', parent: win || undefined, backgroundColor: '#f7f8f6', webPreferences: { preload: path.join(here, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  prefsWin.setMenuBarVisibility(false);
  prefsWin.loadFile(path.join(here, 'prefs.html'));
  prefsWin.on('closed', () => (prefsWin = null));
}
const shown = (k) => (k ? `${k.slice(0, 7)}…${k.slice(-4)}` : '');
ipcMain.handle('prefs:load', async () => {
  let models = [];
  try {
    const h = await fetch(`${server.url}/api/health`, { signal: AbortSignal.timeout(2000) }).then((r) => r.json());
    models = h.llm?.models || [];
  } catch {
    /* backend not up */
  }
  const moss = keyFor('mosshub'), ark = keyFor('ark'), llm = keyFor('llm');
  return { keysDir: KEYS_DIR, dataDir: dataDir(), hasMosshub: !!moss, mosshub: shown(moss), hasArk: !!ark, ark: shown(ark), hasLlm: !!llm, llm: shown(llm), mosshubBase: prefs.mosshubBase || '', llmModel: prefs.llmModel || '', models };
});
ipcMain.handle('prefs:pick-data-dir', async () => {
  const r = await dialog.showOpenDialog(prefsWin || win, { properties: ['openDirectory', 'createDirectory'], defaultPath: dataDir() });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('prefs:save', async (_e, data) => {
  if (data.clear) {
    for (const name of ['mosshub', 'ark', 'llm']) writeKey(name, '');
  } else {
    for (const name of ['mosshub', 'ark', 'llm']) if (data[name] && data[name].trim()) writeKey(name, data[name]);
  }
  prefs.mosshubBase = data.mosshubBase || '';
  prefs.llmModel = data.llmModel || '';
  if (data.dataDir && data.dataDir !== dataDir()) prefs.dataDir = data.dataDir;
  savePrefs();
  await restartBackend();
  prefsWin?.close();
  return { ok: true };
});
ipcMain.handle('prefs:close', () => prefsWin?.close());
ipcMain.handle('desktop:info', () => ({ version: app.getVersion(), dataDir: dataDir(), port: server?.port }));

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ label: 'Cinemap', submenu: [{ label: '关于 Cinemap', click: () => dialog.showMessageBox(win, { message: 'Cinemap', detail: `客户端复刻 ${app.getVersion()}\n后端端口 ${server?.port}\n数据目录 ${dataDir()}` }) }, { type: 'separator' }, { label: '偏好设置…', accelerator: 'Cmd+,', click: openPrefs }, { type: 'separator' }, { role: 'services' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit', label: '退出 Cinemap' }] }] : []),
    { label: '项目', submenu: [{ label: '首页', accelerator: 'CmdOrCtrl+1', click: () => go('/') }, { label: '新建项目…', accelerator: 'CmdOrCtrl+N', click: () => go('/#new') }, { label: '全部项目', accelerator: 'CmdOrCtrl+O', click: () => go('/#projects') }, { type: 'separator' }, { label: '模板库', click: () => go('/#templates') }, { label: '素材库', click: () => go('/#assets') }, { label: '新手教程', click: () => go('/#tutorial') }] },
    { label: '编辑', submenu: [{ role: 'undo', label: '撤销' }, { role: 'redo', label: '重做' }, { type: 'separator' }, { role: 'cut', label: '剪切' }, { role: 'copy', label: '拷贝' }, { role: 'paste', label: '粘贴' }, { role: 'selectAll', label: '全选' }] },
    { label: '视图', submenu: [{ role: 'reload', label: '重新载入' }, { role: 'forceReload', label: '强制重新载入' }, { role: 'toggleDevTools', label: '开发者工具' }, { type: 'separator' }, { role: 'resetZoom', label: '实际大小' }, { role: 'zoomIn', label: '放大' }, { role: 'zoomOut', label: '缩小' }, { type: 'separator' }, { role: 'togglefullscreen', label: '全屏' }] },
    { role: 'window', label: '窗口', submenu: [{ role: 'minimize', label: '最小化' }, { role: 'zoom', label: '缩放' }, ...(isMac ? [{ type: 'separator' }, { role: 'front', label: '前置全部窗口' }] : [{ role: 'close', label: '关闭' }])] },
    { role: 'help', label: '帮助', submenu: [{ label: 'Harness 文档', click: () => shell.openPath(path.join(ROOT, 'docs', 'harness.md')) }, { label: '工程拆解', click: () => shell.openPath(path.join(ROOT, 'docs', 'teardown.md')) }, { type: 'separator' }, { label: '打开数据目录', click: () => shell.openPath(dataDir()) }, { label: '查看后端日志', click: () => shell.openPath(LOG_FILE) }, { label: '在浏览器中打开', click: () => server && shell.openExternal(entryUrl('/')) }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  try {
    await startBackend();
  } catch (err) {
    dialog.showErrorBox('Cinemap 启动失败', String(err.message));
    app.quit();
    return;
  }
  buildMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => {
  quitting = true;
  server?.child?.kill('SIGTERM');
});
