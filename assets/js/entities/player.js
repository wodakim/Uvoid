import Hole from './hole.js';

export default class Player extends Hole {
    constructor(x, y, radius, color, name, saveManager) {
        super(x, y, radius, color, name);
        this.saveManager = saveManager;
        this.type = 'hole';
        this.isPlayer = true;
    }

    update(dt, input) {
        // Use Velocity for Physics-based movement (Collision resolution)
        const moveSpeed = this.currentSpeed || 200;

        if (input.x !== 0 || input.y !== 0) {
            this.velocity = {
                x: input.x * moveSpeed,
                y: input.y * moveSpeed
            };
        } else {
            // Friction/Stop if no input
            this.velocity = { x: 0, y: 0 };
        }

        super.update(dt);
    }
}
