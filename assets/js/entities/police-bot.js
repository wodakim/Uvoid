import Bot from './bot.js';

export default class PoliceBot extends Bot {
    constructor(x, y, radius) {
        super(x, y, radius, '#0000FF', 'POLICE');
        this.isPolice = true;
        this.speed = 220; // Faster than normal bots (usually ~150-180)
        this.chaseTimer = 0;
        this.sirenState = 0; // 0: Red, 1: Blue
        this.sirenTimer = 0;
    }

    update(dt, entities) {
        // Siren Logic
        this.sirenTimer += dt;
        if (this.sirenTimer > 0.2) { // Flash every 0.2s
            this.sirenState = 1 - this.sirenState;
            this.sirenTimer = 0;
            // Update color for the main rim
            this.color = this.sirenState === 0 ? '#FF0000' : '#0000FF';
        }

        // AI Logic: Aggressive Chase
        // 1. Find Biggest Target (Player or Bot)
        let target = null;
        let maxScore = -1;

        entities.forEach(entity => {
            if (entity === this) return;
            if (entity.markedForDeletion) return;
            if (entity.type !== 'hole') return; // Only chase holes

            // Priority: Player
            if (entity.isPlayer) {
                 // Always prioritize player if they are big enough or just close?
                 // Let's prioritize the largest entity.
            }

            // Score is roughly radius^2 or just radius for comparison
            if (entity.radius > maxScore) {
                maxScore = entity.radius;
                target = entity;
            }
        });

        if (target) {
            this.state = 'chase';
            this.target = target;
        } else {
            this.state = 'wander';
        }

        // Execute State
        if (this.state === 'chase' && this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist > 0) {
                this.velocity.x = (dx / dist) * this.speed;
                this.velocity.y = (dy / dist) * this.speed;
            }
        } else {
            // Fallback to wander
            this.lastStateChange += dt;
            if (this.lastStateChange > 1) {
                this.wanderAngle += (Math.random() - 0.5) * 4;
                this.lastStateChange = 0;
            }
            this.velocity.x = Math.cos(this.wanderAngle) * this.speed * 0.8;
            this.velocity.y = Math.sin(this.wanderAngle) * this.speed * 0.8;

             // Boundary Check
            if (this.x < -1900 || this.x > 1900 || this.y < -1900 || this.y > 1900) {
                 const angleToCenter = Math.atan2(-this.y, -this.x);
                 this.wanderAngle = angleToCenter;
            }
        }
    }
}
