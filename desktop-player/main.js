const { app, BrowserWindow, ipcMain, clipboard, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const say = require('say');

let floaterWindow;  // The persistent corner widget
let popupWindow;    // The bar that shows on text selection
let GEMINI_API_KEY = "";

const TRIGGER_FILE = "c:\\Y-OS\\Y-IT_ENGINES\\read-it\\desktop-player\\.trigger_event";

// Load API Key
try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        const c = fs.readFileSync(envPath, 'utf8');
        const m = c.match(/GEMINI_API_KEY=(.*)/);
        if (m) GEMINI_API_KEY = m[1].trim();
    }
} catch (e) { }

function createFloater() {
    const display = screen.getPrimaryDisplay();
    const { width, height } = display.workAreaSize;

    floaterWindow = new BrowserWindow({
        width: 55,
        height: 55,
        x: width - 70,
        y: height - 70,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Show on all virtual desktops
    floaterWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    floaterWindow.loadFile('floater.html');
    floaterWindow.show();

    // Handle floater click -> expand
    ipcMain.on('floater-expand', () => {
        if (floaterWindow) {
            floaterWindow.setSize(280, 200);
            floaterWindow.webContents.send('show-controls');
        }
    });

    ipcMain.on('floater-collapse', () => {
        if (floaterWindow) {
            floaterWindow.setSize(70, 70);
            floaterWindow.webContents.send('hide-controls');
        }
    });
}

function createPopup() {
    popupWindow = new BrowserWindow({
        width: 220,
        height: 50,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    popupWindow.loadFile('index.html');
    // Audio persists - don't hide on blur
}

// Audio handlers
ipcMain.on('speak', (e, { text, speed }) => {
    say.stop();
    say.speak(text, null, speed || 1.0);
});

ipcMain.on('stop', () => say.stop());

// Gemini
ipcMain.handle('summarize', async (e, text) => {
    if (!GEMINI_API_KEY) return "No API Key";
    return new Promise((resolve) => {
        const data = JSON.stringify({ contents: [{ parts: [{ text: `Summarize concisely:\n\n${text}` }] }] });
        const req = https.request({
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, res => {
            let b = '';
            res.on('data', c => b += c);
            res.on('end', () => {
                try { resolve(JSON.parse(b).candidates[0].content.parts[0].text); }
                catch { resolve("Error"); }
            });
        });
        req.write(data);
        req.end();
    });
});

// Watch for text selection trigger
function watchTrigger() {
    fs.watchFile(TRIGGER_FILE, { interval: 200 }, () => {
        try {
            if (fs.existsSync(TRIGGER_FILE)) {
                const content = fs.readFileSync(TRIGGER_FILE, 'utf8').trim();
                if (content) {
                    const [x, y] = content.split(',').map(Number);
                    const text = clipboard.readText();

                    if (text && text.trim().length > 0 && popupWindow) {
                        popupWindow.setPosition(x + 10, y - 60);
                        popupWindow.webContents.send('new-text', text);
                        popupWindow.show();
                        popupWindow.focus();
                    }
                }
            }
        } catch (e) { }
    });
}

app.whenReady().then(() => {
    createFloater();
    createPopup();
    watchTrigger();
});
