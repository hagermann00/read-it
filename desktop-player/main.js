const { app, BrowserWindow, ipcMain, clipboard, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const say = require('say');

let floaterWindow;  // The persistent corner widget
let popupWindow;    // The bar that shows on text selection
let GEMINI_API_KEY = "";

const TRIGGER_FILE = "c:\\Y-OS\\Y-IT_ENGINES\\read-it\\desktop-player\\.trigger_event";
const TOGGLE_FILE = "c:\\Y-OS\\Y-IT_ENGINES\\read-it\\desktop-player\\.toggle_floater";

let isExpanded = false;

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
    console.log("Creating floater window...");
    const display = screen.getPrimaryDisplay();
    const { width, height } = display.workAreaSize;

    floaterWindow = new BrowserWindow({
        width: 80,
        height: 80,
        x: width - 100,
        y: height - 100,
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

    floaterWindow.on('closed', () => {
        console.log("Floater window closed");
        floaterWindow = null;
    });

    // Handle floater click -> expand
    ipcMain.on('floater-expand', () => {
        if (floaterWindow && !floaterWindow.isDestroyed()) {
            floaterWindow.setSize(280, 200);
            floaterWindow.webContents.send('show-controls');
            isExpanded = true;
        }
    });

    ipcMain.on('floater-collapse', () => {
        if (floaterWindow && !floaterWindow.isDestroyed()) {
            floaterWindow.setSize(80, 80);
            floaterWindow.webContents.send('hide-controls');
            isExpanded = false;
        }
    });
}

function createPopup() {
    console.log("Creating popup window...");
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

    popupWindow.on('closed', () => {
        console.log("Popup window closed");
        popupWindow = null;
    });
    // Audio persists - don't hide on blur
}

// Audio handlers
ipcMain.on('speak', (e, { text, speed, voice }) => {
    say.stop();
    say.speak(text, voice || null, speed || 1.0);

    // Switch floater to playback mode if it exists
    if (floaterWindow && !floaterWindow.isDestroyed()) {
        floaterWindow.webContents.send('show-playback');
        // Resize for "Pill" shape: Width 220, Height 56
        floaterWindow.setSize(220, 56);
        isExpanded = true;
        floaterWindow.show();
    }
});

// Rewind handler (Mock: Stop and Restart for now as simple 'rewind' is hard with 'say')
// In a real app we'd track timestamp. Here we just restart the block.
ipcMain.on('rewind', () => {
    // For MVP: Just stop. User can hit play again.
    // OR: If we tracked the last text, we could restart it?
    // Let's just Stop for now.
    say.stop();
});

ipcMain.on('stop', () => {
    say.stop();
    // Return floater to icon mode? Or keep playback controls visible but stopped?
    // Let's keep controls visible so user can hit play again easily, 
    // OR create a 'show-icon' event.
});

ipcMain.on('hide-popup', () => {
    if (popupWindow && !popupWindow.isDestroyed()) {
        popupWindow.hide();
    }
});

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
    console.log("Generatively watching for trigger events...");
    fs.watchFile(TRIGGER_FILE, { interval: 200 }, () => {
        try {
            if (fs.existsSync(TRIGGER_FILE)) {
                const content = fs.readFileSync(TRIGGER_FILE, 'utf8').trim();
                console.log("Trigger file detected:", content);
                if (content) {
                    const [x, y] = content.split(',').map(Number);
                    const text = clipboard.readText();
                    console.log("Clipboard content length:", text.length);

                    if (text && text.trim().length > 0 && popupWindow && !popupWindow.isDestroyed()) {
                        console.log("Showing popup at:", x, y);
                        popupWindow.setPosition(x + 10, y - 60);
                        popupWindow.webContents.send('new-text', text);
                        popupWindow.showInactive(); // Use showInactive to avoid stealing focus aggressively? or show()
                        popupWindow.show();
                        popupWindow.focus();
                    } else {
                        console.log("Popup window not available or destroyed");
                        // Recreate if needed? For now just log.
                        if (!popupWindow || popupWindow.isDestroyed()) createPopup();
                    }
                }
            }
        } catch (e) {
            console.error("Error watching trigger:", e);
        }
    });
}

// Watch for global hotkey toggle (Ctrl+Alt+I)
function watchToggle() {
    console.log("Watching for external toggle...");
    fs.watchFile(TOGGLE_FILE, { interval: 150 }, () => {
        try {
            if (fs.existsSync(TOGGLE_FILE)) {
                console.log("Toggle file changed");
                // Toggle the floater state
                if (floaterWindow && !floaterWindow.isDestroyed()) {
                    if (isExpanded) {
                        floaterWindow.setSize(80, 80);
                        floaterWindow.webContents.send('hide-controls');
                        isExpanded = false;
                    } else {
                        floaterWindow.setSize(280, 200);
                        floaterWindow.webContents.send('show-controls');
                        isExpanded = true;
                    }
                    // Bring floater to focus
                    floaterWindow.show();
                    floaterWindow.focus();
                } else {
                    console.log("Floater window destroyed, recreating...");
                    createFloater();
                }
            }
        } catch (e) { console.error("Error watching toggle:", e); }
    });
}

app.whenReady().then(() => {
    createFloater();
    createPopup();
    watchTrigger();
    watchToggle();
});

