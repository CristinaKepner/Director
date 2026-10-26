// The only bridge between the page and the app. contextIsolation stays on; nothing from Node
// reaches the page beyond these calls.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cinemapDesktop', {
  platform: process.platform,
  info: () => ipcRenderer.invoke('desktop:info'),
  onMenu: (fn) => ipcRenderer.on('desktop:menu', (_e, msg) => fn(msg.cmd, msg.payload)),
});
contextBridge.exposeInMainWorld('prefsApi', {
  load: () => ipcRenderer.invoke('prefs:load'),
  save: (data) => ipcRenderer.invoke('prefs:save', data),
  pickDataDir: () => ipcRenderer.invoke('prefs:pick-data-dir'),
  close: () => ipcRenderer.invoke('prefs:close'),
});
