import Entity from './entity.js';

export default class Particle extends Entity {
    constructor(x, y, color) {
        super(x, y, 4 + Math.random() * 6, color); // Bigger, juicier debris
        this.type = 'particle';

        // Random Explosion Angle with Bias away from center? No, random is fine.
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 300 + 100; // Faster explosion

        this.velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };

        // Fake "Z" axis for bouncing
        this.z = 0;
        this.vz = Math.random() * 200 + 100; // Upward toss
        this.gravity = 800;

        this.maxLife = 0.8 + Math.random() * 0.5;
        this.life = this.maxLife;
        this.originalRadius = this.radius;

        // Juicy details
        const shapes = ['square', 'triangle', 'shard'];
        this.shape = shapes[Math.floor(Math.random() * shapes.length)];
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 15; // Fast spin
    }

    update(dt) {
        this.life -= dt;
        if (this.life <= 0) {
            this.markedForDeletion = true;
            return;
        }

        // Physics
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;

        // Fake Gravity (Bouncing effect)
        this.z += this.vz * dt;
        this.vz -= this.gravity * dt;

        if (this.z < 0) {
            this.z = 0;
            this.vz *= -0.5; // Bounce dampening
            this.velocity.x *= 0.8; // Ground friction
            this.velocity.y *= 0.8;
        }

        this.rotation += this.rotationSpeed * dt;

        // Friction / Air resistance
        this.velocity.x *= 0.96;
        this.velocity.y *= 0.96;

        // Shrink
        // Maintain size until very end, then pop
        if (this.life < 0.2) {
             this.radius = this.originalRadius * (this.life / 0.2);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, (this.life / this.maxLife) * 0.8);

        // Apply Z offset for bounce visual
        ctx.translate(this.x, this.y - this.z);

        ctx.rotate(this.rotation);

        // Neon Glow Effect
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        // Simplified shapes
        if (this.shape === 'square') {
            ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else if (this.shape === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(this.radius, this.radius);
            ctx.lineTo(-this.radius, this.radius);
            ctx.fill();
        } else {
            // Shard
            ctx.fillRect(-this.radius/2, -this.radius, this.radius, this.radius * 2);
        }

        ctx.restore();
    }
}
