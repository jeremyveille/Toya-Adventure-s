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
    }

    create() {
        this.currentMapData = MapsData[this.targetMapName];
        const ts = this.currentMapData.tileSize;
        
        const height = this.currentMapData.layoutText.length;
        const width = this.currentMapData.layoutText[0].length;

        this.physics.world.setBounds(0, 0, width * ts, height * ts);

        this.walls = this.physics.add.staticGroup();
        this.interactiveZones = this.physics.add.staticGroup();
        this.enemies = this.physics.add.group();
        this.bossGroup = this.physics.add.group();
        this.resourceGroup = this.physics.add.staticGroup();
        this.doorGroup = this.physics.add.staticGroup();

        // Génération des textures procédurales (Toriyama style)
        this.generateTextures(ts);

        // Layers
        let terrainGraphics = this.add.graphics();
        terrainGraphics.setDepth(0); // Fond (Herbe, Eau)
        let dirtGraphics = this.add.graphics();
        dirtGraphics.setDepth(1); // Chemins de terre par dessus l'herbe
        
        let spawnX = ts, spawnY = ts;
        let houseCells = [];

        // Parsing de la map textuelle
        for(let y = 0; y < height; y++) {
            for(let x = 0; x < width; x++) {
                let cell = this.currentMapData.layoutText[y][x];
                let px = x * ts;
                let py = y * ts;
                let cx = px + ts/2;
                let cy = py + ts/2;

                // --- RENDU DU TERRAIN (DEPTH 0 et 1) ---
                if (cell === 'W') {
                    // Eau (base + vaguelettes)
                    terrainGraphics.fillStyle(0x30a0d0);
                    terrainGraphics.fillRect(px, py, ts, ts);
                    terrainGraphics.fillStyle(0x80d0f0, 0.5);
                    terrainGraphics.fillRect(px + ts*0.1, py + ts*0.2, ts*0.6, 4);
                    terrainGraphics.fillRect(px + ts*0.3, py + ts*0.7, ts*0.5, 4);
                    this.createWall(cx, cy, ts); // L'eau bloque
                } else if (cell === 'b') {
                    // Pont sur l'eau
                    terrainGraphics.fillStyle(0x30a0d0); // Eau dessous
                    terrainGraphics.fillRect(px, py, ts, ts);
                    terrainGraphics.fillStyle(0xa06030); // Pont en bois
                    terrainGraphics.fillRect(px, py + ts*0.1, ts, ts*0.8);
                    terrainGraphics.lineStyle(2, 0x603010);
                    terrainGraphics.strokeRect(px, py + ts*0.1, ts, ts*0.8);
                } else if (cell === 'w' || cell === 'f') {
                    // Intérieurs
                    terrainGraphics.fillStyle(0x1a1a1a);
                    terrainGraphics.fillRect(px, py, ts, ts);
                    if (cell === 'f') {
                        dirtGraphics.fillStyle(0xdeb887);
                        dirtGraphics.fillRect(px+2, py+2, ts-4, ts-4);
                    } else if (cell === 'w') {
                        this.createIndoorWall(cx, cy, ts);
                    }
                } else {
                    // Herbe par défaut pour T, C, H, d, S, N, E, B, R, o, .
                    terrainGraphics.fillStyle(0x60c050);
                    terrainGraphics.fillRect(px, py, ts, ts);
                    // Détails d'herbe
                    terrainGraphics.fillStyle(0x85d665);
                    terrainGraphics.fillRect(px + ts*0.2, py + ts*0.2, ts*0.1, ts*0.1);
                    terrainGraphics.fillRect(px + ts*0.6, py + ts*0.6, ts*0.15, ts*0.05);
                }

                // Chemin de terre
                if (cell === 'd') {
                    dirtGraphics.fillStyle(0xe0c080);
                    dirtGraphics.fillCircle(cx, cy, ts*0.7);
                    // Détails terre
                    dirtGraphics.fillStyle(0xc09a50);
                    dirtGraphics.fillCircle(cx - ts*0.2, cy + ts*0.1, ts*0.1);
                }

                // --- OBJETS ET ENTITÉS ---
                if (cell === 'T') {
                    this.createTree(cx, cy, ts);
                } else if (cell === 'C') {
                    this.createCliff(cx, cy, ts);
                } else if (cell === 'H') {
                    houseCells.push({x, y});
                } else if (cell === 'R') {
                    this.createRuin(cx, cy, ts);
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
                }
            }
        }

        // Construire les grandes structures (Maison)
        this.buildHouses(houseCells, ts);

        // ---- LE JOUEUR ----
        if (this.spawnOverride) {
            spawnX = this.spawnOverride.x * ts + ts/2;
            spawnY = this.spawnOverride.y * ts + ts/2;
        }
        this.player = new Player(this, spawnX, spawnY, 'hero');
        this.player.setDepth(this.player.y);

        // ---- ATMOSPHÈRE ET EFFETS (Toriyama Style) ----
        // Overlay de lumière (fin de journée chaude / ambiance magique)
        let overlayColor = this.targetMapName === "House1" ? 0x000000 : 0xffa500;
        let overlayAlpha = this.targetMapName === "House1" ? 0.2 : 0.1;
        let overlay = this.add.rectangle(0, 0, width * ts, height * ts, overlayColor, overlayAlpha).setOrigin(0,0);
        overlay.setBlendMode(this.targetMapName === "House1" ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
        overlay.setDepth(9000);

        // Particules dans l'air (si dehors)
        if (this.targetMapName === "Village") {
            let particles = this.add.particles('tex_leaf');
            particles.setDepth(9001);
            particles.createEmitter({
                x: { min: 0, max: width * ts },
                y: { min: 0, max: height * ts },
                lifespan: 6000,
                speedY: { min: 10, max: 30 },
                speedX: { min: -20, max: 20 },
                scale: { start: 0.5, end: 0 },
                alpha: { start: 0.8, end: 0 },
                quantity: 1,
                frequency: 500,
                blendMode: 'ADD'
            });
        }

        // Caméra et UI
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, width * ts, height * ts);
        this.cameras.main.setZoom(this.targetMapName === "House1" ? 1.8 : 1.4);

        // Collisions
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.enemies, this.walls);
        this.physics.add.overlap(this.player.weaponHitbox, this.enemies, this.hitMinorEnemy, null, this);
        this.physics.add.overlap(this.player.weaponHitbox, this.resourceGroup, this.hitResource, null, this);
        this.physics.add.overlap(this.player, this.doorGroup, this.enterDoor, null, this);

        this.input.keyboard.on('keydown-E', () => {
            this.physics.overlap(this.player.interactionHitbox, this.interactiveZones, this.handleInteraction, null, this);
        });

        this.scene.launch('HUDScene');

        if (this.targetMapName === "Village") {
            this.setupTutorial();
        }
    }

    createWall(cx, cy, ts) {
        let wall = this.add.zone(cx, cy, ts, ts);
        this.physics.add.existing(wall, true);
        this.walls.add(wall);
        return wall;
    }

    createTree(cx, cy, ts) {
        this.createWall(cx, cy, ts);
        let tree = this.add.sprite(cx, cy - ts*0.2, 'tex_tree');
        tree.setDepth(cy + ts*0.2); // Le feuillage couvre le joueur s'il est derrière
    }

    createCliff(cx, cy, ts) {
        this.createWall(cx, cy, ts);
        let cliff = this.add.sprite(cx, cy, 'tex_cliff');
        cliff.setDepth(cy);
    }

    createRuin(cx, cy, ts) {
        this.createWall(cx, cy, ts);
        let ruin = this.add.sprite(cx, cy, 'tex_ruin');
        ruin.setDepth(cy);
    }

    createIndoorWall(cx, cy, ts) {
        this.createWall(cx, cy, ts);
        let wall = this.add.sprite(cx, cy, 'tex_wall');
        wall.setDepth(cy);
    }

    createNPC(cx, cy, ts, data) {
        this.createWall(cx, cy, ts);
        let shadow = this.add.ellipse(cx, cy + ts*0.3, ts*0.6, ts*0.3, 0x000000, 0.4);
        let sprite = this.add.sprite(cx, cy, 'tex_npc');
        
        shadow.setDepth(cy - 1);
        sprite.setDepth(cy);
        
        this.add.text(cx, cy - ts*0.6, data.name, { fontSize: '10px', color: '#fff', fontFamily: '"Press Start 2P"' }).setOrigin(0.5).setDepth(cy+1);

        let zone = this.add.zone(cx, cy, ts*1.5, ts*1.5);
        this.physics.add.existing(zone, true);
        zone.npcData = data;
        this.interactiveZones.add(zone);
    }

    createEnemy(cx, cy, type) {
        let enemy = new Enemy(this, cx, cy, 'enemy', type);
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
        zone.sprite = sprite; // Reference pour update visuel
        this.interactiveZones.add(zone);
    }

    buildHouses(houseCells, ts) {
        if (houseCells.length === 0) return;
        
        // Group the house cells to find the center
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
        houseSprite.setDisplaySize(width, height + ts); // Déborde un peu vers le haut
        houseSprite.setDepth(cy + height/2); // Le toit cache le joueur

        // Porte (milieu en bas)
        if (this.currentMapData.doorsData && this.currentMapData.doorsData.houseDoorTarget) {
            let doorZone = this.add.zone(cx, maxY * ts + ts/2, ts, ts);
            this.physics.add.existing(doorZone, true);
            doorZone.doorData = { targetMap: this.currentMapData.doorsData.houseDoorTarget, targetSpawn: this.currentMapData.doorsData.houseSpawn };
            this.doorGroup.add(doorZone);
            
            // Effet visuel porte
            let g = this.add.graphics();
            g.fillStyle(0x000000, 0.8);
            g.fillRect(cx - ts*0.3, maxY * ts, ts*0.6, ts);
            g.setDepth(cy + height/2 - 1); // Derrière la maison
        }
    }

    generateTextures(ts) {
        // Arbre
        let gTree = this.make.graphics({x:0, y:0, add:false});
        gTree.fillStyle(0x000000, 0.3);
        gTree.fillEllipse(ts/2, ts, ts, ts*0.4); // ombre
        gTree.fillStyle(0x5c4033);
        gTree.fillRect(ts/2 - ts*0.1, ts*0.4, ts*0.2, ts*0.6); // tronc
        gTree.fillStyle(0x228b22);
        gTree.fillCircle(ts/2, ts*0.3, ts*0.6); // Feuillage arrière
        gTree.fillStyle(0x32cd32);
        gTree.fillCircle(ts/2 - ts*0.2, ts*0.2, ts*0.4); // Feuillage avant
        gTree.fillCircle(ts/2 + ts*0.2, ts*0.2, ts*0.4);
        gTree.fillCircle(ts/2, ts*0.1, ts*0.4);
        gTree.generateTexture('tex_tree', ts*1.5, ts*1.5);

        // Cliff
        let gCliff = this.make.graphics({x:0, y:0, add:false});
        gCliff.fillStyle(0x808080);
        gCliff.fillRect(0,0,ts,ts);
        gCliff.fillStyle(0x606060);
        gCliff.fillRect(0, ts*0.7, ts, ts*0.3); 
        gCliff.lineStyle(2, 0x404040);
        gCliff.strokeRect(0,0,ts,ts);
        gCliff.generateTexture('tex_cliff', ts, ts);

        // Ruine
        let gRuin = this.make.graphics({x:0, y:0, add:false});
        gRuin.fillStyle(0x000000, 0.4);
        gRuin.fillEllipse(ts/2, ts*0.8, ts*0.8, ts*0.4);
        gRuin.fillStyle(0xa9a9a9);
        gRuin.fillRect(ts*0.2, ts*0.1, ts*0.6, ts*0.7);
        gRuin.fillStyle(0x808080);
        gRuin.fillRect(ts*0.3, ts*0.3, ts*0.4, ts*0.1);
        gRuin.generateTexture('tex_ruin', ts, ts);

        // Mur Intérieur
        let gWall = this.make.graphics({x:0, y:0, add:false});
        gWall.fillStyle(0x555555);
        gWall.fillRect(0,0,ts,ts);
        gWall.lineStyle(2, 0x333333);
        gWall.strokeRect(0,0,ts,ts);
        gWall.generateTexture('tex_wall', ts, ts);

        // Buisson
        let gBush = this.make.graphics({x:0,y:0,add:false});
        gBush.fillStyle(0x000000, 0.3);
        gBush.fillEllipse(ts/2, ts*0.75, ts*0.8, ts*0.4);
        gBush.fillStyle(0x006400);
        gBush.fillCircle(ts/2, ts/2, ts*0.4);
        gBush.fillStyle(0x228b22);
        gBush.fillCircle(ts/2 - ts*0.1, ts/2 - ts*0.1, ts*0.25);
        gBush.generateTexture('tex_bush', ts, ts);

        // Chest Closed
        let gChest = this.make.graphics({x:0,y:0,add:false});
        gChest.fillStyle(0x000000, 0.4);
        gChest.fillEllipse(ts/2, ts*0.7, ts*0.8, ts*0.4);
        gChest.fillStyle(0x8b4513);
        gChest.fillRect(ts*0.2, ts*0.3, ts*0.6, ts*0.4);
        gChest.fillStyle(0xffd700);
        gChest.fillRect(ts*0.2, ts*0.4, ts*0.6, ts*0.1);
        gChest.generateTexture('tex_chest_closed', ts, ts);

        // Chest Opened
        let gChestO = this.make.graphics({x:0,y:0,add:false});
        gChestO.fillStyle(0x000000, 0.4);
        gChestO.fillEllipse(ts/2, ts*0.7, ts*0.8, ts*0.4);
        gChestO.fillStyle(0x8b4513);
        gChestO.fillRect(ts*0.2, ts*0.3, ts*0.6, ts*0.4);
        gChestO.fillStyle(0x3e1f08);
        gChestO.fillRect(ts*0.25, ts*0.3, ts*0.5, ts*0.2); // Void inside
        gChestO.generateTexture('tex_chest_opened', ts, ts);

        // PNJ (Rond stylisé pour l'instant avec une tête et un corps)
        let gNpc = this.make.graphics({x:0,y:0,add:false});
        gNpc.fillStyle(0x1e90ff); // Manteau bleu
        gNpc.fillCircle(ts/2, ts*0.6, ts*0.25);
        gNpc.fillStyle(0xffe4c4); // Tête
        gNpc.fillCircle(ts/2, ts*0.3, ts*0.2);
        gNpc.generateTexture('tex_npc', ts, ts);

        // Leaf Particle
        let gLeaf = this.make.graphics({x:0,y:0,add:false});
        gLeaf.fillStyle(0x9acd32, 0.8);
        gLeaf.fillEllipse(4, 4, 8, 4);
        gLeaf.generateTexture('tex_leaf', 8, 8);

        // House
        let gHouse = this.make.graphics({x:0,y:0,add:false});
        gHouse.fillStyle(0xffffff); // Placeholder base
        gHouse.fillRect(0, ts*0.5, ts*3, ts*2.5);
        gHouse.fillStyle(0x8b0000); // Toit rouge
        gHouse.beginPath();
        gHouse.moveTo(0, ts*1.5);
        gHouse.lineTo(ts*1.5, 0);
        gHouse.lineTo(ts*3, ts*1.5);
        gHouse.fillPath();
        gHouse.generateTexture('tex_house', ts*3, ts*3);
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
                
                let txt = this.add.text(this.player.x, this.player.y - 50, `Obtenu: ${chest.item.name} x${chest.item.qty}`, { fontSize: '14px', color: '#ffff00', fontFamily: '"Press Start 2P"' });
                this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 2000, onComplete: () => txt.destroy() });
                window.audioManager.play('collect');
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

        // Zone 1: Déplacement (spawn à x:5, y:3)
        let t1 = addTutorialText(5, 4.5, "Déplace-toi avec\nZQSD ou Flèches");
        this.tutorialTexts[0].condition = () => this.player.body.velocity.length() > 0;
        this.tutorialTexts[0].active = true;
        this.tutorialTexts[0].obj.setAlpha(1);

        // Zone 2: Interaction (NPC à x:10, y:7)
        let t2 = addTutorialText(10, 8.5, "[E] Interagir");
        this.tutorialTexts[1].triggerDist = 120;
        this.tutorialTexts[1].condition = () => this.scene.get('HUDScene').isDialogueActive;

        // Zone 3: Attaque buisson (B à x:10, y:14)
        let t3 = addTutorialText(10, 13.5, "[Espace] Couper");
        this.tutorialTexts[2].triggerDist = 120;
        this.tutorialTexts[2].condition = () => this.player.isAttacking;

        // Zone 4: Combat ennemi (E à x:10, y:17)
        let t4 = addTutorialText(10, 18.5, "Combat!\n[Espace] Attaquer\n[1] Potion");
        this.tutorialTexts[3].triggerDist = 200;
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
        
        // Particules
        for(let i=0; i<6; i++) {
            let p = this.add.rectangle(resZone.x, resZone.y, 8, 8, 0x32cd32);
            p.setDepth(resZone.y + 10);
            this.physics.add.existing(p);
            p.body.setVelocity(Phaser.Math.Between(-80,80), Phaser.Math.Between(-100,20));
            this.tweens.add({ targets: p, alpha: 0, duration: 600, onComplete: () => p.destroy() });
        }
        
        let itemId = 'wood';
        let itemName = 'Bois';
        window.gameState.addItem({ id: itemId, name: itemName, qty: 1 });
        if (window.audioManager) window.audioManager.play('collect');
        
        let txt = this.add.text(resZone.x, resZone.y - 20, `+1 ${itemName}`, { fontSize: '12px', fontFamily: '"Press Start 2P"', color: '#ffffff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5).setDepth(9000);
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
