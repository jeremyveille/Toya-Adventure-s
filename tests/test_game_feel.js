// Contrats temporels : la simulation teste des actions, pas le rendu de Phaser.
const assert = require('assert');
const fs = require('fs');
global.GameFeelConfig = require('../src/data/gameFeel.js');
global.window = global;
class Sprite {
    constructor(scene, x, y, texture) {
        Object.assign(this, { scene, x, y, texture: { key: texture }, active: true });
        this.body = { velocity: { x: 0, y: 0 }, setSize() {}, setOffset() {} };
        this.anims = { stop() {}, play() {} };
    }
    once(name, callback) { if (name === 'destroy') this.destroyListener = callback; }
    destroy(fromScene = false) { if (this.destroyListener) this.destroyListener(this, fromScene); this.active = false; }
    setScale() {} setOrigin() {} setCollideWorldBounds() {} setDepth() {} setFrame() {} setTint() {} clearTint() {}
    setVelocity(x, y = x) { this.body.velocity.x = x; this.body.velocity.y = y; }
}
global.Phaser = {
    Physics: { Arcade: { Sprite } },
    Input: { Keyboard: { KeyCodes: { SPACE: 32, SHIFT: 16 }, JustDown(key) { const down = key.justDown; key.justDown = false; return down; } } }
};
const Player = new Function(fs.readFileSync(require.resolve('../src/classes/Player.js'), 'utf8') + '; return Player;')();
function scene() {
    const graphics = () => ({ clear() {}, setPosition() {}, setDepth() {}, fillStyle() {}, fillRect() {}, destroy() {} });
    return {
        add: { existing() {}, graphics, zone(x, y, width, height) { return { x, y, width, height, destroy() { this.destroyed = true; }, body: {
            setSize() {}, updateFromGameObject() { this.synced = true; }
        } }; } },
        physics: { add: { existing() {} } },
        anims: { exists() { return true; } },
        input: { keyboard: {
            createCursorKeys() { return { left: {}, right: {}, up: {}, down: {} }; },
            addKeys() { return { Z: {}, Q: {}, S: {}, D: {} }; },
            addKey() { return {}; }
        } },
        cameras: { main: { shake() {} } }, events: { emit() {} }
    };
}
function player() { return new Player(scene(), 100, 100, 'hero'); }
function step(p, count, delta) { for (let i = 0; i < count; i++) p.update(i * delta, delta); }
let passed = 0;
function test(name, run) { run(); passed++; console.log('[PASS] ' + name); }

test('Accélération cohérente à 30/60/120 Hz et diagonale bornée', () => {
    for (const hz of [30, 60, 120]) {
        const p = player(); p.keys.D.isDown = true; p.keys.Z.isDown = true;
        step(p, Math.round(hz / 10), 1000 / hz);
        assert(Math.abs(Math.hypot(p.body.velocity.x, p.body.velocity.y) - 135) < 0.001);
        step(p, hz, 1000 / hz);
        assert(Math.abs(Math.hypot(p.body.velocity.x, p.body.velocity.y) - 150) < 0.001);
        p.keys.D.isDown = p.keys.Z.isDown = false;
        step(p, Math.ceil(hz / 10), 1000 / hz);
        assert.strictEqual(Math.hypot(p.body.velocity.x, p.body.velocity.y), 0);
    }
});
test('Course et retour marche respectent les vitesses maximales', () => {
    const p = player(); p.keys.D.isDown = p.shiftKey.isDown = true;
    step(p, 60, 1000 / 60); assert.strictEqual(p.body.velocity.x, 230);
    p.shiftKey.isDown = false; p.update(1000, 1000 / 60);
    assert.strictEqual(p.body.velocity.x, 150);
});
test('Attaque : préparation sans dégâts, un impact par cible, récupération sans hitbox', () => {
    const p = player(); const a = {}, b = {};
    p.performActionAttack(); assert.strictEqual(p.canHitTarget(a), false);
    p.updateAttack(65); assert.strictEqual(p.canHitTarget(a), true);
    assert.strictEqual(p.canHitTarget(a), false); assert.strictEqual(p.canHitTarget(b), true);
    assert.strictEqual(p.weaponHitbox.body.synced, true);
    p.updateAttack(110); assert.strictEqual(p.canHitTarget({}), false);
    assert.strictEqual(p.isAttacking, true);
    p.updateAttack(140); assert.strictEqual(p.isAttacking, false);
    p.performActionAttack(); p.updateAttack(65); assert.strictEqual(p.canHitTarget(a), true);
});
test('Chaque direction place la hitbox devant les pieds et garde le body synchronisé', () => {
    for (const [facing, dx, dy] of [['right', 29, 0], ['left', -29, 0], ['up', 0, -29], ['down', 0, 29]]) {
        const p = player(); p.facing = facing; p.performActionAttack();
        assert.strictEqual(p.weaponHitbox.x, p.x + dx);
        assert.strictEqual(p.weaponHitbox.y, p.y - 8 + dy);
        assert.strictEqual(p.weaponHitbox.body.synced, true);
    }
});
test('Dialogue/menu annule attaque et exige relâchement Espace', () => {
    const p = player(); p.performActionAttack(); p.updateAttack(65);
    p.scene.controlsLocked = true; p.update(0, 16);
    assert.strictEqual(p.isAttacking, false); assert.strictEqual(p.weaponHitbox.body.enable, false);
    p.scene.controlsLocked = false; p.suppressActionUntilRelease = true;
    p.spaceBar.isDown = p.spaceBar.justDown = true; p.update(16, 16);
    assert.strictEqual(p.isAttacking, false);
    p.spaceBar.isDown = false; p.update(32, 16);
    p.spaceBar.justDown = p.spaceBar.isDown = true; p.update(48, 16);
    assert.strictEqual(p.isAttacking, true);
});
test('Impact joueur : invulnérabilité, recul, HP bornés et aucune blessure en dialogue', () => {
    global.gameState = { player: { hp: 100 }, save() {} };
    const p = player();
    assert.strictEqual(p.receiveDamage(10, { x: 90, y: 100 }), true);
    assert.strictEqual(p.body.velocity.x, 150);
    assert.strictEqual(p.receiveDamage(10), false); assert.strictEqual(gameState.player.hp, 90);
    step(p, 50, 16); assert.strictEqual(p.receiveDamage(100), true);
    assert.strictEqual(gameState.player.hp, 0);
    gameState.player.hp = 100; p.invulnerabilityMs = 0; p.scene.controlsLocked = true;
    assert.strictEqual(p.receiveDamage(10), false);
});
test('Arrêt de scène : Player laisse Phaser détruire ses zones et son épée', () => {
    const p = player();
    const slash = { destroyed: false, destroy() { this.destroyed = true; } };
    p.slash = slash; p.isAttacking = true; p.weaponHitbox.body.enable = true;
    p.destroy(true);
    assert.strictEqual(p.weaponHitbox.body.enable, false);
    assert.strictEqual(p.interactionHitbox.destroyed, undefined);
    assert.strictEqual(p.weaponHitbox.destroyed, undefined);
    assert.strictEqual(slash.destroyed, false);
    assert.strictEqual(p.slash, null);
    const removedInPlay = player();
    const otherSlash = { destroyed: false, destroy() { this.destroyed = true; } };
    removedInPlay.slash = otherSlash;
    removedInPlay.destroy(false);
    assert.strictEqual(removedInPlay.interactionHitbox.destroyed, true);
    assert.strictEqual(removedInPlay.weaponHitbox.destroyed, true);
    assert.strictEqual(otherSlash.destroyed, true);
});
console.log(`${passed} contrats de mouvement/combat validés.`);
