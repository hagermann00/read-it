const btnPlay = document.getElementById('btnPlay');
const btnSum = document.getElementById('btnSum');
const btnKB = document.getElementById('btnKB');
const btnSpeed = document.getElementById('btnSpeed');

let currentText = "";
let speed = 1.0;
const speeds = [1, 1.25, 1.5, 2];
let speedIndex = 0;

window.api.onNewText((text) => {
    currentText = text;
});

// Play verbatim
btnPlay.onclick = () => {
    if (currentText) {
        window.api.speak(currentText, speed);
    }
};

// Summarize
btnSum.onclick = async () => {
    if (!currentText) return;

    btnSum.textContent = "⏳";
    const summary = await window.api.summarize(currentText);
    btnSum.textContent = "✨";

    if (summary) {
        window.api.speak(summary, speed);
    }
};

// KB placeholder
btnKB.onclick = () => {
    btnKB.style.color = "#22c55e";
    setTimeout(() => btnKB.style.color = "#94a3b8", 500);
};

// Speed cycle
btnSpeed.onclick = () => {
    speedIndex = (speedIndex + 1) % speeds.length;
    speed = speeds[speedIndex];
    btnSpeed.textContent = speed + "×";
};
