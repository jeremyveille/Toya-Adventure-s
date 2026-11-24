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

        // 2. Écran d'inventaire / Quêtes / Craft / Carte (cadre fantasy sombre & doré)
        this.menuBox = this.add.graphics();
        this.menuBox.fillStyle(0x0c151c, 0.95);
        this.menuBox.lineStyle(4, 0xb89947);
        this.menuBox.fillRoundedRect(50, 50, 700, 400, 8);
        this.menuBox.strokeRoundedRect(50, 50, 700, 400, 8);
        this.menuBox.lineStyle(2, 0x5c4620);
        this.menuBox.strokeRoundedRect(56, 56, 688, 388, 5);
        
        this.menuTitle = this.add.text(72, 68, "MENU", { fontSize: '20px', fontFamily: '"Press Start 2P", monospace', color: '#ffd54f', stroke: '#000', strokeThickness: 3 });
        this.menuContent = this.add.text(72, 116, "", { fontSize: '13px', fontFamily: '"Press Start 2P", monospace', color: '#f0ead6', lineSpacing: 5 });
        
        this.itemIcons = [];
        this.extendedIcons = [];
        this.mapOverlayGraphics = this.add.graphics();
        this.mapOverlayGraphics.setVisible(false);
        this.menuGroup = this.add.group([this.menuBox, this.menuTitle, this.menuContent, this.mapOverlayGraphics]);
        this.menuGroup.setVisible(false);
        this.isMenuActive = false;
        this.menuSelectionIndex = 0;

        // 3. HUD minimal d'exploration (HP, MP, Outil, Zone de danger, Prompt contextuel, Bannière découverte)
        this.hudBarGraphics = this.add.graphics();
        this.hudHpText = this.add.text(22, 18, "PV 100/100", { fontSize: '8px', fontFamily: '"Press Start 2P", monospace', color: '#ffffff', stroke: '#000', strokeThickness: 2 });
        this.hudMpText = this.add.text(22, 35, "PM 50/50", { fontSize: '8px', fontFamily: '"Press Start 2P", monospace', color: '#e1f5fe', stroke: '#000', strokeThickness: 2 });
        this.hudZoneText = this.add.text(18, 54, "Zone Paisible", { fontSize: '8px', fontFamily: '"Press Start 2P", monospace', color: '#8ae645', stroke: '#000', strokeThickness: 2 });
        this.hudToolText = this.add.text(18, 69, "Outil: Mains nues", { fontSize: '8px', fontFamily: '"Press Start 2P", monospace', color: '#f5d061', stroke: '#000', strokeThickness: 2 });
        this.contextPromptText = this.add.text(400, 566, "", { fontSize: '10px', fontFamily: '"Press Start 2P", monospace', color: '#fff59d', backgroundColor: '#0c151cd8', padding: { x: 10, y: 5 }, stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
        this.contextPromptText.setVisible(false);
        this.discoveryBannerText = this.add.text(400, 44, "", { fontSize: '12px', fontFamily: '"Press Start 2P", monospace', color: '#ffd54f', backgroundColor: '#0c151cee', padding: { x: 14, y: 8 }, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
        this.discoveryBannerText.setVisible(false);
        this._currentZoneLabel = "Zone Paisible";
        this._currentZoneColor = "#8ae645";
        this.drawMinimalHUD();

        // Écouteurs globaux
        const worldScene = this.scene.get('WorldScene');
        if (worldScene && worldScene.events) {
            worldScene.events.on('StartDialogue', this.showDialogue, this);
            worldScene.events.on('DiscoveryBanner', this.showDiscoveryBanner, this);
            worldScene.events.on('ZoneChanged', this.onZoneChanged, this);
            worldScene.events.on('PromptUpdate', this.updateContextPrompt, this);
        }
        
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.iKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
        this.jKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
        this.kKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
        this.cKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
        this.mKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.num1Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
        this.num2Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
        this.num3Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);

        // Placement d'un repère personnel à la souris lorsque la carte est ouverte
        if (this.input && typeof this.input.on === 'function') {
            this.input.on('pointerdown', (pointer) => {
                if (this.isMenuActive && this.menuTitle.text === "CARTE") {
                    this.handleMapClick(pointer.x, pointer.y);
                }
            });
        }
    }

    drawMinimalHUD() {
        if (!this.hudBarGraphics || !window.gameState || !window.gameState.player) return;
        const p = window.gameState.player;
        const maxHp = Math.max(1, p.maxHp || 100);
        const curHp = Phaser.Math.Clamp(p.hp !== undefined ? p.hp : maxHp, 0, maxHp);
        const maxMp = Math.max(1, p.maxMp || 50);
        const curMp = Phaser.Math.Clamp(p.mp !== undefined ? p.mp : maxMp, 0, maxMp);
        const hpRatio = curHp / maxHp;
        const mpRatio = curMp / maxMp;

        this.hudBarGraphics.clear();
        // Cadre compact fantasy pixel-art (double bordure or/bronze)
        this.hudBarGraphics.fillStyle(0x0c151c, 0.84);
        this.hudBarGraphics.lineStyle(2, 0xc9a24b);
        this.hudBarGraphics.fillRoundedRect(10, 10, 198, 76, 6);
        this.hudBarGraphics.strokeRoundedRect(10, 10, 198, 76, 6);

        // Barre HP avec reflet lumineux haut
        this.hudBarGraphics.fillStyle(0x1b2229);
        this.hudBarGraphics.fillRect(18, 16, 182, 13);
        const hpW = Math.floor(182 * hpRatio);
        if (hpW > 0) {
            this.hudBarGraphics.fillStyle(hpRatio > 0.3 ? 0x4caf50 : 0xe53935);
            this.hudBarGraphics.fillRect(18, 16, hpW, 13);
            this.hudBarGraphics.fillStyle(hpRatio > 0.3 ? 0x81c784 : 0xff7961);
            this.hudBarGraphics.fillRect(18, 16, hpW, 4);
        }

        // Barre MP avec reflet lumineux haut
        this.hudBarGraphics.fillStyle(0x1b2229);
        this.hudBarGraphics.fillRect(18, 33, 182, 12);
        const mpW = Math.floor(182 * mpRatio);
        if (mpW > 0) {
            this.hudBarGraphics.fillStyle(0x2196f3);
            this.hudBarGraphics.fillRect(18, 33, mpW, 12);
            this.hudBarGraphics.fillStyle(0x64b5f6);
            this.hudBarGraphics.fillRect(18, 33, mpW, 4);
        }

        if (this.hudHpText) this.hudHpText.setText(`PV ${Math.ceil(curHp)}/${maxHp}`);
        if (this.hudMpText) this.hudMpText.setText(`PM ${Math.ceil(curMp)}/${maxMp}`);
        if (this.hudZoneText) {
            this.hudZoneText.setText(this._currentZoneLabel);
            this.hudZoneText.setColor(this._currentZoneColor);
        }
        if (this.hudToolText) {
            const tool = window.gameState.equipment && window.gameState.equipment.tool;
            this.hudToolText.setText(tool ? `Outil: ${tool.name}` : "Outil: Mains nues");
        }
    }

    onZoneChanged(zoneInfo) {
        if (!zoneInfo) return;
        this._currentZoneLabel = zoneInfo.dangerLabel || zoneInfo.zoneName || "Zone Paisible";
        this._currentZoneColor = zoneInfo.color || "#8ae645";
        this.drawMinimalHUD();
    }

    updateContextPrompt(text) {
        if (!this.contextPromptText) return;
        if (text && !this.isMenuActive && !this.isDialogueActive) {
            this.contextPromptText.setText(text);
            this.contextPromptText.setVisible(true);
        } else {
            this.contextPromptText.setVisible(false);
        }
    }

    showDiscoveryBanner(message, color = '#ffd54f') {
        if (!this.discoveryBannerText) return;
        this.discoveryBannerText.setText(message);
        this.discoveryBannerText.setColor(color);
        this.discoveryBannerText.setAlpha(1);
        this.discoveryBannerText.setVisible(true);
        this.time.delayedCall(2600, () => {
            if (this.discoveryBannerText) {
                this.tweens.add({
                    targets: this.discoveryBannerText,
                    alpha: 0,
                    duration: 400,
                    onComplete: () => {
                        if (this.discoveryBannerText) this.discoveryBannerText.setVisible(false);
                    }
                });
            }
        });
    }

    update() {
        this.drawMinimalHUD();

        const im = (typeof window !== 'undefined' && window.inputManager) ? window.inputManager : null;
        if (this.isMenuActive && im && typeof im.update === 'function') {
            im.update();
        }

        const confirmJustDown = Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
            Phaser.Input.Keyboard.JustDown(this.enterKey) ||
            Boolean(im && im.inputMode === 'gamepad' && im.justDown('CONFIRM'));

        if (this.isDialogueActive && confirmJustDown) {
            this.endDialogue();
            return;
        }

        const cancelJustDown = Phaser.Input.Keyboard.JustDown(this.escKey) ||
            Boolean(im && im.inputMode === 'gamepad' && (im.justDown('CANCEL') || im.justDown('MENU')));

        if (cancelJustDown) {
            if (this.isMenuActive) {
                this.toggleMenu(this.menuTitle.text);
                return;
            }
        }

        if (Phaser.Input.Keyboard.JustDown(this.iKey) || (im && im.inputMode === 'gamepad' && im.justDown('INVENTORY'))) {
            this.toggleMenu("INVENTAIRE");
        }
        if (Phaser.Input.Keyboard.JustDown(this.jKey) || (im && im.inputMode === 'gamepad' && im.justDown('QUESTS'))) {
            this.toggleMenu("QUETES");
        }
        if (Phaser.Input.Keyboard.JustDown(this.kKey) || (im && im.inputMode === 'gamepad' && im.justDown('CRAFT'))) {
            this.toggleMenu("CRAFTING");
        }
        if (Phaser.Input.Keyboard.JustDown(this.cKey)) {
            this.toggleMenu("PERSONNAGE");
        }
        if (Phaser.Input.Keyboard.JustDown(this.mKey) || (im && im.inputMode === 'gamepad' && im.justDown('MAP'))) {
            this.toggleMenu("CARTE");
        }
        
        // Navigation manette / flèches dans les menus (CRAFTING / INVENTAIRE)
        if (this.isMenuActive && im) {
            const nav = im.getMenuNavigationJustPressed();
            if (nav.y !== 0) {
                const maxItems = this.menuTitle.text === "CRAFTING" ? 3 : 1;
                this.menuSelectionIndex = (this.menuSelectionIndex + nav.y + maxItems) % maxItems;
                this.refreshActiveMenu();
            }
            if (im.inputMode === 'gamepad' && im.justDown('CONFIRM')) {
                if (this.menuTitle.text === "CRAFTING") {
                    const ids = ["bridge", "potion", "hatchet"];
                    this._tryCraft(ids[this.menuSelectionIndex] || "bridge");
                } else if (this.menuTitle.text === "INVENTAIRE") {
                    this._tryUsePotion();
                }
            }
        }

        // Commandes de craft rapides si le menu craft est ouvert
        if (this.isMenuActive && this.menuTitle.text === "CRAFTING") {
            if (Phaser.Input.Keyboard.JustDown(this.num1Key)) {
                this._tryCraft("bridge");
            }
            if (Phaser.Input.Keyboard.JustDown(this.num2Key)) {
                this._tryCraft("potion");
            }
            if (Phaser.Input.Keyboard.JustDown(this.num3Key)) {
                this._tryCraft("hatchet");
            }
        }
        
        // Commandes rapides pour l'inventaire
        if (this.isMenuActive && this.menuTitle.text === "INVENTAIRE") {
            if (Phaser.Input.Keyboard.JustDown(this.num1Key)) {
                this._tryUsePotion();
            }
        }
    }

    _tryCraft(recipeId) {
        if (window.gameState.craftItem(recipeId)) window.audioManager.play('levelup');
        else window.audioManager.play('hit'); // Son d'erreur
        this.refreshActiveMenu();
    }

    _tryUsePotion() {
        if (window.gameState.useItem("potion")) {
            window.audioManager.play('collect'); // Son agréable pour le soin
        } else {
            window.audioManager.play('hit'); // Erreur (pas de potion)
        }
        this.refreshActiveMenu();
    }

    refreshActiveMenu() {
        if (!this.isMenuActive) return;
        const current = this.menuTitle.text;
        this.toggleMenu(current);
        this.toggleMenu(current);
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
        if (this.extendedIcons && this.extendedIcons.length > 0) {
            this.extendedIcons.forEach(icon => {
                if (icon) {
                    if (this.menuGroup && typeof this.menuGroup.remove === 'function') {
                        this.menuGroup.remove(icon);
                    }
                    if (typeof icon.destroy === 'function') {
                        icon.destroy();
                    }
                }
            });
            this.extendedIcons = [];
        }
        if (this.mapOverlayGraphics) {
            this.mapOverlayGraphics.clear();
            this.mapOverlayGraphics.setVisible(false);
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
            'boss_trophy': 'item_trophy',
            'herb': 'item_herb',
            'hatchet': 'item_hatchet'
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

    createExtendedIcon(x, y, itemOrKey) {
        const texKey = this.getItemTextureKey(itemOrKey);
        if (!texKey) return null;
        const icon = this.add.image(x, y, texKey);
        if (icon) {
            if (typeof icon.setOrigin === 'function') icon.setOrigin(0, 0);
            if (typeof icon.setDisplaySize === 'function') icon.setDisplaySize(28, 28);
            if (this.menuGroup && typeof this.menuGroup.add === 'function') {
                this.menuGroup.add(icon);
            }
            if (!this.extendedIcons) this.extendedIcons = [];
            this.extendedIcons.push(icon);
        }
        return icon;
    }

    renderDiscoveryMap() {
        if (!this.mapOverlayGraphics) return;
        const worldScene = this.scene.get('WorldScene');
        const mapName = (worldScene && worldScene.targetMapName) || 'Village';
        const mapData = (typeof MapsData !== 'undefined' && MapsData[mapName]) ? MapsData[mapName] : null;
        const discovery = worldScene && worldScene.mapDiscovery;
        if (!mapData || !mapData.layoutText) return;

        const layout = mapData.layoutText;
        const rows = layout.length;
        const cols = layout[0].length;
        const cellSize = Math.min(12, Math.floor(420 / cols));
        const ox = 80;
        const oy = 125;
        this._mapRenderRect = { ox, oy, cellSize, cols, rows, mapName };

        this.mapOverlayGraphics.clear();
        this.mapOverlayGraphics.setVisible(true);

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const visited = !discovery || discovery.isTileVisited(mapName, x, y);
                const ch = layout[y][x];
                let col = 0x1b2631;
                if (visited) {
                    if (ch === 'W') col = 0x256588;
                    else if (ch === 'B') col = 0xa0713c;
                    else if (ch === 'd') col = 0xc49a62;
                    else if (ch === 'H') col = 0xc0392b;
                    else if (ch === 'T' || ch === 't') col = 0x245724;
                    else if (ch === 'C' || ch === 'R') col = 0x616161;
                    else col = (y >= (mapData.wildStartRow || 17)) ? 0x4b8526 : 0x5c9e2b;
                }
                this.mapOverlayGraphics.fillStyle(col, visited ? 1 : 0.75);
                this.mapOverlayGraphics.fillRect(ox + x * cellSize, oy + y * cellSize, cellSize, cellSize);
            }
        }

        // Landmarks découverts
        if (discovery) {
            const lms = discovery.getDiscoveredLandmarks(mapName);
            lms.forEach(lm => {
                this.mapOverlayGraphics.fillStyle(0xffd54f, 1);
                this.mapOverlayGraphics.fillCircle(ox + lm.tileX * cellSize + cellSize / 2, oy + lm.tileY * cellSize + cellSize / 2, 4);
            });
            // Marqueurs personnels
            discovery.getPersonalMarkers(mapName).forEach(mk => {
                this.mapOverlayGraphics.fillStyle(0x00e5ff, 1);
                this.mapOverlayGraphics.fillRect(ox + mk.tileX * cellSize + 2, oy + mk.tileY * cellSize + 2, 6, 6);
            });
        }

        // Position joueur
        if (worldScene && worldScene.player) {
            const ts = mapData.tileSize || 64;
            const px = ox + (worldScene.player.x / ts) * cellSize;
            const py = oy + (worldScene.player.y / ts) * cellSize;
            this.mapOverlayGraphics.fillStyle(0xffffff, 1);
            this.mapOverlayGraphics.fillCircle(px, py, 4);
        }
    }

    handleMapClick(pointerX, pointerY) {
        if (!this._mapRenderRect) return;
        const { ox, oy, cellSize, cols, rows, mapName } = this._mapRenderRect;
        const tx = Math.floor((pointerX - ox) / cellSize);
        const ty = Math.floor((pointerY - oy) / cellSize);
        if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return;
        const worldScene = this.scene.get('WorldScene');
        if (worldScene && worldScene.mapDiscovery) {
            worldScene.mapDiscovery.setPersonalMarker(mapName, tx, ty, 'Repère');
            if (typeof worldScene._syncDiscoveryPersistence === 'function') {
                worldScene._syncDiscoveryPersistence();
            }
            this.renderDiscoveryMap();
        }
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
            const sel = (idx) => (this.menuSelectionIndex === idx ? "> " : "  ");
            content += "Appuyez sur le numéro pour fabriquer:\n\n";
            
            // Recipe 1: Pont en Bois (Coût: 5 Bois)
            this.createItemIcon(75, 168, 'bridge');
            content += `     ${sel(0)}[1] Pont en Bois (5 Bois)\n\n`;
            
            // Recipe 2: Potion de Soin (Coût: 2 Bois, 1 Pierre)
            this.createItemIcon(75, 206, 'potion');
            content += `     ${sel(1)}[2] Potion de Soin (2 Bois, 1 Pierre)\n\n`;

            // Recipe 3: Hachette de Récolte (Coût: 2 Bois, 1 Pierre, 1 Herbe)
            this.createExtendedIcon(75, 244, 'hatchet');
            content += `     ${sel(2)}[3] Hachette de Récolte (2B, 1P, 1 Herbe)\n\n`;
            
            let wood = window.gameState.inventory.find(i => i.id === 'wood');
            let stone = window.gameState.inventory.find(i => i.id === 'stone');
            let herb = window.gameState.inventory.find(i => i.id === 'herb');
            const woodQty = wood ? wood.qty : 0;
            const stoneQty = stone ? stone.qty : 0;
            const herbQty = herb ? herb.qty : 0;

            content += "Ressources disponibles:\n";
            this.createItemIcon(75, 315, 'wood');
            this.createItemIcon(230, 315, 'stone');
            this.createExtendedIcon(390, 315, 'herb');
            content += `       ${woodQty} Bois          ${stoneQty} Pierre          ${herbQty} Herbe\n\n`;
            content += `Ressources: ${woodQty} Bois, ${stoneQty} Pierre, ${herbQty} Herbe`;
        } else if (type === "PERSONNAGE" || type === "STATS") {
            const p = window.gameState.player;
            const eq = window.gameState.equipment || {};
            content = "--- FICHE DU PERSONNAGE ---\n\n";
            content += "Niveau       : " + p.level + "\n";
            content += "Points de Vie: " + p.hp + " / " + p.maxHp + " HP\n";
            content += "Magie        : " + (p.mp || 0) + " / " + (p.maxMp || 50) + " MP\n";
            content += "Expérience   : " + (p.xp || 0) + " / " + (p.level * 100) + " XP\n";
            content += "Or           : " + (p.gold || 0) + " G\n\n";
            content += "Outil équipé : " + (eq.tool ? `${eq.tool.name} (+1 récolte)` : "Aucun") + "\n";
        } else if (type === "CARTE") {
            const worldScene = this.scene.get('WorldScene');
            const mapName = (worldScene && worldScene.targetMapName) || "Village";
            const discovery = worldScene && worldScene.mapDiscovery;
            const discovered = discovery ? discovery.getDiscoveredLandmarks(mapName) : [];
            const zoneLabel = (discovery && discovery.currentZone && discovery.currentZone.dangerLabel) || "Zone Paisible";
            this.renderDiscoveryMap();
            content = `\n\n\n\n\n\n\n\n\n\n\n\n\nZone : ${zoneLabel}  |  Lieux découverts : ${discovered.length}\n`;
            if (discovered.length > 0) {
                content += discovered.map(l => `- ${l.name}`).join("  ");
            } else {
                content += "Explorez les environs pour révéler la carte. (Clic: repère)";
            }
        }
        
        this.menuContent.setText(content);
    }
}
