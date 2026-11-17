const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const settings = require('../src/data/gameFeel.js');
const source = fs.readFileSync(path.join(__dirname, '../src/classes/Enemy.js'), 'utf8');

class Events {
    constructor() { this.listeners = []; }
    once(name, callback, context) { this.listeners.push({ name, callback, context }); }
    off(name, callback, context) {
        this.listeners = this.listeners.filter(entry => entry.name !== name || entry.callback !== callback || entry.context !== context);
    }
    emit(name, ...args) {
        const matches = this.listeners.filter(entry => entry.name === name);
        matches.forEach(entry => {
            this.off(name, entry.callback, entry.context);
            entry.callback.apply(entry.context, args);
        });
    }
}

function setup(type = 'minor') {
    class Sprite {
        constructor(scene, x, y) {
            this.scene = scene;
            this.x = x;
            this.y = y;
            this.active = true;
            this.body = {
                velocity: { x: 0, y: 0 },
                setSize: (width, height) => { this.body.width = width; this.body.height = height; },
                setOffset: (x, y) => { this.body.offset = { x, y }; }
            };
        }
        setScale(value) { this.scale = value; }
        setOrigin(x, y) { this.originX = x; this.originY = y; }
        setCollideWorldBounds(value) { this.collideWorldBounds = value; }
        setImmovable(value) { this.body.immovable = value; }
        setVelocity(x, y = x) { this.body.velocity = { x, y }; }
        setDepth(depth) { this.depth = depth; }
        setTint(tint) { this.tint = tint; }
        clearTint() { this.tint = null; }
        preUpdate() {}
        destroy() { this.active = false; this.scene = null; }
    }
    function object(x, y) {
        return {
            x, y, active: true,
            setDepth(depth) { this.depth = depth; },
            setOrigin() {},
            destroy() { this.active = false; }
        };
    }
    const scene = {
        controlsLocked: false,
        events: new Events(),
        colliders: [],
        timers: [],
        graphics: [],
        walls: {},
        add: {
            existing() {},
            rectangle: object,
            text: object,
            graphics() {
                const graphic = { active: true, marks: [], setDepth() {}, fillStyle() {}, fillRect(...args) { this.marks.push(args); }, destroy() { this.active = false; } };
                scene.graphics.push(graphic);
                return graphic;
            }
        },
        physics: {
            add: {
                existing(obj) {
                    if (!obj.body) obj.body = { setVelocity(x, y) { this.velocity = { x, y }; } };
                },
                overlap(a, b, callback) {
                    const collider = { callback, active: true, destroy() { this.active = false; } };
                    scene.colliders.push(collider);
                    return collider;
                },
                collider(a, b, callback) { return this.overlap(a, b, callback); }
            }
        },
        time: {
            delayedCall(delay, callback) {
                const timer = { delay, callback, paused: false, removed: false, remove() { this.removed = true; } };
                scene.timers.push(timer);
                return timer;
            }
        },
        tweens: { add() {} },
        player: { x: 150, y: 100, active: true, receiveDamage(amount) { this.hits = (this.hits || 0) + 1; this.lastDamage = amount; } }
    };
    const state = { player: { xp: 0, gold: 0 }, save() {}, checkLevelUp() { return false; } };
    const context = { Phaser: { Physics: { Arcade: { Sprite } } }, GameFeelConfig: settings, window: { gameState: state }, Set, Math };
    vm.createContext(context);
    vm.runInContext(source + '; this.Enemy = Enemy;', context);
    const enemy = new context.Enemy(scene, 100, 100, 'tex_slime', type);
    let elapsed = 0;
    function advance(duration) {
        while (duration > 0) {
            const delta = Math.min(duration, 50);
            elapsed += delta;
            enemy.preUpdate(elapsed, delta);
            duration -= delta;
        }
    }
    return { enemy, scene, state, advance };
}

test('Ennemi : corps séparable des murs et empreinte limitée aux pieds', () => {
    const { enemy } = setup();
    assert.equal(enemy.body.immovable, false);
    assert.equal(enemy.collideWorldBounds, true);
    assert.equal(enemy.body.width, 32);
    assert.equal(enemy.body.height, 14);
    assert.equal(enemy.originY, 0.95);
});

test('Ennemi : approche normalisée puis attaque annoncée avant toute fenêtre de dégâts', () => {
    const { enemy, scene, advance } = setup();
    scene.player.x = 220;
    scene.player.y = 220;
    advance(16);
    assert.equal(enemy.state, 'approach');
    assert.ok(Math.abs(Math.hypot(enemy.body.velocity.x, enemy.body.velocity.y) - settings.enemy.walkSpeed) < 1e-6);
    assert.equal(enemy.canDamagePlayer(), false);
    scene.player.x = 150;
    scene.player.y = 100;
    advance(16);
    assert.equal(enemy.state, 'telegraph');
    assert.equal(scene.graphics[0].marks.length, 5);
    advance(settings.enemy.telegraphMs - 1);
    assert.equal(enemy.state, 'telegraph');
    assert.equal(enemy.canDamagePlayer(), false);
    advance(1);
    assert.equal(enemy.state, 'lunge');
    assert.equal(enemy.canDamagePlayer(), true);
    assert.equal(enemy.body.velocity.x, settings.enemy.lungeSpeed);
    advance(settings.enemy.lungeMs);
    assert.equal(enemy.state, 'recover');
    assert.equal(enemy.canDamagePlayer(), false);
    advance(settings.enemy.recoveryMs - 1);
    assert.equal(enemy.state, 'recover');
});

