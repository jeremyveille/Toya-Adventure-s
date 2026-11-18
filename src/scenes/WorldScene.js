class OcclusionManager {
    constructor(scene) {
        this.scene = scene;
        this.occluders = [];
    }

    register(sprite, bounds, targetAlpha = 0.35, baseY = null) {
        let bY = baseY !== null ? baseY : (bounds ? bounds.maxY : sprite.y);
        this.occluders.push({
            sprite,
            bounds: bounds || {
                minX: sprite.x - sprite.displayWidth * sprite.originX,
                maxX: sprite.x + sprite.displayWidth * (1 - sprite.originX),
                minY: sprite.y - sprite.displayHeight * sprite.originY,
                maxY: sprite.y + sprite.displayHeight * (1 - sprite.originX)
            },
            targetAlpha,
            baseY: bY,
            isOccluding: false
        });
    }

    update(player) {
        if (!player || !player.active) return;
        const px = player.x;
        const py = player.y - 18; // Torse / tête du joueur
        const footY = player.y;

        for (let i = 0; i < this.occluders.length; i++) {
            const occ = this.occluders[i];
            if (!occ.sprite || !occ.sprite.active) continue;

            const b = occ.bounds;
            // Joueur est dans l'emprise horizontale et verticale du toit/feuillage
            // ET le joueur est au sol au nord de la base de l'élément (derrière)
            const inBounds = px >= b.minX && px <= b.maxX && py >= b.minY && py <= b.maxY;
            const isBehind = footY < occ.baseY;
            const shouldOcclude = inBounds && isBehind;

            if (shouldOcclude !== occ.isOccluding) {
                occ.isOccluding = shouldOcclude;
                this.scene.tweens.killTweensOf(occ.sprite);
                this.scene.tweens.add({
                    targets: occ.sprite,
                    alpha: shouldOcclude ? occ.targetAlpha : 1.0,
                    duration: 180,
                    ease: 'Linear'
                });
            }
        }
    }
}

class WorldScene extends Phaser.Scene {
    constructor() {
        super('WorldScene');
    }

    init(data) {
        this.targetMapName = data.map || "Village";
        this.spawnOverride = data.spawn || null;
        this.isDead = false;
        this.transitioning = false;
        this.hasMoved = false;
    }

    preload() {
        this.load.spritesheet('toya', 'assets/village/toya-walk.png', { frameWidth: 32, frameHeight: 48 });
        this.load.image('saule', 'assets/village/saule.png');
        this.load.image('gardien', 'assets/village/gardien.png');
    }

