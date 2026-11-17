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
                maxY: sprite.y + sprite.displayHeight * (1 - sprite.originY)
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
        this.isTransitioning = false;
        this.controlsLocked = false;
        this.interactionHint = '';
    }

    preload() {
        this.load.spritesheet('hero', 'assets/hero_spritesheet.png', { frameWidth: 341, frameHeight: 256 });
        this.load.image('enemy', 'assets/enemy.png');
    }

    create() {
        this.currentMapData = MapsData[this.targetMapName];
        const ts = this.currentMapData.tileSize;
        
        const layout = this.currentMapData.layoutText;
        const height = layout.length;
        const width = layout[0].length;

        this.physics.world.setBounds(0, 0, width * ts, height * ts);

        this.walls = this.physics.add.staticGroup();
        this.interactiveZones = this.physics.add.staticGroup();
        this.enemies = this.physics.add.group({ collideWorldBounds: true, immovable: false });
        this.bossGroup = this.physics.add.group();
        this.resourceGroup = this.physics.add.staticGroup();
        this.doorGroup = this.physics.add.staticGroup();

        // Gestionnaire d'occlusion dynamique pour toits et feuillages
        this.occlusionManager = new OcclusionManager(this);

        // 1. Génération des textures pixel-art volumétriques 2.5D
        this.generateTextures(ts);

        let terrainGraphics = this.add.graphics();
        terrainGraphics.setDepth(0);
        let dirtGraphics = this.add.graphics();
        dirtGraphics.setDepth(1);
        
        let spawnX = ts * 5 + ts/2, spawnY = ts * 3 + ts/2;
        let houseCells = [];

        // 2. Rendu de la carte 2.5D
        for(let y = 0; y < height; y++) {
            for(let x = 0; x < width; x++) {
                let cell = layout[y][x];
                let px = x * ts;
                let py = y * ts;
                let cx = px + ts/2;
                let cy = py + ts/2;

                // --- Base Herbe et Sol ---
                if (cell !== 'w' && cell !== 'f' && cell !== 'W' && cell !== 'B') {
                    // Base Herbe riche et chaleureuse (Akira Toriyama fantasy style)
                    terrainGraphics.fillStyle(0x729750);
                    terrainGraphics.fillRect(px, py, ts, ts);
                    
                    // Touffes d'herbe et fleurs procédurales
                    let rand = (x * 13 + y * 7) % 100;
                    if (rand < 55) {
                        terrainGraphics.fillStyle(0x5c8246); // Touffes vert foncé
                        terrainGraphics.fillRect(px + 8, py + 16, 8, 4);
                        terrainGraphics.fillRect(px + 12, py + 12, 4, 4);
                        terrainGraphics.fillRect(px + 40, py + 44, 12, 4);
                        terrainGraphics.fillStyle(0x88a95d); // Reflet soleil
                        terrainGraphics.fillRect(px + 8, py + 14, 4, 2);
                    }
                    if (rand < 18) { // Fleurs multicolores (marguerites, boutons d'or, coquelicots)
                        let flowerColor = (rand % 3 === 0) ? 0xffffff : (rand % 3 === 1) ? 0xffd54f : 0xe74c3c;
                        terrainGraphics.fillStyle(flowerColor);
                        terrainGraphics.fillRect(px + 32, py + 24, 4, 4);
                        terrainGraphics.fillStyle(0xfff176); // Centre
                        terrainGraphics.fillRect(px + 32, py + 26, 4, 2);
                    }
                    if (rand > 80 && rand < 90) { // Petits cailloux de prairie
                        terrainGraphics.fillStyle(0x78909c);
                        terrainGraphics.fillRect(px + 20, py + 36, 6, 4);
                        terrainGraphics.fillStyle(0xb0bec5);
                        terrainGraphics.fillRect(px + 20, py + 34, 4, 2);
                    }
                }

                // --- Eau encaissée (-20px) 2.5D ---
                if (cell === 'W') {
                    // Lit de rivière encaissé avec ombre de berge nord
                    terrainGraphics.fillStyle(0x1a4b66); // Ombre de la berge nord
                    terrainGraphics.fillRect(px, py, ts, ts);
                    terrainGraphics.fillStyle(0x256588); // Corps de l'eau
                    terrainGraphics.fillRect(px, py + 8, ts, ts - 8);
                    
                    this.add.sprite(cx, cy, 'tex_water_0').play('water-flow').setDepth(1);
                    
                    // Mur bloquant l'eau
                    this.createWall(cx, cy, ts);
                }

                // --- Pont en bois 2.5D surélevé avec garde-corps ---
                if (cell === 'B') {
                    // Eau sous le pont
                    terrainGraphics.fillStyle(0x1a4b66);
                    terrainGraphics.fillRect(px, py, ts, ts);
                    terrainGraphics.fillStyle(0x256588);
                    terrainGraphics.fillRect(px, py + 8, ts, ts - 8);

                    // Tablier de pont en bois surélevé
                    terrainGraphics.fillStyle(0x3e2723); // Ombre portée du tablier
                    terrainGraphics.fillRect(px, py + 14, ts, ts - 16);
                    terrainGraphics.fillStyle(0x8a6235); // Planches de chêne
                    terrainGraphics.fillRect(px, py + 10, ts, ts - 20);
                    
                    // Lattes de bois et clous
                    terrainGraphics.fillStyle(0x4e342e);
                    terrainGraphics.fillRect(px, py + 18, ts, 2);
                    terrainGraphics.fillRect(px, py + 32, ts, 2);
                    terrainGraphics.fillRect(px, py + 46, ts, 2);

                    // Garde-corps latéraux
                    let isWestEdge = x > 0 && layout[y][x - 1] === 'W';
                    let isEastEdge = x < width - 1 && layout[y][x + 1] === 'W';

                    if (isWestEdge) {
                        this.createBridgeRailing(px + 4, py, ts);
                        this.createWall(px + 4, cy, 8, ts);
                    }
                    if (isEastEdge) {
                        this.createBridgeRailing(px + ts - 4, py, ts);
                        this.createWall(px + ts - 4, cy, 8, ts);
                    }
                }

                // --- Intérieur (House 1) ---
                if (cell === 'f' || cell === 'w') {
                    terrainGraphics.fillStyle(0x151515);
                    terrainGraphics.fillRect(px, py, ts, ts);
                    if (cell === 'f') {
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
                if (cell === 'd') {
                    dirtGraphics.fillStyle(0xbfa570); // Terre battue
                    dirtGraphics.fillRect(px, py, ts, ts);
                    
                    // Gravillons et ornières
                    dirtGraphics.fillStyle(0xa68d5f);
                    dirtGraphics.fillRect(px + 16, py + 16, 4, 4);
                    dirtGraphics.fillRect(px + 44, py + 32, 6, 4);
                    dirtGraphics.fillStyle(0xd3bc89);
                    dirtGraphics.fillRect(px + 28, py + 48, 8, 4);

                    // Bords herbeux organiques
                    let top = y > 0 ? layout[y-1][x] : null;
                    let bottom = y < height-1 ? layout[y+1][x] : null;
                    let left = x > 0 ? layout[y][x-1] : null;
                    let right = x < width-1 ? layout[y][x+1] : null;

                    dirtGraphics.fillStyle(0x729750);
                    if (top !== 'd') {
                        dirtGraphics.fillRect(px, py, ts, 8);
                        dirtGraphics.fillRect(px + 12, py + 8, 16, 8);
                        dirtGraphics.fillRect(px + 40, py + 8, 8, 4);
                    }
                    if (bottom !== 'd') {
                        dirtGraphics.fillRect(px, py + ts - 8, ts, 8);
                        dirtGraphics.fillRect(px + 20, py + ts - 16, 12, 8);
                    }
                    if (left !== 'd') {
                        dirtGraphics.fillRect(px, py, 8, ts);
                        dirtGraphics.fillRect(px + 8, py + 24, 8, 16);
                    }
                    if (right !== 'd') {
                        dirtGraphics.fillRect(px + ts - 8, py, 8, ts);
                        dirtGraphics.fillRect(px + ts - 16, py + 16, 8, 12);
                    }
                }

                // --- OBJETS 2.5D (Depth Y-sorting unifié) ---
                if (cell === 'T') {
                    this.createTree(cx, cy, ts, false);
                    if (x === 0 || y === 0 || x === width - 1 || y === height - 1) this.createWall(cx, cy, ts);
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
                    this.createEnemy(cx, cy, 'minor', `${this.targetMapName}:${x}:${y}`);
                } else if (cell === 'b') {
                    // Correctif Bug M4 : 'b' minuscule pour buisson récoltable
                    this.createResource(cx, cy, ts, 'bush', `${this.targetMapName}:${x}:${y}`);
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

        // Rasterize thousands of static terrain rectangles once, rather than
        // replaying their Graphics commands on every frame. Animated water and
        // Y-sorted objects remain independent.
        this.bakeGround(terrainGraphics, 'terrain', width * ts, height * ts, 0);
        this.bakeGround(dirtGraphics, 'paths', width * ts, height * ts, 1);

        // Bâtiments 2.5D en volume avec toits praticables et occlusion
        this.buildHouses(houseCells, ts);
        this.buildTerraces(ts);

        // --- JOUEUR (Ancrage 2.5D aux pieds) ---
        if (this.spawnOverride) {
            spawnX = this.spawnOverride.x * ts + ts/2;
            spawnY = this.spawnOverride.y * ts + ts/2;
        }
        this.player = new Player(this, spawnX, spawnY, 'hero');
        this.player.setDepth(Math.floor(this.player.y));
        
        // Ombre portée sous les pieds du joueur
        this.playerShadow = this.add.sprite(this.player.x, this.player.y, 'tex_shadow');
        this.playerShadow.setScale(1.6, 1.0);
        this.playerShadow.setDepth(Math.floor(this.player.y) - 0.5);

        // --- AMBIANCE & POST-PROCESSING 2.5D ---
        let overlayColor = this.targetMapName === "House1" ? 0x000000 : 0xdc9233;
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
        this.cameras.main.startFollow(this.player, true, GameFeelConfig.camera.followLerp, GameFeelConfig.camera.followLerp);
        this.cameras.main.setBounds(0, 0, width * ts, height * ts);
        this.cameras.main.setDeadzone(40, 30);
        this.cameras.main.setZoom(this.targetMapName === "House1" ? 1.5 : GameFeelConfig.camera.zoom);
        this.cameras.main.roundPixels = true;

        // --- COLLISIONS & PHYSIQUE ---
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.enemies, this.walls);
        this.physics.add.overlap(this.player.weaponHitbox, this.enemies, this.hitMinorEnemy, null, this);
        this.physics.add.overlap(this.player.weaponHitbox, this.resourceGroup, this.hitResource, null, this);
        this.physics.add.overlap(this.player, this.doorGroup, this.enterDoor, null, this);
        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            if (!this.controlsLocked && enemy.canDamagePlayer()) player.receiveDamage(GameFeelConfig.enemy.contactDamage, enemy);
        });

        this.input.keyboard.on('keydown-E', () => {
            if (this.controlsLocked || this.isTransitioning || this.player.isAttacking) return;
            this.updateInteractionTarget();
            if (this.interactionTarget) this.handleInteraction(this.player.interactionHitbox, this.interactionTarget);
        });

        this.cameras.main.fadeIn(250, 0, 0, 0);
        if (this.targetMapName === 'Village') this.tutorial = new TutorialManager(this);
        else this.tutorial = null;
        this.events.on('EnemyDefeated', this.onEnemyDefeated, this);
        this.events.once('shutdown', () => {
            this.events.off('EnemyDefeated', this.onEnemyDefeated, this);
            this.input.keyboard.removeAllListeners('keydown-E');
        });
        this.scene.launch('HUDScene');
    }

    createWall(cx, cy, width, height = width) {
        let wall = this.add.zone(cx, cy, width, height);
        this.physics.add.existing(wall, true);
        this.walls.add(wall);
        return wall;
    }

    bakeGround(graphics, layer, width, height, depth) {
        const key = `${this.targetMapName}-${layer}`;
        if (!this.textures.exists(key)) graphics.generateTexture(key, width, height);
        graphics.destroy();
        this.add.image(0, 0, key).setOrigin(0, 0).setDepth(depth);
    }

    createBridgeRailing(x, y, ts) {
        // Each short segment sorts against the feet, including the foreground posts.
        for (let offset = 0; offset < ts; offset += 16) {
            const rail = this.add.graphics().setDepth(y + offset + 16);
            rail.fillStyle(0x493a29);
            rail.fillRect(x - 3, y + offset - 8, 6, 24);
            rail.fillStyle(0xaa8250);
            rail.fillRect(x - 4, y + offset - 10, 6, 4);
            rail.fillRect(x - 2, y + offset - 4, 2, 16);
        }
    }

    createProp(cx, cy, ts, tex) {
        let sprite = this.add.sprite(cx, cy + ts * 0.2, tex);
        sprite.setOrigin(0.5, 0.95);
        let baseDepth = Math.floor(cy + ts * 0.2);
        sprite.setDepth(baseDepth);
        let shadow = this.add.sprite(cx, cy + ts * 0.2, 'tex_shadow');
        shadow.setScale(1.2, 0.8);
        shadow.setDepth(baseDepth - 0.5);
        return sprite;
    }

    createTree(cx, cy, ts, isSmall) {
        if (!isSmall) {
            // Grand Arbre Volumétrique 2.5D (Canopée multi-couches et tronc visible)
            let trunkBaseY = cy + ts * 0.35;
            // Collider restreint strictement au tronc au sol (~36x18 px)
            this.createWall(cx, trunkBaseY, 36, 18);
            
            let tree = this.add.sprite(cx, trunkBaseY + 5, 'tex_tree');
            tree.setOrigin(0.5, 0.95);
            let baseDepth = Math.floor(trunkBaseY + 5);
            tree.setDepth(baseDepth);
            
            // Ombre au sol sous le tronc
            let shadow = this.add.sprite(cx, trunkBaseY, 'tex_shadow');
            shadow.setScale(2.4, 1.4);
            shadow.setDepth(baseDepth - 0.5);

            // Enregistrement de la canopée dans l'OcclusionManager
            if (this.occlusionManager) {
                this.occlusionManager.register(
                    tree,
                    {
                        minX: cx - 64,
                        maxX: cx + 64,
                        minY: trunkBaseY - 150,
                        maxY: trunkBaseY - 20
                    },
                    0.35,
                    baseDepth
                );
            }
        } else {
            // Petit Arbre Volumétrique 2.5D
            let trunkBaseY = cy + ts * 0.25;
            this.createWall(cx, trunkBaseY, 24, 14);

            let tree = this.add.sprite(cx, trunkBaseY + 4, 'tex_tree_small');
            tree.setOrigin(0.5, 0.95);
            let baseDepth = Math.floor(trunkBaseY + 4);
            tree.setDepth(baseDepth);

            let shadow = this.add.sprite(cx, trunkBaseY, 'tex_shadow');
            shadow.setScale(1.5, 1.0);
            shadow.setDepth(baseDepth - 0.5);

            if (this.occlusionManager) {
                this.occlusionManager.register(
                    tree,
                    {
                        minX: cx - 32,
                        maxX: cx + 32,
                        minY: trunkBaseY - 90,
                        maxY: trunkBaseY - 15
                    },
                    0.35,
                    baseDepth
                );
            }
        }
    }

    createCliff(cx, cy, ts, x, y, layout, width, height) {
        let hasBelow = y < height - 1 && layout[y + 1][x] === 'C';
        let cliff = this.add.sprite(cx, cy, hasBelow ? 'tex_cliff_top' : 'tex_cliff');
        let baseDepth = Math.floor(cy + ts * 0.5);
        cliff.setDepth(baseDepth);

        // Si la case en-dessous n'est pas une falaise, c'est la paroi verticale frontale
        if (!hasBelow) {
            this.createWall(cx, cy + ts * 0.15, ts, ts * 0.7);
            let shadow = this.add.sprite(cx, cy + ts * 0.45, 'tex_shadow');
            shadow.setScale(2.2, 0.8);
            shadow.setDepth(baseDepth - 0.5);
        } else {
            this.createWall(cx, cy, ts, ts);
        }
    }

    createRuin(cx, cy, ts, isSmall) {
        if (!isSmall) {
            this.createWall(cx, cy + ts * 0.25, ts * 0.7, ts * 0.4);
        }
        let sprite = this.add.sprite(cx, cy + ts * 0.25, isSmall ? 'tex_ruin_small' : 'tex_ruin');
        sprite.setOrigin(0.5, 0.95);
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
        sprite.setScale(0.8);
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
        zone.questIndicator = indicator;
        this.interactiveZones.add(zone);
    }

    createEnemy(cx, cy, type, id) {
        if (window.gameState.isWorldObjectDone('defeatedEnemies', id)) return;
        let enemy = new Enemy(this, cx, cy, 'tex_slime', type);
        enemy.spawnId = id;
        let shadow = this.add.sprite(cx, cy, 'tex_shadow');
        shadow.setScale(1.6, 1.0);
        shadow.setDepth(Math.floor(cy) - 0.5);
        enemy.shadow = shadow;
        this.enemies.add(enemy);
    }

    createResource(cx, cy, ts, type, id) {
        if (window.gameState.isWorldObjectDone('clearedResources', id)) return;
        const isGate = this.currentMapData.tutorial && this.currentMapData.tutorial.gateId === id;
        let zone = this.createWall(cx, cy + ts * 0.2, isGate ? ts : 28, isGate ? 32 : 20);
        let sprite = this.add.sprite(cx, cy + ts * 0.2, 'tex_bush');
        sprite.setOrigin(0.5, 0.85);
        sprite.setDepth(Math.floor(cy + ts * 0.2));
        
        zone.resData = { type };
        zone.resourceId = id;
        zone.sprite = sprite;
        if (isGate) {
            sprite.setScale(1.5, 1);
            this.occlusionManager.register(sprite, null, 0.5, cy + ts * 0.2);
        }
        this.resourceGroup.add(zone);
    }

    createChest(cx, cy, ts, data) {
        data = { ...data, opened: window.gameState.isWorldObjectDone('openedChests', data.id) };
        this.createWall(cx, cy + ts * 0.15, 32, 20);
        let sprite = this.add.sprite(cx, cy + ts * 0.2, data.opened ? 'tex_chest_opened' : 'tex_chest_closed');
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

    buildTerraces(ts) {
        for (const terrace of this.currentMapData.terraces || []) {
            const x = terrace.x * ts, y = terrace.y * ts;
            const width = terrace.width * ts, height = terrace.height * ts;
            const stepsX = x + terrace.stairsColumn * ts;
            const g = this.add.graphics().setDepth(2);
            // Raised terrace with a distinct top and front; access is by stairs.
            g.fillStyle(0x8d9676); g.fillRect(x, y, width, height - 20);
            g.fillStyle(0xb3b394); g.fillRect(x, y, width, 4);
            g.fillStyle(0x596554); g.fillRect(x, y + height - 20, width, 28);
            g.fillStyle(0x75816a); g.fillRect(x, y + height - 20, width, 4);
            g.fillStyle(0x8a9774);
            for (let row = 8; row < height - 24; row += 24) {
                for (let col = 8; col < width - 8; col += 32) g.fillRect(x + col, y + row, 24, 2);
            }
            for (let step = 0; step < 5; step++) {
                g.fillStyle(0x596554); g.fillRect(stepsX, y + height - 20 + step * 8, ts, 8);
                g.fillStyle(0xb3b394); g.fillRect(stepsX + 2, y + height - 20 + step * 8, ts - 4, 3);
            }
            this.createWall(x + 4, y + height / 2, 8, height);
            this.createWall(x + width - 4, y + height / 2, 8, height);
            this.createWall(x + width / 2, y + 4, width, 8);
            if (stepsX > x) this.createWall((x + stepsX) / 2, y + height - 8, stepsX - x, 16);
            const rightStart = stepsX + ts;
            if (rightStart < x + width) this.createWall((rightStart + x + width) / 2, y + height - 8, x + width - rightStart, 16);
        }
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
            let doorZone = this.add.zone(cx, maxY * ts + ts * 0.65, ts * 0.6, ts * 0.7);
            this.physics.add.existing(doorZone, true);
            doorZone.doorData = {
                targetMap: this.currentMapData.doorsData.houseDoorTarget,
                targetSpawn: this.currentMapData.doorsData.houseSpawn
            };
            this.doorGroup.add(doorZone);
        }
    }

    generateTextures(ts) {
        PixelArt.generate(this, ts);
        if (!this.anims.exists('water-flow')) {
            this.anims.create({ key: 'water-flow', frames: [0, 1, 2].map(i => ({ key: `tex_water_${i}` })), frameRate: 3, repeat: -1 });
        }
    }

    handleInteraction(playerHitbox, interactiveZone) {
        if(interactiveZone.npcData) {
            let npc = interactiveZone.npcData;
            const dialogue = this.tutorial ? this.tutorial.onGuideInteraction(npc) : npc.dialogue;
            this.events.emit('StartDialogue', npc.name, dialogue, () => {});
            if (window.gameState && window.gameState.completeQuestGoal) {
                window.gameState.completeQuestGoal('talk', npc.id);
            }
        }
        else if (interactiveZone.chestData) {
            let chest = interactiveZone.chestData;
            if(!chest.opened) {
                if (this.tutorial && !this.tutorial.canOpenChest(chest.id)) return;
                chest.opened = true;
                interactiveZone.sprite.setTexture('tex_chest_opened');
                window.gameState.markWorldObject('openedChests', chest.id);
                window.gameState.addItem(chest.item);
                if (this.tutorial) this.tutorial.onChestOpened(chest.id);
                this.events.emit('ItemCollected', `${chest.item.name} ×${chest.item.qty}`);
                
                let txt = this.add.text(this.player.x, this.player.y - 50, `Obtenu: ${chest.item.name} x${chest.item.qty}`, { fontSize: '12px', color: '#ffff00', fontFamily: '"Press Start 2P"', stroke: '#000', strokeThickness: 4 });
                txt.setDepth(9002);
                this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 2000, onComplete: () => txt.destroy() });
                if (window.audioManager) window.audioManager.play('collect');
            }
        }
    }

    update(time, delta) {
        if (window.gameState.player.hp <= 0) {
            if (!this.isDead) {
                this.isDead = true;
                this.controlsLocked = true;
                this.player.cancelAttack();
                this.player.setTint(0xff0000);
                this.player.active = false;
                this.player.setVelocity(0);
                let txt = this.add.text(this.player.x, this.player.y - 20, "GAME OVER", { fontSize: '32px', fontFamily: '"Press Start 2P"', color: '#ff0000', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(10000);
                this.time.delayedCall(1800, () => {
                    window.gameState.restoreAtCheckpoint();
                    this.scene.stop('HUDScene');
                    this.scene.restart({ map: 'Village' });
                });
            }
            return;
        }

        this.player.update(time, delta);
        
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

        if (this.tutorial) this.tutorial.update();
        this.updateInteractionTarget();
    }

    updateInteractionTarget() {
        this.interactionTarget = null;
        let closest = 100;
        for (const zone of this.interactiveZones.getChildren()) {
            if (!zone.active) continue;
            if (zone.chestData && zone.chestData.opened) continue;
            const dx = zone.x - this.player.x;
            const dy = zone.y - this.player.y;
            const distance = Math.hypot(dx, dy);
            const inFront = (this.player.facing === 'left' && dx <= 20) ||
                (this.player.facing === 'right' && dx >= -20) ||
                (this.player.facing === 'up' && dy <= 20) ||
                (this.player.facing === 'down' && dy >= -20);
            if (distance < closest && inFront) {
                closest = distance;
                this.interactionTarget = zone;
            }
        }
        const zone = this.interactionTarget;
        for (const interactive of this.interactiveZones.getChildren()) {
            if (interactive.questIndicator) interactive.questIndicator.setVisible(!window.gameState.world.tutorial.completed);
        }
        this.interactionHint = !zone ? '' : zone.npcData ? '[E] Parler au guide' :
            (this.tutorial && !this.tutorial.canOpenChest(zone.chestData.id)) ? 'Vaincre la sentinelle pour ouvrir' : '[E] Ouvrir le coffre';
    }

    onEnemyDefeated(id) {
        window.gameState.markWorldObject('defeatedEnemies', id);
        if (this.tutorial) this.tutorial.onEnemyDefeated(id);
    }

    hitMinorEnemy(weaponBox, enemy) {
        if (!this.controlsLocked && !enemy.isFlashing && this.player.canHitTarget(enemy)) {
            let dmg = window.gameState ? window.gameState.player.damage : 10;
            enemy.takeDamage(dmg, this.player);
            this.cameras.main.shake(100, 0.005);
            if (window.audioManager) window.audioManager.play('hit');
        }
    }

    hitResource(weaponBox, resZone) {
        if (this.controlsLocked || resZone.isDestroyed || !this.player.canHitTarget(resZone)) return;
        resZone.isDestroyed = true;
        window.gameState.markWorldObject('clearedResources', resZone.resourceId);
        if (this.tutorial) this.tutorial.onResourceCleared(resZone.resourceId);
        
        this.cameras.main.shake(50, 0.005);
        
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
        this.events.emit('ItemCollected', `+1 ${itemName}`);
        if (window.audioManager) window.audioManager.play('collect');
        
        let txt = this.add.text(resZone.x, resZone.y - 20, `+1 ${itemName}`, { fontSize: '10px', fontFamily: '"Press Start 2P"', color: '#ffffff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5).setDepth(9002);
        this.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
        
        resZone.sprite.destroy();
        this.walls.remove(resZone);
        resZone.destroy();
    }

    enterDoor(player, doorZone) {
        if (this.controlsLocked || this.isTransitioning) return;
        this.isTransitioning = true;
        this.controlsLocked = true;
        this.player.cancelAttack();
        this.player.setVelocity(0);
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
