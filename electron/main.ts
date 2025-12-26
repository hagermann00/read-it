
import { app, BrowserWindow, ipcMain, screen, clipboard } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { triggerCopy } from './services/clipboard-automation';

// Determine paths
const DIST = path.join(__dirname, '../dist');
const PUBLIC = app.isPackaged ? DIST : path.join(__dirname, '../public');

process.env.DIST = DIST;
process.env.PUBLIC = PUBLIC;

let win: BrowserWindow | null;

// Persistence Path
const DATA_FILE = path.join(app.getPath('userData'), 'read-it-queue.json');

function createWindow() {
    win = new BrowserWindow({
        width: 60,
        height: 60,
        icon: path.join(PUBLIC, 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false // sometimes needed for local audio blobs, but try to avoid
        },
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false, // controlled by IPC
        skipTaskbar: true,
        hasShadow: false,
    });

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    win.setPosition(width - 100, height - 300);

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        win.loadFile(path.join(DIST, 'index.html'));
    }

    // win.webContents.openDevTools({ mode: 'detach' }); // For debugging
}

app.on('window-all-closed', () => {
    win = null;
    if (process.platform !== 'darwin') app.quit();
});

app.whenReady().then(createWindow);

// --- IPC HANDLERS ---

ipcMain.on('resize-window', (event, { width, height }) => {
    if (win) {
        win.setResizable(true);
        win.setSize(width, height);
        win.setResizable(false);
    }
});

ipcMain.on('set-ignore-mouse', (event, ignore) => {
    if (win) win.setIgnoreMouseEvents(ignore, { forward: true });
});

ipcMain.handle('save-to-obsidian', async (event, text) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `KB-ReadIt-${timestamp}.md`;
    // Try to find typical Obsidian paths or fallback to Documents
    const documents = app.getPath('documents');
    const inboxPath = path.join(documents, 'Obsidian-Brain', '00_Inbox');

    // Ensure dir exists (mocking the user's path structure if it exists)
    if (!fs.existsSync(inboxPath)) {
        // Fallback to simple Documents folder if specific path fails
        const simplePath = path.join(documents, 'ReadIt-Exports');
        fs.mkdirSync(simplePath, { recursive: true });
        const filePath = path.join(simplePath, filename);
        fs.writeFileSync(filePath, text, 'utf-8');
        return filePath;
    }

    const fullPath = path.join(inboxPath, filename);
    try {
        fs.writeFileSync(fullPath, text, 'utf-8');
        return fullPath;
    } catch (e) {
        console.error('Failed to save to Obsidian:', e);
        return false;
    }
});

ipcMain.handle('read-queue', () => {
    if (fs.existsSync(DATA_FILE)) {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
    return [];
});

ipcMain.handle('write-queue', (event, queue) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(queue, null, 2));
});

ipcMain.handle('trigger-copy-and-read', async () => {
    // 1. Snapshot current clipboard (optional, if we want to restore)
    const originalText = clipboard.readText();

    // 2. Trigger System Copy
    await triggerCopy();

    // 3. Read new clipboard
    const newText = clipboard.readText();

    // 4. Restore (Optional - user asked for it)
    // clipboard.writeText(originalText);
    // Wait, user said "reverts the clipboard as if it was never there"
    // But if we restore it IMMEDIATELY, we might lose the read?
    // No, we already read it into `newText`.

    // However, clipboard operations are async in OS sometimes.
    // Let's return the new text first, then restore.

    // Restoring logic:
    setTimeout(() => {
        clipboard.writeText(originalText);
    }, 1000); // Wait 1s to be safe

    return newText !== originalText ? newText : newText; // Return whatever we got
});