    create() {
        this.currentMapData = MapsData[this.targetMapName];
        const ts = this.currentMapData.tileSize;
        
        const passage = this.currentMapData.passage;
        const state = window.gameState;
        const layout = this.currentMapData.layoutText;
        const height = layout.length;
        const width = layout[0].length;

        this.physics.world.setBounds(0, 0, width * ts, height * ts);

        this.walls = this.physics.add.staticGroup();
        this.interactiveZones = this.physics.add.staticGroup();
        this.enemies = this.physics.add.group();
        this.bossGroup = this.physics.add.group();
        this.resourceGroup = this.physics.add.staticGroup();
        this.doorGroup = this.physics.add.staticGroup();

        // Gestionnaire d'occlusion dynamique pour toits et feuillages
        this.occlusionManager = new OcclusionManager(this);

        // 1. Génération des textures pixel-art volumétriques 2.5D
        this.generateTextures(ts);

        let terrainGraphics = this.add.graphics();
        terrainGraphics.setDepth(0);
        const dirtGraphics = terrainGraphics;
        const waterCells = [];
        
        let spawnX = ts * 5 + ts/2, spawnY = ts * 3 + ts/2;
        let houseCells = [];
        const pathAt = (x, y) => {
            const tile = layout[y]?.[x];
            return ['d', 'S', 'N', 'B'].includes(tile) ||
                (passage && (x === passage.gate.x && y === passage.gate.y || tile === '>' && y === 11));
        };

        // 2. Rendu de la carte 2.5D
        for(let y = 0; y < height; y++) {
            for(let x = 0; x < width; x++) {
                let cell = layout[y][x];
                let px = x * ts;
                let py = y * ts;
                let cx = px + ts/2;
                let cy = py + ts/2;

                // --- Base Herbe et Sol ---
                if (this.targetMapName !== 'House1' && cell !== 'W' && cell !== 'B') {
                    // Base Herbe riche et chaleureuse (Akira Toriyama fantasy style)
                    terrainGraphics.fillStyle(0x88aa66);
                    terrainGraphics.fillRect(px, py, ts, ts);
                    
                    // Petites touffes irrégulières. La graine dépend de la case, pas du framerate.
                    let seed = ((x + 1) * 73856093 ^ (y + 1) * 19349663) >>> 0;
                    const random = max => {
                        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
                        return (seed >>> 8) % max;
                    };
                    for (let n = 0; n < 9; n++) {
                        const gx = px + 4 + random(ts - 12), gy = py + 6 + random(ts - 12);
                        const flowers = n < 2 && (x * 3 + y * 5) % 9 < 3;
                        terrainGraphics.fillStyle(0x809f61).fillRect(gx - 2, gy, 7 + random(8), 2);
                        terrainGraphics.fillStyle(0x719358).fillRect(gx, gy - 2, 2, 3);
                        terrainGraphics.fillRect(gx + 3, gy - 4, 2, 5);
                        terrainGraphics.fillStyle(0xa4bc76).fillRect(gx + 4, gy - 4, 1, 3);
                        if (flowers) {
                            terrainGraphics.fillStyle(n ? 0xe9bd70 : 0xf4ebca).fillRect(gx + 1, gy - 6, 5, 2);
                            terrainGraphics.fillRect(gx + 3, gy - 8, 2, 5);
                            terrainGraphics.fillStyle(0xd7a356).fillRect(gx + 3, gy - 6, 2, 2);
                        }
                    }
                }

                // --- Eau encaissée (-20px) 2.5D ---
                if (cell === 'W') {
                    const northBank = y > 0 && !['W', 'B'].includes(layout[y - 1][x]);
                    terrainGraphics.fillStyle(0x417e89).fillRect(px, py, ts, ts);
                    if (northBank) {
                        terrainGraphics.fillStyle(0x584e3d).fillRect(px, py, ts, 7);
                        terrainGraphics.fillStyle(0x537456).fillRect(px, py, ts, 3);
                        terrainGraphics.fillStyle(0x356c76).fillRect(px, py + 7, ts, 7);
                        for (let reed = 0; reed < 3; reed++) {
                            const rx = px + 6 + ((x * 17 + reed * 23) % 48);
                            const rh = 4 + ((x + reed * 3) % 8);
                            terrainGraphics.fillStyle(0x57774b).fillRect(rx + 1, py - rh, 2, rh + 3);
                            terrainGraphics.fillStyle(0xb7bb78).fillRect(rx, py - rh - 2, 1, rh);
                            terrainGraphics.fillStyle(0x79593a).fillRect(rx - 1, py - rh - 3, 3, 4);
                        }
                    }
                    waterCells.push({ x: px, y: py, seed: (x * 23 + y * 11) % 41 });

                    // Mur bloquant l'eau
                    this.createWall(cx, cy, ts);
                }

                // --- Pont en bois 2.5D surélevé avec garde-corps ---
                if (cell === 'B') {
                    terrainGraphics.fillStyle(0x775336).fillRect(px, py, ts, ts);
                    for (let plank = 0; plank < ts; plank += 8) {
                        const tone = (x + plank / 8) % 3 ? 0xbd9464 : 0xb58a5d;
                        terrainGraphics.fillStyle(tone).fillRect(px, py + plank, ts, 7);
                        terrainGraphics.fillStyle(0xe2bc84).fillRect(px, py + plank, ts, 1);
                        terrainGraphics.fillStyle(0x8d684a).fillRect(px + (plank * 3 + x) % 38, py + plank + 4, 15, 1);
                    }
                    if (layout[y][x - 1] === 'W') this.createRailing(px + 4, py, ts);
                    if (layout[y][x + 1] === 'W') this.createRailing(px + ts - 4, py, ts);
                }

                // --- Intérieur (House 1) ---
                if (this.targetMapName === 'House1') {
                    terrainGraphics.fillStyle(0x151515);
                    terrainGraphics.fillRect(px, py, ts, ts);
                    if (cell !== 'w') {
                        // Parquet en bois intérieur
                        dirtGraphics.fillStyle(0x8a6b4e);
                        dirtGraphics.fillRect(px + 4, py + 4, ts - 8, ts - 8);
                        dirtGraphics.fillStyle(0x6d4c41);
                        dirtGraphics.fillRect(px + 4, py + ts/2, ts - 8, 2);

                        // Enregistrement de la porte de sortie de House 1 vers Village
                        if (this.targetMapName === "House1" && y === height - 1) {
                            let doorData = (this.currentMapData.doorsData && this.currentMapData.doorsData["f_door"])
                                ? this.currentMapData.doorsData["f_door"]
                                : { targetMap: "Village", targetSpawn: { x: 35, y: 5 } };
                            let exitZone = this.add.zone(cx, cy, ts, ts);
                            this.physics.add.existing(exitZone, true);
                            exitZone.doorData = doorData;
                            this.doorGroup.add(exitZone);

                            let doorStep = this.add.graphics();
                            doorStep.fillStyle(0x5e3a1f);
                            doorStep.fillRect(px + 8, py + ts - 12, ts - 16, 10);
                            doorStep.setDepth(3);
                        }
                    } else if (cell === 'w') {
                        this.createIndoorWall(cx, cy, ts);
                    }
                }

                // --- Chemin de terre et auto-tiling organique ---
                if (cell !== 'B' && pathAt(x, y)) {
                    dirtGraphics.fillStyle(0xcfb385); // Terre battue
                    dirtGraphics.fillRect(px, py, ts, ts);
                    
                    // Gravillons et ornières
                    dirtGraphics.fillStyle(0xaa906a);
                    dirtGraphics.fillRect(px + 16, py + 16, 4, 4);
                    dirtGraphics.fillRect(px + 44, py + 32, 6, 4);
                    dirtGraphics.fillStyle(0xe1ca9c);
                    dirtGraphics.fillRect(px + 28, py + 48, 8, 4);

                    // Bords herbeux organiques
                    dirtGraphics.fillStyle(0x88aa66);
                    if (!pathAt(x, y - 1)) {
                        dirtGraphics.fillRect(px, py, ts, 8);
                        dirtGraphics.fillRect(px + 12, py + 8, 16, 8);
                        dirtGraphics.fillRect(px + 40, py + 8, 8, 4);
                    }
                    if (!pathAt(x, y + 1)) {
                        dirtGraphics.fillRect(px, py + ts - 8, ts, 8);
                        dirtGraphics.fillRect(px + 20, py + ts - 16, 12, 8);
                    }
                    if (!pathAt(x - 1, y)) {
                        dirtGraphics.fillRect(px, py, 8, ts);
                        dirtGraphics.fillRect(px + 8, py + 24, 8, 16);
                    }
                    if (!pathAt(x + 1, y)) {
                        dirtGraphics.fillRect(px + ts - 8, py, 8, ts);
                        dirtGraphics.fillRect(px + ts - 16, py + 16, 8, 12);
                    }
                }

                // --- OBJETS 2.5D (Depth Y-sorting unifié) ---
                if (cell === 'T') {
                    this.createTree(cx, cy, ts, false);
                } else if (cell === 't') {
                    this.createTree(cx, cy, ts, true);
                } else if (cell === 'C') {
                    this.createCliff(cx, cy, ts, x, y, layout, width, height);
                } else if (cell === 'H') {
                    houseCells.push({x, y});
                } else if (cell === 'R') {
                    this.createRuin(cx, cy, ts, false);
                } else if (cell === 'r') {
                    this.createRuin(cx, cy, ts, true);
                } else if (cell === 'S') {
                    spawnX = cx;
                    spawnY = cy;
                } else if (cell === 'N') {
                    this.createNPC(cx, cy, ts, this.currentMapData.npcsData['N']);
                } else if (cell === 'E') {
                    if (!passage || state.passage === 'fight') this.createEnemy(cx, cy, 'minor');
                } else if (cell === 'b') {
                    // Correctif Bug M4 : 'b' minuscule pour buisson récoltable
                    const gate = passage && passage.gate.x === x && passage.gate.y === y;
                    if (!gate || ['meet', 'cut'].includes(state.passage)) this.createResource(cx, cy, ts, gate);
                } else if (cell === 'o') {
                    this.createChest(cx, cy, ts, this.currentMapData.chestsData['o']);
                } else if (cell === '>') {
                    this.createProp(cx, cy, ts, 'tex_sign');
                } else if (cell === 'x') {
                    this.createProp(cx, cy, ts, 'tex_fence');
                    this.createWall(cx, cy + ts * 0.2, ts, ts * 0.4);
                }
            }
        }

        if (waterCells.length) {
            const ripples = this.add.graphics().setDepth(2);
            let step = 0;
            const drawWater = () => {
                ripples.clear();
                for (const { x, y, seed } of waterCells) {
                    const phase = (step + seed) % 8;
                    const offset = Math.abs(phase - 4);
                    ripples.fillStyle(0x74aba7).fillRect(x + 4 + seed % 20 + offset, y + 19 + seed % 13, 9 + offset, 2);
                    ripples.fillStyle(0x518f94).fillRect(x + 32 + offset, y + 44 + seed % 12, 16, 2);
                }
                step++;
            };
            drawWater();
            this.time.addEvent({ delay: 180, loop: true, callback: drawWater });
        }
        if (this.currentMapData.terrace) this.buildTerrace(this.currentMapData.terrace, ts, dirtGraphics);

        const groundKey = 'sol-' + this.targetMapName;
        if (!this.textures.exists(groundKey)) terrainGraphics.generateTexture(groundKey, width * ts, height * ts);
        terrainGraphics.destroy();
        this.add.image(0, 0, groundKey).setOrigin(0, 0).setDepth(0);

        // Bâtiments 2.5D en volume avec toits praticables et occlusion
        this.buildHouses(houseCells, ts);

        // --- JOUEUR (Ancrage 2.5D aux pieds) ---
        if (!this.spawnOverride && passage && ['fight', 'open', 'return'].includes(state.passage)) {
            this.spawnOverride = passage.landing;
        }
        if (this.spawnOverride) {
            spawnX = this.spawnOverride.x * ts + ts/2;
            spawnY = this.spawnOverride.y * ts + ts/2;
        }
        this.player = new Player(this, spawnX, spawnY, 'toya');
        this.player.setDepth(Math.floor(this.player.y));
        
        // Ombre portée sous les pieds du joueur
        this.playerShadow = this.add.sprite(this.player.x, this.player.y, 'tex_shadow');
        this.playerShadow.setScale(1.6, 1.0);
        this.playerShadow.setDepth(Math.floor(this.player.y) - 0.5);

        // --- AMBIANCE & POST-PROCESSING 2.5D ---
        let overlayColor = this.targetMapName === "House1" ? 0x000000 : 0xffdda1;
        let overlayAlpha = this.targetMapName === "House1" ? 0.08 : 0.025;
        let overlay = this.add.rectangle(0, 0, width * ts, height * ts, overlayColor, overlayAlpha).setOrigin(0,0);
        overlay.setBlendMode(this.targetMapName === "House1" ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
        overlay.setDepth(9000);

        if (this.targetMapName === "Village") {
            let particles = this.add.particles('tex_leaf');
            particles.setDepth(9001);
            particles.createEmitter({
                x: { min: 0, max: width * ts },
                y: { min: 0, max: height * ts },
                lifespan: 6000,
                speedY: { min: 10, max: 20 },
                speedX: { min: -15, max: 15 },
                alpha: { start: 1, end: 0 },
                quantity: 1,
                frequency: 800
            });
        }

        // --- CAMERA 2.5D ---
        this.cameras.main.setZoom(this.targetMapName === 'House1' ? 2 : 1);
        this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
        this.cameras.main.setBounds(0, 0, width * ts, height * ts);
        this.cameras.main.setDeadzone(40, 30);
        this.cameras.main.centerOn(spawnX, spawnY);
        this.cameras.main.roundPixels = true;

        // --- COLLISIONS & PHYSIQUE ---
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.enemies, this.walls);
        this.physics.add.overlap(this.player.weaponHitbox, this.enemies, this.hitMinorEnemy, null, this);
        this.physics.add.overlap(this.player.weaponHitbox, this.resourceGroup, this.hitResource, null, this);
        this.physics.add.overlap(this.player, this.doorGroup, this.enterDoor, null, this);

        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.scene.launch('HUDScene');
        if (window.privacyDialogOpen) this.scene.pause();
    }

