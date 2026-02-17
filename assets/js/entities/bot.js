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
        this.nextThreshold = 300;
        this.level = 1;
        this.upgradePool = ['speed', 'size', 'satellite', 'suction', 'digest', 'cooldown'];

        // AI Personality (Randomized)
        this.aggression = 0.5 + Math.random() * 0.5; // 0.5 to 1.0
        this.fear = 0.3 + Math.random() * 0.5;
    }

    update(dt, entities) {
        super.update(dt);

        if (this.score >= this.nextThreshold) {
            this.levelUp();
        }

        const scanRadius = 700 + (this.radius * 2);

        let bestTarget = null;
        let bestScore = -Infinity;
        let biggestThreat = null;
        let closestThreatDist = Infinity;

        let foundSomething = false;

        // AI Scan Loop
        for (const entity of entities) {
            if (entity === this) continue;
            if (entity.markedForDeletion) continue;

            const dx = entity.x - this.x;
            const dy = entity.y - this.y;
            const distSq = dx*dx + dy*dy;

            if (distSq > scanRadius * scanRadius) continue;

            const dist = Math.sqrt(distSq);
            foundSomething = true;

            // Threat Detection (Bigger Holes)
            if (entity.type === 'hole') {
                if (entity.radius > this.radius * 1.05) { // 5% margin
                     if (dist < closestThreatDist) {
                         closestThreatDist = dist;
                         biggestThreat = entity;
                     }
                     continue; // Don't eat threats
                }
            }

            // Food Evaluation
            // We want high value items that are close
            let value = 0;
            if (entity.type === 'hole') {
                value = (entity.score || 10) * 5; // Holes are tasty
            } else if (entity.type === 'prop') {
                value = entity.value || 1;
                // Prefer groups? Hard to detect without complex logic.
            }

            // Score formula: Value / Distance
            // Modifiers: Aggression prefers holes.
            let score = value / (dist + 10);

            if (entity.type === 'hole') {
                score *= (1 + this.aggression);
            }

            if (score > bestScore) {
                bestScore = score;
                bestTarget = entity;
            }
        }

        // Virtual Foraging (Hardcore Pace)
        if (!foundSomething) {
            if (Math.random() < dt * 0.5) {
                this.grow(1);
            }
        }

        // State Decision
        const panicDistance = 300 + this.radius + (biggestThreat ? biggestThreat.radius : 0);

        if (biggestThreat && closestThreatDist < panicDistance) {
            this.state = 'flee';
            this.target = biggestThreat;
        } else if (bestTarget) {
            this.state = 'chase';
            this.target = bestTarget;
        } else {
            this.state = 'wander';
            this.target = null;
        }

        // Action Execution
        let vx = 0, vy = 0;
        const currentSpeed = this.currentSpeed * (this.state === 'flee' ? 1.2 : 1.0); // Sprint when scared

        if (this.state === 'flee') {
            const dx = this.x - this.target.x;
            const dy = this.y - this.target.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0) {
                // Flee vector
                vx = (dx / dist) * currentSpeed;
                vy = (dy / dist) * currentSpeed;
            }
        } else if (this.state === 'chase') {
            // Predict target movement?
            let tx = this.target.x;
            let ty = this.target.y;

            // Simple prediction if target is moving
            if (this.target.velocity) {
                tx += this.target.velocity.x * 0.5; // Look ahead 0.5s
                ty += this.target.velocity.y * 0.5;
            }

            const dx = tx - this.x;
            const dy = ty - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist > 0) {
                vx = (dx / dist) * currentSpeed;
                vy = (dy / dist) * currentSpeed;
            }
        } else {
            // Wander
            this.lastStateChange += dt;
            if (this.lastStateChange > 2.0) {
                // Change direction randomly
                this.wanderAngle += (Math.random() - 0.5) * 4;
                this.lastStateChange = 0;
            }
            vx = Math.cos(this.wanderAngle) * currentSpeed * 0.5;
            vy = Math.sin(this.wanderAngle) * currentSpeed * 0.5;
        }

        this.velocity = { x: vx, y: vy };
    }

    levelUp() {
        const increment = this.level * 500;
        this.nextThreshold += increment;
        this.level++;
        const choice = this.upgradePool[Math.floor(Math.random() * this.upgradePool.length)];
        this.addUpgrade(choice);
    }

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
