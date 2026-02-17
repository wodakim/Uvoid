export default class UpgradeManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.baseThreshold = 300; // Reduced from 1000 for Hardcore pacing
        this.nextThreshold = this.baseThreshold;
        this.level = 1;

        this.isChoosing = false;

        // Define Upgrade Options
        // Updated descriptions to reflect rebalance
        this.upgrades = [
            { id: 'speed', name: 'TURBO BOOST', desc: '+30 Base Speed', icon: '⚡' },
            { id: 'size', name: 'MASS EXPANSION', desc: '+2% Size Instantly', icon: '🟣' },
            { id: 'satellite', name: 'ORBITAL VOID', desc: 'Adds a small satellite hole', icon: '🪐' },
            { id: 'suction', name: 'GRAVITY WELL', desc: '+20% Suction Range', icon: '🧲' },
            { id: 'digest', name: 'METABOLISM', desc: '+10% Growth per item', icon: '🧬' },
            { id: 'cooldown', name: 'AGILITY', desc: '+15 Base Speed', icon: '🏃' }
        ];
    }

    checkLevelUp(playerScore) {
        if (playerScore >= this.nextThreshold) {
            this.triggerLevelUp();
            // Scaled for Hardcore scoring (approx 1/3 of previous)
            const increment = this.level * 500;
            this.nextThreshold += increment;
            this.level++;
        }
    }

    triggerLevelUp() {
        if (this.isChoosing) return;

        this.gameManager.paused = true;
        this.isChoosing = true;

        const choices = [];
        const pool = [...this.upgrades];

        for(let i=0; i<3; i++) {
            if (pool.length === 0) break;
            const idx = Math.floor(Math.random() * pool.length);
            choices.push(pool.splice(idx, 1)[0]);
        }

        this.gameManager.app.uiManager.showLevelUp(choices, (selectedId) => {
            this.applyUpgrade(selectedId);
        });
    }

    applyUpgrade(id) {
        const player = this.gameManager.player;
        if (!player) return;

        player.addUpgrade(id);

        this.isChoosing = false;
        this.gameManager.paused = false;
        this.gameManager.app.uiManager.switchScreen('hud');
    }
}
