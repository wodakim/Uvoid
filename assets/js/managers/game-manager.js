import Player from '../entities/player.js';
import Bot from '../entities/bot.js';
import PoliceBot from '../entities/police-bot.js';
import Prop from '../entities/prop.js';
import PowerUp from '../entities/power-up.js';
import Particle from '../entities/particle.js';
import FloatingText from '../entities/floating-text.js';
import Physics from '../core/physics.js';
import Camera from '../core/camera.js';
import TrafficManager from './traffic-manager.js';
import MissionManager from './mission-manager.js';
import MapManager from './map-manager.js';
import UpgradeManager from './upgrade-manager.js';

export default class GameManager {
    constructor(app) {
        this.app = app;
        this.physics = new Physics(app.settingsManager);
        this.camera = new Camera(app.settingsManager);
        this.trafficManager = new TrafficManager(this); // Pass self

        this.entities = [];

        this.mapManager = new MapManager(this); // Pass self
        this.missionManager = new MissionManager(app.saveManager);
        this.upgradeManager = new UpgradeManager(this); // New

        this.player = null;

        this.state = 'MENU';
        this.score = 0;
        this.kills = 0;
        this.gameTime = 120;

        this.botCount = 10;
        this.policeCount = 0;
        this.maxPolice = 2;
        this.policeSpawnTimer = 0;

        this.killStreak = 0;
        this.lastKillTime = 0;
        this.slowMoTimer = 0;
        this.paused = false;

        this.startCountdown = 0; // New
    }

    startGame(duration = 120) {
        this.paused = false;
        this.app.soundManager.init();
        this.state = 'COUNTDOWN'; // Start in countdown
        this.startCountdown = 3; // 3 seconds

        this.score = 0;
        this.kills = 0;
        this.gameTime = duration;
        this.totalDuration = duration; // Store for rewards
        this.entities = [];
        this.upgradeManager = new UpgradeManager(this); // Reset upgrades

        // UI Transition
        this.app.saveManager.updateUI();
        this.app.uiManager.switchScreen('hud');
        this.app.uiManager.showCountdown(this.startCountdown);

        // Show Tutorial if first time
        this.app.uiManager.showTutorial();

        // Create Player (Hardcore Small Start)
        const skinInfo = this.app.saveManager.getCurrentSkinInfo();
        this.player = new Player(0, 0, 15, skinInfo.color, 'You', this.app.saveManager); // Radius 15
        this.player.shape = skinInfo.shape || 'circle';
        this.entities.push(this.player);

        // Reset Managers
        this.mapManager.activeChunks.clear();
        this.mapManager.update(0, 0);
        this.trafficManager.cars = [];

        // Create Bots (Small start)
        for (let i = 0; i < this.botCount; i++) {
            this.spawnBot();
        }

        // Reset Camera
        this.camera.x = 0;
        this.camera.y = 0;
        this.camera.zoom = 1;
    }

