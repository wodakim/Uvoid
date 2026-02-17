import Minimap from './minimap.js';

export default class UIManager {
    constructor(app) {
        this.app = app;
        this.screens = {
            menu: document.getElementById('screen-main-menu'),
            hud: document.getElementById('screen-hud'),
            shop: document.getElementById('screen-shop'),
            gameOver: document.getElementById('screen-game-over'),
            pause: document.getElementById('screen-pause'),
            matchmaking: document.getElementById('screen-matchmaking'),
            levelup: document.getElementById('screen-levelup')
        };

        this.popups = {
            timeSelect: document.getElementById('popup-time-select'),
            settings: document.getElementById('popup-settings')
        };

        this.minimap = new Minimap(document.getElementById('minimap-canvas'), app);
        this.bindEvents();
    }

    bindEvents() {
        // Main Menu - Play Button triggers Popup
        const playBtn = document.getElementById('btn-play-menu');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.showPopup('timeSelect');
            });
        }

        // Settings
        const settingsBtn = document.getElementById('btn-settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.updateSettingsUI();
                this.showPopup('settings');
            });
        }

        document.getElementById('btn-close-settings').addEventListener('click', () => this.hidePopup('settings'));

        // Settings Toggles
        this.bindSettingToggle('btn-toggle-sound', 'sound');
        this.bindSettingToggle('btn-toggle-music', 'music');
        this.bindSettingToggle('btn-toggle-shake', 'screenShake');
        this.bindSettingToggle('btn-toggle-haptic', 'hapticFeedback');

        // Time Selection inside Popup
        const timeButtons = document.querySelectorAll('.btn-time');
        timeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Handle click on span or button
                const target = e.target.closest('.btn-time');
                const time = parseInt(target.dataset.time);
                this.hidePopup('timeSelect');
                this.startMatchmaking(time);
            });
        });

        // Close Popup
        const closePopup = document.getElementById('btn-close-popup');
        if (closePopup) {
            closePopup.addEventListener('click', () => this.hidePopup('timeSelect'));
        }

        document.getElementById('btn-shop').addEventListener('click', () => this.app.shopManager.openShop());
        document.getElementById('btn-no-ads').addEventListener('click', () => this.app.shopManager.buyNoAds());

        // Shop
        document.getElementById('btn-back-shop').addEventListener('click', () => this.app.shopManager.closeShop());

        // Game Over
        document.getElementById('btn-revive').addEventListener('click', () => this.app.gameManager.revivePlayer());
        document.getElementById('btn-replay').addEventListener('click', () => {
             this.app.gameManager.startGame(this.lastDuration || 120);
        });
        document.getElementById('btn-menu-gameover').addEventListener('click', () => this.app.gameManager.quitGame());

        // Pause
        document.getElementById('btn-pause').addEventListener('click', () => this.app.gameManager.pauseGame());
        document.getElementById('btn-resume').addEventListener('click', () => this.app.gameManager.resumeGame());
        document.getElementById('btn-quit').addEventListener('click', () => this.app.gameManager.quitGame());
    }

    startMatchmaking(duration) {
        this.lastDuration = duration;
        this.switchScreen('matchmaking');

        const waitSpan = document.getElementById('wait-time');
        let timeLeft = 3;
        if (waitSpan) waitSpan.textContent = timeLeft;

        const interval = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0 && waitSpan) waitSpan.textContent = timeLeft;
        }, 1000);

        setTimeout(() => {
            clearInterval(interval);
            if (this.app && this.app.gameManager) {
                this.app.gameManager.startGame(duration);
            }
        }, 3000);
    }

    bindSettingToggle(btnId, settingKey) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                const newState = this.app.settingsManager.toggle(settingKey);
                this.updateToggleBtn(btn, newState);
            });
        }
    }

    updateSettingsUI() {
        this.updateToggleBtn(document.getElementById('btn-toggle-sound'), this.app.settingsManager.get('sound'));
        this.updateToggleBtn(document.getElementById('btn-toggle-music'), this.app.settingsManager.get('music'));
        this.updateToggleBtn(document.getElementById('btn-toggle-shake'), this.app.settingsManager.get('screenShake'));
        this.updateToggleBtn(document.getElementById('btn-toggle-haptic'), this.app.settingsManager.get('hapticFeedback'));
    }

    updateToggleBtn(btn, isActive) {
        if (!btn) return;
        if (isActive) {
            btn.textContent = 'ON';
            btn.classList.add('active');
        } else {
            btn.textContent = 'OFF';
            btn.classList.remove('active');
        }
    }

    showPopup(name) {
        const p = this.popups[name];
        if (p) {
            p.classList.remove('hidden');
            // Add animation class if needed
            p.querySelector('.popup-content').classList.add('popup-enter');
        }
    }

    hidePopup(name) {
        const p = this.popups[name];
        if (p) {
            p.classList.add('hidden');
        }
    }

    showCountdown(num) {
        let el = document.getElementById('countdown-overlay');
        if (!el) {
            el = document.createElement('div');
            el.id = 'countdown-overlay';
            el.style.position = 'absolute';
            el.style.top = '0';
            el.style.left = '0';
            el.style.width = '100%';
            el.style.height = '100%';
            el.style.display = 'flex';
            el.style.justifyContent = 'center';
            el.style.alignItems = 'center';
            el.style.fontSize = '8rem';
            el.style.fontWeight = '900';
            el.style.color = '#fff';
            el.style.textShadow = '0 0 20px #00f3ff';
            el.style.zIndex = '100';
            el.style.pointerEvents = 'none';
            document.body.appendChild(el);
        }
        el.textContent = num;
        el.classList.remove('hidden');
    }

    updateCountdown(num) {
        const el = document.getElementById('countdown-overlay');
        if (el) el.textContent = num;
    }

    hideCountdown() {
        const el = document.getElementById('countdown-overlay');
        if (el) el.classList.add('hidden');
    }

    showLevelUp(choices, onSelect) {
        this.switchScreen('levelup');
        const container = document.getElementById('upgrade-cards-container');
        if (!container) return;
        container.innerHTML = '';

        choices.forEach((choice, index) => {
            const card = document.createElement('div');
            card.className = 'upgrade-card';
            card.style.animationDelay = `${index * 0.1}s`; // Stagger animation

            const icon = document.createElement('div');
            icon.className = 'upgrade-icon';
            icon.textContent = choice.icon;

            const title = document.createElement('h3');
            title.textContent = choice.name;

            const desc = document.createElement('p');
            desc.textContent = choice.desc;

            card.appendChild(icon);
            card.appendChild(title);
            card.appendChild(desc);

            card.addEventListener('click', () => {
                onSelect(choice.id);
            });

            container.appendChild(card);
        });
    }

    switchScreen(screenName) {
        Object.values(this.screens).forEach(s => {
            if (s) {
                s.classList.add('hidden');
                s.classList.remove('active');
            }
        });

        const screen = this.screens[screenName];
        if (screen) {
            screen.classList.remove('hidden');
            screen.classList.add('active');
        }
    }

    updateHUD(time, score, kills, players, player) {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        document.getElementById('game-timer').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

        this.animateValue('hud-score', Math.floor(score));
        document.getElementById('hud-kills').textContent = kills;

        const leaderboard = document.getElementById('leaderboard');
        leaderboard.innerHTML = '';

        const sorted = [...players].sort((a, b) => b.radius - a.radius).slice(0, 5);

        sorted.forEach((h, index) => {
            const div = document.createElement('div');
            div.className = 'rank-item';
            div.textContent = `${index + 1}. ${h.name} (${Math.floor(h.score || h.radius)})`;
            if (h === player) div.style.color = '#ffae00';
            leaderboard.appendChild(div);
        });

        this.minimap.update();
    }

    updateMenuCoins(coins) {
        const menuCoins = document.getElementById('menu-coin-count');
        if (menuCoins) menuCoins.textContent = coins;

        if (this.app.gameManager && this.app.gameManager.missionManager) {
            this.updateMissions(this.app.gameManager.missionManager.getMissionsText());
        }

        const shopCoins = document.getElementById('shop-coin-count');
        if (shopCoins) shopCoins.textContent = coins;

        const badge = document.getElementById('shop-badge');
        if (badge) {
            if (coins >= 500) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    updateMissions(missions) {
        const list = document.getElementById('mission-list');
        if (!list) return;
        list.innerHTML = '';
        missions.forEach(txt => {
            const li = document.createElement('li');
            li.textContent = txt;
            list.appendChild(li);
        });
    }

    showGameOver(rank, coinsEarned) {
        this.switchScreen('gameOver');
        document.getElementById('final-rank').textContent = `RANK #${rank}`;
        document.getElementById('earned-coins').textContent = coinsEarned;

        const bar = document.getElementById('progress-bar-fill');
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.width = '100%';
        }, 100);
    }

    showNotification(text, color) {
        let notif = document.getElementById('notification-overlay');
        if (!notif) {
            notif = document.createElement('div');
            notif.id = 'notification-overlay';
            notif.style.position = 'absolute';
            notif.style.top = '15%';
            notif.style.left = '50%';
            notif.style.transform = 'translate(-50%, -50%)';
            notif.style.fontSize = '24px';
            notif.style.fontWeight = 'bold';
            notif.style.fontFamily = 'Montserrat, sans-serif';
            notif.style.textShadow = '0 0 10px #000';
            notif.style.zIndex = '1000';
            notif.style.pointerEvents = 'none';
            notif.style.transition = 'opacity 0.5s';
            document.body.appendChild(notif);
        }

        notif.textContent = text;
        notif.style.color = color || '#fff';
        notif.style.opacity = '1';

        setTimeout(() => {
            notif.style.opacity = '0';
        }, 3000);
    }

    animateValue(id, end) {
        const obj = document.getElementById(id);
        if (!obj) return;

        // Store current value to avoid jumping
        let start = parseInt(obj.textContent) || 0;
        if (start === end) return;

        const range = end - start;
        // If difference is small, just set it
        if (Math.abs(range) < 5) {
            obj.textContent = end;
            return;
        }

        const duration = 500;
        let startTime = null;

        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            obj.textContent = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.textContent = end;
            }
        };
        window.requestAnimationFrame(step);
    }

    showTutorial() {
        if (localStorage.getItem('urban_void_tutorial_seen')) return;

        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0,0,0,0.7)';
        overlay.style.zIndex = '2000';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.flexDirection = 'column';
        overlay.style.pointerEvents = 'none'; // Allow touch through? No, we need to detect first touch.

        const hand = document.createElement('div');
        hand.innerHTML = '👆';
        hand.style.fontSize = '5rem';
        hand.style.animation = 'tutorial-swiping 1.5s infinite';

        const text = document.createElement('h2');
        text.textContent = 'DRAG TO MOVE';
        text.style.color = '#fff';
        text.style.fontFamily = 'Montserrat, sans-serif';
        text.style.marginTop = '20px';
        text.style.textShadow = '0 0 10px #00f3ff';

        overlay.appendChild(hand);
        overlay.appendChild(text);
        document.body.appendChild(overlay);

        // Add CSS for animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes tutorial-swiping {
                0% { transform: translateX(-50px) rotate(-10deg); opacity: 0.5; }
                50% { transform: translateX(50px) rotate(10deg); opacity: 1; }
                100% { transform: translateX(-50px) rotate(-10deg); opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);

        // Remove on first interaction
        const removeTutorial = () => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
                if(style.parentNode) style.parentNode.removeChild(style);
            }, 500);
            localStorage.setItem('urban_void_tutorial_seen', 'true');
            window.removeEventListener('touchstart', removeTutorial);
            window.removeEventListener('mousedown', removeTutorial);
        };

        // Delay slightly to let game start
        setTimeout(() => {
            window.addEventListener('touchstart', removeTutorial);
            window.addEventListener('mousedown', removeTutorial);
        }, 1000);
    }
}