    createWall(cx, cy, width, height = width) {
        let wall = this.add.zone(cx, cy, width, height);
        this.physics.add.existing(wall, true);
        this.walls.add(wall);
        return wall;
    }

    createProp(cx, cy, ts, tex) {
        let sprite = this.add.sprite(cx, cy + ts * 0.2, tex);
        sprite.setOrigin(0.5, 0.85);
        let baseDepth = Math.floor(cy + ts * 0.2);
        sprite.setDepth(baseDepth);
        let shadow = this.add.sprite(cx, cy + ts * 0.2, 'tex_shadow');
        shadow.setScale(1.2, 0.8);
        shadow.setDepth(baseDepth - 0.5);
        return sprite;
    }

    createRailing(x, y, ts) {
        this.createWall(x, y + ts / 2, 7, ts);
        for (let dy = 0; dy < ts; dy += 16) {
            const foot = y + dy + 16;
            const rail = this.add.graphics().setDepth(foot);
            rail.fillStyle(0x5b4432).fillRect(x - 2, foot - 32, 5, 16);
            rail.fillStyle(0xd3ab75).fillRect(x - 2, foot - 32, 2, 16);
            if (dy % 32 === 0) {
                rail.fillStyle(0x694a34).fillRect(x - 4, foot - 23, 8, 24);
                rail.fillStyle(0xab8055).fillRect(x - 3, foot - 22, 3, 20);
                rail.fillStyle(0xf1cf93).fillRect(x - 4, foot - 24, 8, 3);
            }
        }
    }

