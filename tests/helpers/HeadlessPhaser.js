/**
 * HeadlessPhaser.js
 * Lightweight, high-fidelity headless runtime mock for Phaser 3.55.2 in Node.js.
 * Provides Scene lifecycle, ScenePlugin concurrency, 2D AABB arcade physics,
 * EventEmitter, synthetic keyboard input, and GameObject stubs.
 */

const fs = require('fs');
const path = require('path');

// --- EVENT EMITTER ---
class EventEmitter {
    constructor() {
        this._listeners = new Map();
    }

    on(event, fn, context) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push({ fn, context, once: false });
        return this;
    }

    once(event, fn, context) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push({ fn, context, once: true });
        return this;
    }

    emit(event, ...args) {
        if (!this._listeners.has(event)) return false;
        const list = this._listeners.get(event).slice();
        for (const item of list) {
            item.fn.apply(item.context || this, args);
            if (item.once) {
                this.off(event, item.fn, item.context);
            }
        }
        return true;
    }

    off(event, fn, context) {
        if (!this._listeners.has(event)) return this;
        if (!fn) {
            this._listeners.delete(event);
            return this;
        }
        const filtered = this._listeners.get(event).filter(item => {
            return !(item.fn === fn && (!context || item.context === context));
        });
        if (filtered.length > 0) {
            this._listeners.set(event, filtered);
        } else {
            this._listeners.delete(event);
        }
        return this;
    }

    removeAllListeners(event) {
        if (event) {
            this._listeners.delete(event);
        } else {
            this._listeners.clear();
        }
        return this;
    }
}

// --- MATH UTILITIES ---
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    normalize() {
        const len = Math.hypot(this.x, this.y) || 1;
        this.x /= len;
        this.y /= len;
        return this;
    }
    scale(s) {
        this.x *= s;
        this.y *= s;
        return this;
    }
    length() {
        return Math.hypot(this.x, this.y);
    }
}

const PhaserMath = {
    Between: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    DegToRad: (deg) => (deg * Math.PI) / 180,
    Clamp: (val, min, max) => Math.max(min, Math.min(max, val)),
    Distance: {
        Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1)
    },
    Vector2
};

const BlendModes = {
    NORMAL: 0,
    ADD: 1,
    MULTIPLY: 2,
    SCREEN: 3
};

// --- KEYBOARD & INPUT ---
const KeyCodes = {
    BACKSPACE: 8, TAB: 9, ENTER: 13, SHIFT: 16, CTRL: 17, ALT: 18,
    PAUSE: 19, CAPS_LOCK: 20, ESC: 27, SPACE: 32, PAGE_UP: 33, PAGE_DOWN: 34,
    END: 35, HOME: 36, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
    ZERO: 48, ONE: 49, TWO: 50, THREE: 51, FOUR: 52, FIVE: 53,
    A: 65, B: 66, C: 67, D: 68, E: 69, F: 70, G: 71, H: 72, I: 73,
    J: 74, K: 75, L: 76, M: 77, N: 78, O: 79, P: 80, Q: 81, R: 82,
    S: 83, T: 84, U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90
};

class Key {
    constructor(keyCode) {
        this.keyCode = keyCode;
        this.isDown = false;
        this.isUp = true;
        this.isJustDown = false;
        this.isJustUp = false;
        this.timeDown = 0;
        this.duration = 0;
    }

    setDown(down = true) {
        if (down) {
            this.isJustDown = !this.isDown;
            this.isDown = true;
            this.isUp = false;
        } else {
            this.isJustUp = this.isDown;
            this.isDown = false;
            this.isUp = true;
        }
    }

    reset() {
        this.isDown = false;
        this.isUp = true;
        this.isJustDown = false;
        this.isJustUp = false;
    }
}

class KeyboardPlugin extends EventEmitter {
    constructor() {
        super();
        this.keys = new Map();
    }

    addKey(keyCode) {
        if (typeof keyCode === 'string') {
            keyCode = KeyCodes[keyCode.toUpperCase()] || keyCode.charCodeAt(0);
        }
        if (!this.keys.has(keyCode)) {
            this.keys.set(keyCode, new Key(keyCode));
        }
        return this.keys.get(keyCode);
    }

    addKeys(keysStringOrObj) {
        const res = {};
        if (typeof keysStringOrObj === 'string') {
            const parts = keysStringOrObj.split(',').map(s => s.trim());
            for (const keyName of parts) {
                res[keyName] = this.addKey(keyName);
            }
        } else if (typeof keysStringOrObj === 'object') {
            for (const key of Object.keys(keysStringOrObj)) {
                res[key] = this.addKey(keysStringOrObj[key]);
            }
        }
        return res;
    }

