"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const clipboard_automation_1 = require("./services/clipboard-automation");
const os_1 = __importDefault(require("os"));
// Determine paths
const DIST = path_1.default.join(__dirname, '../dist');
const PUBLIC = electron_1.app.isPackaged ? DIST : path_1.default.join(__dirname, '../public');
process.env.DIST = DIST;
process.env.PUBLIC = PUBLIC;
let win;
// Persistence Path
const DATA_FILE = path_1.default.join(electron_1.app.getPath('userData'), 'read-it-queue.json');
function createWindow() {
    win = new electron_1.BrowserWindow({
        width: 60,
        height: 60,
        icon: path_1.default.join(PUBLIC, 'icon.png'),
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
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
    const { width, height } = electron_1.screen.getPrimaryDisplay().workAreaSize;
    win.setPosition(width - 100, height - 300);
    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    }
    else {
        win.loadFile(path_1.default.join(DIST, 'index.html'));
    }
    // win.webContents.openDevTools({ mode: 'detach' }); // For debugging
}
electron_1.app.on('window-all-closed', () => {
    win = null;
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.app.whenReady().then(createWindow);
// --- IPC HANDLERS ---
electron_1.ipcMain.on('resize-window', (event, { width, height }) => {
    if (win) {
        win.setResizable(true);
        win.setSize(width, height);
        win.setResizable(false);
    }
});
electron_1.ipcMain.on('set-ignore-mouse', (event, ignore) => {
    if (win)
        win.setIgnoreMouseEvents(ignore, { forward: true });
});
electron_1.ipcMain.handle('save-to-obsidian', async (event, text) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `KB-ReadIt-${timestamp}.md`;
    // Try to find typical Obsidian paths or fallback to Documents
    const documents = electron_1.app.getPath('documents');
    const inboxPath = path_1.default.join(documents, 'Obsidian-Brain', '00_Inbox');
    // Ensure dir exists (mocking the user's path structure if it exists)
    if (!fs_1.default.existsSync(inboxPath)) {
        // Fallback to simple Documents folder if specific path fails
        const simplePath = path_1.default.join(documents, 'ReadIt-Exports');
        fs_1.default.mkdirSync(simplePath, { recursive: true });
        const filePath = path_1.default.join(simplePath, filename);
        fs_1.default.writeFileSync(filePath, text, 'utf-8');
        return filePath;
    }
    const fullPath = path_1.default.join(inboxPath, filename);
    try {
        fs_1.default.writeFileSync(fullPath, text, 'utf-8');
        return fullPath;
    const inboxPath = path_1.default.join(os_1.default.homedir(), 'Documents', 'Obsidian-Brain', '00_Inbox', filename);
    try {
        fs_1.default.writeFileSync(inboxPath, text, 'utf-8');
        return true;
    }
    catch (e) {
        console.error('Failed to save to Obsidian:', e);
        return false;
    }
});
electron_1.ipcMain.handle('read-queue', () => {
    if (fs_1.default.existsSync(DATA_FILE)) {
        return JSON.parse(fs_1.default.readFileSync(DATA_FILE, 'utf-8'));
    }
    return [];
});
electron_1.ipcMain.handle('write-queue', (event, queue) => {
    fs_1.default.writeFileSync(DATA_FILE, JSON.stringify(queue, null, 2));
});
electron_1.ipcMain.handle('trigger-copy-and-read', async () => {
    // 1. Snapshot current clipboard (optional, if we want to restore)
    const originalText = electron_1.clipboard.readText();
    // 2. Trigger System Copy
    await (0, clipboard_automation_1.triggerCopy)();
    // 3. Read new clipboard
    const newText = electron_1.clipboard.readText();
    // 4. Restore (Optional - user asked for it)
    // clipboard.writeText(originalText);
    // Wait, user said "reverts the clipboard as if it was never there"
    // But if we restore it IMMEDIATELY, we might lose the read?
    // No, we already read it into `newText`.
    // However, clipboard operations are async in OS sometimes.
    // Let's return the new text first, then restore.
    // Restoring logic:
    setTimeout(() => {
        electron_1.clipboard.writeText(originalText);
    }, 1000); // Wait 1s to be safe
    return newText !== originalText ? newText : newText; // Return whatever we got
});
