class WorldScene extends Phaser.Scene {
    constructor() {
        super('WorldScene');
    }

    init(data) {
        this.targetMapName = data.map || "Village";
        this.spawnOverride = data.spawn || null;
    }

    preload() {
        this.load.spritesheet('hero', 'assets/hero_spritesheet.png', { frameWidth: 341, frameHeight: 256 });
        this.load.image('enemy', 'assets/enemy.png');
        this.load.image('tree_main', 'assets/tree_main.png');
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
        this.enemies = this.physics.add.group();
        this.bossGroup = this.physics.add.group();
        this.resourceGroup = this.physics.add.staticGroup();
        this.doorGroup = this.physics.add.staticGroup();

        // 1. Generation des textures pixel-art blocky
        this.generateTextures(ts);

        let terrainGraphics = this.add.graphics();
        terrainGraphics.setDepth(0);
        let dirtGraphics = this.add.graphics();
        dirtGraphics.setDepth(1);
        let waterOverlapGraphics = this.add.graphics();
        waterOverlapGraphics.setDepth(2);
        
        let spawnX = ts, spawnY = ts;
        let houseCells = [];

        // 2. Rendering Auto-tiled map
        for(let y = 0; y < height; y++) {
            for(let x = 0; x < width; x++) {
                let cell = layout[y][x];
                let px = x * ts;
                let py = y * ts;
                let cx = px + ts/2;
                let cy = py + ts/2;

                // Ground Layer
                if (cell !== 'w' && cell !== 'f' && cell !== 'W' && cell !== 'B') {
                    // Base Herbe (vert riche et vibrant comme le mockup)
                    terrainGraphics.fillStyle(0x5c9e2b);
                    terrainGraphics.fillRect(px, py, ts, ts);
                    
                    // Touffes d'herbe pixel-art procédurales
                    let rand = (x * 13 + y * 7) % 100;
                    if (rand < 60) {
                        terrainGraphics.fillStyle(0x46821a); // Touffes foncées
                        terrainGraphics.fillRect(px + 8, py + 16, 8, 4);
                        terrainGraphics.fillRect(px + 12, py + 12, 4, 4);
                        terrainGraphics.fillRect(px + 40, py + 48, 12, 4);
                    }
                    if (rand < 20) { // Fleurs
                        terrainGraphics.fillStyle(0xffffff); // Marguerite
                        terrainGraphics.fillRect(px + 32, py + 24, 4, 4);
                        terrainGraphics.fillStyle(0xffff00); // Centre
                        terrainGraphics.fillRect(px + 32, py + 28, 4, 4);
                    }
                }

                // Eau
                if (cell === 'W') {
                    terrainGraphics.fillStyle(0x3a7ca5); // Bleu clair
                    terrainGraphics.fillRect(px, py, ts, ts);
                    terrainGraphics.fillStyle(0x4a8cb5); // vague
                    terrainGraphics.fillRect(px + 16, py + 16, 24, 4);
                    terrainGraphics.fillRect(px + 40, py + 48, 16, 4);
                    this.createWall(cx, cy, ts); // bloque
                }

                // Pont
                if (cell === 'B') {
                    terrainGraphics.fillStyle(0x3a7ca5); // Eau sous le pont
                    terrainGraphics.fillRect(px, py, ts, ts);
                    terrainGraphics.fillStyle(0x8a6235); // Bois
                    terrainGraphics.fillRect(px, py + 8, ts, ts-16);
                    terrainGraphics.fillStyle(0x5e3a1f); // Lignes
                    terrainGraphics.fillRect(px, py + 12, ts, 4);
                    terrainGraphics.fillRect(px, py + ts - 16, ts, 4);
                }

                // Intérieur
                if (cell === 'f' || cell === 'w') {
                    terrainGraphics.fillStyle(0x151515);
                    terrainGraphics.fillRect(px, py, ts, ts);
                    if (cell === 'f') {
                        dirtGraphics.fillStyle(0x8a6b4e);
                        dirtGraphics.fillRect(px+4, py+4, ts-8, ts-8);
                    } else if (cell === 'w') {
                        this.createIndoorWall(cx, cy, ts);
                    }
                }

                // Dirt Path & Auto-Tiling
                if (cell === 'd') {
                    dirtGraphics.fillStyle(0xc49a62); // Chemin plus doux
                    dirtGraphics.fillRect(px, py, ts, ts);
                    // Cailloux
                    dirtGraphics.fillStyle(0xa37b4a);
                    dirtGraphics.fillRect(px + 16, py + 16, 4, 4);
                    dirtGraphics.fillRect(px + 48, py + 32, 8, 4);

                    // Auto-tiling : Herbe débordant sur la terre (Casser les rectangles !)
                    let top = y > 0 ? layout[y-1][x] : null;
                    let bottom = y < height-1 ? layout[y+1][x] : null;
                    let left = x > 0 ? layout[y][x-1] : null;
                    let right = x < width-1 ? layout[y][x+1] : null;

                    dirtGraphics.fillStyle(0x5c9e2b); // couleur herbe vibrante
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

                // --- OBJETS (Depth Y) ---
                if (cell === 'T') {
                    this.createTree(cx, cy, ts, false);
                } else if (cell === 't') {
                    this.createTree(cx, cy, ts, true);
                } else if (cell === 'C') {
                    this.createCliff(cx, cy, ts);
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
                    this.createEnemy(cx, cy, 'minor');
                } else if (cell === 'B') {
                    this.createResource(cx, cy, ts, 'bush');
                } else if (cell === 'o') {
                    this.createChest(cx, cy, ts, this.currentMapData.chestsData['o']);
                } else if (cell === '>') {
                    this.createProp(cx, cy, ts, 'tex_sign');
                } else if (cell === 'x') {
                    this.createProp(cx, cy, ts, 'tex_fence');
                    this.createWall(cx, cy, ts); // La cloture bloque
                }
            }
        }

        // Houses
        this.buildHouses(houseCells, ts);

        // --- PLAYER ---
        if (this.spawnOverride) {
            spawnX = this.spawnOverride.x * ts + ts/2;
            spawnY = this.spawnOverride.y * ts + ts/2;
        }
        this.player = new Player(this, spawnX, spawnY, 'hero');
        this.player.setDepth(this.player.y);
        
        // Player shadow
        this.playerShadow = this.add.sprite(this.player.x, this.player.y, 'tex_shadow');

        // --- ATMOSPHERE ---
        let overlayColor = this.targetMapName === "House1" ? 0x000000 : 0xdc9233; // orange doux
        let overlayAlpha = this.targetMapName === "House1" ? 0.3 : 0.15;
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

        // Camera
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, width * ts, height * ts);
        this.cameras.main.setZoom(this.targetMapName === "House1" ? 1.8 : 1.5);

        // Physics
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.enemies, this.walls);
        this.physics.add.overlap(this.player.weaponHitbox, this.enemies, this.hitMinorEnemy, null, this);
        this.physics.add.overlap(this.player.weaponHitbox, this.resourceGroup, this.hitResource, null, this);
        this.physics.add.overlap(this.player, this.doorGroup, this.enterDoor, null, this);

