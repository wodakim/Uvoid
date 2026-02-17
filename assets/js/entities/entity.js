export default class Entity {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.markedForDeletion = false;
        this.velocity = { x: 0, y: 0 };
        this.scale = 1;
        this.type = 'entity';
        this.shake = { x: 0, y: 0 };
    }

    update(dt) {
        // Decay shake
        this.shake.x *= 0.8;
        this.shake.y *= 0.8;
        if (Math.abs(this.shake.x) < 0.1) this.shake.x = 0;
        if (Math.abs(this.shake.y) < 0.1) this.shake.y = 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.shake.x, this.shake.y);

        // Base draw logic (Circle)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * this.scale, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.restore();
    }
}
