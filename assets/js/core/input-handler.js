export default class InputHandler {
    constructor(canvas) {
        this.canvas = canvas;
        this.joystickZone = document.getElementById('joystick-zone');

        // State
        this.active = false; // Is input active?
        this.inputVector = { x: 0, y: 0 };
        this.pointerPosition = { x: 0, y: 0 };
        this.origin = { x: 0, y: 0 }; // For virtual joystick
        this.joystickId = null;

        // Configuration
        this.maxJoystickRadius = 50; // Max distance for full speed
        this.isTouch = false;

        this.init();
    }

    init() {
        const zone = this.joystickZone;

        // Touch Events
        // Use passive: false to allow preventDefault()
        // Bind methods to this instance
        zone.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        zone.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        zone.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        zone.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });

        // Mouse Events
        // Global mouse listeners for smoother desktop testing
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    // --- Touch Logic (Virtual Joystick) ---
    handleTouchStart(e) {
        // Prevent scrolling if touching the joystick zone
        if (e.cancelable) e.preventDefault();

        if (this.active) return; // Already tracking a touch

        const touch = e.changedTouches[0];
        this.joystickId = touch.identifier;
        this.isTouch = true;
        this.active = true;

        // Set origin to where user touched (Dynamic Joystick)
        this.origin = { x: touch.clientX, y: touch.clientY };
        this.pointerPosition = { x: touch.clientX, y: touch.clientY };

        this.updateVector();
    }

    handleTouchMove(e) {
        if (!this.active || !this.isTouch) return;
        if (e.cancelable) e.preventDefault(); // Always prevent scroll during drag

        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === this.joystickId) {
                const touch = e.changedTouches[i];
                this.pointerPosition = { x: touch.clientX, y: touch.clientY };
                this.updateVector();
                break;
            }
        }
    }

    handleTouchEnd(e) {
        if (!this.active || !this.isTouch) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === this.joystickId) {
                if (e.cancelable) e.preventDefault();
                this.active = false;
                this.inputVector = { x: 0, y: 0 };
                this.isTouch = false;
                this.joystickId = null;
                break;
            }
        }
    }

    // --- Mouse Logic (Follow Mouse) ---
    handleMouseDown(e) {
        if (this.isTouch) return; // Ignore mouse if touch is active
        // Only active if clicking on canvas/zone, but let's allow global for ease
        this.active = true;
        this.pointerPosition = { x: e.clientX, y: e.clientY };
        this.origin = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        this.updateVector();
    }

    handleMouseMove(e) {
        if (this.isTouch) return;
        this.pointerPosition = { x: e.clientX, y: e.clientY };

        if (this.active) {
             this.origin = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
             this.updateVector();
        }
    }

    handleMouseUp(e) {
        if (this.isTouch) return;
        this.active = false;
        this.inputVector = { x: 0, y: 0 };
    }

    // --- Common Logic ---
    updateVector() {
        const dx = this.pointerPosition.x - this.origin.x;
        const dy = this.pointerPosition.y - this.origin.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
            this.inputVector = { x: 0, y: 0 };
            return;
        }

        // Normalize
        const nx = dx / distance;
        const ny = dy / distance;

        let magnitude = distance / this.maxJoystickRadius;
        if (magnitude > 1) magnitude = 1;

        this.inputVector = { x: nx * magnitude, y: ny * magnitude };
    }

    getVector() {
        return this.inputVector;
    }
}
