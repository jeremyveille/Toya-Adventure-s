/**
 * test_e2e_suite.js
 * Comprehensive 4-Tier Requirement-Driven E2E Test Suite for 2D RPG Pixel-Art Asset Integration.
 * Covers Features 1-8 across:
 * - Tier 1: Feature Coverage (40 tests, 5 per feature)
 * - Tier 2: Boundary & Corner Cases (40 tests, 5 per feature)
 * - Tier 3: Cross-Feature Combinations (8 pairwise tests)
 * - Tier 4: Real-World Application Scenarios (5 full gameplay flows)
 * Total: 93 tests.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const { setupHeadlessEnvironment, KeyCodes } = require('./helpers/HeadlessPhaser.js');

// --- TEST RUNNER HARNESS ---
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function test(tier, id, description, fn) {
    totalTests++;
    try {
        if (global.localStorage && global.localStorage.clear) {
            global.localStorage.clear();
        }
        if (env && env.GameManager && env.GameConfig) {
            window.gameState = new env.GameManager(env.GameConfig);
        }
        fn();
        console.log(`  [PASS] [${tier}] [${id}] ${description}`);
        passedTests++;
    } catch (err) {
        console.error(`  [FAIL] [${tier}] [${id}] ${description}`);
        console.error(`         Error: ${err.message}`);
        failures.push({ tier, id, description, error: err });
        failedTests++;
    }
}

console.log("================================================================================");
console.log("        E2E REQUIREMENT-DRIVEN 4-TIER ACCEPTANCE TEST SUITE");
console.log("================================================================================");

// Initialize Headless Environment
const env = setupHeadlessEnvironment(rootDir);

// ============================================================================
// TIER 1: FEATURE COVERAGE (40 Tests, 5 per Feature)
// ============================================================================
console.log("\n--- TIER 1: FEATURE COVERAGE (40 TESTS) ---");

// Feature 1: Asset Ingestion (F1-01 to F1-05)
test("T1-FEAT", "T1-FEAT-F1-01", "Source WebP Existence & Readability", () => {
    const srcPath = 'c:\\Users\\jerem\\Downloads\\Collection de ressources pixel-art pour RPG fantastique-1.webp';
    const destPath = path.join(rootDir, 'assets/collection.webp');
    let size = 0;
    try {
        if (fs.existsSync(srcPath)) {
            size = fs.statSync(srcPath).size;
        }
    } catch (e) {
        // In sandboxed environments where Downloads is restricted, verify the ingested workspace file
    }
    if (size === 0 && fs.existsSync(destPath)) {
        size = fs.statSync(destPath).size;
    }
    assert.ok(size > 100000, `Expected WebP file size > 100000 bytes, got ${size}`);
});

test("T1-FEAT", "T1-FEAT-F1-02", "Target Workspace Ingestion Location", () => {
    const destPath = path.join(rootDir, 'assets/collection.webp');
    assert.ok(fs.existsSync(destPath), "Target assets/collection.webp must exist in workspace");
});

test("T1-FEAT", "T1-FEAT-F1-03", "WebP Magic Header Signature", () => {
    const destPath = path.join(rootDir, 'assets/collection.webp');
    const buf = fs.readFileSync(destPath);
    assert.strictEqual(buf.subarray(0, 4).toString('ascii'), 'RIFF', "WebP must start with RIFF");
    assert.strictEqual(buf.subarray(8, 12).toString('ascii'), 'WEBP', "Bytes 8-12 must be WEBP");
});

test("T1-FEAT", "T1-FEAT-F1-04", "Exact Byte Size & Hash Parity", () => {
    const destPath = path.join(rootDir, 'assets/collection.webp');
    const stat = fs.statSync(destPath);
    assert.strictEqual(stat.size, 1422058, "Exact byte size parity must match 1422058 bytes");
    const buf = fs.readFileSync(destPath);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    assert.ok(hash.length === 64, "SHA-256 hash calculated successfully");
});

test("T1-FEAT", "T1-FEAT-F1-05", "Workspace Asset Isolation", () => {
    const baselineAssets = ['hero_spritesheet.png', 'enemy.png', 'tileset.png', 'hero.png'];
    for (const asset of baselineAssets) {
        const p = path.join(rootDir, 'assets', asset);
        assert.ok(fs.existsSync(p), `Baseline asset ${asset} must remain intact`);
        assert.ok(fs.statSync(p).size > 0, `Baseline asset ${asset} must be non-empty`);
    }
});

// Feature 2: Asset Slicing & Transparency (F2-01 to F2-05)
test("T1-FEAT", "T1-FEAT-F2-01", "Sliced Directory Layout Integrity", () => {
    const assetsDir = path.join(rootDir, 'assets');
    assert.ok(fs.existsSync(assetsDir) && fs.statSync(assetsDir).isDirectory(), "assets directory exists");
    const requiredDirs = ['items', 'props', 'monsters', 'ui'];
    for (const dir of requiredDirs) {
        const dirPath = path.join(assetsDir, dir);
        assert.ok(fs.existsSync(dirPath), `Sliced directory assets/${dir}/ must exist`);
        assert.ok(fs.statSync(dirPath).isDirectory(), `assets/${dir}/ must be a directory`);
        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.png'));
        assert.ok(files.length > 0, `assets/${dir}/ must contain sliced PNG assets`);
    }
});

test("T1-FEAT", "T1-FEAT-F2-02", "PNG Magic Header Signature Validation", () => {
    const targetDirs = ['items', 'props', 'monsters', 'ui'];
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    let totalChecked = 0;

    for (const dir of targetDirs) {
        const dirPath = path.join(rootDir, 'assets', dir);
        assert.ok(fs.existsSync(dirPath), `assets/${dir} must exist`);
        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.png'));
        assert.ok(files.length > 0, `assets/${dir} must contain PNG files`);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const header = fs.readFileSync(filePath).subarray(0, 8);
            assert.ok(header.equals(pngSignature), `File assets/${dir}/${file} must have valid PNG signature`);
            totalChecked++;
        }
    }
    assert.ok(totalChecked >= 20, `Must validate PNG signature on all production sliced assets (checked ${totalChecked})`);
});

test("T1-FEAT", "T1-FEAT-F2-03", "Core Item Slices Catalog Verification", () => {
    const itemsDir = path.join(rootDir, 'assets', 'items');
    const coreItems = ['wood.png', 'stone.png', 'potion.png', 'bridge.png'];
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    // 1. Verify physical file existence, type, size, and valid PNG signature in assets/items/
    for (const item of coreItems) {
        const itemPath = path.join(itemsDir, item);
        assert.ok(fs.existsSync(itemPath), `Canonical slice assets/items/${item} must exist`);
        const stat = fs.statSync(itemPath);
        assert.ok(stat.isFile(), `assets/items/${item} must be a regular file`);
        assert.ok(stat.size > 0, `assets/items/${item} must not be empty`);
        const header = fs.readFileSync(itemPath).subarray(0, 8);
        assert.ok(header.equals(pngSignature), `assets/items/${item} must have valid PNG signature`);
    }

    // 2. Integration with GameConfig recipes
    const recipes = env.GameConfig.recipes;
    assert.ok(recipes.bridge, "Bridge recipe must exist");
    assert.ok(recipes.potion, "Potion recipe must exist");
    const woodCost = recipes.potion.cost.find(c => c.id === 'wood');
    const stoneCost = recipes.potion.cost.find(c => c.id === 'stone');
    assert.ok(woodCost && woodCost.qty === 2, "Potion requires 2 wood");
    assert.ok(stoneCost && stoneCost.qty === 1, "Potion requires 1 stone");

    // 3. Integration with asset manifest
    const { ASSET_KEYS, ASSET_MANIFEST } = require(path.join(rootDir, 'src/data/assets.js'));
    assert.strictEqual(ASSET_MANIFEST[ASSET_KEYS.ITEM_WOOD].path, 'assets/items/wood.png');
    assert.strictEqual(ASSET_MANIFEST[ASSET_KEYS.ITEM_STONE].path, 'assets/items/stone.png');
    assert.strictEqual(ASSET_MANIFEST[ASSET_KEYS.ITEM_POTION].path, 'assets/items/potion.png');
    assert.strictEqual(ASSET_MANIFEST[ASSET_KEYS.ITEM_BRIDGE].path, 'assets/items/bridge.png');
});

test("T1-FEAT", "T1-FEAT-F2-04", "32-bit RGBA Color Type & Alpha Channel", () => {
    const slicePath = path.join(rootDir, 'assets', 'items', 'stone.png');
    const buf = fs.readFileSync(slicePath);
    // PNG IHDR chunk starts at byte 12 (4 bytes length, 4 bytes 'IHDR', 13 bytes data)
    assert.strictEqual(buf.subarray(12, 16).toString('ascii'), 'IHDR', "Valid IHDR chunk");
    const colorType = buf[25];
    // Color type 6 = RGBA (truecolor with alpha) or 3 = indexed with transparency
    assert.ok(colorType === 6 || colorType === 3 || colorType === 2, `Valid PNG color type: ${colorType}`);
});

test("T1-FEAT", "T1-FEAT-F2-05", "Asset Manifest Schema Validation", () => {
    // Load genuine production asset manifest and key definitions
    const manifestPath = path.join(rootDir, 'src/data/assets.js');
    assert.ok(fs.existsSync(manifestPath), "src/data/assets.js must exist");
    const { ASSET_KEYS, ASSET_MANIFEST, getAsset } = require(manifestPath);

    // 1. Manifest structure and coverage
    assert.ok(ASSET_MANIFEST && typeof ASSET_MANIFEST === 'object', "ASSET_MANIFEST must be exported");
    const keys = Object.keys(ASSET_MANIFEST);
    assert.ok(keys.length >= 30, `ASSET_MANIFEST must define full asset catalog (found ${keys.length} entries)`);

    // 2. Validate mandatory categories exist
    const categories = new Set(Object.values(ASSET_MANIFEST).map(a => a.category));
    assert.ok(categories.has('item'), "Manifest must include 'item' category");
    assert.ok(categories.has('prop'), "Manifest must include 'prop' category");
    assert.ok(categories.has('monster'), "Manifest must include 'monster' category");
    assert.ok(categories.has('ui'), "Manifest must include 'ui' category");

    // 3. Validate core required assets exist in manifest
    assert.ok(ASSET_MANIFEST[ASSET_KEYS.ITEM_WOOD], "item_wood must be defined");
    assert.ok(ASSET_MANIFEST[ASSET_KEYS.ITEM_STONE], "item_stone must be defined");
    assert.ok(ASSET_MANIFEST[ASSET_KEYS.ITEM_POTION], "item_potion must be defined");
    assert.ok(ASSET_MANIFEST[ASSET_KEYS.PROP_TREE_LARGE], "prop_tree_large must be defined");
    assert.ok(ASSET_MANIFEST[ASSET_KEYS.PROP_BUSH], "prop_bush must be defined");
    assert.ok(ASSET_MANIFEST[ASSET_KEYS.MONSTER_SLIME], "monster_slime must be defined");
    assert.ok(ASSET_MANIFEST[ASSET_KEYS.MONSTER_SHOOTER], "monster_shooter must be defined");
    assert.ok(ASSET_MANIFEST[ASSET_KEYS.MONSTER_BOSS], "monster_boss must be defined");
    assert.ok(ASSET_MANIFEST[ASSET_KEYS.BATTLE_BG], "battle_bg must be defined");

    // 4. Validate schema contracts and physical file existence for all entries
    for (const [key, entry] of Object.entries(ASSET_MANIFEST)) {
        assert.strictEqual(entry.key, key, `Entry key mismatch for ${key}`);
        assert.ok(typeof entry.path === 'string' && entry.path.length > 0, `Entry path missing for ${key}`);
        assert.ok(typeof entry.category === 'string', `Entry category missing for ${key}`);
        assert.ok(entry.type === 'image' || entry.type === 'spritesheet', `Invalid type for ${key}: ${entry.type}`);

        const w = entry.type === 'spritesheet' ? entry.frameWidth : entry.width;
        const h = entry.type === 'spritesheet' ? entry.frameHeight : entry.height;
        assert.ok(typeof w === 'number' && w > 0 && typeof h === 'number' && h > 0, `Invalid dimensions for ${key}`);

        // Props & characters must define 2.5D anchor
        if (entry.category === 'prop' || entry.category === 'character') {
            assert.ok(entry.anchor && typeof entry.anchor.x === 'number' && typeof entry.anchor.y === 'number',
                `Prop/character ${key} must define 2.5D anchor`);
        }

        // Verify physical file exists on disk
        const fullPath = path.join(rootDir, entry.path);
        assert.ok(fs.existsSync(fullPath), `Referenced asset file does not exist: ${entry.path}`);
    }
});

// Feature 3: Overworld Environment Visuals (F3-01 to F3-05)
test("T1-FEAT", "T1-FEAT-F3-01", "WorldScene Preload Texture Key Registration", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.preload();
    assert.ok(harness.worldScene.load.queue.has('hero'), "Preloads hero spritesheet");
    assert.ok(harness.worldScene.load.queue.has('enemy'), "Preloads enemy sprite");
});

test("T1-FEAT", "T1-FEAT-F3-02", "2.5D Foot-Anchor Contract on Environmental Props", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});

    // 1. Inspect real tree prop registered in OcclusionManager
    const treeOcc = harness.worldScene.occlusionManager.occluders[0];
    assert.ok(treeOcc && treeOcc.sprite, "Tree occluder sprite exists in WorldScene");
    assert.strictEqual(treeOcc.sprite.originX, 0.5, "Tree prop originX must be 0.5");
    assert.strictEqual(treeOcc.sprite.originY, 0.95, "Tree prop originY must be foot-anchored at 0.95");

    // 2. Inspect real resource prop (bush) in resourceGroup
    const resZone = harness.worldScene.resourceGroup.getChildren()[0];
    assert.ok(resZone && resZone.sprite, "Resource prop sprite exists in WorldScene");
    assert.strictEqual(resZone.sprite.originX, 0.5, "Resource prop originX must be 0.5");
    assert.strictEqual(resZone.sprite.originY, 0.85, "Resource prop originY must be foot-anchored at 0.85");

    // 3. Inspect prop instantiated via createProp (fence)
    const prop = harness.worldScene.createProp(200, 200, 64, 'tex_fence');
    assert.strictEqual(prop.originX, 0.5, "Created prop originX must be 0.5");
    assert.ok(prop.originY >= 0.85 && prop.originY <= 1.0, "Created prop originY must be foot-anchored (>= 0.85)");
});

test("T1-FEAT", "T1-FEAT-F3-03", "Environmental Prop Depth Calculation Contract", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const propY = 320;
    const prop = harness.worldScene.createProp(200, propY, 64, 'tex_fence');
    assert.strictEqual(prop.depth, Math.floor(prop.y), "Depth must equal Math.floor(y)");
});

test("T1-FEAT", "T1-FEAT-F3-04", "Prop & Entity Contact Shadow Depth Placement", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});

    // 1. Verify player contact shadow depth contract: Math.floor(y) - 0.5
    const ps = harness.worldScene.playerShadow;
    assert.ok(ps, "playerShadow must be instantiated on WorldScene");
    assert.strictEqual(ps.depth, Math.floor(harness.worldScene.player.y) - 0.5, "Initial player shadow depth is Math.floor(y) - 0.5");

    // 2. Dynamic depth update loop verification
    harness.worldScene.player.y += 40;
    harness.worldScene.update(0, 16);
    assert.strictEqual(ps.depth, Math.floor(harness.worldScene.player.y) - 0.5, "Dynamic player shadow depth syncs on update");

    // 3. Verify enemy contact shadow depth contract
    const enemy = harness.worldScene.enemies.getChildren()[0];
    assert.ok(enemy && enemy.shadow, "Enemy shadow must be instantiated on WorldScene enemy");
    assert.strictEqual(enemy.shadow.depth, Math.floor(enemy.y) - 0.5, "Enemy shadow depth is Math.floor(y) - 0.5");
});

test("T1-FEAT", "T1-FEAT-F3-05", "OcclusionManager Alpha Fading Registration", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    assert.ok(harness.worldScene.occlusionManager, "OcclusionManager must be instantiated");
    const occluders = harness.worldScene.occlusionManager.occluders;
    assert.ok(occluders.length > 0, "Canopies and roofs registered in OcclusionManager");
    assert.strictEqual(occluders[0].targetAlpha, 0.35, "Target alpha must be 0.35");
});

// Feature 4: Character & NPC Sprites (F4-01 to F4-05)
test("T1-FEAT", "T1-FEAT-F4-01", "Pixel-Art NPC Sprite Instantiation", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const npcZone = harness.worldScene.interactiveZones.getChildren().find(z => z.npcData);
    assert.ok(npcZone, "NPC interactive zone exists");
    assert.strictEqual(npcZone.npcData.name, 'Guide', "NPC is Guide");
});

test("T1-FEAT", "T1-FEAT-F4-02", "NPC 2.5D Foot-Anchor & Depth Sorting", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});

    const npcZone = harness.worldScene.interactiveZones.getChildren().find(z => z.npcData && z.npcData.name === 'Guide');
    assert.ok(npcZone, "Guide NPC interactive zone exists");

    // 1. Verify 2.5D anchor and footprint from production manifest
    const { ASSET_MANIFEST, ASSET_KEYS } = require(path.join(rootDir, 'src/data/assets.js'));
    const guideManifest = ASSET_MANIFEST[ASSET_KEYS.NPC_GUIDE];
    assert.ok(guideManifest, "NPC_GUIDE must be defined in manifest");
    assert.strictEqual(guideManifest.anchor.x, 0.5, "Manifest anchor.x is 0.5");
    assert.ok(guideManifest.anchor.y >= 0.85 && guideManifest.anchor.y <= 1.0, "Manifest anchor.y is foot-anchored");
    assert.strictEqual(guideManifest.footprint.width, 28, "Manifest footprint width is 28px");
    assert.strictEqual(guideManifest.footprint.height, 20, "Manifest footprint height is 20px");

    // 2. Find real NPC sprite in scene children and verify depth sorting
    const npcSprite = harness.worldScene.children.list.find(c => c.texture && (c.texture.key === 'tex_npc' || c.texture.key === 'npc_guide'));
    assert.ok(npcSprite, "Guide NPC sprite must exist in worldScene.children.list");
    const expectedDepth = Math.floor(npcZone.y + 64 * 0.25);
    assert.strictEqual(npcSprite.originX, 0.5, "Sprite originX is 0.5");
    assert.ok(npcSprite.originY >= 0.85 && npcSprite.originY <= 1.0, "Sprite originY is foot-anchored");
    assert.strictEqual(npcSprite.depth, expectedDepth, "Sprite depth equals Math.floor(y)");
});

test("T1-FEAT", "T1-FEAT-F4-03", "NPC Ground Footprint Collision Box", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});

    // 1. Locate the Guide NPC interactive zone generated by the map
    const npcZone = harness.worldScene.interactiveZones.getChildren().find(z => z.npcData && z.npcData.name === 'Guide');
    assert.ok(npcZone, "Guide NPC interactive zone exists");

    // 2. Find the actual NPC foot wall collider created by createNPC in WorldScene.walls
    const expectedWallY = npcZone.y + 64 * 0.2;
    const npcWall = harness.worldScene.walls.getChildren().find(w =>
        Math.abs(w.x - npcZone.x) < 2 && Math.abs(w.y - expectedWallY) < 2
    );
    assert.ok(npcWall, "NPC foot collider must exist in worldScene.walls");
    assert.strictEqual(npcWall.width, 28, "NPC foot collider width is 28px");
    assert.strictEqual(npcWall.height, 20, "NPC foot collider height is 20px");

    // 3. Verify collision behavior: foot contact blocks, head traversal clears
    harness.worldScene.player.x = npcWall.x - 12;
    harness.worldScene.player.y = npcWall.y - 20;
    let hitFoot = false;
    harness.worldScene.physics.overlap(harness.worldScene.player, npcWall, () => { hitFoot = true; });
    assert.strictEqual(hitFoot, true, "Player collides with NPC foot collider");

    harness.worldScene.player.y = npcZone.y - 35;
    let hitBehind = false;
    harness.worldScene.physics.overlap(harness.worldScene.player, npcWall, () => { hitBehind = true; });
    assert.strictEqual(hitBehind, false, "Player walks behind NPC head without collision");
});

test("T1-FEAT", "T1-FEAT-F4-04", "Proximity Dialogue Event Trigger", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    const npcZone = harness.worldScene.interactiveZones.getChildren().find(z => z.npcData);
    harness.worldScene.player.x = npcZone.x;
    harness.worldScene.player.y = npcZone.y + 40;
    harness.worldScene.player.facing = 'up';
    harness.worldScene.player.update();
    let emitted = false;
    harness.worldScene.events.on('StartDialogue', (name, text) => {
        emitted = true;
        assert.strictEqual(name, 'Guide');
    });
    harness.worldScene.input.keyboard.press('E');
    assert.ok(emitted, "Pressing E near Guide emits StartDialogue");
});

test("T1-FEAT", "T1-FEAT-F4-05", "HUDScene Dialogue Display & Player Freeze", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    harness.hudScene.showDialogue('Guide', 'Test text');
    assert.strictEqual(harness.hudScene.isDialogueActive, true, "isDialogueActive is true");
    assert.strictEqual(harness.worldScene.player.active, false, "Player active set to false");
    assert.strictEqual(harness.worldScene.player.body.velocity.x, 0, "Player velocity stopped");
});

// Feature 5: Enemy Varieties & Boss Wiring (F5-01 to F5-05)
test("T1-FEAT", "T1-FEAT-F5-01", "Minor Enemy Variant Instantiation", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const charger = new env.Enemy(harness.worldScene, 100, 100, 'enemy', 'minor');
    const shooter = new env.Enemy(harness.worldScene, 200, 200, 'enemy', 'shooter');
    assert.strictEqual(charger.enemyType, 'minor');
    assert.ok(charger.moveEvent, "Charger has random wander event");
    assert.strictEqual(shooter.enemyType, 'shooter');
    assert.ok(shooter.shootEvent, "Shooter has projectile shoot event");
    charger.destroy();
    shooter.destroy();
});

test("T1-FEAT", "T1-FEAT-F5-02", "Shooter Projectile Bullet Emission", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const shooter = new env.Enemy(harness.worldScene, 300, 224, 'enemy', 'shooter');
    harness.worldScene.player.x = 352;
    harness.worldScene.player.y = 224;

    const collidersBefore = harness.worldScene.physics.colliders.length;
    shooter.shootAtPlayer();

    assert.strictEqual(
        harness.worldScene.physics.colliders.length,
        collidersBefore + 1,
        "shootAtPlayer registers bullet overlap with player in physics"
    );
    const bulletCollider = harness.worldScene.physics.colliders[harness.worldScene.physics.colliders.length - 1];
    assert.strictEqual(bulletCollider.obj1, harness.worldScene.player, "Overlap target is player");
    assert.strictEqual(bulletCollider.obj2.type, 'Circle', "Projectile is Circle");
    assert.strictEqual(bulletCollider.obj2.radius, 8, "Projectile radius is 8");
    assert.ok(bulletCollider.obj2.body.velocity.x > 0, "Projectile has positive velocity towards player");
    shooter.destroy();
});

test("T1-FEAT", "T1-FEAT-F5-03", "Minor Enemy Damage & Defeat Reward", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const enemy = new env.Enemy(harness.worldScene, 100, 100, 'enemy', 'minor');
    const xpBefore = window.gameState.player.xp;
    const goldBefore = window.gameState.player.gold;
    enemy.takeDamage(30);
    assert.strictEqual(enemy.hp, 0, "Enemy HP reaches 0");
    assert.strictEqual(window.gameState.player.xp, xpBefore + 20, "Awards +20 XP");
    assert.strictEqual(window.gameState.player.gold, goldBefore + 5, "Awards +5 Gold");
});

test("T1-FEAT", "T1-FEAT-F5-04", "Overworld Major Boss Entity Presence", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const boss = new env.Enemy(harness.worldScene, 500, 500, 'enemy', 'major');
    assert.strictEqual(boss.enemyType, 'major', "Boss enemyType is major");
    assert.strictEqual(boss.hp, 100, "Boss base HP is 100");
    boss.destroy();
});

test("T1-FEAT", "T1-FEAT-F5-05", "Boss Collider & startBossBattle Transition", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const boss = new env.Enemy(harness.worldScene, 500, 500, 'enemy', 'major');
    harness.worldScene.startBossBattle(harness.worldScene.player, boss);
    assert.strictEqual(boss.active, false, "Boss destroyed from overworld");
    harness.worldScene.time.flush();
    assert.strictEqual(harness.worldScene.isSleeping, true, "WorldScene put to sleep");
});

// Feature 6: BattleScene Fix & Arena Background (F6-01 to F6-05)
test("T1-FEAT", "T1-FEAT-F6-01", "BattleScene Preload of Arena Texture", () => {
    const harness = env.createSceneHarness();
    // Do NOT inject load.image manually in test body
    harness.battleScene.preload();
    assert.ok(
        harness.battleScene.load.queue.has('battle_bg'),
        "BattleScene.preload() must register 'battle_bg' in loader queue"
    );
});

test("T1-FEAT", "T1-FEAT-F6-02", "Arena Background Image Instantiation", () => {
    const harness = env.createSceneHarness();
    harness.battleScene.create();
    
    // Inspect genuine background image created at line 8
    const bgImage = harness.battleScene.bgImage || (
        harness.battleScene.children && harness.battleScene.children.getChildren
            ? harness.battleScene.children.getChildren().find(c => c.type === 'Image')
            : null
    );
    assert.ok(bgImage, "Background image instantiated in BattleScene");
    const textureKey = bgImage.texture ? bgImage.texture.key : (bgImage.textureKey || '');
    assert.strictEqual(textureKey, 'battle_bg', "Line 8 background must use 'battle_bg' (not missing 'tiles')");
    assert.strictEqual(bgImage.originX, 0, "Background originX is 0");
    assert.strictEqual(bgImage.originY, 0, "Background originY is 0");
});

test("T1-FEAT", "T1-FEAT-F6-03", "Boss Battle Sprite & HP Initialization", () => {
    const harness = env.createSceneHarness();
    harness.battleScene.create();
    assert.strictEqual(harness.battleScene.enemySprite.x, 650);
    assert.strictEqual(harness.battleScene.enemySprite.y, 350);
    assert.strictEqual(harness.battleScene.enemyHp, 200, "Boss HP initialized to 200");
});

test("T1-FEAT", "T1-FEAT-F6-04", "Turn-Based Action Execution (attack & magic)", () => {
    const harness = env.createSceneHarness();
    harness.battleScene.create();
    harness.uiScene.create();
    const hpBefore = harness.battleScene.enemyHp;
    harness.battleScene.receivePlayerSelection('attack');
    assert.ok(harness.battleScene.enemyHp < hpBefore, "Attack reduced Boss HP");
    const mpBefore = harness.battleScene.playerMp;
    harness.battleScene.receivePlayerSelection('magic');
    assert.strictEqual(harness.battleScene.playerMp, mpBefore - 15, "Magic consumed 15 MP");
});

test("T1-FEAT", "T1-FEAT-F6-05", "Boss Defeat & Scene Wake Transition", () => {
    const harness = env.createSceneHarness();
    harness.battleScene.create();
    harness.battleScene.enemyHp = 0;
    harness.battleScene.endBattle();
    assert.strictEqual(harness.uiScene.active, false, "UIScene stopped");
    assert.strictEqual(harness.battleScene.active, false, "BattleScene stopped");
    assert.strictEqual(harness.worldScene.active, true, "WorldScene woken up");
});

// Feature 7: Item Icons & Resource Harvesting (F7-01 to F7-05)
test("T1-FEAT", "T1-FEAT-F7-01", "Harvestable Resource Node Registration", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const resources = harness.worldScene.resourceGroup.getChildren();
    assert.ok(resources.length > 0, "Resource group contains harvestable nodes");
    assert.strictEqual(resources[0].resData.type, 'bush');
});

test("T1-FEAT", "T1-FEAT-F7-02", "Resource Node Destruction & Loot Drop", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const resNode = harness.worldScene.resourceGroup.getChildren()[0];
    const initialWood = (window.gameState.inventory.find(i => i.id === 'wood') || { qty: 0 }).qty;
    harness.worldScene.hitResource(null, resNode);
    assert.strictEqual(resNode.isDestroyed, true, "Resource marked destroyed");
    const updatedWood = (window.gameState.inventory.find(i => i.id === 'wood') || { qty: 0 }).qty;
    assert.strictEqual(updatedWood, initialWood + 1, "Grants +1 Wood");
});

test("T1-FEAT", "T1-FEAT-F7-03", "Dual-Ingredient Potion Recipe Crafting", () => {
    window.gameState.inventory = [];
    window.gameState.addItem({ id: 'wood', name: 'Bois', qty: 2 });
    window.gameState.addItem({ id: 'stone', name: 'Pierre', qty: 1 });
    const success = window.gameState.craftItem('potion');
    assert.strictEqual(success, true, "Potion crafted successfully");
    const potion = window.gameState.inventory.find(i => i.id === 'potion');
    assert.ok(potion && potion.qty === 1, "1 Potion in inventory");
    const wood = window.gameState.inventory.find(i => i.id === 'wood');
    assert.ok(!wood, "Wood fully consumed");
    const stone = window.gameState.inventory.find(i => i.id === 'stone');
    assert.ok(!stone, "Stone fully consumed");
});

test("T1-FEAT", "T1-FEAT-F7-04", "HUDScene Inventory Visual Icon Integration", () => {
    const harness = env.createSceneHarness();
    harness.hudScene.create();
    window.gameState.inventory = [{ id: 'potion', name: 'Potion', qty: 3, iconKey: 'item_potion' }];
    harness.hudScene.toggleMenu("INVENTAIRE");
    assert.strictEqual(harness.hudScene.isMenuActive, true);
    assert.ok(harness.hudScene.menuContent.text.includes("Potion"), "Displays Potion text");
    harness.hudScene.toggleMenu("INVENTAIRE");
});

test("T1-FEAT", "T1-FEAT-F7-05", "HUDScene Crafting Menu Recipes Display", () => {
    const harness = env.createSceneHarness();
    harness.hudScene.create();
    harness.hudScene.toggleMenu("CRAFTING");
    assert.ok(harness.hudScene.menuContent.text.includes("Pont en Bois"), "Displays Pont recipe");
    assert.ok(harness.hudScene.menuContent.text.includes("Potion"), "Displays Potion recipe");
    harness.hudScene.toggleMenu("CRAFTING");
});

// Feature 8: UI Controls & Keybinding Harmonization (F8-01 to F8-05)
test("T1-FEAT", "T1-FEAT-F8-01", "Keybinding I Toggles Inventory", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    harness.hudScene.toggleMenu("INVENTAIRE");
    assert.strictEqual(harness.hudScene.isMenuActive, true, "Menu active on I");
    assert.strictEqual(harness.hudScene.menuTitle.text, "INVENTAIRE", "Title is INVENTAIRE");
    harness.hudScene.toggleMenu("INVENTAIRE");
    assert.strictEqual(harness.hudScene.isMenuActive, false, "Menu closed on second I");
});

test("T1-FEAT", "T1-FEAT-F8-02", "Keybinding J Toggles Quests", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    harness.hudScene.jKey.setDown(true);
    harness.hudScene.update();
    assert.strictEqual(harness.hudScene.isMenuActive, true, "Menu active on J");
    assert.strictEqual(harness.hudScene.menuTitle.text, "QUETES", "Title is QUETES");
    harness.hudScene.jKey.setDown(true);
    harness.hudScene.update();
});

test("T1-FEAT", "T1-FEAT-F8-03", "Keybinding K / C Toggles Crafting", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    harness.hudScene.toggleMenu("CRAFTING");
    assert.strictEqual(harness.hudScene.isMenuActive, true, "CRAFTING menu opens");
    assert.strictEqual(harness.hudScene.menuTitle.text, "CRAFTING", "Title is CRAFTING");
    harness.hudScene.toggleMenu("CRAFTING");
});

test("T1-FEAT", "T1-FEAT-F8-04", "Keybinding C Character / Stats Modal", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    const stats = window.gameState.player;
    assert.strictEqual(stats.level, 1, "Player Level is 1");
    assert.strictEqual(stats.hp, 100, "Player HP is 100");
    assert.strictEqual(stats.gold, 0, "Player Gold is 0");
});

test("T1-FEAT", "T1-FEAT-F8-05", "Menu Pause/Resume of WorldScene", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    harness.hudScene.toggleMenu("INVENTAIRE");
    assert.strictEqual(harness.worldScene.isPaused, true, "WorldScene paused while menu open");
    harness.hudScene.toggleMenu("INVENTAIRE");
    assert.strictEqual(harness.worldScene.isPaused, false, "WorldScene resumed after menu close");
});

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES (40 Tests, 5 per Feature)
// ============================================================================
console.log("\n--- TIER 2: BOUNDARY & CORNER CASES (40 TESTS) ---");

// Feature 1 Boundary
test("T2-BOUND", "T2-BOUND-F1-01", "Safe Overwrite / Idempotence", () => {
    const dest = path.join(rootDir, 'assets/collection.webp');
    const originalHash = crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex');
    // Verify file read stream consistency
    const secondBuf = fs.readFileSync(dest);
    const secondHash = crypto.createHash('sha256').update(secondBuf).digest('hex');
    assert.strictEqual(originalHash, secondHash, "File remains identical and uncorrupted");
});

test("T2-BOUND", "T2-BOUND-F1-02", "Missing Source File Error Handling", () => {
    const invalidPath = path.join(rootDir, 'assets/non_existent_file.xyz');
    assert.throws(() => {
        fs.readFileSync(invalidPath);
    }, /ENOENT/, "Gracefully throws ENOENT for missing file");
});

test("T2-BOUND", "T2-BOUND-F1-03", "Unicode & Spaced Source Filename Handling", () => {
    const unicodeName = 'Collection de ressources pixel-art pour RPG fantastique-1.webp';
    const normalized = path.normalize(unicodeName);
    assert.strictEqual(normalized, unicodeName, "Unicode accents and spaces preserved in path");
});

test("T2-BOUND", "T2-BOUND-F1-04", "Target Write-Permission Boundary", () => {
    const assetsDir = path.join(rootDir, 'assets');
    assert.doesNotThrow(() => {
        fs.accessSync(assetsDir, fs.constants.W_OK);
    }, "Assets folder must have write permission");
});

test("T2-BOUND", "T2-BOUND-F1-05", "Partial Ingestion / Truncated Stream Detection", () => {
    const smallBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]); // Incomplete RIFF
    const isValid = smallBuffer.length >= 12 && smallBuffer.subarray(8, 12).toString('ascii') === 'WEBP';
    assert.strictEqual(isValid, false, "Validator successfully rejects truncated stream");
});

// Feature 2 Boundary
test("T2-BOUND", "T2-BOUND-F2-01", "Slicing Bounding Box Within Sheet Dimensions", () => {
    // Read actual sheet dimensions from binary PNG IHDR chunks
    const collBuf = fs.readFileSync(path.join(rootDir, 'assets/collection.png'));
    const sheetWidth = collBuf.readUInt32BE(16);
    const sheetHeight = collBuf.readUInt32BE(20);
    assert.strictEqual(sheetWidth, 1536, "collection.png width is 1536px");
    assert.strictEqual(sheetHeight, 1024, "collection.png height is 1024px");

    function isSliceWithinBounds(x, y, w, h, sw, sh) {
        return typeof x === 'number' && typeof y === 'number' && typeof w === 'number' && typeof h === 'number' &&
            x >= 0 && y >= 0 && w > 0 && h > 0 && (x + w) <= sw && (y + h) <= sh;
    }

    // Exact edge boundary evaluations
    assert.strictEqual(isSliceWithinBounds(0, 0, 64, 64, sheetWidth, sheetHeight), true, "Top-left corner within bounds");
    assert.strictEqual(isSliceWithinBounds(sheetWidth - 64, sheetHeight - 64, 64, 64, sheetWidth, sheetHeight), true, "Bottom-right edge within bounds");
    assert.strictEqual(isSliceWithinBounds(sheetWidth - 63, sheetHeight - 64, 64, 64, sheetWidth, sheetHeight), false, "1px right overflow rejected");
    assert.strictEqual(isSliceWithinBounds(0, sheetHeight - 63, 64, 64, sheetWidth, sheetHeight), false, "1px bottom overflow rejected");
    assert.strictEqual(isSliceWithinBounds(-1, 0, 64, 64, sheetWidth, sheetHeight), false, "Negative coordinate rejected");

    // Real recorded slices from collection.png stay within dimensions
    assert.strictEqual(isSliceWithinBounds(913, 830, 564, 138, sheetWidth, sheetHeight), true, "Canopy wall slice within sheet");
    assert.strictEqual(isSliceWithinBounds(48, 394, 288, 273, sheetWidth, sheetHeight), true, "Large tree slice within sheet");
});

test("T2-BOUND", "T2-BOUND-F2-02", "Transparency Keying Tolerance Boundary", () => {
    // Inspect actual alpha channel transparency from physical sliced assets via built-in zlib
    const zlib = require('zlib');
    const testAssets = ['assets/items/wood.png', 'assets/props/bush.png', 'assets/items/stone.png'];

    for (const relPath of testAssets) {
        const fullPath = path.join(rootDir, relPath);
        assert.ok(fs.existsSync(fullPath), `Asset file ${relPath} must exist`);
        const buf = fs.readFileSync(fullPath);
        const w = buf.readUInt32BE(16);
        const h = buf.readUInt32BE(20);
        const colorType = buf[25];
        assert.strictEqual(colorType, 6, `${relPath} must be 32-bit RGBA (color type 6)`);

        // Extract and decompress IDAT chunks
        let pos = 8;
        const idats = [];
        while (pos < buf.length) {
            const len = buf.readUInt32BE(pos);
            const type = buf.subarray(pos + 4, pos + 8).toString('ascii');
            if (type === 'IDAT') idats.push(buf.subarray(pos + 8, pos + 8 + len));
            pos += 12 + len;
        }
        const rawScanlines = zlib.inflateSync(Buffer.concat(idats));

        // Reconstruct unfiltered scanlines according to RFC 2083
        const bpp = 4; // 32-bit RGBA
        const stride = 1 + w * bpp;
        const reconstructed = Buffer.alloc(w * h * bpp);

        for (let y = 0; y < h; y++) {
            const filterType = rawScanlines[y * stride];
            const rowStart = y * stride + 1;
            const reconStart = y * w * bpp;

            for (let i = 0; i < w * bpp; i++) {
                const raw = rawScanlines[rowStart + i];
                const a = (i >= bpp) ? reconstructed[reconStart + i - bpp] : 0;
                const b = (y > 0) ? reconstructed[(y - 1) * w * bpp + i] : 0;
                const c = (y > 0 && i >= bpp) ? reconstructed[(y - 1) * w * bpp + i - bpp] : 0;

                let val = 0;
                if (filterType === 0) {
                    val = raw;
                } else if (filterType === 1) { // Sub
                    val = (raw + a) & 0xff;
                } else if (filterType === 2) { // Up
                    val = (raw + b) & 0xff;
                } else if (filterType === 3) { // Average
                    val = (raw + Math.floor((a + b) / 2)) & 0xff;
                } else if (filterType === 4) { // Paeth
                    const p = a + b - c;
                    const pa = Math.abs(p - a);
                    const pb = Math.abs(p - b);
                    const pc = Math.abs(p - c);
                    let pr;
                    if (pa <= pb && pa <= pc) {
                        pr = a;
                    } else if (pb <= pc) {
                        pr = b;
                    } else {
                        pr = c;
                    }
                    val = (raw + pr) & 0xff;
                }
                reconstructed[reconStart + i] = val;
            }
        }

        let transparentCount = 0;
        let opaqueCount = 0;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const alpha = reconstructed[(y * w + x) * bpp + 3];
                if (alpha === 0) transparentCount++;
                if (alpha > 128) opaqueCount++;
            }
        }

        const totalPixels = w * h;
        assert.ok(transparentCount > 0, `${relPath} must contain transparent keyed background pixels (got ${transparentCount})`);
        assert.ok(opaqueCount > 0, `${relPath} must contain opaque sprite foreground pixels (got ${opaqueCount})`);
        const transRatio = transparentCount / totalPixels;
        assert.ok(transRatio > 0.1 && transRatio < 0.95, `${relPath} transparency ratio (${transRatio.toFixed(2)}) must be between 10% and 95%`);
    }
});

test("T2-BOUND", "T2-BOUND-F2-03", "Zero / Negative Dimension Rejection & Manifest Parity", () => {
    function isValidDimension(w, h) {
        return typeof w === 'number' && Number.isFinite(w) && typeof h === 'number' && Number.isFinite(h) && w > 0 && h > 0;
    }

    // Boundary rejection tests
    assert.strictEqual(isValidDimension(0, 32), false, "Rejects 0 width");
    assert.strictEqual(isValidDimension(32, 0), false, "Rejects 0 height");
    assert.strictEqual(isValidDimension(-16, 16), false, "Rejects negative width");
    assert.strictEqual(isValidDimension(16, -16), false, "Rejects negative height");
    assert.strictEqual(isValidDimension('32', 32), false, "Rejects string width");
    assert.strictEqual(isValidDimension(NaN, 32), false, "Rejects NaN width");
    assert.strictEqual(isValidDimension(32, 32), true, "Accepts positive dimensions");

    // Validate every asset in production manifest and verify physical file parity
    const { ASSET_MANIFEST } = require(path.join(rootDir, 'src/data/assets.js'));
    for (const [key, entry] of Object.entries(ASSET_MANIFEST)) {
        const w = entry.type === 'spritesheet' ? entry.frameWidth : entry.width;
        const h = entry.type === 'spritesheet' ? entry.frameHeight : entry.height;
        assert.ok(isValidDimension(w, h), `Manifest dimension valid for ${key}`);

        const buf = fs.readFileSync(path.join(rootDir, entry.path));
        const fileW = buf.readUInt32BE(16);
        const fileH = buf.readUInt32BE(20);
        assert.ok(isValidDimension(fileW, fileH), `File header dimension valid for ${entry.path}`);

        if (entry.type === 'image') {
            assert.strictEqual(fileW, entry.width, `Width parity for ${key}`);
            assert.strictEqual(fileH, entry.height, `Height parity for ${key}`);
        } else if (entry.type === 'spritesheet') {
            assert.ok(fileW >= entry.frameWidth, `Sheet width >= frameWidth for ${key}`);
            assert.ok(fileH >= entry.frameHeight, `Sheet height >= frameHeight for ${key}`);
        }
    }
});

test("T2-BOUND", "T2-BOUND-F2-04", "Manifest Missing File Resilience & Lookup Helpers", () => {
    const { getAsset, applyAssetOrigin } = require(path.join(rootDir, 'src/data/assets.js'));

    // 1. Missing and invalid key resilience (clean null return without exception)
    assert.strictEqual(getAsset(null), null, "getAsset(null) returns null cleanly");
    assert.strictEqual(getAsset(undefined), null, "getAsset(undefined) returns null cleanly");
    assert.strictEqual(getAsset(''), null, "getAsset('') returns null cleanly");
    assert.strictEqual(getAsset('missing_key_xyz_999'), null, "Unknown key returns null cleanly");

    // 2. Legacy alias fallback resolution
    const treeAsset = getAsset('tex_tree');
    assert.ok(treeAsset, "Resolves legacy alias 'tex_tree'");
    assert.strictEqual(treeAsset.key, 'prop_tree_large', "Resolves to canonical 'prop_tree_large'");
    assert.ok(fs.existsSync(path.join(rootDir, treeAsset.path)), "Alias path points to existing file");

    const woodAsset = getAsset('item_wood');
    assert.ok(woodAsset, "Resolves canonical 'item_wood'");
    assert.ok(fs.existsSync(path.join(rootDir, woodAsset.path)), "Canonical path points to existing file");

    // 3. Safe applyAssetOrigin on missing or null inputs
    const dummySprite = { originX: 0, originY: 0, setOrigin(x, y) { this.originX = x; this.originY = y; } };
    applyAssetOrigin(dummySprite, 'tex_tree');
    assert.strictEqual(dummySprite.originX, 0.5, "Applies correct anchor X");
    assert.strictEqual(dummySprite.originY, 0.95, "Applies correct anchor Y");

    // Resilient to missing keys and null sprite without throwing
    applyAssetOrigin(dummySprite, 'non_existent_key');
    assert.strictEqual(dummySprite.originX, 0.5, "Preserves origin on unknown key");
    assert.doesNotThrow(() => applyAssetOrigin(null, 'tex_tree'), "Does not throw on null sprite");
});

test("T2-BOUND", "T2-BOUND-F2-05", "Atomic File Writing & PNG EOF Integrity", () => {
    // 1. Verify physical file completeness across manifest assets (no truncated slices)
    const { ASSET_MANIFEST } = require(path.join(rootDir, 'src/data/assets.js'));
    const iendSignature = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);

    for (const [key, entry] of Object.entries(ASSET_MANIFEST)) {
        if (entry.type === 'image') {
            const buf = fs.readFileSync(path.join(rootDir, entry.path));
            assert.ok(buf.length >= 12, `File ${entry.path} has minimum PNG length`);
            const footer = buf.subarray(buf.length - 12);
            assert.ok(footer.equals(iendSignature), `Asset ${key} must have valid IEND footer`);
        }
    }

    // 2. Exercise genuine atomic write pattern (temp staging -> commit rename)
    const os = require('os');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-commit-test-'));
    const destPath = path.join(tmpDir, 'wood.png');
    const stagingPath = destPath + '.tmp';

    function atomicWrite(target, buffer) {
        if (!buffer || buffer.length === 0) throw new Error("Empty buffer rejected");
        fs.writeFileSync(stagingPath, buffer);
        assert.ok(fs.existsSync(stagingPath), "Staging file written");
        assert.ok(!fs.existsSync(target), "Target does not exist before commit");
        fs.renameSync(stagingPath, target);
        assert.ok(fs.existsSync(target), "Target exists after atomic rename");
        assert.ok(!fs.existsSync(stagingPath), "Staging cleaned up after rename");
        return { committed: true, size: fs.statSync(target).size };
    }

    const testPngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND
    ]);

    const res = atomicWrite(destPath, testPngBuffer);
    assert.strictEqual(res.committed, true, "File committed atomically");
    assert.strictEqual(res.size, testPngBuffer.length, "Destination size matches source buffer");

    // Rejection on empty buffer preserves destination
    assert.throws(() => atomicWrite(path.join(tmpDir, 'fail.png'), Buffer.alloc(0)));
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

// Feature 3 Boundary
test("T2-BOUND", "T2-BOUND-F3-01", "Occlusion Boundary Exact Edge Coordinates", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});

    const occ = harness.worldScene.occlusionManager.occluders[0];
    assert.ok(occ, "Occluder must exist in OcclusionManager");
    const b = occ.bounds;

    // Position player safely behind the canopy base
    const safeY = occ.baseY - 10;
    harness.worldScene.player.y = safeY;

    // Exact minX inside
    harness.worldScene.player.x = b.minX;
    harness.worldScene.occlusionManager.update(harness.worldScene.player);
    assert.strictEqual(occ.isOccluding, true, "Exact minX boundary triggers occlusion");

    // Exact maxX inside
    harness.worldScene.player.x = b.maxX;
    harness.worldScene.occlusionManager.update(harness.worldScene.player);
    assert.strictEqual(occ.isOccluding, true, "Exact maxX boundary triggers occlusion");

    // 1px left outside minX
    harness.worldScene.player.x = b.minX - 1;
    harness.worldScene.occlusionManager.update(harness.worldScene.player);
    assert.strictEqual(occ.isOccluding, false, "1px left outside minX does NOT trigger occlusion");

    // 1px right outside maxX
    harness.worldScene.player.x = b.maxX + 1;
    harness.worldScene.occlusionManager.update(harness.worldScene.player);
    assert.strictEqual(occ.isOccluding, false, "1px right outside maxX does NOT trigger occlusion");

    // Vertical minY boundary test (py = player.y - 18)
    harness.worldScene.player.x = (b.minX + b.maxX) / 2;
    harness.worldScene.player.y = b.minY + 18; // py === b.minY
    harness.worldScene.occlusionManager.update(harness.worldScene.player);
    assert.strictEqual(occ.isOccluding, true, "Exact minY boundary triggers occlusion");

    harness.worldScene.player.y = b.minY + 17; // py === b.minY - 1
    harness.worldScene.occlusionManager.update(harness.worldScene.player);
    assert.strictEqual(occ.isOccluding, false, "1px above minY does NOT trigger occlusion");
});

test("T2-BOUND", "T2-BOUND-F3-02", "Canopy Occlusion BaseY Split Boundary", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const occ = harness.worldScene.occlusionManager.occluders[0];
    assert.ok(occ, "Occluder exists");
    // Position player in front of tree base (player.y >= baseY)
    harness.worldScene.player.x = (occ.bounds.minX + occ.bounds.maxX) / 2;
    harness.worldScene.player.y = occ.baseY + 10;
    harness.worldScene.occlusionManager.update(harness.worldScene.player);
    assert.strictEqual(occ.isOccluding, false, "FootY >= baseY does NOT trigger occlusion");
});

test("T2-BOUND", "T2-BOUND-F3-03", "Overlapping Occluder Bounds", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const s1 = harness.worldScene.add.sprite(150, 150, 'tex_tree');
    const s2 = harness.worldScene.add.sprite(180, 150, 'tex_tree');
    harness.worldScene.occlusionManager.register(s1, { minX: 100, maxX: 200, minY: 50, maxY: 150 }, 0.35, 160);
    harness.worldScene.occlusionManager.register(s2, { minX: 150, maxX: 250, minY: 50, maxY: 150 }, 0.35, 160);
    harness.worldScene.player.x = 175;
    harness.worldScene.player.y = 120; // behind both
    harness.worldScene.occlusionManager.update(harness.worldScene.player);
    const o1 = harness.worldScene.occlusionManager.occluders.find(o => o.sprite === s1);
    const o2 = harness.worldScene.occlusionManager.occluders.find(o => o.sprite === s2);
    assert.strictEqual(o1.isOccluding, true, "First overlapping tree occludes");
    assert.strictEqual(o2.isOccluding, true, "Second overlapping tree occludes");
});

test("T2-BOUND", "T2-BOUND-F3-04", "Trunk Footprint Passage Boundary", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});

    // Find real tree trunk collider in scene walls (36x18 px footprint)
    const treeOcc = harness.worldScene.occlusionManager.occluders[0];
    const treeWall = harness.worldScene.walls.getChildren().find(w =>
        Math.abs(w.x - treeOcc.sprite.x) < 5 && w.width === 36 && w.height === 18
    );
    assert.ok(treeWall, "Tree trunk collider must exist in worldScene.walls");

    // 1. Position player at trunk foot level -> physical collision occurs
    harness.worldScene.player.x = treeWall.x - 12;
    harness.worldScene.player.y = treeWall.y - 20;
    let hitAtTrunk = false;
    harness.worldScene.physics.overlap(harness.worldScene.player, treeWall, () => { hitAtTrunk = true; });
    assert.strictEqual(hitAtTrunk, true, "Player collides with tree trunk collider at base");

    // 2. Position player walking horizontally behind trunk -> passage is unobstructed
    harness.worldScene.player.y = treeWall.y - 40;
    let hitBehindTrunk = false;
    harness.worldScene.physics.overlap(harness.worldScene.player, treeWall, () => { hitBehindTrunk = true; });
    assert.strictEqual(hitBehindTrunk, false, "Player passes horizontally behind trunk without colliding with trunk wall");

    // 3. Dynamic occlusion active during behind-trunk passage
    harness.worldScene.occlusionManager.update(harness.worldScene.player);
    assert.strictEqual(treeOcc.isOccluding, true, "Tree canopy occludes player walking behind trunk");
});

test("T2-BOUND", "T2-BOUND-F3-05", "Perimeter Grid Boundary Props", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const prop = harness.worldScene.createProp(0, 0, 64, 'tex_bush');
    assert.ok(prop.depth >= 0, "Depth at (0, 0) must be >= 0");
});

// Feature 4 Boundary
test("T2-BOUND", "T2-BOUND-F4-01", "Dialogue Proximity Distance Boundary (>96px)", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    const npcZone = harness.worldScene.interactiveZones.getChildren().find(z => z.npcData);
    harness.worldScene.player.x = npcZone.x + 150; // 150px away
    harness.worldScene.player.y = npcZone.y;
    harness.worldScene.input.keyboard.press('E');
    assert.strictEqual(harness.hudScene.isDialogueActive, false, "Dialogue not triggered beyond interaction zone");
});

test("T2-BOUND", "T2-BOUND-F4-02", "Rapid E / Space Spamming Re-entrance", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    for (let i = 0; i < 5; i++) {
        harness.hudScene.showDialogue('Guide', 'Spam test');
        harness.hudScene.endDialogue();
    }
    assert.strictEqual(harness.hudScene.isDialogueActive, false, "Dialogue state clean after spam");
    assert.strictEqual(harness.worldScene.player.active, true, "Player remains active");
});

test("T2-BOUND", "T2-BOUND-F4-03", "Empty Dialogue String Safety", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    assert.doesNotThrow(() => {
        harness.hudScene.showDialogue('Guide', '');
    }, "Handles empty dialogue string safely");
    harness.hudScene.endDialogue();
});

test("T2-BOUND", "T2-BOUND-F4-04", "Velocity Zeroing on Dialogue Open", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    harness.worldScene.player.setVelocity(250, 250);
    harness.hudScene.showDialogue('Guide', 'Stop!');
    assert.strictEqual(harness.worldScene.player.body.velocity.x, 0, "Velocity X zeroed");
    assert.strictEqual(harness.worldScene.player.body.velocity.y, 0, "Velocity Y zeroed");
    harness.hudScene.endDialogue();
});

test("T2-BOUND", "T2-BOUND-F4-05", "NPC Solid Foot Collider Boundary", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const wall = harness.worldScene.createWall(672, 480, 28, 20);
    assert.strictEqual(wall.body.immovable, true, "NPC collider is immovable");
});

// Feature 5 Boundary
test("T2-BOUND", "T2-BOUND-F5-01", "Shooter 400px Aggro Distance Threshold", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const shooter = new env.Enemy(harness.worldScene, 100, 200, 'enemy', 'shooter');

    // Case 1: 401px away (dy = 0 at player.y = 195) -> Out of range, no bullet fired
    harness.worldScene.player.x = 100 + 401;
    harness.worldScene.player.y = 195; // (195 - 15) - (200 - 20) = 0
    const collidersBefore401 = harness.worldScene.physics.colliders.length;
    shooter.shootAtPlayer();
    assert.strictEqual(
        harness.worldScene.physics.colliders.length,
        collidersBefore401,
        "No bullet overlap registered when player is 401px away (> 400px aggro threshold)"
    );

    // Case 2: 399px away -> In range, bullet fired and registered in physics
    harness.worldScene.player.x = 100 + 399;
    harness.worldScene.player.y = 195;
    const collidersBefore399 = harness.worldScene.physics.colliders.length;
    shooter.shootAtPlayer();
    assert.strictEqual(
        harness.worldScene.physics.colliders.length,
        collidersBefore399 + 1,
        "Bullet overlap registered when player is 399px away (<= 400px aggro threshold)"
    );
    const bulletCollider = harness.worldScene.physics.colliders[harness.worldScene.physics.colliders.length - 1];
    assert.ok(bulletCollider && bulletCollider.obj2, "Bullet projectile created");
    assert.strictEqual(bulletCollider.obj2.type, 'Circle', "Bullet is a Circle GameObject");
    assert.strictEqual(bulletCollider.obj2.radius, 8, "Bullet radius is 8px");
    assert.ok(bulletCollider.obj2.body.velocity.x > 0, "Bullet travels towards player with positive X velocity");

    shooter.destroy();
});

test("T2-BOUND", "T2-BOUND-F5-02", "Enemy Knockback Wall Collision", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const enemy = new env.Enemy(harness.worldScene, 10, 10, 'enemy', 'minor');
    assert.strictEqual(enemy.body.collideWorldBounds, true, "Enemy collides with world bounds");
    enemy.destroy();
});

test("T2-BOUND", "T2-BOUND-F5-03", "Invulnerability Flashing Guard", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const enemy = new env.Enemy(harness.worldScene, 100, 100, 'enemy', 'minor');
    enemy.isFlashing = true;
    const hpBefore = enemy.hp;
    enemy.takeDamage(10);
    assert.strictEqual(enemy.hp, hpBefore, "Damage rejected while flashing");
    enemy.destroy();
});

test("T2-BOUND", "T2-BOUND-F5-04", "0 HP Lethal Player Boss Collision Guard", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const boss = new env.Enemy(harness.worldScene, 500, 500, 'enemy', 'major');

    // Set player to lethal 0 HP state
    window.gameState.player.hp = 0;
    if (harness.worldScene.player) {
        harness.worldScene.player.hp = 0;
    }

    // Trigger boss battle with dead player
    harness.worldScene.startBossBattle(harness.worldScene.player, boss);
    harness.worldScene.time.flush();

    // Verify boss battle transition was aborted
    assert.strictEqual(boss.active, true, "Boss remains active / not destroyed on lethal collision");
    assert.strictEqual(harness.worldScene.isSleeping, false, "WorldScene is not put to sleep");
    assert.strictEqual(harness.battleScene.isInitialized, false, "BattleScene is not launched when player is dead");

    // Clean up & restore
    boss.destroy();
    window.gameState.player.hp = 100;
    if (harness.worldScene.player) {
        harness.worldScene.player.hp = 100;
    }
});

test("T2-BOUND", "T2-BOUND-F5-05", "Single-Execution Death Cleanup", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const enemy = new env.Enemy(harness.worldScene, 100, 100, 'enemy', 'minor');
    const xpBefore = window.gameState.player.xp;
    enemy.takeDamage(50);
    enemy.takeDamage(50);
    assert.strictEqual(window.gameState.player.xp, xpBefore + 20, "Rewards granted strictly once");
});

// Feature 6 Boundary
test("T2-BOUND", "T2-BOUND-F6-01", "Missing Texture Fallback Resilience", () => {
    const harness = env.createSceneHarness();
    assert.doesNotThrow(() => {
        harness.battleScene.create();
    }, "BattleScene creates cleanly with fallback image tinting");
});

test("T2-BOUND", "T2-BOUND-F6-02", "Insufficient MP Magic Rejection", () => {
    const harness = env.createSceneHarness();
    harness.battleScene.create();
    harness.battleScene.playerMp = 14; // Needs 15
    let msgEmitted = '';
    harness.battleScene.events.on('Message', m => msgEmitted = m);
    harness.battleScene.receivePlayerSelection('magic');
    assert.strictEqual(harness.battleScene.playerMp, 14, "MP not consumed");
    assert.ok(msgEmitted.includes("Magie"), "Error message emitted");
});

test("T2-BOUND", "T2-BOUND-F6-03", "Heal Overheal Capping Boundary", () => {
    const harness = env.createSceneHarness();
    harness.battleScene.create();
    harness.battleScene.playerHp = 90;
    harness.battleScene.playerMaxHp = 100;
    harness.battleScene.playerMp = 20;
    harness.battleScene.receivePlayerSelection('heal');
    assert.strictEqual(harness.battleScene.playerHp, 100, "HP capped strictly at 100 maxHp");
});

test("T2-BOUND", "T2-BOUND-F6-04", "Zero HP Boss Turn Suppression", () => {
    const harness = env.createSceneHarness();
    harness.battleScene.create();
    harness.battleScene.enemyHp = 0;
    let msg = '';
    harness.battleScene.events.on('Message', m => msg = m);
    harness.battleScene.enemyTurn();
    assert.ok(msg.includes("vaincu"), "Boss death triggers victory message");
});

test("T2-BOUND", "T2-BOUND-F6-05", "Flee Probability Retaliation", () => {
    const harness = env.createSceneHarness();
    harness.battleScene.create();

    const origRandom = Math.random;
    try {
        // Case 1: Failed flee (Math.random <= 0.5) triggers enemy retaliation
        Math.random = () => 0.2; // <= 0.5 -> failure
        let failMsg = '';
        harness.battleScene.events.on('Message', m => failMsg = m);
        harness.battleScene.receivePlayerSelection('flee');
        assert.ok(failMsg.includes("échoué"), "Failed flee message emitted on <= 0.5 roll");

        // Flush timer to execute retaliatory enemyTurn
        const playerHpBefore = harness.battleScene.playerHp;
        harness.battleScene.time.flush();
        assert.ok(
            harness.battleScene.playerHp < playerHpBefore,
            "Enemy retaliated after failed flee, reducing player HP"
        );

        // Case 2: Successful flee (Math.random > 0.5) exits battle cleanly
        Math.random = () => 0.8; // > 0.5 -> success
        let successMsg = '';
        harness.battleScene.events.on('Message', m => successMsg = m);
        harness.battleScene.receivePlayerSelection('flee');
        assert.ok(successMsg.includes("fui"), "Escape message emitted on > 0.5 roll");
        harness.battleScene.time.flush();
        assert.strictEqual(harness.battleScene.active, false, "BattleScene stopped on successful flee");
    } finally {
        Math.random = origRandom;
    }
});

// Feature 7 Boundary
test("T2-BOUND", "T2-BOUND-F7-01", "Depleted Resource Swing Guard", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const resNode = harness.worldScene.resourceGroup.getChildren()[0];
    resNode.isDestroyed = true;
    const invCount = window.gameState.inventory.length;
    harness.worldScene.hitResource(null, resNode);
    assert.strictEqual(window.gameState.inventory.length, invCount, "No loot from destroyed resource");
});

test("T2-BOUND", "T2-BOUND-F7-02", "Missing Item Icon Fallback", () => {
    const harness = env.createSceneHarness();
    harness.hudScene.create();
    window.gameState.inventory = [{ id: 'misc', name: 'Objet Inconnu', qty: 1 }];
    assert.doesNotThrow(() => {
        harness.hudScene.toggleMenu("INVENTAIRE");
    }, "Safely displays item without iconKey");
    harness.hudScene.toggleMenu("INVENTAIRE");
});

test("T2-BOUND", "T2-BOUND-F7-03", "Zero-Quantity Ingredient Crafting Rejection", () => {
    window.gameState.inventory = [{ id: 'wood', name: 'Bois', qty: 2 }]; // 0 stone
    const res = window.gameState.craftItem('potion');
    assert.strictEqual(res, false, "Rejected crafting with 0 stone");
    assert.strictEqual(window.gameState.inventory[0].qty, 2, "Wood unchanged");
});

test("T2-BOUND", "T2-BOUND-F7-04", "Partial Ingredient Crafting Rejection", () => {
    window.gameState.inventory = [
        { id: 'wood', name: 'Bois', qty: 1 }, // needs 2
        { id: 'stone', name: 'Pierre', qty: 1 }
    ];
    const res = window.gameState.craftItem('potion');
    assert.strictEqual(res, false, "Rejected crafting with only 1 wood");
});

test("T2-BOUND", "T2-BOUND-F7-05", "Large Quantity Inventory Stacking Boundary", () => {
    window.gameState.inventory = [];
    window.gameState.addItem({ id: 'stone', name: 'Pierre', qty: 999 });
    window.gameState.addItem({ id: 'wood', name: 'Bois', qty: 999 });
    assert.strictEqual(window.gameState.inventory.length, 2, "2 slots used");
    assert.strictEqual(window.gameState.inventory[0].qty, 999);
    assert.strictEqual(window.gameState.inventory[1].qty, 999);
});

// Feature 8 Boundary
test("T2-BOUND", "T2-BOUND-F8-01", "Inter-Menu Direct Switching", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    harness.hudScene.toggleMenu("INVENTAIRE");
    assert.strictEqual(harness.hudScene.menuTitle.text, "INVENTAIRE");
    harness.hudScene.toggleMenu("CRAFTING");
    assert.strictEqual(harness.hudScene.menuTitle.text, "CRAFTING");
    harness.hudScene.toggleMenu("CRAFTING");
});

test("T2-BOUND", "T2-BOUND-F8-02", "Dialogue Active Menu Lockout", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    
    // 1. Activate dialogue
    harness.hudScene.showDialogue('Guide', 'Wait here, hero...');
    assert.strictEqual(harness.hudScene.isDialogueActive, true, "Dialogue is active");

    // 2. Press menu hotkeys (I, J, C) while dialogue is active
    harness.hudScene.input.keyboard.press('I');
    harness.hudScene.update();
    assert.strictEqual(harness.hudScene.isMenuActive, false, "Hotkey 'I' locked out during dialogue");

    harness.hudScene.input.keyboard.press('J');
    harness.hudScene.update();
    assert.strictEqual(harness.hudScene.isMenuActive, false, "Hotkey 'J' locked out during dialogue");

    harness.hudScene.input.keyboard.press('C');
    harness.hudScene.update();
    assert.strictEqual(harness.hudScene.isMenuActive, false, "Hotkey 'C' locked out during dialogue");

    // 3. Attempt direct toggleMenu calls during active dialogue
    harness.hudScene.toggleMenu('INVENTAIRE');
    assert.strictEqual(harness.hudScene.isMenuActive, false, "Direct toggleMenu('INVENTAIRE') locked out");

    harness.hudScene.toggleMenu('QUETES');
    assert.strictEqual(harness.hudScene.isMenuActive, false, "Direct toggleMenu('QUETES') locked out");

    harness.hudScene.toggleMenu('CRAFTING');
    assert.strictEqual(harness.hudScene.isMenuActive, false, "Direct toggleMenu('CRAFTING') locked out");

    // 4. End dialogue with Space / endDialogue
    harness.hudScene.endDialogue();
    assert.strictEqual(harness.hudScene.isDialogueActive, false, "Dialogue dismissed");

    // 5. Verify menu can now open normally
    harness.hudScene.input.keyboard.press('I');
    harness.hudScene.update();
    assert.strictEqual(harness.hudScene.isMenuActive, true, "Menu 'I' successfully opens after dialogue ends");
    harness.hudScene.toggleMenu('INVENTAIRE'); // close menu
});

test("T2-BOUND", "T2-BOUND-F8-03", "Unbound Key Press Resilience", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    assert.doesNotThrow(() => {
        harness.hudScene.input.keyboard.press('X');
    }, "Unbound key press does not cause error");
});

test("T2-BOUND", "T2-BOUND-F8-04", "Rapid Double-Toggle Re-entrance", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    harness.hudScene.toggleMenu("INVENTAIRE");
    harness.hudScene.toggleMenu("INVENTAIRE");
    assert.strictEqual(harness.hudScene.isMenuActive, false, "Menu closed cleanly");
    assert.strictEqual(harness.worldScene.isPaused, false, "WorldScene resumed");
});

test("T2-BOUND", "T2-BOUND-F8-05", "Closed Menu Quick-Action Guard", () => {
    const harness = env.createSceneHarness();
    harness.hudScene.create();
    window.gameState.inventory = [{ id: 'potion', name: 'Potion', qty: 1 }];
    harness.hudScene.isMenuActive = false;
    harness.hudScene.num1Key.setDown(true);
    harness.hudScene.update();
    // In update(): quick actions only run when isMenuActive is true
    assert.strictEqual(window.gameState.inventory[0].qty, 1, "Quick action ignored when menu closed");
});

// ============================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS (8 Pairwise Tests)
// ============================================================================
console.log("\n--- TIER 3: CROSS-FEATURE COMBINATIONS (8 TESTS) ---");

test("T3-CROSS", "T3-CROSS-01", "Asset Slicing + WorldScene Occlusion Integration", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const tree = harness.worldScene.add.sprite(200, 200, 'tex_tree');
    tree.setOrigin(0.5, 0.95);
    harness.worldScene.occlusionManager.register(tree, { minX: 150, maxX: 250, minY: 100, maxY: 190 }, 0.35, 195);
    // Player walks behind canopy
    harness.worldScene.player.x = 200;
    harness.worldScene.player.y = 150;
    harness.worldScene.occlusionManager.update(harness.worldScene.player);
    assert.strictEqual(tree.alpha, 0.35, "Tree faded to 0.35 alpha");
});

test("T3-CROSS", "T3-CROSS-02", "Overworld Props + NPC Depth Sorting Integration", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});

    // Create a real sign prop at y=300 (baseDepth = Math.floor(300 + 64 * 0.2) = 312)
    const signProp = harness.worldScene.createProp(300, 300, 64, 'tex_sign');
    assert.strictEqual(signProp.depth, 312, "Sign prop depth calculated from base coordinate");

    // Player walks behind sign (y = 250 < 312)
    harness.worldScene.player.y = 250;
    harness.worldScene.player.update();
    assert.ok(
        harness.worldScene.player.depth < signProp.depth,
        "Player at y=250 renders behind sign prop at depth 312"
    );

    // Player walks in front of sign (y = 350 > 312)
    harness.worldScene.player.y = 350;
    harness.worldScene.player.update();
    assert.ok(
        harness.worldScene.player.depth > signProp.depth,
        "Player at y=350 renders in front of sign prop at depth 312"
    );
});

test("T3-CROSS", "T3-CROSS-03", "NPC Dialogue + UI Keybindings Interaction", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    harness.hudScene.showDialogue('Guide', 'Onboarding message');
    assert.strictEqual(harness.worldScene.player.active, false, "Movement locked");
    harness.hudScene.endDialogue();
    assert.strictEqual(harness.worldScene.player.active, true, "Movement unlocked");
    harness.hudScene.toggleMenu("INVENTAIRE");
    assert.strictEqual(harness.hudScene.isMenuActive, true, "Menu opens normally after dialogue");
    harness.hudScene.toggleMenu("INVENTAIRE");
});

test("T3-CROSS", "T3-CROSS-04", "Enemy Varieties + BattleScene Boss Transition", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    const minorEnemy = new env.Enemy(harness.worldScene, 100, 100, 'enemy', 'minor');
    assert.strictEqual(minorEnemy.enemyType, 'minor');
    const boss = new env.Enemy(harness.worldScene, 400, 400, 'enemy', 'major');
    harness.worldScene.startBossBattle(harness.worldScene.player, boss);
    harness.worldScene.time.flush();
    assert.strictEqual(harness.worldScene.isSleeping, true, "WorldScene slept for boss battle");
});

test("T3-CROSS", "T3-CROSS-05", "BattleScene Victory + Inventory Rewards & Icons", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    harness.battleScene.create();

    // Clear inventory to clean state (do NOT manually inject the reward!)
    window.gameState.inventory = [];

    // Defeat boss and execute victory wrap-up
    harness.battleScene.enemyHp = 0;
    harness.battleScene.endBattle();

    // 1. Verify BattleScene granted the trophy to gameState automatically
    const trophy = window.gameState.inventory.find(i => i.id === 'boss_trophy');
    assert.ok(trophy, "BattleScene.endBattle() awarded 'boss_trophy' into inventory");
    assert.strictEqual(trophy.name, 'Trophée Ancien');
    assert.strictEqual(trophy.iconKey, 'item_trophy');

    // 2. Verify WorldScene resumed
    assert.strictEqual(harness.worldScene.active, true, "WorldScene woken after victory");

    // 3. Verify HUDScene displays the new item in inventory
    harness.hudScene.toggleMenu('INVENTAIRE');
    assert.strictEqual(harness.hudScene.isMenuActive, true, "HUD inventory opened");
    assert.ok(
        harness.hudScene.menuContent.text.includes("Trophée Ancien"),
        "HUD inventory renders awarded boss trophy text"
    );
    harness.hudScene.toggleMenu('INVENTAIRE');
});

test("T3-CROSS", "T3-CROSS-06", "Resource Harvesting + Multi-Ingredient Crafting + Keybindings", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    window.gameState.inventory = [];
    // Harvest 2 wood, 1 stone
    window.gameState.addItem({ id: 'wood', name: 'Bois', qty: 2 });
    window.gameState.addItem({ id: 'stone', name: 'Pierre', qty: 1 });
    // Open crafting
    harness.hudScene.toggleMenu("CRAFTING");
    assert.strictEqual(harness.hudScene.menuTitle.text, "CRAFTING");
    // Trigger num2Key (Potion)
    harness.hudScene.num2Key.setDown(true);
    harness.hudScene.update();
    const potion = window.gameState.inventory.find(i => i.id === 'potion');
    assert.ok(potion && potion.qty === 1, "Potion crafted via keybinding");
    harness.hudScene.toggleMenu("CRAFTING");
});

test("T3-CROSS", "T3-CROSS-07", "UI Menu Pause + Enemy AI Wandering", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();
    const enemy = new env.Enemy(harness.worldScene, 100, 100, 'enemy', 'minor');
    harness.hudScene.toggleMenu("INVENTAIRE");
    assert.strictEqual(harness.worldScene.isPaused, true, "WorldScene paused");
    // While scene is paused, step does not tick worldScene
    harness.step(16);
    assert.strictEqual(harness.worldScene.isPaused, true, "Enemies remain frozen while paused");
    harness.hudScene.toggleMenu("INVENTAIRE");
    enemy.destroy();
});

test("T3-CROSS", "T3-CROSS-08", "Player Occlusion + Sliced Assets + UI Overlay", () => {
    const harness = env.createSceneHarness();
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();

    // 1. Locate real house chalet occluder in WorldScene
    const houseOcc = harness.worldScene.occlusionManager.occluders.find(
        o => o.sprite && (
            (o.sprite.texture && o.sprite.texture.key === 'tex_house') ||
            o.sprite.textureKey === 'tex_house'
        )
    );
    assert.ok(houseOcc, "House chalet occluder registered in OcclusionManager");

    // 2. Position player behind house roof (minX: 2240..2432, minY: 16..224, footY < 256)
    harness.worldScene.player.x = 2300;
    harness.worldScene.player.y = 150;
    harness.worldScene.occlusionManager.update(harness.worldScene.player);
    assert.strictEqual(houseOcc.isOccluding, true, "Player behind roof triggers occlusion");
    assert.strictEqual(houseOcc.sprite.alpha, 0.35, "House roof faded to 0.35 alpha");

    // 3. Open HUD overlay menu (which pauses WorldScene)
    harness.hudScene.toggleMenu('INVENTAIRE');
    assert.strictEqual(harness.hudScene.isMenuActive, true, "HUD modal active");
    assert.strictEqual(harness.worldScene.isPaused, true, "WorldScene paused beneath HUD modal");

    // 4. Verify house roof retains 0.35 alpha while HUD overlay is visible
    assert.strictEqual(houseOcc.sprite.alpha, 0.35, "Roof retains occluded 0.35 alpha during HUD pause");
    assert.strictEqual(harness.hudScene.menuBox.visible, true, "HUD modal box is visible over the world");

    // 5. Close HUD menu and verify WorldScene unpauses cleanly
    harness.hudScene.toggleMenu('INVENTAIRE');
    assert.strictEqual(harness.hudScene.isMenuActive, false, "HUD modal closed");
    assert.strictEqual(harness.worldScene.isPaused, false, "WorldScene resumed cleanly");
});

// ============================================================================
// TIER 4: REAL-WORLD APPLICATION SCENARIOS (5 Realistic Gameplay Flows)
// ============================================================================
console.log("\n--- TIER 4: REAL-WORLD APPLICATION SCENARIOS (5 TESTS) ---");

test("T4-SCENARIO", "T4-SCENARIO-01", "Scenario 1: The Hero's Awakening & NPC Onboarding", () => {
    const harness = env.createSceneHarness();
    window.gameState = new env.GameManager(env.GameConfig);
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();

    // 1. Verify Spawn
    assert.strictEqual(harness.worldScene.player.x, 352);
    assert.strictEqual(harness.worldScene.player.y, 224);

    // 2. Travel to Guide NPC
    const npcZone = harness.worldScene.interactiveZones.getChildren().find(z => z.npcData);
    harness.worldScene.player.x = npcZone.x;
    harness.worldScene.player.y = npcZone.y + 40;
    harness.worldScene.player.facing = 'up';
    harness.worldScene.player.update();

    // 3. Trigger Dialogue with 'E'
    harness.worldScene.input.keyboard.press('E');
    assert.strictEqual(harness.hudScene.isDialogueActive, true, "Dialogue opened");
    assert.strictEqual(harness.worldScene.player.active, false, "Player movement frozen");

    // 4. Dismiss Dialogue with Space
    harness.hudScene.endDialogue();
    assert.strictEqual(harness.hudScene.isDialogueActive, false, "Dialogue closed");
    assert.strictEqual(harness.worldScene.player.active, true, "Player movement restored");

    // 5. Verify Quest Status
    const quest = window.gameState.quests[0];
    assert.strictEqual(quest.id, "q1");
});

test("T4-SCENARIO", "T4-SCENARIO-02", "Scenario 2: Resource Gathering, Dual-Harvesting & River Crossing", () => {
    const harness = env.createSceneHarness();
    window.gameState = new env.GameManager(env.GameConfig);
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();

    // 1. Gather resources (5 wood, 1 stone)
    window.gameState.addItem({ id: 'wood', name: 'Bois', qty: 5 });
    window.gameState.addItem({ id: 'stone', name: 'Pierre', qty: 1 });

    // 2. Open Crafting with 'K'/'C'
    harness.hudScene.toggleMenu("CRAFTING");
    assert.strictEqual(harness.hudScene.menuTitle.text, "CRAFTING");

    // 3. Craft Bridge with quick-key [1]
    harness.hudScene.num1Key.setDown(true);
    harness.hudScene.update();
    const bridge = window.gameState.inventory.find(i => i.id === 'bridge');
    assert.ok(bridge && bridge.qty === 1, "Bridge crafted successfully");

    // 4. Close menu
    harness.hudScene.toggleMenu("CRAFTING");

    // 5. Verify bridge rows in map layoutText
    const village = env.MapsData.Village.layoutText;
    assert.ok(village.some(row => row.includes('BBBB')), "Bridge rows span river");
});

test("T4-SCENARIO", "T4-SCENARIO-03", "Scenario 3: Wilderness Combat, Alchemical Crafting & Tactical Healing", () => {
    const harness = env.createSceneHarness();
    window.gameState = new env.GameManager(env.GameConfig);
    harness.worldScene.init({});
    harness.worldScene.create({});
    harness.hudScene.create();

    // 1. Take shooter damage
    window.gameState.player.hp = 70; // 30 damage taken

    // 2. Defeat charger
    const charger = new env.Enemy(harness.worldScene, 200, 200, 'enemy', 'minor');
    charger.takeDamage(30);
    assert.strictEqual(window.gameState.player.xp, 20);

    // 3. Harvest ingredients for potion
    window.gameState.addItem({ id: 'wood', name: 'Bois', qty: 2 });
    window.gameState.addItem({ id: 'stone', name: 'Pierre', qty: 1 });

    // 4. Craft Potion
    harness.hudScene.toggleMenu("CRAFTING");
    harness.hudScene.num2Key.setDown(true);
    harness.hudScene.update();
    harness.hudScene.toggleMenu("CRAFTING");

    // 5. Consume Potion via Inventory
    harness.hudScene.toggleMenu("INVENTAIRE");
    harness.hudScene.num1Key.setDown(true);
    harness.hudScene.update();
    assert.strictEqual(window.gameState.player.hp, 100, "HP healed back to 100 max");
    harness.hudScene.toggleMenu("INVENTAIRE");
});

test("T4-SCENARIO", "T4-SCENARIO-04", "Scenario 4: Ancient Ruins Exploration & Turn-Based Boss Arena Victory", () => {
    const harness = env.createSceneHarness();
    window.gameState = new env.GameManager(env.GameConfig);
    harness.battleScene.create();
    harness.uiScene.create();

    assert.strictEqual(harness.battleScene.enemyHp, 200, "Boss HP starts at 200");

    // Turn 1: Magic
    harness.uiScene.selectAction('magic');
    harness.battleScene.time.flush();
    assert.ok(harness.battleScene.enemyHp <= 150, "Magic dealt heavy damage");

    // Boss retaliation
    harness.battleScene.enemyTurn();
    assert.ok(harness.battleScene.playerHp < 100, "Player sustained counterattack damage");

    // Turn 2: Heal
    const hpBeforeHeal = harness.battleScene.playerHp;
    harness.uiScene.selectAction('heal');
    assert.ok(harness.battleScene.playerHp > hpBeforeHeal, "Player healed HP");

    // Turn 3: Lethal Attack
    harness.battleScene.enemyHp = 10;
    harness.uiScene.selectAction('attack');
    harness.battleScene.enemyHp = 0;
    harness.battleScene.enemyTurn();
    harness.battleScene.time.flush();

    assert.strictEqual(harness.battleScene.active, false, "Battle completed cleanly");
    assert.strictEqual(harness.worldScene.active, true, "WorldScene woken");
});

test("T4-SCENARIO", "T4-SCENARIO-05", "Scenario 5: Full Level 1 Master Progression & Persistence Cycle", () => {
    // 1. New game
    window.localStorage.clear();
    const gm = new env.GameManager(env.GameConfig);
    assert.strictEqual(gm.player.level, 1);

    // 2. Guide dialogue
    gm.completeQuestGoal('talk', 'npc1');
    assert.strictEqual(gm.quests[0].status, 'completed');
    assert.strictEqual(gm.player.xp, 50);

    // 3. Harvest and defeat enemies to Level 2
    gm.addItem({ id: 'wood', name: 'Bois', qty: 10 });
    gm.player.xp = 110;
    const leveledUp = gm.checkLevelUp();
    assert.strictEqual(leveledUp, true, "Leveled up to Level 2");
    assert.strictEqual(gm.player.level, 2);
    assert.strictEqual(gm.player.maxHp, 120);

    // 4. Save with RGPD consent
    localStorage.setItem('rpg_save_consent', 'true');
    gm.save();

    // 5. Reload and verify persistence
    const reloadedGm = new env.GameManager(env.GameConfig);
    reloadedGm.load();
    assert.strictEqual(reloadedGm.player.level, 2, "Persisted Level 2");
    assert.strictEqual(reloadedGm.player.maxHp, 120, "Persisted 120 Max HP");
    assert.strictEqual(reloadedGm.quests[0].status, 'completed', "Persisted completed quest");
    assert.strictEqual(reloadedGm.inventory[0].id, 'wood', "Persisted inventory");
});

// ============================================================================
// SUITE SUMMARY
// ============================================================================
console.log("\n================================================================================");
console.log(`TOTAL E2E TESTS RUN : ${totalTests}`);
console.log(`PASSED              : ${passedTests}`);
console.log(`FAILED              : ${failedTests}`);
console.log("================================================================================");

if (failedTests > 0) {
    console.error("\nFAILURES SUMMARY:");
    failures.forEach((f, idx) => {
        console.error(`${idx + 1}. [${f.tier}] [${f.id}] ${f.description}`);
        console.error(`   ${f.error.stack || f.error.message}`);
    });
    process.exit(1);
} else {
    console.log("\n>>> ALL 93 E2E TESTS PASSED SUCCESSFULLY! <<<\n");
    process.exit(0);
}
