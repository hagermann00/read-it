"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerCopy = triggerCopy;
const child_process_1 = require("child_process");
const os_1 = __importDefault(require("os"));
function triggerCopy() {
    return new Promise((resolve, reject) => {
        const platform = os_1.default.platform();
        let command = '';
        if (platform === 'darwin') {
            command = `osascript -e 'tell application "System Events" to keystroke "c" using {command down}'`;
        }
        else if (platform === 'win32') {
            // PowerShell command to send Ctrl+C
            command = `powershell -c "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('^c')"`;
        }
        else if (platform === 'linux') {
            // Try xdotool
            command = `xdotool key ctrl+c`;
        }
        else {
            return reject(new Error('Unsupported platform'));
        }
        (0, child_process_1.exec)(command, (error) => {
            if (error) {
                console.error('Copy trigger failed:', error);
                // On Linux, xdotool might be missing. We can't easily fix that for the user,
                // but we resolve anyway so the app doesn't crash, it just might not copy.
                // For this environment, we expect it might fail.
            }
            // Give it a small delay to ensure clipboard is updated
            setTimeout(resolve, 300);
        });
    });
}
