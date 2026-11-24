/**
 * src/systems/TerrainRenderer.js
 * Composant dédié au rendu du terrain 2.5D (grille orthogonale 64x64).
 * - Support natif Dual-Grid 15-piece (masque 4 bits TL/TR/BL/BR = 15 transitions + vide)
 *   pour les transitions organiques herbe/terre et eau/rive (format compatible SpriteCook MCP)
 * - Support 17-piece (masque cardinal + coins intérieurs) pour chemins/structures spéciales
 * - Fallback automatique vers le tileset 4-frames puis Phaser Graphics sans régression
 * - Séparation 2.5D BACK (tablier du pont) / FRONT (garde-corps et bornes triés en Y)
 * Compatible Browser (global window) & Node.js (CommonJS).
 */

// Mapping 4-bit Dual-Grid (TL=1, TR=2, BL=4, BR=8) -> index de frame (0..15)
// Frame 0 = vide, Frames 1..15 = les 15 pièces du dual-grid
const DUAL_GRID_FRAME_MAP = [
    0,  // 0000: aucun coin
    1,  // 0001: TL
    2,  // 0010: TR
    3,  // 0011: TL+TR (bord haut)
    4,  // 0100: BL
    5,  // 0101: TL+BL (bord gauche)
    6,  // 0110: TR+BL (diagonale)
    7,  // 0111: TL+TR+BL (coin intérieur BR)
    8,  // 1000: BR
    9,  // 1001: TL+BR (diagonale)
    10, // 1010: TR+BR (bord droit)
    11, // 1011: TL+TR+BR (coin intérieur BL)
    12, // 1100: BL+BR (bord bas)
    13, // 1101: TL+BL+BR (coin intérieur TR)
    14, // 1110: TR+BL+BR (coin intérieur TL)
    15  // 1111: plein
];

// Mapping cardinal 4-bit (N=1, E=2, S=4, W=8) + centre plein (16) pour tilesets 17-piece
const AUTOTILE_17_MAP = {
    0: 0,   // isolé
    1: 1,   // N
    2: 2,   // E
    3: 3,   // N+E
    4: 4,   // S
    5: 5,   // N+S (vertical)
    6: 6,   // E+S
    7: 7,   // N+E+S
    8: 8,   // W
    9: 9,   // N+W
    10: 10, // E+W (horizontal)
    11: 11, // N+E+W
    12: 12, // S+W
    13: 13, // N+S+W
    14: 14, // E+S+W
    15: 15, // N+E+S+W (croix/intérieur)
    16: 16  // plein entouré (4 voisins + 4 diagonales)
};

class TerrainRenderer {
    constructor(scene) {
        this.scene = scene;
        this.usedTileset = false;
        this.usedDualGrid = false;
        this.tilesetKey = 'tileset_meadow_dirt';
        this.dualGridDirtKey = 'tileset_grass_dirt_dualgrid';
        this.dualGridWaterKey = 'tileset_water_bank_dualgrid';
    }

    /**
     * Calcule le masque 4 bits dual-grid (TL=1, TR=2, BL=4, BR=8) pour un sommet (gx, gy)
     * décalé de (-0.5, -0.5) par rapport à la grille de tuiles.
     */
    static computeDualGridMask(gx, gy, width, height, predicate) {
        const check = (tx, ty) => {
            if (tx < 0 || ty < 0 || tx >= width || ty >= height) return false;
            return Boolean(predicate(tx, ty));
        };
        let mask = 0;
        if (check(gx - 1, gy - 1)) mask |= 1; // TL
        if (check(gx, gy - 1))     mask |= 2; // TR
        if (check(gx - 1, gy))     mask |= 4; // BL
        if (check(gx, gy))         mask |= 8; // BR
        return mask;
    }

    /**
     * Convertit un masque 4 bits dual-grid (0..15) en index de frame spritesheet.
     */
    static resolveDualGridFrame(mask) {
        if (mask < 0 || mask >= DUAL_GRID_FRAME_MAP.length) return 0;
        return DUAL_GRID_FRAME_MAP[mask];
    }

