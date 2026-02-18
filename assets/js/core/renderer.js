export default class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.gridSize = 100;
        this.gridColor = '#333';
        this.floorColor = '#111';
        this.visualEffects = true; // Cached setting
        this.lastTime = performance.now();
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
        // Time Calculation for smooth animation
        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

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
        const viewLeft = camera.x - vpW / 2 - 250; // Extra buffer for 3D extrusion
        const viewRight = camera.x + vpW / 2 + 250;
        const viewTop = camera.y - vpH / 2 - 250;
        const viewBottom = camera.y + vpH / 2 + 250;

        const isVisible = (e) => {
            // Check if entity or its shadow/extrusion is visible
            const r = e.radius || Math.max(e.width || 0, e.height || 0) || 50;
            // Add margin for 3D height
            const margin = e.height3d ? e.height3d * 1.5 : 0;
            return (e.x + r + margin > viewLeft && e.x - r - margin < viewRight &&
                    e.y + r + margin > viewTop && e.y - r - margin < viewBottom);
        };

        // Categorize Entities
        const holes = [];
        const dyingProps = [];
        const aliveProps = [];
        const uiElements = [];

        entities.forEach(e => {
            if (e.type === 'hole') {
                holes.push(e);
            } else if (e.type === 'floating_text') {
                uiElements.push(e);
            } else if (e.isDying) {
                // Update dying animation state here
                this.updateDyingEntity(e, dt);
                dyingProps.push(e);
            } else if (e.type === 'prop' || e.type === 'powerup' || e.type === 'particle') {
                if (isVisible(e)) aliveProps.push(e);
            }
        });

        // 1. Draw Floor (Dark Grid)
        this.drawFloor(camera);

        // 2. Draw Holes (The Pit) - Background of the hole
        holes.forEach(hole => {
            if (isVisible(hole)) this.drawHole(hole);
        });

        // 3. The Masking Trick (Clipping)
        // We want dying objects to look like they are falling INTO the holes.
        // We clip the drawing area to the holes' shapes.
        if (dyingProps.length > 0) {
            this.ctx.save();
            this.ctx.beginPath();
            holes.forEach(hole => {
                 this.drawShapePath(hole.x, hole.y, hole.radius, hole.shape);
            });
            this.ctx.clip();

            // Draw falling objects inside the clip
            dyingProps.forEach(e => {
                 // No shadow for falling objects usually, or shadow on the "void" wall?
                 // Just draw them.
                 e.draw(this.ctx);
            });

            this.ctx.restore();
        }

        // 4. Draw Hole Rims (Neon Overlay)
        // Drawn BEFORE Alive Objects so buildings cover the rim if they overlap.
        // This ensures the "3D Depth" illusion is maintained.
        holes.forEach(h => {
             if (isVisible(h)) this.drawHoleRim(h);
        });

        // 5. Draw Alive Objects (On top of floor, can cover holes)
        // Painter's Algorithm based on Bottom Y (y + height/2 or radius)
        aliveProps.sort((a, b) => {
            const ha = a.height || a.radius*2 || 0;
            const hb = b.height || b.radius*2 || 0;
            const bottomA = a.y + ha/2;
            const bottomB = b.y + hb/2;
            return bottomA - bottomB;
        });

        aliveProps.forEach(e => {
            if (e.type === 'prop' && (e.propType === 'building' || e.propType === 'shelter' || e.propType === 'kiosk')) {
                this.drawBuilding3D(e, camera);
            } else {
                // Regular draw for cars, humans, etc. (maybe add simple 3D effect later?)
                // For now, use their 2D draw but maybe add shadow
                this.drawEntityWithShadow(e);
            }
        });

        // Draw UI
        uiElements.forEach(e => e.draw(this.ctx));

        // Police Alert Overlay (Minimap Border or Screen Flash)
        // Check if player is hunted
        const player = entities.find(e => e.isPlayer);
        if (player && player.isHunted) {
             this.drawPoliceAlert(player);
        }

        this.ctx.restore();
    }

    drawPoliceAlert(player) {
        // Flashing Border on Screen edges
        const time = Date.now();
        const flash = (Math.floor(time / 250) % 2 === 0);
        const color = flash ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 0, 255, 0.3)';

        this.ctx.save();
        this.ctx.fillStyle = color;
        // Draw 20px border
        this.ctx.fillRect(0, 0, this.width, 20); // Top
        this.ctx.fillRect(0, this.height - 20, this.width, 20); // Bottom
        this.ctx.fillRect(0, 0, 20, this.height); // Left
        this.ctx.fillRect(this.width - 20, 0, 20, this.height); // Right

        // "WANTED" Text
        if (flash) {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '900 40px Montserrat';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText("WANTED", this.width / 2, 80);
        }
        this.ctx.restore();
    }

    updateDyingEntity(e, dt) {
        e.dyingProgress = (e.dyingProgress || 0) + dt * 1.5; // Animation speed

        if (e.dyingProgress > 1) e.dyingProgress = 1;

        const t = e.dyingProgress;

        // Lerp Position towards Hole Center
        if (e.targetHole) {
            e.x = e.x + (e.targetHole.x - e.x) * dt * 3;
            e.y = e.y + (e.targetHole.y - e.y) * dt * 3;
        }

        // Scale Down
        const startScale = e.initialScale || 1; // Assuming 1 if not set
        e.scale = startScale * (1 - t);

        // Rotate
        e.rotation = (e.rotation || 0) + dt * 10;
    }

    drawFloor(camera) {
        const viewportWidth = this.width / camera.zoom;
        const viewportHeight = this.height / camera.zoom;
        const startX = camera.x - viewportWidth / 2;
        const startY = camera.y - viewportHeight / 2;
        const endX = startX + viewportWidth;
        const endY = startY + viewportHeight;

        // Draw Dark Floor
        this.ctx.fillStyle = '#0a0a10'; // Darker "Void-like" floor
        this.ctx.fillRect(startX - 100, startY - 100, viewportWidth + 200, viewportHeight + 200);

        if (this.visualEffects) {
            // Draw Grid
            this.ctx.beginPath();
            this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)'; // Very subtle cyan
            this.ctx.lineWidth = 1;
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
            const offsetX = -camera.x * 0.05;
            const offsetY = -camera.y * 0.05;
            bg.style.backgroundPosition = `${offsetX}px ${offsetY}px`;
        }
    }

    drawHole(entity) {
        const r = entity.radius;
        // Cyberpunk Hole: Radial Gradient
        const grad = this.ctx.createRadialGradient(entity.x, entity.y, 0, entity.x, entity.y, r);
        grad.addColorStop(0, '#000000'); // Deep Black Center
        grad.addColorStop(0.8, '#0a0a0a'); // Dark Grey
        grad.addColorStop(1, '#111111'); // Edge

        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.drawShapePath(entity.x, entity.y, r, entity.shape);
        this.ctx.fill();

        // Internal Rotation Effect (Singularity)
        if (this.visualEffects) {
            this.ctx.save();
            this.ctx.translate(entity.x, entity.y);
            this.ctx.rotate(Date.now() * 0.0005);

            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            // Draw a spiral or concentric circles
            for(let i=1; i<4; i++) {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, r * (i/4), 0, Math.PI * 2);
                this.ctx.stroke();
            }

            this.ctx.restore();
        }
    }

    drawHoleRim(entity) {
        const r = entity.radius;
        const color = entity.color || '#00f3ff';
        const time = Date.now();
        const pulse = Math.sin(time * 0.005) * 5 + 15; // 10 to 20

        this.ctx.save();
        this.ctx.translate(entity.x, entity.y);

        // Neon Glow
        if (this.visualEffects) {
            this.ctx.shadowBlur = pulse;
            this.ctx.shadowColor = color;
        }

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.drawShapePath(0, 0, r, entity.shape); // Local coords 0,0
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawEntityWithShadow(entity) {
        // Simple shadow
        this.ctx.save();
        this.ctx.translate(entity.x + 5, entity.y + 5);
        this.ctx.scale(entity.scale || 1, entity.scale || 1);
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, entity.radius, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.restore();

        entity.draw(this.ctx);
    }

    drawBuilding3D(entity, camera) {
        // Central Perspective Projection (Fisheye Adjusted)
        const viewCenterX = camera.x;
        const viewCenterY = camera.y;

        const vecX = entity.x - viewCenterX;
        const vecY = entity.y - viewCenterY;

        // Height Clamping (Max visual height 150px) as requested
        const h = Math.min(entity.height || 50, 150);

        // Height Factor (0.25 equivalent logic)
        // If vec is e.g. 100px, and we want a subtle shift.
        // Using User's "heightFactor = 0.25" concept but applied to height.
        // Let's assume heightFactor is derived from h.
        // If h=150, we want a noticeable but not overwhelming shift.
        // 150 * 0.0025 = 0.375 factor. Shift = vec * 0.375.
        // If vec=200, shift=75. That's good.

        const extrusionConstant = 0.0025;
        const heightFactor = h * extrusionConstant;

        const roofX = entity.x + (vecX * heightFactor);
        const roofY = entity.y + (vecY * heightFactor);

        const shiftX = roofX - entity.x;
        const shiftY = roofY - entity.y;

        const w = entity.width || entity.radius * 2;
        const len = entity.length || entity.radius * 2;

        const x = entity.x;
        const y = entity.y;

        // Draw Base (Shadow/Ground)
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(x - w/2, y - len/2, w, len);

        // Roof Coordinates
        // (Calculated above)

        // Draw Sides
        const corners = [
            { dx: -w/2, dy: -len/2 }, // 0: TL
            { dx: w/2, dy: -len/2 },  // 1: TR
            { dx: w/2, dy: len/2 },   // 2: BR
            { dx: -w/2, dy: len/2 }   // 3: BL
        ];

        this.ctx.fillStyle = this.darkenColor(entity.color, -40); // Darker sides
        this.ctx.strokeStyle = entity.color;
        this.ctx.lineWidth = 1;

        const drawFace = (idx1, idx2) => {
            const c1 = corners[idx1];
            const c2 = corners[idx2];
            this.ctx.beginPath();
            this.ctx.moveTo(x + c1.dx, y + c1.dy); // Base 1
            this.ctx.lineTo(roofX + c1.dx, roofY + c1.dy); // Roof 1
            this.ctx.lineTo(roofX + c2.dx, roofY + c2.dy); // Roof 2
            this.ctx.lineTo(x + c2.dx, y + c2.dy); // Base 2
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        };

        // Determine visible faces based on shift direction (Painter's Algorithm)
        if (shiftX > 0) drawFace(3, 0); // BL -> TL (Left Face)
        if (shiftX < 0) drawFace(1, 2); // TR -> BR (Right Face)
        if (shiftY > 0) drawFace(0, 1); // TL -> TR (Top Face)
        if (shiftY < 0) drawFace(2, 3); // BR -> BL (Bottom Face)

        // Draw Roof
        this.ctx.fillStyle = entity.color;
        this.ctx.fillRect(roofX - w/2, roofY - len/2, w, len);

        // Roof Border/Detail
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.3;
        this.ctx.strokeRect(roofX - w/2, roofY - len/2, w, len);
        this.ctx.globalAlpha = 1.0;

        // Text/Logo on Roof
        if (entity.propType === 'kiosk') {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('KIOSK', roofX, roofY + 4);
        }
    }

    drawShapePath(x, y, r, type) {
        if (type === 'square') {
            const side = r * Math.sqrt(2);
            this.ctx.rect(x - side/2, y - side/2, side, side);
        } else if (type === 'star') {
            this.drawStarPath(x, y, 5, r, r/2);
        } else if (type === 'gear') {
             this.drawGearPath(x, y, 8, r, r * 0.8);
        } else {
            this.ctx.arc(x, y, r, 0, Math.PI * 2);
        }
    }

    drawStarPath(cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

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

    drawGearPath(cx, cy, teeth, outerRadius, innerRadius) {
        const step = (Math.PI * 2) / (teeth * 2);

        for (let i = 0; i < teeth * 2; i++) {
            const r = (i % 2 === 0) ? outerRadius : innerRadius;
            const angle = i * step - Math.PI / 2;
            if (i===0) this.ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
            else this.ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        }
        this.ctx.closePath();
    }

    darkenColor(color, percent) {
        // Helper to darken hex color
        // Assuming hex input
        if (color[0] === '#') {
             let num = parseInt(color.slice(1), 16);
             let amt = Math.round(2.55 * percent);
             let R = (num >> 16) + amt;
             let G = (num >> 8 & 0x00FF) + amt;
             let B = (num & 0x0000FF) + amt;
             return '#' + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
        }
        return color; // Fallback
    }
}
