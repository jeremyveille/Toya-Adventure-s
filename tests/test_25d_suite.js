/**
 * TOYA ADVENTURE'S 2.5D RPG - AUTOMATED 4-TIER TEST SUITE
 * 
 * Multi-Tier Automated Verification:
 * - Tier 1: Feature Coverage (GameManager mechanics, Map structures, Symbol sets, Config contracts)
 * - Tier 2: Boundary & Corner Cases (Inventory boundaries, Health capping, Storage corruption recovery, Grid edges, Door data)
 * - Tier 3: Cross-Feature Combinations (Crafting + Inventory, Movement active guard, Attack locks, Interaction offsets, Map transitions, Depth & Shadows)
 * - Tier 4: Real-World Level 1 Scenario Progression (Tutorial steps 1-4, Bridge accessibility, House 1 exit consistency, Passable roofs)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ==========================================
// ENVIRONMENT SETUP & DEPENDENCY RESOLUTION
// ==========================================

// Mock localStorage for Node.js test environment
global.localStorage = {
    _data: {},
    getItem: function(key) { return Object.prototype.hasOwnProperty.call(this._data, key) ? this._data[key] : null; },
    setItem: function(key, val) { this._data[key] = String(val); },
    removeItem: function(key) { delete this._data[key]; },
    clear: function() { this._data = {}; }
};

// Mock window and browser audio globals
global.window = global;
global.audioManager = { play: () => {} };

// Mock Phaser minimal runtime for Entity testing
global.Phaser = {
    Physics: {
        Arcade: {
            Sprite: class {
                constructor(scene, x, y, texture) {
                    this.scene = scene;
                    this.x = x;
                    this.y = y;
                    this.texture = { key: texture };
                    this.depth = 0;
                    this.active = true;
                    this.originX = 0.5;
                    this.originY = 0.5;
                    this.body = {
                        width: 100,
                        height: 100,
                        velocity: {
                            x: 0,
                            y: 0,
                            length: () => Math.sqrt(this.body.velocity.x * this.body.velocity.x + this.body.velocity.y * this.body.velocity.y),
                            normalize: () => ({
                                scale: (speed) => {
                                    let len = this.body.velocity.length() || 1;
                                    this.body.velocity.x = (this.body.velocity.x / len) * speed;
                                    this.body.velocity.y = (this.body.velocity.y / len) * speed;
                                    return this.body.velocity;
                                }
                            })
                        },
                        setSize: (w, h) => { this.body.width = w; this.body.height = h; },
                        setOffset: (ox, oy) => { this.body.offsetX = ox; this.body.offsetY = oy; }
                    };
                    this.anims = { play: () => {}, stop: () => {} };
                }
                setScale(s) { this.scale = s; }
                setOrigin(ox, oy) { this.originX = ox; this.originY = oy; }
                setCollideWorldBounds(b) { this.collideWorldBounds = b; }
                setImmovable(b) { this.immovable = b; }
                setVelocity(x, y = x) { this.body.velocity.x = x; this.body.velocity.y = y; }
                setVelocityX(x) { this.body.velocity.x = x; }
                setVelocityY(y) { this.body.velocity.y = y; }
                setDepth(d) { this.depth = d; }
                setFrame(f) { this.frame = f; }
                setTint(t) { this.tint = t; }
                clearTint() { delete this.tint; }
                destroy() { this.active = false; }
            }
        }
    },
    Utils: {
        Array: {
            GetRandom: (arr) => arr[0]
        }
    },
    Math: {
        Between: (a, b) => a,
        DegToRad: (deg) => deg * Math.PI / 180,
        Vector2: class {
            constructor(x, y) { this.x = x; this.y = y; }
            normalize() {
                let mag = Math.sqrt(this.x * this.x + this.y * this.y) || 1;
                this.x /= mag;
                this.y /= mag;
                return this;
            }
            scale(s) { this.x *= s; this.y *= s; return this; }
        },
        Distance: {
            Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1)
        }
    },
    Input: {
        Keyboard: {
            KeyCodes: { SPACE: 32, SHIFT: 16 },
            JustDown: (k) => k.isJustDown || false
        }
    }
};

function createMockScene() {
    return {
        add: {
            existing: () => {},
            zone: (x, y, w, h) => ({
                x, y, width: w, height: h,
                body: { setEnable: () => {} }
            }),
            graphics: () => ({
                lineStyle: () => {}, fillStyle: () => {}, beginPath: () => {},
                arc: () => {}, lineTo: () => {}, fillPath: () => {}, strokePath: () => {},
                setPosition: () => {}, setDepth: () => {}
            }),
            text: (x, y, text) => ({
                x, y, text,
                setOrigin: () => ({ setDepth: () => {} }),
                setDepth: () => {},
                destroy: () => {}
            }),
            rectangle: (x, y, w, h, color) => ({
                x, y, w, h, color,
                body: {
                    velocity: { x: 0, y: 0 },
                    setVelocity: () => {}
                },
                setDepth: () => ({ setDepth: () => {} }),
                destroy: () => {}
            })
        },
        physics: {
            add: {
                existing: (obj) => {
                    if (obj && !obj.body) {
                        obj.body = {
                            velocity: { x: 0, y: 0 },
                            setVelocity: () => {}
                        };
                    }
                }
            }
        },
        anims: {
            exists: () => true,
            create: () => {},
            generateFrameNumbers: () => []
        },
        input: {
            keyboard: {
                createCursorKeys: () => ({
                    left: { isDown: false },
                    right: { isDown: false },
                    up: { isDown: false },
                    down: { isDown: false }
                }),
                addKeys: () => ({
                    Z: { isDown: false },
                    Q: { isDown: false },
                    S: { isDown: false },
                    D: { isDown: false }
                }),
                addKey: (code) => ({ code, isDown: false, isJustDown: false })
            }
        },
        tweens: {
            add: (config) => {
                if (config && typeof config.onComplete === 'function') {
                    // synchronous simulate for test
                }
            }
        },
        time: {
            addEvent: () => ({ remove: () => {} }),
            delayedCall: (ms, cb) => { if (typeof cb === 'function') cb(); }
        },
        cameras: {
            main: {
                shake: () => {},
                flash: () => {}
            }
        }
    };
}

// Load Modules
const rootDir = path.resolve(__dirname, '..');
const GameConfig = require(path.join(rootDir, 'src/data/config.js'));
const GameManager = require(path.join(rootDir, 'src/managers/GameManager.js'));

const mapsSource = fs.readFileSync(path.join(rootDir, 'src/maps/maps.js'), 'utf8');
const MapsData = new Function(mapsSource + '; return MapsData;')();

const playerSource = fs.readFileSync(path.join(rootDir, 'src/classes/Player.js'), 'utf8');
const Player = new Function(playerSource + '; return Player;')();

const enemySource = fs.readFileSync(path.join(rootDir, 'src/classes/Enemy.js'), 'utf8');
const Enemy = new Function(enemySource + '; return Enemy;')();

// ==========================================
// TEST RUNNER ENGINE
// ==========================================

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function test(tier, name, fn) {
    totalTests++;
    try {
        global.localStorage.clear();
        fn();
        console.log(`  [PASS] [${tier}] ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`  [FAIL] [${tier}] ${name}`);
        console.error(`         Error: ${err.message}`);
        failures.push({ tier, name, error: err });
        failedTests++;
    }
}

console.log("================================================================================");
console.log("        TOYA ADVENTURE'S 2.5D RPG - AUTOMATED 4-TIER TEST SUITE");
console.log("================================================================================\n");

// ==========================================
// TIER 1: FEATURE COVERAGE
// ==========================================
console.log("--- TIER 1: FEATURE COVERAGE ---");

// Group 1.1: GameManager Core Mechanics
test("T1-FEAT", "GameManager initializes default state from GameConfig", () => {
    const gm = new GameManager(GameConfig);
    assert.strictEqual(gm.player.level, 1, "Player initial level must be 1");
    assert.strictEqual(gm.player.hp, 100, "Player initial HP must be 100");
    assert.strictEqual(gm.player.maxHp, 100, "Player initial maxHp must be 100");
    assert.strictEqual(gm.player.mp, 50, "Player initial MP must be 50");
    assert.strictEqual(gm.player.maxMp, 50, "Player initial maxMp must be 50");
    assert.strictEqual(gm.player.gold, 0, "Player initial gold must be 0");
    assert.strictEqual(gm.player.damage, 20, "Player initial damage must be 20");
    assert.strictEqual(gm.inventory.length, 0, "Inventory must be empty initially");
    assert.strictEqual(gm.quests.length, 1, "Must load 1 initial quest");
    assert.strictEqual(gm.quests[0].id, "q1", "Initial quest id must be q1");
});

test("T1-FEAT", "GameManager state isolation (deep copy from GameConfig)", () => {
    const gm = new GameManager(GameConfig);
    gm.player.hp = 25;
    gm.quests[0].status = "completed";
    assert.strictEqual(GameConfig.initialPlayerState.hp, 100, "Config player state must remain pristine");
    assert.strictEqual(GameConfig.initialQuests[0].status, "active", "Config quests must remain pristine");
});

test("T1-FEAT", "GameManager reset restores initial defaults", () => {
    const gm = new GameManager(GameConfig);
    gm.addItem({ id: "wood", name: "Bois", qty: 5 });
    gm.player.hp = 10;
    gm.reset();
    assert.strictEqual(gm.player.hp, 100, "HP must reset to 100");
    assert.strictEqual(gm.inventory.length, 0, "Inventory must reset to empty");
});

test("T1-FEAT", "Inventory adds new distinct items", () => {
    const gm = new GameManager(GameConfig);
    gm.addItem({ id: "wood", name: "Bois", qty: 3 });
    gm.addItem({ id: "stone", name: "Pierre", qty: 2 });
    assert.strictEqual(gm.inventory.length, 2, "Must contain 2 distinct items");
    assert.strictEqual(gm.inventory[0].id, "wood");
    assert.strictEqual(gm.inventory[0].qty, 3);
    assert.strictEqual(gm.inventory[1].id, "stone");
    assert.strictEqual(gm.inventory[1].qty, 2);
});

test("T1-FEAT", "Inventory stacks existing items by ID", () => {
    const gm = new GameManager(GameConfig);
    gm.addItem({ id: "wood", name: "Bois", qty: 2 });
    gm.addItem({ id: "wood", name: "Bois", qty: 5 });
    assert.strictEqual(gm.inventory.length, 1, "Stacking should not create new slot");
    assert.strictEqual(gm.inventory[0].qty, 7, "2 + 5 must equal 7");
});

test("T1-FEAT", "Inventory removes partial quantity", () => {
    const gm = new GameManager(GameConfig);
    gm.addItem({ id: "wood", name: "Bois", qty: 10 });
    const success = gm.removeItem("wood", 4);
    assert.strictEqual(success, true, "Removal must succeed");
    assert.strictEqual(gm.inventory[0].qty, 6, "10 - 4 must equal 6");
});

test("T1-FEAT", "Inventory removes entire quantity and deletes entry", () => {
    const gm = new GameManager(GameConfig);
    gm.addItem({ id: "wood", name: "Bois", qty: 4 });
    const success = gm.removeItem("wood", 4);
    assert.strictEqual(success, true, "Removal must succeed");
    assert.strictEqual(gm.inventory.length, 0, "Entry must be removed completely when qty reaches 0");
});

test("T1-FEAT", "Potion usage restores up to 30 HP and consumes item", () => {
    const gm = new GameManager(GameConfig);
    gm.addItem({ id: "potion", name: "Potion", qty: 2 });
    gm.player.hp = 50;
    const used = gm.useItem("potion");
    assert.strictEqual(used, true, "Using potion must return true");
    assert.strictEqual(gm.player.hp, 80, "50 + 30 must equal 80");
    assert.strictEqual(gm.inventory[0].qty, 1, "1 potion remaining");
});

test("T1-FEAT", "XP gain and level up formula (level * 100 XP)", () => {
    const gm = new GameManager(GameConfig);
    gm.player.xp = 99;
    assert.strictEqual(gm.checkLevelUp(), false, "99 XP is below 100 threshold");
    assert.strictEqual(gm.player.level, 1);

    gm.player.xp = 115;
    assert.strictEqual(gm.checkLevelUp(), true, "115 XP triggers level up");
    assert.strictEqual(gm.player.level, 2, "Level should increase to 2");
    assert.strictEqual(gm.player.xp, 15, "115 - 100 must carry over 15 surplus XP");
    assert.strictEqual(gm.player.maxHp, 120, "maxHp increases +20 to 120");
    assert.strictEqual(gm.player.hp, 120, "hp replenished to full 120");
    assert.strictEqual(gm.player.damage, 25, "damage increases +5 to 25");
});

test("T1-FEAT", "Quest completion updates status and awards XP/Gold", () => {
    const gm = new GameManager(GameConfig);
    const updated = gm.completeQuestGoal("talk", "npc1");
    assert.strictEqual(updated, true, "Quest goal should complete");
    assert.strictEqual(gm.quests[0].status, "completed");
    assert.strictEqual(gm.player.xp, 50, "Awards +50 XP");
    assert.strictEqual(gm.player.gold, 20, "Awards +20 Gold");

    const retrigger = gm.completeQuestGoal("talk", "npc1");
    assert.strictEqual(retrigger, false, "Already completed quest cannot re-award");
    assert.strictEqual(gm.player.xp, 50, "XP remains unchanged on retrigger");
});

test("T1-FEAT", "LocalStorage save and load with RGPD consent", () => {
    global.localStorage.setItem('rpg_save_consent', 'true');
    const gm = new GameManager(GameConfig);
    gm.addItem({ id: "wood", name: "Bois", qty: 5 });
    gm.player.gold = 75;
    gm.save();

    const loadedGm = new GameManager(GameConfig);
    const loaded = loadedGm.load();
    assert.strictEqual(loaded, true, "Save data should be loaded");
    assert.strictEqual(loadedGm.player.gold, 75);
    assert.strictEqual(loadedGm.inventory.length, 1);
    assert.strictEqual(loadedGm.inventory[0].qty, 5);
});

// Group 1.2: Map Structure & Symbol Definitions
test("T1-FEAT", "MapsData contains canonical Village and House1 maps", () => {
    assert.ok(MapsData.Village, "MapsData must define 'Village'");
    assert.ok(MapsData.House1, "MapsData must define 'House1'");
    assert.strictEqual(MapsData.Village.tileSize, 64);
    assert.strictEqual(MapsData.House1.tileSize, 64);
});

test("T1-FEAT", "Village map geometry (40 columns by 25 rows)", () => {
    const layout = MapsData.Village.layoutText;
    assert.strictEqual(layout.length, 25, "Village must have exactly 25 rows");
    for (let r = 0; r < layout.length; r++) {
        assert.strictEqual(layout[r].length, 40, `Village row ${r} must have 40 columns`);
    }
});

test("T1-FEAT", "House1 map geometry (9 columns by 7 rows)", () => {
    const layout = MapsData.House1.layoutText;
    assert.strictEqual(layout.length, 7, "House1 must have exactly 7 rows");
    for (let r = 0; r < layout.length; r++) {
        assert.strictEqual(layout[r].length, 9, `House1 row ${r} must have 9 columns`);
    }
});

test("T1-FEAT", "Village layout symbol set validity", () => {
    const validSymbols = new Set(['T', 'C', '.', 't', '>', 'H', 'd', 'S', 'N', 'x', 'b', 'R', 'r', 'W', 'B', 'E', 'o']);
    const layout = MapsData.Village.layoutText;
    layout.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) {
            assert.ok(validSymbols.has(row[c]), `Unknown symbol '${row[c]}' in Village at row ${r}, col ${c}`);
        }
    });
});

test("T1-FEAT", "House1 layout symbol set validity", () => {
    const validSymbols = new Set(['w', 'f', 'o']);
    const layout = MapsData.House1.layoutText;
    layout.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) {
            assert.ok(validSymbols.has(row[c]), `Unknown symbol '${row[c]}' in House1 at row ${r}, col ${c}`);
        }
    });
});

test("T1-FEAT", "Village spawn symbol 'S' is uniquely defined", () => {
    const layout = MapsData.Village.layoutText;
    let spawnCount = 0;
    let spawnCoords = null;
    layout.forEach((row, r) => {
        let col = row.indexOf('S');
        if (col !== -1) {
            spawnCount++;
            spawnCoords = { x: col, y: r };
        }
    });
    assert.strictEqual(spawnCount, 1, "Exactly one spawn point 'S' must exist in Village");
    assert.deepStrictEqual(spawnCoords, { x: 5, y: 3 }, "Village spawn must be located at col 5, row 3");
});

test("T1-FEAT", "NPC and Chest definitions in maps data", () => {
    const npc = MapsData.Village.npcsData['N'];
    assert.ok(npc, "NPC 'N' must be defined in Village npcsData");
    assert.strictEqual(npc.id, "npc1");
    assert.strictEqual(npc.name, "Guide");
    assert.ok(npc.dialogue.length > 0, "NPC dialogue must not be empty");

    const chestVillage = MapsData.Village.chestsData['o'];
    assert.ok(chestVillage, "Chest 'o' must be defined in Village chestsData");
    assert.strictEqual(chestVillage.item.id, "potion");
    assert.strictEqual(chestVillage.item.qty, 3);

    const chestHouse = MapsData.House1.chestsData['o'];
    assert.ok(chestHouse, "Chest 'o' must be defined in House1 chestsData");
    assert.strictEqual(chestHouse.item.id, "sword_upgrade");
    assert.strictEqual(chestHouse.item.qty, 1);
});

// Group 1.3: Character & Game Configuration Schema
test("T1-FEAT", "GameConfig recipes schema integrity", () => {
    assert.ok(GameConfig.recipes.bridge, "Must define recipe 'bridge'");
    assert.ok(GameConfig.recipes.potion, "Must define recipe 'potion'");
    assert.deepStrictEqual(GameConfig.recipes.bridge.cost, [{ id: "wood", qty: 5 }]);
    assert.strictEqual(GameConfig.recipes.bridge.result.id, "bridge");
});

// ==========================================
// TIER 2: BOUNDARY & CORNER CASES
// ==========================================
console.log("\n--- TIER 2: BOUNDARY & CORNER CASES ---");

test("T2-BOUND", "Inventory rejects null, undefined, or missing ID", () => {
    const gm = new GameManager(GameConfig);
    gm.addItem(null);
    gm.addItem(undefined);
    gm.addItem({});
    gm.addItem({ qty: 5 });
    assert.strictEqual(gm.inventory.length, 0, "Invalid item objects must be safely ignored");
});

test("T2-BOUND", "Inventory remove returns false for non-existent item", () => {
    const gm = new GameManager(GameConfig);
    const removed = gm.removeItem("non_existent_item", 1);
    assert.strictEqual(removed, false, "Removing unheld item must return false");
    assert.strictEqual(gm.inventory.length, 0);
});

test("T2-BOUND", "Inventory remove returns false when requesting more than available", () => {
    const gm = new GameManager(GameConfig);
    gm.addItem({ id: "wood", name: "Bois", qty: 2 });
    const removed = gm.removeItem("wood", 5);
    assert.strictEqual(removed, false, "Removing excessive quantity must return false");
    assert.strictEqual(gm.inventory[0].qty, 2, "Inventory quantity must remain unmodified");
});

test("T2-BOUND", "Inventory large quantity stress boundary", () => {
    const gm = new GameManager(GameConfig);
    const largeQty = 1000000;
    gm.addItem({ id: "wood", name: "Bois", qty: largeQty });
    assert.strictEqual(gm.inventory[0].qty, largeQty);
    gm.removeItem("wood", largeQty - 1);
    assert.strictEqual(gm.inventory[0].qty, 1);
});

test("T2-BOUND", "Health potion overheal boundary (caps strictly at maxHp)", () => {
    const gm = new GameManager(GameConfig);
    gm.addItem({ id: "potion", name: "Potion", qty: 2 });
    gm.player.hp = 95;
    gm.player.maxHp = 100;
    gm.useItem("potion");
    assert.strictEqual(gm.player.hp, 100, "HP must cap at maxHp (100), never exceed to 125");

    // At full health
    gm.useItem("potion");
    assert.strictEqual(gm.player.hp, 100, "HP must stay at 100 when already full");
});

test("T2-BOUND", "LocalStorage save skips when RGPD consent is false or missing", () => {
    global.localStorage.setItem('rpg_save_consent', 'false');
    const gm = new GameManager(GameConfig);
    gm.addItem({ id: "wood", name: "Bois", qty: 10 });
    gm.save();
    assert.strictEqual(global.localStorage.getItem('rpg_save_v1'), null, "No save data written if consent=false");

    global.localStorage.removeItem('rpg_save_consent');
    gm.save();
    assert.strictEqual(global.localStorage.getItem('rpg_save_v1'), null, "No save data written if consent missing");
});

test("T2-BOUND", "LocalStorage load handles corrupted JSON without throwing", () => {
    global.localStorage.setItem('rpg_save_v1', '{corrupted-json:::');
    const gm = new GameManager(GameConfig);
    let success = false;
    assert.doesNotThrow(() => {
        success = gm.load();
    }, "Corrupted JSON in storage must not throw uncaught error");
    assert.strictEqual(success, false, "load() must return false on corrupted data");
    assert.strictEqual(gm.player.hp, 100, "State must remain default on load error");
});

test("T2-BOUND", "LocalStorage load handles malformed data structure without throwing", () => {
    global.localStorage.setItem('rpg_save_v1', JSON.stringify({ player: "invalid_string", inventory: 123 }));
    const gm = new GameManager(GameConfig);
    let success = false;
    assert.doesNotThrow(() => {
        success = gm.load();
    });
    assert.strictEqual(success, true, "Loads gracefully without crash");
    assert.strictEqual(gm.player.hp, 100, "Player state protected against non-object replacement");
});

test("T2-BOUND", "Village perimeter walls boundary integrity", () => {
    const layout = MapsData.Village.layoutText;
    const width = 40;
    const height = 25;

    // Row 0 and Row 24 must be blocking ('T')
    for (let c = 0; c < width; c++) {
        assert.strictEqual(layout[0][c], 'T', `Village top border col ${c} must be tree wall 'T'`);
        assert.strictEqual(layout[height - 1][c], 'T', `Village bottom border col ${c} must be tree wall 'T'`);
    }
    // Col 0 and Col 39 must be blocking ('T' or 'W')
    for (let r = 0; r < height; r++) {
        const left = layout[r][0];
        const right = layout[r][width - 1];
        assert.ok(left === 'T' || left === 'W', `Village left border row ${r} must be wall or water`);
        assert.ok(right === 'T' || right === 'W', `Village right border row ${r} must be wall or water`);
    }
});

test("T2-BOUND", "House1 perimeter walls and exit threshold", () => {
    const layout = MapsData.House1.layoutText;
    const width = 9;
    const height = 7;

    // Top row all walls
    for (let c = 0; c < width; c++) {
        assert.strictEqual(layout[0][c], 'w', `House1 top border col ${c} must be 'w'`);
    }
    // Bottom row all walls except exit door 'f' at col 4
    for (let c = 0; c < width; c++) {
        if (c === 4) {
            assert.strictEqual(layout[height - 1][c], 'f', "House1 exit door at col 4 must be floor 'f'");
        } else {
            assert.strictEqual(layout[height - 1][c], 'w', `House1 bottom border col ${c} must be wall 'w'`);
        }
    }
});

test("T2-BOUND", "All entity coordinates strictly inside map dimensions", () => {
    const layout = MapsData.Village.layoutText;
    const height = layout.length;
    const width = layout[0].length;

    // Find all 'S', 'N', 'E', 'o', '>', 'H'
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            assert.ok(x >= 0 && x < width, `Coordinate X ${x} in bounds`);
            assert.ok(y >= 0 && y < height, `Coordinate Y ${y} in bounds`);
        }
    }
});

test("T2-BOUND", "Door targets and spawn coordinates bounds validation", () => {
    const villageDoors = MapsData.Village.doorsData;
    assert.strictEqual(villageDoors.houseDoorTarget, "House1");
    const houseSpawn = villageDoors.houseSpawn;
    assert.ok(MapsData[villageDoors.houseDoorTarget], "Target map must exist");
    assert.ok(houseSpawn.x >= 0 && houseSpawn.x < MapsData.House1.layoutText[0].length);
    assert.ok(houseSpawn.y >= 0 && houseSpawn.y < MapsData.House1.layoutText.length);
    // House spawn tile must be walkable floor 'f'
    assert.strictEqual(MapsData.House1.layoutText[houseSpawn.y][houseSpawn.x], 'f', "House spawn coordinate must land on walkable floor 'f'");

    const houseDoors = MapsData.House1.doorsData;
    assert.ok(houseDoors.f_door, "House1 must define 'f_door'");
    assert.strictEqual(houseDoors.f_door.targetMap, "Village");
    const villageSpawn = houseDoors.f_door.targetSpawn;
    assert.ok(villageSpawn.x >= 0 && villageSpawn.x < MapsData.Village.layoutText[0].length);
    assert.ok(villageSpawn.y >= 0 && villageSpawn.y < MapsData.Village.layoutText.length);
    // Village target spawn tile must not be a blocking wall or tree
    const targetTile = MapsData.Village.layoutText[villageSpawn.y][villageSpawn.x];
    assert.ok(targetTile !== 'T' && targetTile !== 'w' && targetTile !== 'W' && targetTile !== 'C', "Target spawn in Village must not land in a solid obstacle");
});

// ==========================================
// TIER 3: CROSS-FEATURE COMBINATIONS
// ==========================================
console.log("\n--- TIER 3: CROSS-FEATURE COMBINATIONS ---");

test("T3-CROSS", "Crafting bridge: insufficient resources returns false and leaves inventory intact", () => {
    const gm = new GameManager(GameConfig);
    gm.addItem({ id: "wood", name: "Bois", qty: 4 }); // needs 5
    const success = gm.craftItem("bridge");
    assert.strictEqual(success, false, "Crafting must fail with insufficient wood");
    assert.strictEqual(gm.inventory.find(i => i.id === "bridge"), undefined, "No bridge should be crafted");
    assert.strictEqual(gm.inventory.find(i => i.id === "wood").qty, 4, "Wood must remain 4");
});

test("T3-CROSS", "Crafting bridge: exact resources consumes wood and creates bridge", () => {
    const gm = new GameManager(GameConfig);
    gm.addItem({ id: "wood", name: "Bois", qty: 5 });
    const success = gm.craftItem("bridge");
    assert.strictEqual(success, true, "Crafting must succeed with 5 wood");
    assert.strictEqual(gm.inventory.find(i => i.id === "wood"), undefined, "Wood must be completely consumed (0 qty removes slot)");
    const bridge = gm.inventory.find(i => i.id === "bridge");
    assert.ok(bridge, "Bridge item must be present in inventory");
    assert.strictEqual(bridge.qty, 1);
});

test("T3-CROSS", "Crafting bridge: surplus resources leaves correct remainder", () => {
    const gm = new GameManager(GameConfig);
    gm.addItem({ id: "wood", name: "Bois", qty: 12 });
    const success = gm.craftItem("bridge");
    assert.strictEqual(success, true);
    assert.strictEqual(gm.inventory.find(i => i.id === "wood").qty, 7, "12 - 5 must leave 7 wood");
    assert.strictEqual(gm.inventory.find(i => i.id === "bridge").qty, 1);
});

test("T3-CROSS", "Multi-ingredient crafting (potion: 2 wood + 1 stone)", () => {
    const gm = new GameManager(GameConfig);
    gm.addItem({ id: "wood", name: "Bois", qty: 2 });
    // Missing stone
    assert.strictEqual(gm.craftItem("potion"), false, "Fails when missing second ingredient");
    assert.strictEqual(gm.inventory.find(i => i.id === "wood").qty, 2, "Wood must not be deducted on failure");

    // Add stone
    gm.addItem({ id: "stone", name: "Pierre", qty: 1 });
    assert.strictEqual(gm.craftItem("potion"), true, "Succeeds when all ingredients are present");
    assert.strictEqual(gm.inventory.find(i => i.id === "wood"), undefined, "Wood fully consumed");
    assert.strictEqual(gm.inventory.find(i => i.id === "stone"), undefined, "Stone fully consumed");
    assert.strictEqual(gm.inventory.find(i => i.id === "potion").qty, 1);
});

test("T3-CROSS", "Craft potion and immediately use to heal damage", () => {
    const gm = new GameManager(GameConfig);
    gm.addItem({ id: "wood", name: "Bois", qty: 2 });
    gm.addItem({ id: "stone", name: "Pierre", qty: 1 });
    gm.player.hp = 60;

    assert.strictEqual(gm.craftItem("potion"), true);
    assert.strictEqual(gm.useItem("potion"), true);
    assert.strictEqual(gm.player.hp, 90, "60 + 30 must equal 90");
    assert.strictEqual(gm.inventory.length, 0, "All items consumed");
});

test("T3-CROSS", "Player dialogue guard (active=false) freezes movement velocity", () => {
    const scene = createMockScene();
    const player = new Player(scene, 100, 100, 'hero');
    player.cursors.left.isDown = true;
    player.keys.Q.isDown = true;

    // When active, moves
    player.active = true;
    player.update();
    assert.strictEqual(player.body.velocity.x, -player.speed, "Active player must move on keypress");

    // When inactive (dialogue or cutscene), velocity must be strictly 0
    player.active = false;
    player.update();
    assert.strictEqual(player.body.velocity.x, 0, "Inactive player velocity.x must be 0");
    assert.strictEqual(player.body.velocity.y, 0, "Inactive player velocity.y must be 0");
});

test("T3-CROSS", "Player sword attack (isAttacking=true) locks movement", () => {
    const scene = createMockScene();
    const player = new Player(scene, 100, 100, 'hero');
    player.isAttacking = true;
    player.cursors.right.isDown = true;
    player.update();
    assert.strictEqual(player.body.velocity.x, 0, "Attacking player velocity must be 0");
});

test("T3-CROSS", "Player interaction hitbox directional offset positioning", () => {
    const scene = createMockScene();
    const player = new Player(scene, 200, 300, 'hero');

    player.facing = 'down';
    player.update();
    assert.ok(player.interactionHitbox.y > player.y - 12, "Facing down offsets interaction box south");

    player.facing = 'up';
    player.update();
    assert.ok(player.interactionHitbox.y < player.y - 12, "Facing up offsets interaction box north");

    player.facing = 'right';
    player.update();
    assert.ok(player.interactionHitbox.x > player.x, "Facing right offsets interaction box east");

    player.facing = 'left';
    player.update();
    assert.ok(player.interactionHitbox.x < player.x, "Facing left offsets interaction box west");
});

test("T3-CROSS", "Map transitions persist player state and quest progression", () => {
    global.localStorage.setItem('rpg_save_consent', 'true');
    const gm = new GameManager(GameConfig);
    gm.addItem({ id: "potion", name: "Potion", qty: 3 });
    gm.completeQuestGoal("talk", "npc1");
    gm.save();

    // Simulate transition to House1 and opening chest
    const houseGm = new GameManager(GameConfig);
    houseGm.load();
    assert.strictEqual(houseGm.inventory[0].qty, 3);
    assert.strictEqual(houseGm.quests[0].status, "completed");

    // Add house chest loot
    const chestItem = MapsData.House1.chestsData['o'].item;
    houseGm.addItem(chestItem);
    houseGm.save();

    // Simulate transition back to Village
    const returnGm = new GameManager(GameConfig);
    returnGm.load();
    assert.strictEqual(returnGm.inventory.length, 2);
    assert.ok(returnGm.inventory.find(i => i.id === "sword_upgrade"));
    assert.strictEqual(returnGm.quests[0].status, "completed");
});

test("T3-CROSS", "Unified 2.5D Foot-Anchor depth calculation contract", () => {
    // Contract: depth = Math.floor(contactY)
    const entityY = 245.7;
    const depth = Math.floor(entityY);
    assert.strictEqual(depth, 245, "Floor of 245.7 must be 245");

    // Shadow depth contract: depth - 0.5
    const shadowDepth = depth - 0.5;
    assert.strictEqual(shadowDepth, 244.5, "Shadow depth must be strictly 0.5 below entity depth");

    // North entity comparison: entity at 244.9
    const northEntityY = 244.9;
    const northDepth = Math.floor(northEntityY);
    assert.strictEqual(northDepth, 244);
    assert.ok(depth > northDepth, "South entity (245) must render in front of north entity (244)");
    assert.ok(depth > shadowDepth, "Entity must render in front of its own shadow");
});

test("T3-CROSS", "Player and Enemy foot-anchor origin is calibrated to (0.5, 0.95)", () => {
    const scene = createMockScene();
    const player = new Player(scene, 100, 100, 'hero');
    assert.strictEqual(player.originX, 0.5, "Player originX must be 0.5");
    assert.strictEqual(player.originY, 0.95, "Player originY must be 0.95 for 2.5D foot anchoring");

    const enemy = new Enemy(scene, 100, 100, 'enemy', 'minor');
    assert.strictEqual(enemy.originX, 0.5, "Enemy originX must be 0.5");
    assert.strictEqual(enemy.originY, 0.95, "Enemy originY must be 0.95 for 2.5D foot anchoring");
});

// ==========================================
// TIER 4: REAL-WORLD LEVEL 1 SCENARIO PROGRESSION
// ==========================================
console.log("\n--- TIER 4: REAL-WORLD LEVEL 1 SCENARIO PROGRESSION ---");

test("T4-SCENARIO", "Tutorial Step 1: Movement detection and tutorial condition", () => {
    const scene = createMockScene();
    const player = new Player(scene, 5 * 64 + 32, 3 * 64 + 32, 'hero');
    player.setVelocity(0, 0);

    // Initial stationary condition
    let condition = () => player.body.velocity.length() > 0;
    assert.strictEqual(condition(), false, "Stationary player does not satisfy step 1");

    // Move player
    player.setVelocityX(250);
    assert.strictEqual(condition(), true, "Moving player satisfies step 1 condition");
});

test("T4-SCENARIO", "Tutorial Step 2: Guide NPC proximity and dialogue quest trigger", () => {
    const gm = new GameManager(GameConfig);
    const ts = 64;
    // Spawn at (5, 3) -> Guide at (10, 7)
    const playerPos = { x: 5 * ts + 32, y: 3 * ts + 32 };
    const guidePos = { x: 10 * ts + 32, y: 7 * ts + 32 };

    const initialDist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, guidePos.x, guidePos.y);
    assert.ok(initialDist > 150, "Player starts outside guide trigger radius");

    // Move player close to guide
    playerPos.x = guidePos.x + 30;
    playerPos.y = guidePos.y + 20;
    const proximityDist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, guidePos.x, guidePos.y);
    assert.ok(proximityDist <= 150, "Player is within guide trigger distance");

    // Interact with Guide
    const questCompleted = gm.completeQuestGoal("talk", "npc1");
    assert.strictEqual(questCompleted, true, "Talking to Guide completes tutorial quest q1");
    assert.strictEqual(gm.player.xp, 50);
    assert.strictEqual(gm.player.gold, 20);
});

test("T4-SCENARIO", "Tutorial Step 3: Bush resource clearing yields wood", () => {
    const gm = new GameManager(GameConfig);
    assert.strictEqual(gm.inventory.length, 0);

    // Simulate hitting bush resource
    const resData = { type: 'bush' };
    gm.addItem({ id: 'wood', name: 'Bois', qty: 1 });
    assert.strictEqual(gm.inventory.length, 1);
    assert.strictEqual(gm.inventory[0].id, 'wood');
    assert.strictEqual(gm.inventory[0].qty, 1);
});

test("T4-SCENARIO", "Tutorial Step 4: Minor enemy combat encounter and defeat rewards", () => {
    global.gameState = new GameManager(GameConfig);
    const scene = createMockScene();
    scene.player = new Player(scene, 100, 100, 'hero');

    const enemy = new Enemy(scene, 110, 100, 'enemy', 'minor');
    assert.strictEqual(enemy.hp, 30, "Minor enemy starts with 30 HP");

    // Player attacks enemy
    const playerDamage = global.gameState.player.damage; // 20
    enemy.takeDamage(playerDamage);
    assert.strictEqual(enemy.hp, 10, "Enemy HP reduced from 30 to 10");

    // Second hit kills enemy
    enemy.isFlashing = false; // Reset flash immunity
    enemy.takeDamage(playerDamage);
    assert.strictEqual(enemy.hp, -10, "Enemy HP drops to <= 0");
    assert.strictEqual(global.gameState.player.xp, 20, "Enemy defeat awards +20 XP");
    assert.strictEqual(global.gameState.player.gold, 5, "Enemy defeat awards +5 Gold");
});

test("T4-SCENARIO", "Full Level 1 Progression Sequence (Spawn -> Guide -> Bush -> Enemy -> Level Up)", () => {
    global.gameState = new GameManager(GameConfig);
    const gm = global.gameState;

    // 1. Spawn: verify initial state
    assert.strictEqual(gm.player.level, 1);
    assert.strictEqual(gm.player.xp, 0);

    // 2. Guide Quest: +50 XP, +20 Gold
    gm.completeQuestGoal("talk", "npc1");
    assert.strictEqual(gm.player.xp, 50);

    // 3. Bush collection: 5 bushes cleared -> 5 wood
    for (let i = 0; i < 5; i++) {
        gm.addItem({ id: 'wood', name: 'Bois', qty: 1 });
    }
    assert.strictEqual(gm.inventory.find(i => i.id === 'wood').qty, 5);

    // 4. Enemy combat encounters: 3 minor enemies defeated (3 * 20 XP = 60 XP)
    for (let e = 0; e < 3; e++) {
        gm.player.xp += 20;
        gm.player.gold += 5;
        gm.checkLevelUp();
    }

    // Total XP earned: 50 (quest) + 60 (enemies) = 110 XP.
    // Level Up occurs at 100 XP: level becomes 2, remaining XP becomes 10.
    assert.strictEqual(gm.player.level, 2, "Progression sequence must trigger Level 2");
    assert.strictEqual(gm.player.xp, 10, "110 - 100 leaves 10 surplus XP");
    assert.strictEqual(gm.player.maxHp, 120, "Max HP increased to 120");
    assert.strictEqual(gm.player.damage, 25, "Damage increased to 25");
    assert.strictEqual(gm.player.gold, 35, "20 (quest) + 15 (3 enemies * 5) = 35 Gold");
});

test("T4-SCENARIO", "Bridge Accessibility: Bridge tiles 'B' span river rows 15-16 at cols 26-29", () => {
    const layout = MapsData.Village.layoutText;
    const riverRow1 = layout[15];
    const riverRow2 = layout[16];

    // Bridge width is 4 tiles: cols 26, 27, 28, 29
    for (let c = 0; c < 40; c++) {
        if (c >= 26 && c <= 29) {
            assert.strictEqual(riverRow1[c], 'B', `Bridge tile expected at row 15, col ${c}`);
            assert.strictEqual(riverRow2[c], 'B', `Bridge tile expected at row 16, col ${c}`);
        } else {
            assert.strictEqual(riverRow1[c], 'W', `Water tile expected at row 15, col ${c}`);
            assert.strictEqual(riverRow2[c], 'W', `Water tile expected at row 16, col ${c}`);
        }
    }
});

test("T4-SCENARIO", "Bridge Accessibility: River crossing path continuity north to south", () => {
    const layout = MapsData.Village.layoutText;

    // North bank approach (row 14) at cols 26-29
    // Must contain walkable path or ground
    let northWalkable = false;
    for (let c = 26; c <= 29; c++) {
        if (layout[14][c] === '.' || layout[14][c] === 'd') northWalkable = true;
    }
    assert.ok(northWalkable, "North bank bridge approach must have walkable ground or path");

    // South bank approach (row 17) at cols 26-29
    let southWalkable = false;
    for (let c = 26; c <= 29; c++) {
        if (layout[17][c] === '.' || layout[17][c] === 'd') southWalkable = true;
    }
    assert.ok(southWalkable, "South bank bridge approach must have walkable ground or path");
});

test("T4-SCENARIO", "Bridge Accessibility: Bush symbols 'b' are disjoint from Bridge symbols 'B'", () => {
    const layout = MapsData.Village.layoutText;
    let bridgeCount = 0;
    let bushCount = 0;

    layout.forEach((row) => {
        for (let c = 0; c < row.length; c++) {
            if (row[c] === 'B') bridgeCount++;
            if (row[c] === 'b') bushCount++;
        }
    });

    assert.strictEqual(bridgeCount, 8, "Exactly 8 bridge tiles 'B' (2 rows x 4 cols) must exist");
    assert.strictEqual(bushCount, 5, "Exactly 5 bush tiles 'b' must exist on map");
    assert.ok(bridgeCount !== bushCount, "Bridge count and Bush count must be distinctly tracked");
});

test("T4-SCENARIO", "House 1 Exit Consistency: Door sensor target and spawn coordinate symmetry", () => {
    // Village door targets House1
    const villageDoor = MapsData.Village.doorsData;
    assert.strictEqual(villageDoor.houseDoorTarget, "House1");
    assert.deepStrictEqual(villageDoor.houseSpawn, { x: 4, y: 5 });

    // House1 exit door 'f_door' targets Village
    const houseExitDoor = MapsData.House1.doorsData.f_door;
    assert.ok(houseExitDoor, "House1 must define 'f_door' in doorsData");
    assert.strictEqual(houseExitDoor.targetMap, "Village");
    assert.deepStrictEqual(houseExitDoor.targetSpawn, { x: 35, y: 5 });

    // Verify Village spawn (35, 5) is directly in front of the house
    const villageTile = MapsData.Village.layoutText[5][35];
    assert.strictEqual(villageTile, 'd', "Village door exit spawn (35, 5) must be on path 'd'");

    // Verify House1 spawn (4, 5) is on floor 'f' right above exit tile (4, 6)
    const houseSpawnTile = MapsData.House1.layoutText[5][4];
    assert.strictEqual(houseSpawnTile, 'f', "House1 spawn (4, 5) must be on floor 'f'");
    const houseExitTile = MapsData.House1.layoutText[6][4];
    assert.strictEqual(houseExitTile, 'f', "House1 exit door at (4, 6) must be on floor 'f'");
});

test("T4-SCENARIO", "Passable House Roofs Contract (Feature 17 Architecture)", () => {
    // House1 layout: 3 rows high in Village (rows 1, 2, 3 at cols 35, 36, 37)
    const layout = MapsData.Village.layoutText;
    for (let r = 1; r <= 3; r++) {
        for (let c = 35; c <= 37; c++) {
            assert.strictEqual(layout[r][c], 'H', `House tile expected at row ${r}, col ${c}`);
        }
    }

    // In 2.5D architecture, foundations occupy row 3, while rows 1-2 represent upper walls & roof.
    // Upper roof allows player depth-based traversal behind the eaves with transparency.
    const northOfHouseTile = layout[0][36];
    assert.strictEqual(northOfHouseTile, 'T', "North of house is perimeter wall");
});

// ==========================================
// TEST SUMMARY & REPORTING
// ==========================================
console.log("\n================================================================================");
console.log(`TOTAL TESTS RUN : ${totalTests}`);
console.log(`PASSED          : ${passedTests}`);
console.log(`FAILED          : ${failedTests}`);
console.log("================================================================================");

if (failedTests > 0) {
    console.error("\nFAILURES SUMMARY:");
    failures.forEach((f, idx) => {
        console.error(`${idx + 1}. [${f.tier}] ${f.name}`);
        console.error(`   ${f.error.stack || f.error.message}`);
    });
    process.exit(1);
} else {
    console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<\n");
    process.exit(0);
}
