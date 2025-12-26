
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    resizeWindow: (width: number, height: number) => ipcRenderer.send('resize-window', { width, height }),
    setIgnoreMouse: (ignore: boolean) => ipcRenderer.send('set-ignore-mouse', ignore),
    saveToObsidian: (text: string) => ipcRenderer.invoke('save-to-obsidian', text),
    readQueue: () => ipcRenderer.invoke('read-queue'),
    writeQueue: (queue: any) => ipcRenderer.invoke('write-queue', queue),
    triggerCopyAndRead: () => ipcRenderer.invoke('trigger-copy-and-read')
});