    buildTerrace(data, ts, g) {
        const x = data.x * ts, y = data.y * ts;
        const w = data.width * ts, h = data.height * ts;
        const foot = y + h;
        g.fillStyle(0x9eae7b).fillRect(x, y, w, h);
        g.fillStyle(0xbecc95).fillRect(x, y, w, 4);
        g.fillStyle(0x70845f).fillRect(x + w - 5, y + 4, 5, h - 4);
        g.fillStyle(0x70695c).fillRect(x, foot, w, 20);
        for (let i = 0; i < w; i += 16) {
            g.fillStyle(0x9d9680).fillRect(x + i + 1, foot + 2, 14, 8);
            g.fillStyle(0x847f70).fillRect(x + i + 4, foot + 12, 11, 5);
        }
        const stairs = (data.stairsX - data.x) * ts;
        for (let n = 0; n < 4; n++) {
            g.fillStyle(0xb5aa91).fillRect(x + stairs, foot + n * 6, ts, 5);
            g.fillStyle(0xe3d4b3).fillRect(x + stairs + 2, foot + n * 6, ts - 4, 2);
        }
        this.createWall(x + w / 2, y, w, 8);
        this.createWall(x, y + h / 2, 8, h);
        this.createWall(x + w, y + h / 2, 8, h);
        if (stairs > 0) this.createWall(x + stairs / 2, foot + 8, stairs, 20);
        const right = w - stairs - ts;
        if (right > 0) this.createWall(x + w - right / 2, foot + 8, right, 20);
    }

    createTree(cx, cy, ts, isSmall) {
        const base = Math.floor(cy + ts * (isSmall ? 0.25 : 0.35));
        const variety = (Math.floor(cx / ts) * 3 + Math.floor(cy / ts)) % 4;
        const w = (isSmall ? 52 : 100) + variety * 4;
        const h = (isSmall ? 70 : 132) + variety * 4;
        this.createWall(cx, base - 3, isSmall ? 20 : 30, isSmall ? 10 : 16);
        this.add.image(cx + 4, base - 2, 'tex_shadow').setScale(isSmall ? 1.2 : 2, 0.8).setDepth(3);
        const tree = this.add.image(cx, base, 'saule').setOrigin(0.5, 1).setDisplaySize(w, h).setDepth(base);
        this.occlusionManager.register(tree, {
            minX: cx - w * 0.42, maxX: cx + w * 0.42,
            minY: base - h + 6, maxY: base - h * 0.16
        }, 0.46, base);
    }

    createCliff(cx, cy, ts, x, y, layout, width, height) {
        let hasBelow = y < height - 1 && layout[y + 1][x] === 'C';
        if (hasBelow) {
            this.createWall(cx, cy, ts);
            return; // Surface herbeuse continue au-dessus de la face sud.
        }
        let cliff = this.add.sprite(cx, cy, 'tex_cliff');
        let baseDepth = Math.floor(cy + ts * 0.5);
        cliff.setDepth(baseDepth);

        this.createWall(cx, cy + ts * 0.15, ts, ts * 0.7);
        this.add.image(cx + 2, cy + ts * 0.45, 'tex_shadow').setScale(2.2, 0.8).setDepth(3);
    }

    createRuin(cx, cy, ts, isSmall) {
        if (!isSmall) {
            this.createWall(cx, cy + ts * 0.25, ts * 0.7, ts * 0.4);
        }
        let sprite = this.add.sprite(cx, cy + ts * 0.25, isSmall ? 'tex_ruin_small' : 'tex_ruin');
        sprite.setOrigin(0.5, 0.85);
        let baseDepth = Math.floor(cy + ts * 0.25);
        sprite.setDepth(baseDepth);
        
        let shadow = this.add.sprite(cx, cy + ts * 0.25, 'tex_shadow');
        shadow.setScale(isSmall ? 1.0 : 1.6, 0.7);
        shadow.setDepth(baseDepth - 0.5);
    }

    createIndoorWall(cx, cy, ts) {
        this.createWall(cx, cy, ts);
        let wall = this.add.sprite(cx, cy, 'tex_wall');
        wall.setDepth(Math.floor(cy));
    }

    createNPC(cx, cy, ts, data) {
        this.createWall(cx, cy + ts * 0.2, 28, 20);
        let baseDepth = Math.floor(cy + ts * 0.25);
        let shadow = this.add.sprite(cx, cy + ts * 0.25, 'tex_shadow');
        shadow.setScale(1.2, 0.8);
        shadow.setDepth(baseDepth - 0.5);

        let sprite = this.add.sprite(cx, cy + ts * 0.25, 'tex_npc');
        sprite.setOrigin(0.5, 0.9);
        sprite.setDepth(baseDepth);
        
        let indicator = this.add.text(cx, cy - ts * 0.6, "!", {
            fontSize: '14px',
            color: '#ffea00',
            stroke: '#000',
            strokeThickness: 4,
            fontFamily: '"Press Start 2P"'
        }).setOrigin(0.5).setDepth(baseDepth + 5);
        
        this.tweens.add({ targets: indicator, y: indicator.y - 4, duration: 800, yoyo: true, repeat: -1 });

        let zone = this.add.zone(cx, cy, ts * 1.5, ts * 1.5);
        this.physics.add.existing(zone, true);
        zone.npcData = data;
        this.interactiveZones.add(zone);
    }

    createEnemy(cx, cy, type) {
        let enemy = new Enemy(this, cx, cy, 'gardien', type);
        let shadow = this.add.sprite(cx, cy, 'tex_shadow');
        shadow.setScale(1.6, 1.0);
        shadow.setDepth(Math.floor(cy) - 0.5);
        enemy.shadow = shadow;
        this.enemies.add(enemy);
        if (this.currentMapData.passage) {
            enemy.onDefeat = () => {
                if (window.gameState.passage === 'fight') window.gameState.passage = 'open';
            };
        }
    }

    createResource(cx, cy, ts, gate) {
        let zone = this.createWall(cx, cy + ts * 0.2, gate ? ts : 28, 20);
        let sprite = this.add.sprite(cx, cy + ts * 0.2, 'tex_bush');
        sprite.setOrigin(0.5, 0.85);
        sprite.setDepth(Math.floor(cy + ts * 0.2));
        
        if (gate) sprite.setDisplaySize(92, 70);
        zone.isGate = gate;
        zone.sprite = sprite;
        this.resourceGroup.add(zone);
    }

    createChest(cx, cy, ts, data) {
        this.createWall(cx, cy + ts * 0.15, 32, 20);
        let sprite = this.add.sprite(cx, cy + ts * 0.2, window.gameState.openChests.includes(data.id) ? 'tex_chest_opened' : 'tex_chest_closed');
        sprite.setOrigin(0.5, 0.85);
        let baseDepth = Math.floor(cy + ts * 0.2);
        sprite.setDepth(baseDepth);

        let shadow = this.add.sprite(cx, cy + ts * 0.2, 'tex_shadow');
        shadow.setScale(1.2, 0.8);
        shadow.setDepth(baseDepth - 0.5);

        let zone = this.add.zone(cx, cy, ts * 1.2, ts * 1.2);
        this.physics.add.existing(zone, true);
        zone.chestData = data;
        zone.sprite = sprite; 
        this.interactiveZones.add(zone);
    }

