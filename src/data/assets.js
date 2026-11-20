/**
 * src/data/assets.js
 * Central Asset Manifest & 2.5D Spatial Configuration
 * Compatible with Browser (global window) and Node.js (CommonJS).
 */

const ASSET_KEYS = {
    // Items & Icons
    ITEM_WOOD: 'item_wood',
    ITEM_STONE: 'item_stone',
    ITEM_POTION: 'item_potion',
    ITEM_BRIDGE: 'item_bridge',
    ITEM_COINS: 'item_coins',
    ITEM_SWORD_UPGRADE: 'item_sword_upgrade',
    ITEM_TROPHY: 'item_trophy',

    // Environmental Props & Interactables
    PROP_TREE_LARGE: 'prop_tree_large',
    PROP_TREE_SMALL: 'prop_tree_small',
    PROP_BUSH: 'prop_bush',
    PROP_ROCK: 'prop_rock',
    PROP_ROCK_LARGE: 'prop_rock_large',
    PROP_ROCK_SMALL: 'prop_rock_small',
    PROP_CANOPY_WALL: 'prop_canopy_wall',
    PROP_FLOWER_PATCH: 'prop_flower_patch',
    PROP_RUIN: 'prop_ruin',
    PROP_CHEST_CLOSED: 'prop_chest_closed',
    PROP_CHEST_OPENED: 'prop_chest_opened',
    PROP_HOUSE: 'prop_house',
    PROP_CLIFF: 'prop_cliff',
    PROP_SIGN: 'prop_sign',
    PROP_FENCE: 'prop_fence',
    PROP_WALL: 'prop_wall',
    PROP_SHADOW: 'prop_shadow',

    // Characters & NPCs
    HERO: 'hero',
    NPC_GUIDE: 'npc_guide',
    NPC_ELDER: 'npc_elder',

    // Monsters & Bosses
    MONSTER_SLIME: 'monster_slime',
    MONSTER_SHOOTER: 'monster_shooter',
    MONSTER_BOSS: 'monster_boss',
    ENEMY_LEGACY: 'enemy',

    // UI & VFX
    BATTLE_BG: 'battle_bg',
    UI_PANEL: 'ui_panel',
    UI_FRAME: 'ui_frame',
    UI_BADGE_BANNER: 'ui_badge_banner',
    VFX_LEAF: 'vfx_leaf'
};

