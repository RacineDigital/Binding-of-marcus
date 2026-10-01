// Bridge between the game page and the desktop shell (file saves, fullscreen, screenshots, Discord status).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('bomDesktop', {
  readSave: (key) => ipcRenderer.sendSync('save:read', key),
  writeSave: (key, json) => ipcRenderer.send('save:write', key, json),
  deleteSave: (key) => ipcRenderer.send('save:delete', key),
  openSaveFolder: () => ipcRenderer.invoke('save:folder'),
  screenshot: (dataUrl) => ipcRenderer.invoke('screenshot', dataUrl),
  toggleFullscreen: () => ipcRenderer.send('win:fullscreen'),
  quit: () => ipcRenderer.send('win:quit'),
  setPresence: (p) => ipcRenderer.send('presence', p),
});