    buildHouses(houseCells, ts) {
        if (houseCells.length === 0) return;
        
        let minX = Math.min(...houseCells.map(c => c.x));
        let maxX = Math.max(...houseCells.map(c => c.x));
        let minY = Math.min(...houseCells.map(c => c.y));
        let maxY = Math.max(...houseCells.map(c => c.y));
        
        let width = (maxX - minX + 1) * ts;
        let height = (maxY - minY + 1) * ts;
        let cx = minX * ts + width / 2;
        let baseY = (maxY + 1) * ts;

        // Collision 2.5D : mur uniquement sur la ligne de fondation (row maxY), toit libre de passage
        let foundationY = maxY * ts + ts * 0.75;
        let foundationH = ts * 0.5;
        // Mur gauche
        this.createWall(minX * ts + width * 0.22, foundationY, width * 0.38, foundationH);
        // Mur droit (porte libre au centre)
        this.createWall(minX * ts + width * 0.78, foundationY, width * 0.38, foundationH);

        // Sprite volumétrique du chalet 2.5D
        let houseSprite = this.add.sprite(cx, baseY, 'tex_house');
        houseSprite.setOrigin(0.5, 1.0);
        houseSprite.setDepth(baseY);

        // Ombre de contact au sol
        let houseShadow = this.add.sprite(cx, baseY - 5, 'tex_shadow');
        houseShadow.setScale(width / 32 * 0.95, 2.5);
        houseShadow.setDepth(baseY - 0.5);

        // Enregistrement du toit dans l'OcclusionManager
        if (this.occlusionManager) {
            this.occlusionManager.register(
                houseSprite,
                {
                    minX: minX * ts,
                    maxX: (maxX + 1) * ts,
                    minY: minY * ts - 48,
                    maxY: maxY * ts + ts * 0.5
                },
                0.35,
                baseY
            );
        }

        // Zone de porte d'entrée
        if (this.currentMapData.doorsData && this.currentMapData.doorsData.houseDoorTarget) {
            let doorZone = this.add.zone(cx, baseY - 1, ts * 0.64, ts * 0.45);
            this.physics.add.existing(doorZone, true);
            doorZone.doorData = {
                targetMap: this.currentMapData.doorsData.houseDoorTarget,
                targetSpawn: this.currentMapData.doorsData.houseSpawn
            };
            this.doorGroup.add(doorZone);
        }
    }

