import Hole from './hole.js';

export default class Bot extends Hole {
    constructor(x, y, radius, color, name) {
        super(x, y, radius, color, name);
        this.type = 'hole';
        this.name = name;
        this.state = 'wander';
        this.target = null;
        this.lastStateChange = 0;
        this.decisionTimer = 0; // Delay for reaction
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

        // Bot Brain: Update Decisions every 0.2s to prevent jitter
        this.decisionTimer -= dt;
        if (this.decisionTimer <= 0) {
            this.makeDecision(entities);
            this.decisionTimer = 0.2 + (Math.random() * 0.1);
        }

        // Action Execution (Movement)
        this.executeMovement(dt);
    }

    makeDecision(entities) {
        const scanRadius = 600 + (this.radius * 3);
        let bestTarget = null;
        let bestScore = -Infinity;
        let biggestThreat = null;
        let closestThreatDist = Infinity;

        // Filter entities first
        // We only care about Holes (Threat/Food) and Props (Food)

        for (const entity of entities) {
            if (entity === this || entity.markedForDeletion) continue;

            const dx = entity.x - this.x;
            const dy = entity.y - this.y;
            const distSq = dx*dx + dy*dy;

            // Optimization: Quick range check
            if (distSq > scanRadius * scanRadius) continue;

            const dist = Math.sqrt(distSq);

            // 1. Analyze Threats (Bigger Holes)
            if (entity.type === 'hole' && entity.radius > this.radius * 1.1) {
                // It's bigger than me
                if (dist < closestThreatDist) {
                    closestThreatDist = dist;
                    biggestThreat = entity;
                }
                continue; // Can't eat it, so don't evaluate as food
            }

            // 2. Analyze Food (Smaller Holes or Props)
            let value = 0;

            if (entity.type === 'hole') {
                // Smaller hole: High value target
                // If masses are similar, IGNORE to avoid risk
                if (this.radius > entity.radius * 1.1) {
                    value = (entity.score || 10) * 50; // Big priority
                } else {
                    // Similar size: Ignore
                    continue;
                }
            } else if (entity.type === 'prop') {
                // Prop: Must be edible
                if (this.radius > entity.radius * 1.1) {
                    value = entity.value || 1;
                } else {
                    // Avoid stuck logic: If it's a building I can't eat, treat as obstacle?
                    // For now, just ignore.
                    continue;
                }
            }

            // Scoring: Value / Distance
            // Add bias for holes
            let score = value / (dist + 10);
            if (score > bestScore) {
                bestScore = score;
                bestTarget = entity;
            }
        }

        // State Machine Logic
        const panicDistance = 300 + this.radius + (biggestThreat ? biggestThreat.radius : 0);

        if (biggestThreat && closestThreatDist < panicDistance) {
            // Priority 1: FLEE
            this.state = 'flee';
            this.target = biggestThreat;
        } else if (bestTarget) {
            // Priority 2: FARM / CHASE (Combine them, chasing food IS farming)
            // If target is a Prop -> Farm
            // If target is a Hole -> Chase
            this.state = 'farm'; // Unified state for seeking food
            this.target = bestTarget;
        } else {
            // Priority 3: WANDER (If absolutely nothing found)
            this.state = 'wander';
            this.target = null;
            // Change wander angle slightly
            this.wanderAngle += (Math.random() - 0.5) * 1.0;
        }
    }

    executeMovement(dt) {
        let vx = 0, vy = 0;
        let speedMultiplier = 1.0;

        if (this.state === 'flee' && this.target) {
            // Run AWAY from target
            const dx = this.x - this.target.x;
            const dy = this.y - this.target.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 0) {
                vx = (dx / dist);
                vy = (dy / dist);
                speedMultiplier = 1.3; // Sprint
            }
        } else if ((this.state === 'chase' || this.state === 'farm') && this.target) {
            // Run TOWARDS target
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 0) {
                vx = (dx / dist);
                vy = (dy / dist);
                speedMultiplier = 1.1; // Hunt speed
            } else {
                // Reached target?
                this.target = null;
                this.state = 'wander';
            }
        } else {
            // Wander / Farm Search
            vx = Math.cos(this.wanderAngle);
            vy = Math.sin(this.wanderAngle);
            speedMultiplier = 0.8; // Active search speed
        }

        // Apply Velocity
        const speed = this.currentSpeed * speedMultiplier;
        this.velocity = { x: vx * speed, y: vy * speed };
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
