const MapsData = {
    "Village": {
        tileSize: 64,
        dangerLevel: "peaceful",
        biome: "meadow",
        wildStartRow: 17,
        zones: [
            { id: "village_meadow", name: "Clairière du Village", dangerLevel: "peaceful", minY: 0, maxY: 14 },
            { id: "frontier_bridge", name: "Pont des Frontières", dangerLevel: "peaceful", minY: 15, maxY: 16 },
            { id: "wild_south", name: "Terres Sauvages", dangerLevel: "wild", minY: 17, maxY: 24 }
        ],
        landmarks: [
            { id: "village_square", name: "Clairière du Guide", type: "landmark", tileX: 10, tileY: 7, radius: 192, zone: "peaceful" },
            { id: "village_cottage", name: "Chalet du Village", type: "building", tileX: 36, tileY: 4, radius: 200, zone: "peaceful" },
            { id: "frontier_bridge_lm", name: "Pont des Frontières", type: "transition", tileX: 27.5, tileY: 15.5, radius: 180, zone: "wild" },
            { id: "wild_cache", name: "Cachette de la Prairie", type: "discovery", tileX: 4, tileY: 21, radius: 170, zone: "wild" },
            { id: "ancient_ruins", name: "Ruines du Gardien", type: "ruins", tileX: 34, tileY: 24, radius: 220, zone: "wild" }
        ],
        extraResources: [
            { id: "herb_meadow_1", type: "herb", yields: "herb", tileX: 13, tileY: 10 },
            { id: "herb_meadow_2", type: "herb", yields: "herb", tileX: 22, tileY: 13 },
            { id: "herb_wild_1", type: "herb", yields: "herb", tileX: 16, tileY: 20 }
        ],
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
        bossData: {
            id: "boss_guardian",
            name: "Gardien des Lieux",
            x: 34,
            y: 23,
            type: "major",
            texture: "monster_boss"
        },
        doorsData: {
            houseDoorTarget: "House1",
            houseSpawn: {x: 4, y: 5}
        }
    },
    "House1": {
        tileSize: 64,
        dangerLevel: "peaceful",
        biome: "interior",
        zones: [
            { id: "house_interior", name: "Intérieur du Chalet", dangerLevel: "peaceful", minY: 0, maxY: 6 }
        ],
        landmarks: [
            { id: "house_chest_room", name: "Atelier du Chalet", type: "building", tileX: 4, tileY: 3, radius: 200, zone: "peaceful" }
        ],
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
