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

    getZoneType(cx, cy) {
        // Deterministic Noise
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
            this.generateDowntown(centerX, centerY, entities);
        } else if (zone === 'park') {
            this.generatePark(centerX, centerY, entities);
        } else if (zone === 'parking') {
            this.generateParking(centerX, centerY, entities);
        } else {
            this.generateIndustrial(centerX, centerY, entities);
        }

        // Sidewalks (always present to connect zones)
        this.generateSidewalks(baseX, baseY, entities);

        // Register
        this.activeChunks.set(`${cx},${cy}`, entities);
        if (this.gameManager.entities) {
            this.gameManager.entities.push(...entities);
        }
    }

    generateDowntown(cx, cy, entities) {
        if (Math.random() < 0.4) {
            // Skyscraper
            const b = new Prop(cx, cy, 'building');
            b.width = 320;
            b.length = 320;
            b.radius = 220;
            entities.push(b);
        } else {
            // Apartments/Shops
            const offset = 110;
            [[-1,-1], [1,-1], [-1,1], [1,1]].forEach(([dx, dy]) => {
                const type = Math.random() < 0.3 ? 'small_shop' : 'building';
                const b = new Prop(cx + dx*offset, cy + dy*offset, type);
                b.width = 160;
                b.length = 160;
                b.radius = 100;
                entities.push(b);
            });
        }
    }

    generatePark(cx, cy, entities) {
        const featureType = Math.random() < 0.5 ? 'pole' : 'kiosk'; // Pole = Fountain placeholder
        const feature = new Prop(cx, cy, featureType);
        if (featureType === 'pole') { feature.scale = 3; feature.color = '#00ffff'; } // Cyan pole as fountain
        entities.push(feature);

        for(let i=0; i<8; i++) {
            const angle = i * (Math.PI/4);
            const dist = 140;
            const type = i % 2 === 0 ? 'bench' : 'trash_bin';
            entities.push(new Prop(cx + Math.cos(angle)*dist, cy + Math.sin(angle)*dist, type));
        }
        for(let i=0; i<5; i++) {
            entities.push(new Human(cx + (Math.random()-0.5)*250, cy + (Math.random()-0.5)*250));
        }
    }

    generateParking(cx, cy, entities) {
        for(let row=-1; row<=1; row++) {
            for(let col=-1; col<=1; col++) {
                if (row===0 && col===0) continue;
                const vTypes = ['car', 'car', 'van', 'motorcycle'];
                const vType = vTypes[Math.floor(Math.random()*vTypes.length)];
                const car = new Prop(cx + col*120, cy + row*140, vType);
                car.rotation = Math.PI / 2;
                entities.push(car);
            }
        }
    }

    generateIndustrial(cx, cy, entities) {
        const fenceDist = 200;
        for(let i=0; i<8; i++) {
             const angle = i * (Math.PI/4);
             entities.push(new Prop(cx + Math.cos(angle)*fenceDist, cy + Math.sin(angle)*fenceDist, 'fence'));
        }
        entities.push(new Prop(cx - 50, cy - 50, 'truck'));
        entities.push(new Prop(cx + 60, cy + 40, 'cone'));
        entities.push(new Prop(cx + 80, cy + 40, 'cone'));
        entities.push(new Prop(cx + 70, cy + 60, 'cone'));
    }

    generateSidewalks(baseX, baseY, list) {
        const min = 70;
        const max = this.chunkSize - 70;
        const sidewalkStep = 100;

        for (let x = min; x <= max; x += sidewalkStep) {
             this.spawnSidewalkCluster(baseX + x, baseY + min, list);
             this.spawnSidewalkCluster(baseX + x, baseY + max, list);
        }
        for (let y = min; y <= max; y += sidewalkStep) {
             this.spawnSidewalkCluster(baseX + min, baseY + y, list);
             this.spawnSidewalkCluster(baseX + max, baseY + y, list);
        }
    }

    spawnSidewalkCluster(x, y, list) {
        if (Math.random() > 0.3) return; // 70% Empty

        const roll = Math.random();
        if (roll < 0.4) {
            list.push(new Prop(x, y, 'bottle'));
            if(Math.random() < 0.5) list.push(new Prop(x + 10, y + 5, 'bottle'));
        } else if (roll < 0.6) {
            list.push(new Prop(x, y, 'pole'));
        } else if (roll < 0.7) {
            list.push(new Prop(x, y, 'shelter'));
        } else if (roll < 0.85) {
            list.push(new Human(x, y));
        } else {
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

        // Try to pick a road line (multiples of chunkSize)
        // This is a simplified version, it picks a point along the grid lines
        const isVert = Math.random() > 0.5;
        let x, y;

        if (isVert) {
            // Pick a vertical road near player
            const offsetIdx = Math.floor((Math.random() - 0.5) * 4);
            x = (cx + offsetIdx) * this.chunkSize;
            y = playerY + (Math.random() - 0.5) * range;
        } else {
            // Pick a horizontal road near player
            const offsetIdx = Math.floor((Math.random() - 0.5) * 4);
            y = (cy + offsetIdx) * this.chunkSize;
            x = playerX + (Math.random() - 0.5) * range;
        }

        return { x, y, isVert };
    }
}