    /**
     * Calcule l'index de frame d'un tileset 17-piece (N=1, E=2, S=4, W=8; 16 si plein avec 4 coins).
     */
    static resolve17PieceFrame(x, y, width, height, predicate) {
        const check = (tx, ty) => {
            if (tx < 0 || ty < 0 || tx >= width || ty >= height) return false;
            return Boolean(predicate(tx, ty));
        };
        let mask = 0;
        if (check(x, y - 1)) mask |= 1; // N
        if (check(x + 1, y)) mask |= 2; // E
        if (check(x, y + 1)) mask |= 4; // S
        if (check(x - 1, y)) mask |= 8; // W
        if (mask === 15 &&
            check(x - 1, y - 1) && check(x + 1, y - 1) &&
            check(x - 1, y + 1) && check(x + 1, y + 1)) {
            return AUTOTILE_17_MAP[16];
        }
        return AUTOTILE_17_MAP[mask] !== undefined ? AUTOTILE_17_MAP[mask] : 0;
    }

    _hasTexture(key) {
        return Boolean(
            this.scene &&
            this.scene.textures &&
            typeof this.scene.textures.exists === 'function' &&
            this.scene.textures.exists(key)
        );
    }

    hasTileset() {
        return this._hasTexture(this.tilesetKey);
    }

    hasDualGridDirt() {
        return this._hasTexture(this.dualGridDirtKey);
    }

    hasDualGridWater() {
        return this._hasTexture(this.dualGridWaterKey);
    }

    /**
     * Rend la couche dual-grid 15-piece (offset -ts/2, -ts/2) pour une famille de terrain donnée.
     */
    renderDualGridLayer(textureKey, depth, width, height, ts, predicate) {
        if (!this._hasTexture(textureKey) || typeof this.scene.add.image !== 'function') {
            return 0;
        }
        let placed = 0;
        for (let gy = 0; gy <= height; gy++) {
            for (let gx = 0; gx <= width; gx++) {
                const mask = TerrainRenderer.computeDualGridMask(gx, gy, width, height, predicate);
                if (mask === 0) continue;
                const frameIdx = TerrainRenderer.resolveDualGridFrame(mask);
                const img = this.scene.add.image(gx * ts, gy * ts, textureKey, frameIdx);
                if (img && typeof img.setDepth === 'function') {
                    img.setDepth(depth);
                }
                placed++;
            }
        }
        return placed;
    }

