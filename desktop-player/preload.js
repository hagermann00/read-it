const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Text & Audio
  onNewText: (fn) => ipcRenderer.on('new-text', (e, t) => fn(t)),
  speak: (text, speed, voice) => ipcRenderer.send('speak', { text, speed, voice }),
  stop: () => ipcRenderer.send('stop'),
  rewind: () => ipcRenderer.send('rewind'), // NEW
  summarize: (text) => ipcRenderer.invoke('summarize', text),

  // Floater controls
  floaterExpand: () => ipcRenderer.send('floater-expand'),
  floaterCollapse: () => ipcRenderer.send('floater-collapse'),
  floaterShowPlayback: () => ipcRenderer.send('floater-show-playback'), // Request from UI

  // Listeners
  onShowControls: (cb) => ipcRenderer.on('show-controls', () => cb()),
  onHideControls: (cb) => ipcRenderer.on('hide-controls', () => cb()),
  onShowPlayback: (cb) => ipcRenderer.on('show-playback', () => cb()), // Listen from Main
  hide: () => ipcRenderer.send('hide-popup'),

  // History
  getHistory: () => ipcRenderer.invoke('get-history')
});