const ASSET_MANIFEST = {
    // ==========================================
    // 1. ITEMS & INVENTORY ICONS (assets/items/)
    // ==========================================
    [ASSET_KEYS.ITEM_WOOD]: {
        key: ASSET_KEYS.ITEM_WOOD,
        path: 'assets/items/wood.png',
        category: 'item',
        type: 'image',
        width: 32,
        height: 32,
        anchor: { x: 0.5, y: 0.5 },
        scale: 1.0,
        name: 'Bois',
        desc: 'Matériau de construction de base récolté sur les buissons.'
    },
    [ASSET_KEYS.ITEM_STONE]: {
        key: ASSET_KEYS.ITEM_STONE,
        path: 'assets/items/stone.png',
        category: 'item',
        type: 'image',
        width: 32,
        height: 32,
        anchor: { x: 0.5, y: 0.5 },
        scale: 1.0,
        name: 'Pierre',
        desc: 'Roche solide récoltée sur les blocs rocheux.'
    },
    [ASSET_KEYS.ITEM_POTION]: {
        key: ASSET_KEYS.ITEM_POTION,
        path: 'assets/items/potion.png',
        category: 'item',
        type: 'image',
        width: 32,
        height: 32,
        anchor: { x: 0.5, y: 0.5 },
        scale: 1.0,
        name: 'Potion de Soin',
        desc: 'Restaure jusqu\'à 30 points de vie.'
    },
    [ASSET_KEYS.ITEM_BRIDGE]: {
        key: ASSET_KEYS.ITEM_BRIDGE,
        path: 'assets/items/bridge.png',
        category: 'item',
        type: 'image',
        width: 32,
        height: 32,
        anchor: { x: 0.5, y: 0.5 },
        scale: 1.0,
        name: 'Pont en Bois',
        desc: 'Permet de traverser la rivière vers les terres sauvages.'
    },
    [ASSET_KEYS.ITEM_COINS]: {
        key: ASSET_KEYS.ITEM_COINS,
        path: 'assets/items/coins.png',
        category: 'item',
        type: 'image',
        width: 32,
        height: 32,
        anchor: { x: 0.5, y: 0.5 },
        scale: 1.0,
        name: 'Pièces d\'Or',
        desc: 'Monnaie utilisée pour le commerce.'
    },
    [ASSET_KEYS.ITEM_SWORD_UPGRADE]: {
        key: ASSET_KEYS.ITEM_SWORD_UPGRADE,
        path: 'assets/items/sword_upgrade.png',
        category: 'item',
        type: 'image',
        width: 32,
        height: 32,
        anchor: { x: 0.5, y: 0.5 },
        scale: 1.0,
        name: 'Pierre à Aiguiser',
        desc: 'Augmente la puissance des attaques physiques.'
    },
    [ASSET_KEYS.ITEM_TROPHY]: {
        key: ASSET_KEYS.ITEM_TROPHY,
        path: 'assets/items/trophy.png',
        category: 'item',
        type: 'image',
        width: 32,
        height: 32,
        anchor: { x: 0.5, y: 0.5 },
        scale: 1.0,
        name: 'Trophée Ancien',
        desc: 'Relique glorieuse obtenue en terrassant le Gardien des Ruines.'
    },

    // ==========================================
    // 2. ENVIRONMENT PROPS (assets/props/)
    // ==========================================
    [ASSET_KEYS.PROP_TREE_LARGE]: {
        key: ASSET_KEYS.PROP_TREE_LARGE,
        path: 'assets/props/tree_large.png',
        category: 'prop',
        type: 'image',
        width: 128,
        height: 160,
        anchor: { x: 0.5, y: 0.95 },
        scale: 1.0,
        footprint: { width: 36, height: 18, offsetY: 5 },
        occlusion: {
            enabled: true,
            targetAlpha: 0.35,
            boundsOffset: { minX: -64, maxX: 64, minY: -150, maxY: -20 }
        }
    },
    [ASSET_KEYS.PROP_TREE_SMALL]: {
        key: ASSET_KEYS.PROP_TREE_SMALL,
        path: 'assets/props/tree_small.png',
        category: 'prop',
        type: 'image',
        width: 64,
        height: 96,
        anchor: { x: 0.5, y: 0.95 },
        scale: 1.0,
        footprint: { width: 24, height: 14, offsetY: 4 },
        occlusion: {
            enabled: true,
            targetAlpha: 0.35,
            boundsOffset: { minX: -32, maxX: 32, minY: -90, maxY: -15 }
        }
    },
    [ASSET_KEYS.PROP_BUSH]: {
        key: ASSET_KEYS.PROP_BUSH,
        path: 'assets/props/bush.png',
        category: 'prop',
        type: 'image',
        width: 64,
        height: 64,
        anchor: { x: 0.5, y: 0.85 },
        scale: 1.0,
        footprint: { width: 28, height: 20, offsetY: 0 },
        harvestable: true,
        yields: 'wood'
    },
    [ASSET_KEYS.PROP_ROCK]: {
        key: ASSET_KEYS.PROP_ROCK,
        path: 'assets/props/rock.png',
        category: 'prop',
        type: 'image',
        width: 64,
        height: 48,
        anchor: { x: 0.5, y: 0.85 },
        scale: 1.0,
        footprint: { width: 28, height: 20, offsetY: 0 },
        harvestable: true,
        yields: 'stone'
    },
    [ASSET_KEYS.PROP_ROCK_LARGE]: {
        key: ASSET_KEYS.PROP_ROCK_LARGE,
        path: 'assets/props/rock_large.png',
        category: 'prop',
        type: 'image',
        width: 96,
        height: 80,
        anchor: { x: 0.5, y: 0.85 },
        scale: 1.0,
        footprint: { width: 48, height: 24, offsetY: 0 },
        harvestable: true,
        yields: 'stone'
    },
    [ASSET_KEYS.PROP_ROCK_SMALL]: {
        key: ASSET_KEYS.PROP_ROCK_SMALL,
        path: 'assets/props/rock_small.png',
        category: 'prop',
        type: 'image',
        width: 64,
        height: 64,
        anchor: { x: 0.5, y: 0.85 },
        scale: 1.0,
        footprint: { width: 28, height: 20, offsetY: 0 },
        harvestable: true,
        yields: 'stone'
    },
    [ASSET_KEYS.PROP_CANOPY_WALL]: {
        key: ASSET_KEYS.PROP_CANOPY_WALL,
        path: 'assets/props/canopy_wall.png',
        category: 'prop',
        type: 'image',
        width: 564,
        height: 138,
        anchor: { x: 0.5, y: 0.95 },
        scale: 1.0,
        footprint: { width: 560, height: 32, offsetY: 0 }
    },
    [ASSET_KEYS.PROP_FLOWER_PATCH]: {
        key: ASSET_KEYS.PROP_FLOWER_PATCH,
        path: 'assets/props/flower_patch.png',
        category: 'prop',
        type: 'image',
        width: 64,
        height: 64,
        anchor: { x: 0.5, y: 0.85 },
        scale: 1.0
    },
    [ASSET_KEYS.PROP_RUIN]: {
        key: ASSET_KEYS.PROP_RUIN,
        path: 'assets/props/ruin.png',
        category: 'prop',
        type: 'image',
        width: 64,
        height: 80,
        anchor: { x: 0.5, y: 0.85 },
        scale: 1.0,
        footprint: { width: 44, height: 24, offsetY: 0 }
    },
    [ASSET_KEYS.PROP_CHEST_CLOSED]: {
        key: ASSET_KEYS.PROP_CHEST_CLOSED,
        path: 'assets/props/chest_closed.png',
        category: 'prop',
        type: 'image',
        width: 64,
        height: 64,
        anchor: { x: 0.5, y: 0.85 },
        scale: 1.0,
        footprint: { width: 32, height: 20, offsetY: 0 }
    },
    [ASSET_KEYS.PROP_CHEST_OPENED]: {
        key: ASSET_KEYS.PROP_CHEST_OPENED,
        path: 'assets/props/chest_opened.png',
        category: 'prop',
        type: 'image',
        width: 64,
        height: 64,
        anchor: { x: 0.5, y: 0.85 },
        scale: 1.0,
        footprint: { width: 32, height: 20, offsetY: 0 }
    },
    [ASSET_KEYS.PROP_HOUSE]: {
        key: ASSET_KEYS.PROP_HOUSE,
        path: 'assets/props/house.png',
        category: 'prop',
        type: 'image',
        width: 192,
        height: 240,
        anchor: { x: 0.5, y: 1.0 },
        scale: 1.0,
        occlusion: {
            enabled: true,
            targetAlpha: 0.35
        }
    },
    [ASSET_KEYS.PROP_CLIFF]: {
        key: ASSET_KEYS.PROP_CLIFF,
        path: 'assets/props/cliff.png',
        category: 'prop',
        type: 'image',
        width: 64,
        height: 64,
        anchor: { x: 0.5, y: 0.5 },
        scale: 1.0
    },
    [ASSET_KEYS.PROP_SIGN]: {
        key: ASSET_KEYS.PROP_SIGN,
        path: 'assets/props/sign.png',
        category: 'prop',
        type: 'image',
        width: 64,
        height: 64,
        anchor: { x: 0.5, y: 0.85 },
        scale: 1.0
    },
    [ASSET_KEYS.PROP_FENCE]: {
        key: ASSET_KEYS.PROP_FENCE,
        path: 'assets/props/fence.png',
        category: 'prop',
        type: 'image',
        width: 64,
        height: 64,
        anchor: { x: 0.5, y: 0.85 },
        scale: 1.0
    },
    [ASSET_KEYS.PROP_SHADOW]: {
        key: ASSET_KEYS.PROP_SHADOW,
        path: 'assets/props/shadow.png',
        category: 'prop',
        type: 'image',
        width: 64,
        height: 32,
        anchor: { x: 0.5, y: 0.5 },
        scale: 1.0
    },
    [ASSET_KEYS.PROP_WALL]: {
        key: ASSET_KEYS.PROP_WALL,
        path: 'assets/props/wall.png',
        category: 'prop',
        type: 'image',
        width: 64,
        height: 64,
        anchor: { x: 0.5, y: 0.5 },
        scale: 1.0
    },

    // ==========================================
    // 3. CHARACTERS & NPCS (assets/characters/)
    // ==========================================
    [ASSET_KEYS.HERO]: {
        key: ASSET_KEYS.HERO,
        path: 'assets/hero_spritesheet.png',
        category: 'character',
        type: 'spritesheet',
        frameWidth: 341,
        frameHeight: 256,
        anchor: { x: 0.5, y: 0.95 },
        scale: 0.15,
        footprint: { width: 120, height: 67, offsetX: 111, offsetY: 180 }
    },
    [ASSET_KEYS.NPC_GUIDE]: {
        key: ASSET_KEYS.NPC_GUIDE,
        path: 'assets/characters/npc_guide.png',
        category: 'character',
        type: 'image',
        width: 48,
        height: 64,
        anchor: { x: 0.5, y: 0.90 },
        scale: 1.0,
        footprint: { width: 28, height: 20, offsetY: 0 }
    },
    [ASSET_KEYS.NPC_ELDER]: {
        key: ASSET_KEYS.NPC_ELDER,
        path: 'assets/characters/npc_elder.png',
        category: 'character',
        type: 'image',
        width: 64,
        height: 64,
        anchor: { x: 0.5, y: 0.90 },
        scale: 1.0,
        footprint: { width: 28, height: 20, offsetY: 0 }
    },

    // ==========================================
    // 4. MONSTERS & BOSSES (assets/monsters/)
    // ==========================================
    [ASSET_KEYS.MONSTER_SLIME]: {
        key: ASSET_KEYS.MONSTER_SLIME,
        path: 'assets/monsters/slime_charger.png',
        category: 'monster',
        subType: 'minor',
        type: 'image',
        width: 64,
        height: 64,
        anchor: { x: 0.5, y: 0.95 },
        scale: 1.0,
        footprint: { width: 36, height: 18, offsetY: 0 },
        hp: 30
    },
    [ASSET_KEYS.MONSTER_SHOOTER]: {
        key: ASSET_KEYS.MONSTER_SHOOTER,
        path: 'assets/monsters/goblin_shooter.png',
        category: 'monster',
        subType: 'shooter',
        type: 'image',
        width: 64,
        height: 64,
        anchor: { x: 0.5, y: 0.95 },
        scale: 1.0,
        footprint: { width: 36, height: 18, offsetY: 0 },
        hp: 40
    },
    [ASSET_KEYS.MONSTER_BOSS]: {
        key: ASSET_KEYS.MONSTER_BOSS,
        path: 'assets/monsters/boss_guardian.png',
        category: 'monster',
        subType: 'major',
        type: 'image',
        width: 128,
        height: 128,
        anchor: { x: 0.5, y: 0.95 },
        scale: 1.0,
        footprint: { width: 72, height: 36, offsetY: 0 },
        hp: 200
    },
    [ASSET_KEYS.ENEMY_LEGACY]: {
        key: ASSET_KEYS.ENEMY_LEGACY,
        path: 'assets/enemy.png',
        category: 'monster',
        subType: 'minor',
        type: 'image',
        width: 1024,
        height: 1024,
        anchor: { x: 0.5, y: 0.95 },
        scale: 0.12,
        footprint: { width: 300, height: 150, offsetX: 362, offsetY: 850 },
        hp: 30
    },

    // ==========================================
    // 5. UI & VFX (assets/ui/)
    // ==========================================
    [ASSET_KEYS.BATTLE_BG]: {
        key: ASSET_KEYS.BATTLE_BG,
        path: 'assets/ui/battle_bg.png',
        category: 'ui',
        type: 'image',
        width: 800,
        height: 600,
        anchor: { x: 0, y: 0 },
        scale: 1.0
    },
    [ASSET_KEYS.UI_PANEL]: {
        key: ASSET_KEYS.UI_PANEL,
        path: 'assets/ui/panel_frame.png',
        category: 'ui',
        type: 'image',
        width: 128,
        height: 128,
        anchor: { x: 0, y: 0 },
        scale: 1.0
    },
    [ASSET_KEYS.UI_FRAME]: {
        key: ASSET_KEYS.UI_FRAME,
        path: 'assets/ui/ui_frame.png',
        category: 'ui',
        type: 'image',
        width: 298,
        height: 153,
        anchor: { x: 0, y: 0 },
        scale: 1.0
    },
    [ASSET_KEYS.UI_BADGE_BANNER]: {
        key: ASSET_KEYS.UI_BADGE_BANNER,
        path: 'assets/ui/badge_banner.png',
        category: 'ui',
        type: 'image',
        width: 273,
        height: 83,
        anchor: { x: 0, y: 0 },
        scale: 1.0
    },
    [ASSET_KEYS.VFX_LEAF]: {
        key: ASSET_KEYS.VFX_LEAF,
        path: 'assets/props/leaf.png',
        category: 'vfx',
        type: 'image',
        width: 6,
        height: 6,
        anchor: { x: 0.5, y: 0.5 },
        scale: 1.0
    }
};