    createCursorKeys() {
        return {
            up: this.addKey(KeyCodes.UP),
            down: this.addKey(KeyCodes.DOWN),
            left: this.addKey(KeyCodes.LEFT),
            right: this.addKey(KeyCodes.RIGHT),
            space: this.addKey(KeyCodes.SPACE),
            shift: this.addKey(KeyCodes.SHIFT)
        };
    }

    press(keyIdentifier) {
        const key = typeof keyIdentifier === 'object' ? keyIdentifier : this.addKey(keyIdentifier);
        key.setDown(true);
        // Find key name
        let name = Object.keys(KeyCodes).find(k => KeyCodes[k] === key.keyCode);
        if (name) {
            this.emit(`keydown-${name}`, { keyCode: key.keyCode, key: name });
        }
        this.emit('keydown', { keyCode: key.keyCode, key: name });
        return key;
    }

    release(keyIdentifier) {
        const key = typeof keyIdentifier === 'object' ? keyIdentifier : this.addKey(keyIdentifier);
        key.setDown(false);
        let name = Object.keys(KeyCodes).find(k => KeyCodes[k] === key.keyCode);
        if (name) {
            this.emit(`keyup-${name}`, { keyCode: key.keyCode, key: name });
        }
        this.emit('keyup', { keyCode: key.keyCode, key: name });
        return key;
    }

    clearJustDown() {
        for (const key of this.keys.values()) {
            key.isJustDown = false;
            key.isJustUp = false;
        }
    }
}

// --- ARCADE PHYSICS BODY ---
class ArcadeBody {
    constructor(parent, isStatic = false) {
        this.parent = parent;
        this.isStatic = isStatic;
        this.enable = true;
        this.immovable = isStatic;
        this.collideWorldBounds = false;
        this.width = parent.width || 32;
        this.height = parent.height || 32;
        this.offset = { x: 0, y: 0 };
        this.velocity = new Vector2(0, 0);
    }

    setSize(w, h) {
        this.width = w;
        this.height = h;
        return this;
    }

    setOffset(x, y) {
        this.offset.x = x;
        this.offset.y = y;
        return this;
    }

    setVelocity(vx, vy) {
        this.velocity.x = vx;
        this.velocity.y = vy !== undefined ? vy : vx;
        return this;
    }

    setVelocityX(vx) {
        this.velocity.x = vx;
        return this;
    }

    setVelocityY(vy) {
        this.velocity.y = vy;
        return this;
    }

    setEnable(val) {
        this.enable = Boolean(val);
        return this;
    }

    reset(x, y) {
        if (this.parent) {
            this.parent.x = x;
            this.parent.y = y;
        }
        this.velocity.set(0, 0);
        return this;
    }

    getBounds() {
        const p = this.parent;
        const originX = p.originX !== undefined ? p.originX : 0.5;
        const originY = p.originY !== undefined ? p.originY : 0.5;
        const scaleX = p.scaleX !== undefined ? p.scaleX : 1;
        const scaleY = p.scaleY !== undefined ? p.scaleY : 1;

        // Visual position top-left
        const visualLeft = p.x - (p.width * scaleX) * originX;
        const visualTop = p.y - (p.height * scaleY) * originY;

        // Scaled body position
        const left = visualLeft + this.offset.x * scaleX;
        const top = visualTop + this.offset.y * scaleY;
        const right = left + this.width * scaleX;
        const bottom = top + this.height * scaleY;

        return { left, right, top, bottom, width: right - left, height: bottom - top };
    }
}

// --- GAMEOBJECTS ---
class GameObject extends EventEmitter {
    constructor(scene, x = 0, y = 0, type = 'GameObject') {
        super();
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.type = type;
        this.active = true;
        this.visible = true;
        this.depth = 0;
        this.alpha = 1;
        this.originX = 0.5;
        this.originY = 0.5;
        this.scaleX = 1;
        this.scaleY = 1;
        this.width = 32;
        this.height = 32;
        this.tint = 0xffffff;
        this.isTinted = false;
        this.blendMode = BlendModes.NORMAL;
        this.body = null;
        if (this.scene && this.scene.children && typeof this.scene.children.add === 'function') {
            this.scene.children.add(this);
        }
    }

    get displayWidth() {
        return this.width * this.scaleX;
    }

    set displayWidth(val) {
        this.scaleX = val / (this.width || 1);
    }

    get displayHeight() {
        return this.height * this.scaleY;
    }

