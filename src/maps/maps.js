const MapsData = {
    "Village": {
        tileSize: 64,
        layoutText: [
            "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
            "TCCCT.......t...T......CCTTTT......HHH.T",
            "TCC.....t.......T..t...CCTTTT..>...HHH.T",
            "TCC..S......T...T......CCTTTT......HHH.T",
            "TCC.....t.......TTT...t.......T....d...T",
            "TCC.......T.....TT............T....d...T",
            "TTT..........T..TT..t...t..........d...T",
            "TT....T...N.....TT...TTT...........d...T",
            "TT......>...d.....TT...T......x..ddddd.T",
            "TTT......ddd.........T........x..d...x.T",
            "TTTT...ddddddd..T....T...........d.....T",
            "TTTT...d.....d.......T...t.......d.....T",
            "T...b..d..t..d.......T.........b.d.....T",
            "T..R...d.....d.......T...........d.....T",
            "T...r..d.....d..b....T...........d.....T",
            "WWWWWWWWWWWWWWWWWWWWWWWWWWBBBBWWWWWWWWWW",
            "WWWWWWWWWWWWWWWWWWWWWWWWWWBBBBWWWWWWWWWW",
            "T....................T.......dddddd....T",
            "T.....b....E...t.....T...t...d....x....T",
            "T............................d...RRR...T",
            "T.......T............T.......d...RRR...T",
            "T...o.........t......T.......d...RRR...T",
            "T.................b..........d....r....T",
            "T..t......t..................d.........T",
            "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT"
        ],
        npcsData: {
            "N": { id: "npc1", name: "Guide", dialogue: "Bienvenue.\nUn monde dangereux t'attend.\nDétruis le buisson au sud [Espace].\nTraverse le pont et reste sur tes gardes !", questItem: null, questQty: null }
        },
        chestsData: {
            "o": { id: "chest1", item: { id: "potion", name: "Potion de Soin", qty: 3 }, opened: false }
        },
        doorsData: {
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
