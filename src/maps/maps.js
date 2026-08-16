const MapsData = {
    "Village": {
        tileSize: 64,
        layoutText: [
            "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
            "TCCCCCCCCCC...TTTTT..CCTTTT....T...HHH.T",
            "TCC.....CCC...TTTTT..CCTTTT....T...HHH.T",
            "TCC..S..CCC...TTTTT..CCTTTT....T...HHH.T",
            "TCC.....CCC.TTTTTTT.......T....T...d...T",
            "TCCCCCCCCCC.TTTTTTT.......T....T...d...T",
            "TTTT.TTT.....TTTTTT..T.........T...d...T",
            "TTT...T...N...TTTTT..T...TT........d...T",
            "TT........d....TTTT..T...TT....ddddd...T",
            "TTT......ddd.....T...T.........d.......T",
            "TTTT...ddddddd...T...T.........d.......T",
            "TTTT...dTTTTTd...T...T.........d.......T",
            "T......dTTTTTd...T...T.........d.......T",
            "T..R...dTTTTTd...T...T.........d.......T",
            "T......d..B..d.......T.........d.......T",
            "WWWWWWWWWWWWWWWWWWWWWWbbbbWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWWWWWWWWbbbbWWWWWWWWWWWWWW",
            "T.........E..........T.......dddddd....T",
            "T....................T.......d.........T",
            "T....................T.......d...RRR...T",
            "T....................T.......d...RRR...T",
            "T...o................TTTTTTTTd...RRR...T",
            "T............................d.........T",
            "T............................d.........T",
            "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT"
        ],
        npcsData: {
            "N": { id: "npc1", name: "Guide", dialogue: "Bienvenue.\nDétruis le buisson au sud [Espace].\nEnsuite, traverse le pont.\nPrends garde aux monstres !", questItem: null, questQty: null }
        },
        chestsData: {
            "o": { id: "chest1", item: { id: "potion", name: "Potion de Soin", qty: 3 }, opened: false }
        },
        doorsData: {
            // "H" will generate the house, the door will be at the bottom center of the House tiles
            houseDoorTarget: "House1",
            houseSpawn: {x: 4, y: 5}
        }
    },
    "House1": {
        tileSize: 64,
        layoutText: [
            "wwwwwwwww",
            "wfffffffw",
            "wfffffffw",
            "wfffofffw",
            "wfffffffw",
            "wfffffffw",
            "wwwwfwwww" // f is the door back
        ],
        npcsData: {},
        chestsData: {
            "o": { id: "chest_house", item: { id: "sword_upgrade", name: "Pierre à Aiguiser", qty: 1 }, opened: false }
        },
        doorsData: {
            "f_door": { targetMap: "Village", targetSpawn: {x: 35, y: 5} }
        }
    }
};