    set displayHeight(val) {
        this.scaleY = val / (this.height || 1);
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    setDepth(d) {
        this.depth = d;
        return this;
    }

    setAlpha(a) {
        this.alpha = a;
        return this;
    }

    setVisible(v) {
        this.visible = Boolean(v);
        return this;
    }

    setActive(a) {
        this.active = Boolean(a);
        return this;
    }

    setOrigin(ox = 0.5, oy = ox) {
        this.originX = ox;
        this.originY = oy;
        return this;
    }

    setScale(sx = 1, sy = sx) {
        this.scaleX = sx;
        this.scaleY = sy;
        return this;
    }

    setTint(color) {
        this.tint = color;
        this.isTinted = true;
        return this;
    }

    setTintFill(color) {
        this.tint = color;
        this.isTinted = true;
        return this;
    }

    clearTint() {
        this.tint = 0xffffff;
        this.isTinted = false;
        return this;
    }

    setBlendMode(bm) {
        this.blendMode = bm;
        return this;
    }

    setCollideWorldBounds(b) {
        if (this.body) this.body.collideWorldBounds = Boolean(b);
        return this;
    }

    setImmovable(b) {
        if (this.body) this.body.immovable = Boolean(b);
        return this;
    }

    setVelocity(vx, vy) {
        if (this.body) this.body.setVelocity(vx, vy);
        return this;
    }

    setVelocityX(vx) {
        if (this.body) this.body.setVelocityX(vx);
        return this;
    }

    setVelocityY(vy) {
        if (this.body) this.body.setVelocityY(vy);
        return this;
    }

    destroy() {
        this.active = false;
        this.visible = false;
        if (this.body) this.body.enable = false;
        if (this.scene && this.scene.children && typeof this.scene.children.remove === 'function') {
            this.scene.children.remove(this);
        }
        this.emit('destroy', this);
        this.removeAllListeners();
    }
}

class Sprite extends GameObject {
    constructor(scene, x, y, texture = '', frame = 0) {
        super(scene, x, y, 'Sprite');
        this.texture = { key: texture };
        this.frame = { name: frame };
        this.width = 64;
        this.height = 64;
        this.anims = {
            isPlaying: false,
            currentAnim: null,
            play: (key, ignoreIfPlaying = false) => {
                this.anims.isPlaying = true;
                this.anims.currentAnim = key;
                return this;
            },
            stop: () => {
                this.anims.isPlaying = false;
                return this;
            }
        };
    }

    setTexture(key, frame) {
        this.texture.key = key;
        if (frame !== undefined) this.frame.name = frame;
        return this;
    }

    setFrame(f) {
        this.frame.name = f;
        return this;
    }

    preUpdate(time, delta) {
        // Lifecycle hook
    }
}

class Image extends GameObject {
    constructor(scene, x, y, texture = '', frame = 0) {
        super(scene, x, y, 'Image');
        this.texture = { key: texture };
        this.frame = { name: frame };
    }
}

class Zone extends GameObject {
    constructor(scene, x, y, width = 32, height = 32) {
        super(scene, x, y, 'Zone');
        this.width = width;
        this.height = height;
    }
}

class Group extends EventEmitter {
    constructor(scene, children = []) {
        super();
        this.scene = scene;
        this.children = [];
        if (Array.isArray(children)) {
            for (const c of children) this.add(c);
        }
    }

    add(child) {
        if (child && !this.children.includes(child)) {
            this.children.push(child);
        }
        return this;
    }

    remove(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
            this.children.splice(idx, 1);
        }
        return this;
    }

    getChildren() {
        return this.children.slice();
    }

    clear(destroyChildren = false) {
        if (destroyChildren) {
            for (const child of this.children) {
                if (child && child.destroy) child.destroy();
            }
        }
        this.children = [];
        return this;
    }

    setVisible(v) {
        for (const child of this.children) {
            if (child && child.setVisible) child.setVisible(v);
        }
        return this;
    }

    setAlpha(a) {
        for (const child of this.children) {
            if (child && child.setAlpha) child.setAlpha(a);
        }
        return this;
    }

    setDepth(d) {
        for (const child of this.children) {
            if (child && child.setDepth) child.setDepth(d);
        }
        return this;
    }

    setPosition(x, y) {
        for (const child of this.children) {
            if (child && child.setPosition) child.setPosition(x, y);
        }
        return this;
    }
}

class Graphics extends GameObject {
    constructor(scene, options) {
        super(scene, 0, 0, 'Graphics');
        this.commands = [];
    }

    clear() {
        this.commands = [];
        return this;
    }

    fillStyle(color, alpha = 1) {
        this.commands.push({ op: 'fillStyle', color, alpha });
        return this;
    }

    lineStyle(width, color, alpha = 1) {
        this.commands.push({ op: 'lineStyle', width, color, alpha });
        return this;
    }

