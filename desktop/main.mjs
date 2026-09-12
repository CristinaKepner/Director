// Director Console — macOS client.
// The app owns the backend: it starts server/bin/director-server.mjs on a free loopback port with
// Electron's own Node (ELECTRON_RUN_AS_NODE), waits for /api/health, then loads web/ in a window
// whose title bar is the console's own top bar (titleBarStyle: hiddenInset).
// Nothing about core/ or server/ changes — this is the same runtime the browser and the CLI talk to.
import { app, BrowserWindow, Menu, dialog, shell, ipcMain, nativeTheme, clipboard, Notification } from "electron";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createUpdater, DEFAULT_FEED } from "./update.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
// packaged: extraResources puts core/ server/ web/ under Contents/Resources/app-src
const ROOT = app.isPackaged ? path.join(process.resourcesPath, "app-src") : path.join(here, "..");
const USER = app.getPath("userData");

// 数据分两处放，因为它们的寿命、体积和「该不该被用户看见」都不一样：
//
//   ~/Movies/导演台/            创作数据 —— 用户要能找到、能备份、能拷走。默认跟随 macOS 影音惯例
//     Projects/                 工程库（.director.json）
//       _autosave/              切换工程前的自动快照
//     Media/                    Take 代理视频、生成结果、成片（体积最大，一条 60s 片子约 40 MB）
//     current.director.json     当前工程，崩溃或重启后从这里恢复
//
//   ~/Library/Application Support/导演台/   应用状态 —— 不该给用户翻，也不该被 iCloud 同步
//     keys/ prefs.json backend.log
//
// 密钥绝不进创作数据目录：那个目录用户可能放进 iCloud Drive 或者直接发给同事。
const prefs0 = (() => { try { return JSON.parse(fs.readFileSync(path.join(USER, "prefs.json"), "utf8")); } catch { return {}; } })();
const DATA_DIR = prefs0.dataDir || path.join(os.homedir(), "Movies", "导演台");
const PROJECTS_DIR = path.join(DATA_DIR, "Projects");
const AUTOSAVE_DIR = path.join(PROJECTS_DIR, "_autosave");
const MEDIA_DIR = path.join(DATA_DIR, "Media");
const PROJECT_FILE = path.join(DATA_DIR, "current.director.json");
const LOG_FILE = path.join(USER, "backend.log");
const PREFS_FILE = path.join(USER, "prefs.json");
const KEYS_DIR = path.join(USER, "keys");
const ARK_KEY_FILE = path.join(KEYS_DIR, "ark.key");
const LLM_KEY_FILE = path.join(KEYS_DIR, "aigw.key");

// 0.5 之前所有东西都堆在 Application Support 里。首次启动把创作数据搬过去，只搬一次，
// 目标已存在就不动（不覆盖用户已有的东西）。
function migrateLegacyData() {
  const moves = [
    [path.join(USER, "project.json"), PROJECT_FILE],
    [path.join(USER, "projects"), PROJECTS_DIR],
    [path.join(USER, "media"), MEDIA_DIR],
  ];
  const done = [];
  for (const [from, to] of moves) {
    if (!fs.existsSync(from) || fs.existsSync(to)) continue;
    try {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.renameSync(from, to);
      done.push(path.basename(from));
    } catch (err) {
      process.stdout.write(`[migrate] ${from} → ${to} 失败：${err.message}\n`);
    }
  }
  if (done.length) process.stdout.write(`[migrate] 创作数据已迁到 ${DATA_DIR}（${done.join(", ")}）\n`);
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

let win = null;
let prefsWin = null;
let server = null; // { child, port, url }
let quitting = false;
let busy = null; // {label} while a film run is in flight
let updater = null;
const backendLog = [];

const prefs = prefs0;
const savePrefs = () => { try { fs.writeFileSync(PREFS_FILE, JSON.stringify(prefs, null, 2)); } catch {} };

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

// Credentials. Three sources, first hit wins: the Preferences window (userData/keys/*), a path the user
// pointed at in Preferences, or the same key files the CLI reads (~/.ark-key, ~/.aigw-key).
function keyArgs() {
  const out = [];
  const pick = (flag, managed, prefPath, ...home) => {
    const hit = [managed, prefPath, ...home.map((c) => path.join(os.homedir(), c))].filter(Boolean).find((p) => fs.existsSync(p) && fs.readFileSync(p, "utf8").trim());
    if (hit) out.push(flag, hit);
  };
  pick("--ark-key-file", ARK_KEY_FILE, prefs.arkKeyFile, ".ark-key");
  pick("--llm-key-file", LLM_KEY_FILE, prefs.llmKeyFile, ".aigw-key");
  if (prefs.llmModel) out.push("--llm-model", prefs.llmModel);
  // v2v 需要 Ark 能取到白模视频：开一条只读、只含 /media 的公网隧道（控制接口不出网）
  if (prefs.tunnel) out.push("--tunnel", "cloudflared");
  return out;
}

function keyState() {
  const read = (f) => { try { return fs.readFileSync(f, "utf8").trim(); } catch { return ""; } };
  const shown = (v) => (v ? `${v.slice(0, 8)}…${v.slice(-4)}` : "");
  const ark = read(ARK_KEY_FILE) || read(prefs.arkKeyFile || "") || read(path.join(os.homedir(), ".ark-key"));
  const llm = read(LLM_KEY_FILE) || read(prefs.llmKeyFile || "") || read(path.join(os.homedir(), ".aigw-key"));
  return { ark: shown(ark), llm: shown(llm), hasArk: !!ark, hasLlm: !!llm, llmModel: prefs.llmModel || "" };
}

function writeKey(file, value) {
  fs.mkdirSync(KEYS_DIR, { recursive: true, mode: 0o700 });
  if (value) fs.writeFileSync(file, String(value).trim(), { mode: 0o600 });
  else if (fs.existsSync(file)) fs.rmSync(file);
}

async function startBackend() {
  const port = await freePort();
  const entry = path.join(ROOT, "server", "bin", "director-server.mjs");
  if (!fs.existsSync(entry)) throw new Error(`找不到后端入口：${entry}`);
  fs.mkdirSync(MEDIA_DIR, { recursive: true });

  boot(`spawning backend: ${process.execPath} ${entry}`);
  const args = [entry, "--port", String(port), "--host", "127.0.0.1", "--project", PROJECT_FILE, "--media-dir", MEDIA_DIR, ...keyArgs()];
  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const tap = (buf) => {
    const s = buf.toString();
    backendLog.push(s);
    if (backendLog.length > 400) backendLog.shift();
    try { fs.appendFileSync(LOG_FILE, s); } catch {}
    process.stdout.write(`[backend] ${s}`);
  };
  child.stdout.on("data", tap);
  child.stderr.on("data", tap);
  child.on("error", (err) => boot(`backend spawn error: ${err.message}`));
  child.on("exit", (code, signal) => {
    if (quitting) return;
    dialog.showErrorBox("后端已退出", `Director 后端进程退出（code ${code}${signal ? `, ${signal}` : ""}）。\n\n最近日志：\n${backendLog.slice(-12).join("")}\n\n完整日志：${LOG_FILE}`);
    app.quit();
  });

  const url = `http://127.0.0.1:${port}`;
  await waitForHealth(`${url}/api/health`, 15000);
  server = { child, port, url };
  return server;
}

async function waitForHealth(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(1200) });
      if (r.ok) return;
    } catch {}
    if (Date.now() > deadline) throw new Error(`后端在 ${timeoutMs / 1000}s 内没有就绪：${url}\n${backendLog.slice(-8).join("")}`);
    await new Promise((r) => setTimeout(r, 150));
  }
}