    update(dt) {
        // Handle Countdown State
        if (this.state === 'COUNTDOWN') {
            this.startCountdown -= dt;
            if (this.startCountdown <= 0) {
                this.state = 'PLAYING';
                this.app.uiManager.hideCountdown();
            } else {
                this.app.uiManager.updateCountdown(Math.ceil(this.startCountdown));
            }
            // Still render entities but don't update logic fully?
            // Actually, let's allow rendering but block movement.
            // MapManager update needed for initial render? Yes.
            this.mapManager.update(this.player.x, this.player.y);
            this.camera.follow(this.player, dt);
            return;
        }

        if (this.state !== 'PLAYING') return;
        if (this.paused) return;

        // SlowMo Recovery
        if (this.slowMoTimer > 0) {
            this.slowMoTimer -= dt;
            if (this.app.gameLoop.timeScale < 1.0) {
                 this.app.gameLoop.timeScale += 0.05;
                 if (this.app.gameLoop.timeScale > 1.0) this.app.gameLoop.timeScale = 1.0;
            }
        }

        // 1. Update Timer
        this.gameTime -= dt;
        if (this.gameTime <= 0) {
            this.gameOver();
            return;
        }

        // 2. Managers Update
        this.mapManager.update(this.player.x, this.player.y);
        this.trafficManager.update(dt);

        // Check Level Up (New)
        this.upgradeManager.checkLevelUp(this.score);

        // 3. Physics Update
        this.physics.update(dt, this.entities, (eater, eaten) => {
            // Sound & Feedback
            if (eater === this.player) {
                if (eaten.propType === 'police' || (eaten.type === 'bot' && eaten.isPolice)) {
                    this.app.soundManager.play('eatLarge');
                    this.spawnFloatingText(eater.x, eater.y, "CURED!", '#ff0000', 30);
                    this.camera.shake(20);
                    if (navigator.vibrate) navigator.vibrate(200);
                }
                else if (eaten.type === 'prop') {
                    this.app.soundManager.play('eatSmall');
                    const value = eaten.value || 1;
                    this.spawnFloatingText(eaten.x, eaten.y, `+${value}`, '#39ff14');
                    if (eaten.propType === 'car') this.missionManager.onEvent('eat_car');

                    // Trigger level up check on score gain
                    this.score += 0; // Already added in physics via grow(), but we track it here for UI?
                    // Physics calls hole.grow(). Player.score updates inside grow().
                    // We check this.player.score in updateHUD.
                    // Check level up here:
                    this.upgradeManager.checkLevelUp(this.player.score);
                }
                else if (eaten.type === 'hole') {
                    this.app.soundManager.play('eatLarge');
                    const reward = Math.floor(eaten.score / 3);
                    this.spawnFloatingText(eaten.x, eaten.y, `+${reward > 0 ? reward : 10}`, '#39ff14');
                    this.missionManager.onEvent('kill_hole');
                }
                else if (eaten.type === 'powerup') {
                    this.app.soundManager.play('levelUp');
                    this.spawnFloatingText(eater.x, eater.y, "SPEED!", '#00ffff');
                }
            }

            // Particles
            const pCount = eaten.type === 'hole' ? 10 : (eaten.value > 10 ? 5 : 2);
            this.spawnParticles(eaten.x, eaten.y, eaten.color, pCount);

            // Camera Shake
            if (eaten.type === 'hole') {
                this.camera.shake(25);
                if (eater === this.player) this.handlePlayerKill(eaten);
            } else if (eaten.value && eaten.value > 10) {
                this.camera.shake(5);
            }
        });

        // 4. Entity Logic Update
        this.entities.forEach(entity => {
            if (entity === this.player) {
                if (!entity.markedForDeletion) {
                    const input = this.app.inputHandler.getVector();
                    entity.update(dt, input);
                    this.camera.follow(this.player, dt);

                    // Optimized Zoom for Mobile "Triple A" Feel
                    const isMobile = window.innerWidth < 800;
                    const baseZoom = isMobile ? 0.6 : 1.0;
                    const minZoom = isMobile ? 0.25 : 0.35;

                    // Logarithmic-ish curve: Zooms out faster initially to show surroundings
                    // radius 25 -> zoom 0.6 (mobile)
                    // radius 100 -> zoom ~0.5
                    // radius 500 -> zoom ~0.25
                    const zoomFactor = (this.player.radius - 25) * 0.0015;
                    const targetZoom = Math.max(minZoom, baseZoom - zoomFactor);

                    this.camera.setTargetZoom(targetZoom);
                }
            } else if (entity.type === 'hole') {
                entity.update(dt, this.entities);
            } else if (entity.isPolice) {
                entity.update(dt, this.entities);
            } else if (entity.propType === 'human') {
                // Humans need entity list for AI (fleeing)
                entity.update(dt, this.entities);
            } else {
                if (entity.update) entity.update(dt);
            }
        });

        // 5. Cleanup & Spawning
        // Removed Bot Despawn Logic to allow them to live/grow globally
        this.entities = this.entities.filter(e => !e.markedForDeletion);

        const currentBots = this.entities.filter(e => e.type === 'hole' && e !== this.player).length;
        if (currentBots < this.botCount) {
             this.spawnBot();
        }

        if (Math.random() < 0.002) {
            this.spawnPowerUp();
        }

        if (this.player && this.player.markedForDeletion) {
            this.gameOver();
        }

        // 6. Update HUD
        this.updateHUD();

        // 7. Check Police Spawn
        this.checkPoliceSpawn(dt);
    }

