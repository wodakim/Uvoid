import Hole from './hole.js';

export default class Bot extends Hole {
    constructor(x, y, radius, color, name) {
        super(x, y, radius, color, name);
        this.type = 'hole';
        this.name = name;
        this.state = 'wander';
        this.target = null;
        this.lastStateChange = 0;
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.speed = 150;

        // Bot Leveling Logic
        this.nextThreshold = 300; // Adjusted for Hardcore mode (was 1000)
        this.level = 1;
        this.upgradePool = ['speed', 'size', 'satellite', 'suction', 'digest', 'cooldown'];
    }

    update(dt, entities) {
        super.update(dt);

        // Independent Level Up Check
        if (this.score >= this.nextThreshold) {
            this.levelUp();
        }

        // Virtual Foraging Logic (for off-screen growth)
        // If no entities are near (which happens if MapManager despawned chunks around us),
        // we simulate finding food based on current size.
        // Check if we found ANY props or holes in scan range.
        const scanRadius = 600;
        let foundSomething = false;

        // AI Logic
        let closestThreat = null;
        let closestFood = null;
        let minThreatDist = Infinity;
        let minFoodDist = Infinity;

        entities.forEach(entity => {
            if (entity === this) return;
            if (entity.markedForDeletion) return;

            const dx = entity.x - this.x;
            const dy = entity.y - this.y;
            const distSq = dx*dx + dy*dy;

            if (distSq > scanRadius * scanRadius) return;

            const dist = Math.sqrt(distSq);
            foundSomething = true;

            if (entity.type === 'hole') {
                if (entity.radius > this.radius * 1.1) {
                    if (dist < minThreatDist) {
                        minThreatDist = dist;
                        closestThreat = entity;
                    }
                } else if (entity.radius < this.radius * 0.9) {
                    if (dist < minFoodDist) {
                        minFoodDist = dist;
                        closestFood = entity;
                    }
                }
            } else if (entity.type === 'prop') {
                if (this.radius > entity.radius * 1.1) {
                     if (dist < minFoodDist) {
                        minFoodDist = dist;
                        closestFood = entity;
                     }
                }
            }
        });

        // Virtual Foraging: If lonely, grow extremely slowly (Hardcore Pace)
        if (!foundSomething) {
            // Reduced Rate: 1 small prop (value 1) every 2 seconds
            if (Math.random() < dt * 0.5) {
                this.grow(1);
            }
        }

        // Decision
        if (closestThreat && minThreatDist < 400) {
            this.state = 'flee';
            this.target = closestThreat;
        } else if (closestFood && minFoodDist < 500) {
            this.state = 'chase';
            this.target = closestFood;
        } else {
            this.state = 'wander';
            this.target = null;
        }

        // Action
        let vx = 0, vy = 0;

        if (this.state === 'flee') {
            const dx = this.x - this.target.x;
            const dy = this.y - this.target.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0) {
                vx = (dx / dist) * this.currentSpeed;
                vy = (dy / dist) * this.currentSpeed;
            }
        } else if (this.state === 'chase') {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0) {
                vx = (dx / dist) * this.currentSpeed;
                vy = (dy / dist) * this.currentSpeed;
            }
        } else {
            // Wander
            this.lastStateChange += dt;
            if (this.lastStateChange > 1.5 + Math.random()) {
                this.wanderAngle += (Math.random() - 0.5) * 2;
                this.lastStateChange = 0;
            }
            vx = Math.cos(this.wanderAngle) * this.currentSpeed * 0.6;
            vy = Math.sin(this.wanderAngle) * this.currentSpeed * 0.6;
        }

        this.velocity = { x: vx, y: vy };
    }

    levelUp() {
        // Scaled for Hardcore scoring (approx 1/3 of previous)
        const increment = this.level * 500;
        this.nextThreshold += increment;
        this.level++;

        const choice = this.upgradePool[Math.floor(Math.random() * this.upgradePool.length)];
        this.addUpgrade(choice);
    }

    // Bots should have varied appearances
    static getRandomSkin() {
        const skins = [
            { color: '#00f3ff', shape: 'circle' },
            { color: '#ff00ff', shape: 'circle' },
            { color: '#39ff14', shape: 'square' },
            { color: '#ffd700', shape: 'star' },
            { color: '#ff4500', shape: 'gear' },
            { color: '#ff3333', shape: 'circle' }
        ];
        return skins[Math.floor(Math.random() * skins.length)];
    }
}
