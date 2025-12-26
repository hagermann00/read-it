"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electron', {
    resizeWindow: (width, height) => electron_1.ipcRenderer.send('resize-window', { width, height }),
    setIgnoreMouse: (ignore) => electron_1.ipcRenderer.send('set-ignore-mouse', ignore),
    saveToObsidian: (text) => electron_1.ipcRenderer.invoke('save-to-obsidian', text),
    readQueue: () => electron_1.ipcRenderer.invoke('read-queue'),
    writeQueue: (queue) => electron_1.ipcRenderer.invoke('write-queue', queue),
    triggerCopyAndRead: () => electron_1.ipcRenderer.invoke('trigger-copy-and-read')
});
