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
                    const pullRadius = hole.radius + propR + 150; // Increased range for better "feel"

                    if (dist < pullRadius) {
                        // Non-Linear Pull Force (The "Black Hole" Effect)
                        // Force increases exponentially as distance decreases
                        const distFactor = Math.max(10, dist - hole.radius * 0.2); // Avoid div by zero
                        const forceMultiplier = 1500; // Stronger base pull
                        const force = (hole.radius / distFactor) * forceMultiplier * dt;

                        // Tangential Force (Swirl)
                        const swirlStrength = 500 * dt;

                        const nx = dx / dist;
                        const ny = dy / dist;

                        // Swirl vector (perpendicular to normal)
                        const sx = -ny;
                        const sy = nx;

                        // Stop traffic naturally if caught
                        if (prop.velocity) {
                            prop.velocity.x *= 0.9; // Damping
                            prop.velocity.y *= 0.9;
                        }

                        // Apply Forces
                        prop.x += nx * force;     // Pull IN
                        prop.y += ny * force;

                        prop.x += sx * swirlStrength; // Spin AROUND
                        prop.y += sy * swirlStrength;

                        // Juicy Shake (Visual feedback of struggle)
                        if (prop.shake) {
                            const intensity = (1 - (dist / pullRadius)) * 10;
                            prop.shake.x = (Math.random() - 0.5) * intensity;
                            prop.shake.y = (Math.random() - 0.5) * intensity;
                        }

                        // Shrink & Distort Effect
                        // Scale down as they get closer to the center
                        if (dist < hole.radius) {
                             // This is now handled by Renderer for smooth 60fps,
                             // but we can keep minimal logic here or just rely on the renderer.
                             // However, we want to start the dying process properly.
                             prop.rotation = (prop.rotation || 0) + 10 * dt;
                        }

                        // Eat Logic (Horizon Event)
                        // Eat when object center is sufficiently inside
                        if (dist < hole.radius * 0.4) {
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
                    // 2. Too big to eat. Collision?
                    if (prop.isSolid) {
                        this.resolveSolidCollision(hole, prop);
                    }
                    // If not solid (Cars, Humans), do nothing. Pass under.
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

    resolveSolidCollision(hole, prop) {
        // Prop is solid (Building, Pole).
        // Treat as Rectangle or Circle?
        // Buildings are usually Rects. Poles are Circles.

        // Simplification: Treat Buildings as Rects, everything else as Circles.
        if (prop.propType === 'building' || prop.propType === 'shelter') {
             this.resolveRectCollision(hole, prop);
        } else {
             this.resolveCircleCollision(hole, prop);
        }
    }

    resolveCircleCollision(hole, prop) {
        const dx = hole.x - prop.x;
        const dy = hole.y - prop.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const minDist = hole.radius + prop.radius; // Approximate physical radius

        if (dist < minDist) {
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            // Move hole out
            hole.x += nx * overlap;
            hole.y += ny * overlap;
        }
    }

    resolveRectCollision(hole, prop) {
        // Rect dimensions - Tightened for better feel (ignore shadows/edges)
        // Adjust collision box to be slightly smaller than visual to allow "sliding"
        // Also ensure shadows (which are part of visuals usually) don't block.
        // Assuming prop.width/length are the PHYSICAL bounds.

        const hw = (prop.width / 2) * 0.8;
        const hh = (prop.length / 2) * 0.8;

        // Clamp point (hole center) to rect
        const closestX = Math.max(prop.x - hw, Math.min(hole.x, prop.x + hw));
        const closestY = Math.max(prop.y - hh, Math.min(hole.y, prop.y + hh));

        const dx = hole.x - closestX;
        const dy = hole.y - closestY;
        const distSq = dx*dx + dy*dy;

        // If distance from closest point is less than radius, we are colliding
        if (distSq < hole.radius * hole.radius) {
            const dist = Math.sqrt(distSq);

            // Prevent division by zero
            if (dist === 0) {
                // Center is exactly inside, push out arbitrarily
                hole.x += hole.radius;
                return;
            }

            const overlap = hole.radius - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            // Move hole out
            hole.x += nx * overlap;
            hole.y += ny * overlap;
        }
    }
}
