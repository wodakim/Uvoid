export default class SettingsManager {
    constructor() {
        this.settings = {
            screenShake: false,
            hapticFeedback: false,
            visualEffects: true,
            sound: true,
            music: true
        };
        this.load();
    }

    load() {
        const stored = localStorage.getItem('urban_void_settings');
        if (stored) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(stored) };
            } catch (e) {
                console.error("Settings corrupted, resetting.", e);
            }
        }
    }

    save() {
        localStorage.setItem('urban_void_settings', JSON.stringify(this.settings));
    }

    toggle(key) {
        if (this.settings.hasOwnProperty(key)) {
            this.settings[key] = !this.settings[key];
            this.save();
            return this.settings[key];
        }
        return null;
    }

    get(key) {
        return this.settings[key];
    }
}
