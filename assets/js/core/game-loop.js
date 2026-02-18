export default class GameLoop {
    constructor(gameManager, renderer) {
        this.gameManager = gameManager;
        this.renderer = renderer;
        this.running = false;
        this.lastTime = 0;
        this.accumulator = 0;
        this.targetFPS = 60;
        this.timeStep = 1000 / this.targetFPS; // ~16.67ms
        this.timeScale = 1.0;

        // Bind update loop
        this.loop = this.loop.bind(this);
    }

    setTimeScale(scale) {
        this.timeScale = scale;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.accumulator = 0;
        requestAnimationFrame(this.loop);
    }

    stop() {
        this.running = false;
    }

    loop(currentTime) {
        if (!this.running) return;

        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.accumulator += deltaTime;

        // Fixed timestep update for physics/logic
        // Limits the loop to prevent "spiral of death" if frame time is too long
        let updates = 0;
        while (this.accumulator >= this.timeStep && updates < 5) {
            const dt = (this.timeStep / 1000) * this.timeScale;
            this.gameManager.update(dt);
            this.accumulator -= this.timeStep;
            updates++;
        }

        // Render with interpolation factor (alpha)
        // alpha = this.accumulator / this.timeStep
        // For now, simple render
        // Pass entities and camera from GameManager
        if (this.gameManager.state === 'PLAYING' || this.gameManager.state === 'COUNTDOWN') {
             this.renderer.render(this.gameManager.entities, this.gameManager.camera);
        } else {
            // Render menu background or something?
            // For now, maybe just clear or render last frame?
            // Or render an empty scene with camera?
            this.renderer.render([], this.gameManager.camera);
        }

        requestAnimationFrame(this.loop);
    }
}
