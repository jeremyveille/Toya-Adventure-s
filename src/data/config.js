/**
 * Configuration globale du jeu
 * Regroupe les données statiques (quêtes, recettes) pour séparer la logique métier des données.
 */
const GameConfig = {
    movement: {
        walkSpeed: 176, runSpeed: 272, acceleration: 1850, braking: 2400,
        walkFps: 8, interactionOffset: 32
    },
    combat: {
        windupMs: 70, strikeMs: 100, recoverMs: 145, reach: 44, width: 34,
        hurtMs: 680, knockbackMs: 110, knockbackSpeed: 125,
        sight: 150, approachSpeed: 72, warningRange: 62, warningMs: 480,
        lungeSpeed: 200, lungeMs: 205, restMs: 620, enemyDamage: 12
    },
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
    passageQuest: {
        id: 'passage', title: 'La navette du passeur',
        desc: 'Rapporter au guide la navette trouvée sur la terrasse.',
        status: 'active', goalType: 'deliver', goalTarget: 'navette'
    },
    passageHints: {
        meet: 'Rejoins le cristal du guide, à l’est.',
        cut: 'Coupe la ronce rouge au sud · Espace',
        cross: 'Traverse le pont · Maj pour courir',
        fight: 'Évite la charge, puis frappe · Espace',
        open: 'Monte les marches et ouvre le coffre.',
        return: 'Rapporte la navette au guide.',
        done: ''
    },
    recipes: {
        "bridge": { name: "Pont en Bois", cost: [{id: "wood", qty: 5}], result: {id: "bridge", name: "Pont en Bois", qty: 1} },
        "potion": { name: "Potion de Soin", cost: [{id: "wood", qty: 2}, {id: "stone", qty: 1}], result: {id: "potion", name: "Potion de Soin", qty: 1} }
    }
};

// Permet l'import dans Node.js pour les tests, tout en fonctionnant dans le navigateur (pas de module bundler)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameConfig;
}