    generateTextures(ts) {
        if (this.textures.exists('tex_shadow')) return;
        // --- 1. Ombre au sol (tex_shadow) ---
        let gShadow = this.make.graphics({x:0, y:0, add:false});
        gShadow.fillStyle(0x000000, 0.35);
        gShadow.fillRect(4, 5, 24, 9);
        gShadow.fillRect(1, 7, 30, 5);
        gShadow.fillRect(8, 3, 16, 2);
        gShadow.fillRect(8, 14, 16, 2);
        gShadow.generateTexture('tex_shadow', 32, 20).destroy();

        // --- 4. Buisson 2.5D (tex_bush : 64x64 px) ---
        let gBush = this.make.graphics({x:0, y:0, add:false});
        const leaves = [[13, 33], [22, 26], [33, 22], [44, 28], [51, 35], [33, 34], [20, 37], [40, 38]];
        gBush.fillStyle(0x534234).fillRect(11, 41, 43, 6);
        for (const [x, y] of leaves) {
            gBush.fillStyle(0x344e39).fillRect(x - 9, y - 5, 18, 13);
            gBush.fillRect(x - 6, y - 9, 12, 19);
            gBush.fillStyle(0x527448).fillRect(x - 7, y - 6, 13, 11);
            gBush.fillStyle(0x78944f).fillRect(x - 6, y - 7, 7, 4);
            gBush.fillStyle(0xa7b85e).fillRect(x - 5, y - 7, 3, 2);
        }
        for (let i = 0; i < 36; i++) {
            const y = 40 - Math.floor(i / 4) + (i % 12 < 4 ? 1 : 0);
            gBush.fillStyle(0x533b32).fillRect(i + 13, y, 2, 3);
            if (i % 9 === 0) gBush.fillRect(i + 14, y - 3, 2, 4);
        }
        for (const [x, y] of [[14, 32], [23, 22], [30, 35], [41, 26], [49, 34]]) {
            gBush.fillStyle(0x884c40).fillRect(x, y, 5, 5);
            gBush.fillStyle(0xd67550).fillRect(x, y, 4, 3);
            gBush.fillStyle(0xf1ad72).fillRect(x, y, 2, 1);
        }
        gBush.generateTexture('tex_bush', ts, ts).destroy();

        // --- 5. Falaise Volumétrique 2.5D (tex_cliff : 64x64 px) ---
        let gCliff = this.make.graphics({x:0, y:0, add:false});
        // Plateau supérieur herbeux
        gCliff.fillStyle(0x88aa66);
        gCliff.fillRect(0, 0, ts, 16);
        gCliff.fillStyle(0xa8bf76); // Liseré herbe vive
        gCliff.fillRect(0, 14, ts, 3);
        // Franges d'herbe qui retombent
        gCliff.fillStyle(0x729454);
        gCliff.fillRect(4, 16, 6, 5);
        gCliff.fillRect(20, 16, 8, 6);
        gCliff.fillRect(42, 16, 6, 4);
        gCliff.fillRect(54, 16, 6, 7);

        // Paroi rocheuse verticale avec strates horizontales
        gCliff.fillStyle(0x616161); // Base pierre grise
        gCliff.fillRect(0, 20, ts, ts - 20);
        gCliff.fillStyle(0x424242); // Strate sombre et fissures
        gCliff.fillRect(0, 32, ts, 4);
        gCliff.fillRect(16, 36, 8, 12);
        gCliff.fillRect(40, 26, 12, 8);
        gCliff.fillRect(0, 52, ts, 4);
        gCliff.fillStyle(0x9e9e9e); // Arêtes et reflets
        gCliff.fillRect(0, 22, ts, 2);
        gCliff.fillRect(12, 30, 16, 2);
        gCliff.fillRect(36, 48, 20, 2);
        gCliff.generateTexture('tex_cliff', ts, ts).destroy();

        // --- 6. Chalet Fantasy 2.5D (tex_house : 192x240 px) ---
        let gHouse = this.make.graphics({x:0, y:0, add:false});
        let hw = ts * 3; // 192 px
        let hh = ts * 3 + 48; // 240 px

        // Cheminée en pierre sur la droite
        gHouse.fillStyle(0x607d8b);
        gHouse.fillRect(hw - 36, 16, 22, 70);
        gHouse.fillStyle(0x37474f); // Briques
        gHouse.fillRect(hw - 36, 28, 22, 3);
        gHouse.fillRect(hw - 36, 46, 22, 3);
        gHouse.fillRect(hw - 36, 64, 22, 3);
        gHouse.fillStyle(0x263238); // Chapeau de cheminée
        gHouse.fillRect(hw - 40, 12, 30, 6);

        // Toit en bâtière 3/4 perspective (tuiles terre cuite)
        // Rangées de tuiles rouges / orange
        gHouse.fillStyle(0xc0392b);
        gHouse.fillRect(12, 30, hw - 24, 76);
        gHouse.fillStyle(0xd35400);
        gHouse.fillRect(16, 44, hw - 32, 10);
        gHouse.fillRect(14, 64, hw - 28, 10);
        gHouse.fillRect(12, 84, hw - 24, 10);
        gHouse.fillStyle(0xba4a00); // Lignes d'ombre des tuiles
        gHouse.fillRect(12, 54, hw - 24, 3);
        gHouse.fillRect(12, 74, hw - 24, 3);
        gHouse.fillRect(12, 94, hw - 24, 3);
        for (let band = 0; band < 4; band++) {
            const yy = 34 + band * 18;
            for (let xx = 17 + (band % 2) * 8; xx < hw - 18; xx += 17) {
                gHouse.fillStyle(0x914632).fillRect(xx, yy, 2, 13);
                gHouse.fillStyle(0xe09c63).fillRect(xx + 2, yy, 11, 2);
            }
        }
        // Faîtage éclairé
        gHouse.fillStyle(0xf39c12);
        gHouse.fillRect(8, 26, hw - 16, 6);

        // Débord d'avant-toit et ombre portée sur la façade
        gHouse.fillStyle(0x4a2e1b);
        gHouse.fillRect(6, 102, hw - 12, 6);
        gHouse.fillStyle(0x1a0f0a); // Ombre sous le toit
        gHouse.fillRect(8, 108, hw - 16, 8);

        // Façade à colombages (panneaux crème et poutres en chêne foncé)
        gHouse.fillStyle(0xfef9e7); // Plâtre crème
        gHouse.fillRect(12, 114, hw - 24, 106);

        // Poutres verticales et horizontales
        gHouse.fillStyle(0x4e342e);
        gHouse.fillRect(12, 114, 8, 106); // Poutre gauche
        gHouse.fillRect(hw - 20, 114, 8, 106); // Poutre droite
        gHouse.fillRect(12, 160, hw - 24, 8); // Poutre intermédiaire
        // Poutres diagonales (croix de Saint-André)
        gHouse.fillRect(40, 114, 8, 46);
        gHouse.fillRect(hw - 48, 114, 8, 46);

        // Fenêtres illuminées (lumière intérieure dorée chaleureuse)
        // Fenêtre gauche
        gHouse.fillStyle(0x5d4037); // Volets
        gHouse.fillRect(24, 126, 4, 24);
        gHouse.fillRect(46, 126, 4, 24);
        gHouse.fillStyle(0xffca28); // Vitre allumée
        gHouse.fillRect(28, 126, 18, 24);
        gHouse.fillStyle(0xfff9c4);
        gHouse.fillRect(30, 128, 6, 8);
        gHouse.fillStyle(0x3e2723); // Croisillons
        gHouse.fillRect(36, 126, 2, 24);
        gHouse.fillRect(28, 137, 18, 2);

        // Fenêtre droite
        gHouse.fillStyle(0x5d4037);
        gHouse.fillRect(hw - 50, 126, 4, 24);
        gHouse.fillRect(hw - 28, 126, 4, 24);
        gHouse.fillStyle(0xffca28);
        gHouse.fillRect(hw - 46, 126, 18, 24);
        gHouse.fillStyle(0xfff9c4);
        gHouse.fillRect(hw - 44, 128, 6, 8);
        gHouse.fillStyle(0x3e2723);
        gHouse.fillRect(hw - 38, 126, 2, 24);
        gHouse.fillRect(hw - 46, 137, 18, 2);

        // Porte d'entrée en bois avec ferrures
        gHouse.fillStyle(0x6d4c41);
        gHouse.fillRect(hw/2 - 16, 168, 32, 52);
        gHouse.fillStyle(0x4e342e); // Lattes verticales
        gHouse.fillRect(hw/2 - 6, 168, 2, 52);
        gHouse.fillRect(hw/2 + 6, 168, 2, 52);
        gHouse.fillStyle(0x111111); // Poignée et gonds
        gHouse.fillRect(hw/2 + 8, 192, 4, 6);
        gHouse.fillRect(hw/2 - 14, 174, 6, 3);
        gHouse.fillRect(hw/2 - 14, 206, 6, 3);

        // Soubassement en pierre de taille
        gHouse.fillStyle(0x78909c);
        gHouse.fillRect(10, 220, hw - 20, 16);
        gHouse.fillStyle(0x455a64);
        gHouse.fillRect(10, 226, hw - 20, 2);
        gHouse.fillRect(40, 220, 2, 16);
        gHouse.fillRect(90, 220, 2, 16);
        gHouse.fillRect(140, 220, 2, 16);
        gHouse.generateTexture('tex_house', hw, hh).destroy();

        // --- 7. Ruine Antique 2.5D (tex_ruin : 64x80 px) ---
        let gRuin = this.make.graphics({x:0, y:0, add:false});
        gRuin.fillStyle(0x424242);
        gRuin.fillRect(12, 16, 40, 60);
        gRuin.fillStyle(0x757575);
        gRuin.fillRect(16, 16, 32, 60);
        // Cannelures de colonne
        gRuin.fillStyle(0x9e9e9e);
        gRuin.fillRect(20, 22, 4, 48);
        gRuin.fillRect(28, 22, 4, 48);
        gRuin.fillRect(36, 22, 4, 48);
        // Chapiteau et fissures
        gRuin.fillStyle(0xbdbdbd);
        gRuin.fillRect(10, 12, 44, 8);
        gRuin.fillStyle(0x212121);
        gRuin.fillRect(24, 34, 12, 4);
        gRuin.fillRect(32, 38, 4, 10);
        // Lierre grimpant
        gRuin.fillStyle(0x2e7d32);
        gRuin.fillRect(14, 42, 6, 6);
        gRuin.fillRect(16, 54, 8, 6);
        gRuin.fillRect(38, 58, 6, 6);
        gRuin.generateTexture('tex_ruin', ts, ts + 16).destroy();

        // --- 8. Petite Ruine / Rocher 2.5D (tex_ruin_small : 64x48 px) ---
        let gRock = this.make.graphics({x:0, y:0, add:false});
        gRock.fillStyle(0x424242);
        gRock.fillCircle(32, 26, 18);
        gRock.fillStyle(0x757575);
        gRock.fillCircle(30, 24, 15);
        gRock.fillStyle(0x9e9e9e);
        gRock.fillCircle(26, 20, 9);
        gRock.fillStyle(0x2e7d32); // Mousse
        gRock.fillRect(28, 28, 8, 4);
        gRock.generateTexture('tex_ruin_small', ts, 48).destroy();

        // --- 9. Panneau indicateur 2.5D (tex_sign) ---
        let gSign = this.make.graphics({x:0, y:0, add:false});
        gSign.fillStyle(0x4a2e1b);
        gSign.fillRect(ts/2 - 4, 28, 8, 32);
        gSign.fillStyle(0x8a6235);
        gSign.fillRect(ts/2 - 18, 14, 36, 16);
        gSign.fillStyle(0x3a2512); // Flèche gravée
        gSign.fillRect(ts/2 - 10, 20, 16, 3);
        gSign.fillRect(ts/2 + 6, 18, 3, 7);
        gSign.generateTexture('tex_sign', ts, ts).destroy();

        // --- 10. Clôture 2.5D (tex_fence) ---
        let gFence = this.make.graphics({x:0, y:0, add:false});
        gFence.fillStyle(0x4e342e);
        gFence.fillRect(8, 16, 8, 44);
        gFence.fillRect(ts - 16, 16, 8, 44);
        gFence.fillStyle(0x8a6235);
        gFence.fillRect(4, 24, ts - 8, 6);
        gFence.fillRect(4, 40, ts - 8, 6);
        gFence.generateTexture('tex_fence', ts, ts).destroy();

        // --- 11. Coffre au trésor 2.5D (tex_chest_closed / opened) ---
        let gChest = this.make.graphics({x:0, y:0, add:false});
        gChest.fillStyle(0x5d4037);
        gChest.fillRect(14, 20, 36, 28);
        gChest.fillStyle(0x8d6e63);
        gChest.fillRect(16, 22, 32, 24);
        // Ferrures dorées et serrure
        gChest.fillStyle(0xffb300);
        gChest.fillRect(14, 30, 36, 4);
        gChest.fillRect(30, 30, 6, 10);
        gChest.fillStyle(0x000000);
        gChest.fillRect(32, 34, 2, 4);
        gChest.generateTexture('tex_chest_closed', ts, ts).destroy();

        let gChestO = this.make.graphics({x:0, y:0, add:false});
        gChestO.fillStyle(0x5d4037);
        gChestO.fillRect(14, 26, 36, 24);
        gChestO.fillStyle(0x211005); // Intérieur sombre
        gChestO.fillRect(18, 28, 28, 12);
        // Couvercle relevé en 3D
        gChestO.fillStyle(0x8d6e63);
        gChestO.fillRect(14, 12, 36, 12);
        gChestO.fillStyle(0xffb300);
        gChestO.fillRect(14, 16, 36, 3);
        gChestO.generateTexture('tex_chest_opened', ts, ts).destroy();

        // --- 12. PNJ Cristal 2.5D (tex_npc) ---
        let gNpc = this.make.graphics({x:0, y:0, add:false});
        // Borne de navigation du passeur, taillée dans le schiste et le laiton.
        gNpc.fillStyle(0x48544d).fillRect(13, 49, 38, 8);
        gNpc.fillStyle(0x859080).fillRect(15, 46, 34, 6);
        gNpc.fillStyle(0xc4bda0).fillRect(16, 45, 30, 3);
        gNpc.fillStyle(0x5c645a).fillRect(20, 34, 24, 11);
        gNpc.fillStyle(0xa59d81).fillRect(21, 34, 6, 11);
        gNpc.fillStyle(0xcb9a59).fillRect(18, 32, 28, 4);
        for (let row = 0; row < 25; row++) {
            const half = Math.max(1, Math.round(Math.min(row + 1, 25 - row) * 0.7));
            gNpc.fillStyle(0x355c60).fillRect(32 - half, row + 5, half * 2, 1);
            gNpc.fillStyle(0x62b8ad).fillRect(33 - half, row + 5, half, 1);
            if (row > 6 && row < 16) gNpc.fillStyle(0xc4ecce).fillRect(34 - half, row + 5, 2, 1);
        }
        gNpc.generateTexture('tex_npc', ts, ts).destroy();

        // --- 13. Particule feuille (tex_leaf) ---
        let gLeaf = this.make.graphics({x:0, y:0, add:false});
        gLeaf.fillStyle(0x7cb342, 0.9);
        gLeaf.fillRect(0, 0, 6, 6);
        gLeaf.generateTexture('tex_leaf', 6, 6).destroy();

        // --- 14. Mur intérieur (tex_wall) ---
        let gWall = this.make.graphics({x:0, y:0, add:false});
        gWall.fillStyle(0x4e342e);
        gWall.fillRect(0, 0, ts, ts);
        gWall.fillStyle(0x3e2723);
        gWall.fillRect(0, ts - 8, ts, 8);
        gWall.fillStyle(0x6d4c41);
        gWall.fillRect(0, 16, ts, 2);
        gWall.fillRect(0, 36, ts, 2);
        gWall.generateTexture('tex_wall', ts, ts).destroy();
    }

