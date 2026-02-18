from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load index.html
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")

        # Wait for fonts and styles
        page.wait_for_timeout(1000)

        # Verify Main Menu
        assert page.is_visible("#screen-main-menu"), "Main Menu not visible"
        assert page.is_visible(".logo-text"), "Logo Text not visible"
        assert page.is_visible("#btn-play-menu"), "Play Button not visible"

        # Verify Font Families (Computed Style)
        title_font = page.locator(".logo-text").evaluate("el => getComputedStyle(el).fontFamily")
        print(f"Title Font: {title_font}")
        assert "Orbitron" in title_font, "Orbitron font not applied to titles"

        # Click Play to check HUD
        # Need to simulate game start if possible, or just force display
        page.evaluate("document.getElementById('screen-main-menu').classList.add('hidden')")
        page.evaluate("document.getElementById('screen-hud').classList.remove('hidden')")

        assert page.is_visible("#screen-hud"), "HUD not visible"
        assert page.is_visible("#minimap-container"), "Minimap not visible"
        assert page.is_visible(".hud-top-bar"), "Top Bar not visible"

        # Take Screenshot
        page.screenshot(path="verification/ui_cyberpunk.png")
        print("Screenshot saved to verification/ui_cyberpunk.png")

        browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    run()
