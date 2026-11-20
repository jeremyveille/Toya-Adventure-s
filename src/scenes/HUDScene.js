class HUDScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HUDScene' });
    }

    preload() {
        let _preloadAssets = (typeof preloadSceneAssets === 'function')
            ? preloadSceneAssets
            : (typeof window !== 'undefined' && typeof window.preloadSceneAssets === 'function')
                ? window.preloadSceneAssets
                : null;
        if (!_preloadAssets && typeof require === 'function') {
            try {
                _preloadAssets = require('../data/assets.js').preloadSceneAssets;
            } catch (e1) {
                try {
                    _preloadAssets = require('./src/data/assets.js').preloadSceneAssets;
                } catch (e2) {
                    try {
                        _preloadAssets = require('../src/data/assets.js').preloadSceneAssets;
                    } catch (e3) {
                        _preloadAssets = null;
                    }
                }
            }
        }
        if (_preloadAssets) {
            _preloadAssets(this, ['item', 'ui']);
        }
    }

    create() {
        // UI Container principal
        this.uiGroup = this.add.group();

        // 1. Barre de dialogue
        this.dialogueBox = this.add.graphics();
        this.dialogueBox.fillStyle(0x0c151c, 0.95);
        this.dialogueBox.lineStyle(3, 0xb89947); // Gold border
        this.dialogueBox.fillRoundedRect(100, 430, 600, 130, 8);
        this.dialogueBox.strokeRoundedRect(100, 430, 600, 130, 8);
        
        // Boîte du nom
        this.dialogueNameBox = this.add.graphics();
        this.dialogueNameBox.fillStyle(0x0c151c, 1);
        this.dialogueNameBox.lineStyle(3, 0xb89947);
        this.dialogueNameBox.fillRoundedRect(120, 410, 140, 40, 4);
        this.dialogueNameBox.strokeRoundedRect(120, 410, 140, 40, 4);

        this.dialogueName = this.add.text(130, 422, "", { fontSize: '16px', fontFamily: '"Press Start 2P", monospace', color: '#ffd700' });
        this.dialogueText = this.add.text(125, 460, "", { fontSize: '14px', fontFamily: '"Press Start 2P", monospace', color: '#ffffff', wordWrap: { width: 550 }, lineSpacing: 8 });
        
        // Triangle clignotant
        this.dialogueIndicator = this.add.triangle(670, 540, 0, 0, 14, 0, 7, 10, 0xffffff);
        this.tweens.add({ targets: this.dialogueIndicator, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

        this.dialogueGroup = this.add.group([this.dialogueBox, this.dialogueNameBox, this.dialogueName, this.dialogueText, this.dialogueIndicator]);
        this.dialogueGroup.setVisible(false);
        this.isDialogueActive = false;

        // 2. Écran d'inventaire / Quêtes
        this.menuBox = this.add.graphics();
        this.menuBox.fillStyle(0x111133, 0.95);
        this.menuBox.lineStyle(4, 0xaaaaaa);
        this.menuBox.fillRect(50, 50, 700, 400);
        this.menuBox.strokeRect(50, 50, 700, 400);
        
        this.menuTitle = this.add.text(70, 70, "MENU", { fontSize: '24px', fontFamily: '"Press Start 2P", monospace', color: '#fff' });
        this.menuContent = this.add.text(70, 120, "", { fontSize: '14px', fontFamily: '"Press Start 2P", monospace', color: '#ddd' });
        
        this.itemIcons = [];
        this.menuGroup = this.add.group([this.menuBox, this.menuTitle, this.menuContent]);
        this.menuGroup.setVisible(false);
        this.isMenuActive = false;

        // Écouteurs globaux
        const worldScene = this.scene.get('WorldScene');
        worldScene.events.on('StartDialogue', this.showDialogue, this);
        
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.iKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
        this.jKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
        this.kKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
        this.cKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.num1Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
        this.num2Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    }

    update() {
        if (this.isDialogueActive && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.endDialogue();
        }

        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            if (this.isMenuActive) {
                this.toggleMenu(this.menuTitle.text);
            }
        }

        if (Phaser.Input.Keyboard.JustDown(this.iKey)) {
            this.toggleMenu("INVENTAIRE");
        }
        if (Phaser.Input.Keyboard.JustDown(this.jKey)) {
            this.toggleMenu("QUETES");
        }
        if (Phaser.Input.Keyboard.JustDown(this.kKey)) {
            this.toggleMenu("CRAFTING");
        }
        if (Phaser.Input.Keyboard.JustDown(this.cKey)) {
            this.toggleMenu("PERSONNAGE");
        }
        
        // Commandes de craft rapides si le menu craft est ouvert
        if (this.isMenuActive && this.menuTitle.text === "CRAFTING") {
            if (Phaser.Input.Keyboard.JustDown(this.num1Key)) {
                if (window.gameState.craftItem("bridge")) window.audioManager.play('levelup');
                else window.audioManager.play('hit'); // Son d'erreur
                this.toggleMenu("CRAFTING"); // Rafraichit
                this.toggleMenu("CRAFTING");
            }
            if (Phaser.Input.Keyboard.JustDown(this.num2Key)) {
                if (window.gameState.craftItem("potion")) window.audioManager.play('levelup');
                else window.audioManager.play('hit');
                this.toggleMenu("CRAFTING");
                this.toggleMenu("CRAFTING");
            }
        }
        
        // Commandes rapides pour l'inventaire
        if (this.isMenuActive && this.menuTitle.text === "INVENTAIRE") {
            if (Phaser.Input.Keyboard.JustDown(this.num1Key)) {
                if (window.gameState.useItem("potion")) {
                    window.audioManager.play('collect'); // Son agréable pour le soin
                } else {
                    window.audioManager.play('hit'); // Erreur (pas de potion)
                }
                this.toggleMenu("INVENTAIRE");
                this.toggleMenu("INVENTAIRE"); // Rafraichissement
            }
        }
    }

    clearItemIcons() {
        if (this.itemIcons && this.itemIcons.length > 0) {
            this.itemIcons.forEach(icon => {
                if (icon) {
                    if (this.menuGroup && typeof this.menuGroup.remove === 'function') {
                        this.menuGroup.remove(icon);
                    }
                    if (typeof icon.destroy === 'function') {
                        icon.destroy();
                    }
                }
            });
            this.itemIcons = [];
        }
    }

    getItemTextureKey(itemOrKey) {
        if (!itemOrKey) return null;
        const rawKey = (typeof itemOrKey === 'object') ? (itemOrKey.iconKey || itemOrKey.id) : itemOrKey;
        if (!rawKey) return null;

        // 1. Check getAsset from assets.js
        let _getAsset = (typeof getAsset === 'function')
            ? getAsset
            : (typeof window !== 'undefined' && typeof window.getAsset === 'function')
                ? window.getAsset
                : null;
        if (!_getAsset && typeof require === 'function') {
            try {
                _getAsset = require('../data/assets.js').getAsset;
            } catch (e1) {
                try {
                    _getAsset = require('./src/data/assets.js').getAsset;
                } catch (e2) {
                    _getAsset = null;
                }
            }
        }
        if (_getAsset) {
            const asset = _getAsset(rawKey);
            if (asset && asset.key) return asset.key;
        }

        // 2. Direct key aliases map
        const keyMap = {
            'wood': 'item_wood',
            'stone': 'item_stone',
            'potion': 'item_potion',
            'bridge': 'item_bridge',
            'coins': 'item_coins',
            'sword_upgrade': 'item_sword_upgrade',
            'trophy': 'item_trophy',
            'boss_trophy': 'item_trophy'
        };
        if (keyMap[rawKey]) return keyMap[rawKey];
        if (typeof rawKey === 'string' && rawKey.startsWith('item_')) return rawKey;

        return null;
    }

    createItemIcon(x, y, itemOrKey) {
        const texKey = this.getItemTextureKey(itemOrKey);
        if (!texKey) return null;

        const icon = this.add.image(x, y, texKey);
        if (icon) {
            if (typeof icon.setOrigin === 'function') icon.setOrigin(0, 0);
            if (typeof icon.setDisplaySize === 'function') icon.setDisplaySize(32, 32);
            if (this.menuGroup && typeof this.menuGroup.add === 'function') {
                this.menuGroup.add(icon);
            }
            if (!this.itemIcons) this.itemIcons = [];
            this.itemIcons.push(icon);
        }
        return icon;
    }

    showDialogue(npcName, text, callback) {
        this.dialogueGroup.setVisible(true);
        this.dialogueName.setText(npcName);
        this.dialogueText.setText("");
        this.isDialogueActive = true;
        this.dialogueCallback = callback;

        if (window.announce) {
            window.announce(`${npcName} dit : ${text}. Appuyez sur Espace pour continuer.`);
        }

        // Animation machine à écrire
        let i = 0;
        this.typewriterEvent = this.time.addEvent({
            delay: 30, // vitesse
            callback: () => {
                this.dialogueText.setText(this.dialogueText.text + text[i]);
                i++;
                if(i === text.length) {
                    this.typewriterEvent.remove();
                }
            },
            repeat: text.length - 1
        });

        // On bloque le joueur
        const worldScene = this.scene.get('WorldScene');
        worldScene.player.active = false;
        worldScene.player.setVelocity(0);
    }

    endDialogue() {
        this.isDialogueActive = false;
        
        // Disparition en douceur
        this.tweens.add({ 
            targets: this.dialogueGroup.getChildren(), 
            alpha: 0, 
            duration: 200, 
            onComplete: () => this.dialogueGroup.setVisible(false) 
        });
        
        // On libère le joueur
        const worldScene = this.scene.get('WorldScene');
        worldScene.player.active = true;

        if (this.dialogueCallback) {
            this.dialogueCallback();
            this.dialogueCallback = null;
        }
    }

    toggleMenu(type) {
        if(this.isDialogueActive) return;

        if(this.isMenuActive && this.menuTitle.text === type) {
            this.isMenuActive = false;
            this.clearItemIcons();
            this.tweens.add({ 
                targets: this.menuGroup.getChildren(), 
                alpha: 0, 
                duration: 200, 
                onComplete: () => {
                    this.menuGroup.setVisible(false);
                    this.clearItemIcons();
                }
            });
            this.scene.resume('WorldScene');
            return;
        }

        // Clean up previous icons before building new tab
        this.clearItemIcons();

        this.isMenuActive = true;
        this.menuGroup.setAlpha(0);
        this.menuGroup.setVisible(true);
        this.tweens.add({ targets: this.menuGroup.getChildren(), alpha: 1, duration: 200, ease: 'Power2' });
        
        this.menuTitle.setText(type);
        this.scene.pause('WorldScene'); // Met le jeu en pause en fond

        let content = "";
        if (type === "INVENTAIRE") {
            content = "Or : " + window.gameState.player.gold + " G\n\nObjets :\n";
            if (window.gameState.inventory.length === 0) {
                content += "(Vide)\n";
            } else {
                const startY = 190;
                const rowHeight = 38;
                window.gameState.inventory.forEach((item, index) => {
                    const rowY = startY + (index * rowHeight);
                    this.createItemIcon(75, rowY, item);
                    content += "       - " + item.name + " (x" + item.qty + ")\n\n";
                });
            }
            content += "\n[1] Utiliser Potion de Soin (+30 HP)";
            content += "\n\nStatistiques :\nHP: " + window.gameState.player.hp + "/" + window.gameState.player.maxHp + "\nNiveau: " + window.gameState.player.level;
        } else if (type === "QUETES") {
            if (window.gameState.quests.length === 0) content += "(Aucune quête)";
            window.gameState.quests.forEach(q => {
                let statusIcon = q.status === "completed" ? "[x]" : "[ ]";
                content += statusIcon + " " + q.title + "\n  " + q.desc + "\n\n";
            });
        } else if (type === "CRAFTING") {
            content += "Appuyez sur le numéro pour fabriquer:\n\n";
            
            // Recipe 1: Pont en Bois (Coût: 5 Bois)
            this.createItemIcon(75, 168, 'bridge');
            content += "       [1] Pont en Bois (Coût: 5 Bois)\n\n";
            
            // Recipe 2: Potion de Soin (Coût: 2 Bois, 1 Pierre)
            this.createItemIcon(75, 210, 'potion');
            content += "       [2] Potion de Soin (Coût: 2 Bois, 1 Pierre)\n\n";
            
            let wood = window.gameState.inventory.find(i => i.id === 'wood');
            let stone = window.gameState.inventory.find(i => i.id === 'stone');
            const woodQty = wood ? wood.qty : 0;
            const stoneQty = stone ? stone.qty : 0;

            content += "Ressources disponibles:\n";
            this.createItemIcon(75, 275, 'wood');
            this.createItemIcon(250, 275, 'stone');
            content += `       ${woodQty} Bois                   ${stoneQty} Pierre\n\n`;
            content += `Ressources: ${woodQty} Bois, ${stoneQty} Pierre`;
        } else if (type === "PERSONNAGE" || type === "STATS") {
            const p = window.gameState.player;
            content = "--- FICHE DU PERSONNAGE ---\n\n";
            content += "Niveau       : " + p.level + "\n";
            content += "Points de Vie: " + p.hp + " / " + p.maxHp + " HP\n";
            content += "Expérience   : " + (p.xp || 0) + " / " + (p.level * 100) + " XP\n";
            content += "Or           : " + (p.gold || 0) + " G\n";
        }
        
        this.menuContent.setText(content);
    }
}