    /**
     * Renders base ground, dirt paths (dual-grid 15-piece when available), water/banks,
     * bridge (with 2.5D threshold pillars & railings), and indoor floor.
     */
    renderMap(mapData, targetMapName, createWallFn, createIndoorWallFn, doorGroup) {
        const ts = mapData.tileSize || 64;
        const layout = mapData.layoutText;
        const height = layout.length;
        const width = layout[0].length;
        const useTileset = this.hasTileset();
        const useDualDirt = this.hasDualGridDirt();
        const useDualWater = this.hasDualGridWater();
        this.usedTileset = useTileset || useDualDirt || useDualWater;
        this.usedDualGrid = useDualDirt || useDualWater;

        const terrainGraphics = this.scene.add.graphics();
        terrainGraphics.setDepth(0);
        const dirtGraphics = this.scene.add.graphics();
        dirtGraphics.setDepth(1);
        const bridgeDetailGraphics = this.scene.add.graphics();
        bridgeDetailGraphics.setDepth(2);

        const wildStartRow = (mapData.wildStartRow !== undefined) ? mapData.wildStartRow : 17;

        for (let y = 0; y < height; y++) {
            const isWildRow = targetMapName === 'Village' && y >= wildStartRow;

            for (let x = 0; x < width; x++) {
                const cell = layout[y][x];
                const px = x * ts;
                const py = y * ts;
                const cx = px + ts / 2;
                const cy = py + ts / 2;

                // --- 1. Base Grass / Wild Grass (variantes sans couture hashées par coordonnées) ---
                if (cell !== 'w' && cell !== 'f' && cell !== 'W' && cell !== 'B') {
                    if (useTileset && typeof this.scene.add.image === 'function') {
                        const h = (x * 37 + y * 17) & 7;
                        const frameIdx = isWildRow
                            ? (h < 5 ? 4 : 5)
                            : (h < 4 ? 0 : h === 4 ? 1 : h === 5 ? 2 : 3);
                        const tileImg = this.scene.add.image(cx, cy, this.tilesetKey, frameIdx);
                        if (tileImg && typeof tileImg.setDepth === 'function') tileImg.setDepth(0);
                    } else {
                        this._drawProceduralGrass(terrainGraphics, px, py, ts, x, y, isWildRow);
                    }
                }

                // --- 2. Recessed 2.5D River Water ---
                if (cell === 'W') {
                    if (useTileset && typeof this.scene.add.image === 'function') {
                        this._drawWaterTile(terrainGraphics, px, py, ts);
                    } else {
                        this._drawWaterTile(terrainGraphics, px, py, ts);
                    }
                    createWallFn(cx, cy, ts);
                }

                // --- 3. Elevated 2.5D Bridge (BACK deck depth=2, FRONT railings/pillars depth=baseY) ---
                if (cell === 'B') {
                    this._drawWaterTile(terrainGraphics, px, py, ts);
                    if (useTileset && typeof this.scene.add.image === 'function') {
                        const deck = this.scene.add.image(cx, cy, this.tilesetKey, 7);
                        if (deck && typeof deck.setDepth === 'function') deck.setDepth(2);
                    } else {
                        this._drawProceduralBridgeDeck(bridgeDetailGraphics, px, py, ts);
                    }
                    this._buildBridgeRailingsAndPillars(x, y, px, py, cx, cy, ts, layout, width, height, createWallFn);
                }

                // --- 4. Indoor House Floor / Walls ---
                if (cell === 'f' || cell === 'w') {
                    terrainGraphics.fillStyle(0x151515);
                    terrainGraphics.fillRect(px, py, ts, ts);
                    if (cell === 'f') {
                        dirtGraphics.fillStyle(0x8a6b4e);
                        dirtGraphics.fillRect(px + 4, py + 4, ts - 8, ts - 8);
                        dirtGraphics.fillStyle(0x6d4c41);
                        dirtGraphics.fillRect(px + 4, py + ts / 2, ts - 8, 2);

                        if (targetMapName === 'House1' && y === height - 1 && doorGroup) {
                            const doorData = (mapData.doorsData && mapData.doorsData['f_door'])
                                ? mapData.doorsData['f_door']
                                : { targetMap: 'Village', targetSpawn: { x: 35, y: 5 } };
                            const exitZone = this.scene.add.zone(cx, cy, ts, ts);
                            this.scene.physics.add.existing(exitZone, true);
                            exitZone.doorData = doorData;
                            doorGroup.add(exitZone);

                            const doorStep = this.scene.add.graphics();
                            doorStep.fillStyle(0x5e3a1f);
                            doorStep.fillRect(px + 8, py + ts - 12, ts - 16, 10);
                            doorStep.setDepth(3);
                        }
                    } else if (cell === 'w') {
                        createIndoorWallFn(cx, cy, ts);
                    }
                }

                // --- 5. Organic Dirt Path (fallback lorsque dual-grid absent) ---
                if (cell === 'd' && !useDualDirt) {
                    if (useTileset && typeof this.scene.add.image === 'function') {
                        const dirtTile = this.scene.add.image(cx, cy, this.tilesetKey, 6);
                        if (dirtTile && typeof dirtTile.setDepth === 'function') dirtTile.setDepth(1);
                    } else {
                        dirtGraphics.fillStyle(0xc49a62);
                        dirtGraphics.fillRect(px, py, ts, ts);
                        dirtGraphics.fillStyle(0xa37b4a);
                        dirtGraphics.fillRect(px + 16, py + 16, 4, 4);
                        dirtGraphics.fillRect(px + 44, py + 32, 6, 4);
                        dirtGraphics.fillStyle(0xdeb887);
                        dirtGraphics.fillRect(px + 28, py + 48, 8, 4);
                    }
                    this._drawDirtEdgeTransitions(bridgeDetailGraphics, x, y, px, py, ts, layout, width, height, isWildRow);
                }
            }
        }

        // --- 6. Passes Dual-Grid 15-piece (transitions organiques Herbe/Terre et Eau/Rive) ---
        let dualGridDirtCount = 0;
        let dualGridWaterCount = 0;
        if (useDualDirt) {
            dualGridDirtCount = this.renderDualGridLayer(
                this.dualGridDirtKey,
                1,
                width,
                height,
                ts,
                (tx, ty) => layout[ty][tx] === 'd'
            );
        }
        if (useDualWater) {
            dualGridWaterCount = this.renderDualGridLayer(
                this.dualGridWaterKey,
                1.5,
                width,
                height,
                ts,
                (tx, ty) => layout[ty][tx] === 'W' || layout[ty][tx] === 'B'
            );
        }

        return {
            terrainGraphics,
            dirtGraphics,
            bridgeDetailGraphics,
            usedTileset: this.usedTileset,
            usedDualGrid: this.usedDualGrid,
            dualGridDirtCount,
            dualGridWaterCount
        };
    }

