
import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Determine paths
const DIST = path.join(__dirname, '../dist');
const PUBLIC = app.isPackaged ? DIST : path.join(__dirname, '../public');

process.env.DIST = DIST;
process.env.PUBLIC = PUBLIC;

let win: BrowserWindow | null;

// Read-It might use a different data file
const DATA_FILE = path.join(os.homedir(), 'Documents', 'Obsidian-Brain', '30_Resources', 'Read-It-Queue.json');
// Or keep it simple for now:
// const DATA_FILE = path.join(os.homedir(), 'Documents', 'read-it', 'data.json');

function createWindow() {
    win = new BrowserWindow({
        width: 60, // Start as pill
        height: 60,
        icon: path.join(PUBLIC, 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        hasShadow: false,
    });

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    // Position above todo-it? Or just centered right for now.
    win.setPosition(width - 100, height - 300);

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        win.loadFile(path.join(DIST, 'index.html'));
    }
}

app.on('window-all-closed', () => {
    win = null;
    if (process.platform !== 'darwin') app.quit();
});

app.whenReady().then(createWindow);

ipcMain.on('resize-window', (event, { width, height }) => {
    if (win) win.setSize(width, height);
});

ipcMain.on('set-ignore-mouse', (event, ignore) => {
    if (win) win.setIgnoreMouseEvents(ignore, { forward: true });
});

ipcMain.handle('save-to-obsidian', async (event, text) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `KB-ReadIt-${timestamp}.md`;
    const inboxPath = path.join(os.homedir(), 'Documents', 'Obsidian-Brain', '00_Inbox', filename);

    try {
        fs.writeFileSync(inboxPath, text, 'utf-8');
        return true;
    } catch (e) {
        console.error('Failed to save to Obsidian:', e);
        return false;
    }
});
