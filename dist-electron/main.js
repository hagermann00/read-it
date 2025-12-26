"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
// Determine paths
const DIST = path_1.default.join(__dirname, '../dist');
const PUBLIC = electron_1.app.isPackaged ? DIST : path_1.default.join(__dirname, '../public');
process.env.DIST = DIST;
process.env.PUBLIC = PUBLIC;
let win;
// Read-It might use a different data file
const DATA_FILE = path_1.default.join(os_1.default.homedir(), 'Documents', 'Obsidian-Brain', '30_Resources', 'Read-It-Queue.json');
// Or keep it simple for now:
// const DATA_FILE = path.join(os.homedir(), 'Documents', 'read-it', 'data.json');
function createWindow() {
    win = new electron_1.BrowserWindow({
        width: 60, // Start as pill
        height: 60,
        icon: path_1.default.join(PUBLIC, 'icon.png'),
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
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
    const { width, height } = electron_1.screen.getPrimaryDisplay().workAreaSize;
    // Position above todo-it? Or just centered right for now.
    win.setPosition(width - 100, height - 300);
    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    }
    else {
        win.loadFile(path_1.default.join(DIST, 'index.html'));
    }
}
electron_1.app.on('window-all-closed', () => {
    win = null;
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.app.whenReady().then(createWindow);
electron_1.ipcMain.on('resize-window', (event, { width, height }) => {
    if (win)
        win.setSize(width, height);
});
electron_1.ipcMain.on('set-ignore-mouse', (event, ignore) => {
    if (win)
        win.setIgnoreMouseEvents(ignore, { forward: true });
});
electron_1.ipcMain.handle('save-to-obsidian', async (event, text) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `KB-ReadIt-${timestamp}.md`;
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
