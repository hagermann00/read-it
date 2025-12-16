const btnPlay = document.getElementById('btnPlay');
const btnSum = document.getElementById('btnSum');
const btnKB = document.getElementById('btnKB');
const btnSpeed = document.getElementById('btnSpeed');

let currentText = "";
let speed = 1.0;
const speeds = [1, 1.25, 1.5, 2];
let speedIndex = 0;
let isSpeaking = false;

// Debounce protection
let lastClick = 0;
function canClick() {
    const now = Date.now();
    if (now - lastClick < 400) return false;
    lastClick = now;
    return true;
}

// Auto-hide timer
let hideTimer = null;
function resetHideTimer() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        // Hide popup after 8 seconds of inactivity
        window.close();
    }, 8000);
}

window.api.onNewText((text) => {
    currentText = text;
    resetHideTimer();
});

// Play verbatim
btnPlay.onclick = () => {
    if (!canClick()) return;
    if (isSpeaking) {
        window.api.stop();
        isSpeaking = false;
        btnPlay.textContent = "▶";
        return;
    }
    if (currentText) {
        window.api.speak(currentText, speed);
        isSpeaking = true;
        btnPlay.textContent = "🛑";
        resetHideTimer();
    }
};

// Summarize
btnSum.onclick = async () => {
    if (!canClick()) return;
    if (!currentText) return;

    // Stop any current speech first
    window.api.stop();
    isSpeaking = false;

    btnSum.textContent = "⏳";
    const summary = await window.api.summarize(currentText);
    btnSum.textContent = "✨";

    if (summary) {
        window.api.speak(summary, speed);
        isSpeaking = true;
        btnPlay.textContent = "🛑";
        resetHideTimer();
    }
};

// KB placeholder
btnKB.onclick = () => {
    if (!canClick()) return;
    btnKB.style.color = "#22c55e";
    setTimeout(() => btnKB.style.color = "#94a3b8", 500);
    resetHideTimer();
};

// Speed cycle - restarts at new speed if playing
btnSpeed.onclick = () => {
    if (!canClick()) return;
    speedIndex = (speedIndex + 1) % speeds.length;
    speed = speeds[speedIndex];
    btnSpeed.textContent = speed + "×";

    // If currently speaking, restart at new speed
    if (isSpeaking && currentText) {
        window.api.stop();
        window.api.speak(currentText, speed);
    }

    resetHideTimer();
};

// Start timer on load
resetHideTimer();
