import Prop from './prop.js';

export default class Human extends Prop {
    constructor(x, y) {
        super(x, y, 'human');
        this.speed = 30 + Math.random() * 20; // Walking speed
        this.panicSpeed = 100;
        this.wanderTimer = 0;
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.state = 'wander'; // wander, panic
        this.velocity = { x: 0, y: 0 };
    }

    update(dt, entities) {
        // AI Logic
        let threat = null;
        let minDist = Infinity;

        // Check for threats (holes bigger than us)
        const scanRange = 200;
        entities.forEach(e => {
            if (e.type === 'hole' && !e.markedForDeletion) {
                const dx = e.x - this.x;
                const dy = e.y - this.y;
                const distSq = dx*dx + dy*dy;

                if (distSq < scanRange*scanRange) {
                    // Check size: Threat if hole is bigger
                    // Human Radius is 18. Hole needs ~20 to eat.
                    if (e.radius > this.radius * 1.1) {
                        const dist = Math.sqrt(distSq);
                        if (dist < minDist) {
                            minDist = dist;
                            threat = e;
                        }
                    }
                }
            }
        });

        if (threat) {
            this.state = 'panic';
            const dx = this.x - threat.x;
            const dy = this.y - threat.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            // Run away
            if (dist > 0) {
                this.velocity.x = (dx / dist) * this.panicSpeed;
                this.velocity.y = (dy / dist) * this.panicSpeed;
            }
        } else {
            this.state = 'wander';
            this.wanderTimer -= dt;
            if (this.wanderTimer <= 0) {
                this.wanderTimer = 1 + Math.random() * 2;
                this.wanderAngle += (Math.random() - 0.5) * 2;
            }
            this.velocity.x = Math.cos(this.wanderAngle) * this.speed;
            this.velocity.y = Math.sin(this.wanderAngle) * this.speed;
        }

        // Apply movement
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;

        // Simple bounds check? Or let them roam.
        // MapManager handles despawning if too far.

        // Update visual rotation to face movement
        if (this.velocity.x !== 0 || this.velocity.y !== 0) {
            this.rotation = Math.atan2(this.velocity.y, this.velocity.x);
        }
    }
}
