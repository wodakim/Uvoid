import Entity from './entity.js';

export default class Prop extends Entity {
    // Static configuration for Prop Types
    static TYPES = {
        // Tier 1: Trash / Small Objects (Eatable by 15-20)
        'bottle': { radius: 5, value: 1, color: '#33ff33', isSolid: false, height: 10 },
        'cone':   { radius: 8, value: 2, color: '#ffae00', isSolid: false, height: 15 },
        'mailbox':{ radius: 10, value: 5, color: '#0055ff', isSolid: true, height: 15 },

        // Tier 2: Street Furniture (Eatable by 20-30)
        'pole':   { radius: 12, value: 10, color: '#888888', isSolid: true, height: 60 }, // Buffed
        'fence':  { radius: 15, value: 15, color: '#aaaaaa', isSolid: true, height: 20 }, // Buffed
        'trash_bin': { radius: 18, value: 20, color: '#225522', isSolid: true, height: 20 }, // Buffed

        // Tier 3: Living Beings (Eatable by 30-40)
        'human':  { radius: 18, value: 25, color: '#ffccaa', isSolid: false, height: 35 }, // Buffed
        'bench':  { radius: 20, value: 30, color: '#8B4513', isSolid: true, height: 15 }, // Buffed
        'motorcycle': { radius: 28, value: 50, color: '#ff0000', isSolid: false, height: 20 }, // Buffed

        // Tier 3.5: Small Structures / Kiosks (Eatable by 40-50)
        'kiosk':  { radius: 35, value: 80, color: '#ff0055', isSolid: true, height: 40 }, // Buffed

        // Tier 4: Vehicles (Eatable by 50-70)
        'car':    { radius: 45, value: 100, color: 'random', isSolid: false, height: 25 }, // Buffed
        'van':    { radius: 55, value: 150, color: '#ffffff', isSolid: false, height: 35 },

        // Tier 5: Large Vehicles (Eatable by 70-100)
        'bus':    { radius: 60, value: 200, color: '#ffae00', isSolid: false, height: 50 },
        'truck':  { radius: 70, value: 250, color: '#ffffff', isSolid: false, height: 60 },

        'shelter':{ radius: 80, value: 400, color: '#444444', isSolid: true, height: 50 }, // Buffed

        // Tier 6: Buildings (Eatable by 250+)
        'building': { radius: 200, value: 2500, color: 'random', isSolid: true, height: 300 } // Huge Buff
    };

    constructor(x, y, type) {
        const config = Prop.TYPES[type] || Prop.TYPES['bottle'];
        const radius = config.radius;
        let color = config.color;

        if (color === 'random') {
            if (type === 'car') {
                const colors = ['#ff0055', '#0055ff', '#00ffaa', '#aa00ff', '#ffffff'];
                color = colors[Math.floor(Math.random() * colors.length)];
            } else if (type === 'building') {
                const bColors = ['#00ffff', '#ff00ff', '#39ff14', '#ffffff'];
                color = bColors[Math.floor(Math.random() * bColors.length)];
            }
        }

        super(x, y, radius, color);

        this.type = 'prop';
        this.propType = type;
        this.value = config.value;
        this.height = config.height;
        this.isSolid = config.isSolid;

        // Derived dimensions for drawing
        this.width = radius * 2;
        if (['car', 'bus', 'truck', 'van', 'motorcycle'].includes(type)) {
            this.length = radius * 2.5;
            this.width = radius * 1.2;
            if (type === 'motorcycle') {
                this.length = radius * 2;
                this.width = radius * 0.8;
            }
        } else if (['building', 'kiosk'].includes(type)) {
            this.width = radius * 2;
            this.length = radius * 2;
        }

        this.scale = 1;
        this.rotation = (['building', 'shelter', 'kiosk'].includes(type)) ? 0 : Math.random() * Math.PI * 2;

        this.shake = { x: 0, y: 0 };
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.shake.x, this.y + this.shake.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);

        if (this.propType === 'bottle') {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 3, 3, 0, 0, Math.PI*2);
            ctx.fill();

