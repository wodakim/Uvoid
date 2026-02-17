import Entity from './entity.js';

export default class Particle extends Entity {
    constructor(x, y, color) {
        super(x, y, 3 + Math.random() * 5, color); // Slightly larger debris
        this.type = 'particle';
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 200 + 50; // Explosive speed
        this.velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        this.maxLife = 0.6 + Math.random() * 0.4;
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
        }

        // Physics
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;
        this.rotation += this.rotationSpeed * dt;

        // Friction / Air resistance
        this.velocity.x *= 0.95;
        this.velocity.y *= 0.95;

        // Shrink
        this.radius = this.originalRadius * (this.life / this.maxLife);
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, (this.life / this.maxLife) * 0.8);
        ctx.translate(this.x, this.y);
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
