from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load index.html
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")

        # Wait for game load
        page.wait_for_timeout(2000)

        # Check Joystick Opacity
        joystick = page.locator("#dynamic-joystick")
        opacity = joystick.evaluate("el => getComputedStyle(el).opacity")
        print(f"Joystick Opacity: {opacity}")

        # Check Rank Item Font Size
        # Need to ensure at least one rank item exists. The game might need to start or have default leaderboard.
        # The HTML structure usually has placeholders or JS populates it.
        # Let's check if .rank-item exists.
        count = page.locator(".rank-item").count()
        if count > 0:
            font_size = page.locator(".rank-item").first.evaluate("el => getComputedStyle(el).fontSize")
            print(f"Rank Item Font Size: {font_size}")
        else:
            print("No .rank-item found to check font size.")

        browser.close()

if __name__ == "__main__":
    run()
