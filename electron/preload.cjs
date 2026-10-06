// Bridge between the game page and the desktop shell (file saves, fullscreen, screenshots, Discord status, updates).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('bomDesktop', {
  readSave: (key) => ipcRenderer.sendSync('save:read', key),
  writeSave: (key, json) => ipcRenderer.send('save:write', key, json),
  deleteSave: (key) => ipcRenderer.send('save:delete', key),
  logError: (line) => ipcRenderer.send('log:error', line),
  openLogFolder: () => ipcRenderer.invoke('log:folder'),
  openSaveFolder: () => ipcRenderer.invoke('save:folder'),
  screenshot: (dataUrl) => ipcRenderer.invoke('screenshot', dataUrl),
  toggleFullscreen: () => ipcRenderer.send('win:fullscreen'),
  // window fullscreen, which Esc doesn't leave (Esc is pause in the game)
  isFullscreen: () => ipcRenderer.sendSync('win:isfs'),
  setFullscreen: (on) => ipcRenderer.send('win:setfs', !!on),
  onFullscreen: (fn) => ipcRenderer.on('fullscreen', (_e, on) => fn(!!on)),
  quit: () => ipcRenderer.send('win:quit'),
  setPresence: (p) => ipcRenderer.send('presence', p),
  // auto-update: told when a new version is downloading / ready; restart to install it now
  onUpdate: (fn) => ipcRenderer.on('update', (_e, msg) => fn(msg)),
  installUpdate: () => ipcRenderer.send('update:install'),
  autoUpdates: () => ipcRenderer.sendSync('update:auto'),
});