    _drawProceduralGrass(g, px, py, ts, x, y, isWildRow) {
        const baseColor = isWildRow ? 0x4b8526 : 0x5c9e2b;
        const darkTuft = isWildRow ? 0x356918 : 0x46821a;
        const lightTuft = isWildRow ? 0x5ea32e : 0x6eb532;

        g.fillStyle(baseColor);
        g.fillRect(px, py, ts, ts);

        const rand = (x * 13 + y * 7) % 100;
        if (rand < 55) {
            g.fillStyle(darkTuft);
            g.fillRect(px + 8, py + 16, 8, 4);
            g.fillRect(px + 12, py + 12, 4, 4);
            g.fillRect(px + 40, py + 44, 12, 4);
            g.fillStyle(lightTuft);
            g.fillRect(px + 8, py + 14, 4, 2);
        }
        if (rand < 18) {
            const flowerColor = isWildRow
                ? ((rand % 2 === 0) ? 0xffb74d : 0xce93d8)
                : ((rand % 3 === 0) ? 0xffffff : (rand % 3 === 1) ? 0xffd54f : 0xe74c3c);
            g.fillStyle(flowerColor);
            g.fillRect(px + 32, py + 24, 4, 4);
            g.fillStyle(0xfff176);
            g.fillRect(px + 32, py + 26, 4, 2);
        }
        if (rand > 80 && rand < 90) {
            g.fillStyle(0x78909c);
            g.fillRect(px + 20, py + 36, 6, 4);
            g.fillStyle(0xb0bec5);
            g.fillRect(px + 20, py + 34, 4, 2);
        }
    }

    _drawWaterTile(g, px, py, ts) {
        g.fillStyle(0x1a4b66);
        g.fillRect(px, py, ts, ts);
        g.fillStyle(0x256588);
        g.fillRect(px, py + 8, ts, ts - 8);
        g.fillStyle(0xa8e6cf);
        g.fillRect(px + 12, py + 18, 20, 3);
        g.fillRect(px + 36, py + 42, 16, 3);
        g.fillStyle(0xffffff);
        g.fillRect(px + 24, py + 20, 6, 2);
    }

    _drawProceduralBridgeDeck(g, px, py, ts) {
        g.fillStyle(0x3e2723);
        g.fillRect(px, py + 14, ts, ts - 16);
        g.fillStyle(0x8a6235);
        g.fillRect(px, py + 10, ts, ts - 20);
        g.fillStyle(0x4e342e);
        g.fillRect(px, py + 18, ts, 2);
        g.fillRect(px, py + 32, ts, 2);
        g.fillRect(px, py + 46, ts, 2);
    }

