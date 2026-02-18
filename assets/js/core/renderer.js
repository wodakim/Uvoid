export default class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency on canvas itself
        this.width = canvas.width;
        this.height = canvas.height;

        // Configuration
        this.gridSize = 100;
        this.floorColor = '#0a0a10'; // Dark Void Floor
        this.gridColor = 'rgba(0, 255, 255, 0.05)'; // Subtle Cyan Lines
        this.visualEffects = true;
        this.lastTime = performance.now();

        // Cache for 2.5D Projection
        this.projectionFactor = 0.4; // How "tall" buildings look (Extrusion strength)
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    clear() {
        this.ctx.fillStyle = this.floorColor;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    render(entities, camera) {
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1); // Cap dt
        this.lastTime = now;

        // Settings check
        this.visualEffects = (window.app && window.app.settingsManager) ? window.app.settingsManager.get('visualEffects') : true;

        this.clear();
        this.ctx.save();

        // 1. Camera Transform
        // Center the camera
        this.ctx.translate(this.width / 2, this.height / 2);
        this.ctx.scale(camera.zoom, camera.zoom);
        this.ctx.translate(-camera.x, -camera.y);

        // Viewport Culling Calculation
        const vpW = this.width / camera.zoom;
        const vpH = this.height / camera.zoom;
        const viewLeft = camera.x - vpW / 2 - 300; // Extra buffer for tall buildings
        const viewRight = camera.x + vpW / 2 + 300;
        const viewTop = camera.y - vpH / 2 - 300;
        const viewBottom = camera.y + vpH / 2 + 300;

        const isVisible = (e) => {
            const size = e.radius || Math.max(e.width || 0, e.height || 0) || 50;
            const margin = (e.height3d || 0) * 1.5; // Account for 3D extrusion
            return (e.x + size + margin > viewLeft &&
                    e.x - size - margin < viewRight &&
                    e.y + size + margin > viewTop &&
                    e.y - size - margin < viewBottom);
        };

        // Categorize Entities
        const holes = [];
        const dyingProps = [];
        const aliveProps = []; // Includes buildings, cars, humans
        const uiElements = [];

        entities.forEach(e => {
            if (e.type === 'hole') {
                holes.push(e);
            } else if (e.type === 'floating_text') {
                uiElements.push(e);
            } else if (e.isDying) {
                this.updateDyingEntity(e, dt);
                dyingProps.push(e);
            } else if (e.type === 'prop' || e.type === 'powerup' || e.type === 'particle') {
                if (isVisible(e)) aliveProps.push(e);
            }
        });

        // --- RENDER PASSES ---

        // Pass 0: Floor & Grid
        this.drawFloor(camera);

        // Pass 1: Holes (The Void) - Background
        holes.forEach(hole => {
            if (isVisible(hole)) this.drawHole(hole);
        });

        // Pass 2: Dying Objects (Clipped inside holes)
        if (dyingProps.length > 0) {
            this.ctx.save();
            this.ctx.beginPath();
            // Create a mask from all holes
            holes.forEach(hole => {
                // Standard circle clip for now (simplest for performance)
                this.ctx.moveTo(hole.x + hole.radius, hole.y);
                this.ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
            });
            this.ctx.clip();

            // Draw falling objects
            dyingProps.forEach(e => {
                this.drawEntitySimple(e); // Simple draw without heavy effects
            });
            this.ctx.restore();
        }

        // Pass 3: Hole Rims (Neon Overlay)
        // Drawn after dying objects but before alive objects (so buildings can cover the rim)
        holes.forEach(h => {
            if (isVisible(h)) this.drawHoleRim(h);
        });

        // Pass 4: Alive Props (Sorted by Y for correct overlap)
        // Sort by 'base Y' (bottom of the object)
        aliveProps.sort((a, b) => {
            const bottomA = a.y + (a.length ? a.length/2 : (a.radius || 0));
            const bottomB = b.y + (b.length ? b.length/2 : (b.radius || 0));
            return bottomA - bottomB;
        });

        aliveProps.forEach(e => {
            if (e.type === 'prop' && (e.propType === 'building' || e.propType === 'kiosk' || e.propType === 'shelter')) {
                this.drawBuilding3D(e, camera);
            } else {
                this.drawEntityWithShadow(e);
            }
        });

        // Pass 5: UI Elements (Floating Text)
        uiElements.forEach(e => e.draw(this.ctx));

        // Pass 6: Police/Wanted Overlay
        const player = entities.find(e => e.isPlayer);
        if (player && player.isHunted) {
             this.drawPoliceAlert(player);
        }

        this.ctx.restore();
    }

    /**
     * Logic: Scale down, Rotate, Move to Center
     */
    updateDyingEntity(e, dt) {
        // Initialize death state if needed
        if (typeof e.deathTimer === 'undefined') {
            e.deathTimer = 0;
            e.initialScale = e.scale || 1;
            e.initialX = e.x;
            e.initialY = e.y;
            e.deathDuration = 0.5; // Seconds to disappear
        }

        e.deathTimer += dt;
        const t = Math.min(e.deathTimer / e.deathDuration, 1);

        // 1. Scale: 1.0 -> 0.0
        e.scale = e.initialScale * (1 - t);

        // 2. Position: Lerp towards hole center
        if (e.targetHole) {
            // Non-linear pull (easier at end)
            const pullFactor = t * t;
            e.x = e.initialX + (e.targetHole.x - e.initialX) * pullFactor;
            e.y = e.initialY + (e.targetHole.y - e.initialY) * pullFactor;
        }

        // 3. Rotation: Spin faster as it shrinks
        e.rotation = (e.rotation || 0) + (10 + t * 20) * dt;
    }

    drawFloor(camera) {
        const viewportWidth = this.width / camera.zoom;
        const viewportHeight = this.height / camera.zoom;
        const startX = camera.x - viewportWidth / 2;
        const startY = camera.y - viewportHeight / 2;
        const endX = startX + viewportWidth;
        const endY = startY + viewportHeight;

        // Base already cleared with dark color in clear()

        if (this.visualEffects) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.gridColor;
            this.ctx.lineWidth = 1;
            const gs = this.gridSize;

            // Snap to grid
            const gridStartX = Math.floor(startX / gs) * gs;
            const gridStartY = Math.floor(startY / gs) * gs;

            // Vertical Lines
            for (let x = gridStartX; x <= endX; x += gs) {
                this.ctx.moveTo(x, startY);
                this.ctx.lineTo(x, endY);
            }
            // Horizontal Lines
            for (let y = gridStartY; y <= endY; y += gs) {
                this.ctx.moveTo(startX, y);
                this.ctx.lineTo(endX, y);
            }
            this.ctx.stroke();
        }
    }

    drawHole(hole) {
        const r = hole.radius;
        // 1. Gradient (Deep Space / Cyberpunk)
        // Center: Black, Edge: Dark Grey/Purple tint?
        const grad = this.ctx.createRadialGradient(hole.x, hole.y, 0, hole.x, hole.y, r);
        grad.addColorStop(0, '#000000'); // Singularity
        grad.addColorStop(0.7, '#050505');
        grad.addColorStop(1, '#111111'); // Rim edge

        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(hole.x, hole.y, r, 0, Math.PI * 2);
        this.ctx.fill();

        // 2. Internal Rotation (Singularity Effect)
        if (this.visualEffects) {
            this.ctx.save();
            this.ctx.translate(hole.x, hole.y);
            // Rotate based on time
            const rotation = Date.now() * 0.001;
            this.ctx.rotate(rotation);

            // Draw faint swirl lines
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            // Draw a spiral-like shape
            for (let i = 0; i < 3; i++) {
                this.ctx.rotate(Math.PI * 2 / 3);
                this.ctx.moveTo(10, 0);
                this.ctx.quadraticCurveTo(r/2, r/2, r - 5, 0);
            }
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    drawHoleRim(hole) {
        const r = hole.radius;
        const color = hole.color || '#00f3ff'; // Default Cyan

        // Pulse Effect
        const time = Date.now();
        const pulse = Math.sin(time * 0.005) * 5 + 15; // Oscillate between 10 and 20

        this.ctx.save();
        this.ctx.translate(hole.x, hole.y);

        // Neon Glow
        if (this.visualEffects) {
            this.ctx.shadowBlur = pulse;
            this.ctx.shadowColor = color;
        }

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawEntitySimple(entity) {
        this.ctx.save();
        this.ctx.translate(entity.x, entity.y);
        this.ctx.rotate(entity.rotation || 0);
        this.ctx.scale(entity.scale || 1, entity.scale || 1);

        // Simple fallback draw if entity.draw is too complex or we just want shape
        if (entity.draw) {
            // Trick: We need to draw it at (0,0) because we already translated
            // But entity.draw might expect absolute coordinates or handle translation itself.
            // Let's check Prop.js: it does `ctx.translate(this.x...)`.
            // So we need to revert our translation OR assume entity.draw handles it.
            // Actually, existing `Prop.draw` handles translation.
            // So we should NOT translate here if we call `entity.draw`.
            // BUT `updateDyingEntity` changes `entity.x/y`.
            // So `entity.draw` will use the updated x/y.

            this.ctx.restore(); // Undo our local transform
            entity.draw(this.ctx); // Let entity draw itself
            return;
        }

        // Fallback shape
        this.ctx.fillStyle = entity.color || '#fff';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, entity.radius || 10, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    drawEntityWithShadow(entity) {
        // Shadow
        this.ctx.save();
        const shadowOffset = 5 * (entity.scale || 1);
        this.ctx.translate(entity.x + shadowOffset, entity.y + shadowOffset);
        this.ctx.scale(entity.scale || 1, entity.scale || 1);

        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.beginPath();
        // Assuming circle for generic shadow
        this.ctx.arc(0, 0, entity.radius, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.restore();

        // Entity
        entity.draw(this.ctx);
    }

    drawBuilding3D(entity, camera) {
        const x = entity.x;
        const y = entity.y;
        const w = entity.width || entity.radius * 2;
        const h = entity.length || entity.radius * 2;
        const height3d = entity.height || 50; // Use entity.height property as 3D height
        const color = entity.color;

        // 1. Calculate Extrusion Vector (Parallax)
        // Vector from Camera Center to Object Center
        const dx = x - camera.x;
        const dy = y - camera.y;

        // Scale vector by projection factor to get Roof Offset
        const roofOffsetX = dx * (this.projectionFactor * (height3d / 300)); // Taller buildings lean more? Or constant?
        // Let's use a constant factor scaled by height slightly
        const factor = 0.2; // 0.2 means roof moves 20% of distance from center
        // But let's clamp it to avoid extreme distortion at edges

        const roofX = x + dx * factor * (height3d / 100);
        const roofY = y + dy * factor * (height3d / 100);

        // 2. Draw Base (Shadow/Ground Anchor)
        this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
        this.ctx.fillRect(x - w/2, y - h/2, w, h);

        // 3. Draw Sides (Connecting Base to Roof)
        // We only draw the sides that are visible.
        // If roof is to the right (dx > 0), we see the LEFT side (connecting left-base to left-roof).
        // Wait. If object is to the Right of camera, we see its Left side. Correct.

        const corners = [
            { x: -w/2, y: -h/2 }, // TL
            { x: w/2, y: -h/2 },  // TR
            { x: w/2, y: h/2 },   // BR
            { x: -w/2, y: h/2 }   // BL
        ];

        // Darken color for sides
        this.ctx.fillStyle = this.adjustColor(color, -40);
        this.ctx.strokeStyle = this.adjustColor(color, -20);
        this.ctx.lineWidth = 1;

        // Helper to draw a quad
        const drawQuad = (c1, c2) => {
            this.ctx.beginPath();
            this.ctx.moveTo(x + c1.x, y + c1.y);         // Base 1
            this.ctx.lineTo(roofX + c1.x, roofY + c1.y); // Roof 1
            this.ctx.lineTo(roofX + c2.x, roofY + c2.y); // Roof 2
            this.ctx.lineTo(x + c2.x, y + c2.y);         // Base 2
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        };

        // Determine visible faces based on shift
        const shiftX = roofX - x;
        const shiftY = roofY - y;

        // Painter's Algorithm for sides:
        // If shiftX > 0 (Roof moved Right), we see Left Face (BL -> TL)
        // If shiftX < 0 (Roof moved Left), we see Right Face (TR -> BR)
        // If shiftY > 0 (Roof moved Down), we see Top Face (TL -> TR)
        // If shiftY < 0 (Roof moved Up), we see Bottom Face (BR -> BL)

        // Note: Order matters? Yes, draw 'back' faces first if we were inside?
        // But here we just draw visible ones. They usually don't overlap much unless extreme.

        if (shiftX > 0) drawQuad(corners[3], corners[0]); // Left
        else if (shiftX < 0) drawQuad(corners[1], corners[2]); // Right

        if (shiftY > 0) drawQuad(corners[0], corners[1]); // Top
        else if (shiftY < 0) drawQuad(corners[2], corners[3]); // Bottom

        // 4. Draw Roof
        this.ctx.fillStyle = color;
        this.ctx.fillRect(roofX - w/2, roofY - h/2, w, h);

        // Roof Border (Highlight)
        this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        this.ctx.strokeRect(roofX - w/2, roofY - h/2, w, h);

        // Optional: Roof Detail (e.g. Helipad H or AC units)
        if (height3d > 100) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
            this.ctx.fillRect(roofX - w/4, roofY - h/4, w/2, h/2);
        }
    }

    drawPoliceAlert(player) {
        const time = Date.now();
        if (Math.floor(time / 250) % 2 === 0) {
             // Red Border
             this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
             this.ctx.lineWidth = 20;
             this.ctx.strokeRect(0, 0, this.width, this.height);

             // Text
             this.ctx.save();
             this.ctx.fillStyle = '#ff0000';
             this.ctx.font = '900 40px sans-serif'; // Simple font for safety
             this.ctx.textAlign = 'center';
             this.ctx.textBaseline = 'top';
             this.ctx.fillText("WANTED", this.width / 2, 50);
             this.ctx.restore();
        }
    }

    adjustColor(color, amount) {
        let usePound = false;
        if (color[0] === "#") {
            color = color.slice(1);
            usePound = true;
        }

        // Handle short hex (e.g., "333" -> "333333")
        if (color.length === 3) {
            color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
        }

        let num = parseInt(color, 16);
        let r = (num >> 16) + amount;
        if (r > 255) r = 255; else if (r < 0) r = 0;

        let b = ((num >> 8) & 0x00FF) + amount;
        if (b > 255) b = 255; else if (b < 0) b = 0;

        let g = (num & 0x0000FF) + amount;
        if (g > 255) g = 255; else if (g < 0) g = 0;

        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
    }
}
