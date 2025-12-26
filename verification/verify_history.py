from playwright.sync_api import sync_playwright
import os
import json
import time

def verify_history(page):
    filepath = os.path.abspath('desktop-player/floater.html')
    url = f'file://{filepath}'

    # We need to inject the mock BEFORE the page loads scripts if possible,
    # but since it's a file:// url, we can't easily use route interception for the script.
    # However, window.api is usually set in preload.js. In this HTML file, it expects window.api to exist.
    # Since we are opening the HTML directly without Electron, window.api is undefined initially.
    # The script in floater.html runs on load.
    # We should define window.api via add_init_script.

    page.add_init_script("""
        window.api = {
            getHistory: async () => {
                return [
                    {
                        text: "This is a long text that should be in the history because it is longer than 50 characters. It represents a read item.",
                        timestamp: Date.now() - 3600000
                    },
                    {
                        text: "Another item in history for testing purposes. It also needs to be long enough to look realistic in the UI.",
                        timestamp: Date.now() - 7200000
                    }
                ];
            },
            floaterExpand: () => {},
            floaterCollapse: () => {},
            onShowControls: (cb) => {},
            onHideControls: (cb) => {},
            onShowPlayback: (cb) => {},
            onNewText: (cb) => {},
            speak: () => {},
            summarize: () => {},
            stop: () => {},
            rewind: () => {}
        };
    """)

    page.goto(url)

    # Make controls visible
    page.evaluate("document.getElementById('floater').classList.add('hidden');")
    page.evaluate("document.getElementById('controls').classList.remove('hidden');")
    page.evaluate("document.getElementById('controls').style.display = 'flex';") # Force display flex

    # Click History button
    page.click('#btnHistory')

    # Wait for history list to populate
    try:
        page.wait_for_selector('.history-item', timeout=5000)
    except Exception as e:
        print(f"Error: {e}")
        # Check console logs if possible (not easily in sync mode without listener)

    page.screenshot(path='verification/history_view.png')

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        # Listen to console messages
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        verify_history(page)
        browser.close()
