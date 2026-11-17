const assert = require('assert');
const GameConfig = require('../src/data/config.js');
const GameManager = require('../src/managers/GameManager.js');
const MapsData = require('../src/maps/maps.js');
const TutorialManager = require('../src/managers/TutorialManager.js');

global.localStorage = {
    data: {}, getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = String(value); }, removeItem(key) { delete this.data[key]; }
};
localStorage.setItem('rpg_save_consent', 'true');
let passed = 0;
function test(name, run) {
    run();
    passed++;
    console.log('[PASS tutorial] ' + name);
}
function level(gm) {
    const scene = {
        gameState: gm, currentMapData: MapsData.Village,
        player: { active: true, x: 9 * 64 + 32, y: 8 * 64 + 32, body: { velocity: { x: 0, y: 0 } }, shiftKey: { isDown: false } }
    };
    return { scene, tutorial: new TutorialManager(scene) };
}

test('full first-level sequence rewards once and survives a scene/save round trip', () => {
    const gm = new GameManager(GameConfig);
    const { scene, tutorial } = level(gm);
    assert(tutorial.getHint().includes('ZQSD'));
    scene.player.body.velocity.x = 100;
    tutorial.update();
    assert(tutorial.getHint().includes('Guide'));
    tutorial.onGuideInteraction(MapsData.Village.npcsData.N);
    assert.strictEqual(gm.quests.find(q => q.id === 'q1').status, 'completed');
    assert(tutorial.getHint().includes('buisson'));
    tutorial.onResourceCleared('Village:27:13');
    assert(tutorial.getHint().includes('pont'));
    scene.player.x = 27 * 64 + 32;
    scene.player.y = 17 * 64 + 32;
    scene.player.shiftKey.isDown = true;
    tutorial.update();
    assert.strictEqual(gm.world.tutorial.crossedBridge, true);
    assert.strictEqual(gm.world.tutorial.ran, true);
    assert.strictEqual(tutorial.canOpenChest('chest1'), false);
    tutorial.onEnemyDefeated('Village:27:18');
    assert.strictEqual(tutorial.canOpenChest('chest1'), true);
    tutorial.onChestOpened('chest1');
    const loaded = new GameManager(GameConfig);
    assert.strictEqual(loaded.load(), true);
    const resumed = level(loaded).tutorial;
    assert(resumed.getHint().includes('Retourne'));
    resumed.onGuideInteraction(MapsData.Village.npcsData.N);
    assert.strictEqual(loaded.world.tutorial.completed, true);
    assert.strictEqual(loaded.quests.find(q => q.id === 'village_intro').status, 'completed');
    const inventory = JSON.stringify(loaded.inventory);
    const xp = loaded.player.xp;
    resumed.onGuideInteraction(MapsData.Village.npcsData.N);
    assert.strictEqual(JSON.stringify(loaded.inventory), inventory);
    assert.strictEqual(loaded.player.xp, xp);
});

test('out-of-order exploration never locks progression and unrelated actors do not complete tutorial', () => {
    const gm = new GameManager(GameConfig);
    const { tutorial } = level(gm);
    tutorial.onResourceCleared('Village:4:12');
    tutorial.onEnemyDefeated('Village:1:1');
    assert.strictEqual(gm.world.tutorial.bushCleared, false);
    assert.strictEqual(gm.world.tutorial.enemyDefeated, false);
    assert.strictEqual(tutorial.canOpenChest('chest_house'), true);
    tutorial.onResourceCleared('Village:27:13');
    tutorial.onEnemyDefeated('Village:27:18');
    tutorial.onChestOpened('chest1');
    tutorial.onGuideInteraction(MapsData.Village.npcsData.N);
    assert.strictEqual(gm.world.tutorial.completed, true);
});

