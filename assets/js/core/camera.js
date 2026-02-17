export default class Camera {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.targetZoom = 1;
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeTimer = 0;
        this.shakeStrength = 0;
    }

    follow(target, dt) {
        // Smoother Lerp (Damping)
        // Lerp factor 0.1 is smoother than typical 0.2-0.5
        const lerpFactor = 0.1;

        this.x += (target.x - this.x) * lerpFactor;
        this.y += (target.y - this.y) * lerpFactor;

        // Smooth Zoom
        const zoomLerp = 0.05; // Even smoother zoom
        this.zoom += (this.targetZoom - this.zoom) * zoomLerp;

        // Update Shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const progress = this.shakeTimer / 0.5; // Normalized decay
            // Exponential decay for smoother end
            const currentStrength = this.shakeStrength * (progress * progress);

            this.shakeX = (Math.random() - 0.5) * currentStrength;
            this.shakeY = (Math.random() - 0.5) * currentStrength;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }
    }

    setTargetZoom(z) {
        this.targetZoom = z;
    }

    shake(amount) {
        if (this.settingsManager && !this.settingsManager.get('screenShake')) return;

        // Only shake if amount is significant (Filter small jitters)
        if (amount < 10) return;

        // Cap max shake to avoid nausea
        this.shakeStrength = Math.min(amount, 30);
        this.shakeTimer = 0.3; // Short duration
    }
}
