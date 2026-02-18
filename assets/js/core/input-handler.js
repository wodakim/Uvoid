export default class InputHandler {
    constructor(canvas) {
        this.canvas = canvas;
        this.joystickZone = document.getElementById('joystick-zone');
        this.joystickVisual = document.getElementById('dynamic-joystick');
        this.joystickKnob = this.joystickVisual ? this.joystickVisual.querySelector('.joystick-knob') : null;

        // State
        this.active = false;
        this.isTouch = false;
        this.origin = { x: 0, y: 0 }; // Start of drag
        this.current = { x: 0, y: 0 }; // Current pointer
        this.vector = { x: 0, y: 0 }; // Normalized output
        this.touchId = null;

        // Config
        this.maxRadius = 50;

        this.init();
    }

    init() {
        const zone = this.joystickZone;
        if (!zone) return;

        // Touch Events (Dynamic Joystick)
        zone.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        zone.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        zone.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        zone.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });

        // Mouse Events (Fallback/Desktop)
        zone.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    handleTouchStart(e) {
        if (e.target.closest('button')) return; // Ignore buttons
        // e.preventDefault(); // Do NOT prevent default here if you want buttons to work, but we check buttons first.
        // However, if we preventDefault, it stops scrolling.
        // If we are on the zone (which is full screen but below buttons), we want to prevent scroll.

        if (this.active) return;

        const touch = e.changedTouches[0];
        this.touchId = touch.identifier;
        this.isTouch = true;
        this.active = true;

        this.origin = { x: touch.clientX, y: touch.clientY };
        this.current = { x: touch.clientX, y: touch.clientY };

        this.showJoystick(this.origin.x, this.origin.y);
        this.updateVector();
    }

    handleTouchMove(e) {
        if (!this.active || !this.isTouch) return;
        e.preventDefault(); // Stop scroll while dragging

        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === this.touchId) {
                const touch = e.changedTouches[i];
                this.current = { x: touch.clientX, y: touch.clientY };
                this.updateJoystickVisual();
                this.updateVector();
                break;
            }
        }
    }

    handleTouchEnd(e) {
        if (!this.active || !this.isTouch) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === this.touchId) {
                // e.preventDefault(); // No need to prevent default on end usually
                this.endInput();
                break;
            }
        }
    }

    handleMouseDown(e) {
        if (e.target.closest('button')) return;
        this.active = true;
        this.isTouch = false;
        this.origin = { x: e.clientX, y: e.clientY };
        this.current = { x: e.clientX, y: e.clientY };
        this.showJoystick(this.origin.x, this.origin.y);
        this.updateVector();
    }

    handleMouseMove(e) {
        if (!this.active || this.isTouch) return;
        this.current = { x: e.clientX, y: e.clientY };
        this.updateJoystickVisual();
        this.updateVector();
    }

    handleMouseUp(e) {
        if (this.isTouch) return;
        if (this.active) this.endInput();
    }

    endInput() {
        this.active = false;
        this.vector = { x: 0, y: 0 };
        this.hideJoystick();
    }

    updateVector() {
        const dx = this.current.x - this.origin.x;
        const dy = this.current.y - this.origin.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist === 0) {
            this.vector = { x: 0, y: 0 };
            return;
        }

        // Clamp magnitude for visual
        let magnitude = dist / this.maxRadius;
        if (magnitude > 1) magnitude = 1;

        // Vector direction
        const normalX = dx / dist;
        const normalY = dy / dist;

        this.vector = {
            x: normalX * magnitude,
            y: normalY * magnitude
        };
    }

    showJoystick(x, y) {
        if (this.joystickVisual) {
            this.joystickVisual.classList.remove('hidden');
            this.joystickVisual.style.left = `${x}px`;
            this.joystickVisual.style.top = `${y}px`;

            // Initial knob reset logic handled in updateJoystickVisual mostly, but ensure:
            if (this.joystickKnob) {
                this.joystickKnob.style.transform = `translate(-50%, -50%)`;
            }
            this.updateJoystickVisual(); // Call immediately to set 0 position correctly
        }
    }

    hideJoystick() {
        if (this.joystickVisual) {
            this.joystickVisual.classList.add('hidden');
        }
    }

    updateJoystickVisual() {
        if (this.joystickKnob) {
            // Calculate knob position relative to center
            const dx = this.current.x - this.origin.x;
            const dy = this.current.y - this.origin.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            // Clamp visual movement to radius
            let visualRadius = dist;
            if (dist > this.maxRadius) visualRadius = this.maxRadius;

            let vx = 0;
            let vy = 0;

            if (dist > 0) {
                vx = (dx / dist) * visualRadius;
                vy = (dy / dist) * visualRadius;
            }

            // Using transform translate to move from center
            this.joystickKnob.style.transform = `translate(calc(-50% + ${vx}px), calc(-50% + ${vy}px))`;
        }
    }

    getVector() {
        return this.vector;
    }
}