test('Ennemi : direction de charge verrouillée pendant la télégraphie et contrôle bloqué respecté', () => {
    const { enemy, scene, advance } = setup();
    advance(16);
    scene.player.x = 100;
    scene.player.y = 150;
    advance(settings.enemy.telegraphMs);
    assert.equal(enemy.body.velocity.x, settings.enemy.lungeSpeed);
    assert.equal(enemy.body.velocity.y, 0);
    scene.controlsLocked = true;
    advance(100);
    assert.equal(enemy.body.velocity.x, 0);
    assert.equal(enemy.canDamagePlayer(), false);
    scene.controlsLocked = false;
    advance(16);
    assert.equal(enemy.body.velocity.x, settings.enemy.lungeSpeed);
});

test('Ennemi : recul, invulnérabilité temporaire et récompense de mort unique', () => {
    const { enemy, scene, state, advance } = setup();
    enemy.spawnId = 'Village:enemy1';
    let defeated = null;
    scene.events.once('EnemyDefeated', id => { defeated = id; });
    assert.equal(enemy.takeDamage(20), true);
    assert.equal(enemy.hp, 10);
    assert.equal(Math.hypot(enemy.body.velocity.x, enemy.body.velocity.y), settings.enemy.knockbackSpeed);
    assert.equal(enemy.takeDamage(20), false);
    advance(settings.enemy.hurtMs);
    assert.equal(enemy.isFlashing, false);
    enemy.takeDamage(20);
    assert.equal(enemy.active, false);
    assert.equal(state.player.xp, 20);
    assert.equal(state.player.gold, 5);
    assert.equal(defeated, 'Village:enemy1');
    enemy.die();
    assert.equal(state.player.xp, 20);
});

test('Tireur : projectile annoncé, pause et destruction de tous les colliders après impact', () => {
    const { enemy, scene, advance } = setup('shooter');
    advance(16);
    assert.equal(enemy.projectiles.size, 0);
    advance(settings.enemy.telegraphMs);
    assert.equal(enemy.projectiles.size, 1);
    assert.equal(enemy.canDamagePlayer(), false);
    const record = [...enemy.projectiles][0];
    scene.controlsLocked = true;
    advance(50);
    assert.equal(record.bullet.body.velocity.x, 0);
    assert.equal(record.timer.paused, true);
    scene.controlsLocked = false;
    advance(50);
    assert.equal(record.bullet.body.velocity.x, settings.enemy.projectileSpeed);
    assert.equal(record.timer.paused, false);
    scene.colliders[0].callback(scene.player);
    assert.equal(scene.player.hits, 1);
    assert.equal(scene.player.lastDamage, settings.enemy.contactDamage);
    assert.equal(enemy.projectiles.size, 0);
    assert.equal(record.bullet.active, false);
    assert.equal(record.timer.removed, true);
    assert.ok(scene.colliders.every(collider => !collider.active));
});

test('Tireur : mur, expiration et arrêt de scène nettoient les projectiles et avertissements', () => {
    const { enemy, scene } = setup('shooter');
    enemy.shootAtPlayer();
    scene.colliders[1].callback();
    assert.equal(enemy.projectiles.size, 0);
    enemy.shootAtPlayer();
    const expiring = [...enemy.projectiles][0];
    expiring.timer.callback();
    assert.equal(enemy.projectiles.size, 0);
    enemy.shootAtPlayer();
    enemy.changeState('telegraph', 500);
    const warning = enemy.warning;
    const remaining = [...enemy.projectiles][0];
    scene.events.emit('shutdown');
    assert.equal(enemy.projectiles.size, 0);
    // Phaser détruit lui-même les GameObjects : aucun sibling n'est retiré ici.
    assert.equal(remaining.bullet.active, true);
    assert.equal(warning.active, true);
    assert.equal(remaining.timer.removed, true);
    assert.ok(scene.colliders.every(collider => !collider.active));
});

test('Boss : le comportement de combat au tour par tour reste indépendant de cette IA', () => {
    const { enemy, advance } = setup('major');
    advance(2000);
    assert.equal(enemy.state, 'idle');
    assert.equal(enemy.canDamagePlayer(), false);
    assert.equal(enemy.body.velocity.x, 0);
});

test('Arrêt de scène : Enemy libère les ressources sans détruire les siblings du DisplayList', () => {
    const { enemy, scene } = setup('shooter');
    enemy.shootAtPlayer();
    enemy.changeState('telegraph', 500);
    const warning = enemy.warning;
    const record = [...enemy.projectiles][0];
    const shadow = { active: true, destroy() { this.active = false; } };
    enemy.shadow = shadow;
    enemy.destroy(true);
    assert.equal(enemy.active, false);
    assert.equal(warning.active, true);
    assert.equal(shadow.active, true);
    assert.equal(record.bullet.active, true);
    assert.equal(record.timer.removed, true);
    assert.ok(scene.colliders.every(collider => !collider.active));
    assert.equal(enemy.projectiles.size, 0);
    assert.equal(enemy.warning, null);
    assert.equal(enemy.shadow, null);
    assert.equal(scene.events.listeners.length, 0);
});
