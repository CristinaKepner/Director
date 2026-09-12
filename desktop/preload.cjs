// The only surface the page gets from the client: native dialogs, app info, and menu commands.
// contextIsolation is on — nothing from Node leaks into the page.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("director", {
  desktop: "mac",
  info: () => ipcRenderer.invoke("desktop:info"),
  saveFile: (name, content, filters) => ipcRenderer.invoke("desktop:save", { name, content, filters }),
  openProject: () => ipcRenderer.invoke("desktop:open-json"),
  reveal: (p) => ipcRenderer.invoke("desktop:reveal", p),
  confirm: (opts) => ipcRenderer.invoke("desktop:confirm", opts),
  onMenu: (fn) => ipcRenderer.on("desktop:menu", (_e, msg) => fn(msg.cmd, msg.payload)),
  onFocus: (fn) => ipcRenderer.on("desktop:focus", (_e, focused) => fn(focused)),

  // ---- 成片流水线（renderer 跑录制/生成，main 管原生进度、通知与另存为）----
  progress: (p) => ipcRenderer.send("desktop:progress", p), // {label, value 0..1|null} — Dock 进度条 + 窗口标题
  busy: (on, label) => ipcRenderer.send("desktop:busy", { on, label }), // 防止跑片时误关窗口
  filmDone: (info) => ipcRenderer.invoke("desktop:film-done", info), // {url, path, seconds, bytes, clips, kind}
  notify: (opts) => ipcRenderer.invoke("desktop:notify", opts), // {title, body, sound}
  pickSaveVideo: (name) => ipcRenderer.invoke("desktop:pick-save-video", name),
  state: (s) => ipcRenderer.send("desktop:state", s), // 菜单按当前工程能做什么来亮/灰
});
