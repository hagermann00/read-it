// src/content.ts
// Floating Toolbar for Gemini Reader

const TOOLBAR_ID = "gemini-reader-toolbar";

function createToolbar(x: number, y: number, text: string) {
    removeToolbar();

    const toolbar = document.createElement("div");
    toolbar.id = TOOLBAR_ID;
    Object.assign(toolbar.style, {
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        display: "flex",
        gap: "8px",
        padding: "6px 8px",
        background: "rgba(55, 65, 81, 0.98)", // Wolf Gray
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        zIndex: "999999",
        backdropFilter: "blur(4px)",
        border: "1px solid rgba(255,255,255,0.1)",
        transform: "translateY(-100%)", // Position above selection
        marginTop: "-10px"
    });

    // Helper to create buttons
    const createBtn = (label: string, icon: string, color: string, tooltip: string, actionType: string) => {
        const btn = document.createElement("button");
        Object.assign(btn.style, {
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: color,
            fontSize: "16px",
            fontWeight: "bold",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "4px",
            transition: "background 0.2s"
        });
        btn.innerHTML = icon || label;
        btn.title = tooltip;

        btn.onmouseenter = () => { btn.style.background = "rgba(255,255,255,0.1)"; };
        btn.onmouseleave = () => { btn.style.background = "transparent"; };

        btn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();

            // Send message to background
            chrome.runtime.sendMessage({
                action: "TOOLBAR_ACTION",
                payload: { text, mode: actionType }
            });

            removeToolbar();
        };
        return btn;
    };

    // 1. Play Button (Orange - Verbatim)
    const playBtn = createBtn("",
        `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
        "#F97316", "Read Aloud", "VERBATIM");

    // 2. Summary Button (Blue - Summary)
    const sumBtn = createBtn("",
        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
        "#60A5FA", "Summarize & Read", "SUMMARY");

    // 3. KB Button (White - Future placeholder)
    const kbBtn = createBtn("kb", "", "#E2E8F0", "Save to Knowledge Base (kb-it)", "SAVE_KB");
    kbBtn.style.fontSize = "13px";
    kbBtn.style.fontFamily = "monospace";
    kbBtn.style.border = "1px solid rgba(255,255,255,0.2)";
    kbBtn.style.padding = "2px 6px";

    // Separator
    const sep = document.createElement("div");
    sep.style.width = "1px";
    sep.style.background = "rgba(255,255,255,0.1)";
    sep.style.margin = "0 2px";

    toolbar.appendChild(playBtn);
    toolbar.appendChild(sumBtn);
    toolbar.appendChild(sep);
    toolbar.appendChild(kbBtn);

    document.body.appendChild(toolbar);
}

function removeToolbar() {
    const existing = document.getElementById(TOOLBAR_ID);
    if (existing) existing.remove();
}

// Handle Selections
document.addEventListener("mouseup", (e) => {
    setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
            removeToolbar();
            return;
        }

        const text = sel.toString().trim();
        if (text.length === 0) return;

        // Calculate position
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Check if selection is actually visible/valid
        if (rect.width === 0 && rect.height === 0) return;

        const x = rect.left + window.scrollX;
        const y = rect.top + window.scrollY - 10; // 10px buffer above selection

        createToolbar(x, y, text);
    }, 10);
});

// Close toolbar if clicking elsewhere
document.addEventListener("mousedown", (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest(`#${TOOLBAR_ID}`)) {
        removeToolbar();
    }
});
