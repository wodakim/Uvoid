export default class MissionManager {
    constructor(saveManager) {
        this.saveManager = saveManager;
        this.dailyMissions = [
            { id: 1, desc: "Eat 10 Cars", target: 10, reward: 100, type: 'eat_car' },
            { id: 2, desc: "Kill 2 Players", target: 2, reward: 200, type: 'kill_hole' },
            { id: 3, desc: "Reach 5000 Mass", target: 5000, reward: 150, type: 'reach_mass' }
        ];

        // Progress tracked in session
        this.sessionProgress = {
            eat_car: 0,
            kill_hole: 0,
            reach_mass: 0
        };
    }

    onEvent(type, amount=1) {
        if (this.sessionProgress[type] !== undefined) {
            this.sessionProgress[type] += amount;
        }

        // Check completion immediately? Or at end of game?
        // Let's check at end of game in GameManager.gameOver
    }

    checkCompletion() {
        let earned = 0;
        this.dailyMissions.forEach(m => {
            // Check if already completed today? (SaveManager logic needed)
            // For MVP, just check session progress against target
            if (this.sessionProgress[m.type] >= m.target) {
                earned += m.reward;
                // Notify?
            }
        });
        return earned;
    }

    getMissionsText() {
        return this.dailyMissions.map(m => {
            const current = Math.min(this.sessionProgress[m.type], m.target);
            return `${m.desc} (${current}/${m.target})`;
        });
    }
}
