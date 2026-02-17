import Prop from '../entities/prop.js';

export default class TrafficManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.cars = [];
        this.spawnTimer = 0;
        this.maxCars = 30; // Reduced for performance on infinite map
    }

    update(dt) {
        this.spawnTimer += dt;
        const player = this.gameManager.player;
        if (!player) return;

        // Spawn Traffic
        if (this.spawnTimer > 1.0) { // Every 1s check
            if (this.cars.length < this.maxCars) {
                this.spawnVehicle();
            }
            this.spawnTimer = 0;
        }

        // Clean up far away cars
        this.cars = this.cars.filter(c => !c.markedForDeletion);

        this.cars.forEach(car => {
            const dx = car.x - player.x;
            const dy = car.y - player.y;
            if (dx*dx + dy*dy > 2500*2500) { // 2500px range
                car.markedForDeletion = true;
            }
        });
    }

    spawnVehicle() {
        if (!this.gameManager.mapManager || !this.gameManager.player) return;

        const player = this.gameManager.player;
        const pos = this.gameManager.mapManager.getRandomRoadPosition(player.x, player.y, 1500); // 1500 radius

        // Determine Type (Tier 4 or 5)
        const rand = Math.random();
        let type = 'car';
        let speed = 200 + Math.random() * 100;

        if (rand < 0.2) { type = 'truck'; speed = 150; }
        else if (rand < 0.4) { type = 'bus'; speed = 180; }

        let vx, vy, rotation;

        // Determine direction based on "Lane"
        // pos.x, pos.y is the center of the road.
        // Road width is 100.
        // Lane 1: -25 offset. Lane 2: +25 offset.
        // Let's say: Lane 1 goes Positive, Lane 2 goes Negative.

        const laneOffset = (Math.random() > 0.5 ? 25 : -25);
        const direction = (laneOffset > 0) ? 1 : -1;

        if (pos.isVert) {
            // Vertical Road
            // x is fixed (center of road). y is random along it.
            // We spawn "upstream" so it drives towards player?
            // Or just random. Random is fine.
            const x = pos.x + laneOffset;
            const y = pos.y;
            vx = 0;
            vy = direction * speed;
            rotation = direction > 0 ? Math.PI/2 : -Math.PI/2;

            const vehicle = new Prop(x, y, type);
            vehicle.rotation = rotation;
            vehicle.velocity = { x: vx, y: vy };
            vehicle.isTraffic = true; // Flag for special handling

            this.cars.push(vehicle);
            this.gameManager.entities.push(vehicle);

        } else {
            // Horizontal Road
            const x = pos.x;
            const y = pos.y + laneOffset;
            vx = direction * speed;
            vy = 0;
            rotation = direction > 0 ? 0 : Math.PI;

            const vehicle = new Prop(x, y, type);
            vehicle.rotation = rotation;
            vehicle.velocity = { x: vx, y: vy };
            vehicle.isTraffic = true;

            this.cars.push(vehicle);
            this.gameManager.entities.push(vehicle);
        }
    }
}