// ==========================================
// 6. LEGACY ALIAS MAPPING (Zero Regression)
// ==========================================
const LEGACY_ALIASES = {
    // Semantic item aliases
    'wood': ASSET_KEYS.ITEM_WOOD,
    'stone': ASSET_KEYS.ITEM_STONE,
    'potion': ASSET_KEYS.ITEM_POTION,
    'bridge': ASSET_KEYS.ITEM_BRIDGE,
    'coins': ASSET_KEYS.ITEM_COINS,
    'sword_upgrade': ASSET_KEYS.ITEM_SWORD_UPGRADE,
    'trophy': ASSET_KEYS.ITEM_TROPHY,
    'boss_trophy': ASSET_KEYS.ITEM_TROPHY,

    // Scene aliases
    'tiles': ASSET_KEYS.BATTLE_BG, // Heals BattleScene.js line 8 missing texture
    'tex_tree': ASSET_KEYS.PROP_TREE_LARGE,
    'tex_tree_small': ASSET_KEYS.PROP_TREE_SMALL,
    'tex_bush': ASSET_KEYS.PROP_BUSH,
    'tex_cliff': ASSET_KEYS.PROP_CLIFF,
    'tex_house': ASSET_KEYS.PROP_HOUSE,
    'tex_ruin': ASSET_KEYS.PROP_RUIN,
    'tex_ruin_small': ASSET_KEYS.PROP_ROCK,
    'tex_sign': ASSET_KEYS.PROP_SIGN,
    'tex_fence': ASSET_KEYS.PROP_FENCE,
    'tex_chest_closed': ASSET_KEYS.PROP_CHEST_CLOSED,
    'tex_chest_opened': ASSET_KEYS.PROP_CHEST_OPENED,
    'tex_npc': ASSET_KEYS.NPC_GUIDE,
    'tex_shadow': ASSET_KEYS.PROP_SHADOW,
    'tex_leaf': ASSET_KEYS.VFX_LEAF,
    'tex_wall': ASSET_KEYS.PROP_WALL
};