        this.input.keyboard.on('keydown-E', () => {
            this.physics.overlap(this.player.interactionHitbox, this.interactiveZones, this.handleInteraction, null, this);
        });

        this.scene.launch('HUDScene');
        if (this.targetMapName === "Village") this.setupTutorial();
    }

    createWall(cx, cy, width, height = width) {
        let wall = this.add.zone(cx, cy, width, height);
        this.physics.add.existing(wall, true);
        this.walls.add(wall);
        return wall;
    }

    createProp(cx, cy, ts, tex) {
        let sprite = this.add.sprite(cx, cy, tex);
        sprite.setDepth(cy);
    }

    createTree(cx, cy, ts, isSmall) {
        if (!isSmall) {
            // Nouvel asset "Arbre Principal"
            // La collision ne couvre que le tronc (plus petite que l'image)
            let hitboxY = cy + ts * 0.4;
            this.createWall(cx, hitboxY, ts * 1.5, ts * 0.8);
            
            let tree = this.add.sprite(cx, hitboxY + ts * 0.2, 'tree_main');
            tree.setScale(0.15); // Réduction de la taille pour coller au tile (1086px -> ~162px)
            // Pixel perfect / nearest neighbor filter for scaling
            tree.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            
            // On définit l'origine (point de référence Y) à la base du tronc
            tree.setOrigin(0.5, 0.92);
            
            // Le depth est géré par rapport à la base du tronc pour passer devant/derrière
            tree.setDepth(tree.y);
            
            // Ombre au sol
            let shadow = this.add.sprite(cx, hitboxY, 'tex_shadow');
            shadow.setScale(2, 1.5);
            shadow.setDepth(tree.y - 1);
        } else {
            // Petit arbre procédural
            this.createWall(cx, cy, ts);
            let tree = this.add.sprite(cx, cy - ts*0.1, 'tex_tree_small');
            tree.setDepth(cy + ts*0.1); 
        }
    }

    createCliff(cx, cy, ts) {
        this.createWall(cx, cy, ts);
        let cliff = this.add.sprite(cx, cy, 'tex_cliff');
        cliff.setDepth(cy);
    }

    createRuin(cx, cy, ts, isSmall) {
        if (!isSmall) this.createWall(cx, cy, ts); // On peut traverser les petites ruines
        let ruin = this.add.sprite(cx, cy, isSmall ? 'tex_ruin_small' : 'tex_ruin');
        ruin.setDepth(cy);
    }

    createIndoorWall(cx, cy, ts) {
        this.createWall(cx, cy, ts);
        let wall = this.add.sprite(cx, cy, 'tex_wall');
        wall.setDepth(cy);
    }

    createNPC(cx, cy, ts, data) {
        this.createWall(cx, cy, ts);
        let shadow = this.add.sprite(cx, cy + ts*0.2, 'tex_shadow');
        let sprite = this.add.sprite(cx, cy, 'tex_npc');
        
        shadow.setDepth(cy - 1);
        sprite.setDepth(cy);
        
        let indicator = this.add.text(cx, cy - ts*0.5, "!", { fontSize: '14px', color: '#ffea00', stroke: '#000', strokeThickness: 4, fontFamily: '"Press Start 2P"' }).setOrigin(0.5).setDepth(cy+1);
        
        // Float animation for indicator
        this.tweens.add({ targets: indicator, y: indicator.y - 4, duration: 800, yoyo: true, repeat: -1 });

        let zone = this.add.zone(cx, cy, ts*1.5, ts*1.5);
        this.physics.add.existing(zone, true);
        zone.npcData = data;
        this.interactiveZones.add(zone);
    }

    createEnemy(cx, cy, type) {
        let enemy = new Enemy(this, cx, cy, 'enemy', type);
        let shadow = this.add.sprite(cx, cy + 20, 'tex_shadow'); // attach to enemy logic maybe, or just static for test
        enemy.shadow = shadow; // stock reference to update position
        this.enemies.add(enemy);
    }

    createResource(cx, cy, ts, type) {
        let zone = this.createWall(cx, cy, ts);
        let sprite = this.add.sprite(cx, cy, 'tex_bush');
        sprite.setDepth(cy);
        
        zone.resData = { type };
        zone.sprite = sprite;
        this.resourceGroup.add(zone);
    }

    createChest(cx, cy, ts, data) {
        this.createWall(cx, cy, ts);
        let sprite = this.add.sprite(cx, cy, data.opened ? 'tex_chest_opened' : 'tex_chest_closed');
        sprite.setDepth(cy);

        let zone = this.add.zone(cx, cy, ts*1.2, ts*1.2);
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
        let cx = minX * ts + width/2;
        let cy = minY * ts + height/2;

        houseCells.forEach(c => this.createWall(c.x * ts + ts/2, c.y * ts + ts/2, ts));

        let houseSprite = this.add.sprite(cx, cy, 'tex_house');
        houseSprite.setDisplaySize(width, height + ts*0.8);
        houseSprite.setDepth(cy + height/2); 

        if (this.currentMapData.doorsData && this.currentMapData.doorsData.houseDoorTarget) {
            let doorZone = this.add.zone(cx, maxY * ts + ts/2, ts, ts);
            this.physics.add.existing(doorZone, true);
            doorZone.doorData = { targetMap: this.currentMapData.doorsData.houseDoorTarget, targetSpawn: this.currentMapData.doorsData.houseSpawn };
            this.doorGroup.add(doorZone);
            
            let g = this.add.graphics();
            g.fillStyle(0x111111);
            g.fillRect(cx - ts*0.3, maxY * ts, ts*0.6, ts);
            g.setDepth(cy + height/2 - 1); 
        }
    }

    generateTextures(ts) {
        // Pixel-Art blocky style generation
        // Omission of circles for crisp rects.
        
        // Shadow (Global usage)
        let gShadow = this.make.graphics({x:0,y:0,add:false});
        gShadow.fillStyle(0x000000, 0.4);
        gShadow.fillRect(-12, -4, 24, 8);
        gShadow.fillRect(-8, -8, 16, 16);
        gShadow.generateTexture('tex_shadow', 32, 20);

        // Tree Large (Fluffy, rounder shape)
        let gTree = this.make.graphics({x:0, y:0, add:false});
        gTree.fillStyle(0x000000, 0.4); // shadow
        gTree.fillRect(ts/2 - 20, ts - 8, 40, 12);
        
        gTree.fillStyle(0x4a2e1b); // trunk
        gTree.fillRect(ts/2 - 12, ts*0.4, 24, ts*0.6);
        gTree.fillStyle(0x2f1d11); // trunk shadow
        gTree.fillRect(ts/2 - 8, ts*0.4, 8, ts*0.6);
        
        // Canopy - Fluffy/Round layers
        gTree.fillStyle(0x1a4d1a); // dark green back
        gTree.fillRect(ts/2 - 32, ts*0.1, 64, 48);
        gTree.fillRect(ts/2 - 40, ts*0.15, 80, 36);
        gTree.fillRect(ts/2 - 24, ts*0.05, 48, 56);
        
        gTree.fillStyle(0x2a752a); // mid green
        gTree.fillRect(ts/2 - 24, ts*0.1, 48, 40);
        gTree.fillRect(ts/2 - 32, ts*0.15, 64, 28);
        gTree.fillRect(ts/2 - 16, ts*0.05, 32, 48);
        
        gTree.fillStyle(0x3ea33e); // light green front
        gTree.fillRect(ts/2 - 16, ts*0.1, 32, 32);
        gTree.fillRect(ts/2 - 24, ts*0.15, 48, 16);
        gTree.fillRect(ts/2 - 8, ts*0.05, 16, 40);
        gTree.generateTexture('tex_tree', ts*1.5, ts*1.2);

        // Tree Small (Fluffy)
        let gSTree = this.make.graphics({x:0, y:0, add:false});
        gSTree.fillStyle(0x000000, 0.4);
        gSTree.fillRect(ts/2 - 12, ts*0.8, 24, 8);
        gSTree.fillStyle(0x4a2e1b);
        gSTree.fillRect(ts/2 - 8, ts*0.4, 16, ts*0.5);
        
        gSTree.fillStyle(0x1a4d1a);
        gSTree.fillRect(ts/2 - 20, ts*0.2, 40, 32);
        gSTree.fillRect(ts/2 - 12, ts*0.15, 24, 40);
        
        gSTree.fillStyle(0x2a752a);
        gSTree.fillRect(ts/2 - 16, ts*0.25, 32, 24);
        gSTree.fillRect(ts/2 - 8, ts*0.15, 16, 32);
        
        gSTree.fillStyle(0x3ea33e);
        gSTree.fillRect(ts/2 - 8, ts*0.25, 16, 16);
        gSTree.generateTexture('tex_tree_small', ts, ts);

        // Bush
        let gBush = this.make.graphics({x:0,y:0,add:false});
        gBush.fillStyle(0x000000, 0.4);
        gBush.fillRect(ts/2 - 16, ts*0.7, 32, 12);
        gBush.fillStyle(0x1a4d1a);
        gBush.fillRect(ts/2 - 20, ts*0.3, 40, 32);
        gBush.fillStyle(0x2a752a);
        gBush.fillRect(ts/2 - 12, ts*0.2, 24, 24);
        gBush.generateTexture('tex_bush', ts, ts);

        // Ruin Big
        let gRuin = this.make.graphics({x:0,y:0,add:false});
        gRuin.fillStyle(0x000000, 0.4);
        gRuin.fillRect(ts/2 - 24, ts*0.8, 48, 12);
        gRuin.fillStyle(0x6b6b6b);
        gRuin.fillRect(ts/2 - 24, ts*0.1, 48, ts*0.7);
        gRuin.fillStyle(0x4a4a4a); // cracks
        gRuin.fillRect(ts/2 - 12, ts*0.3, 24, 8);
        gRuin.fillRect(ts/2 - 16, ts*0.6, 12, 8);
        gRuin.generateTexture('tex_ruin', ts, ts);

        // Ruin Small (Rock)
        let gRock = this.make.graphics({x:0,y:0,add:false});
        gRock.fillStyle(0x000000, 0.4);
        gRock.fillRect(ts/2 - 12, ts*0.8, 24, 8);
        gRock.fillStyle(0x6b6b6b);
        gRock.fillRect(ts/2 - 12, ts*0.5, 24, ts*0.3);
        gRock.fillStyle(0x8a8a8a);
        gRock.fillRect(ts/2 - 8, ts*0.5, 12, 8);
        gRock.generateTexture('tex_ruin_small', ts, ts);

        // Cliff
        let gCliff = this.make.graphics({x:0, y:0, add:false});
        gCliff.fillStyle(0x5c5c5c);
        gCliff.fillRect(0,0,ts,ts);
        gCliff.fillStyle(0x3d3d3d);
        gCliff.fillRect(0, ts*0.7, ts, ts*0.3); 
        gCliff.generateTexture('tex_cliff', ts, ts);

        // Signpost
        let gSign = this.make.graphics({x:0,y:0,add:false});
        gSign.fillStyle(0x000000, 0.4);
        gSign.fillRect(ts/2 - 8, ts*0.8, 16, 8);
        gSign.fillStyle(0x5e3a1f);
        gSign.fillRect(ts/2 - 4, ts*0.4, 8, ts*0.4); // post
        gSign.fillStyle(0x8a6235);
        gSign.fillRect(ts/2 - 16, ts*0.2, 32, 20); // board
        gSign.fillStyle(0x3a2512);
        gSign.fillRect(ts/2 - 12, ts*0.3, 24, 4); // text line
        gSign.generateTexture('tex_sign', ts, ts);

        // Fence
        let gFence = this.make.graphics({x:0,y:0,add:false});
        gFence.fillStyle(0x000000, 0.4);
        gFence.fillRect(ts/2 - 20, ts*0.8, 40, 8);
        gFence.fillStyle(0x5e3a1f);
        gFence.fillRect(ts/2 - 16, ts*0.3, 8, ts*0.5);
        gFence.fillRect(ts/2 + 8, ts*0.3, 8, ts*0.5);
        gFence.fillStyle(0x8a6235);
        gFence.fillRect(ts/2 - 24, ts*0.4, 48, 8);
        gFence.fillRect(ts/2 - 24, ts*0.6, 48, 8);
        gFence.generateTexture('tex_fence', ts, ts);

        // Chest Closed
        let gChest = this.make.graphics({x:0,y:0,add:false});
        gChest.fillStyle(0x000000, 0.4);
        gChest.fillRect(ts/2 - 16, ts*0.7, 32, 12);
        gChest.fillStyle(0x733a11);
        gChest.fillRect(ts*0.2, ts*0.3, ts*0.6, ts*0.4);
        gChest.fillStyle(0xcda434); // gold
        gChest.fillRect(ts*0.2, ts*0.4, ts*0.6, 8);
        gChest.fillRect(ts/2 - 4, ts*0.4, 8, 16); // lock
        gChest.generateTexture('tex_chest_closed', ts, ts);

        // Chest Opened
        let gChestO = this.make.graphics({x:0,y:0,add:false});
        gChestO.fillStyle(0x000000, 0.4);
        gChestO.fillRect(ts/2 - 16, ts*0.7, 32, 12);
        gChestO.fillStyle(0x733a11);
        gChestO.fillRect(ts*0.2, ts*0.3, ts*0.6, ts*0.4);
        gChestO.fillStyle(0x211005);
        gChestO.fillRect(ts*0.25, ts*0.3, ts*0.5, ts*0.2); // Void inside
        gChestO.generateTexture('tex_chest_opened', ts, ts);

        // NPC blocky (Crystal on Pedestal)
        let gNpc = this.make.graphics({x:0,y:0,add:false});
        // Pedestal base
        gNpc.fillStyle(0x8a8a8a);
        gNpc.fillRect(ts/2 - 16, ts*0.6, 32, 12);
        gNpc.fillStyle(0xa3a3a3);
        gNpc.fillRect(ts/2 - 12, ts*0.4, 24, ts*0.2);
        // Crystal
        gNpc.fillStyle(0x00ffff);
        gNpc.fillRect(ts/2 - 6, ts*0.1, 12, 20);
        gNpc.fillRect(ts/2 - 2, 0, 4, ts*0.1);
        gNpc.fillStyle(0xffffff); // highlight
        gNpc.fillRect(ts/2 + 2, ts*0.15, 2, 10);
        gNpc.generateTexture('tex_npc', ts, ts);

        // Leaf Particle
        let gLeaf = this.make.graphics({x:0,y:0,add:false});
        gLeaf.fillStyle(0x73a827, 0.9);
        gLeaf.fillRect(0,0, 6, 6);
        gLeaf.generateTexture('tex_leaf', 6, 6);

        // House
        let gHouse = this.make.graphics({x:0,y:0,add:false});
        gHouse.fillStyle(0xe0e0e0);
        gHouse.fillRect(0, ts*0.5, ts*3, ts*2.5);
        gHouse.fillStyle(0xa62121); // Toit rouge blocky
        gHouse.fillRect(ts*0.5, ts*0.2, ts*2, ts*0.6);
        gHouse.fillRect(ts*0.2, ts*0.5, ts*2.6, ts*0.6);
        gHouse.fillRect(0, ts*0.8, ts*3, ts*0.4);
        gHouse.generateTexture('tex_house', ts*3, ts*3);

        // Indoor Wall
        let gWall = this.make.graphics({x:0, y:0, add:false});
        gWall.fillStyle(0x404040);
        gWall.fillRect(0,0,ts,ts);
        gWall.fillStyle(0x2e2e2e);
        gWall.fillRect(0, ts-8, ts, 8);
        gWall.generateTexture('tex_wall', ts, ts);
    }

    handleInteraction(playerHitbox, interactiveZone) {
        if(interactiveZone.npcData) {
            let npc = interactiveZone.npcData;
            this.events.emit('StartDialogue', npc.name, npc.dialogue, () => {});
        }
        else if (interactiveZone.chestData) {
            let chest = interactiveZone.chestData;
            if(!chest.opened) {
                chest.opened = true;
                interactiveZone.sprite.setTexture('tex_chest_opened');
                window.gameState.addItem(chest.item);
                
                let txt = this.add.text(this.player.x, this.player.y - 50, `Obtenu: ${chest.item.name} x${chest.item.qty}`, { fontSize: '12px', color: '#ffff00', fontFamily: '"Press Start 2P"', stroke: '#000', strokeThickness: 4 });
                this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 2000, onComplete: () => txt.destroy() });
                if (window.audioManager) window.audioManager.play('collect');
            }
        }
    }

    update() {
        if (window.gameState.player.hp <= 0) {
            if (!this.isDead) {
                this.isDead = true;
                this.player.setTint(0xff0000);
                this.player.active = false;
                this.player.setVelocity(0);
                let txt = this.add.text(this.player.x, this.player.y, "GAME OVER", { fontSize: '32px', fontFamily: '"Press Start 2P"', color: '#ff0000', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(10000);
                this.time.delayedCall(3000, () => window.location.reload());
            }
            return;
        }

        this.player.update();
        
        // Update shadows
        if (this.playerShadow) {
            this.playerShadow.setPosition(this.player.x, this.player.y + 20);
            this.playerShadow.setDepth(this.player.y - 1);
        }
        
        this.enemies.getChildren().forEach(e => {
            if (e.shadow && e.active) {
                e.shadow.setPosition(e.x, e.y + 15);
                e.shadow.setDepth(e.y - 1);
            }
            if (e.hp <= 0 && e.shadow) e.shadow.destroy();
        });

        if (this.targetMapName === "Village") {
            this.updateTutorial();
        }
    }

    setupTutorial() {
        this.tutorialTexts = [];
        const ts = this.currentMapData.tileSize;
        
        const addTutorialText = (x, y, text) => {
            let t = this.add.text(x * ts + ts/2, y * ts, text, {
                fontSize: '10px',
                fontFamily: '"Press Start 2P"',
                color: '#ffffff',
                backgroundColor: '#000000cc',
                padding: { x: 8, y: 8 },
                align: 'center',
                stroke: '#000',
                strokeThickness: 2
            }).setOrigin(0.5).setAlpha(0);
            t.setDepth(9002);
            this.tutorialTexts.push({ obj: t, triggerX: x * ts + ts/2, triggerY: y * ts + ts/2, active: false, done: false, condition: null });
            return t;
        };

        let t1 = addTutorialText(5, 4.5, "Déplace-toi avec\nZQSD ou Flèches");
        this.tutorialTexts[0].condition = () => this.player.body.velocity.length() > 0;
        this.tutorialTexts[0].active = true;
        this.tutorialTexts[0].obj.setAlpha(1);

        let t2 = addTutorialText(10, 8.5, "[E] Interagir");
        this.tutorialTexts[1].triggerDist = 150;
        this.tutorialTexts[1].condition = () => this.scene.get('HUDScene').isDialogueActive;

        let t3 = addTutorialText(10, 13.5, "[Espace] Couper");
        this.tutorialTexts[2].triggerDist = 150;
        this.tutorialTexts[2].condition = () => this.player.isAttacking;

        let t4 = addTutorialText(10, 19.5, "Combat!\n[Espace] Attaquer\n[1] Potion");
        this.tutorialTexts[3].triggerDist = 250;
        this.tutorialTexts[3].condition = () => window.gameState.player.hp < window.gameState.player.maxHp || this.enemies.countActive() === 0;
    }

    updateTutorial() {
        if (!this.tutorialTexts) return;
        this.tutorialTexts.forEach(step => {
            if (step.done) return;
            if (!step.active && step.triggerDist) {
                let dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, step.triggerX, step.triggerY);
                if (dist < step.triggerDist) {
                    step.active = true;
                    this.tweens.add({ targets: step.obj, alpha: 1, duration: 500 });
                }
            }
            if (step.active && step.condition && step.condition()) {
                step.done = true;
                this.tweens.add({ targets: step.obj, alpha: 0, duration: 500 });
            }
        });
    }

    hitMinorEnemy(weaponBox, enemy) {
        if (!enemy.isFlashing) {
            let dmg = window.gameState ? window.gameState.player.damage : 10;
            enemy.takeDamage(dmg);
            this.cameras.main.shake(100, 0.005);
            if (window.audioManager) window.audioManager.play('hit');
        }
    }

    hitResource(weaponBox, resZone) {
        if (resZone.isDestroyed) return;
        resZone.isDestroyed = true;
        
        this.cameras.main.shake(50, 0.005);
        
        for(let i=0; i<6; i++) {
            let p = this.add.rectangle(resZone.x, resZone.y, 8, 8, 0x3ea33e);
            p.setDepth(resZone.y + 10);
            this.physics.add.existing(p);
            p.body.setVelocity(Phaser.Math.Between(-80,80), Phaser.Math.Between(-100,20));
            this.tweens.add({ targets: p, alpha: 0, duration: 600, onComplete: () => p.destroy() });
        }
        
        let itemId = 'wood';
        let itemName = 'Bois';
        window.gameState.addItem({ id: itemId, name: itemName, qty: 1 });
        if (window.audioManager) window.audioManager.play('collect');
        
        let txt = this.add.text(resZone.x, resZone.y - 20, `+1 ${itemName}`, { fontSize: '10px', fontFamily: '"Press Start 2P"', color: '#ffffff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5).setDepth(9000);
        this.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
        
        resZone.sprite.destroy();
        this.walls.remove(resZone);
        resZone.destroy();
    }

    enterDoor(player, doorZone) {
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
