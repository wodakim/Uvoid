import Entity from './entity.js';

export default class Hole extends Entity {
    constructor(x, y, radius, color, name) {
        super(x, y, radius, color, name);
        this.type = 'hole';
        this.name = name;
        this.speed = 150; // Base speed
        this.score = 0;
        this.shape = 'circle';
        this.trail = [];
        this.trailTimer = 0;

        // Upgrade Stats
        this.growthMultiplier = 1.0;
        this.suctionRange = 1.0;
        this.satellites = 0;

        // Power-ups
        this.activePowerUps = {};

        // Swirl Animation State
        this.swirlRotation = 0;

        // Invulnerability
        this.invulnerable = false;
        this.invulnerableTimer = 0;
    }

    applyPowerUp(type) {
        this.activePowerUps[type] = 5.0;
    }

    update(dt) {
        super.update(dt);

        // Update Powerups
        Object.keys(this.activePowerUps).forEach(type => {
            this.activePowerUps[type] -= dt;
            if (this.activePowerUps[type] <= 0) delete this.activePowerUps[type];
        });

        // Speed Logic
        let baseSpeed = this.speed;
        const sizePenalty = Math.max(0, (this.radius - 25) * 0.2);
        const currentSpeed = this.activePowerUps['speed'] ? (baseSpeed + 200) : Math.max(50, baseSpeed - sizePenalty);

        this.currentSpeed = currentSpeed;

        // Update Invulnerability
        if (this.invulnerable) {
            this.invulnerableTimer -= dt;
            if (this.invulnerableTimer <= 0) {
                this.invulnerable = false;
                this.color = this.originalColor || this.color;
            } else {
                // Blink effect
                if (Math.floor(this.invulnerableTimer * 10) % 2 === 0) {
                     this.color = '#ffffff';
                } else {
                     this.color = this.originalColor || this.color;
                }
            }
        }

        // Swirl Update
        this.swirlRotation += dt * 2.0;

        // Trail logic
        this.trailTimer += dt;
        if (this.trailTimer > 0.05) {
            this.trail.push({ x: this.x, y: this.y, r: this.radius, a: 0.5 });
            this.trailTimer = 0;
        }
        if (this.trail.length > 20) this.trail.shift();
        this.trail.forEach(t => t.a -= dt * 0.5);
        this.trail = this.trail.filter(t => t.a > 0);
    }

    grow(amount) {
        const effectiveAmount = amount * this.growthMultiplier;
        this.score += effectiveAmount;

        const currentArea = Math.PI * this.radius * this.radius;
        const addedArea = effectiveAmount * 3; // Hardcore slow growth
        const newArea = currentArea + addedArea;

        this.radius = Math.sqrt(newArea / Math.PI);

        if (this.radius > 600) this.radius = 600;
    }

    shrink(amount) {
        this.score = Math.max(0, this.score - amount * 5);
        const currentArea = Math.PI * this.radius * this.radius;
        const removeArea = amount * 15;
        const newArea = Math.max(Math.PI * 15 * 15, currentArea - removeArea); // Min radius 15
        this.radius = Math.sqrt(newArea / Math.PI);
    }

    addUpgrade(type) {
        console.log(`Applying upgrade: ${type} to ${this.name}`);
        switch(type) {
            case 'speed':
                this.speed += 30; // Increased from 20 to 30 for visibility
                break;
            case 'size':
                // Reduced from 5% to 2% instant growth to prevent OP snowballing
                this.radius *= 1.02;
                break;
            case 'satellite':
                this.satellites++;
                break;
            case 'suction':
                this.suctionRange += 0.2;
                break;
            case 'digest':
                // Reduced from 20% to 10% to slow runaway growth
                this.growthMultiplier += 0.1;
                break;
            case 'cooldown':
                this.speed += 15; // Agility boost
                break;
        }
    }
}
