export default class SaveManager {
    constructor(onUpdate) {
        this.onUpdate = onUpdate;
        this.data = {
            coins: 0,
            highScore: 0,
            currentSkin: 'default',
            unlockedSkins: ['default'],
            noAds: false,
            skinAdProgress: {} // { 'skin_id': count }
        };
        this.load();
    }

    load() {
        const stored = localStorage.getItem('urban_void_save');
        if (stored) {
            try {
                this.data = { ...this.data, ...JSON.parse(stored) };
            } catch (e) {
                console.error("Save data corrupted, resetting.", e);
            }
        }

        // Apply persistent settings
        if (this.data.noAds) {
            this.applyNoAds();
        }
    }

    save() {
        localStorage.setItem('urban_void_save', JSON.stringify(this.data));
        if (this.onUpdate) this.onUpdate(this.data);
    }

    addCoins(amount) {
        this.data.coins += amount;
        this.save();
    }

    spendCoins(amount) {
        if (this.data.coins >= amount) {
            this.data.coins -= amount;
            this.save();
            return true;
        }
        return false;
    }

    getHighScore() {
        return this.data.highScore;
    }

    setHighScore(score) {
        this.data.highScore = score;
        this.save();
    }

    unlockSkin(skinId) {
        if (!this.data.unlockedSkins.includes(skinId)) {
            this.data.unlockedSkins.push(skinId);
            this.save();
        }
    }

    setSkin(skinId) {
        if (this.data.unlockedSkins.includes(skinId)) {
            this.data.currentSkin = skinId;
            this.save();
        }
    }

    getCurrentSkinInfo() {
        // This logic is better placed in ShopManager or a shared config, but for now hardcode/map here
        // Ideally we fetch from ShopManager list.
        const skins = {
            'default': { color: '#00f3ff', shape: 'circle' },
            'neon_ring': { color: '#ff00ff', shape: 'circle' },
            'glitch': { color: '#39ff14', shape: 'square' },
            'star_power': { color: '#ffd700', shape: 'star' },
            'mech_gear': { color: '#ff4500', shape: 'gear' },
            'dark_mode': { color: '#ff3333', shape: 'circle' }
        };
        return skins[this.data.currentSkin] || skins['default'];
    }

    buyNoAds() {
        this.data.noAds = true;
        this.save();
        this.applyNoAds();
    }

    applyNoAds() {
        // Trigger ad removal
        const banner = document.getElementById('ad-banner');
        if (banner) banner.style.display = 'none';

        // Update CSS variable so canvas resizes correctly
        document.documentElement.style.setProperty('--ad-height', '0px');

        // Trigger resize
        window.dispatchEvent(new Event('resize'));
    }

    updateUI() {
        if (this.onUpdate) this.onUpdate(this.data);
    }
}
