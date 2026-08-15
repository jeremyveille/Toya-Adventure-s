const MapsData = {
    "Village": {
        width: 15,
        height: 10,
        tileSize: 64, // On dessine des cases de 64x64
        // 0: herbe, 1: arbre (mur), 2: eau (mur), 3: maison, 4: chemin
        layout: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 3, 3, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 1],
            [1, 0, 3, 3, 4, 4, 4, 4, 4, 3, 3, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 0, 0, 0, 4, 0, 0, 0, 2, 2, 2, 0, 1],
            [1, 0, 0, 0, 0, 0, 4, 4, 4, 0, 2, 2, 2, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 4, 0, 2, 2, 2, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ],
        npcs: [
            { id: "npc1", x: 6, y: 3, name: "Ancien", dialogue: "Apporte-moi 5 morceaux de Bois, et je t'apprendrai à fabriquer un pont pour traverser l'eau !", questItem: "wood", questQty: 5 }
        ],
        chests: [
            { id: "chest1", x: 8, y: 3, item: { id: "potion", name: "Potion de Soin", qty: 2 }, opened: false }
        ],
        enemies: [
            { x: 4, y: 7, type: "minor" },
            { x: 12, y: 4, type: "shooter" } // Nouvel ennemi à distance
        ],
        boss: { x: 13, y: 8 },
        resources: [
            { id: "bush1", x: 3, y: 2, type: "bush" },
            { id: "bush2", x: 4, y: 2, type: "bush" },
            { id: "bush3", x: 3, y: 3, type: "bush" },
            { id: "rock1", x: 9, y: 6, type: "rock" },
            { id: "rock2", x: 10, y: 6, type: "rock" }
        ],
        doors: [
            { x: 2, y: 4, targetMap: "House1", targetSpawn: {x: 3, y: 4} },
            { x: 3, y: 4, targetMap: "House1", targetSpawn: {x: 3, y: 4} }
        ],
        spawn: { x: 2, y: 5 }
    },
    "House1": {
        width: 8,
        height: 6,
        tileSize: 64,
        layout: [
            [6, 6, 6, 6, 6, 6, 6, 6],
            [6, 5, 5, 5, 5, 5, 5, 6],
            [6, 5, 5, 5, 5, 5, 5, 6],
            [6, 5, 5, 5, 5, 5, 5, 6],
            [6, 5, 5, 5, 5, 5, 5, 6],
            [6, 6, 6, 5, 5, 6, 6, 6] // Porte en bas au centre
        ],
        npcs: [],
        chests: [
            { id: "chest_house", x: 6, y: 1, item: { id: "sword_upgrade", name: "Pierre à Aiguiser", qty: 1 }, opened: false }
        ],
        enemies: [],
        resources: [],
        doors: [
            { x: 3, y: 5, targetMap: "Village", targetSpawn: {x: 2, y: 5} },
            { x: 4, y: 5, targetMap: "Village", targetSpawn: {x: 2, y: 5} }
        ],
        spawn: { x: 3, y: 4 }
    }
};
