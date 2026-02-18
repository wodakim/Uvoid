import Prop from '../entities/prop.js';
import Human from '../entities/human.js';

export default class MapManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.chunkSize = 600; // 500 block + 100 road (shared)
        this.activeChunks = new Map(); // key "x,y" -> [entities]

        // Initial spawn
        this.update(0, 0);
    }

    update(playerX, playerY) {
        const cx = Math.floor(playerX / this.chunkSize);
        const cy = Math.floor(playerY / this.chunkSize);

        // Keep 2x2 radius chunks active (5x5 grid)
        const range = 2;
        const visibleKeys = new Set();

        for (let x = cx - range; x <= cx + range; x++) {
            for (let y = cy - range; y <= cy + range; y++) {
                const key = `${x},${y}`;
                visibleKeys.add(key);

                if (!this.activeChunks.has(key)) {
                    this.generateChunk(x, y);
                }
            }
        }

        // Cleanup old chunks
        for (const [key, entities] of this.activeChunks) {
            // Entities are not stored in activeChunks directly as objects but just reference?
            // Actually this.activeChunks holds array of entities.
            // But gameManager.entities holds ALL entities.
            // When we despawn, we mark them for deletion.
            if (!visibleKeys.has(key)) {
                this.despawnChunk(key);
            }
        }
    }

    getZoneType(cx, cy) {
        // Deterministic Noise (Pseudo-random based on coords)
        const n = Math.abs(Math.sin(cx * 12.9898 + cy * 78.233) * 43758.5453);
        const val = n - Math.floor(n); // 0.0 to 1.0

        if (val < 0.4) return 'downtown';
        if (val < 0.6) return 'park';
        if (val < 0.8) return 'parking';
        return 'industrial';
    }

    generateChunk(cx, cy) {
        const entities = [];
        const baseX = cx * this.chunkSize;
        const baseY = cy * this.chunkSize;
        const centerX = baseX + this.chunkSize / 2;
        const centerY = baseY + this.chunkSize / 2;

        const zone = this.getZoneType(cx, cy);

        if (zone === 'downtown') {
            this.generateDowntown(baseX, baseY, entities);
        } else if (zone === 'park') {
            this.generatePark(baseX, baseY, entities);
        } else if (zone === 'parking') {
            this.generateParking(baseX, baseY, entities);
        } else {
            this.generateIndustrial(baseX, baseY, entities);
        }

        // Sidewalks (always present to connect zones)
        this.generateSidewalks(baseX, baseY, entities);

        // Register
        this.activeChunks.set(`${cx},${cy}`, entities);
        if (this.gameManager.entities) {
            this.gameManager.entities.push(...entities);
        }
    }

    generateDowntown(baseX, baseY, entities) {
        // Downtown: Smart Spawn (No overlaps)
        const numBuildings = 2 + Math.floor(Math.random() * 3);
        const placedObstacles = [];

        for(let i=0; i<numBuildings; i++) {
            let placed = false;
            let attempts = 0;

            while(!placed && attempts < 10) {
                attempts++;

                const x = baseX + 100 + Math.random() * 400;
                const y = baseY + 100 + Math.random() * 400;

                const type = 'building';

                // Absolute Filter (Redundant but safe)
                if (type === 'SHOP' || type === 'KIOSK' || type === 'small_shop') break;

                // Create temp prop to check dimensions
                const r = 200; // From Prop.TYPES.building
                const padding = 50; // Increased Padding "Let the player breathe"

                // Collision Check
                let collision = false;
                for (const obs of placedObstacles) {
                    const dist = Math.hypot(x - obs.x, y - obs.y);
                    if (dist < (r + obs.r + padding)) {
                        collision = true;
                        break;
                    }
                }

                if (!collision) {
                    const prop = new Prop(x, y, type);

                    // Add Random Rotation to break the grid
                    prop.rotation = Math.random() * Math.PI / 2;

                    entities.push(prop);
                    placedObstacles.push({x, y, r});
                    placed = true;
                }
            }
        }
    }

    generatePark(baseX, baseY, entities) {
        const cx = baseX + this.chunkSize/2;
        const cy = baseY + this.chunkSize/2;

        // Central Feature
        const featureType = Math.random() < 0.5 ? 'pole' : 'kiosk';
        const feature = new Prop(cx, cy, featureType);
        if (featureType === 'pole') {
            feature.scale = 3;
            feature.color = '#00ffff'; // Fountain placeholder
        }
        entities.push(feature);

        // Circle of benches
        for(let i=0; i<8; i++) {
            const angle = i * (Math.PI/4);
            const dist = 140;
            const type = i % 2 === 0 ? 'bench' : 'trash_bin';
            entities.push(new Prop(cx + Math.cos(angle)*dist, cy + Math.sin(angle)*dist, type));
        }

        // Park Visitors
        for(let i=0; i<5; i++) {
            entities.push(new Human(cx + (Math.random()-0.5)*250, cy + (Math.random()-0.5)*250));
        }
    }

    generateParking(baseX, baseY, entities) {
        const startX = baseX + 100;
        const startY = baseY + 100;

        for(let row=0; row<3; row++) {
            for(let col=0; col<3; col++) {
                if (Math.random() > 0.7) continue; // Empty spot

                const vTypes = ['car', 'car', 'van', 'motorcycle'];
                const vType = vTypes[Math.floor(Math.random()*vTypes.length)];
                const car = new Prop(startX + col*120, startY + row*140, vType);
                car.rotation = Math.PI / 2; // Parked straight
                entities.push(car);
            }
        }
    }

    generateIndustrial(baseX, baseY, entities) {
        const cx = baseX + this.chunkSize/2;
        const cy = baseY + this.chunkSize/2;

        // Fences
        const fenceDist = 200;
        for(let i=0; i<8; i++) {
             const angle = i * (Math.PI/4);
             entities.push(new Prop(cx + Math.cos(angle)*fenceDist, cy + Math.sin(angle)*fenceDist, 'fence'));
        }

        // Truck & Cones
        if (Math.random() < 0.5) {
            entities.push(new Prop(cx, cy, 'truck'));
        }

        for(let i=0; i<5; i++) {
            entities.push(new Prop(cx + (Math.random()-0.5)*100, cy + (Math.random()-0.5)*100, 'cone'));
        }
    }

    generateSidewalks(baseX, baseY, list) {
        // Perimeter props
        // No explicit "SHOP" cubes spawned here.
        // Previously there might have been specific shop debug code, but reading the file
        // I didn't see explicit "Shop Cube" logic other than 'small_shop' prop type.
        // If 'small_shop' IS the debug cube, I should ensure it looks like a building, not a red cube.
        // Renderer.js handles 'small_shop' as a 3D building now.

        // Logic to spawn sidewalk clutter
        const points = [];
        // Top edge
        for(let x=50; x<550; x+=100) points.push({x: baseX+x, y: baseY+50});
        // Bottom edge
        for(let x=50; x<550; x+=100) points.push({x: baseX+x, y: baseY+550});
        // Left edge
        for(let y=150; y<450; y+=100) points.push({x: baseX+50, y: baseY+y});
        // Right edge
        for(let y=150; y<450; y+=100) points.push({x: baseX+550, y: baseY+y});

        points.forEach(p => {
            if (Math.random() > 0.3) return; // Empty

            const roll = Math.random();
            if (roll < 0.4) {
                list.push(new Prop(p.x, p.y, 'bottle'));
            } else if (roll < 0.6) {
                list.push(new Prop(p.x, p.y, 'pole'));
            } else if (roll < 0.7) {
                list.push(new Prop(p.x, p.y, 'shelter'));
            } else if (roll < 0.85) {
                list.push(new Human(p.x, p.y));
            } else {
                list.push(new Prop(p.x, p.y, 'kiosk'));
            }
        });
    }

    despawnChunk(key) {
        const chunkEntities = this.activeChunks.get(key);
        if (chunkEntities) {
            // Mark all for deletion
            chunkEntities.forEach(e => e.markedForDeletion = true);
            this.activeChunks.delete(key);
        }
    }

    getRandomRoadPosition(playerX, playerY, range=2000) {
        // Simplified grid road selection
        const cx = Math.floor(playerX / this.chunkSize);
        const cy = Math.floor(playerY / this.chunkSize);

        const isVert = Math.random() > 0.5;
        let x, y;

        // Roads are at boundaries of chunks (multiples of chunkSize)
        // or centers? In this logic, chunks are 600x600.
        // Visuals draw grid lines.
        // Let's assume roads are between chunks.

        if (isVert) {
            const offsetIdx = Math.floor((Math.random() - 0.5) * 6);
            x = (cx + offsetIdx) * this.chunkSize;
            y = playerY + (Math.random() - 0.5) * range;
        } else {
            const offsetIdx = Math.floor((Math.random() - 0.5) * 6);
            y = (cy + offsetIdx) * this.chunkSize;
            x = playerX + (Math.random() - 0.5) * range;
        }

        return { x, y, isVert };
    }
}
