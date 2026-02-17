export default class AdManager {
    constructor() {
        this.loaded = false;
    }

    showRewardedAd(callback) {
        console.log("Simulating Rewarded Ad...");
        // Show Spinner / Loading
        const spinner = document.createElement('div');
        spinner.style.position = 'absolute';
        spinner.style.top = '0';
        spinner.style.left = '0';
        spinner.style.width = '100%';
        spinner.style.height = '100%';
        spinner.style.background = 'rgba(0,0,0,0.8)';
        spinner.style.color = 'white';
        spinner.style.display = 'flex';
        spinner.style.justifyContent = 'center';
        spinner.style.alignItems = 'center';
        spinner.style.zIndex = '1000';
        spinner.innerHTML = '<h1>WATCHING AD... (3s)</h1>';
        document.body.appendChild(spinner);

        setTimeout(() => {
            document.body.removeChild(spinner);
            if (callback) callback();
        }, 3000);
    }
}
