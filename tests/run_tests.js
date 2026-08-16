const assert = require('assert');
const path = require('path');

// Mock localStorage for Node.js environment
global.localStorage = {
    _data: {},
    getItem: function(key) { return this._data[key] || null; },
    setItem: function(key, val) { this._data[key] = String(val); },
    removeItem: function(key) { delete this._data[key]; },
    clear: function() { this._data = {}; }
};

// Load dependencies
const GameConfig = require('../src/data/config.js');
const GameManager = require('../src/managers/GameManager.js');

function runTests() {
    console.log("Démarrage des tests unitaires du GameManager...");
    let passed = 0;
    let failed = 0;
    
    function test(name, fn) {
        try {
            fn();
            console.log(`[PASS] ${name}`);
            passed++;
        } catch (e) {
            console.error(`[FAIL] ${name}`);
            console.error(e);
            failed++;
        }
    }

    test("Initialisation avec la config", () => {
        const gm = new GameManager(GameConfig);
        assert.strictEqual(gm.player.level, 1);
        assert.strictEqual(gm.player.hp, 100);
        assert.strictEqual(gm.inventory.length, 0);
        assert.strictEqual(gm.quests[0].id, "q1");
    });

    test("Ajout et retrait d'objets (Inventaire)", () => {
        const gm = new GameManager(GameConfig);
        gm.addItem({ id: "wood", name: "Bois", qty: 2 });
        assert.strictEqual(gm.inventory.length, 1);
        assert.strictEqual(gm.inventory[0].qty, 2);
        
        gm.addItem({ id: "wood", name: "Bois", qty: 3 });
        assert.strictEqual(gm.inventory.length, 1);
        assert.strictEqual(gm.inventory[0].qty, 5);
        
        const removed = gm.removeItem("wood", 2);
        assert.strictEqual(removed, true);
        assert.strictEqual(gm.inventory[0].qty, 3);
        
        const removedTooMany = gm.removeItem("wood", 10);
        assert.strictEqual(removedTooMany, false);
        assert.strictEqual(gm.inventory[0].qty, 3);
        
        gm.removeItem("wood", 3);
        assert.strictEqual(gm.inventory.length, 0);
    });

    test("Crafting de recette (Pont en Bois)", () => {
        const gm = new GameManager(GameConfig);
        gm.addItem({ id: "wood", name: "Bois", qty: 10 });
        
        const crafted = gm.craftItem("bridge");
        assert.strictEqual(crafted, true);
        
        const bridge = gm.inventory.find(i => i.id === "bridge");
        const wood = gm.inventory.find(i => i.id === "wood");
        assert.ok(bridge);
        assert.strictEqual(bridge.qty, 1);
        assert.strictEqual(wood.qty, 5); // 10 - 5
    });
    
    test("Utilisation d'objets (Potion)", () => {
        const gm = new GameManager(GameConfig);
        gm.addItem({ id: "potion", name: "Potion", qty: 1 });
        gm.player.hp = 50;
        
        const used = gm.useItem("potion");
        assert.strictEqual(used, true);
        assert.strictEqual(gm.player.hp, 80); // 50 + 30
        assert.strictEqual(gm.inventory.length, 0);
    });
    
    test("Gain d'XP et Level Up", () => {
        const gm = new GameManager(GameConfig);
        gm.player.xp = 90;
        gm.player.level = 1;
        gm.player.maxHp = 100;
        
        const noLevelUp = gm.checkLevelUp();
        assert.strictEqual(noLevelUp, false);
        
        gm.player.xp = 110;
        const levelUp = gm.checkLevelUp();
        assert.strictEqual(levelUp, true);
        assert.strictEqual(gm.player.level, 2);
        assert.strictEqual(gm.player.xp, 10);
        assert.strictEqual(gm.player.maxHp, 120);
        assert.strictEqual(gm.player.hp, 120);
    });

    console.log(`\nTests terminés : ${passed} succès, ${failed} échecs.`);
    process.exit(failed > 0 ? 1 : 0);
}

runTests();
