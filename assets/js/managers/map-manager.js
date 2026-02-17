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
            if (!visibleKeys.has(key)) {
                this.despawnChunk(key);
            }
        }
    }

    generateChunk(cx, cy) {
        const entities = [];
        const baseX = cx * this.chunkSize;
        const baseY = cy * this.chunkSize;
        const centerX = baseX + this.chunkSize / 2;
        const centerY = baseY + this.chunkSize / 2;

        // Realistic City Logic
        // 1. Roads are clear zones at edges (0 and 600). Do NOT spawn static props there.
        // 2. Sidewalks are at 60px inset.
        // 3. Central block is 480x480.

        // 1. Central Block Content
        const typeRoll = Math.random();

        if (typeRoll < 0.5) {
            // High Density City Block (Buildings)
            if (Math.random() < 0.4) {
                // 1 Massive Skyscraper
                const b = new Prop(centerX, centerY, 'building');
                // Customize size for variety
                b.width = 320;
                b.length = 320;
                b.radius = 220; // Hitbox
                entities.push(b);
            } else {
                // 4 Smaller Buildings / Apartments
                const offset = 110;
                [[-1,-1], [1,-1], [-1,1], [1,1]].forEach(([dx, dy]) => {
                    // 20% chance for a Shop instead of a generic building
                    const type = Math.random() < 0.2 ? 'small_shop' : 'building';
                    const b = new Prop(centerX + dx*offset, centerY + dy*offset, type);
                    b.width = 160;
                    b.length = 160;
                    b.radius = 100;
                    entities.push(b);
                });
            }
        } else if (typeRoll < 0.7) {
            // Plaza / Park (Open space with organized props)
            // Central Feature: Fountain (Big Pole) or Statue (Kiosk)
            const featureType = Math.random() < 0.5 ? 'pole' : 'kiosk';
            const feature = new Prop(centerX, centerY, featureType);
            if (featureType === 'pole') feature.scale = 3;
            entities.push(feature);

            // Organized Benches & Trees (Trash Bins disguised as bushes?)
            for(let i=0; i<8; i++) {
                const angle = i * (Math.PI/4);
                const dist = 140;
                // Alternate Bench and Bin
                const type = i % 2 === 0 ? 'bench' : 'trash_bin';
                entities.push(new Prop(centerX + Math.cos(angle)*dist, centerY + Math.sin(angle)*dist, type));
            }
            // Pedestrians strolling
            for(let i=0; i<5; i++) {
                entities.push(new Human(centerX + (Math.random()-0.5)*250, centerY + (Math.random()-0.5)*250));
            }
        } else if (typeRoll < 0.85) {
            // Parking Lot (Cars)
            // Grid of cars
            for(let row=-1; row<=1; row++) {
                for(let col=-1; col<=1; col++) {
                    if (row===0 && col===0) continue; // Drive Lane
                    // Mix of vehicles
                    const vTypes = ['car', 'car', 'van', 'motorcycle'];
                    const vType = vTypes[Math.floor(Math.random()*vTypes.length)];
                    const car = new Prop(centerX + col*120, centerY + row*140, vType);
                    car.rotation = Math.PI / 2; // Parked straight
                    entities.push(car);
                }
            }
        } else {
            // Construction Site / Industrial
            // Fences and heavy machinery (Trucks/Cones)
            const fenceDist = 200;
            // Perimeter Fences
            for(let i=0; i<8; i++) {
                 const angle = i * (Math.PI/4);
                 entities.push(new Prop(centerX + Math.cos(angle)*fenceDist, centerY + Math.sin(angle)*fenceDist, 'fence'));
            }
            // Inner stuff
            entities.push(new Prop(centerX - 50, centerY - 50, 'truck'));
            entities.push(new Prop(centerX + 60, centerY + 40, 'cone'));
            entities.push(new Prop(centerX + 80, centerY + 40, 'cone'));
            entities.push(new Prop(centerX + 70, centerY + 60, 'cone'));
        }

        // 2. Sidewalk Props (Organized, Less Clutter)
        // Sidewalk is 60px in from edges.
        const min = 70;
        const max = this.chunkSize - 70;
        const sidewalkStep = 100; // Spacing

        // Top & Bottom Sidewalks
        for (let x = min; x <= max; x += sidewalkStep) {
             this.spawnSidewalkCluster(baseX + x, baseY + min, entities); // Top
             this.spawnSidewalkCluster(baseX + x, baseY + max, entities); // Bottom
        }
        // Left & Right Sidewalks
        for (let y = min; y <= max; y += sidewalkStep) {
             this.spawnSidewalkCluster(baseX + min, baseY + y, entities); // Left
             this.spawnSidewalkCluster(baseX + max, baseY + y, entities); // Right
        }

        // 3. Register
        this.activeChunks.set(`${cx},${cy}`, entities);
        if (this.gameManager.entities) {
            this.gameManager.entities.push(...entities);
        }
    }

    spawnSidewalkCluster(x, y, list) {
        // Reduced Density: 80% Empty
        if (Math.random() > 0.2) return;

        const roll = Math.random();

        // Organized Groups
        if (roll < 0.4) {
            // Trash Cluster (Bottles/Cones) - Good for early game
            list.push(new Prop(x, y, 'bottle'));
            list.push(new Prop(x + 10, y + 5, 'bottle'));
            if(Math.random() < 0.5) list.push(new Prop(x - 5, y + 10, 'cone'));
        } else if (roll < 0.6) {
            // Street Light
            list.push(new Prop(x, y, 'pole'));
        } else if (roll < 0.7) {
            // Bus Stop (Rare)
            list.push(new Prop(x, y, 'shelter'));
        } else if (roll < 0.85) {
            // Human
            list.push(new Human(x, y));
        } else {
            // Kiosk
            list.push(new Prop(x, y, 'kiosk'));
        }
    }

    despawnChunk(key) {
        const entities = this.activeChunks.get(key);
        if (entities) {
            entities.forEach(e => e.markedForDeletion = true);
            this.activeChunks.delete(key);
        }
    }

    getRandomRoadPosition(playerX, playerY, range=2000) {
        const cx = Math.floor(playerX / this.chunkSize);
        const cy = Math.floor(playerY / this.chunkSize);

        const isVert = Math.random() > 0.5;
        if (isVert) {
            const offsetIdx = Math.floor((Math.random() - 0.5) * 4);
            const x = (cx + offsetIdx) * this.chunkSize;
            const y = playerY + (Math.random() - 0.5) * range;
            return { x, y, isVert: true };
        } else {
            const offsetIdx = Math.floor((Math.random() - 0.5) * 4);
            const y = (cy + offsetIdx) * this.chunkSize;
            const x = playerX + (Math.random() - 0.5) * range;
            return { x, y, isVert: false };
        }
    }
}
