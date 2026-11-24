/**
 * src/managers/InputManager.js
 * Gestionnaire d'entrées unifié : Clavier (AZERTY/QWERTY/Flèches), Souris et Manette (Gamepad API).
 * - Détection automatique instantanée du périphérique actif ("keyboardMouse" / "gamepad")
 * - Dead zones configurables, mouvement analogique et normalisation diagonale
 * - Visée souris et stick droit avec assistance légère configurable
 * - Prompts dynamiques adaptés au périphérique actif
 * - Support hot-plug manette, retour haptique doux et rebinding persistant (RGPD)
 * Compatible Browser (global window) & Node.js (CommonJS).
 */

const InputActions = {
    MOVE_UP: 'MOVE_UP',
    MOVE_DOWN: 'MOVE_DOWN',
    MOVE_LEFT: 'MOVE_LEFT',
    MOVE_RIGHT: 'MOVE_RIGHT',
    ATTACK: 'ATTACK',
    INTERACT: 'INTERACT',
    SECONDARY_ACTION: 'SECONDARY_ACTION',
    SPRINT: 'SPRINT',
    INVENTORY: 'INVENTORY',
    MAP: 'MAP',
    QUESTS: 'QUESTS',
    CRAFT: 'CRAFT',
    CHARACTER: 'CHARACTER',
    CONFIRM: 'CONFIRM',
    CANCEL: 'CANCEL',
    MENU: 'MENU'
};

const DEFAULT_INPUT_PREFERENCES = {
    deadzone: 0.18,
    stickSensitivity: 1.0,
    aimAssist: true,
    aimAssistAngleDeg: 18,
    vibrationEnabled: true,
    bindings: {
        MOVE_UP: ['Z', 'W', 'UP'],
        MOVE_DOWN: ['S', 'DOWN'],
        MOVE_LEFT: ['Q', 'A', 'LEFT'],
        MOVE_RIGHT: ['D', 'RIGHT'],
        ATTACK: ['SPACE'],
        INTERACT: ['E'],
        SECONDARY_ACTION: ['F'],
        SPRINT: ['SHIFT'],
        INVENTORY: ['I'],
        MAP: ['M'],
        QUESTS: ['J'],
        CRAFT: ['K'],
        CHARACTER: ['C'],
        CONFIRM: ['ENTER', 'SPACE'],
        CANCEL: ['ESC'],
        MENU: ['ESC']
    }
};

// Standard W3C Gamepad button indices (Xbox / PlayStation / Generic)
const GAMEPAD_BUTTONS = {
    A_CROSS: 0,
    B_CIRCLE: 1,
    X_SQUARE: 2,
    Y_TRIANGLE: 3,
    L1_LB: 4,
    R1_RB: 5,
    L2_LT: 6,
    R2_RT: 7,
    SELECT_VIEW: 8,
    START_OPTIONS: 9,
    L3: 10,
    R3: 11,
    DPAD_UP: 12,
    DPAD_DOWN: 13,
    DPAD_LEFT: 14,
    DPAD_RIGHT: 15
};

const ACTION_GAMEPAD_MAP = {
    INTERACT: [GAMEPAD_BUTTONS.A_CROSS],
    CONFIRM: [GAMEPAD_BUTTONS.A_CROSS],
    CANCEL: [GAMEPAD_BUTTONS.B_CIRCLE],
    ATTACK: [GAMEPAD_BUTTONS.X_SQUARE],
    INVENTORY: [GAMEPAD_BUTTONS.Y_TRIANGLE],
    SPRINT: [GAMEPAD_BUTTONS.R1_RB, GAMEPAD_BUTTONS.L3],
    SECONDARY_ACTION: [GAMEPAD_BUTTONS.R2_RT],
    MAP: [GAMEPAD_BUTTONS.SELECT_VIEW],
    MENU: [GAMEPAD_BUTTONS.START_OPTIONS],
    QUESTS: [GAMEPAD_BUTTONS.L1_LB],
    CRAFT: [GAMEPAD_BUTTONS.L2_LT],
    MOVE_UP: [GAMEPAD_BUTTONS.DPAD_UP],
    MOVE_DOWN: [GAMEPAD_BUTTONS.DPAD_DOWN],
    MOVE_LEFT: [GAMEPAD_BUTTONS.DPAD_LEFT],
    MOVE_RIGHT: [GAMEPAD_BUTTONS.DPAD_RIGHT]
};

