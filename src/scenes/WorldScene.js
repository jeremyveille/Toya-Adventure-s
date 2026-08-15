class WorldScene extends Phaser.Scene {
    constructor() {
        super('WorldScene');
    }

    init(data) {
        this.targetMapName = data.map || "Village";
        this.spawnOverride = data.spawn || null;
    }

    preload() {
        // Chargement du spritesheet Hero généré (on estime la taille des frames par rapport à 1024x1024)
        // 3 colonnes, 4 lignes => largeur ~ 341, hauteur ~ 256
        this.load.spritesheet('hero', 'assets/hero_spritesheet.png', { frameWidth: 341, frameHeight: 256 });
        
        // Anciens assets pour compatibilité, plus le nouveau tileset Atlas
        this.load.image('enemy', 'assets/enemy.png');
        this.load.image('tiles', 'assets/advanced_tileset.png');
    }

    create() {
        this.currentMapData = MapsData[this.targetMapName];
        const ts = this.currentMapData.tileSize;
        
        // Taille totale du monde
        this.physics.world.setBounds(0, 0, this.currentMapData.width * ts, this.currentMapData.height * ts);

        // Groupes physiques
        this.walls = this.physics.add.staticGroup();
        this.interactiveZones = this.physics.add.staticGroup(); // PNJ, objets
        this.enemies = this.physics.add.group();
        this.bossGroup = this.physics.add.group();
        this.resourceGroup = this.physics.add.staticGroup();
        
        // ==== Création de la Carte à partir de la Matrice ====
        for(let y = 0; y < this.currentMapData.height; y++) {
            for(let x = 0; x < this.currentMapData.width; x++) {
                let cell = this.currentMapData.layout[y][x];
                let px = x * ts;
                let py = y * ts;
                
                // Dessiner le fond (Herbe par défaut partout sauf les intérieurs)
                if (cell === 5 || cell === 6) {
                    this.add.rectangle(px, py, ts, ts, 0x3d2314).setOrigin(0,0); // Fond sombre de terre/bois
                } else {
                    this.add.rectangle(px, py, ts, ts, 0x3cb371).setOrigin(0,0); // Herbe
                }
                
                if (cell === 1) { // Arbre/Mur
                    let tree = this.add.rectangle(px + ts/2, py + ts/2, ts, ts, 0x228b22);
                    tree.setStrokeStyle(4, 0x006400);
                    let wallCollider = this.add.zone(px + ts/2, py + ts/2, ts, ts);
                    this.physics.add.existing(wallCollider, true);
                    this.walls.add(wallCollider);
                }
                else if (cell === 2) { // Eau
                    let water = this.add.rectangle(px, py, ts, ts, 0x4169e1).setOrigin(0,0);
                    let wallCollider = this.add.zone(px + ts/2, py + ts/2, ts, ts);
                    this.physics.add.existing(wallCollider, true);
                    this.walls.add(wallCollider);
                }
                else if (cell === 3) { // Maison
                    let house = this.add.rectangle(px + ts/2, py + ts/2, ts, ts, 0x8b4513);
                    let wallCollider = this.add.zone(px + ts/2, py + ts/2, ts, ts);
                    this.physics.add.existing(wallCollider, true);
                    this.walls.add(wallCollider);
                }
                else if (cell === 4) { // Chemin de terre
                    this.add.rectangle(px, py, ts, ts, 0xd2b48c).setOrigin(0,0);
                }
                else if (cell === 5) { // Sol en bois (intérieur)
                    let floor = this.add.rectangle(px + ts/2, py + ts/2, ts, ts, 0xdeb887);
                    floor.setStrokeStyle(1, 0xcd853f);
                }
                else if (cell === 6) { // Mur en pierre (intérieur)
                    let wall = this.add.rectangle(px + ts/2, py + ts/2, ts, ts, 0x696969);
                    wall.setStrokeStyle(4, 0x555555);
                    let wallCollider = this.add.zone(px + ts/2, py + ts/2, ts, ts);
                    this.physics.add.existing(wallCollider, true);
                    this.walls.add(wallCollider);
                }
            }
        }

        // ==== Création du Joueur ====
        let spawnX = this.currentMapData.spawn.x * ts + ts/2;
        let spawnY = this.currentMapData.spawn.y * ts + ts/2;
        if (this.spawnOverride) {
            spawnX = this.spawnOverride.x * ts + ts/2;
            spawnY = this.spawnOverride.y * ts + ts/2;
        }
        this.player = new Player(this, spawnX, spawnY, 'hero');

        // ==== Caméra ====
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, this.currentMapData.width * ts, this.currentMapData.height * ts);
        this.cameras.main.setZoom(1.5); // On rapproche la caméra

        // ==== Création des PNJ (Interactifs) ====
        this.currentMapData.npcs.forEach(npcData => {
            let nx = npcData.x * ts + ts/2;
            let ny = npcData.y * ts + ts/2;
            
            // Représentation visuelle du PNJ
            let npcSprite = this.add.circle(nx, ny, ts/3, 0xffff00);
            this.add.text(nx - 20, ny - 30, npcData.name, { fontSize: '12px', color: '#fff' });

            // Zone physique du PNJ
            let npcZone = this.add.zone(nx, ny, ts, ts);
            this.physics.add.existing(npcZone, true);
            npcZone.npcData = npcData; // On attache les données au PNJ
            this.interactiveZones.add(npcZone);
            this.walls.add(npcZone); // Le PNJ bloque aussi le passage
        });

        // ==== Création des Coffres ====
        this.currentMapData.chests.forEach(chestData => {
            let cx = chestData.x * ts + ts/2;
            let cy = chestData.y * ts + ts/2;

            // Représentation visuelle du coffre
            let chestSprite = this.add.rectangle(cx, cy, ts/2, ts/2, 0xffa500); // Orange
            chestSprite.setStrokeStyle(4, 0x8b4513);
            chestData.sprite = chestSprite; // Référence pour changer la couleur une fois ouvert

            let chestZone = this.add.zone(cx, cy, ts, ts);
            this.physics.add.existing(chestZone, true);
            chestZone.chestData = chestData;
            this.interactiveZones.add(chestZone);
            this.walls.add(chestZone);
        });

        // ==== Création des Ressources ====
        if (this.currentMapData.resources) {
            this.currentMapData.resources.forEach(res => {
                let rx = res.x * ts + ts/2;
                let ry = res.y * ts + ts/2;
                
                let resSprite;
                if (res.type === "bush") {
                    resSprite = this.add.circle(rx, ry, ts/3, 0x00ff00); // Buisson vert
                } else if (res.type === "rock") {
                    resSprite = this.add.rectangle(rx, ry, ts/2, ts/2, 0x888888); // Rocher gris
                }
                
                let resZone = this.add.zone(rx, ry, ts, ts);
                this.physics.add.existing(resZone, true);
                resZone.resData = res;
                resZone.sprite = resSprite;
                
                this.resourceGroup.add(resZone);
                this.walls.add(resZone); // Bloque le passage
            });
        }

        // ==== Création des Ennemis ====
        if (this.currentMapData.enemies) {
            this.currentMapData.enemies.forEach(eData => {
                let ex = eData.x * ts + ts/2;
                let ey = eData.y * ts + ts/2;
                let enemy = new Enemy(this, ex, ey, 'enemy', eData.type);
                this.enemies.add(enemy);
            });
        }
        
        // ==== Création du Boss ====
        if (this.currentMapData.boss) {
            let bx = this.currentMapData.boss.x * ts + ts/2;
            let by = this.currentMapData.boss.y * ts + ts/2;
            let boss = new Enemy(this, bx, by, 'enemy', 'major');
            boss.setTint(0xff00ff); // Boss rose
            boss.setScale(0.2); // Un peu plus grand
            this.bossGroup.add(boss);
        }

        // ==== Création des Portes ====
        this.doorGroup = this.physics.add.staticGroup();
        if (this.currentMapData.doors) {
            this.currentMapData.doors.forEach(door => {
                let dx = door.x * ts + ts/2;
                let dy = door.y * ts + ts/2;
                let doorZone = this.add.zone(dx, dy, ts, ts);
                this.physics.add.existing(doorZone, true);
                doorZone.doorData = door;
                this.doorGroup.add(doorZone);
            });
        }

        // ==== Collisions ====
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.enemies, this.walls);
        if(this.bossGroup) this.physics.add.collider(this.bossGroup, this.walls);
        
        // Interactions de combat et collecte
        this.physics.add.overlap(this.player.weaponHitbox, this.enemies, this.hitMinorEnemy, null, this);
        this.physics.add.overlap(this.player.weaponHitbox, this.resourceGroup, this.hitResource, null, this);
        if(this.bossGroup) this.physics.add.overlap(this.player, this.bossGroup, this.startBossBattle, null, this);
        this.physics.add.overlap(this.player, this.doorGroup, this.enterDoor, null, this);
        
        // Gestion de l'interaction (Touche E)
        this.input.keyboard.on('keydown-E', () => {
            this.physics.overlap(this.player.interactionHitbox, this.interactiveZones, this.handleInteraction, null, this);
        });

        // Lancement de l'UI globale
        this.scene.launch('HUDScene');
    }

    handleInteraction(playerHitbox, interactiveZone) {
        if(interactiveZone.npcData) {
            let npc = interactiveZone.npcData;
            this.events.emit('StartDialogue', npc.name, npc.dialogue, () => {
                // Gestion des quêtes
                if (npc.questItem && npc.questQty) {
                    if (window.gameState.removeItem(npc.questItem, npc.questQty)) {
                        let txt = this.add.text(this.player.x, this.player.y - 50, "Quête accomplie !", { fontSize: '18px', color: '#00ff00' });
                        this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 2000, onComplete: () => txt.destroy() });
                        npc.questItem = null; // Quête terminée
                        npc.dialogue = "Merci pour ton aide !";
                    } else {
                        let txt = this.add.text(this.player.x, this.player.y - 50, `Il te faut ${npc.questQty} ${npc.questItem}`, { fontSize: '12px', color: '#ff0000' });
                        this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 2000, onComplete: () => txt.destroy() });
                    }
                }
            });
        }
        else if (interactiveZone.chestData) {
            let chest = interactiveZone.chestData;
            if(!chest.opened) {
                chest.opened = true;
                chest.sprite.setFillStyle(0x8b4513); // Devient marron (vide)
                window.gameState.addItem(chest.item);
                
                let txt = this.add.text(this.player.x, this.player.y - 50, `Obtenu: ${chest.item.name} x${chest.item.qty}`, { fontSize: '18px', color: '#ffff00' });
                this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 2000, onComplete: () => txt.destroy() });
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
                let txt = this.add.text(this.player.x, this.player.y, "GAME OVER", { fontSize: '32px', fontFamily: '"Press Start 2P"', color: '#ff0000', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
                this.time.delayedCall(3000, () => window.location.reload());
            }
            return;
        }

        // Appelle la boucle d'update du joueur
        this.player.update();
    }

    hitMinorEnemy(weaponBox, enemy) {
        if (!enemy.isFlashing) {
            let dmg = window.gameState ? window.gameState.player.damage : 10;
            enemy.takeDamage(dmg);
            this.cameras.main.shake(100, 0.005);
            window.playSound('hit');
        }
    }

    hitResource(weaponBox, resZone) {
        if (resZone.isDestroyed) return;
        resZone.isDestroyed = true;
        
        this.cameras.main.shake(50, 0.005);
        
        // Particules de destruction
        let color = resZone.resData.type === 'bush' ? 0x00ff00 : 0x888888;
        for(let i=0; i<4; i++) {
            let p = this.add.rectangle(resZone.x, resZone.y, 10, 10, color);
            this.physics.add.existing(p);
            p.body.setVelocity(Phaser.Math.Between(-80,80), Phaser.Math.Between(-80,80));
            this.tweens.add({ targets: p, alpha: 0, duration: 600, onComplete: () => p.destroy() });
        }
        
        // Ajouter à l'inventaire
        let itemId = resZone.resData.type === 'bush' ? 'wood' : 'stone';
        let itemName = resZone.resData.type === 'bush' ? 'Bois' : 'Pierre';
        window.gameState.addItem({ id: itemId, name: itemName, qty: 1 });
        window.playSound('collect');
        
        let txt = this.add.text(resZone.x, resZone.y - 20, `+1 ${itemName}`, { fontSize: '14px', fontFamily: '"Press Start 2P"', color: '#ffffff' }).setOrigin(0.5);
        this.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
        
        resZone.sprite.destroy();
        this.walls.remove(resZone);
        resZone.destroy();
    }

    enterDoor(player, doorZone) {
        let door = doorZone.doorData;
        this.scene.stop('HUDScene');
        this.scene.restart({ map: door.targetMap, spawn: door.targetSpawn });
    }

    startBossBattle(player, boss) {
        boss.destroy(); // Le boss disparait de l'overworld
        
        // Transition vers le RPG statique
        this.cameras.main.fadeOut(500, 255, 255, 255); // Flash blanc
        
        this.time.delayedCall(500, () => {
            this.scene.sleep();
            this.scene.run('BattleScene');
        });
    }
}
