const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Text & Audio
  onNewText: (fn) => ipcRenderer.on('new-text', (e, t) => fn(t)),
  speak: (text, speed, voice) => ipcRenderer.send('speak', { text, speed, voice }),
  stop: () => ipcRenderer.send('stop'),
  summarize: (text) => ipcRenderer.invoke('summarize', text),

  // Floater controls
  floaterExpand: () => ipcRenderer.send('floater-expand'),
  floaterCollapse: () => ipcRenderer.send('floater-collapse'),
  onShowControls: (fn) => ipcRenderer.on('show-controls', fn),
  onHideControls: (fn) => ipcRenderer.on('hide-controls', fn)
});
