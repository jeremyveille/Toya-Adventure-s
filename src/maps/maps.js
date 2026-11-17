const MapsData = {
    "Village": {
        tileSize: 64,
        terraces: [{ x: 31, y: 20, width: 3, height: 2, stairsColumn: 1 }],
        layoutText: [
            "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
            "TCCCT.......t...T......CCTTTT......HHH.T",
            "TCC.....t.......T..t...CCTTTT..>...HHH.T",
            "TCC.........T...T......CCTTTT......HHH.T",
            "TCC.....t.......TTT...t.......T....d...T",
            "TCC.......T.....TT............T....d...T",
            "TTT..........T..TT..t...t..........d...T",
            "TT....T...N.....TT...TTT...........d...T",
            "TT......>S..d.....TT...T......x..ddddd.T",
            "TTT......ddddddddddddddddddd..x..d...x.T",
            "TTTT...ddddddd..T....T.....d.....d.....T",
            "TTTT...d.....d.......T...t.d.....d.....T",
            "T...b..d..t..d..b....T.....d.....d.....T",
            "TCCCCCCCCCCCCCCCCCCCCCCCCCCbCCCCCCCCCCCT",
            "T...r..d.....d.......T....dddd...d.....T",
            "WWWWWWWWWWWWWWWWWWWWWWWWWWBBBBWWWWWWWWWW",
            "WWWWWWWWWWWWWWWWWWWWWWWWWWBBBBWWWWWWWWWW",
            "T....................T....ddddddddd....T",
            "T.....b........t.....T...tdEdd....x....T",
            "T..........................ddd...RRR...T",
            "T.......T............T.....dod...RRR...T",
            "T.............t......T.......d...RRR...T",
            "T.................b..........d....r....T",
            "T..t......t..................d.........T",
            "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT"
        ],
        // Stable map coordinates are also the persistence IDs used by WorldScene.
        tutorial: {
            gateId: 'Village:27:13',
            enemyId: 'Village:27:18',
            chestId: 'chest1',
            guide: { x: 10, y: 7 },
            gate: { x: 27, y: 13 },
            bridge: { x: 27, y: 17 },
            enemy: { x: 27, y: 18 },
            chest: { x: 28, y: 20 }
        },
        npcsData: {
            "N": { id: "npc1", name: "Guide", dialogue: "Suis le chemin vers le sud-est.\nCoupe le buisson avec Espace, puis traverse le pont.", questItem: null, questQty: null }
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

if (typeof module !== 'undefined' && module.exports) module.exports = MapsData;
