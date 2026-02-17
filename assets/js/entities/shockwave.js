import Entity from './entity.js';

export default class Shockwave extends Entity {
    constructor(x, y, radius, color = '#fff') {
        super(x, y, radius, color);
        this.type = 'shockwave';
        this.currentRadius = 0;
        this.maxRadius = radius;
        this.width = 20;
        this.life = 0.5; // Seconds
        this.maxLife = 0.5;
    }

    update(dt) {
        this.life -= dt;
        if (this.life <= 0) {
            this.markedForDeletion = true;
            return;
        }

        const progress = 1 - (this.life / this.maxLife);
        // Easing out
        const ease = 1 - Math.pow(1 - progress, 3);

        this.currentRadius = this.maxRadius * ease;
        this.width = 20 * (1 - ease);
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width;
        ctx.globalAlpha = (this.life / this.maxLife);
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.stroke();
        ctx.restore();
    }
}
