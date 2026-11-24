/**
 * test_iteration1_suite.js
 * Tests unitaires et d'intégration pour l'Itération 1 (Vertical Slice + InputManager multi-périphérique).
 * Couvre :
 * - InputManager : clavier (AZERTY/QWERTY/Flèches), souris, manette, deadzone, analogique, visée + aim assist,
 *   hot-plug, bascule instantanée clavier <-> manette <-> souris, prompts dynamiques, rebinding, haptique, RGPD
 * - MapDiscoverySystem : découverte de landmarks, zones de danger (Paisible -> Sauvage), brouillard, repères, persistance
 * - TerrainRenderer : tileset 64px vs fallback Graphics, transition pont 2.5D
 * - Ressource Herbe Médicinale, recette Hachette de Récolte, bonus d'équipement (+2 récolte)
 * - Ennemi avec attaque télégraphiée & invincibilité courte du joueur
 * - Tutoriel naturel dynamique du Village, écran CARTE (M) et navigation manette dans HUDScene & UIScene
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const { setupHeadlessEnvironment } = require('./helpers/HeadlessPhaser.js');

const env = setupHeadlessEnvironment(rootDir);

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function createMockPad(id = 'Xbox Wireless Controller', index = 0) {
    const buttons = [];
    for (let i = 0; i < 16; i++) buttons.push({ pressed: false, value: 0 });
    return {
        id,
        index,
        connected: true,
        axes: [0, 0, 0, 0],
        buttons,
        vibrationCalls: [],
        vibrationActuator: {
            playEffect(type, params) {
                this._calls = this._calls || [];
                this._calls.push({ type, params });
            }
        }
    };
}

function test(group, name, fn) {
    totalTests++;
    try {
        global.localStorage.clear();
        window.gameState = new env.GameManager(env.GameConfig);
        window.inputManager = new env.InputManager();
        fn();
        console.log(`  [PASS] [${group}] ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`  [FAIL] [${group}] ${name}`);
        console.error(`         Error: ${err.message}`);
        failures.push({ group, name, error: err });
        failedTests++;
    }
}

console.log("================================================================================");
console.log("      TOYA ADVENTURE'S - ITERATION 1 & MULTI-INPUT TEST SUITE");
console.log("================================================================================\n");

// ==========================================
// 1. INPUT MANAGER (CLAVIER / SOURIS / MANETTE)
// ==========================================
console.log("--- 1. INPUT MANAGER (CLAVIER / SOURIS / MANETTE) ---");

test("INPUT", "Keyboard AZERTY & QWERTY movement with diagonal normalization", () => {
    const harness = env.createSceneHarness();
    const im = new env.InputManager();
    im.attachScene(harness.worldScene);

    // AZERTY Z + D diagonal
    harness.worldScene.input.keyboard.press('Z');
    harness.worldScene.input.keyboard.press('D');
    const vec = im.getMovementVector();
    assert.strictEqual(im.inputMode, 'keyboardMouse');
    assert.ok(Math.abs(Math.hypot(vec.x, vec.y) - 1) < 0.001, "Diagonal vector must be normalized to length 1");
    assert.ok(vec.x > 0 && vec.y < 0, "Z+D moves North-East");
    harness.worldScene.input.keyboard.release('Z');
    harness.worldScene.input.keyboard.release('D');

    // QWERTY W + A
    harness.worldScene.input.keyboard.press('W');
    harness.worldScene.input.keyboard.press('A');
    const vecQwerty = im.getMovementVector();
    assert.ok(vecQwerty.x < 0 && vecQwerty.y < 0, "W+A moves North-West on QWERTY");
});

test("INPUT", "Mouse aim orientation & Left Click ATTACK trigger", () => {
    const harness = env.createSceneHarness();
    const im = new env.InputManager();
    im.attachScene(harness.worldScene);

    harness.worldScene.input.emit('pointermove', { x: 400, y: 200, worldX: 400, worldY: 200 });
    const aim = im.getAimDirection(200, 200, 'down');
    assert.strictEqual(aim.source, 'mouse');
    assert.strictEqual(aim.facing, 'right');
    assert.ok(aim.x > 0.99);

    harness.worldScene.input.emit('pointerdown', { x: 400, y: 200, worldX: 400, worldY: 200, button: 0 });
    assert.strictEqual(im.justDown('ATTACK'), true, "Left click triggers ATTACK");
    assert.strictEqual(im.justDown('ATTACK'), false, "Left click justDown is consumed once");
});

test("INPUT", "Gamepad dead zone filtering & analog magnitude scaling", () => {
    const im = new env.InputManager();
    const pad = createMockPad('Xbox Controller');
    im.handleGamepadConnected(pad);

    // Below deadzone (0.18) -> strictly zero
    pad.axes[0] = 0.10;
    pad.axes[1] = -0.10;
    im.update();
    const still = im.getMovementVector();
    assert.strictEqual(still.magnitude, 0, "Stick drift below deadzone must yield 0");

    // Partial tilt -> slow walk (< 1.0 magnitude)
    pad.axes[0] = 0.5;
    pad.axes[1] = 0;
    im.update();
    const slow = im.getMovementVector();
    assert.strictEqual(slow.isAnalog, true);
    assert.ok(slow.magnitude > 0.3 && slow.magnitude < 0.6, `Partial tilt magnitude expected ~0.39, got ${slow.magnitude}`);

    // Full diagonal tilt -> clamped to magnitude 1.0 (never faster diagonally)
    pad.axes[0] = 1.0;
    pad.axes[1] = 1.0;
    im.update();
    const diag = im.getMovementVector();
    assert.ok(Math.hypot(diag.x, diag.y) <= 1.001, "Diagonal analog movement must never exceed 1.0");
});

test("INPUT", "Seamless switching Keyboard -> Gamepad -> Mouse & dynamic prompts", () => {
    const harness = env.createSceneHarness();
    const im = new env.InputManager();
    im.attachScene(harness.worldScene);

    // Start in keyboardMouse
    assert.strictEqual(im.inputMode, 'keyboardMouse');
    assert.strictEqual(im.getPrompt('INTERACT', 'Parler'), '[E] Parler');

    // Switch to Xbox Gamepad
    const pad = createMockPad('Xbox One Controller');
    im.handleGamepadConnected(pad);
    assert.strictEqual(im.inputMode, 'gamepad');
    assert.strictEqual(im.getPrompt('INTERACT', 'Parler'), '[A] Parler');
    assert.strictEqual(im.getPrompt('ATTACK', 'Attaquer'), '[X] Attaquer');

    // Switch back via mouse move
    harness.worldScene.input.emit('pointermove', { x: 100, y: 100, worldX: 100, worldY: 100 });
    assert.strictEqual(im.inputMode, 'keyboardMouse');
    assert.strictEqual(im.getPrompt('INTERACT', 'Parler'), '[E] Parler');

    // Switch back via PlayStation gamepad button press
    const psPad = createMockPad('DualSense Wireless Controller', 1);
    im.handleGamepadConnected(psPad);
    assert.strictEqual(im.gamepadFamily, 'playstation');
    assert.strictEqual(im.getPrompt('INTERACT', 'Parler'), '[Croix] Parler');
    assert.strictEqual(im.getPrompt('ATTACK', 'Attaquer'), '[Carré] Attaquer');
});

test("INPUT", "Gamepad hot-plug disconnect & reconnect resilience", () => {
    const im = new env.InputManager();
    const pad = createMockPad('Generic USB Gamepad', 0);
    im.handleGamepadConnected(pad);
    assert.strictEqual(im.inputMode, 'gamepad');
    assert.strictEqual(im.activePad, pad);

    // Disconnect falls back cleanly to keyboardMouse
    im.handleGamepadDisconnected(pad);
    assert.strictEqual(im.activePad, null);
    assert.strictEqual(im.inputMode, 'keyboardMouse');

    // Reconnect restores gamepad immediately
    im.handleGamepadConnected(pad);
    assert.strictEqual(im.inputMode, 'gamepad');
    assert.strictEqual(im.activePad, pad);
});

test("INPUT", "Right-stick aim with configurable subtle aim assist", () => {
    const im = new env.InputManager();
    const pad = createMockPad('Xbox Controller');
    im.handleGamepadConnected(pad);
    // Aim nearly east (angle ~0), enemy slightly south-east (~11 deg away)
    pad.axes[2] = 1.0;
    pad.axes[3] = 0.0;
    const enemy = { x: 200, y: 120, active: true, isDead: false };

    im.updatePreferences({ aimAssist: true, aimAssistAngleDeg: 20 }, false);
    const assisted = im.getAimDirection(100, 100, 'right', [enemy]);
    assert.strictEqual(assisted.source, 'rightStick');
    assert.ok(assisted.y > 0.05, "Subtle aim assist gently nudges toward nearby target");

    im.updatePreferences({ aimAssist: false }, false);
    const rawAim = im.getAimDirection(100, 100, 'right', [enemy]);
    assert.ok(Math.abs(rawAim.y) < 0.001, "Disabling aim assist keeps raw stick direction");
});

test("INPUT", "Haptic vibration toggle & RGPD-gated preference persistence", () => {
    const im = new env.InputManager();
    const pad = createMockPad('Xbox Controller');
    im.handleGamepadConnected(pad);

    assert.strictEqual(im.vibrate('light'), true, "Vibration fires when enabled");
    im.updatePreferences({ vibrationEnabled: false }, false);
    assert.strictEqual(im.vibrate('light'), false, "Vibration suppressed when disabled");

    // Without RGPD consent -> preferences not written to localStorage
    im.rebindAction('INTERACT', ['F']);
    assert.strictEqual(global.localStorage.getItem('toya_input_prefs_v1'), null, "RGPD blocks saving without consent");

    // With RGPD consent -> preferences saved and reloaded
    global.localStorage.setItem('rpg_save_consent', 'true');
    im.rebindAction('INTERACT', ['F']);
    assert.ok(global.localStorage.getItem('toya_input_prefs_v1'), "Preferences persisted with consent");

    const im2 = new env.InputManager();
    assert.strictEqual(im2.getActionLabel('INTERACT'), 'F', "Custom binding reloaded cleanly");
});

// ==========================================
// 2. MAP DISCOVERY & DANGER ZONES
// ==========================================
console.log("\n--- 2. MAP DISCOVERY & DANGER ZONES ---");

test("DISCOVERY", "Landmark discovery, fog-of-war & Peaceful -> Wild bridge transition", () => {
    const discovery = new env.MapDiscoverySystem();
    const village = env.MapsData.Village;
    const ts = village.tileSize;

    // Near Guide (tile 10, 7) -> Peaceful zone & village_square landmark discovered
    const r1 = discovery.updatePlayerPosition('Village', village, 10 * ts + 32, 7 * ts + 32);
    assert.ok(r1.newlyDiscovered.some(l => l.id === 'village_square'), "Discovers Clairière du Guide");
    assert.strictEqual(discovery.currentZone.dangerLevel, 'peaceful');
    assert.strictEqual(discovery.isTileVisited('Village', 10, 7), true, "Current tile marked visited");
    assert.strictEqual(discovery.isTileVisited('Village', 35, 22), false, "Distant tile remains unvisited");

    // Cross bridge into south wild area (tile 27, 18) -> Wild zone transition!
    const r2 = discovery.updatePlayerPosition('Village', village, 27 * ts + 32, 18 * ts + 32);
    assert.ok(r2.zoneChanged, "Crossing south of bridge emits zoneChanged");
    assert.strictEqual(r2.zoneChanged.dangerLevel, 'wild');
    assert.strictEqual(r2.zoneChanged.dangerLabel, 'Zone Sauvage');

    // Re-visiting same landmark does not re-trigger discovery
    const r3 = discovery.updatePlayerPosition('Village', village, 10 * ts + 32, 7 * ts + 32);
    assert.strictEqual(r3.newlyDiscovered.length, 0, "Already discovered landmark not re-emitted");
});

test("DISCOVERY", "Personal markers toggle & serialization roundtrip", () => {
    const discovery = new env.MapDiscoverySystem();
    discovery.discoverLandmark('Village', { id: 'wild_cache', name: 'Cachette de la Prairie', tileX: 4, tileY: 21 });
    const marker = discovery.setPersonalMarker('Village', 12, 14, 'Herbes');
    assert.ok(marker && marker.tileX === 12);
    assert.strictEqual(discovery.getPersonalMarkers('Village').length, 1);

    const serialized = discovery.serialize();
    const restored = new env.MapDiscoverySystem(serialized);
    assert.strictEqual(restored.isLandmarkDiscovered('Village', 'wild_cache'), true);
    assert.strictEqual(restored.getPersonalMarkers('Village').length, 1);

    // Clicking same cell toggles marker off
    restored.setPersonalMarker('Village', 12, 14);
    assert.strictEqual(restored.getPersonalMarkers('Village').length, 0);
});

// ==========================================
// 3. TERRAIN RENDERER & ASSETS
// ==========================================
console.log("\n--- 3. TERRAIN RENDERER & NEW PLACEHOLDER ASSETS ---");

test("TERRAIN", "TerrainRenderer uses 64px tileset when loaded and falls back to Graphics otherwise", () => {
    const harness = env.createSceneHarness();
    const renderer = new env.TerrainRenderer(harness.worldScene);

    // Without texture -> fallback Graphics
    const resFallback = renderer.renderMap(
        env.MapsData.Village,
        'Village',
        () => {},
        () => {},
        harness.worldScene.add.group()
    );
    assert.strictEqual(resFallback.usedTileset, false, "Falls back to Graphics when tileset is absent");

    // With tileset texture registered -> uses tileset
    harness.worldScene.textures.add('tileset_meadow_dirt', 256, 64);
    const resTileset = renderer.renderMap(
        env.MapsData.Village,
        'Village',
        () => {},
        () => {},
        harness.worldScene.add.group()
    );
    assert.strictEqual(resTileset.usedTileset, true, "Uses 64px tileset when loaded");
});

test("TERRAIN", "TerrainRenderer Dual-Grid 15-piece bitmasks, 17-piece autotile & rendering", () => {
    const TR = env.TerrainRenderer;

    // 1. Verify 15-piece Dual-Grid 4-bit corner masks (TL=1, TR=2, BL=4, BR=8)
    const mini = [
        ['d', 'd'],
        ['.', 'd']
    ];
    const pred = (x, y) => mini[y][x] === 'd';
    assert.strictEqual(TR.computeDualGridMask(0, 0, 2, 2, pred), 8, "Top-left vertex sees only BR (8)");
    assert.strictEqual(TR.computeDualGridMask(1, 0, 2, 2, pred), 12, "Top-mid vertex sees BL+BR (12)");
    assert.strictEqual(TR.computeDualGridMask(1, 1, 2, 2, pred), 11, "Center vertex sees TL+TR+BR (11)");
    assert.strictEqual(TR.computeDualGridMask(0, 2, 2, 2, pred), 0, "Bottom-left empty corner is 0");
    assert.strictEqual(TR.resolveDualGridFrame(15), 15, "Full mask resolves to frame 15");

    // 2. Verify 17-piece autotile mapper (cardinals + full interior 16)
    const solid3x3 = [
        ['d', 'd', 'd'],
        ['d', 'd', 'd'],
        ['d', 'd', 'd']
    ];
    assert.strictEqual(TR.resolve17PieceFrame(1, 1, 3, 3, (x, y) => solid3x3[y][x] === 'd'), 16, "Fully surrounded cell resolves to piece 16");
    assert.strictEqual(TR.resolve17PieceFrame(0, 0, 3, 3, (x, y) => solid3x3[y][x] === 'd'), 6, "Top-left corner resolves to E+S (6)");

    // 3. Verify TerrainRenderer activates Dual-Grid passes when dual-grid textures are loaded
    const harness = env.createSceneHarness();
    const renderer = new TR(harness.worldScene);
    harness.worldScene.textures.add('tileset_meadow_dirt', 256, 64);
    harness.worldScene.textures.add('tileset_grass_dirt_dualgrid', 1024, 64);
    harness.worldScene.textures.add('tileset_water_bank_dualgrid', 1024, 64);

    const res = renderer.renderMap(
        env.MapsData.Village,
        'Village',
        () => {},
        () => {},
        harness.worldScene.add.group()
    );
    assert.strictEqual(res.usedTileset, true, "Uses tilesets");
    assert.strictEqual(res.usedDualGrid, true, "Activates dual-grid 15-piece passes");
    assert.ok(res.dualGridDirtCount > 20, `Places dual-grid dirt transition tiles (got ${res.dualGridDirtCount})`);
    assert.ok(res.dualGridWaterCount > 20, `Places dual-grid water bank tiles (got ${res.dualGridWaterCount})`);
});

test("ASSETS", "Final 64px dual-grid tilesets & pixel-art sprites exist with valid PNG headers and dimensions", () => {
    const { ASSET_KEYS, ASSET_MANIFEST } = require(path.join(rootDir, 'src/data/assets.js'));
    const newKeys = [
        ASSET_KEYS.TILESET_MEADOW_DIRT,
        ASSET_KEYS.TILESET_GRASS_DIRT_DUALGRID,
        ASSET_KEYS.TILESET_WATER_BANK_DUALGRID,
        ASSET_KEYS.ITEM_HERB,
        ASSET_KEYS.ITEM_HATCHET,
        ASSET_KEYS.PROP_HERB_PATCH
    ];
    for (const k of newKeys) {
        const entry = ASSET_MANIFEST[k];
        assert.ok(entry, `Manifest entry exists for ${k}`);
        const fullPath = path.join(rootDir, entry.path);
        assert.ok(fs.existsSync(fullPath), `Physical asset file exists: ${entry.path}`);
        const buf = fs.readFileSync(fullPath);
        assert.strictEqual(buf[0], 0x89, `Valid PNG header for ${entry.path}`);
        assert.strictEqual(buf[25], 6, `32-bit RGBA color type for ${entry.path}`);
    }
    const dgBuf = fs.readFileSync(path.join(rootDir, 'assets/tilesets/grass_dirt_dualgrid_64.png'));
    assert.strictEqual(dgBuf.readUInt32BE(16), 1024, "Dual-grid sheet width is 1024px (16x64)");
    assert.strictEqual(dgBuf.readUInt32BE(20), 64, "Dual-grid sheet height is 64px");
});

// ==========================================
// 4. RESOURCES, CRAFTING & EQUIPMENT BONUS
// ==========================================
console.log("\n--- 4. RESOURCES, CRAFTING & EQUIPMENT BONUS ---");

test("CRAFT", "Harvesting herb node & crafting Hachette de Récolte auto-equips and doubles wood/herb yield", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});

    // Verify herb resource nodes were spawned in WorldScene
    const resources = harness.worldScene.resourceGroup.getChildren();
    const herbNode = resources.find(r => r.resData && r.resData.yields === 'herb');
    assert.ok(herbNode, "Village spawns harvestable Herbe Médicinale nodes");

    // Harvest 1 herb without hatchet -> +1 herb
    harness.worldScene.hitResource(null, herbNode);
    assert.strictEqual(window.gameState.inventory.find(i => i.id === 'herb').qty, 1);

    // Craft Hachette de Récolte (2 wood, 1 stone, 1 herb)
    window.gameState.addItem({ id: 'wood', name: 'Bois', qty: 2 });
    window.gameState.addItem({ id: 'stone', name: 'Pierre', qty: 1 });
    assert.strictEqual(window.gameState.craftItem('hatchet'), true, "Hachette de Récolte crafted");
    assert.ok(window.gameState.equipment.tool && window.gameState.equipment.tool.id === 'hatchet', "Hatchet auto-equipped as tool");
    assert.strictEqual(window.gameState.getHarvestYield('wood'), 2, "Hatchet grants +2 wood harvest yield");
    assert.strictEqual(window.gameState.getHarvestYield('herb'), 2, "Hatchet grants +2 herb harvest yield");
    assert.strictEqual(window.gameState.getHarvestYield('stone'), 1, "Stone yield remains 1");

    // Harvest a bush with hatchet equipped -> +2 wood!
    const bushNode = resources.find(r => r.resData && r.resData.yields === 'wood' && !r.isDestroyed);
    harness.worldScene.hitResource(null, bushNode);
    assert.strictEqual(window.gameState.inventory.find(i => i.id === 'wood').qty, 2, "Equipped hatchet yields 2 wood in WorldScene");
});

// ==========================================
// 5. TELEGRAPHED COMBAT, TUTORIAL & MAP MENU
// ==========================================
console.log("\n--- 5. TELEGRAPHED COMBAT, TUTORIAL & MAP MENU ---");

test("COMBAT", "Minor enemy telegraphs charge before lunging & player gains invincibility frames", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});

    const enemy = new env.Enemy(harness.worldScene, 300, 300, 'monster_slime', 'minor');
    harness.worldScene.player.x = 380;
    harness.worldScene.player.y = 300;

    // Trigger AI wander -> enters telegraph phase first (velocity 0, warning tint & marker)
    enemy.randomWander();
    assert.strictEqual(enemy.isTelegraphing, true, "Enemy enters telegraphed anticipation phase");
    assert.strictEqual(enemy.body.velocity.x, 0, "Enemy pauses during telegraph windup");
    assert.ok(enemy.telegraphMarker, "Telegraph warning marker displayed");

    // Advance 450ms -> telegraph finishes and enemy lunges toward player
    harness.worldScene.time.tick(450);
    assert.strictEqual(enemy.isTelegraphing, false);
    assert.strictEqual(enemy.isLunging, true, "Enemy executes lunge after telegraph");
    assert.ok(enemy.body.velocity.x > 100, "Enemy lunges east toward player");

    // Contact deals damage once, then player i-frames block immediate repeat hit
    const hpBefore = window.gameState.player.hp;
    harness.worldScene.handleEnemyContact(harness.worldScene.player, enemy);
    assert.strictEqual(window.gameState.player.hp, hpBefore - 10, "Lunge deals 10 damage");
    assert.strictEqual(harness.worldScene.player.isInvulnerable, true, "Player enters brief i-frames");

    harness.worldScene.handleEnemyContact(harness.worldScene.player, enemy);
    assert.strictEqual(window.gameState.player.hp, hpBefore - 10, "I-frames prevent instant double-damage");
    enemy.destroy();
});

test("UI", "HUDScene CARTE (M) menu, natural dynamic tutorial prompts & UIScene gamepad navigation", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();

    // Dynamic tutorial prompts switch cleanly to gamepad labels
    const pad = createMockPad('Xbox Wireless Controller');
    window.inputManager.handleGamepadConnected(pad);
    harness.worldScene.updateTutorial();
    assert.ok(harness.worldScene.tutorialTexts[1].obj.text.includes('[A]'), "Tutorial interact prompt updates to [A] on gamepad");

    // Open CARTE with M key
    harness.hudScene.mKey.setDown(true);
    harness.hudScene.update();
    assert.strictEqual(harness.hudScene.isMenuActive, true);
    assert.strictEqual(harness.hudScene.menuTitle.text, 'CARTE');
    assert.strictEqual(harness.hudScene.mapOverlayGraphics.visible, true, "Discovery map overlay drawn");
    harness.hudScene.toggleMenu('CARTE');

    // Battle UIScene navigation via keyboard/gamepad
    harness.battleScene.create();
    harness.uiScene.create();
    assert.strictEqual(harness.uiScene.selectedIndex, 0);
    harness.uiScene.downKey.setDown(true);
    harness.uiScene.update();
    assert.strictEqual(harness.uiScene.selectedIndex, 1, "Down moves battle cursor to Magie");
});

// ==========================================
// SUMMARY
// ==========================================
console.log("\n================================================================================");
console.log(`TOTAL ITERATION 1 TESTS RUN : ${totalTests}`);
console.log(`PASSED                      : ${passedTests}`);
console.log(`FAILED                      : ${failedTests}`);
console.log("================================================================================");

if (failedTests > 0) {
    console.error("\nFAILURES SUMMARY:");
    failures.forEach((f, idx) => {
        console.error(`${idx + 1}. [${f.group}] ${f.name}`);
        console.error(`   ${f.error.stack || f.error.message}`);
    });
    process.exit(1);
} else {
    console.log(`\n>>> ALL ${totalTests} ITERATION 1 TESTS PASSED SUCCESSFULLY! <<<\n`);
    process.exit(0);
}
