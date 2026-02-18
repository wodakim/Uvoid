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

            const title = document.createElement('h3');
            title.textContent = skin.name;
            title.style.color = skin.color;
            item.appendChild(title);

            // Live Preview Canvas
            const canvas = document.createElement('canvas');
            canvas.width = 80;
            canvas.height = 80;
            canvas.style.margin = '10px auto';
            canvas.style.display = 'block';
            const ctx = canvas.getContext('2d');

            // Draw Loop for Animation? No, just static frame is enough for now,
            // or simple interval. Let's do static for performance in menu.
            this.drawPreview(ctx, skin, 40, 40, 25);

            item.appendChild(canvas);

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

    drawPreview(ctx, skin, x, y, r) {
        ctx.clearRect(0, 0, 80, 80);

        // Void Hole
        ctx.fillStyle = '#000';
        ctx.beginPath();
        this.drawShape(ctx, x, y, r, skin.shape);
        ctx.fill();

        // Neon Rim
        ctx.strokeStyle = skin.color;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.shadowColor = skin.color;
        ctx.stroke();

        // Inner detail
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    drawShape(ctx, cx, cy, r, type) {
        if (type === 'square') {
            const side = r * Math.sqrt(2);
            ctx.rect(cx - side/2, cy - side/2, side, side);
        } else if (type === 'star') {
            this.drawStar(ctx, cx, cy, 5, r, r/2);
        } else if (type === 'gear') {
             this.drawGear(ctx, cx, cy, 8, r, r * 0.8);
        } else {
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
        }
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
    }

    drawGear(ctx, cx, cy, teeth, outerRadius, innerRadius) {
        const step = (Math.PI * 2) / (teeth * 2);
        for (let i = 0; i < teeth * 2; i++) {
            const r = (i % 2 === 0) ? outerRadius : innerRadius;
            const angle = i * step - Math.PI / 2;
            if (i===0) ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
            else ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        }
        ctx.closePath();
    }

    buySkin(skin) {
        if (this.saveManager.spendCoins(skin.cost)) {
            this.saveManager.unlockSkin(skin.id);
            this.saveManager.setSkin(skin.id);
            this.renderShop();
        }
    }

    watchAdForSkin(skin) {
        if (this.app.adManager) {
            this.app.adManager.showRewardedAd(() => {
                const current = this.saveManager.data.skinAdProgress[skin.id] || 0;
                const next = current + 1;
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
        // Show the new Modal instead of alert
        const modal = document.getElementById('modal-no-ads');
        modal.classList.remove('hidden');

        // Bind buttons
        const confirmBtn = document.getElementById('btn-confirm-no-ads');
        const cancelBtn = document.getElementById('btn-cancel-no-ads');

        // Remove old listeners to prevent stacking (quick fix)
        const newConfirm = confirmBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        newConfirm.addEventListener('click', () => {
            this.saveManager.buyNoAds();
            modal.classList.add('hidden');
            // Provide subtle feedback without alert
            const btn = document.getElementById('btn-no-ads');
            if(btn) { btn.textContent = 'NO ADS (OWNED)'; btn.disabled = true; }
        });

        newCancel.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }
}
