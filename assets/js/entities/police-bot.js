import Bot from './bot.js';

export default class PoliceBot extends Bot {
    constructor(x, y, radius) {
        super(x, y, radius, '#0000FF', 'POLICE');
        this.isPolice = true;
        this.speed = 220; // Faster than normal bots (usually ~150-180)
        this.sirenState = 0; // 0: Red, 1: Blue
        this.sirenTimer = 0;

        // AI State
        this.lastKnownPos = null;
        this.lostContactTimer = 0;
        this.patrolTimer = 0;
        this.target = null;
        this.state = 'patrol'; // patrol, chase, search
    }

    update(dt, entities) {
        super.update(dt); // Handles movement integration if velocity is set? No, Bot overrides it.

        // Siren Logic
        this.sirenTimer += dt;
        if (this.sirenTimer > 0.2) {
            this.sirenState = 1 - this.sirenState;
            this.sirenTimer = 0;
            this.color = this.sirenState === 0 ? '#FF0000' : '#0000FF';
        }

        // AI Logic: Line of Sight Chase
        // 1. Identify Target (Prioritize Player)
        // Police hate the player most, or the biggest threat.
        let potentialTarget = null;
        let maxScore = -1;

        // Optimization: Single loop to find buildings (for LOS) and targets
        const buildings = [];
        const targets = [];

        entities.forEach(e => {
            if (e.markedForDeletion) return;
            if (e.type === 'prop' && e.isSolid && (e.propType === 'building' || e.propType === 'small_shop')) {
                buildings.push(e);
            } else if (e.type === 'hole' && e !== this) {
                targets.push(e);
            }
        });

        // Find best target
        targets.forEach(t => {
            // Score = Mass / Distance
            const dist = Math.hypot(t.x - this.x, t.y - this.y);
            let score = t.radius / (dist + 100);
            if (t.isPlayer) score *= 2.0; // Hate player

            if (score > maxScore) {
                maxScore = score;
                potentialTarget = t;
            }
        });

        // 2. Check Line of Sight
        if (potentialTarget) {
            if (this.hasLineOfSight(potentialTarget, buildings)) {
                // SIGHT CONFIRMED
                this.state = 'chase';
                this.target = potentialTarget;
                this.lastKnownPos = { x: potentialTarget.x, y: potentialTarget.y };
                this.lostContactTimer = 0;
            } else {
                // BLOCKED
                if (this.state === 'chase') {
                    // Lost sight just now? Switch to SEARCH
                    this.state = 'search';
                    this.lostContactTimer = 2.0; // Search for 2 seconds
                }
            }
        } else {
            if (this.state === 'chase') {
                this.state = 'patrol';
            }
        }

        // 3. Execute State Behavior
        if (this.state === 'chase' && this.lastKnownPos) {
            this.moveTo(this.lastKnownPos.x, this.lastKnownPos.y, 1.2); // Sprint
        }
        else if (this.state === 'search' && this.lastKnownPos) {
            // Go to last known pos
            const dist = Math.hypot(this.x - this.lastKnownPos.x, this.y - this.lastKnownPos.y);
            if (dist > 50) {
                this.moveTo(this.lastKnownPos.x, this.lastKnownPos.y, 1.0);
            } else {
                // Reached last known. Wait/Spin.
                this.lostContactTimer -= dt;
                this.velocity = {x:0, y:0}; // Stop
                this.rotation += 10 * dt; // Look around

                if (this.lostContactTimer <= 0) {
                    this.state = 'patrol';
                    this.target = null;
                }
            }
        }
        else {
            // Patrol / Wander
            this.patrolTimer -= dt;
            if (this.patrolTimer <= 0) {
                this.wanderAngle = (Math.random() * Math.PI * 2);
                this.patrolTimer = 2 + Math.random() * 2;
            }
            const vx = Math.cos(this.wanderAngle);
            const vy = Math.sin(this.wanderAngle);
            this.velocity = { x: vx * this.speed * 0.7, y: vy * this.speed * 0.7 };
        }
    }

    moveTo(tx, ty, speedMult) {
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
            this.velocity = {
                x: (dx / dist) * this.speed * speedMult,
                y: (dy / dist) * this.speed * speedMult
            };
        }
    }

    hasLineOfSight(target, obstacles) {
        // Raycast Check
        // Line segment from this to target
        const x1 = this.x, y1 = this.y;
        const x2 = target.x, y2 = target.y;

        for (const obs of obstacles) {
            // Simple Circle-Line intersection check for simplicity
            // OR AABB check if building is rect.
            // Let's use Rect check for Buildings.
            const hw = (obs.width || obs.radius*2) / 2;
            const hl = (obs.length || obs.radius*2) / 2;

            // Check if line intersects rect (obs.x-hw, obs.y-hl, 2*hw, 2*hl)
            // Simplified: Check if center of obstacle is too close to line

            // Vector Line
            const ldx = x2 - x1;
            const ldy = y2 - y1;
            const lenSq = ldx*ldx + ldy*ldy;

            // Project obstacle center onto line
            // t = dot(obs-start, line) / lenSq
            let t = ((obs.x - x1) * ldx + (obs.y - y1) * ldy) / lenSq;

            // Clamp t to segment [0,1]
            t = Math.max(0, Math.min(1, t));

            const px = x1 + t * ldx;
            const py = y1 + t * ldy;

            const distSq = (obs.x - px)**2 + (obs.y - py)**2;

            // If distance to line is less than obstacle radius/size
            // Use average size of obstacle
            const obsSize = (hw + hl) / 2;
            if (distSq < obsSize * obsSize) {
                return false; // Blocked
            }
        }
        return true;
    }
}
