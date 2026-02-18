export default class Physics {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        // Infinite world, no bounds check needed for player
        // But we might want to kill entities that are extremely far if MapManager misses them?
        // MapManager handles despawning.
    }

    update(dt, entities, onEat) {
        // 1. Move everything
        entities.forEach(entity => {
            // Particles handle their own movement/physics in their update() method
            if (entity.type === 'particle') return;

            if (entity.velocity) {
                entity.x += entity.velocity.x * dt;
                entity.y += entity.velocity.y * dt;
            }
        });

        // 2. Collision & Interaction
        const holes = entities.filter(e => e.type === 'hole');
        const props = entities.filter(e => e.type === 'prop' && !e.markedForDeletion && !e.isDying);
        const powerups = entities.filter(e => e.type === 'powerup' && !e.markedForDeletion);

        // Check for dying entities to clean up
        entities.forEach(e => {
            if (e.isDying && e.dyingProgress >= 1) {
                e.markedForDeletion = true;
            }
        });

        // Holes vs PowerUps
        holes.forEach(hole => {
             powerups.forEach(pu => {
                 const dx = hole.x - pu.x;
                 const dy = hole.y - pu.y;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 if (dist < hole.radius + pu.radius) {
                     pu.markedForDeletion = true;
                     hole.applyPowerUp(pu.powerType);
                     if (onEat) onEat(hole, pu);
                 }
             });
        });

        // Holes vs Props
        holes.forEach(hole => {
            props.forEach(prop => {
                // Optimization: Simple distance check
                const dx = hole.x - prop.x;
                const dy = hole.y - prop.y;
                const distSq = dx*dx + dy*dy;
                const dist = Math.sqrt(distSq);

                const propR = prop.radius || 10;

                // Interaction Logic
                // 1. Can we eat it? (Must be visibly larger)
                if (hole.radius > propR * 1.1) {

                    // Suction Range
                    const pullRadius = hole.radius + 150;

                    if (dist < pullRadius) {
                        // SUCTION PHYSICS UPGRADE
                        // Normalize distance (0 = center, 1 = edge of pull)
                        const t = 1 - (dist / pullRadius);

                        // Pull Force: Increases drastically as it gets closer
                        // Base force + Exponential ramp
                        const pullForce = 500 + (3000 * (t * t));

                        const nx = dx / dist;
                        const ny = dy / dist;

                        // Apply Pull
                        prop.x += nx * pullForce * dt;
                        prop.y += ny * pullForce * dt;

                        // ATMOSPHERIC DRAG (Friction)
                        // Objects caught in suction should lose their own momentum rapidly
                        // This prevents them from orbiting forever
                        if (prop.velocity) {
                            prop.velocity.x *= 0.90; // Heavy drag
                            prop.velocity.y *= 0.90;
                        }

                        // Tangential "Swirl" (Optional visual flair, reduced to prevent orbit)
                        // We want them to fall IN, not orbit.
                        const swirlForce = 100 * t; // Weak swirl
                        const sx = -ny;
                        const sy = nx;
                        prop.x += sx * swirlForce * dt;
                        prop.y += sy * swirlForce * dt;

                        // Rotation Spin (Visual)
                        prop.rotation = (prop.rotation || 0) + (10 * t * dt);

                        // Juicy Shake
                        if (prop.shake) {
                            const intensity = t * 5;
                            prop.shake.x = (Math.random() - 0.5) * intensity;
                            prop.shake.y = (Math.random() - 0.5) * intensity;
                        }

                        // Eat Logic (Horizon Event)
                        // Eat when object center is sufficiently inside
                        if (dist < hole.radius * 0.5) {
                            prop.isDying = true;
                            prop.dyingProgress = 0;
                            prop.targetHole = hole; // Reference to the hole eating it (for centering)
                            prop.initialScale = prop.scale || 1;
                            prop.initialRotation = prop.rotation || 0;

                            // Haptic Feedback (if enabled)
                            if (this.settingsManager && this.settingsManager.get('hapticFeedback')) {
                                if (navigator.vibrate) {
                                    if (prop.value > 10) navigator.vibrate(50); // Small bump for big items
                                }
                            }

                            if (prop.propType === 'police') {
                                hole.shrink(20);
                            } else {
                                hole.grow(prop.value || 1);
                            }

                            if (onEat) onEat(hole, prop);
                        }
                    }

                } else {
                    // 2. Too big to eat? SOLID COLLISION.
                    // If player is smaller than object, and object is 'isSolid' (Building/Obstacle),
                    // treat it as a wall.

                    if (prop.isSolid) {
                        // Rectangular Collision for Buildings/Shelters
                        if (prop.propType === 'building' || prop.propType === 'shelter' || prop.propType === 'kiosk') {
                            this.resolveRectCollision(hole, prop);
                        } else {
                            // Circular Collision for Poles, Trees, Hydrants
                            this.resolveCircleCollision(hole, prop);
                        }
                    }
                    // If not solid (Cars, Humans), do nothing. Pass under (or push slightly?).
                }
            });

            // Holes vs Holes
            holes.forEach(otherHole => {
                if (hole === otherHole) return;
                if (otherHole.markedForDeletion) return;

                // Invulnerability Check
                if (otherHole.invulnerable) return;

                const dx = hole.x - otherHole.x;
                const dy = hole.y - otherHole.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < hole.radius) {
                    // Must be 10% bigger to eat another hole
                    if (hole.radius > otherHole.radius * 1.1) {

                         // Police Logic
                         if (otherHole.isPolice) {
                             hole.shrink(20);
                             otherHole.markedForDeletion = true;
                             if (onEat) onEat(hole, otherHole);
                             return;
                         }

                         otherHole.markedForDeletion = true;
                         const reward = Math.floor(otherHole.score / 3);
                         hole.grow(reward > 0 ? reward : 10);
                         if (onEat) onEat(hole, otherHole);
                    } else {
                        // Elastic collision (Push apart)
                        // Only if sizes are similar
                        if (hole.radius < otherHole.radius * 1.1) {
                            const overlap = (hole.radius + otherHole.radius) - dist;
                            if (overlap > 0) {
                                const nx = dx / dist;
                                const ny = dy / dist;
                                // Move hole out half overlap
                                hole.x += nx * overlap * 0.1;
                                hole.y += ny * overlap * 0.1;
                            }
                        }
                    }
                }
            });
        });
    }

    resolveCircleCollision(hole, prop) {
        const dx = hole.x - prop.x;
        const dy = hole.y - prop.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const minDist = hole.radius + (prop.radius * 0.8); // Slightly forgiving

        if (dist < minDist) {
            const overlap = minDist - dist;
            // Prevent division by zero
            if (dist === 0) { hole.x += overlap; return; }

            const nx = dx / dist;
            const ny = dy / dist;

            // Move hole out (Bounce/Slide)
            hole.x += nx * overlap;
            hole.y += ny * overlap;
        }
    }

    resolveRectCollision(hole, prop) {
        // Strict Rectangle Collision for Buildings
        // Visual width/length might include shadows, so reduce slightly for physics
        // prop.width is full width. hw is half-width.

        // Use 90% of visual size for collision box to prevent "snagging" on corners
        const hw = (prop.width / 2) * 0.9;
        const hl = (prop.length / 2) * 0.9;

        // Find closest point on rect to circle center
        const closestX = Math.max(prop.x - hw, Math.min(hole.x, prop.x + hw));
        const closestY = Math.max(prop.y - hl, Math.min(hole.y, prop.y + hl));

        const dx = hole.x - closestX;
        const dy = hole.y - closestY;
        const distSq = dx*dx + dy*dy;

        // Collision if distance to closest point < radius
        // Use a "Hard" radius for the hole (visual radius)
        const radius = hole.radius;

        if (distSq < radius * radius) {
            const dist = Math.sqrt(distSq);

            // If center is inside, push out
            if (dist === 0) {
                // Fallback push
                if (Math.abs(hole.x - prop.x) > Math.abs(hole.y - prop.y)) {
                    hole.x = (hole.x > prop.x) ? prop.x + hw + radius : prop.x - hw - radius;
                } else {
                    hole.y = (hole.y > prop.y) ? prop.y + hl + radius : prop.y - hl - radius;
                }
                return;
            }

            const overlap = radius - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            // Slide Logic: Push hole away along normal
            hole.x += nx * overlap;
            hole.y += ny * overlap;
        }
    }
}
