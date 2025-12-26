
import { exec } from 'child_process';
import os from 'os';

export function triggerCopy(): Promise<void> {
    return new Promise((resolve, reject) => {
        const platform = os.platform();

        let command = '';
        if (platform === 'darwin') {
            command = `osascript -e 'tell application "System Events" to keystroke "c" using {command down}'`;
        } else if (platform === 'win32') {
            // PowerShell command to send Ctrl+C
            command = `powershell -c "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('^c')"`;
        } else if (platform === 'linux') {
            // Try xdotool
            command = `xdotool key ctrl+c`;
        } else {
            return reject(new Error('Unsupported platform'));
        }

        exec(command, (error) => {
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
