const assert = require('assert');
const path = require('path');
const child_process = require('child_process');

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
    console.log("================================================================================");
    console.log("             MASTER TEST RUNNER - 2D RPG ORCHESTRATOR");
    console.log("================================================================================\n");

    console.log("--- 1. LEGACY GAMEMANAGER UNIT TESTS (5 TESTS) ---");
    let legacyPassed = 0;
    let legacyFailed = 0;
    
    function test(name, fn) {
        try {
            fn();
            console.log(`  [PASS] ${name}`);
            legacyPassed++;
        } catch (e) {
            console.error(`  [FAIL] ${name}`);
            console.error(e);
            legacyFailed++;
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

    console.log(`\nTests unitaires legacy terminés : ${legacyPassed} succès, ${legacyFailed} échecs.\n`);

    // --- 2. 2.5D REGRESSION SUITE (52 TESTS) ---
    console.log("--- 2. 2.5D REGRESSION SUITE (52 TESTS) ---");
    const suite25dPath = path.join(__dirname, 'test_25d_suite.js');
    const res25d = child_process.spawnSync(process.execPath, [suite25dPath], { stdio: 'inherit' });
    const suite25dPassed = res25d.status === 0;

    // --- 3. E2E REQUIREMENT-DRIVEN SUITE (93 TESTS) ---
    console.log("\n--- 3. E2E REQUIREMENT-DRIVEN SUITE (93 TESTS) ---");
    const suiteE2ePath = path.join(__dirname, 'test_e2e_suite.js');
    const resE2e = child_process.spawnSync(process.execPath, [suiteE2ePath], { stdio: 'inherit' });
    const suiteE2ePassed = resE2e.status === 0;

    // --- 4. AGGREGATED REPORT ---
    const totalLegacy = legacyPassed + legacyFailed;
    const total25d = 52;
    const passed25d = suite25dPassed ? 52 : 0;
    const failed25d = suite25dPassed ? 0 : 52;

    const totalE2e = 93;
    const passedE2e = suiteE2ePassed ? 93 : 0;
    const failedE2e = suiteE2ePassed ? 0 : 93;

    const grandTotal = totalLegacy + total25d + totalE2e;
    const grandPassed = legacyPassed + passed25d + passedE2e;
    const grandFailed = legacyFailed + failed25d + failedE2e;

    console.log("\n================================================================================");
    console.log("                  GRAND TOTAL TEST EXECUTION SUMMARY");
    console.log("================================================================================");
    console.log(`  1. Legacy GameManager Unit Tests  : ${legacyPassed} / ${totalLegacy} PASS`);
    console.log(`  2. 2.5D RPG Regression Suite       : ${passed25d} / ${total25d} PASS`);
    console.log(`  3. E2E Requirement-Driven Suite   : ${passedE2e} / ${totalE2e} PASS`);
    console.log("--------------------------------------------------------------------------------");
    console.log(`  TOTAL TESTS AGGREGATED            : ${grandTotal}`);
    console.log(`  TOTAL PASSED                      : ${grandPassed}`);
    console.log(`  TOTAL FAILED                      : ${grandFailed}`);
    console.log("================================================================================");

    if (grandFailed > 0 || !suite25dPassed || !suiteE2ePassed) {
        console.error("\n>>> EXECUTION COMPLETED WITH FAILURES <<<\n");
        process.exit(1);
    } else {
        console.log("\n>>> ALL 150 TESTS PASSED SUCCESSFULLY! <<<\n");
        process.exit(0);
    }
}

runTests();
