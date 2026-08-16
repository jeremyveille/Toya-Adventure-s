const MapsData = {
    "Village": {
        width: 30,
        height: 10,
        tileSize: 64, // On dessine des cases de 64x64
        // 0: herbe, 1: arbre (mur), 2: eau (mur), 3: maison, 4: chemin
        layout: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 3, 3, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 1],
            [1, 0, 4, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 4, 4, 4, 4, 4, 0, 0, 1],
            [1, 0, 4, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 4, 0, 0, 1],
            [1, 0, 4, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 4, 0, 0, 1],
            [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 4, 0, 0, 1],
            [1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 2, 2, 1],
            [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 4, 2, 2, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ],
        npcs: [
            { id: "npc1", x: 7, y: 3, name: "Guide", dialogue: "Bienvenue. Le monde est dangereux... \nPrends ce qui se trouve dans le coffre plus loin.\nN'oublie pas de te soigner si tu es blessé.", questItem: null, questQty: null }
        ],
        chests: [
            { id: "chest1", x: 13, y: 3, item: { id: "potion", name: "Potion de Soin", qty: 3 }, opened: false }
        ],
        enemies: [
            { x: 10, y: 4, type: "minor" }, // First enemy (Zone 3)
            { x: 19, y: 4, type: "minor" }  // Practice enemy (Zone 5)
        ],
        boss: null,
        resources: [
            { id: "bush1", x: 17, y: 4, type: "bush" }, // Blocking bush (Zone 5)
            { id: "bush2", x: 17, y: 3, type: "bush" }, // Blocking bush (Zone 5)
            { id: "bush3", x: 17, y: 5, type: "bush" }  // Blocking bush (Zone 5)
        ],
        doors: [
            { x: 22, y: 3, targetMap: "House1", targetSpawn: {x: 3, y: 4} },
            { x: 23, y: 3, targetMap: "House1", targetSpawn: {x: 3, y: 4} }
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