// ==========================================
// 7. HELPER FUNCTIONS FOR SCENES & MANAGERS
// ==========================================
function getAsset(keyOrAlias) {
    if (!keyOrAlias) return null;
    const resolvedKey = LEGACY_ALIASES[keyOrAlias] || keyOrAlias;
    return ASSET_MANIFEST[resolvedKey] || null;
}

function preloadSceneAssets(scene, categories = null) {
    if (!scene || !scene.load || typeof scene.load.image !== 'function') return;
    const catFilter = categories ? (Array.isArray(categories) ? categories : [categories]) : null;

    Object.values(ASSET_MANIFEST).forEach(asset => {
        if (catFilter && !catFilter.includes(asset.category)) return;

        if (asset.type === 'spritesheet') {
            if (typeof scene.load.spritesheet === 'function') {
                scene.load.spritesheet(asset.key, asset.path, {
                    frameWidth: asset.frameWidth,
                    frameHeight: asset.frameHeight
                });
            }
        } else {
            scene.load.image(asset.key, asset.path);
        }
    });

    // Also register legacy aliases as alias image textures if needed
    Object.entries(LEGACY_ALIASES).forEach(([aliasKey, canonicalKey]) => {
        const canonicalAsset = ASSET_MANIFEST[canonicalKey];
        if (canonicalAsset && canonicalAsset.type === 'image') {
            if (!catFilter || catFilter.includes(canonicalAsset.category)) {
                scene.load.image(aliasKey, canonicalAsset.path);
            }
        }
    });
}

function applyAssetOrigin(sprite, keyOrAlias) {
    const asset = getAsset(keyOrAlias);
    if (sprite && asset && asset.anchor && typeof sprite.setOrigin === 'function') {
        sprite.setOrigin(asset.anchor.x, asset.anchor.y);
    }
}

// Global scope registration for browser environment
if (typeof window !== 'undefined') {
    window.ASSET_KEYS = ASSET_KEYS;
    window.ASSET_MANIFEST = ASSET_MANIFEST;
    window.LEGACY_ALIASES = LEGACY_ALIASES;
    window.getAsset = getAsset;
    window.preloadSceneAssets = preloadSceneAssets;
    window.applyAssetOrigin = applyAssetOrigin;
}

// CommonJS export for Node.js test environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ASSET_KEYS,
        ASSET_MANIFEST,
        LEGACY_ALIASES,
        getAsset,
        preloadSceneAssets,
        applyAssetOrigin
    };
}
