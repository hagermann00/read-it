from playwright.sync_api import sync_playwright

def verify_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen for console logs
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"Browser Error: {exc}"))

        try:
            print("Navigating...")
            page.goto("http://localhost:3000")

            print("Waiting for h2...")
            # Increased timeout
            page.wait_for_selector('h2', timeout=10000)

            header = page.locator('h2')
            print(f"Header text: {header.inner_text()}")

            page.screenshot(path="verification/app_view.png")
            print("Screenshot taken.")

        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_app()
