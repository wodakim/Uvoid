import GameManager from './managers/game-manager.js';
import SaveManager from './managers/save-manager.js';
import AdManager from './managers/ad-manager.js';
import ShopManager from './managers/shop-manager.js';
import SoundManager from './managers/sound-manager.js';
import UIManager from './ui/ui-manager.js';
import Renderer from './core/renderer.js';
import InputHandler from './core/input-handler.js';
import GameLoop from './core/game-loop.js';

class App {
    constructor() {
        console.log("URBAN VOID: Initializing...");

        // 1. Initialize UI & Data Managers
        this.uiManager = new UIManager(this);
        this.saveManager = new SaveManager((data) => this.uiManager.updateMenuCoins(data.coins));
        this.adManager = new AdManager();
        this.soundManager = new SoundManager();
        this.shopManager = new ShopManager(this);

        // 2. Initialize Core Systems
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(this.canvas);
        this.inputHandler = new InputHandler(this.canvas);

        // 3. Initialize Game Logic
        this.gameManager = new GameManager(this); // Pass app reference

        // 4. Start Game Loop
        this.gameLoop = new GameLoop(this.gameManager, this.renderer);
        this.gameLoop.start();

        // 5. Handle Resize
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());

        // 6. Initial UI Update (Now that GameManager/Missions are ready)
        this.saveManager.updateUI();

        console.log("URBAN VOID: Ready.");
    }

    handleResize() {
        const adHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ad-height')) || 0;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - adHeight;

        if (this.renderer) {
            this.renderer.resize(this.canvas.width, this.canvas.height);
        }
    }
}

// Start the app when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
