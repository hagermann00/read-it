from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Enable console logging
        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        # Navigate to the app
        print("Navigating to http://localhost:3000...")
        page.goto("http://localhost:3000")

        # Wait for app to load - using a more reliable selector (e.g., the title in the header)
        print("Waiting for 'Gemini Reader' text...")
        # Note: In App.tsx: <h2 ...>Gemini Reader</h2>
        try:
            page.wait_for_selector("text=Gemini Reader", timeout=10000)
            print("Found 'Gemini Reader'.")
        except Exception as e:
            print(f"Could not find 'Gemini Reader'. Saving debug screenshot.")
            page.screenshot(path="verification/debug_timeout.png")
            raise e

        # Check if the new button is visible
        # The button has title "Summarize & Read (1.5x)"
        # Use get_by_title which corresponds to the 'title' attribute on the button
        print("Looking for button with title 'Summarize & Read (1.5x)'...")
        button = page.get_by_title("Summarize & Read (1.5x)")

        if button.is_visible():
            print("Summarize & Play button is visible.")
            # Take a closer screenshot of the player controls
            # The controls are at the bottom.
            page.set_viewport_size({"width": 800, "height": 800})

            # Wait a bit for layout to settle
            page.wait_for_timeout(500)

            page.screenshot(path="verification/player_controls.png")
            print("Screenshot saved to verification/player_controls.png")
        else:
            print("Summarize & Play button is NOT visible.")
            page.screenshot(path="verification/button_not_visible.png")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