    _buildBridgeRailingsAndPillars(x, y, px, py, cx, cy, ts, layout, width, height, createWallFn) {
        const isWestEdge = x > 0 && layout[y][x - 1] === 'W';
        const isEastEdge = x < width - 1 && layout[y][x + 1] === 'W';
        const isNorthEntry = y > 0 && layout[y - 1][x] !== 'B';
        const isSouthExit = y < height - 1 && layout[y + 1][x] !== 'B';
        const baseDepth = Math.floor(cy + ts * 0.5);

        if (isWestEdge) {
            const gRailingW = this.scene.add.graphics();
            gRailingW.fillStyle(0x4a2e1b);
            gRailingW.fillRect(px + 2, py + 4, 6, ts - 8);
            gRailingW.fillStyle(0x8a6235);
            gRailingW.fillRect(px + 1, py + 2, 8, 4);
            if (isNorthEntry || isSouthExit) {
                gRailingW.fillStyle(0x3e2723);
                gRailingW.fillRect(px, py - 8, 10, 14);
                gRailingW.fillStyle(isSouthExit ? 0xff9800 : 0xffe082);
                gRailingW.fillRect(px + 2, py - 6, 6, 6);
            }
            gRailingW.setDepth(baseDepth);
            createWallFn(px + 4, cy, 8, ts);
        }
        if (isEastEdge) {
            const gRailingE = this.scene.add.graphics();
            gRailingE.fillStyle(0x4a2e1b);
            gRailingE.fillRect(px + ts - 8, py + 4, 6, ts - 8);
            gRailingE.fillStyle(0x8a6235);
            gRailingE.fillRect(px + ts - 9, py + 2, 8, 4);
            if (isNorthEntry || isSouthExit) {
                gRailingE.fillStyle(0x3e2723);
                gRailingE.fillRect(px + ts - 10, py - 8, 10, 14);
                gRailingE.fillStyle(isSouthExit ? 0xff9800 : 0xffe082);
                gRailingE.fillRect(px + ts - 8, py - 6, 6, 6);
            }
            gRailingE.setDepth(baseDepth);
            createWallFn(px + ts - 4, cy, 8, ts);
        }
    }

    _drawDirtEdgeTransitions(g, x, y, px, py, ts, layout, width, height, isWildRow) {
        const top = y > 0 ? layout[y - 1][x] : null;
        const bottom = y < height - 1 ? layout[y + 1][x] : null;
        const left = x > 0 ? layout[y][x - 1] : null;
        const right = x < width - 1 ? layout[y][x + 1] : null;
        const grassColor = isWildRow ? 0x4b8526 : 0x5c9e2b;

        g.fillStyle(grassColor);
        if (top !== 'd' && top !== 'B') {
            g.fillRect(px, py, ts, 8);
            g.fillRect(px + 12, py + 8, 16, 8);
            g.fillRect(px + 40, py + 8, 8, 4);
        }
        if (bottom !== 'd' && bottom !== 'B') {
            g.fillRect(px, py + ts - 8, ts, 8);
            g.fillRect(px + 20, py + ts - 16, 12, 8);
        }
        if (left !== 'd' && left !== 'B') {
            g.fillRect(px, py, 8, ts);
            g.fillRect(px + 8, py + 24, 8, 16);
        }
        if (right !== 'd' && right !== 'B') {
            g.fillRect(px + ts - 8, py, 8, ts);
            g.fillRect(px + ts - 16, py + 16, 8, 12);
        }
    }
}

if (typeof window !== 'undefined') {
    window.DUAL_GRID_FRAME_MAP = DUAL_GRID_FRAME_MAP;
    window.AUTOTILE_17_MAP = AUTOTILE_17_MAP;
    window.TerrainRenderer = TerrainRenderer;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DUAL_GRID_FRAME_MAP,
        AUTOTILE_17_MAP,
        TerrainRenderer
    };
}