// Restarting the backend is how new credentials take effect: the project file and media dir are the same,
// so the window only needs a reload once /api/health answers again.
async function restartBackend() {
  if (server?.child && !server.child.killed) {
    const child = server.child;
    const dead = new Promise((r) => child.once("exit", r));
    quitting = true;                 // suppress the "backend exited" alert for this intentional kill
    child.kill("SIGTERM");
    await Promise.race([dead, new Promise((r) => setTimeout(r, 3000))]);
    quitting = false;
  }
  server = null;
  await startBackend();
  if (win && !win.isDestroyed()) await win.loadURL(`${server.url}/web/`);
  buildMenu();
  return server;
}

async function backendHealth() {
  try {
    const r = await fetch(`${server.url}/api/health`, { signal: AbortSignal.timeout(3000) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

// Actions the menu runs without the page: read-only reports, file work.
async function api(pathname, body) {
  const r = await fetch(`${server.url}/api/${pathname}`, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  return r.json();
}

function createWindow() {
  const b = prefs.bounds || {};
  win = new BrowserWindow({
    width: b.width || 1480,
    height: b.height || 940,
    x: b.x,
    y: b.y,
    minWidth: 1100,
    minHeight: 680,
    show: false,
    backgroundColor: "#0b0c10",
    titleBarStyle: "hiddenInset",       // the console's top bar becomes the title bar
    trafficLightPosition: { x: 18, y: 18 },
    title: "导演台",
    webPreferences: {
      preload: path.join(here, "preload.cjs"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,      // keep Three.js + MediaRecorder running when the window is behind
      spellcheck: false,
    },
  });

  win.loadURL(`${server.url}/web/`);
  win.once("ready-to-show", () => win.show());
  win.on("focus", () => win.webContents.send("desktop:focus", true));
  win.on("blur", () => win.webContents.send("desktop:focus", false));
  const remember = () => { if (win && !win.isDestroyed() && !win.isMinimized()) { prefs.bounds = win.getBounds(); savePrefs(); } };
  win.on("resize", remember);
  win.on("move", remember);
  win.on("close", (e) => {
    if (!busy || quitting) return;
    e.preventDefault();
    dialog.showMessageBox(win, { type: "question", message: "正在跑片，确定要中断吗？", detail: busy.label, buttons: ["继续跑", "中断并关闭"], defaultId: 0, cancelId: 0 }).then((r) => {
      if (r.response === 1) { busy = null; win.close(); }
    });
  });
  win.on("closed", () => (win = null));

  // external links open in the default browser, not in a chrome-less Electron window
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(server.url)) { shell.openExternal(url); return { action: "deny" }; }
    return { action: "allow" };
  });

  // camera/mic are not used, but MediaRecorder capture of the canvas needs no permission — deny everything else
  win.webContents.session.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === "media" ? false : false));
}

const send = (cmd, payload) => win?.webContents.send("desktop:menu", { cmd, payload });

// What the project can currently do. The renderer pushes this on every meaningful change so menu items
// only light up once they mean something — 补充跟着行为出现，而不是一开始就摆满。
let st = { shots: 0, takes: 0, generated: 0, clips: 0, pendingAssets: 0, currentShotId: null };
ipcMain.on("desktop:state", (_e, next) => {
  const before = JSON.stringify(st);
  st = { ...st, ...next };
  if (JSON.stringify(st) !== before && win && !win.isDestroyed()) buildMenu();
});

function buildMenu() {
  const template = [
    {
      label: "导演台",
      submenu: [
        { label: "关于导演台", click: showAbout },
        { type: "separator" },
        { label: "检查更新…", click: () => updater?.check({ silent: false }) },
        { type: "separator" },
        { label: "偏好设置…", accelerator: "Cmd+,", click: openPrefs },
        { label: "生成密钥与规划模型…", click: openPrefs },
        { type: "separator" },
        { label: "服务", role: "services" },
        { type: "separator" },
        { label: "隐藏导演台", role: "hide" },
        { label: "隐藏其他", role: "hideOthers" },
        { label: "显示全部", role: "unhide" },
        { type: "separator" },
        { label: "退出导演台", role: "quit" },
      ],
    },
    {
      // 清空，再补充：静止只有「新建 / 打开 / 存」三件事 + 工程库，其余进「更多」。
      label: "工程",
      submenu: [
        { label: "新建空工程", accelerator: "Cmd+N", click: async () => { await backupCurrent("新建工程前"); send("new-project"); } },
        { label: "打开工程…", accelerator: "Cmd+O", click: openProject },
        { label: "存入工程库…", accelerator: "Shift+Cmd+S", click: saveToLibrary },
        { type: "separator" },
        {
          label: "工程库",
          submenu: (() => {
            const items = listProjects();
            if (!items.length) return [{ label: "还没存过工程", enabled: false }];
            return [
              ...items.slice(0, 12).map((p) => ({ label: p.name, click: () => loadProjectFile(p.file) })),
              { type: "separator" },
              {
                label: "自动备份",
                submenu: (() => {
                  const b = listAutosaves();
                  return b.length ? b.slice(0, 8).map((x) => ({ label: x.name, click: () => loadProjectFile(x.file) })) : [{ label: "还没有备份", enabled: false }];
                })(),
              },
              { label: "显示工程库文件夹", click: () => { fs.mkdirSync(PROJECTS_DIR, { recursive: true }); shell.openPath(PROJECTS_DIR); } },
            ];
          })(),
        },
        { type: "separator" },
        {
          label: "更多",
          submenu: [
            { label: "导出工程文件…", accelerator: "Cmd+S", click: () => send("export-project") },
            {
              label: "载入示例",
              submenu: [
                { label: "城市边缘", click: async () => { await backupCurrent("载入示例前"); send("demo", "city-edge"); } },
                { label: "Fast Pursuit 追车片", click: async () => { await backupCurrent("载入示例前"); send("demo", "fast-pursuit"); } },
              ],
            },
            { type: "separator" },
            { label: "显示数据文件夹", click: () => shell.openPath(DATA_DIR) },
            { label: "显示应用状态文件夹（密钥 · 日志）", click: () => shell.openPath(USER) },
            { label: "在浏览器中打开", accelerator: "Shift+Cmd+B", click: () => shell.openExternal(`${server.url}/web/`) },
            { label: "拷贝后端地址", click: () => clipboard.writeText(`${server.url}/api/`) },
          ],
        },
      ],
    },
    {
      label: "编辑",
      submenu: [
        { label: "撤销", accelerator: "Cmd+Z", click: () => send("undo") },
        { label: "重做", accelerator: "Shift+Cmd+Z", click: () => send("redo") },
        { type: "separator" },
        { label: "剪切", role: "cut" },
        { label: "拷贝", role: "copy" },
        { label: "粘贴", role: "paste" },
        { label: "全选", role: "selectAll" },
        { type: "separator" },
        { label: "删除选中对象", accelerator: "Cmd+Backspace", click: () => send("delete") },
      ],
    },
    {
      label: "舞台",
      submenu: [
        { label: "播放 / 暂停", accelerator: "Cmd+P", click: () => send("play") },
        { label: "录制 Take", accelerator: "Cmd+R", click: () => send("record") },
        { type: "separator" },
        { label: "自由观察", accelerator: "Cmd+1", click: () => send("view", "free") },
        { label: "Program 视角", accelerator: "Cmd+2", click: () => send("view", "program") },
        { label: "回到全景", accelerator: "Cmd+0", click: () => send("reset-view") },
        { label: "聚焦选中", accelerator: "Cmd+F", click: () => send("focus") },
        { type: "separator" },
        { label: "新建镜头", accelerator: "Cmd+Shift+N", click: () => send("new-shot") },
      ],
    },
    {
      // 清空，再补充：静止状态只有走一遍片子的三步，且只有真的能做时才亮。
      // 模式（i2v / v2v / t2v）、单镜重跑、分开导出白模/生成，都是用到才去「更多」里找。
      label: "成片",
      submenu: [
        { label: "录白模", accelerator: "Shift+Cmd+R", enabled: st.shots > 0, click: () => send("film-blockout") },
        { label: "按分镜生成", accelerator: "Shift+Cmd+G", enabled: st.shots > 0, click: () => send("film-render", { provider: "seedance-2.5", mode: "auto" }) },
        { label: "导出成片…", accelerator: "Alt+Cmd+E", enabled: st.clips > 0, click: () => send("film-export", { source: "auto" }) },
        { type: "separator" },
        { label: st.shots ? `成片清单（${st.clips}/${st.shots} 镜就绪）…` : "成片清单…", enabled: st.shots > 0, click: showFilmPlan },
        {
          label: "更多",
          submenu: [
            { label: "只处理当前镜头：录白模", enabled: !!st.currentShotId, click: () => send("film-blockout", { current: true }) },
            { label: "只处理当前镜头：生成", enabled: !!st.currentShotId, click: () => send("film-render", { provider: "seedance-2.5", mode: "auto", current: true }) },
            { type: "separator" },
            { label: "生成模式：首帧参考 i2v", enabled: st.shots > 0, click: () => send("film-render", { provider: "seedance-2.5", mode: "i2v" }) },
            { label: "生成模式：白模参考 v2v", enabled: st.shots > 0, click: () => send("film-render", { provider: "seedance-2.5", mode: "v2v" }) },
            { label: "生成模式：纯文生视频 t2v", enabled: st.shots > 0, click: () => send("film-render", { provider: "seedance-2.5", mode: "t2v" }) },
            { type: "separator" },
            { label: "只导出白模成片…", enabled: st.takes > 0, click: () => send("film-export", { source: "blockout" }) },
            { label: "只导出生成成片…", enabled: st.generated > 0, click: () => send("film-export", { source: "generated" }) },
            { type: "separator" },
            { label: "跑完整条：白模 → 生成 → 成片", enabled: st.shots > 0, click: () => send("film-pipeline", { provider: "seedance-2.5", mode: "auto" }) },
            { label: "批准全部参考图", enabled: st.pendingAssets > 0, click: approveAllAssets },
            { label: "显示媒体文件夹", click: () => shell.openPath(MEDIA_DIR) },
          ],
        },
      ],
    },
    {
      label: "面板",
      submenu: [
        { label: "场景", accelerator: "Alt+Cmd+1", click: () => send("left", "scene") },
        { label: "属性", accelerator: "Alt+Cmd+2", click: () => send("left", "props") },
        { label: "底部抽屉", accelerator: "Cmd+J", click: () => send("drawer") },
        { label: "Agent 输入", accelerator: "Cmd+L", click: () => send("agent-focus") },
        { type: "separator" },
        { label: "实际大小", role: "resetZoom" },
        { label: "放大", role: "zoomIn" },
        { label: "缩小", role: "zoomOut" },
        { label: "全屏", role: "togglefullscreen" },
        { type: "separator" },
        { label: "重新载入界面", accelerator: "Alt+Cmd+R", click: () => win?.webContents.reload() },
        { label: "开发者工具", accelerator: "Alt+Cmd+I", click: () => win?.webContents.toggleDevTools() },
      ],
    },
    {
      label: "窗口",
      submenu: [
        { label: "最小化", role: "minimize" },
        { label: "缩放", role: "zoom" },
        { type: "separator" },
        { label: "前置全部窗口", role: "front" },
      ],
    },
    {
      label: "帮助",
      submenu: [
        { label: "怎么用", accelerator: "Cmd+/", click: () => send("guide") },
        { label: "后端日志", click: () => shell.openPath(LOG_FILE) },
        { label: "运行诊断（密钥 · ffmpeg · 后端）", click: showDiagnostics },
        { label: "接口契约 (docs/backend-api.md)", click: () => shell.openPath(path.join(ROOT, "docs", "backend-api.md")) },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function showAbout() {
  dialog.showMessageBox(win, {
    type: "info",
    title: "导演台",
    message: `导演台 Director Console ${app.getVersion()}`,
    detail: `创作从这一帧开始。\n\n后端 ${server?.url}\n数据 ${DATA_DIR}\n密钥与日志 ${USER}\n更新源 ${prefs.updateFeed || DEFAULT_FEED}${prefs.autoUpdate === false ? "（自动检查已关闭）" : ""}\n\n界面参考 MiniMax Design。人类、CLI 和 Agent 操作同一套运行时。`,
    buttons: ["好"],
  });
}

// 工程库：userData/projects/*.director.json。当前工程始终自动保存在 userData/project.json，
// 「存入工程库」是给它起个名字留一份，之后可以随时切回来——清场不会弄丢东西。
// 换工程 = 覆盖当前工程。当前工程可能根本没存过（刚让 Agent 建完、还没起名字），
// 所以切换前先无条件扣一份快照。只留最近 8 份。
async function backupCurrent(reason) {
  try {
    const st = await api("actions", { action: "project.export", payload: {} });
    const d = st?.data;
    if (!d || (!d.shots?.length && !d.entities?.length)) return null; // 空工程不值得备份
    fs.mkdirSync(AUTOSAVE_DIR, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ").replace(":", "");
    const safe = String(d.project?.name || "Untitled").replace(/[/\\:]/g, "_").slice(0, 40);
    const file = path.join(AUTOSAVE_DIR, `${safe} ${stamp}.director.json`);
    fs.writeFileSync(file, JSON.stringify(d, null, 2));
    const olds = fs.readdirSync(AUTOSAVE_DIR).filter((f) => f.endsWith(".json")).map((f) => ({ f, at: fs.statSync(path.join(AUTOSAVE_DIR, f)).mtimeMs })).sort((a, b) => b.at - a.at);
    for (const o of olds.slice(8)) fs.rmSync(path.join(AUTOSAVE_DIR, o.f), { force: true });
    process.stdout.write(`[backup] ${reason} → ${file}\n`);
    return file;
  } catch (err) {
    process.stdout.write(`[backup] 失败：${err.message}\n`);
    return null;
  }
}

function listAutosaves() {
  try {
    return fs.readdirSync(AUTOSAVE_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({ file: path.join(AUTOSAVE_DIR, f), name: f.replace(/\.director\.json$/, ""), at: fs.statSync(path.join(AUTOSAVE_DIR, f)).mtimeMs }))
      .sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

function listProjects() {
  try {
    return fs.readdirSync(PROJECTS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({ file: path.join(PROJECTS_DIR, f), name: f.replace(/\.director\.json$|\.json$/, ""), at: fs.statSync(path.join(PROJECTS_DIR, f)).mtimeMs }))
      .sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

async function saveToLibrary() {
  const st = await api("actions", { action: "project.export", payload: {} });
  if (!st?.data) return dialog.showErrorBox("存入工程库失败", st?.error || "拿不到工程数据");
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  const suggested = `${(st.data.project?.name || "Untitled").replace(/[/\\:]/g, "_")}.director.json`;
  const r = await dialog.showSaveDialog(win, { title: "存入工程库", defaultPath: path.join(PROJECTS_DIR, suggested), filters: [{ name: "Director 工程", extensions: ["json"] }] });
  if (r.canceled || !r.filePath) return;
  try {
    fs.writeFileSync(r.filePath, JSON.stringify(st.data, null, 2));
    buildMenu();
    const inLibrary = path.dirname(r.filePath) === PROJECTS_DIR;
    dialog.showMessageBox(win, {
      type: "info",
      message: `已保存「${path.basename(r.filePath).replace(/\.director\.json$|\.json$/, "")}」`,
      detail: inLibrary ? "在「工程 → 工程库」里随时切回来。" : `保存在 ${r.filePath}（不在工程库目录里，用「打开工程…」来取）。`,
      buttons: ["好"],
    });
  } catch (err) {
    dialog.showErrorBox("存入工程库失败", String(err.message || err));
  }
}

async function loadProjectFile(file, { confirm = true } = {}) {
  if (confirm) {
    const r = await dialog.showMessageBox(win, {
      type: "question",
      message: `切换到「${path.basename(file).replace(/\.director\.json$|\.json$/, "")}」？`,
      detail: "当前工程会被替换。切换前会自动扣一份快照，放在「工程库 → 自动备份」里，切错了能捞回来。",
      buttons: ["切换", "取消"],
      defaultId: 0,
      cancelId: 1,
    });
    if (r.response !== 0) return;
  }
  await backupCurrent("切换工程前");
  try {
    send("load-project", JSON.parse(fs.readFileSync(file, "utf8")));
  } catch (err) {
    dialog.showErrorBox("打开失败", String(err.message || err));
  }
}

async function openProject() {
  const r = await dialog.showOpenDialog(win, {
    title: "打开工程",
    filters: [{ name: "Director 工程", extensions: ["json"] }],
    properties: ["openFile"],
  });
  if (r.canceled || !r.filePaths[0]) return;
  try {
    const data = JSON.parse(fs.readFileSync(r.filePaths[0], "utf8"));
    send("load-project", data);
  } catch (err) {
    dialog.showErrorBox("打开失败", String(err.message || err));
  }
}

// ---- 成片：菜单侧的只读报告与批量小操作（不需要页面参与）----
async function showFilmPlan() {
  const r = await api("actions", { action: "film.plan", payload: { source: "auto" } });
  const d = r?.data;
  if (!d) return dialog.showErrorBox("成片清单", r?.error || "拿不到清单");
  const rows = d.clips
    .map((c) => `${String(c.index ?? "").padStart(2, "0")}  ${c.startTc}–${c.endTc}  ${String(c.seconds).padStart(4)}s  ${c.missing ? "— 缺素材" : c.kind === "generated" ? "生成" : "白模"}  ${c.title}`)
    .join("\n");
  dialog.showMessageBox(win, {
    type: "info",
    title: "成片清单",
    message: `${d.ready}/${d.shots} 镜就绪 · ${d.seconds}s / ${d.fullSeconds}s`,
    detail: `${rows}\n\n拼接器：${d.assembler?.name || "无"}${d.assembler?.ready ? "" : "（找不到 ffmpeg）"}`,
    buttons: ["好"],
  });
}

async function approveAllAssets() {
  const st = await api("state?events=0");
  const pending = (st?.snapshot?.assets || []).filter((a) => !a.approved);
  if (!pending.length) return dialog.showMessageBox(win, { type: "info", message: "没有待批准的参考图", buttons: ["好"] });
  for (const a of pending) await api("actions", { action: "asset.approve", payload: { id: a.id } });
  dialog.showMessageBox(win, { type: "info", message: `已批准 ${pending.length} 张参考图`, detail: "之后这些实体出现的镜头，生成时会自动带上参考，保证跨镜一致。", buttons: ["好"] });
}

async function showDiagnostics() {
  const h = await backendHealth();
  const k = keyState();
  const plan = await api("actions", { action: "film.plan", payload: {} }).catch(() => null);
  dialog.showMessageBox(win, {
    type: "info",
    title: "运行诊断",
    message: h ? `后端正常 · ${h.service}` : "后端无响应",
    detail: [
      `地址        ${server?.url || "—"}`,
      `工程        ${h?.project?.name || "—"}（${h?.project?.shots ?? 0} 镜 / ${h?.project?.takes ?? 0} Take / ${h?.project?.jobs ?? 0} 任务）`,
      `生成        ${h?.generation?.name || "模拟队列"}${h?.generation?.models ? ` · ${Object.keys(h.generation.models).join(" / ")}` : ""}`,
      `火山密钥    ${k.hasArk ? `已配置 ${k.ark}` : "未配置 — Seedance / Seedream 会走模拟队列"}`,
      `规划模型    ${h?.llm?.current || "rules 规则规划器"}${k.hasLlm ? "" : "（未配置网关密钥）"}`,
      `拼接器      ${plan?.data?.assembler?.ready ? "ffmpeg 就绪" : "找不到 ffmpeg — brew install ffmpeg"}`,
      `v2v 公网    ${h?.generation?.publicUrl || (prefs.tunnel ? "隧道未建立（看后端日志）" : "未开启 — 偏好设置里可打开")}`,
      `版本        ${app.getVersion()} · 更新源 ${prefs.updateFeed || DEFAULT_FEED || "未配置"}${prefs.autoUpdate === false ? "（自动检查关闭）" : ""}`,
      `数据        ${DATA_DIR}（工程库 · 媒体）`,
      `应用状态    ${USER}（密钥 · 偏好 · 日志）`,
      `日志        ${LOG_FILE}`,
    ].join("\n"),
    buttons: ["好"],
  });
}

// ---- 偏好设置：密钥与规划模型。写进 userData/keys/，重启后端生效 ----
const PREFS_HTML = `<!doctype html><meta charset="utf-8"><title>偏好设置</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; padding:22px 24px; font:13px/1.6 -apple-system,"PingFang SC",system-ui,sans-serif; background:#0f1014; color:#e8e8ea; }
  h1 { font-size:15px; margin:0 0 4px; font-weight:600; }
  p.sub { margin:0 0 18px; color:#8b8d96; font-size:12px; }
  label { display:block; margin:14px 0 5px; color:#b9bbc4; font-size:12px; }
  input, select { width:100%; box-sizing:border-box; padding:8px 10px; border-radius:7px; border:1px solid #2a2c36; background:#16181f; color:#e8e8ea; font:12px ui-monospace,SFMono-Regular,monospace; }
  select { font-family:inherit; }
  .hint { color:#6f727c; font-size:11px; margin-top:5px; }
  .row { display:flex; gap:10px; justify-content:flex-end; margin-top:22px; }
  button { padding:7px 16px; border-radius:7px; border:1px solid #2a2c36; background:#1b1d25; color:#e8e8ea; font-size:12px; }
  button.primary { background:#e8e8ea; color:#111; border-color:#e8e8ea; font-weight:600; }
  .ok { color:#6ed6a0; } .warn { color:#e0b060; }
</style>
<h1>生成密钥与规划模型</h1>
<p class="sub">密钥只保存在本机 <code id="dir"></code>，随后端进程启动，不会进工程文件。</p>
<label>火山引擎 Ark 密钥 <span id="arkState"></span></label>
<input id="ark" placeholder="ark-… （留空表示不改动）" autocomplete="off" spellcheck="false">
<div class="hint">给 Seedance 2.5 / 2.0 出视频、Seedream 5.0 出图与参考图。没有它这些供应商走可观察的模拟队列。</div>
<label>AIGW 网关密钥 <span id="llmState"></span></label>
<input id="llm" placeholder="sk-… （留空表示不改动）" autocomplete="off" spellcheck="false">
<div class="hint">让 Agent Director 由大模型规划，而不是内置规则规划器。</div>
<label>规划模型</label>
<select id="model"></select>
<label style="margin-top:18px">视频生视频（v2v）</label>
<div style="display:flex;align-items:center;gap:8px;margin:2px 0 5px">
  <input type="checkbox" id="tunnel" style="width:auto;margin:0">
  <label for="tunnel" style="margin:0;color:#e8e8ea">把白模视频只读放到公网，让 Seedance 能取到</label>
</div>
<div class="hint">只放开 /media 的只读读取，地址随机；控制接口始终留在本机。需要 cloudflared（brew install cloudflared）。不开就只能用 i2v / t2v。</div>
<label style="margin-top:18px">更新</label>
<div style="display:flex;align-items:center;gap:8px;margin:2px 0 5px">
  <input type="checkbox" id="auto" style="width:auto;margin:0">
  <label for="auto" style="margin:0;color:#e8e8ea">自动检查更新（启动后与每 6 小时）</label>
</div>
<input id="feed" placeholder="更新源 JSON 地址" autocomplete="off" spellcheck="false">
<div class="hint">留空用默认源。更新包会下载到「下载」文件夹并校验 sha256，安装由你确认；工程与媒体在用户数据目录，不会被覆盖。</div>
<div class="row">
  <button id="clear">清除密钥</button>
  <button id="cancel">取消</button>
  <button id="save" class="primary">保存并重启后端</button>
</div>
<script>
  const $ = (id) => document.getElementById(id);
  let state = null;
  window.prefsApi.load().then((s) => {
    state = s;
    $("dir").textContent = s.keysDir;
    $("arkState").innerHTML = s.hasArk ? '<span class="ok">已配置 ' + s.ark + '</span>' : '<span class="warn">未配置</span>';
    $("llmState").innerHTML = s.hasLlm ? '<span class="ok">已配置 ' + s.llm + '</span>' : '<span class="warn">未配置</span>';
    $("model").innerHTML = ['<option value="">默认（后端决定）</option>', ...s.models.map((m) => '<option value="' + m + '"' + (m === s.llmModel ? " selected" : "") + '>' + m + '</option>')].join("");
    $("tunnel").checked = !!s.tunnel;
    $("auto").checked = s.autoUpdate !== false;
    $("feed").value = s.updateFeed || "";
    $("feed").placeholder = s.defaultFeed;
  });
  $("cancel").onclick = () => window.prefsApi.close();
  $("save").onclick = () => { $("save").disabled = true; $("save").textContent = "重启后端…"; window.prefsApi.save({ ark: $("ark").value, llm: $("llm").value, llmModel: $("model").value, tunnel: $("tunnel").checked, autoUpdate: $("auto").checked, updateFeed: $("feed").value.trim() }); };
  $("clear").onclick = () => window.prefsApi.save({ ark: "", llm: "", llmModel: "", clear: true });
</script>`;

const PREFS_PRELOAD = `const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("prefsApi", {
  load: () => ipcRenderer.invoke("prefs:load"),
  save: (v) => ipcRenderer.invoke("prefs:save", v),
  close: () => ipcRenderer.invoke("prefs:close"),
});`;

function prefsFiles() {
  const dir = path.join(app.getPath("temp"), "director-prefs");
  fs.mkdirSync(dir, { recursive: true });
  const html = path.join(dir, "prefs.html");
  const pre = path.join(dir, "prefs-preload.cjs");
  fs.writeFileSync(html, PREFS_HTML);
  fs.writeFileSync(pre, PREFS_PRELOAD);
  return { html, pre };
}

function openPrefs() {
  if (prefsWin && !prefsWin.isDestroyed()) return prefsWin.focus();
  const { html, pre } = prefsFiles();
  prefsWin = new BrowserWindow({
    width: 520,
    height: 560,
    parent: win,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: "偏好设置",
    backgroundColor: "#0f1014",
    webPreferences: { preload: pre, contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  prefsWin.loadFile(html);
  prefsWin.on("closed", () => (prefsWin = null));
}

ipcMain.handle("prefs:load", async () => {
  const h = await backendHealth();
  return { ...keyState(), keysDir: KEYS_DIR, models: h?.llm?.models || [], tunnel: !!prefs.tunnel, autoUpdate: prefs.autoUpdate !== false, updateFeed: prefs.updateFeed || "", defaultFeed: DEFAULT_FEED };
});
ipcMain.handle("prefs:close", () => prefsWin?.close());
ipcMain.handle("prefs:save", async (_e, v) => {
  if (v.clear) {
    writeKey(ARK_KEY_FILE, "");
    writeKey(LLM_KEY_FILE, "");
    delete prefs.llmModel;
  } else {
    if (v.ark?.trim()) writeKey(ARK_KEY_FILE, v.ark);
    if (v.llm?.trim()) writeKey(LLM_KEY_FILE, v.llm);
    if (v.llmModel !== undefined) { if (v.llmModel) prefs.llmModel = v.llmModel; else delete prefs.llmModel; }
  }
  if (v.tunnel !== undefined) { if (v.tunnel) prefs.tunnel = true; else delete prefs.tunnel; }
  if (v.autoUpdate !== undefined) {
    prefs.autoUpdate = !!v.autoUpdate;
    if (prefs.autoUpdate) delete prefs.skipVersion; // 重新打开自动检查 = 不再跳过之前跳过的版本
  }
  if (v.updateFeed !== undefined) { if (v.updateFeed) prefs.updateFeed = v.updateFeed; else delete prefs.updateFeed; }
  savePrefs();
  prefs.autoUpdate === false ? updater?.stopAutoCheck() : updater?.startAutoCheck();
  prefsWin?.close();
  try {
    await restartBackend();
    const h = await backendHealth();
    dialog.showMessageBox(win, { type: "info", message: "已保存并重启后端", detail: `生成：${h?.generation?.name || "模拟队列"}\n规划：${h?.llm?.current || "rules"}`, buttons: ["好"] });
  } catch (err) {
    dialog.showErrorBox("重启后端失败", String(err.message || err));
  }
  return { ok: true };
});

// ---- 成片进度：Dock 进度条 + 窗口标题 + 完成通知；跑片时拦住误关窗口 ----
ipcMain.on("desktop:progress", (_e, p) => {
  if (!win || win.isDestroyed()) return;
  const v = typeof p?.value === "number" ? Math.max(0, Math.min(1, p.value)) : -1;
  win.setProgressBar(v >= 0 ? v : -1);
  if (p?.label) win.setTitle(`${p.label} — 导演台`);
  else win.setTitle("导演台");
});
ipcMain.on("desktop:busy", (_e, { on, label }) => {
  busy = on ? { label: label || "任务进行中" } : null;
  if (!on && win && !win.isDestroyed()) { win.setProgressBar(-1); win.setTitle("导演台"); }
});
ipcMain.handle("desktop:notify", (_e, { title, body }) => {
  if (!Notification.isSupported()) return { ok: false };
  new Notification({ title: title || "导演台", body: body || "" }).show();
  return { ok: true };
});
ipcMain.handle("desktop:pick-save-video", async (_e, name) => {
  const r = await dialog.showSaveDialog(win, { title: "导出成片", defaultPath: path.join(app.getPath("movies"), name || "film.mp4"), filters: [{ name: "MP4", extensions: ["mp4"] }] });
  return r.canceled || !r.filePath ? { ok: false, canceled: true } : { ok: true, path: r.filePath };
});
// the film lands in the backend's media dir; offer the three things a person actually wants next
ipcMain.handle("desktop:film-done", async (_e, info = {}) => {
  const src = info.url ? path.join(MEDIA_DIR, path.basename(info.url)) : null;
  const mb = info.bytes ? ` · ${(info.bytes / 1e6).toFixed(1)} MB` : "";
  const r = await dialog.showMessageBox(win, {
    type: "info",
    title: "成片已生成",
    message: `${info.kind === "blockout" ? "白模成片" : "成片"}完成：${info.clips || "?"} 镜 · ${Math.round(info.seconds || 0)}s${mb}`,
    detail: src || info.url,
    buttons: ["播放", "另存为…", "在访达中显示", "好"],
    defaultId: 0,
    cancelId: 3,
  });
  if (!src || !fs.existsSync(src)) return { ok: false, error: "FILE_NOT_FOUND", path: src };
  if (r.response === 0) shell.openPath(src);
  else if (r.response === 1) {
    const pick = await dialog.showSaveDialog(win, { title: "导出成片", defaultPath: path.join(app.getPath("movies"), path.basename(src)), filters: [{ name: "MP4", extensions: ["mp4"] }] });
    if (!pick.canceled && pick.filePath) { fs.copyFileSync(src, pick.filePath); shell.showItemInFolder(pick.filePath); }
  } else if (r.response === 2) shell.showItemInFolder(src);
  return { ok: true, path: src };
});

// ---- IPC: native file dialogs for the renderer's download()/import paths ----
ipcMain.handle("desktop:save", async (_e, { name, content, filters }) => {
  const r = await dialog.showSaveDialog(win, { title: "保存", defaultPath: path.join(app.getPath("downloads"), name || "untitled"), filters });
  if (r.canceled || !r.filePath) return { ok: false, canceled: true };
  try {
    fs.writeFileSync(r.filePath, content);
    return { ok: true, path: r.filePath };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});
ipcMain.handle("desktop:open-json", async () => {
  const r = await dialog.showOpenDialog(win, { title: "打开工程", filters: [{ name: "JSON", extensions: ["json"] }], properties: ["openFile"] });
  if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
  try {
    return { ok: true, path: r.filePaths[0], data: JSON.parse(fs.readFileSync(r.filePaths[0], "utf8")) };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});
ipcMain.handle("desktop:reveal", (_e, p) => shell.showItemInFolder(p || PROJECT_FILE));
ipcMain.handle("desktop:info", () => ({ version: app.getVersion(), api: server ? `${server.url}/api/` : null, projectFile: PROJECT_FILE, mediaDir: MEDIA_DIR, dataDir: DATA_DIR, userData: USER }));
ipcMain.handle("desktop:confirm", async (_e, { message, detail, ok = "继续", cancel = "取消" }) => {
  const r = await dialog.showMessageBox(win, { type: "question", message, detail, buttons: [ok, cancel], defaultId: 0, cancelId: 1 });
  return r.response === 0;
});

// ---- lifecycle ----
if (!app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => {
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});

nativeTheme.themeSource = "dark";
app.setAboutPanelOptions?.({ applicationName: "导演台", applicationVersion: app.getVersion() });

// 打包后的 app 没有 stdout，所以启动诊断必须落到文件里，否则出问题只能靠猜。
const boot = (m) => {
  const line = `${new Date().toISOString().slice(11, 19)} [boot] ${m}\n`;
  try { fs.mkdirSync(USER, { recursive: true }); fs.appendFileSync(LOG_FILE, line); } catch {}
  try { process.stdout.write(line); } catch {}
};

// 启动失败过一次是静默的：whenReady 里抛异常既没有窗口也没有日志，进程还活着。
// 所以整段包起来，任何一步失败都要留下痕迹并告诉用户。
app.whenReady().then(async () => {
  boot(`ready · data ${DATA_DIR}`);
  try {
    migrateLegacyData();
    boot("migrate ok");
  } catch (err) {
    boot(`migrate failed: ${err.message}`);
    dialog.showErrorBox("数据目录不可用", `${DATA_DIR}\n\n${err.message}\n\n可以在「偏好设置」里换一个位置。`);
  }
  try {
    await startBackend();
    boot(`backend up ${server.url}`);
  } catch (err) {
    boot(`backend failed: ${err.message}`);
    dialog.showErrorBox("无法启动后端", String(err.message || err));
    app.quit();
    return;
  }
  updater = createUpdater({ prefs, savePrefs, getWindow: () => win, log: (m) => process.stdout.write(`[update] ${m}\n`) });
  buildMenu();
  createWindow();
  updater.startAutoCheck();
  boot("window created");
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}).catch((err) => {
  process.stdout.write(`[boot] fatal: ${err?.stack || err}\n`);
  dialog.showErrorBox("启动失败", String(err?.stack || err));
});

app.on("window-all-closed", () => app.quit()); // single-window app: closing the window quits

app.on("before-quit", () => {
  quitting = true;
  if (server?.child && !server.child.killed) {
    server.child.kill("SIGTERM");          // the backend saves the project on SIGTERM
    setTimeout(() => server.child.kill("SIGKILL"), 2000).unref?.();
  }
});
