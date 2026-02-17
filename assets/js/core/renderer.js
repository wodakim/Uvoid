export default class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.gridSize = 100;
        this.gridColor = '#2a2a2a';
        this.floorColor = '#111';
        this.visualEffects = true; // Cached setting
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    render(entities, camera) {
        // Cache setting once per frame
        this.visualEffects = (window.app && window.app.settingsManager) ? window.app.settingsManager.get('visualEffects') : true;

        this.clear();
        this.ctx.save();
        this.updateParallax(camera);

        // Camera Transform
        this.ctx.translate(this.width / 2, this.height / 2);
        this.ctx.scale(camera.zoom, camera.zoom);
        this.ctx.translate(-camera.x, -camera.y);

        // Culling bounds
        const vpW = this.width / camera.zoom;
        const vpH = this.height / camera.zoom;
        const viewLeft = camera.x - vpW / 2 - 150;
        const viewRight = camera.x + vpW / 2 + 150;
        const viewTop = camera.y - vpH / 2 - 150;
        const viewBottom = camera.y + vpH / 2 + 150;

        const isVisible = (e) => {
            const r = e.radius || Math.max(e.width || 0, e.height || 0) || 50;
            return (e.x + r > viewLeft && e.x - r < viewRight &&
                    e.y + r > viewTop && e.y - r < viewBottom);
        };

        this.drawFloor(camera);

        // 1. Draw "Void" Cuts (Holes)
        this.ctx.globalCompositeOperation = 'destination-out';
        entities.forEach(entity => {
            if (entity.type === 'hole' && isVisible(entity)) {
                this.drawHole(entity);
            }
        });

        // 2. Draw Props, Particles, Shockwaves
        this.ctx.globalCompositeOperation = 'source-over';

        // Optimize sort: Only sort visible props/particles
        const renderList = [];
        const holes = [];
        const uiElements = [];

        for (const e of entities) {
            if (e.type === 'floating_text') {
                uiElements.push(e);
                continue;
            }
            if (e.type === 'hole') {
                holes.push(e);
                continue; // Holes handled separately for Rim
            }
            if (isVisible(e)) {
                renderList.push(e);
            }
        }

        renderList.sort((a, b) => a.y - b.y);

        // Draw everything under holes? No, holes are "under" everything visually (abyss) but rendered via destination-out.
        // But Rims are on top.

        // Draw standard entities
        renderList.forEach(e => e.draw(this.ctx));

        // Draw Hole Rims & Glows (On top of props falling in?)
        // If prop falls in, it gets clipped by destination-out?
        // Actually, canvas compositing is tricky.
        // 'destination-out' erases everything drawn BEFORE it.
        // So we drew floor -> erased holes. Floor has holes.
        // Now we draw props on top. Props over holes are visible over the "void" background (CSS).
        // To make props "fall into" the void, they must be clipped or masked?
        // Or we just draw them, and the void background is behind the canvas.
        // If we draw a prop over the hole area, it looks like it's floating over space. Correct.
        // But we want it to look like it's INSIDE.
        // That requires complex masking or z-indexing.
        // For hyper-casual, just shrinking/darkening (handled in Physics) is usually enough.

        holes.forEach(h => {
            if (isVisible(h)) this.drawHoleRim(h);
        });

        // Draw UI
        uiElements.forEach(e => e.draw(this.ctx));

        this.ctx.restore();
    }

    drawFloor(camera) {
        const viewportWidth = this.width / camera.zoom;
        const viewportHeight = this.height / camera.zoom;
        const startX = camera.x - viewportWidth / 2;
        const startY = camera.y - viewportHeight / 2;
        const endX = startX + viewportWidth;
        const endY = startY + viewportHeight;

        // Draw massive floor rect
        this.ctx.fillStyle = this.floorColor;
        this.ctx.fillRect(startX - 100, startY - 100, viewportWidth + 200, viewportHeight + 200);

        if (this.visualEffects) {
            // Draw Grid
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.gridColor;
            this.ctx.lineWidth = 2;
            const gs = this.gridSize;

            const gridStartX = Math.floor(startX / gs) * gs;
            const gridStartY = Math.floor(startY / gs) * gs;

            for (let x = gridStartX; x <= endX; x += gs) {
                this.ctx.moveTo(x, startY - 100);
                this.ctx.lineTo(x, endY + 100);
            }
            for (let y = gridStartY; y <= endY; y += gs) {
                this.ctx.moveTo(startX - 100, y);
                this.ctx.lineTo(endX + 100, y);
            }
            this.ctx.stroke();
        }
    }

    updateParallax(camera) {
        const bg = document.getElementById('abyss-background');
        if (bg) {
            const offsetX = -camera.x * 0.1;
            const offsetY = -camera.y * 0.1;
            bg.style.backgroundPosition = `${offsetX}px ${offsetY}px`;
        }
    }

    drawHole(entity) {
        this.ctx.beginPath();
        this.drawShape(entity.x, entity.y, entity.radius, entity.shape);
        this.ctx.fill();
    }

    drawHoleRim(entity) {
        const x = entity.x;
        const y = entity.y;
        const r = entity.radius;

        // 1. Inner Shadow (Depth)
        if (this.visualEffects) {
            const grad = this.ctx.createRadialGradient(x, y, r * 0.5, x, y, r);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.8, 'rgba(0,0,0,0.6)');
            grad.addColorStop(1, 'rgba(0,0,0,0.9)'); // Darker edge
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.drawShape(x, y, r, entity.shape);
            this.ctx.fill();
        }

        // 2. Neon Rim / Glow
        this.ctx.save();
        this.ctx.translate(x, y);

        // Rotating Elements
        const time = Date.now() * 0.001;

        // Main Rim
        this.ctx.beginPath();
        this.drawShape(0, 0, r, entity.shape, 0, 0);
        this.ctx.lineWidth = this.visualEffects ? 5 : 3;
        this.ctx.strokeStyle = entity.color || '#00f3ff';
        if (this.visualEffects) {
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = entity.color;
        }
        this.ctx.stroke();

        // Secondary "Cyber" Ring (Rotating)
        if (this.visualEffects) {
            this.ctx.rotate(time);
            this.ctx.beginPath();
            // Dashed line effect
            this.ctx.setLineDash([20, 15]);
            this.drawShape(0, 0, r * 1.1, entity.shape, 0, 0);
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = 0.6;
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            // Inner Swirl Animation
            this.ctx.rotate(-time * 1.5);
            this.ctx.globalAlpha = 0.3;
            this.ctx.beginPath();
            this.drawShape(0, 0, r * 0.8, entity.shape, 0, 0);
            this.ctx.stroke();
        }

        this.ctx.restore();

        // Name Tag
        if (entity.name) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px Montserrat';
            this.ctx.textAlign = 'center';
            this.ctx.shadowBlur = 4;
            this.ctx.shadowColor = '#000';
            this.ctx.fillText(entity.name, x, y - r - 25);
            this.ctx.shadowBlur = 0;
        }
    }

    drawShape(x, y, r, type, cx = x, cy = y) {
        if (type === 'square') {
            const side = r * Math.sqrt(2);
            this.ctx.rect(cx - side/2, cy - side/2, side, side);
        } else if (type === 'star') {
            this.drawStar(cx, cy, 5, r, r/2);
        } else if (type === 'gear') {
             this.drawGear(cx, cy, 8, r, r * 0.8);
        } else {
            this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
        }
    }

    drawStar(cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            this.ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
        }
        this.ctx.lineTo(cx, cy - outerRadius);
        this.ctx.closePath();
    }

    drawGear(cx, cy, teeth, outerRadius, innerRadius) {
        const step = (Math.PI * 2) / (teeth * 2);

        for (let i = 0; i < teeth * 2; i++) {
            const r = (i % 2 === 0) ? outerRadius : innerRadius;
            const angle = i * step - Math.PI / 2;
            if (i===0) this.ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
            else this.ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        }
        this.ctx.closePath();
    }
}