            ctx.fillStyle = this.color;
            ctx.fillRect(-2, -8, 4, 8);
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.5;
            ctx.fillRect(-1, -6, 1, 4);
            ctx.globalAlpha = 1;
        }
        else if (this.propType === 'mailbox') {
            ctx.fillStyle = '#0033cc';
            ctx.fillRect(-5, -5, 10, 10); // Base
            ctx.fillStyle = this.color;
            ctx.fillRect(-6, -12, 12, 12); // Box
            ctx.fillStyle = '#fff'; // Slot
            ctx.fillRect(-4, -10, 8, 2);
        }
        else if (this.propType === 'trash_bin') {
            ctx.fillStyle = '#113311';
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI*2);
            ctx.fill();
        }
        else if (this.propType === 'cone') {
             ctx.fillStyle = '#ffae00';
             ctx.beginPath();
             ctx.moveTo(0, -10);
             ctx.arc(0, 0, 6, 0, Math.PI*2);
             ctx.fill();
             ctx.fillStyle = '#ffcc00';
             ctx.beginPath();
             ctx.arc(0, 0, 3, 0, Math.PI*2);
             ctx.fill();
        }
        else if (this.propType === 'pole') {
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 200, 0.5)';
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI*2);
            ctx.fill();
        }
        else if (this.propType === 'human') {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.ellipse(0, 6, 8, 4, 0, 0, Math.PI*2);
            ctx.fill();
        }
        else if (['car', 'bus', 'truck', 'police', 'van', 'motorcycle'].includes(this.propType)) {
             this.drawVehicle(ctx);
        }
        else if (['building', 'kiosk'].includes(this.propType)) {
             this.drawBuilding(ctx);
        }
        else if (this.propType === 'shelter') {
             ctx.fillStyle = 'rgba(0,0,0,0.3)';
             ctx.fillRect(-20, -10, 40, 20);
             ctx.fillStyle = '#888';
             ctx.fillRect(-20, -10, 5, 20);
             ctx.fillRect(15, -10, 5, 20);
             ctx.fillRect(-20, -10, 40, 2);
             ctx.fillStyle = '#444';
             ctx.fillRect(-22, -12, 44, 24);
        }
        else {
             ctx.fillStyle = this.color;
             ctx.beginPath();
             ctx.arc(0, 0, this.radius, 0, Math.PI*2);
             ctx.fill();
        }

        ctx.restore();
    }

    drawVehicle(ctx) {
        const w = this.length || 40;
        const h = this.width || 20;
        const isTruck = this.propType === 'truck';
        const isBus = this.propType === 'bus';
        const isMoto = this.propType === 'motorcycle';

        if (!isMoto) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
            ctx.beginPath();
            ctx.moveTo(w/2, -h/3);
            ctx.lineTo(w/2 + 60, -h);
            ctx.lineTo(w/2 + 60, h);
            ctx.lineTo(w/2, h/3);
            ctx.fill();
        }

        ctx.fillStyle = this.color;
        this.roundRect(ctx, -w/2, -h/2, w, h, isBus ? 2 : (isMoto ? 2 : 5));
        ctx.fill();

        ctx.fillStyle = '#222';
        if (isTruck) {
             ctx.fillRect(w/4, -h/2 + 2, w/4 - 2, h - 4);
        } else if (isMoto) {
             ctx.fillRect(-w/4, -h/4, w/2, h/2); // Seat/Engine
             ctx.fillStyle = '#fff'; // Headlight
             ctx.fillRect(w/2-2, -2, 2, 4);
        } else {
             this.roundRect(ctx, -w/4, -h/2 + 4, w/2, h - 8, 3);
             ctx.fill();
        }
    }

    drawBuilding(ctx) {
        const w = this.width;
        const h = this.length;
        const height3D = this.height;

        const shiftX = 0;
        const shiftY = -height3D / 2;

        // Base Shadow
        // Physics collision uses (x,y) as center.
        // We draw base centered at 0,0.
        // Shadow slightly offset.
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-w/2 + 10, -h/2 + 10, w, h);

        // Roof
        ctx.fillStyle = '#111';
        ctx.fillRect(-w/2 + shiftX, -h/2 + shiftY, w, h);

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.strokeRect(-w/2 + shiftX, -h/2 + shiftY, w, h);

        // Sides
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(-w/2, -h/2);
        ctx.lineTo(-w/2 + shiftX, -h/2 + shiftY);
        ctx.lineTo(w/2 + shiftX, -h/2 + shiftY);
        ctx.lineTo(w/2, -h/2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(-w/2 + shiftX + 10, -h/2 + shiftY + 10, w - 20, h - 20);
        ctx.globalAlpha = 1.0;

    }

    roundRect(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
}