    fillRect(x, y, w, h) {
        this.commands.push({ op: 'fillRect', x, y, w, h });
        return this;
    }

    strokeRect(x, y, w, h) {
        this.commands.push({ op: 'strokeRect', x, y, w, h });
        return this;
    }

    fillRoundedRect(x, y, w, h, radius = 0) {
        this.commands.push({ op: 'fillRoundedRect', x, y, w, h, radius });
        return this;
    }

    fillEllipse(x, y, w, h) {
        this.commands.push({ op: 'fillEllipse', x, y, w, h });
        return this;
    }

    strokeEllipse(x, y, w, h) {
        this.commands.push({ op: 'strokeEllipse', x, y, w, h });
        return this;
    }

    fillCircle(x, y, radius) {
        this.commands.push({ op: 'fillCircle', x, y, radius });
        return this;
    }

    strokeCircle(x, y, radius) {
        this.commands.push({ op: 'strokeCircle', x, y, radius });
        return this;
    }

    generateTexture(key, width, height) {
        if (this.scene && this.scene.textures) {
            this.scene.textures.add(key, width, height);
        }
        return this;
    }

    strokeRoundedRect(x, y, w, h, radius = 0) {
        this.commands.push({ op: 'strokeRoundedRect', x, y, w, h, radius });
        return this;
    }

    beginPath() {
        this.commands.push({ op: 'beginPath' });
        return this;
    }

    arc(x, y, radius, startAngle, endAngle, anticlockwise = false) {
        this.commands.push({ op: 'arc', x, y, radius, startAngle, endAngle, anticlockwise });
        return this;
    }

    lineTo(x, y) {
        this.commands.push({ op: 'lineTo', x, y });
        return this;
    }

    fillPath() {
        this.commands.push({ op: 'fillPath' });
        return this;
    }

    strokePath() {
        this.commands.push({ op: 'strokePath' });
        return this;
    }
}

class Text extends GameObject {
    constructor(scene, x, y, text = '', style = {}) {
        super(scene, x, y, 'Text');
        this.text = String(text);
        this.style = style;
        this.originX = 0;
        this.originY = 0;
    }

    setText(t) {
        this.text = String(t);
        return this;
    }

    setColor(c) {
        this.style.color = c;
        return this;
    }

    setInteractive() {
        return this;
    }
}

class Shape extends GameObject {
    constructor(scene, x, y, type = 'Shape') {
        super(scene, x, y, type);
    }
}

class Rectangle extends Shape {
    constructor(scene, x, y, width = 16, height = 16, fillColor = 0xffffff) {
        super(scene, x, y, 'Rectangle');
        this.width = width;
        this.height = height;
        this.fillColor = fillColor;
    }
}

class Circle extends Shape {
    constructor(scene, x, y, radius = 8, fillColor = 0xffffff) {
        super(scene, x, y, 'Circle');
        this.radius = radius;
        this.width = radius * 2;
        this.height = radius * 2;
        this.fillColor = fillColor;
    }
}

class Triangle extends Shape {
    constructor(scene, x, y, x1, y1, x2, y2, x3, y3, fillColor = 0xffffff) {
        super(scene, x, y, 'Triangle');
        this.points = [x1, y1, x2, y2, x3, y3];
        this.fillColor = fillColor;
    }
}

// --- GAMEOBJECT FACTORY ---
class GameObjectFactory {
    constructor(scene) {
        this.scene = scene;
    }

    existing(child) {
        if (!child.scene) child.scene = this.scene;
        if (this.scene && this.scene.children && typeof this.scene.children.add === 'function') {
            this.scene.children.add(child);
        }
        return child;
    }

    sprite(x, y, texture, frame) {
        const s = new Sprite(this.scene, x, y, texture, frame);
        return s;
    }

    image(x, y, texture, frame) {
        const img = new Image(this.scene, x, y, texture, frame);
        return img;
    }

    zone(x, y, w, h) {
        const z = new Zone(this.scene, x, y, w, h);
        return z;
    }

    group(children) {
        const g = new Group(this.scene, children);
        return g;
    }

    graphics(options) {
        const gr = new Graphics(this.scene, options);
        return gr;
    }

    text(x, y, text, style) {
        const t = new Text(this.scene, x, y, text, style);
        return t;
    }

    rectangle(x, y, w, h, color) {
        const r = new Rectangle(this.scene, x, y, w, h, color);
        return r;
    }

    circle(x, y, radius, color) {
        const c = new Circle(this.scene, x, y, radius, color);
        return c;
    }

