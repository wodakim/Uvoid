export default class Minimap {
    constructor(canvas, app) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.app = app;
        this.range = 2000; // World units range radius
    }

    update() {
        const player = this.app.gameManager.player;
        if (!player) return;

        // Clear
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Background (The City Grid)
        this.ctx.fillStyle = '#222'; // Dark floor
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();

        // Transform to center player on map
        // Map Center (50,50) corresponds to Player (px, py)
        // Scale: CanvasSize / (Range * 2) -> 100 / 4000 = 0.025
        const scale = this.canvas.width / (this.range * 2);

        this.ctx.translate(this.canvas.width/2, this.canvas.height/2);
        this.ctx.scale(scale, scale);
        this.ctx.translate(-player.x, -player.y);

        // Draw Chunks (Grid)
        // Iterate visible range
        const chunkSize = 600;
        const cx = Math.floor(player.x / chunkSize);
        const cy = Math.floor(player.y / chunkSize);
        const rangeChunks = 4;

        this.ctx.lineWidth = 40; // Road width on map
        this.ctx.strokeStyle = '#333'; // Road color
        this.ctx.fillStyle = '#111'; // Building block color

        for (let x = cx - rangeChunks; x <= cx + rangeChunks; x++) {
            for (let y = cy - rangeChunks; y <= cy + rangeChunks; y++) {
                const bx = x * chunkSize;
                const by = y * chunkSize;

                // Draw Block (Building Area)
                // 60px padding for road/sidewalk
                this.ctx.fillRect(bx + 60, by + 60, chunkSize - 120, chunkSize - 120);

                // Draw Road Grid Lines (Cross)
                // Actually easier: background is road, blocks are overlay.
                // We drew blocks above. Background is dark.
                // Let's make blocks lighter than background to see "roads" as gaps.
                // Reset logic:
                // 1. Fill background (Roads)
                // 2. Fill blocks (Buildings)
            }
        }

        // Draw Entities (Dots)
        this.app.gameManager.entities.forEach(entity => {
            if (entity.type === 'hole') {
                this.ctx.beginPath();
                // Draw as circle
                this.ctx.arc(entity.x, entity.y, entity.radius * 2, 0, Math.PI * 2);

                if (entity === player) {
                    this.ctx.fillStyle = '#ffae00';
                    this.ctx.fill();
                    // Pulse ring
                    this.ctx.strokeStyle = 'rgba(255, 174, 0, 0.5)';
                    this.ctx.lineWidth = 10;
                    this.ctx.stroke();
                } else {
                    this.ctx.fillStyle = entity.color || '#ff0000';
                    this.ctx.fill();
                }
            } else if (entity.type === 'prop' && entity.propType === 'police') {
                // Show Police on map
                this.ctx.fillStyle = '#0000ff';
                this.ctx.beginPath();
                this.ctx.arc(entity.x, entity.y, 20, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        this.ctx.restore();

        // Border ring
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width/2, this.canvas.height/2, this.canvas.width/2 - 1, 0, Math.PI * 2);
        this.ctx.stroke();

        // Player marker (always center) - redundant if we draw world relative to center
    }
}
