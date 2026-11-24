/**
 * Configuration globale du jeu
 * Regroupe les données statiques (quêtes, recettes) pour séparer la logique métier des données.
 */
const GameConfig = {
    initialPlayerState: {
        level: 1,
        xp: 0,
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        gold: 0,
        damage: 20
    },
    initialEquipment: {
        weapon: null,
        armor: null,
        tool: null,
        accessory: null
    },
    resources: {
        "wood": { id: "wood", name: "Bois", category: "wood", rarity: "common", biome: "meadow", iconKey: "item_wood" },
        "stone": { id: "stone", name: "Pierre", category: "stone", rarity: "common", biome: "meadow", iconKey: "item_stone" },
        "herb": { id: "herb", name: "Herbe Médicinale", category: "plant", rarity: "common", biome: "meadow", iconKey: "item_herb" }
    },
    initialQuests: [
        { 
            id: "q1", 
            title: "L'Eveil du Héros", 
            desc: "Parlez à l'Ancien du village.", 
            status: "active",
            goalType: "talk",
            goalTarget: "npc1"
        }
    ],
    recipes: {
        "bridge": { name: "Pont en Bois", cost: [{id: "wood", qty: 5}], result: {id: "bridge", name: "Pont en Bois", qty: 1, iconKey: "item_bridge"} },
        "potion": { name: "Potion de Soin", cost: [{id: "wood", qty: 2}, {id: "stone", qty: 1}], result: {id: "potion", name: "Potion de Soin", qty: 1, iconKey: "item_potion"} },
        "hatchet": { name: "Hachette de Récolte", cost: [{id: "wood", qty: 2}, {id: "stone", qty: 1}, {id: "herb", qty: 1}], result: {id: "hatchet", name: "Hachette de Récolte", qty: 1, iconKey: "item_hatchet", slot: "tool", harvestBonus: 1} }
    }
};

// Permet l'import dans Node.js pour les tests, tout en fonctionnant dans le navigateur (pas de module bundler)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameConfig;
}
