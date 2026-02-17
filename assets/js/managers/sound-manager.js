export default class SoundManager {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.ctx = null;
        this.masterGain = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        // User interaction required to unlock audio
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;

            // Background Drone (Cyberpunk Ambience)
            if (this.settingsManager.get('music')) {
                this.startDrone();
            }
        } catch (e) {
            console.warn("AudioContext not supported or blocked");
        }
    }

    play(type) {
        if (!this.initialized) {
            if (this.settingsManager && (this.settingsManager.get('sound') || this.settingsManager.get('music'))) {
                 this.init();
            }
            if (!this.initialized) return;
        }

        if (this.settingsManager && !this.settingsManager.get('sound')) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;

        // Random pitch variation for organic feel
        const pitchMod = 0.9 + Math.random() * 0.2;

        if (type === 'eatSmall') {
            // Crunchy Pop
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600 * pitchMod, now);
            osc.frequency.exponentialRampToValueAtTime(1200 * pitchMod, now + 0.05);

            gain.gain.setValueAtTime(0.8, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

            osc.start(now);
            osc.stop(now + 0.1);
        }
        else if (type === 'eatLarge') {
            // Deep Bass Thud
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(150 * pitchMod, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);

            gain.gain.setValueAtTime(1.0, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

            osc.start(now);
            osc.stop(now + 0.4);
        }
        else if (type === 'levelUp') {
            // Synth Arpeggio
            const notes = [440, 554, 659, 880]; // A Major
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain);
                gain.connect(this.masterGain);

                osc.type = 'square';
                osc.frequency.value = freq;

                const startTime = now + i * 0.05;
                gain.gain.setValueAtTime(0.1, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

                osc.start(startTime);
                osc.stop(startTime + 0.3);
            });
        }
        else if (type === 'siren') {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.linearRampToValueAtTime(1500, now + 0.4);
            osc.frequency.linearRampToValueAtTime(800, now + 0.8);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0, now + 1.0);

            osc.start(now);
            osc.stop(now + 1.0);
        }
    }

    startDrone() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'sawtooth';
        osc.frequency.value = 40;

        // Lowpass Filter for "Underwater/Space" feel
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 120;

        osc.disconnect();
        osc.connect(filter);
        filter.connect(gain);

        gain.gain.value = 0.15;

        osc.start();
        // Keep reference to stop later if needed (toggle music)
        this.droneOsc = osc;
        this.droneGain = gain;
    }

    toggleMusic(enabled) {
        if (enabled) {
            if (!this.droneOsc && this.initialized) this.startDrone();
            if (this.droneGain) this.droneGain.gain.setTargetAtTime(0.15, this.ctx.currentTime, 0.5);
        } else {
            if (this.droneGain) this.droneGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
        }
    }
}