class InputManager {
    constructor(options = {}) {
        this.inputMode = 'keyboardMouse'; // 'keyboardMouse' | 'gamepad'
        this.gamepadFamily = 'generic';   // 'xbox' | 'playstation' | 'generic'
        this.activePad = null;
        this.connectedPads = [];

        this.preferences = this._cloneDefaults();
        if (options.preferences) {
            this.updatePreferences(options.preferences, false);
        }

        this._scene = null;
        this._keyObjects = {};
        this._prevGamepadButtons = {};
        this._justDownGamepad = {};
        this._prevNavDir = { x: 0, y: 0 };
        this._justNavDir = { x: 0, y: 0 };

        this._mouseState = {
            leftDown: false,
            leftJustDown: false,
            rightDown: false,
            rightJustDown: false,
            screenX: 0,
            screenY: 0,
            worldX: 0,
            worldY: 0,
            hasMoved: false
        };

        this._modeListeners = [];
        this._padEventListeners = [];
        this._browserListenersBound = false;

        this.loadPreferences();
        this._bindBrowserHotPlug();
    }

    _cloneDefaults() {
        return JSON.parse(JSON.stringify(DEFAULT_INPUT_PREFERENCES));
    }

    _bindBrowserHotPlug() {
        if (this._browserListenersBound) return;
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            this._onPadConnected = (e) => this.handleGamepadConnected(e && e.gamepad ? e.gamepad : e);
            this._onPadDisconnected = (e) => this.handleGamepadDisconnected(e && e.gamepad ? e.gamepad : e);
            window.addEventListener('gamepadconnected', this._onPadConnected);
            window.addEventListener('gamepaddisconnected', this._onPadDisconnected);
            this._browserListenersBound = true;
        }
    }

    /**
     * Attaches to a Phaser Scene (WorldScene, HUDScene, UIScene) to read keyboard/mouse/gamepad events.
     */
    attachScene(scene) {
        if (!scene || !scene.input) return;
        this._scene = scene;
        this._keyObjects = {};

        const kb = scene.input.keyboard;
        const keyCodes = (typeof Phaser !== 'undefined' && Phaser.Input && Phaser.Input.Keyboard && Phaser.Input.Keyboard.KeyCodes)
            ? Phaser.Input.Keyboard.KeyCodes
            : {};

        if (kb && typeof kb.addKey === 'function') {
            const needed = new Set();
            Object.values(this.preferences.bindings).forEach(list => {
                (list || []).forEach(k => needed.add(k));
            });
            needed.forEach(name => {
                const code = keyCodes[name] !== undefined ? keyCodes[name] : name;
                this._keyObjects[name] = kb.addKey(code);
            });

            if (typeof kb.on === 'function') {
                kb.on('keydown', () => this.setInputMode('keyboardMouse'));
            }
        }

        // Mouse / pointer events (if supported by scene.input)
        if (typeof scene.input.on === 'function') {
            scene.input.on('pointermove', (pointer) => {
                this._mouseState.screenX = pointer.x || 0;
                this._mouseState.screenY = pointer.y || 0;
                this._mouseState.worldX = pointer.worldX !== undefined ? pointer.worldX : (pointer.x || 0);
                this._mouseState.worldY = pointer.worldY !== undefined ? pointer.worldY : (pointer.y || 0);
                this._mouseState.hasMoved = true;
                this.setInputMode('keyboardMouse');
            });

            scene.input.on('pointerdown', (pointer) => {
                this._mouseState.screenX = pointer.x || 0;
                this._mouseState.screenY = pointer.y || 0;
                this._mouseState.worldX = pointer.worldX !== undefined ? pointer.worldX : (pointer.x || 0);
                this._mouseState.worldY = pointer.worldY !== undefined ? pointer.worldY : (pointer.y || 0);
                this.setInputMode('keyboardMouse');

                const isRight = Boolean(
                    (typeof pointer.rightButtonDown === 'function' && pointer.rightButtonDown()) ||
                    pointer.button === 2
                );
                if (isRight) {
                    if (!this._mouseState.rightDown) this._mouseState.rightJustDown = true;
                    this._mouseState.rightDown = true;
                } else {
                    if (!this._mouseState.leftDown) this._mouseState.leftJustDown = true;
                    this._mouseState.leftDown = true;
                }
            });

            scene.input.on('pointerup', (pointer) => {
                if (pointer && pointer.button === 2) {
                    this._mouseState.rightDown = false;
                } else {
                    this._mouseState.leftDown = false;
                }
            });
        }

        // Disable browser right-click context menu over canvas
        if (scene.input.mouse && typeof scene.input.mouse.disableContextMenu === 'function') {
            scene.input.mouse.disableContextMenu();
        }

        // Phaser Gamepad plugin hot-plug hooks
        if (scene.input.gamepad && typeof scene.input.gamepad.on === 'function') {
            scene.input.gamepad.on('connected', (pad) => this.handleGamepadConnected(pad));
            scene.input.gamepad.on('disconnected', (pad) => this.handleGamepadDisconnected(pad));
        }
    }

    handleGamepadConnected(pad) {
        if (!pad) return;
        const padId = pad.id || 'Generic Gamepad';
        if (!this.connectedPads.some(p => p === pad || (p.index !== undefined && p.index === pad.index))) {
            this.connectedPads.push(pad);
        }
        this.activePad = pad;
        this.gamepadFamily = this._detectGamepadFamily(padId);
        this.setInputMode('gamepad');
        this._emitPadEvent('connected', pad);
    }

    handleGamepadDisconnected(pad) {
        if (pad) {
            this.connectedPads = this.connectedPads.filter(
                p => p !== pad && (p.index === undefined || p.index !== pad.index)
            );
        }
        if (this.activePad === pad || (pad && this.activePad && this.activePad.index === pad.index)) {
            this.activePad = this.connectedPads.length > 0 ? this.connectedPads[0] : null;
        }
        this._prevGamepadButtons = {};
        this._justDownGamepad = {};
        if (!this.activePad) {
            this.setInputMode('keyboardMouse');
        }
        this._emitPadEvent('disconnected', pad);
    }

    _detectGamepadFamily(idStr) {
        const lower = String(idStr || '').toLowerCase();
        if (lower.includes('dualsense') || lower.includes('dualshock') || lower.includes('playstation') || lower.includes('054c')) {
            return 'playstation';
        }
        if (lower.includes('xbox') || lower.includes('xinput') || lower.includes('045e')) {
            return 'xbox';
        }
        return 'generic';
    }

    onInputModeChange(callback) {
        if (typeof callback === 'function') {
            this._modeListeners.push(callback);
        }
    }

    onGamepadChange(callback) {
        if (typeof callback === 'function') {
            this._padEventListeners.push(callback);
        }
    }

    _emitPadEvent(type, pad) {
        for (const cb of this._padEventListeners) {
            try { cb(type, pad); } catch (e) {}
        }
    }

    setInputMode(mode) {
        if (mode !== 'keyboardMouse' && mode !== 'gamepad') return;
        if (this.inputMode === mode) return;
        this.inputMode = mode;
        for (const cb of this._modeListeners) {
            try { cb(mode); } catch (e) {}
        }
    }

    /**
     * Polls active gamepad & updates edge-triggered button/nav states. Call once per frame.
     */
    update() {
        const pad = this._resolveActiveGamepad();
        this._justDownGamepad = {};

        if (pad) {
            let padUsedThisFrame = false;
            const buttons = pad.buttons || [];
            for (let i = 0; i < buttons.length; i++) {
                const pressed = this._isButtonPressed(buttons[i]);
                const prev = Boolean(this._prevGamepadButtons[i]);
                if (pressed && !prev) {
                    this._justDownGamepad[i] = true;
                }
                if (pressed) padUsedThisFrame = true;
                this._prevGamepadButtons[i] = pressed;
            }

            // Detect analog stick movement above deadzone
            const ls = this.getLeftStickRaw(pad);
            const rs = this.getRightStickRaw(pad);
            const dz = this.preferences.deadzone;
            if (Math.hypot(ls.x, ls.y) > dz || Math.hypot(rs.x, rs.y) > dz) {
                padUsedThisFrame = true;
            }

            if (padUsedThisFrame) {
                this.setInputMode('gamepad');
            }

            // Menu navigation edge trigger (D-pad or Left Stick)
            const navX = (ls.x > 0.5 || this._isPadButtonDown(pad, GAMEPAD_BUTTONS.DPAD_RIGHT)) ? 1
                : (ls.x < -0.5 || this._isPadButtonDown(pad, GAMEPAD_BUTTONS.DPAD_LEFT)) ? -1 : 0;
            const navY = (ls.y > 0.5 || this._isPadButtonDown(pad, GAMEPAD_BUTTONS.DPAD_DOWN)) ? 1
                : (ls.y < -0.5 || this._isPadButtonDown(pad, GAMEPAD_BUTTONS.DPAD_UP)) ? -1 : 0;

            this._justNavDir.x = (navX !== 0 && this._prevNavDir.x === 0) ? navX : 0;
            this._justNavDir.y = (navY !== 0 && this._prevNavDir.y === 0) ? navY : 0;
            this._prevNavDir.x = navX;
            this._prevNavDir.y = navY;
        } else {
            this._prevNavDir.x = 0;
            this._prevNavDir.y = 0;
            this._justNavDir.x = 0;
            this._justNavDir.y = 0;
        }
    }

    /**
     * Call at end of frame (or after consuming one-shot mouse inputs).
     */
    endFrame() {
        this._mouseState.leftJustDown = false;
        this._mouseState.rightJustDown = false;
    }

    _resolveActiveGamepad() {
        // 1. Explicitly connected / injected pad
        if (this.activePad && this.activePad.connected !== false) {
            // Refresh from navigator.getGamepads() if running in browser for latest button/axis snapshot
            if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function' && this.activePad.index !== undefined) {
                const pads = navigator.getGamepads();
                if (pads && pads[this.activePad.index]) {
                    this.activePad = pads[this.activePad.index];
                }
            }
            return this.activePad;
        }

        // 2. Phaser gamepad plugin
        if (this._scene && this._scene.input && this._scene.input.gamepad && this._scene.input.gamepad.pad1) {
            const p1 = this._scene.input.gamepad.pad1;
            if (p1.connected !== false) {
                this.activePad = p1;
                this.gamepadFamily = this._detectGamepadFamily(p1.id);
                return p1;
            }
        }

        // 3. Browser navigator.getGamepads()
        if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
            const pads = navigator.getGamepads() || [];
            for (let i = 0; i < pads.length; i++) {
                if (pads[i] && pads[i].connected !== false) {
                    this.activePad = pads[i];
                    this.gamepadFamily = this._detectGamepadFamily(pads[i].id);
                    return pads[i];
                }
            }
        }

        return null;
    }

    _isButtonPressed(btn) {
        if (!btn) return false;
        if (typeof btn === 'number') return btn > 0.5;
        return Boolean(btn.pressed || (typeof btn.value === 'number' && btn.value > 0.5));
    }

    _isPadButtonDown(pad, index) {
        if (!pad || !pad.buttons || !pad.buttons[index]) return false;
        return this._isButtonPressed(pad.buttons[index]);
    }

    getLeftStickRaw(pad = null) {
        const p = pad || this._resolveActiveGamepad();
        if (!p) return { x: 0, y: 0 };
        if (p.leftStick && typeof p.leftStick.x === 'number') {
            return { x: p.leftStick.x, y: p.leftStick.y };
        }
        if (Array.isArray(p.axes) && p.axes.length >= 2) {
            const ax0 = typeof p.axes[0] === 'object' ? (p.axes[0].getValue ? p.axes[0].getValue() : p.axes[0].value || 0) : p.axes[0];
            const ax1 = typeof p.axes[1] === 'object' ? (p.axes[1].getValue ? p.axes[1].getValue() : p.axes[1].value || 0) : p.axes[1];
            return { x: ax0 || 0, y: ax1 || 0 };
        }
        return { x: 0, y: 0 };
    }

    getRightStickRaw(pad = null) {
        const p = pad || this._resolveActiveGamepad();
        if (!p) return { x: 0, y: 0 };
        if (p.rightStick && typeof p.rightStick.x === 'number') {
            return { x: p.rightStick.x, y: p.rightStick.y };
        }
        if (Array.isArray(p.axes) && p.axes.length >= 4) {
            const ax2 = typeof p.axes[2] === 'object' ? (p.axes[2].getValue ? p.axes[2].getValue() : p.axes[2].value || 0) : p.axes[2];
            const ax3 = typeof p.axes[3] === 'object' ? (p.axes[3].getValue ? p.axes[3].getValue() : p.axes[3].value || 0) : p.axes[3];
            return { x: ax2 || 0, y: ax3 || 0 };
        }
        return { x: 0, y: 0 };
    }

    /**
     * Applies radial dead zone and sensitivity, clamping magnitude to [0, 1].
     */
    applyDeadzone(x, y, deadzone = null) {
        const dz = deadzone !== null ? deadzone : this.preferences.deadzone;
        const mag = Math.hypot(x, y);
        if (mag <= dz) {
            return { x: 0, y: 0, magnitude: 0 };
        }
        const scaled = Math.min(1, ((mag - dz) / Math.max(0.001, 1 - dz)) * (this.preferences.stickSensitivity || 1));
        return {
            x: (x / mag) * scaled,
            y: (y / mag) * scaled,
            magnitude: scaled
        };
    }

    /**
     * Returns normalized movement vector { x, y, magnitude, isAnalog } combining keyboard, D-Pad, and Left Stick.
     * Diagonal movement never exceeds magnitude 1.0.
     */
    getMovementVector() {
        // 1. Keyboard digital movement
        let kx = 0;
        let ky = 0;
        if (this.isKeyActionDown(InputActions.MOVE_LEFT)) kx -= 1;
        if (this.isKeyActionDown(InputActions.MOVE_RIGHT)) kx += 1;
        if (this.isKeyActionDown(InputActions.MOVE_UP)) ky -= 1;
        if (this.isKeyActionDown(InputActions.MOVE_DOWN)) ky += 1;

        if (kx !== 0 || ky !== 0) {
            this.setInputMode('keyboardMouse');
            const len = Math.hypot(kx, ky);
            return { x: kx / len, y: ky / len, magnitude: 1, isAnalog: false };
        }

        // 2. Gamepad D-Pad digital movement
        const pad = this._resolveActiveGamepad();
        if (pad) {
            let dx = 0;
            let dy = 0;
            if (this._isPadButtonDown(pad, GAMEPAD_BUTTONS.DPAD_LEFT)) dx -= 1;
            if (this._isPadButtonDown(pad, GAMEPAD_BUTTONS.DPAD_RIGHT)) dx += 1;
            if (this._isPadButtonDown(pad, GAMEPAD_BUTTONS.DPAD_UP)) dy -= 1;
            if (this._isPadButtonDown(pad, GAMEPAD_BUTTONS.DPAD_DOWN)) dy += 1;
            if (dx !== 0 || dy !== 0) {
                this.setInputMode('gamepad');
                const len = Math.hypot(dx, dy);
                return { x: dx / len, y: dy / len, magnitude: 1, isAnalog: false };
            }

            // 3. Gamepad Left Stick analog movement (small tilt = slow walk, full tilt = normal speed)
            const raw = this.getLeftStickRaw(pad);
            const analog = this.applyDeadzone(raw.x, raw.y);
            if (analog.magnitude > 0) {
                this.setInputMode('gamepad');
                return { x: analog.x, y: analog.y, magnitude: analog.magnitude, isAnalog: true };
            }
        }

        return { x: 0, y: 0, magnitude: 0, isAnalog: false };
    }

    /**
     * Computes aim direction { x, y, angle, facing, source } from mouse cursor (keyboardMouse)
     * or right stick (gamepad), with optional light aim assist toward nearby targets.
     */
    getAimDirection(originX, originY, fallbackFacing = 'down', targets = []) {
        let dirX = 0;
        let dirY = 0;
        let source = 'facing';

        if (this.inputMode === 'gamepad') {
            const raw = this.getRightStickRaw();
            const stick = this.applyDeadzone(raw.x, raw.y);
            if (stick.magnitude > 0) {
                const len = Math.hypot(stick.x, stick.y) || 1;
                dirX = stick.x / len;
                dirY = stick.y / len;
                source = 'rightStick';

                // Subtle configurable aim assist on gamepad
                if (this.preferences.aimAssist && Array.isArray(targets) && targets.length > 0) {
                    const assisted = this._applyAimAssist(originX, originY, dirX, dirY, targets);
                    dirX = assisted.x;
                    dirY = assisted.y;
                }
            }
        } else if (this._mouseState.hasMoved) {
            const dx = this._mouseState.worldX - originX;
            const dy = this._mouseState.worldY - originY;
            const len = Math.hypot(dx, dy);
            if (len > 4) {
                dirX = dx / len;
                dirY = dy / len;
                source = 'mouse';
            }
        }

        if (source === 'facing') {
            if (fallbackFacing === 'left') { dirX = -1; dirY = 0; }
            else if (fallbackFacing === 'right') { dirX = 1; dirY = 0; }
            else if (fallbackFacing === 'up') { dirX = 0; dirY = -1; }
            else { dirX = 0; dirY = 1; }
        }

        const facing = Math.abs(dirX) >= Math.abs(dirY)
            ? (dirX >= 0 ? 'right' : 'left')
            : (dirY >= 0 ? 'down' : 'up');

        return {
            x: dirX,
            y: dirY,
            angle: Math.atan2(dirY, dirX),
            facing,
            source
        };
    }

    _applyAimAssist(originX, originY, dirX, dirY, targets) {
        const maxAngleRad = ((this.preferences.aimAssistAngleDeg || 18) * Math.PI) / 180;
        const maxRange = 260;
        let bestTarget = null;
        let bestAngle = maxAngleRad;

        for (let i = 0; i < targets.length; i++) {
            const t = targets[i];
            if (!t || t.active === false || t.isDead) continue;
            const tx = t.x - originX;
            const ty = t.y - originY;
            const dist = Math.hypot(tx, ty);
            if (dist < 4 || dist > maxRange) continue;
            const dot = Math.max(-1, Math.min(1, (tx * dirX + ty * dirY) / dist));
            const angle = Math.acos(dot);
            if (angle < bestAngle) {
                bestAngle = angle;
                bestTarget = { nx: tx / dist, ny: ty / dist };
            }
        }

        if (!bestTarget) return { x: dirX, y: dirY };
        // Gentle blend (60% toward target, never a permanent hard-lock)
        const bx = dirX * 0.4 + bestTarget.nx * 0.6;
        const by = dirY * 0.4 + bestTarget.ny * 0.6;
        const blen = Math.hypot(bx, by) || 1;
        return { x: bx / blen, y: by / blen };
    }

    isKeyActionDown(action) {
        const keys = this.preferences.bindings[action] || [];
        for (let i = 0; i < keys.length; i++) {
            const kObj = this._keyObjects[keys[i]];
            if (kObj && kObj.isDown) return true;
        }
        return false;
    }

    isKeyActionJustDown(action) {
        const keys = this.preferences.bindings[action] || [];
        const justDownFn = (typeof Phaser !== 'undefined' && Phaser.Input && Phaser.Input.Keyboard && Phaser.Input.Keyboard.JustDown)
            ? Phaser.Input.Keyboard.JustDown
            : (k) => Boolean(k && k.isJustDown);
        for (let i = 0; i < keys.length; i++) {
            const kObj = this._keyObjects[keys[i]];
            if (kObj && justDownFn(kObj)) return true;
        }
        return false;
    }

    isDown(action) {
        if (this.isKeyActionDown(action)) {
            this.setInputMode('keyboardMouse');
            return true;
        }
        if (action === InputActions.ATTACK && this._mouseState.leftDown) {
            return true;
        }
        if (action === InputActions.SECONDARY_ACTION && this._mouseState.rightDown) {
            return true;
        }
        const pad = this._resolveActiveGamepad();
        if (pad) {
            const btns = ACTION_GAMEPAD_MAP[action] || [];
            for (let i = 0; i < btns.length; i++) {
                if (this._isPadButtonDown(pad, btns[i])) {
                    this.setInputMode('gamepad');
                    return true;
                }
            }
        }
        return false;
    }

    justDown(action) {
        if (this.isKeyActionJustDown(action)) {
            this.setInputMode('keyboardMouse');
            return true;
        }
        if (action === InputActions.ATTACK && this._mouseState.leftJustDown) {
            this._mouseState.leftJustDown = false;
            return true;
        }
        if (action === InputActions.SECONDARY_ACTION && this._mouseState.rightJustDown) {
            this._mouseState.rightJustDown = false;
            return true;
        }
        const btns = ACTION_GAMEPAD_MAP[action] || [];
        for (let i = 0; i < btns.length; i++) {
            if (this._justDownGamepad[btns[i]]) {
                this.setInputMode('gamepad');
                return true;
            }
        }
        return false;
    }

    /**
     * Returns edge-triggered menu navigation direction { x: -1|0|1, y: -1|0|1 }.
     */
    getMenuNavigationJustPressed() {
        let x = this._justNavDir.x;
        let y = this._justNavDir.y;
        if (this.isKeyActionJustDown(InputActions.MOVE_LEFT)) x = -1;
        else if (this.isKeyActionJustDown(InputActions.MOVE_RIGHT)) x = 1;
        if (this.isKeyActionJustDown(InputActions.MOVE_UP)) y = -1;
        else if (this.isKeyActionJustDown(InputActions.MOVE_DOWN)) y = 1;
        return { x, y };
    }

    /**
     * Returns short label for a given action based on currently active device.
     */
    getActionLabel(action) {
        if (this.inputMode === 'gamepad') {
            const isPS = this.gamepadFamily === 'playstation';
            switch (action) {
                case InputActions.INTERACT:
                case InputActions.CONFIRM:
                    return isPS ? 'Croix' : 'A';
                case InputActions.CANCEL:
                    return isPS ? 'Rond' : 'B';
                case InputActions.ATTACK:
                    return isPS ? 'Carré' : 'X';
                case InputActions.INVENTORY:
                    return isPS ? 'Triangle' : 'Y';
                case InputActions.SPRINT:
                    return isPS ? 'R1' : 'RB';
                case InputActions.SECONDARY_ACTION:
                    return isPS ? 'R2' : 'RT';
                case InputActions.MAP:
                    return isPS ? 'Pavé' : 'Select';
                case InputActions.MENU:
                    return isPS ? 'Options' : 'Start';
                case InputActions.QUESTS:
                    return isPS ? 'L1' : 'LB';
                case InputActions.CRAFT:
                    return isPS ? 'L2' : 'LT';
                case InputActions.MOVE_UP:
                case InputActions.MOVE_DOWN:
                case InputActions.MOVE_LEFT:
                case InputActions.MOVE_RIGHT:
                    return 'Stick G / D-Pad';
                default:
                    return 'A';
            }
        }

        // Keyboard / Mouse labels
        if (action === InputActions.ATTACK) return 'Clic / Espace';
        if (action === InputActions.SECONDARY_ACTION) return 'Clic Droit';
        const keys = this.preferences.bindings[action];
        if (!keys || keys.length === 0) return '?';
        const first = keys[0];
        if (first === 'SPACE') return 'Espace';
        if (first === 'SHIFT') return 'Maj';
        if (first === 'ESC') return 'Échap';
        if (first === 'ENTER') return 'Entrée';
        return first;
    }

    /**
     * Formats a dynamic contextual prompt, e.g. "[E] Parler" or "[A] Parler".
     */
    getPrompt(action, verb = '') {
        const label = this.getActionLabel(action);
        return verb ? `[${label}] ${verb}` : `[${label}]`;
    }

    /**
     * Gentle haptic feedback for compatible gamepads. Respects vibrationEnabled option.
     * intensity: 'light' | 'medium' | 'heavy'
     */
    vibrate(intensity = 'light') {
        if (!this.preferences.vibrationEnabled) return false;
        const pad = this._resolveActiveGamepad();
        if (!pad) return false;

        const presets = {
            light: { duration: 60, weakMagnitude: 0.2, strongMagnitude: 0.1 },
            medium: { duration: 120, weakMagnitude: 0.45, strongMagnitude: 0.35 },
            heavy: { duration: 180, weakMagnitude: 0.7, strongMagnitude: 0.6 }
        };
        const cfg = presets[intensity] || presets.light;

        const actuator = pad.vibrationActuator || (pad.pad && pad.pad.vibrationActuator);
        if (actuator && typeof actuator.playEffect === 'function') {
            try {
                actuator.playEffect('dual-rumble', {
                    startDelay: 0,
                    duration: cfg.duration,
                    weakMagnitude: cfg.weakMagnitude,
                    strongMagnitude: cfg.strongMagnitude
                });
                return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }

    /**
     * Rebinds an action to new keyboard keys and persists if RGPD consent is granted.
     */
    rebindAction(action, newKeys) {
        if (!InputActions[action] || !Array.isArray(newKeys) || newKeys.length === 0) return false;
        this.preferences.bindings[action] = newKeys.map(k => String(k).toUpperCase());
        if (this._scene) {
            this.attachScene(this._scene);
        }
        this.savePreferences();
        return true;
    }

    updatePreferences(partial, persist = true) {
        if (!partial || typeof partial !== 'object') return;
        if (typeof partial.deadzone === 'number') {
            this.preferences.deadzone = Math.max(0.05, Math.min(0.5, partial.deadzone));
        }
        if (typeof partial.stickSensitivity === 'number') {
            this.preferences.stickSensitivity = Math.max(0.5, Math.min(2.0, partial.stickSensitivity));
        }
        if (typeof partial.aimAssist === 'boolean') {
            this.preferences.aimAssist = partial.aimAssist;
        }
        if (typeof partial.aimAssistAngleDeg === 'number') {
            this.preferences.aimAssistAngleDeg = Math.max(0, Math.min(35, partial.aimAssistAngleDeg));
        }
        if (typeof partial.vibrationEnabled === 'boolean') {
            this.preferences.vibrationEnabled = partial.vibrationEnabled;
        }
        if (partial.bindings && typeof partial.bindings === 'object') {
            Object.keys(partial.bindings).forEach(act => {
                if (InputActions[act] && Array.isArray(partial.bindings[act]) && partial.bindings[act].length > 0) {
                    this.preferences.bindings[act] = partial.bindings[act].slice();
                }
            });
        }
        if (persist) this.savePreferences();
    }

    savePreferences() {
        if (typeof localStorage === 'undefined') return false;
        if (localStorage.getItem('rpg_save_consent') !== 'true') return false;
        try {
            localStorage.setItem('toya_input_prefs_v1', JSON.stringify(this.preferences));
            return true;
        } catch (e) {
            return false;
        }
    }

    loadPreferences() {
        if (typeof localStorage === 'undefined') return false;
        const raw = localStorage.getItem('toya_input_prefs_v1');
        if (!raw) return false;
        try {
            const parsed = JSON.parse(raw);
            this.updatePreferences(parsed, false);
            return true;
        } catch (e) {
            return false;
        }
    }
}

if (typeof window !== 'undefined') {
    window.InputActions = InputActions;
    window.GAMEPAD_BUTTONS = GAMEPAD_BUTTONS;
    window.InputManager = InputManager;
    if (!window.inputManager) {
        window.inputManager = new InputManager();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        InputActions,
        GAMEPAD_BUTTONS,
        DEFAULT_INPUT_PREFERENCES,
        InputManager
    };
}
