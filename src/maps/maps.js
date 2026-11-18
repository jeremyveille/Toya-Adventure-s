const MapsData = {
    "Village": {
        tileSize: 64,
        passage: {
            gate: { x: 27, y: 13 }, landing: { x: 27, y: 17 },
            guard: { x: 28, y: 18 }, chestId: 'chest1'
        },
        terrace: { x: 29, y: 18, width: 3, height: 2, stairsX: 29 },
        layoutText: [
            "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
            "TCCCT.......t...T......CCTTTT......HHH.T",
            "TCC.....t.......T..t...CCTTTT..>...HHH.T",
            "TCC.........T...T......CCTTTT......HHH.T",
            "TCC.....t.......TTT...t.......T....dd..T",
            "TCC.......T.....TT............T....dd..T",
            "TTT..........T..TT..t...t..........d...T",
            "TT....T.........TT...TTT...........d...T",
            "TT......>...d.....TT...T......x..ddddd.T",
            "TTT......ddd.........T...t..t.x..d...x.T",
            "TTTT...ddddddd..T....T..dddddddddddd...T",
            "TTTT...d.....d.......T..S>Nd.....d.....T",
            "T...b..d..t..d.......T..dddd.....d.....T",
            "T..R...d.....d.......T...WWbWWW..d.....T",
            "T...r..d.....d..b....T...WWdWWW..d.....T",
            "WWWWWWWWWWWWWWWWWWWWWWWWWWBBBBWWWWWWWWWW",
            "WWWWWWWWWWWWWWWWWWWWWWWWWWBBBBWWWWWWWWWW",
            "T....................T....>d.dddddd....T",
            "T.....b........t.....T...t.dEd..t.x....T",
            "T..........................d.do..RRR...T",
            "T.......T............T.....ddd...RRR...T",
            "T.............t......T.......d...RRR...T",
            "T.................b..........d....r....T",
            "T..t......t..................d.........T",
            "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT"
        ],
        npcsData: {
            "N": { id: "npc1", name: "Guide", dialogue: "La ronce rouge ferme le passage. Face à elle, frappe avec Espace.", questItem: null, questQty: null }
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