    checkPoliceSpawn(dt) {
        if (!this.player || this.player.markedForDeletion) return;

        if (this.player.score > 500) {
             this.policeSpawnTimer += dt;
             const currentPolice = this.entities.filter(e => e.isPolice).length;

             if (currentPolice < this.maxPolice && this.policeSpawnTimer > 15) {
                 this.spawnPolice();
                 this.policeSpawnTimer = 0;
             }
        }
    }

    spawnPolice() {
        if (!this.player) return;
        const angle = Math.random() * Math.PI * 2;
        const dist = 1000 + Math.random() * 500;
        const x = this.player.x + Math.cos(angle) * dist;
        const y = this.player.y + Math.sin(angle) * dist;

        const police = new PoliceBot(x, y, 60);
        this.entities.push(police);

        this.app.uiManager.showNotification("POLICE ALERT!", "#ff0000");
        this.app.soundManager.play('siren');
    }

    spawnBot() {
        if (!this.player) return;
        let x, y, dist;
        let attempts = 0;
        do {
            const angle = Math.random() * Math.PI * 2;
            const d = 800 + Math.random() * 1200;
            x = this.player.x + Math.cos(angle) * d;
            y = this.player.y + Math.sin(angle) * d;

            const dx = x - this.player.x;
            const dy = y - this.player.y;
            dist = Math.sqrt(dx*dx + dy*dy);
            attempts++;
        } while (dist < 800 && attempts < 10);

        const names = ['VoidWalker', 'Eater_X', 'NoBrainer', 'Destroyer99', 'AbyssKing', 'NullPtr', 'GlitchUser', 'System32', 'DarkMatter', 'HorizonEvent'];
        const name = names[Math.floor(Math.random() * names.length)];

        const skin = Bot.getRandomSkin();

        // Start same size as player: 15 + small random variance
        const bot = new Bot(x, y, 15 + Math.random() * 3, skin.color, name);
        bot.shape = skin.shape;
        this.entities.push(bot);
    }

    spawnPowerUp() {
        if (!this.player) return;
        const angle = Math.random() * Math.PI * 2;
        const dist = 300 + Math.random() * 500;
        const x = this.player.x + Math.cos(angle) * dist;
        const y = this.player.y + Math.sin(angle) * dist;

        this.entities.push(new PowerUp(x, y, 'speed'));
    }

    handlePlayerKill(victim) {
        this.kills++;
        const now = Date.now();
        if (now - this.lastKillTime < 5000) {
            this.killStreak++;
        } else {
            this.killStreak = 1;
        }
        this.lastKillTime = now;

        this.app.gameLoop.timeScale = 0.2;
        this.slowMoTimer = 0.5;

        let text = "KILL!";
        let color = "#fff";
        let size = 30;

        if (this.killStreak === 2) { text = "DOUBLE KILL!"; color = "#ffae00"; size = 40; }
        if (this.killStreak === 3) { text = "TRIPLE KILL!"; color = "#ff00ff"; size = 50; }
        if (this.killStreak >= 4) { text = "RAMPAGE!"; color = "#ff0000"; size = 60; }

        this.spawnFloatingText(this.player.x, this.player.y - 50, text, color, size);
    }

