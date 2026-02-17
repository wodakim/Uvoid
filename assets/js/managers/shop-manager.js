export default class ShopManager {
    constructor(app) {
        this.app = app;
        this.saveManager = app.saveManager;
        this.uiManager = app.uiManager;

        this.skins = [
            { id: 'default', name: 'Basic Hole', cost: 0, type: 'free', color: '#00f3ff', shape: 'circle' },
            { id: 'neon_ring', name: 'Neon Ring', cost: 500, type: 'coins', color: '#ff00ff', shape: 'circle' },
            { id: 'glitch', name: 'Glitch Effect', cost: 1000, type: 'coins', color: '#39ff14', shape: 'square' },
            { id: 'star_power', name: 'Cyber Star', cost: 2000, type: 'coins', color: '#ffd700', shape: 'star' },
            { id: 'mech_gear', name: 'Mech Gear', cost: 5000, type: 'coins', color: '#ff4500', shape: 'gear' },
            { id: 'dark_mode', name: 'Void King', cost: 3, type: 'ads', color: '#ff3333', shape: 'circle' }
        ];

        // Grid is rendered on open
    }

    openShop() {
        this.saveManager.updateUI(); // Refresh coins
        this.renderShop(); // Refresh state
        this.uiManager.switchScreen('shop');
    }

    closeShop() {
        this.uiManager.switchScreen('menu');
    }

    renderShop() {
        const grid = document.getElementById('skin-grid');
        grid.innerHTML = '';

        this.skins.forEach(skin => {
            const item = document.createElement('div');
            item.className = 'skin-item';

            const isUnlocked = this.saveManager.data.unlockedSkins.includes(skin.id);
            const isSelected = this.saveManager.data.currentSkin === skin.id;

            if (isSelected) item.classList.add('selected');
            if (!isUnlocked) item.classList.add('locked');

            // Content
            const title = document.createElement('h3');
            title.textContent = skin.name;
            title.style.color = skin.color;
            item.appendChild(title);

            // Preview Circle
            const preview = document.createElement('div');
            preview.style.width = '50px';
            preview.style.height = '50px';
            preview.style.borderRadius = '50%';
            preview.style.border = `3px solid ${skin.color}`;
            preview.style.boxShadow = `0 0 10px ${skin.color}`;
            preview.style.margin = '10px auto';
            item.appendChild(preview);

            // Action Button
            const btn = document.createElement('button');
            btn.className = 'btn-secondary';
            btn.style.fontSize = '0.8rem';
            btn.style.padding = '5px 10px';

            if (isSelected) {
                btn.textContent = 'SELECTED';
                btn.disabled = true;
                btn.style.opacity = '0.5';
            } else if (isUnlocked) {
                btn.textContent = 'SELECT';
                btn.onclick = () => {
                    this.saveManager.setSkin(skin.id);
                    this.renderShop();
                };
            } else {
                // Locked
                if (skin.type === 'coins') {
                    btn.textContent = `BUY (${skin.cost})`;
                    if (this.saveManager.data.coins < skin.cost) {
                        btn.disabled = true;
                        btn.style.opacity = '0.5';
                    } else {
                        btn.onclick = () => this.buySkin(skin);
                    }
                } else if (skin.type === 'ads') {
                    const progress = this.saveManager.data.skinAdProgress[skin.id] || 0;
                    btn.textContent = `WATCH AD (${progress}/${skin.cost})`;
                    btn.onclick = () => this.watchAdForSkin(skin);
                }
            }

            item.appendChild(btn);
            grid.appendChild(item);
        });
    }

    buySkin(skin) {
        if (this.saveManager.spendCoins(skin.cost)) {
            this.saveManager.unlockSkin(skin.id);
            this.saveManager.setSkin(skin.id); // Auto-equip
            this.renderShop();
            // Sound?
        }
    }

    watchAdForSkin(skin) {
        if (this.app.adManager) {
            this.app.adManager.showRewardedAd(() => {
                // Increment progress
                const current = this.saveManager.data.skinAdProgress[skin.id] || 0;
                const next = current + 1;

                // Update progress in saveManager data directly (should add method)
                this.saveManager.data.skinAdProgress[skin.id] = next;
                this.saveManager.save();

                if (next >= skin.cost) {
                    this.saveManager.unlockSkin(skin.id);
                    this.saveManager.setSkin(skin.id);
                }

                this.renderShop();
            });
        }
    }

    buyNoAds() {
        // Simulate Purchase
        if (confirm("Remove Ads for $2.99? (Simulated)")) {
            this.saveManager.buyNoAds();
            alert("Ads Removed!");
        }
    }
}
