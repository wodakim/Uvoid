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

        // AI Personality
        this.aggression = 0.5 + Math.random() * 0.5;
        this.fear = 0.3 + Math.random() * 0.5;
    }

    update(dt, entities) {
        super.update(dt);

        if (this.score >= this.nextThreshold) {
            this.levelUp();
        }

        // Reduced Scan Radius for Performance and Focus
        const scanRadius = 500 + (this.radius * 2);

        let bestTarget = null;
        let bestScore = -Infinity;
        let biggestThreat = null;
        let closestThreatDist = Infinity;

        let foundSomething = false;

        // Simplify Loop: Check closest entities
        for (const entity of entities) {
            if (entity === this) continue;
            if (entity.markedForDeletion) continue;

            const dx = entity.x - this.x;
            const dy = entity.y - this.y;
            const distSq = dx*dx + dy*dy;

            // Collision Avoidance (Solid Props like Buildings)
            // If very close to a solid building that we can't eat, turn away
            if (entity.type === 'prop' && entity.isSolid && this.radius < entity.radius) {
                if (distSq < (this.radius + entity.radius + 50)**2) {
                     // Force wander away
                     this.wanderAngle = Math.atan2(this.y - entity.y, this.x - entity.x);
                     this.state = 'wander';
                     break;
                }
            }

            if (distSq > scanRadius * scanRadius) continue;

            const dist = Math.sqrt(distSq);
            foundSomething = true;

            // Threat Detection
            if (entity.type === 'hole') {
                if (entity.radius > this.radius * 1.05) {
                     if (dist < closestThreatDist) {
                         closestThreatDist = dist;
                         biggestThreat = entity;
                     }
                     continue;
                }
            }

            // Food Evaluation
            let value = 0;
            if (entity.type === 'hole') {
                value = (entity.score || 10) * 10; // Prioritize Kills
            } else if (entity.type === 'prop') {
                // If we can eat it
                if (this.radius > entity.radius * 1.1) {
                    value = entity.value || 1;
                } else {
                    continue; // Ignore things we can't eat
                }
            }

            let score = value / (dist + 50);

            if (entity.type === 'hole') {
                score *= (1 + this.aggression);
            }

            if (score > bestScore) {
                bestScore = score;
                bestTarget = entity;
            }
        }

        // Virtual Foraging if lost
        if (!foundSomething) {
            if (Math.random() < dt * 0.5) {
                this.grow(1);
            }
        }

        // State Decision
        const panicDistance = 250 + this.radius + (biggestThreat ? biggestThreat.radius : 0);

        if (biggestThreat && closestThreatDist < panicDistance) {
            this.state = 'flee';
            this.target = biggestThreat;
        } else if (bestTarget) {
            this.state = 'chase';
            this.target = bestTarget;
        } else {
            // Only wander if not already wandering or stuck
            if (this.state !== 'wander') {
                this.state = 'wander';
                this.wanderAngle = Math.random() * Math.PI * 2;
            }
        }

        // Action Execution
        let vx = 0, vy = 0;
        const currentSpeed = this.currentSpeed * (this.state === 'flee' ? 1.2 : 1.0);

        if (this.state === 'flee') {
            const dx = this.x - this.target.x;
            const dy = this.y - this.target.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0) {
                vx = (dx / dist) * currentSpeed;
                vy = (dy / dist) * currentSpeed;
            }
        } else if (this.state === 'chase') {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0) {
                vx = (dx / dist) * currentSpeed;
                vy = (dy / dist) * currentSpeed;
            }
        } else {
            // Wander: Smooth Perlin-like turn
            this.wanderAngle += (Math.random() - 0.5) * 0.2;
            vx = Math.cos(this.wanderAngle) * currentSpeed * 0.6;
            vy = Math.sin(this.wanderAngle) * currentSpeed * 0.6;
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
