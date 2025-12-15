// Setup context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "read-selection",
    title: "Read Selection with Gemini",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "summarize-selection",
    title: "Summarize & Read Selection",
    contexts: ["selection"]
  });
});

// Handle Context Menu Click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "read-selection" || info.menuItemId === "summarize-selection") {
    const text = info.selectionText;
    const type = info.menuItemId === "read-selection" ? "Verbatim" : "Summary";

    if (text) {
      // Store in storage so the panel can pick it up if it's currently closed and opening
      chrome.storage.local.set({
        pendingText: {
          text,
          type,
          timestamp: Date.now()
        }
      });

      // Try to send message immediately in case panel is already open
      chrome.runtime.sendMessage({
        action: "NEW_SELECTION",
        payload: { text, type }
      }).catch(() => {
        // Panel is likely closed; storage will handle it on mount.
      });

      // Open the side panel associated with the current window
      // Note: This requires the extension to have been interacted with or specific permissions in some browser versions
      chrome.sidePanel.open({ windowId: tab.windowId });
    }
  }
});

// background.js

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "TOOLBAR_ACTION" && msg.payload?.text) {
    const { text, mode } = msg.payload;

    if (mode === "SAVE_KB") {
      // Placeholder for kb-it
      console.log("Saving to KB:", text);
      // Optional: Show a notification
      /* chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'kb-it (Preview)',
        message: 'Saved to local knowledge base queue.'
      }); */
      return;
    }

    // Default: Play or Summary
    // Store text and mode
    chrome.storage.local.set({
      geminiSelectedText: text,
      geminiMode: mode // 'VERBATIM' or 'SUMMARY'
    }, () => {
      // Open Side Panel
      chrome.sidePanel.open({ tabId: sender.tab.id })
        .catch(err => console.error("Side panel error:", err));
    });
  }
});

// Allow clicking the extension icon to open the side panel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