    particles(texture) {
        return {
            texture,
            depth: 0,
            setDepth(d) { this.depth = d; return this; },
            createEmitter(config) {
                return {
                    config,
                    stop() { return this; },
                    start() { return this; },
                    setPosition(x, y) { return this; }
                };
            }
        };
    }

    triangle(x, y, x1, y1, x2, y2, x3, y3, color) {
        const t = new Triangle(this.scene, x, y, x1, y1, x2, y2, x3, y3, color);
        return t;
    }
}

// --- AABB OVERLAP RESOLVER ---
function getAABB(obj) {
    if (!obj || !obj.active) return null;
    if (obj.body) {
        return obj.body.enable ? obj.body.getBounds() : null;
    }
    const originX = obj.originX !== undefined ? obj.originX : 0.5;
    const originY = obj.originY !== undefined ? obj.originY : 0.5;
    const scaleX = obj.scaleX !== undefined ? obj.scaleX : 1;
    const scaleY = obj.scaleY !== undefined ? obj.scaleY : 1;
    const w = (obj.width || 32) * scaleX;
    const h = (obj.height || 32) * scaleY;
    const left = obj.x - w * originX;
    const top = obj.y - h * originY;
    return { left, right: left + w, top, bottom: top + h, width: w, height: h };
}

function intersectsAABB(a, b) {
    if (!a || !b) return false;
    return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

// --- ARCADE PHYSICS SYSTEM ---
class ArcadePhysics {
    constructor(scene) {
        this.scene = scene;
        this.world = {
            bounds: { x: 0, y: 0, width: 2560, height: 1600 },
            setBounds: (x, y, w, h) => {
                this.world.bounds = { x, y, width: w, height: h };
            }
        };
        this.colliders = [];
        this.add = {
            existing: (obj, isStatic = false) => {
                if (!obj.body) {
                    obj.body = new ArcadeBody(obj, isStatic);
                }
                return obj;
            },
            collider: (obj1, obj2, callback, process, scope) => {
                const entry = { obj1, obj2, callback, process, scope, type: 'collider' };
                this.colliders.push(entry);
                return entry;
            },
            overlap: (obj1, obj2, callback, process, scope) => {
                const entry = { obj1, obj2, callback, process, scope, type: 'overlap' };
                this.colliders.push(entry);
                return entry;
            },
            group: (config) => {
                return new Group(this.scene);
            },
            staticGroup: (config) => {
                return new Group(this.scene);
            }
        };
    }

    overlap(obj1, obj2, callback, processCallback, callbackContext) {
        const listA = this._resolveTargets(obj1);
        const listB = this._resolveTargets(obj2);
        let anyOverlap = false;

        for (const a of listA) {
            if (!a.active) continue;
            const boundsA = getAABB(a);
            if (!boundsA) continue;

            for (const b of listB) {
                if (!b.active || a === b) continue;
                const boundsB = getAABB(b);
                if (!boundsB) continue;

                if (intersectsAABB(boundsA, boundsB)) {
                    if (!processCallback || processCallback.call(callbackContext || this.scene, a, b)) {
                        anyOverlap = true;
                        if (callback) {
                            callback.call(callbackContext || this.scene, a, b);
                        }
                    }
                }
            }
        }
        return anyOverlap;
    }

    _resolveTargets(target) {
        if (!target) return [];
        if (target.getChildren) return target.getChildren();
        if (Array.isArray(target)) return target;
        return [target];
    }

    step() {
        for (const entry of this.colliders) {
            this.overlap(entry.obj1, entry.obj2, entry.callback, entry.process, entry.scope);
        }
    }
}

// --- TWEENS & TIME ---
class TweenManager {
    constructor(scene) {
        this.scene = scene;
        this.activeTweens = [];
    }

    add(config) {
        const tween = {
            config,
            targets: Array.isArray(config.targets) ? config.targets : [config.targets],
            elapsed: 0,
            duration: config.duration || 200,
            yoyo: Boolean(config.yoyo),
            yoyoDone: false,
            complete: false,
            stop() {
                this.complete = true;
            }
        };

        // Immediately apply property changes if simple targets
        for (const t of tween.targets) {
            if (!t) continue;
            if (config.alpha !== undefined) {
                t.alpha = typeof config.alpha === 'object' ? config.alpha.to : config.alpha;
            }
            if (config.x !== undefined) t.x = config.x;
            if (config.y !== undefined) t.y = config.y;
            if (config.scale !== undefined) {
                t.scaleX = typeof config.scale === 'object' ? config.scale.to : config.scale;
                t.scaleY = t.scaleX;
            }
        }

        // Trigger onYoyo or onComplete synchronously or on step
        if (config.onYoyo) {
            try { config.onYoyo.call(config.callbackScope || this.scene); } catch (e) {}
        }
        if (config.onComplete) {
            try { config.onComplete.call(config.callbackScope || this.scene); } catch (e) {}
        }

        this.activeTweens.push(tween);
        return tween;
    }

    killTweensOf(target) {
        this.activeTweens = this.activeTweens.filter(tw => !tw.targets.includes(target));
    }
}

class TimeManager {
    constructor(scene) {
        this.scene = scene;
        this.events = [];
    }

    addEvent(config) {
        const evt = {
            delay: config.delay || 0,
            callback: config.callback,
            callbackScope: config.callbackScope || this.scene,
            args: config.args || [],
            loop: Boolean(config.loop),
            repeat: config.repeat !== undefined ? config.repeat : 0,
            elapsed: 0,
            removed: false,
            remove: () => { evt.removed = true; }
        };
        this.events.push(evt);
        return evt;
    }

    delayedCall(delay, callback, args = [], scope = null) {
        return this.addEvent({
            delay,
            callback,
            callbackScope: scope,
            args
        });
    }

    tick(deltaMs = 16) {
        const toRun = this.events.slice();
        for (const evt of toRun) {
            if (evt.removed) continue;
            evt.elapsed += deltaMs;
            if (evt.elapsed >= evt.delay) {
                evt.elapsed = 0;
                if (evt.callback) {
                    evt.callback.apply(evt.callbackScope, evt.args);
                }
                if (!evt.loop && evt.repeat <= 0) {
                    evt.remove();
                } else if (evt.repeat > 0) {
                    evt.repeat--;
                }
            }
        }
        this.events = this.events.filter(e => !e.removed);
    }

    flush() {
        for (const evt of this.events) {
            if (!evt.removed && evt.callback) {
                evt.callback.apply(evt.callbackScope, evt.args);
                evt.remove();
            }
        }
        this.events = [];
    }
}

// --- CAMERAS & ANIMATIONS ---
class CameraMock {
    constructor() {
        this.scrollX = 0;
        this.scrollY = 0;
        this.zoom = 1;
        this.roundPixels = true;
        this.deadzone = null;
        this.shaking = false;
        this.flashing = false;
    }
    setBounds(x, y, w, h) { return this; }
    startFollow(target, roundPixels, lerpX, lerpY) { return this; }
    setDeadzone(width, height) { this.deadzone = { width, height }; return this; }
    setZoom(z) { this.zoom = z; return this; }
    fadeIn(duration = 500, r = 255, g = 255, b = 255) { return this; }
    fadeOut(duration = 500, r = 0, g = 0, b = 0) { return this; }
    shake(duration = 100, intensity = 0.01) { this.shaking = true; return this; }
    flash(duration = 500, r = 255, g = 255, b = 255) { this.flashing = true; return this; }
}

class AnimsMock {
    constructor() {
        this.registry = new Map();
    }
    exists(key) {
        return this.registry.has(key);
    }
    create(config) {
        this.registry.set(config.key, config);
        return config;
    }
    generateFrameNumbers(key, config) {
        const frames = [];
        const start = config.start || 0;
        const end = config.end || 0;
        for (let i = start; i <= end; i++) {
            frames.push({ key, frame: i });
        }
        return frames;
    }
}

// --- LOADER MOCK ---
class LoaderMock {
    constructor(scene) {
        this.scene = scene;
        this.queue = new Map();
    }
    image(key, url) {
        this.queue.set(key, { type: 'image', key, url });
        if (this.scene && this.scene.textures) {
            this.scene.textures.add(key, 32, 32);
        }
        return this;
    }
    spritesheet(key, url, frameConfig) {
        this.queue.set(key, { type: 'spritesheet', key, url, frameConfig });
        if (this.scene && this.scene.textures) {
            this.scene.textures.add(key, 32, 32);
        }
        return this;
    }
}

// --- UNIFIED SCENE & SCENE PLUGIN ---
class SceneRegistry {
    constructor() {
        this.scenes = new Map();
    }

    register(key, scene) {
        this.scenes.set(key, scene);
    }

    get(key) {
        return this.scenes.get(key) || null;
    }

    clear() {
        this.scenes.clear();
    }
}

class ScenePlugin {
    constructor(scene, registry) {
        this.currentScene = scene;
        this.registry = registry;
    }

    get(key) {
        return this.registry.get(key);
    }

    launch(key, data = {}) {
        const target = this.registry.get(key);
        if (target) {
            target.active = true;
            target.visible = true;
            if (target.init) target.init(data);
            if (target.preload) target.preload();
            if (target.create) target.create(data);
        }
        return this;
    }

    run(key, data = {}) {
        const target = this.registry.get(key);
        if (target) {
            if (!target.isInitialized) {
                this.launch(key, data);
                target.isInitialized = true;
            } else {
                target.active = true;
                target.visible = true;
                target.isSleeping = false;
                target.isPaused = false;
                if (target.wake) target.wake();
            }
        }
        return this;
    }

    pause(key) {
        const target = key ? this.registry.get(key) : this.currentScene;
        if (target) {
            target.isPaused = true;
            target.events.emit('pause');
        }
        return this;
    }

    resume(key) {
        const target = key ? this.registry.get(key) : this.currentScene;
        if (target) {
            target.isPaused = false;
            target.events.emit('resume');
        }
        return this;
    }

    sleep(key) {
        const target = key ? this.registry.get(key) : this.currentScene;
        if (target) {
            target.isSleeping = true;
            target.active = false;
            target.events.emit('sleep');
        }
        return this;
    }

    wake(key) {
        const target = key ? this.registry.get(key) : this.currentScene;
        if (target) {
            target.isSleeping = false;
            target.active = true;
            target.events.emit('wake');
        }
        return this;
    }

    stop(key) {
        const target = key ? this.registry.get(key) : this.currentScene;
        if (target) {
            target.active = false;
            target.visible = false;
            target.events.emit('shutdown');
        }
        return this;
    }

    restart(data = {}) {
        const target = this.currentScene;
        target.stop && target.stop();
        if (target.init) target.init(data);
        if (target.preload) target.preload();
        if (target.create) target.create(data);
        return this;
    }

    start(key, data = {}) {
        this.stop();
        return this.launch(key, data);
    }
}

// --- DISPLAY LIST ---
class DisplayList {
    constructor(scene) {
        this.scene = scene;
        this.list = [];
    }
    add(child) {
        if (child && !this.list.includes(child)) {
            this.list.push(child);
        }
        return child;
    }
    remove(child) {
        const idx = this.list.indexOf(child);
        if (idx !== -1) {
            this.list.splice(idx, 1);
        }
        return child;
    }
    getChildren() {
        return this.list.slice();
    }
    each(fn, scope) {
        for (const child of this.list.slice()) {
            fn.call(scope || child, child);
        }
    }
}

// --- BASE PHASER SCENE ---
class PhaserScene {
    constructor(config) {
        const key = typeof config === 'string' ? config : (config && config.key ? config.key : this.constructor.name);
        this.key = key;
        this.active = true;
        this.visible = true;
        this.isPaused = false;
        this.isSleeping = false;
        this.isInitialized = false;

        this.children = new DisplayList(this);
        this.sys = { scene: this, displayList: this.children };
        this.events = new EventEmitter();
        this.add = new GameObjectFactory(this);
        this.make = {
            graphics: (opts) => this.add.graphics(opts)
        };
        this.textures = {
            _textures: new Map(),
            exists(key) { return this._textures.has(key); },
            get(key) { return this._textures.get(key) || { key }; },
            add(key, width, height) { this._textures.set(key, { key, width, height }); }
        };
        this.physics = new ArcadePhysics(this);
        this.input = {
            keyboard: new KeyboardPlugin()
        };
        this.tweens = new TweenManager(this);
        this.time = new TimeManager(this);
        this.cameras = {
            main: new CameraMock()
        };
        this.anims = new AnimsMock();
        this.load = new LoaderMock(this);

        // ScenePlugin will be attached by SceneRegistry runner
        this.scene = null;
    }

    init(data) {}
    preload() {}
    create(data) {}
    update(time, delta) {}
}

// --- ROOT PHASER OBJECT ---
const Phaser = {
    Scene: PhaserScene,
    Math: PhaserMath,
    BlendModes,
    Utils: {
        Array: {
            GetRandom: (arr) => (arr && arr.length > 0 ? arr[0] : null)
        }
    },
    Input: {
        Keyboard: {
            KeyCodes,
            Key,
            JustDown: (k) => Boolean(k && k.isJustDown)
        }
    },
    Physics: {
        Arcade: {
            Sprite,
            Body: ArcadeBody
        }
    },
    GameObjects: {
        GameObject,
        Sprite,
        Image,
        Zone,
        Group,
        Graphics,
        Text,
        Rectangle,
        Circle,
        Triangle
    }
};

// --- HARNESS BUILDER & ENVIRONMENT SETUP ---
function setupHeadlessEnvironment(rootDir = path.resolve(__dirname, '../..')) {
    // 1. Globals
    global.window = global;
    global.Phaser = Phaser;

    // LocalStorage mock
    global.localStorage = {
        _data: {},
        getItem(key) { return this._data.hasOwnProperty(key) ? this._data[key] : null; },
        setItem(key, val) { this._data[key] = String(val); },
        removeItem(key) { delete this._data[key]; },
        clear() { this._data = {}; }
    };

    // DOM Accessibility Announcer mock
    global.document = {
        getElementById(id) {
            return {
                id,
                textContent: '',
                innerText: ''
            };
        }
    };

    // Audio Manager mock
    const audioLogs = [];
    global.audioManager = {
        logs: audioLogs,
        play(sound) {
            audioLogs.push(sound);
        },
        clear() {
            audioLogs.length = 0;
        }
    };

    // Announce mock
    const announceLogs = [];
    global.announce = (msg) => {
        announceLogs.push(msg);
    };

    // 2. Load Core Modules
    const GameConfig = require(path.join(rootDir, 'src/data/config.js'));
    const GameManager = require(path.join(rootDir, 'src/managers/GameManager.js'));
    global.GameConfig = GameConfig;
    global.GameManager = GameManager;

    const mapsSource = fs.readFileSync(path.join(rootDir, 'src/maps/maps.js'), 'utf8');
    const MapsData = new Function(mapsSource + '; return MapsData;')();
    global.MapsData = MapsData;

    const playerSource = fs.readFileSync(path.join(rootDir, 'src/classes/Player.js'), 'utf8');
    const Player = new Function(playerSource + '; return Player;')();
    global.Player = Player;

    const enemySource = fs.readFileSync(path.join(rootDir, 'src/classes/Enemy.js'), 'utf8');
    const Enemy = new Function(enemySource + '; return Enemy;')();
    global.Enemy = Enemy;

    // Scenes
    const worldSceneSource = fs.readFileSync(path.join(rootDir, 'src/scenes/WorldScene.js'), 'utf8');
    const WorldSceneContext = new Function(worldSceneSource + '; return { WorldScene, OcclusionManager };')();
    const WorldScene = WorldSceneContext.WorldScene;
    const OcclusionManager = WorldSceneContext.OcclusionManager;
    global.WorldScene = WorldScene;
    global.OcclusionManager = OcclusionManager;

    const battleSceneSource = fs.readFileSync(path.join(rootDir, 'src/scenes/BattleScene.js'), 'utf8');
    const BattleScene = new Function(battleSceneSource + '; return BattleScene;')();
    global.BattleScene = BattleScene;

    const uiSceneSource = fs.readFileSync(path.join(rootDir, 'src/scenes/UIScene.js'), 'utf8');
    const UIScene = new Function(uiSceneSource + '; return UIScene;')();
    global.UIScene = UIScene;

    const hudSceneSource = fs.readFileSync(path.join(rootDir, 'src/scenes/HUDScene.js'), 'utf8');
    const HUDScene = new Function(hudSceneSource + '; return HUDScene;')();
    global.HUDScene = HUDScene;

    // 3. Initialize Shared Game State
    window.gameState = new GameManager(GameConfig);

    // 4. Registry & Wiring Helper
    const registry = new SceneRegistry();

    function createSceneHarness() {
        const worldScene = new WorldScene();
        const hudScene = new HUDScene();
        const battleScene = new BattleScene();
        const uiScene = new UIScene();

        const scenes = [worldScene, hudScene, battleScene, uiScene];
        for (const s of scenes) {
            s.scene = new ScenePlugin(s, registry);
            registry.register(s.key, s);
        }

        return {
            worldScene,
            hudScene,
            battleScene,
            uiScene,
            registry,
            step(deltaMs = 16) {
                for (const s of scenes) {
                    if (s.active && !s.isPaused && !s.isSleeping) {
                        s.time.tick(deltaMs);
                        s.physics.step();
                        if (s.update) s.update(0, deltaMs);
                        if (s.input && s.input.keyboard) s.input.keyboard.clearJustDown();
                    }
                }
            }
        };
    }

    return {
        Phaser,
        GameConfig,
        GameManager,
        MapsData,
        Player,
        Enemy,
        WorldScene,
        OcclusionManager,
        BattleScene,
        UIScene,
        HUDScene,
        registry,
        createSceneHarness,
        audioLogs,
        announceLogs
    };
}

module.exports = {
    Phaser,
    EventEmitter,
    Vector2,
    KeyCodes,
    Key,
    KeyboardPlugin,
    ArcadeBody,
    GameObject,
    Sprite,
    Image,
    Zone,
    Group,
    Graphics,
    Text,
    Rectangle,
    Circle,
    Triangle,
    ArcadePhysics,
    SceneRegistry,
    ScenePlugin,
    PhaserScene,
    setupHeadlessEnvironment
};
