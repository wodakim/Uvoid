export default class SoundManager {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.ctx = null;
        this.masterGain = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        if (this.settingsManager && !this.settingsManager.get('sound')) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3; // Low volume
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
            this.startDrone();
        } catch (e) {
            console.warn("AudioContext not supported or blocked");
        }
    }

    play(type) {
        if (!this.initialized) {
            // Try to init on first user interaction if not already
            if (this.settingsManager && this.settingsManager.get('sound')) {
                 this.init();
            }
            if (!this.initialized) return;
        }

        if (this.settingsManager && !this.settingsManager.get('sound')) return;

        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);

        const now = this.ctx.currentTime;

        if (type === 'eatSmall') {
            // High blip
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gain.gain.setValueAtTime(1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        }
        else if (type === 'eatLarge') {
            // Low thud
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
            gain.gain.setValueAtTime(1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        }
        else if (type === 'levelUp') {
            // Arpeggio
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(500, now + 0.1);
            osc.frequency.setValueAtTime(600, now + 0.2);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        }
        else if (type === 'siren') {
            // Police Siren
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.linearRampToValueAtTime(1200, now + 0.5);
            osc.frequency.linearRampToValueAtTime(600, now + 1.0);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 1.0);
            gain.gain.linearRampToValueAtTime(0, now + 1.5);

            osc.start(now);
            osc.stop(now + 1.5);
        }
    }

    startDrone() {
        // Low frequency drone loop
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'sawtooth';
        osc.frequency.value = 50;
        gain.gain.value = 0.05;

        // LFO for modulation
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 500; // Filter modulation depth

        // Filter
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;

        osc.disconnect();
        osc.connect(filter);
        filter.connect(gain);

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        osc.start();
    }
}
