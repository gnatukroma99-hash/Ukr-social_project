const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('svoieClub', {
  status: () => ipcRenderer.invoke('club:status'),
  start: () => ipcRenderer.invoke('club:start'),
  stop: () => ipcRenderer.invoke('club:stop'),
  queue: () => ipcRenderer.invoke('club:queue'),
  review: (id, approved) => ipcRenderer.invoke('club:review', id, approved),
});