    spawnParticles(x, y, color, amount = 5) {
        const count = Math.min(amount, 8);
        for (let i = 0; i < count; i++) {
            this.entities.push(new Particle(x, y, color));
        }
    }

    spawnFloatingText(x, y, text, color, fontSize=20) {
        this.entities.push(new FloatingText(x, y, text, color, fontSize));
    }

    updateHUD() {
        if (!this.player) return;
        const holes = this.entities.filter(e => e.type === 'hole');
        this.app.uiManager.updateHUD(this.gameTime, this.player.score, this.kills, holes, this.player);
    }

    gameOver() {
        this.state = 'GAMEOVER';
        const holes = this.entities.filter(e => e.type === 'hole');
        holes.sort((a, b) => b.radius - a.radius);
        const rank = holes.indexOf(this.player) + 1 || holes.length + 1;

        if (this.player.score > 5000) this.missionManager.onEvent('reach_mass', 5000);
        const missionReward = this.missionManager.checkCompletion();

        // Fixed Match Reward based on Duration
        let matchReward = 0;
        // Check initial duration (gameTime is current remaining, need original)
        // We can infer or store it. Let's assume standard durations:
        // Short (2m/120s) -> 50
        // Medium (5m/300s) -> 200
        // Long (10m/600s) -> 1000
        // We need to store 'maxTime' or 'totalDuration' in startGame.
        // For now, let's use a heuristic or add a property.

        // Quick fix: Add this.totalDuration to startGame
        if (this.totalDuration >= 600) matchReward = 1000;
        else if (this.totalDuration >= 300) matchReward = 200;
        else matchReward = 50;

        const coinsEarned = matchReward + missionReward;
        this.app.saveManager.addCoins(coinsEarned);

        if (this.player.score > this.app.saveManager.getHighScore()) {
            this.app.saveManager.setHighScore(this.player.score);
        }

        this.app.uiManager.showGameOver(rank, coinsEarned);
    }

    revivePlayer() {
        this.app.adManager.showRewardedAd(() => {
             this.player.markedForDeletion = false;
             // Don't reset radius completely? Or maybe keep half mass?
             // "Revive" usually implies keeping progress.
             // But "Reset to 15" was there. Let's keep 50% mass as a bonus.
             this.player.radius = Math.max(15, this.player.radius * 0.5);

             // Respawn safely away from enemies
             // Find a safe spot
             let safeX = this.player.x;
             let safeY = this.player.y;
             let foundSafe = false;

             for(let i=0; i<10; i++) {
                 const angle = Math.random() * Math.PI * 2;
                 const dist = 500;
                 const tx = this.player.x + Math.cos(angle) * dist;
                 const ty = this.player.y + Math.sin(angle) * dist;
                 // Simple check: is there a big hole nearby?
                 const danger = this.entities.find(e => e.type === 'hole' && e !== this.player && e.radius > this.player.radius);
                 if (!danger) {
                     safeX = tx;
                     safeY = ty;
                     foundSafe = true;
                     break;
                 }
             }

             if (!foundSafe) {
                 safeX += 1000; // Just move far away
             }

             this.player.x = safeX;
             this.player.y = safeY;

             // Invulnerability
             this.player.invulnerable = true;
             this.player.invulnerableTimer = 3.0; // 3 seconds

             this.entities.push(this.player);

             this.state = 'PLAYING';
             this.gameTime += 30; // Extra time

             this.app.uiManager.switchScreen('hud');
        });
    }

    pauseGame() {
        if (this.state === 'PLAYING') {
            this.paused = true;
            this.app.uiManager.switchScreen('pause');
        }
    }

    resumeGame() {
        this.paused = false;
        this.app.uiManager.switchScreen('hud');
    }

    quitGame() {
        this.state = 'MENU';
        this.paused = false;
        this.entities = [];
        this.player = null;
        this.app.uiManager.switchScreen('menu');
        this.app.saveManager.updateUI();
    }
}
