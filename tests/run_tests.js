// Simple custom test runner for GameManager
const assert = require('assert');
const fs = require('fs');

const vm = require('vm');

// Polyfill window and localStorage
const sandbox = {
    window: {},
    console: console
};

sandbox.localStorage = {
    _data: {},
    getItem: function(key) { return this._data[key] || null; },
    setItem: function(key, value) { this._data[key] = String(value); },
    removeItem: function(key) { delete this._data[key]; },
    clear: function() { this._data = {}; }
};

vm.createContext(sandbox);
const gameManagerCode = fs.readFileSync('./src/managers/GameManager.js', 'utf8') + '\nwindow.GameManager = GameManager;';
vm.runInContext(gameManagerCode, sandbox);

// Tests
console.log("Running GameManager tests...");
let passed = 0;
let failed = 0;

function runTest(name, fn) {
    try {
        // Reset state before each test
        sandbox.localStorage.clear();
        sandbox.window.gameState = new sandbox.window.GameManager();
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (e) {
        console.error(`❌ ${name}`);
        console.error(e);
        failed++;
    }
}

runTest("Player starts at level 1 with correct HP", () => {
    assert.strictEqual(sandbox.window.gameState.player.level, 1);
    assert.strictEqual(sandbox.window.gameState.player.hp, 100);
});

runTest("Add item updates inventory", () => {
    sandbox.window.gameState.addItem({ id: "potion", name: "Potion", qty: 2 });
    assert.strictEqual(sandbox.window.gameState.inventory.length, 1);
    assert.strictEqual(sandbox.window.gameState.inventory[0].qty, 2);
});

runTest("Remove item updates inventory correctly", () => {
    sandbox.window.gameState.addItem({ id: "potion", name: "Potion", qty: 2 });
    let res = sandbox.window.gameState.removeItem("potion", 1);
    assert.strictEqual(res, true);
    assert.strictEqual(sandbox.window.gameState.inventory[0].qty, 1);
    
    // Remove last one
    sandbox.window.gameState.removeItem("potion", 1);
    assert.strictEqual(sandbox.window.gameState.inventory.length, 0);
});

runTest("Check level up logic", () => {
    sandbox.window.gameState.player.xp = 150;
    sandbox.window.gameState.checkLevelUp();
    assert.strictEqual(sandbox.window.gameState.player.level, 2);
    assert.strictEqual(sandbox.window.gameState.player.xp, 50); // 150 - 100
    assert.strictEqual(sandbox.window.gameState.player.maxHp, 120);
});

console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