test('legacy v1 saves retain inventory and quest; missing world ledger is migrated', () => {
    localStorage.setItem('rpg_save_v1', JSON.stringify({
        player: { hp: 50, maxHp: 100, level: 1, xp: 50 },
        inventory: [{ id: 'wood', name: 'Bois', qty: 5 }],
        quests: [{ ...GameConfig.initialQuests[0], status: 'completed' }]
    }));
    const gm = new GameManager(GameConfig);
    assert.strictEqual(gm.load(), true);
    assert.strictEqual(gm.player.damage, 20);
    assert.strictEqual(gm.inventory[0].qty, 5);
    const tutorial = level(gm).tutorial;
    assert.strictEqual(gm.world.tutorial.talked, true);
    assert.strictEqual(gm.player.xp, 50);
    assert(gm.quests.some(q => q.id === 'village_intro'));
    assert(tutorial.getHint().includes('ZQSD'));
});

test('persistent object ledger rejects duplicates and malformed world data', () => {
    const gm = new GameManager(GameConfig);
    assert.strictEqual(gm.markWorldObject('openedChests', 'chest1'), true);
    assert.strictEqual(gm.markWorldObject('openedChests', 'chest1'), false);
    assert.strictEqual(gm.markWorldObject('tutorial', 'x'), false);
    const normalized = gm.createWorldState({ openedChests: ['a', 'a', 1], tutorial: { completed: 'true', talked: true } });
    assert.deepStrictEqual(normalized.openedChests, ['a']);
    assert.strictEqual(normalized.tutorial.completed, false);
    assert.strictEqual(normalized.tutorial.talked, true);
});

test('item effects are saved after use; full health and unknown items are not consumed', () => {
    const gm = new GameManager(GameConfig);
    gm.addItem({ id: 'wood', name: 'Bois', qty: 1 });
    assert.strictEqual(gm.useItem('wood'), false);
    assert.strictEqual(gm.inventory[0].qty, 1);
    gm.addItem({ id: 'potion', name: 'Potion', qty: 1 });
    assert.strictEqual(gm.useItem('potion'), false);
    gm.player.hp = 50;
    assert.strictEqual(gm.useItem('potion'), true);
    let saved = JSON.parse(localStorage.getItem('rpg_save_v1'));
    assert.strictEqual(saved.player.hp, 80);
    gm.addItem({ id: 'sword_upgrade', name: 'Pierre à Aiguiser', qty: 1 });
    assert.strictEqual(gm.useItem('sword_upgrade'), true);
    saved = JSON.parse(localStorage.getItem('rpg_save_v1'));
    assert.strictEqual(saved.player.damage, 25);
    assert(!saved.inventory.some(item => item.id === 'sword_upgrade'));
});

test('saved defeat and checkpoint restore recover without erasing progress', () => {
    const gm = new GameManager(GameConfig);
    gm.markWorldObject('openedChests', 'chest1');
    gm.player.hp = 0;
    gm.save();
    const loaded = new GameManager(GameConfig);
    loaded.load();
    assert.strictEqual(loaded.player.hp, loaded.player.maxHp);
    assert.strictEqual(loaded.isWorldObjectDone('openedChests', 'chest1'), true);
    loaded.player.hp = 1;
    loaded.restoreAtCheckpoint();
    assert.strictEqual(loaded.player.hp, loaded.player.maxHp);
});

test('map forces a cut through the cliff bank and provides a route to every tutorial objective', () => {
    const map = MapsData.Village;
    map.layoutText.forEach(row => assert.strictEqual(row.length, 40));
    const blocked = new Set(['T', 'C', 'W', 'H', 'R', 'x']);
    function reachable(gateOpen) {
        const seen = new Set(['9,8']);
        const queue = [[9, 8]];
        for (let i = 0; i < queue.length; i++) {
            const [x, y] = queue[i];
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + dx, ny = y + dy, key = nx + ',' + ny;
                if (seen.has(key) || !map.layoutText[ny] || !map.layoutText[ny][nx]) continue;
                if (blocked.has(map.layoutText[ny][nx]) || (!gateOpen && nx === 27 && ny === 13)) continue;
                seen.add(key); queue.push([nx, ny]);
            }
        }
        return seen;
    }
    assert.strictEqual(reachable(false).has('27,18'), false, 'Enemy must be beyond the blocking gate');
    const open = reachable(true);
    assert(open.has('10,7'));
    assert(open.has('27,18'));
    assert(open.has('28,20'));
    assert(open.has('35,5'), 'House path remains accessible');
});

console.log(`${passed} tutorial/persistence tests passed.`);
