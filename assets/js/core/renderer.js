export default class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        // Configuration
        this.gridSize = 100;
        this.gridColor = '#2a2a2a'; // Dark grey lines
        this.floorColor = '#111'; // Almost black asphalt
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
        this.clear();

        this.ctx.save();

        // 0. Update Parallax Background (CSS)
        this.updateParallax(camera);

        // 1. Apply Camera Transform
        this.ctx.translate(this.width / 2, this.height / 2);
        this.ctx.scale(camera.zoom, camera.zoom);
        this.ctx.translate(-camera.x, -camera.y);

        // Calculate Viewport Bounds for Culling
        const vpW = this.width / camera.zoom;
        const vpH = this.height / camera.zoom;
        const viewLeft = camera.x - vpW / 2 - 100;
        const viewRight = camera.x + vpW / 2 + 100;
        const viewTop = camera.y - vpH / 2 - 100;
        const viewBottom = camera.y + vpH / 2 + 100;

        // Helper to check visibility
        const isVisible = (e) => {
            const r = e.radius || Math.max(e.width || 0, e.height || 0) || 50;
            return (e.x + r > viewLeft && e.x - r < viewRight &&
                    e.y + r > viewTop && e.y - r < viewBottom);
        };

        // 2. Draw Floor (The City Grid)
        this.drawFloor(camera);

        // 3. Draw Holes (Players/Bots) -> The "Void" Effect
        this.ctx.globalCompositeOperation = 'destination-out';

        entities.forEach(entity => {
            if (entity.type === 'hole') {
                if (isVisible(entity)) this.drawHole(entity);
            }
        });

        // 4. Draw Props & Particles (Sorted by Y for Depth)
        this.ctx.globalCompositeOperation = 'source-over';

        // Filter visible entities first to avoid sorting unnecessary objects
        const visibleEntities = entities.filter(e => {
            if (e.type === 'floating_text') return false; // Handled later
            return isVisible(e);
        });

        // Sort by Y position (Z-index simulation)
        visibleEntities.sort((a, b) => a.y - b.y);

        visibleEntities.forEach(entity => {
            if (entity.type !== 'hole') { // Props, particles
                entity.draw(this.ctx);
            } else {
                // Draw the rim/glow of the hole on top
                this.drawHoleRim(entity);
            }
        });

        // Draw UI entities (Floating Text) last
        entities.forEach(entity => {
            if (entity.type === 'floating_text') {
                // Floating text might move, but check origin
                if (isVisible(entity)) entity.draw(this.ctx);
            }
        });

        this.ctx.restore();
    }

    drawFloor(camera) {
        // Calculate visible bounds
        const viewportWidth = this.width / camera.zoom;
        const viewportHeight = this.height / camera.zoom;
        const startX = camera.x - viewportWidth / 2;
        const startY = camera.y - viewportHeight / 2;
        const endX = startX + viewportWidth;
        const endY = startY + viewportHeight;

        // Snap to grid
        const gridStartX = Math.floor(startX / this.gridSize) * this.gridSize;
        const gridStartY = Math.floor(startY / this.gridSize) * this.gridSize;

        this.ctx.fillStyle = this.floorColor;
        // Optimization: Draw one big rectangle for the floor?
        // Or just let the background be the floor color?
        // If we use destination-out, the canvas must have content to erase.
        // So we MUST fill the canvas with the floor color first.

        // Since we are transformed, we can just draw a huge rect covering the view
        this.ctx.fillRect(startX - 100, startY - 100, viewportWidth + 200, viewportHeight + 200);

        // Draw Grid Lines
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.gridColor;
        this.ctx.lineWidth = 2;

        for (let x = gridStartX; x <= endX; x += this.gridSize) {
            this.ctx.moveTo(x, startY - 100);
            this.ctx.lineTo(x, endY + 100);
        }

        for (let y = gridStartY; y <= endY; y += this.gridSize) {
            this.ctx.moveTo(startX - 100, y);
            this.ctx.lineTo(endX + 100, y);
        }

        this.ctx.stroke();
    }

    updateParallax(camera) {
        const bg = document.getElementById('abyss-background');
        if (bg) {
            // Move background slower than camera (e.g., 10% speed)
            const offsetX = -camera.x * 0.1;
            const offsetY = -camera.y * 0.1;
            bg.style.backgroundPosition = `${offsetX}px ${offsetY}px`;
        }
    }

    drawHole(entity) {
        // The actual "cut"
        this.ctx.beginPath();
        this.drawShape(entity.x, entity.y, entity.radius, entity.shape);
        this.ctx.fill();
    }

    drawHoleRim(entity) {
        // 1. Draw Depth Gradient (Inner Shadow)
        // This gives the illusion of a deep pit
        const depthGrad = this.ctx.createRadialGradient(entity.x, entity.y, entity.radius * 0.7, entity.x, entity.y, entity.radius);
        depthGrad.addColorStop(0, 'rgba(0,0,0,0)');
        depthGrad.addColorStop(0.8, 'rgba(0,0,0,0.4)');
        depthGrad.addColorStop(1, 'rgba(0,0,0,0.8)');

        this.ctx.fillStyle = depthGrad;
        this.ctx.beginPath();
        this.drawShape(entity.x, entity.y, entity.radius, entity.shape);
        this.ctx.fill();

        // 2. Draw Swirl (Depth Animation)
        this.ctx.save();
        this.ctx.translate(entity.x, entity.y);

        // Clip to hole shape
        this.ctx.beginPath();
        this.drawShape(0, 0, entity.radius, entity.shape, 0, 0);
        this.ctx.clip();

        if (entity.type === 'hole') {
             const swirlCount = 6;
             const swirlRotation = entity.swirlRotation || 0;

             this.ctx.lineWidth = Math.max(2, entity.radius * 0.05);
             this.ctx.strokeStyle = entity.color || '#00f3ff';
             this.ctx.globalAlpha = 0.4;
             this.ctx.shadowBlur = 10;
             this.ctx.shadowColor = entity.color;

             for(let i=0; i<swirlCount; i++) {
                 this.ctx.beginPath();
                 const angle = (i / swirlCount) * Math.PI * 2 + swirlRotation;
                 const x = Math.cos(angle) * entity.radius * 0.2;
                 const y = Math.sin(angle) * entity.radius * 0.2;

                 this.ctx.moveTo(x, y);
                 // Spiral out
                 this.ctx.quadraticCurveTo(
                     Math.cos(angle + 1.5) * entity.radius * 0.7,
                     Math.sin(angle + 1.5) * entity.radius * 0.7,
                     Math.cos(angle + 2.5) * entity.radius * 1.2,
                     Math.sin(angle + 2.5) * entity.radius * 1.2
                 );
                 this.ctx.stroke();
             }
        }
        this.ctx.restore();

        // 3. Draw Trail
        if (entity.trail) {
            entity.trail.forEach(t => {
                this.ctx.globalAlpha = t.a * 0.3;
                this.ctx.beginPath();
                this.drawShape(0, 0, t.r, entity.shape, t.x, t.y); // Pass coords
                this.ctx.fillStyle = entity.color;
                this.ctx.fill();
            });
            this.ctx.globalAlpha = 1.0;
        }

        // 4. Draw Neon Rings (Animated)
        const time = Date.now() * 0.001;

        this.ctx.save();
        this.ctx.translate(entity.x, entity.y);

        // Ring 1: Main Glow (Rotates slowly)
        this.ctx.rotate(time);
        this.ctx.beginPath();
        this.drawShape(0, 0, entity.radius, entity.shape, 0, 0); // Local coords 0,0

        this.ctx.strokeStyle = entity.color || '#00f3ff';
        this.ctx.lineWidth = 6;

        // Intense Neon Glow
        this.ctx.shadowBlur = 30;
        this.ctx.shadowColor = entity.color || '#00f3ff';

        this.ctx.stroke();

        // Second pass for core brightness (Hot white center)
        this.ctx.shadowBlur = 10;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Restore base color for next operations
        this.ctx.strokeStyle = entity.color || '#00f3ff';

        // Ring 2: Inner Detail (Rotates fast opposite)
        this.ctx.rotate(-time * 2.5);
        this.ctx.beginPath();
        this.drawShape(0, 0, entity.radius * 0.85, entity.shape, 0, 0);
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.7;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.stroke();

        this.ctx.restore();

        // 5. Draw Name
        if (entity.name) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px Montserrat';
            this.ctx.textAlign = 'center';
            this.ctx.shadowBlur = 4;
            this.ctx.shadowColor = '#000';
            this.ctx.fillText(entity.name, entity.x, entity.y - entity.radius - 20);
            this.ctx.shadowBlur = 0;
        }

        // 6. Draw Police Siren
        if (entity.isPolice) {
            this.drawSiren(entity);
        }
    }

    drawSiren(entity) {
        const time = Date.now() * 0.005; // Faster rotation
        this.ctx.save();
        this.ctx.translate(entity.x, entity.y);
        this.ctx.rotate(time);

        // Blue Light Cone
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.arc(0, 0, entity.radius * 2, -0.5, 0.5);
        this.ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
        this.ctx.fill();

        // Red Light Cone (Opposite)
        this.ctx.rotate(Math.PI);
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.arc(0, 0, entity.radius * 2, -0.5, 0.5);
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        this.ctx.fill();

        this.ctx.restore();
    }

    // Updated to accept coordinates explicitly or default
    drawShape(x, y, r, type, cx = x, cy = y) {
        // If cx, cy are passed, use them (for local transform)
        // But the original method used x,y.
        // My new call passes 0,0 as x,y and relies on translate.
        // The Trail calls passed t.x, t.y.

        // Let's standardise: x,y are center.

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
            const angle = i * step - Math.PI / 2; // Start at top
            if (i===0) this.ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
            else this.ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        }
        this.ctx.closePath();
    }
}
