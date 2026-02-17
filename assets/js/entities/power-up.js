import Entity from './entity.js';

export default class PowerUp extends Entity {
    constructor(x, y, type) {
        super(x, y, 20, '#fff'); // Fixed size
        this.type = 'powerup';
        // Only allow 'speed' for now based on user request to remove magnet/shield
        this.powerType = 'speed';
        this.life = 10; // Disappear after 10s if not picked up
        this.color = '#00ffff'; // Cyan for Speed
    }

    update(dt) {
        this.life -= dt;
        if (this.life <= 0) this.markedForDeletion = true;

        // Float animation
        this.scale = 1 + Math.sin(Date.now() / 200) * 0.2;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.font = 'bold 20px Montserrat';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let label = '⚡'; // Lightning bolt for speed
        ctx.fillText(label, 0, 2);

        // Glow ring
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}