    handleInteraction(zone) {
        const state = window.gameState;
        if (zone.npcData) {
            this.events.emit('StartDialogue', zone.npcData.name, state.speakToGuide(zone.npcData));
        } else if (zone.chestData) {
            const data = zone.chestData;
            const passageChest = this.currentMapData.passage?.chestId === data.id;
            if (state.openChest(data, passageChest)) {
                zone.sprite.setTexture('tex_chest_opened');
                this.events.emit('Notice', passageChest ? 'Navette du passeur · 3 potions' : data.item.name);
                window.audioManager.play('collect');
            } else if (!state.openChests.includes(data.id)) {
                this.events.emit('Notice', 'Le gardien veille encore.');
            }
        }
    }

    contextTarget() {
        return this.interactiveZones.getChildren().find(zone =>
            !window.gameState.openChests.includes(zone.chestData?.id) &&
            this.physics.overlap(this.player.interactionHitbox, zone));
    }

    update(time, delta) {
        if (this.transitioning || window.privacyDialogOpen) return;
        if (window.gameState.player.hp <= 0) {
            if (!this.isDead) {
                this.isDead = true;
                this.player.setTint(0xff0000);
                this.player.active = false;
                this.player.setVelocity(0);
                let txt = this.add.text(this.player.x, this.player.y - 20, "Retour au village…", { fontSize: '32px', fontFamily: '"Press Start 2P"', color: '#ff0000', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(10000);
                this.time.delayedCall(1100, () => {
                    window.gameState.player.hp = window.gameState.player.maxHp;
                    window.gameState.save();
                    this.scene.stop('HUDScene');
                    this.scene.restart({ map: 'Village' });
                });
            }
            return;
        }

        this.player.update(delta);
        
        // Synchronisation de l'ombre au sol du joueur (baseY - 0.5)
        if (this.playerShadow) {
            this.playerShadow.setPosition(this.player.x, this.player.y);
            this.playerShadow.setDepth(Math.floor(this.player.y) - 0.5);
        }
        
        // Synchronisation des ombres des ennemis
        this.enemies.getChildren().forEach(e => {
            if (e.shadow && e.active) {
                e.shadow.setPosition(e.x, e.y);
                e.shadow.setDepth(Math.floor(e.y) - 0.5);
            }
            if (e.hp <= 0 && e.shadow) {
                e.shadow.destroy();
                e.shadow = null;
            }
        });

        // Mise à jour de l'OcclusionManager (transparence dynamique des toits et canopées)
        if (this.occlusionManager) {
            this.occlusionManager.update(this.player);
        }

        if (!this.player.active || this.player.isAttacking) return;
        if (this.player.body.velocity.length() > 0) this.hasMoved = true;
        const target = this.contextTarget();
        this.contextHint = target ? (target.npcData ? 'E · Parler' : 'E · Ouvrir') : '';
        if (Phaser.Input.Keyboard.JustDown(this.interactKey) && target) this.handleInteraction(target);
        const passage = this.currentMapData.passage;
        if (passage && window.gameState.passage === 'cross' &&
            this.player.y >= passage.landing.y * this.currentMapData.tileSize + 10) {
            window.gameState.passage = 'fight';
            window.gameState.save();
            const ts = this.currentMapData.tileSize;
            this.createEnemy((passage.guard.x + 0.5) * ts, (passage.guard.y + 0.5) * ts, 'minor');
        }
    }

    hitMinorEnemy(weaponBox, enemy) {
        if (!enemy.isFlashing && !this.player.hitTargets.has(enemy)) {
            this.player.hitTargets.add(enemy);
            let dmg = window.gameState ? window.gameState.player.damage : 10;
            enemy.takeDamage(dmg);
            this.impact(weaponBox.x, weaponBox.y, 0xffdf86);
            if (window.audioManager) window.audioManager.play('hit');
        }
    }

    impact(x, y, color) {
        for (const [dx, dy] of [[-8, -6], [7, -9], [-6, 5], [9, 3]]) {
            const fleck = this.add.rectangle(x, y - 6, 4, 3, color).setDepth(Math.floor(y) + 25);
            this.tweens.add({ targets: fleck, x: x + dx, y: y + dy - 6, alpha: 0,
                duration: 140, onComplete: () => fleck.destroy() });
        }
    }

    hitResource(weaponBox, resZone) {
        if (resZone.isDestroyed) return;
        if (resZone.isGate) {
            if (window.gameState.passage !== 'cut') {
                if (!this.player.hitTargets.has(resZone)) this.events.emit('Notice', 'Parle au guide près du panneau.');
                this.player.hitTargets.add(resZone);
                return;
            }
            window.gameState.passage = 'cross';
        }
        resZone.isDestroyed = true;
        
        this.events.emit('Notice', '+1 bois');
        
        for(let i=0; i<6; i++) {
            let p = this.add.rectangle(resZone.x, resZone.y, 8, 8, 0x4caf50);
            p.setDepth(Math.floor(resZone.y) + 10);
            this.physics.add.existing(p);
            p.body.setVelocity(Phaser.Math.Between(-80,80), Phaser.Math.Between(-100,20));
            this.tweens.add({ targets: p, alpha: 0, duration: 600, onComplete: () => p.destroy() });
        }
        
        let itemId = 'wood';
        let itemName = 'Bois';
        window.gameState.addItem({ id: itemId, name: itemName, qty: 1 });
        if (window.audioManager) window.audioManager.play('collect');
        
        let txt = this.add.text(resZone.x, resZone.y - 20, `+1 ${itemName}`, { fontSize: '10px', fontFamily: '"Press Start 2P"', color: '#ffffff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5).setDepth(9002);
        this.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
        
        resZone.sprite.destroy();
        this.walls.remove(resZone);
        resZone.destroy();
    }

    enterDoor(player, doorZone) {
        if (!player.active || this.isDead || this.transitioning) return;
        this.transitioning = true;
        player.setVelocity(0);
        let door = doorZone.doorData;
        this.scene.stop('HUDScene');
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.time.delayedCall(300, () => {
            this.scene.restart({ map: door.targetMap, spawn: door.targetSpawn });
        });
    }

    startBossBattle(player, boss) {
        boss.destroy();
        this.cameras.main.fadeOut(500, 255, 255, 255);
        this.time.delayedCall(500, () => {
            this.scene.sleep();
            this.scene.run('BattleScene');
        });
    }
}
